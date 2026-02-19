import { useApi } from '../hooks/useApi';
import { ChartCard } from '../components/ChartCard';
import { MapWrapper } from '../components/MapWrapper';
import { HexBin } from '../types';
import { getBiodiversityYieldColor, formatNumber } from '../utils/helpers';

/**
 * Hotspot & Gap Analysis Page
 * TODO: [Team Member] — Implement hotspot detection and gap identification
 */
export function HotspotAnalysis() {
  const { data: hexbins, loading: loadingHex, error: errorHex } = useApi<HexBin[]>('/api/hotspots/hexbins');
  const { data: gaps, loading: loadingGaps, error: errorGaps } = useApi<HexBin[]>('/api/hotspots/gaps');

  // Convert hexbins to GeoJSON for map display
  const hexGeoJson: GeoJSON.FeatureCollection | undefined = hexbins
    ? {
        type: 'FeatureCollection',
        features: hexbins.map((hex) => ({
          type: 'Feature',
          properties: {
            hex_id: hex.hex_id,
            observation_count: hex.observation_count,
            unique_species: hex.unique_species,
            biodiversity_yield: hex.biodiversity_yield,
          },
          geometry: hex.geometry,
        })),
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Hotspot & Gap Analysis</h2>
        <p className="text-gray-600 mt-2">
          Identification of over-sampled hotspots and under-sampled gaps
        </p>
      </div>

      {/* Observation Density Map */}
      <ChartCard
        title="Observation Density Map"
        subtitle="H3 hexagonal binning showing observation counts per area"
        loading={loadingHex}
        error={errorHex}
      >
        <MapWrapper geoJsonLayer={hexGeoJson} height="600px" />
      </ChartCard>

      {/* Biodiversity Yield Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Top Over-Sampled Zones"
          subtitle="High observation density, lower biodiversity yield"
          loading={loadingHex}
          error={errorHex}
        >
          <div className="space-y-2">
            {hexbins
              ?.sort((a, b) => b.observation_count - a.observation_count)
              .slice(0, 5)
              .map((hex) => (
                <div
                  key={hex.hex_id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-medium">{hex.hex_id.substring(0, 10)}...</p>
                    <p className="text-sm text-gray-600">{hex.habitat_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatNumber(hex.observation_count)} obs</p>
                    <p
                      className="text-sm"
                      style={{ color: getBiodiversityYieldColor(hex.biodiversity_yield) }}
                    >
                      {hex.biodiversity_yield.toFixed(2)} yield
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Top Under-Sampled Gaps"
          subtitle="Low observation density, potential high biodiversity"
          loading={loadingGaps}
          error={errorGaps}
        >
          <div className="space-y-2">
            {gaps?.slice(0, 5).map((gap) => (
              <div
                key={gap.hex_id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded"
              >
                <div>
                  <p className="font-medium">{gap.hex_id.substring(0, 10)}...</p>
                  <p className="text-sm text-gray-600">{gap.habitat_type}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatNumber(gap.observation_count)} obs</p>
                  <p className="text-sm text-blue-600">
                    Priority: {gap.priority_score.toFixed(0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* TODO: Add biodiversity yield choropleth map */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <p className="text-blue-700">
          <strong>TODO:</strong> Add biodiversity yield choropleth visualization
        </p>
      </div>
    </div>
  );
}
