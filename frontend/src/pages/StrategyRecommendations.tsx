import { useApi } from '../hooks/useApi';
import { ChartCard } from '../components/ChartCard';
import { MapWrapper } from '../components/MapWrapper';
import { PriorityZone, TimingWindow } from '../types';
import { getPriorityColor, formatNumber } from '../utils/helpers';

/**
 * Strategy Recommendations Page
 * TODO: [Team Member] — Implement priority zone identification and recommendations
 */
export function StrategyRecommendations() {
  const { data: priorityZones, loading: loadingZones, error: errorZones } = useApi<PriorityZone[]>('/api/strategy/priority-zones');
  const { data: timingWindows, loading: loadingTiming, error: errorTiming } = useApi<TimingWindow[]>('/api/strategy/timing-windows');

  // Convert priority zones to GeoJSON
  const zonesGeoJson: GeoJSON.FeatureCollection | undefined = priorityZones
    ? {
        type: 'FeatureCollection',
        features: priorityZones.map((zone) => ({
          type: 'Feature',
          properties: {
            zone_id: zone.zone_id,
            name: zone.name,
            priority_score: zone.priority_score,
            recommended_time: zone.recommended_time,
          },
          geometry: zone.geometry,
        })),
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Strategy Recommendations</h2>
        <p className="text-gray-600 mt-2">
          Priority zones, optimal timing, and habitat-based participant guidance
        </p>
      </div>

      {/* Priority Zone Map */}
      <ChartCard
        title="Priority Zones Map"
        subtitle="Recommended areas for focused observation efforts"
        loading={loadingZones}
        error={errorZones}
      >
        <MapWrapper geoJsonLayer={zonesGeoJson} height="600px" />
      </ChartCard>

      {/* Priority Zone Cards */}
      <ChartCard
        title="Top Priority Zones"
        subtitle="Detailed recommendations for high-priority observation areas"
        loading={loadingZones}
        error={errorZones}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {priorityZones?.slice(0, 6).map((zone) => (
            <div
              key={zone.zone_id}
              className="border rounded-lg p-4"
              style={{ borderLeftWidth: '4px', borderLeftColor: getPriorityColor(zone.priority_score) }}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{zone.name}</h4>
                <span
                  className="px-2 py-1 rounded text-sm font-medium text-white"
                  style={{ backgroundColor: getPriorityColor(zone.priority_score) }}
                >
                  {zone.priority_score.toFixed(0)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{zone.rationale}</p>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Best Time:</strong> {zone.recommended_time}
                </p>
                <p>
                  <strong>Target Taxa:</strong> {zone.target_taxa.join(', ')}
                </p>
                <p>
                  <strong>Radius:</strong> {zone.radius_km.toFixed(1)} km
                </p>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Timing Windows */}
      <ChartCard
        title="Optimal Timing Windows"
        subtitle="Best observation times based on historical efficiency"
        loading={loadingTiming}
        error={errorTiming}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hour
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Observations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unique Species
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Efficiency Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timingWindows?.slice(0, 10).map((window, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{window.day_of_week}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{window.hour}:00</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatNumber(window.observation_count)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatNumber(window.unique_species)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="px-2 py-1 rounded text-sm font-medium text-white"
                      style={{ backgroundColor: getPriorityColor(window.efficiency_score) }}
                    >
                      {window.efficiency_score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* TODO: Add exportable participant guide */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <p className="text-blue-700">
          <strong>TODO:</strong> Add downloadable participant guide (PDF export)
        </p>
      </div>
    </div>
  );
}
