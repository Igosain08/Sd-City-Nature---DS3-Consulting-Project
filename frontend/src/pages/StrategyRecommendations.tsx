import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { ChartCard } from '../components/ChartCard';
import { MapWrapper } from '../components/MapWrapper';
import { PriorityZone, TimingWindow } from '../types';
import { getPriorityColor, formatNumber } from '../utils/helpers';

type MapHex = {
  zone_id: string;
  center_lat: number;
  center_lng: number;
  priority_score: number;
  priority_category?: PriorityZone['priority_category'];
  geometry: GeoJSON.Geometry;
  name?: string;
};

type PriorityZonesBundle = {
  hexes: MapHex[];       // map layer (all hexes)
  top: PriorityZone[];   // cards (top N)
};

export function StrategyRecommendations() {
  const { data: zonesBundle, loading: loadingZones, error: errorZones } =
    useApi<PriorityZonesBundle>('/api/strategy/priority-zones');

  

  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const mapHexes = zonesBundle?.hexes ?? [];
  const topZones = zonesBundle?.top ?? [];

  // Map layer GeoJSON (ALL hexes)
  const zonesGeoJson: GeoJSON.FeatureCollection | undefined = useMemo(() => {
    if (!mapHexes.length) return undefined;

    return {
      type: 'FeatureCollection',
      features: mapHexes.map((zone) => ({
        type: 'Feature',
        properties: {
          zone_id: zone.zone_id,
          name: zone.name,
          priority_score: zone.priority_score,
          center_lat: zone.center_lat,
          center_lng: zone.center_lng,
          priority_category: zone.priority_category,
          recommended_time: (zone as any).recommended_time
        },
        geometry: zone.geometry as any,
      })),
    };
  }, [mapHexes]);

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
        subtitle="All hexes across San Diego County (hover + click to highlight)"
        loading={loadingZones}
        error={errorZones}
      >
        <MapWrapper
          geoJsonLayer={zonesGeoJson}
          height="600px"
          hoveredZoneId={hoveredZoneId}
          selectedZoneId={selectedZoneId}
          onFeatureHover={(id: string | null) => setHoveredZoneId(id)}
          onFeatureClick={(id: string | null) => setSelectedZoneId(id)}
        />
      </ChartCard>

      {/* Priority Zone Cards (Top N only) */}
      <ChartCard
        title="Top Priority Zones"
        subtitle="Click a card to highlight that hex on the map"
        loading={loadingZones}
        error={errorZones}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topZones.slice(0, 10).map((zone, idx) => {
            const isSelected = selectedZoneId === zone.zone_id;

            return (
              <button
                key={zone.zone_id}
                type="button"
                onMouseEnter={() => setHoveredZoneId(zone.zone_id)}
                onMouseLeave={() => setHoveredZoneId(null)}
                onClick={() => setSelectedZoneId(zone.zone_id)}
                className="text-left border rounded-lg p-4 hover:bg-gray-50"
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: getPriorityColor(zone.priority_score),
                  outline: isSelected ? '2px solid #111827' : 'none',
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-lg">
                    {`#${idx + 1} — ${zone.name || `Hex ${zone.zone_id.slice(0, 8)}`}`}
                  </h4>

                  <span
                    className="px-2 py-1 rounded text-sm font-medium text-white"
                    style={{ backgroundColor: getPriorityColor(zone.priority_score) }}
                  >
                    {zone.priority_score.toFixed(1)}
                  </span>
                </div>

                {/* Rationale */}
                <p className="text-sm text-gray-600 mb-3">{zone.rationale}</p>

                {/* Optional Details */}
                <div className="space-y-1 text-sm">
                  {zone.recommended_time && (
                    <p>
                      <strong>Best Time:</strong> {zone.recommended_time}
                    </p>
                  )}
                  {zone.target_taxa && zone.target_taxa.length > 0 && (
                    <p>
                      <strong>Target Taxa:</strong> {zone.target_taxa.join(', ')}
                    </p>
                  )}
                  {zone.radius_km && (
                    <p>
                      <strong>Radius:</strong> {zone.radius_km.toFixed(1)} km
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ChartCard>

      {/* Timing Windows */}
      
    </div>
  );
}
