import { useEffect, useMemo, useState } from "react";
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
  habitat?: string;

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
  const [habitatFilter, setHabitatFilter] = useState("All");

  const mapHexes = zonesBundle?.hexes ?? [];
  const topZones = zonesBundle?.top ?? [];

const norm = (v: unknown) => String(v ?? "Other").trim().toLowerCase();

const onHabitatTabClick = (h: string) => {
  setHabitatFilter(h);

  // If switching away from the selected hex’s habitat, clear selection immediately.
  if (!selectedZoneId || h === "All") return;

  const selectedHab = habitatByZoneId.get(selectedZoneId) ?? "Other";
  if (norm(selectedHab) !== norm(h)) {
    setSelectedZoneId(null);
    setHoveredZoneId(null);
  }
};

// build filters the top habitats alongside with the cards
const habitatByZoneId = useMemo(() => {
  const m = new Map<string, string>();
  for (const h of mapHexes) {
    m.set(h.zone_id, norm(h.habitat));
  }
  return m;
}, [mapHexes]);

const filteredTopZones = useMemo(() => {
  if (habitatFilter === "All") return topZones;

// clears the filter 

  
const target = norm(habitatFilter);

  // Keep only top zones whose zone_id's habitat matches
  return topZones.filter((z) => norm(habitatByZoneId.get(z.zone_id)) === target);
}, [topZones, habitatFilter, habitatByZoneId]);

// 1) Build FULL geojson once (only changes when data changes)
const fullGeoJson = useMemo<GeoJSON.FeatureCollection | undefined>(() => {
  if (!mapHexes.length) return undefined;



  return {
    type: "FeatureCollection",
    features: mapHexes.map((zone) => ({
      type: "Feature",
      id: zone.zone_id, // helps map libs keep feature identity stable
      properties: {
        zone_id: zone.zone_id,
        name: zone.name,
        priority_score: zone.priority_score,
        center_lat: zone.center_lat,
        center_lng: zone.center_lng,
        priority_category: zone.priority_category,
        recommended_time: (zone as any).recommended_time,
        habitat: zone.habitat ?? "Other",
      },
      geometry: zone.geometry as any,
    })),
  };
}, [mapHexes]);

// 2) Filter FEATURES cheaply when tab changes
const zonesGeoJson = useMemo<GeoJSON.FeatureCollection | undefined>(() => {
  if (!fullGeoJson) return undefined;
  if (habitatFilter === "All") return fullGeoJson;

  const target = norm(habitatFilter);
  return {
    ...fullGeoJson,
    features: fullGeoJson.features.filter((f: any) => {
      const h = norm(f.properties?.habitat);
      return h === target;
    }),
  };
}, [fullGeoJson, habitatFilter]);


  // Map layer GeoJSON (ALL hexes)
  

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Strategy Recommendations</h2>
        <p className="text-gray-600 mt-2">
          Priority zones, optimal timing, and habitat-based participant guidance
        </p>
      </div>

      {/* Map + Top Zones side-by-side */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
  {/* LEFT: MAP */}
  <div className="lg:col-span-8 xl:col-span-9">
    <ChartCard
      title="Priority Zones Map"
      subtitle="All hexes across San Diego County (hover + click to highlight)"
      loading={loadingZones}
      error={errorZones}
    >
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {["All", "Urban", "Chaparral", "Riparian", "Desert", "Mixed", "Other"].map((h) => {
          const active = habitatFilter === h;
          return (
            <button
              key={h}
              type="button"
              onClick={() => onHabitatTabClick(h)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                active
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {h}
            </button>
          );
        })}
      </div>

      <MapWrapper
        geoJsonLayer={zonesGeoJson}
        height="650px"
        hoveredZoneId={hoveredZoneId}
        selectedZoneId={selectedZoneId}
        onFeatureHover={(id: string | null) => setHoveredZoneId(id)}
        onFeatureClick={(id: string | null) => setSelectedZoneId(id)}
      />
    </ChartCard>
  </div>

  {/* RIGHT: TOP ZONES (SCROLLABLE) */}
  <div className="lg:col-span-4 xl:col-span-3">
    <ChartCard
      title={`Top Priority Zones${habitatFilter !== "All" ? ` · ${habitatFilter}` : ""}`}
      subtitle="Click a card to highlight that hex on the map"
      loading={loadingZones}
      error={errorZones}
    >
      {/* Make cards panel scroll within the same height as the map */}
      <div className="max-h-[650px] overflow-y-auto pr-1 space-y-3">
        {filteredTopZones.slice(0, 10).map((zone, idx) => {
          const isSelected = selectedZoneId === zone.zone_id;

          return (
            <button
              key={zone.zone_id}
              type="button"
              onMouseEnter={() => setHoveredZoneId(zone.zone_id)}
              onMouseLeave={() => setHoveredZoneId(null)}
              onClick={() => setSelectedZoneId(zone.zone_id)}
              className="w-full text-left border rounded-lg p-4 hover:bg-gray-50"
              style={{
                borderLeftWidth: "4px",
                borderLeftColor: getPriorityColor(zone.priority_score),
                outline: isSelected ? "2px solid #111827" : "none",
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-base">
                  {`#${idx + 1} — ${zone.name || `Hex ${zone.zone_id.slice(0, 8)}`}`}
                </h4>

                <span
                  className="px-2 py-1 rounded text-sm font-medium text-white"
                  style={{ backgroundColor: getPriorityColor(zone.priority_score) }}
                >
                  {zone.priority_score.toFixed(1)}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3">{zone.rationale}</p>

              <div className="space-y-1 text-sm">
                {zone.recommended_time && (
                  <p>
                    <strong>Best Time:</strong> {zone.recommended_time}
                  </p>
                )}
                {zone.target_taxa && typeof zone.target_taxa === "object" && (
                  <div>
                    <strong>Target Species:</strong>
                    <div className="mt-1 space-y-1">
                      {Object.entries(zone.target_taxa as Record<string, string[]>).map(([group, names]) => (
                        <div key={group}>
                          <span className="font-medium">{group}:</span>{" "}
                          <span className="text-gray-700">{(names ?? []).join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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

        {/* Empty state when filter yields no top zones */}
        {filteredTopZones.length === 0 && (
          <div className="text-sm text-gray-500 p-3 border rounded-lg bg-gray-50">
            No top zones match <strong>{habitatFilter}</strong>. Try “All” or increase the backend top_n.
          </div>
        )}
      </div>
    </ChartCard>
  </div>
</div>

      {/* Timing Windows */}
      
    </div>
  );
}
