import { useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import { ChartCard } from "../components/ChartCard";
import { MapWrapper } from "../components/MapWrapper";
import { PriorityZone } from "../types";
import { getPriorityColor } from "../utils/helpers";

type MapHex = {
  zone_id: string;
  center_lat: number;
  center_lng: number;
  priority_score: number;
  priority_category?: PriorityZone["priority_category"];
  geometry: GeoJSON.Geometry;
  name?: string;
  habitat?: string;
};

type PriorityZonesBundle = {
  hexes: MapHex[];
  top: PriorityZone[];
};

export function StrategyRecommendations() {
  const { data: zonesBundle, loading: loadingZones, error: errorZones } =
    useApi<PriorityZonesBundle>("/api/strategy/priority-zones");

  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [habitatFilter, setHabitatFilter] = useState("All");

  const mapHexes = zonesBundle?.hexes ?? [];
  const topZones = zonesBundle?.top ?? [];

  const MAP_H = "650px"; // ✅ match v1

  const norm = (v: unknown) => String(v ?? "Other").trim().toLowerCase();

  const habitatByZoneId = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of mapHexes) m.set(h.zone_id, norm(h.habitat));
    return m;
  }, [mapHexes]);

  const onHabitatTabClick = (h: string) => {
    setHabitatFilter(h);
    if (!selectedZoneId || h === "All") return;
    const selectedHab = habitatByZoneId.get(selectedZoneId) ?? "Other";
    if (norm(selectedHab) !== norm(h)) {
      setSelectedZoneId(null);
      setHoveredZoneId(null);
    }
  };

  const filteredTopZones = useMemo(() => {
    if (habitatFilter === "All") return topZones;
    const target = norm(habitatFilter);
    return topZones.filter((z) => norm(habitatByZoneId.get(z.zone_id)) === target);
  }, [topZones, habitatFilter, habitatByZoneId]);

  // clicked takes priority, then hovered
  const activeZoneId = selectedZoneId ?? hoveredZoneId;
  const activeZone = useMemo(
    () => filteredTopZones.find((z) => z.zone_id === activeZoneId) ?? null,
    [filteredTopZones, activeZoneId]
  );

  const fullGeoJson = useMemo<GeoJSON.FeatureCollection | undefined>(() => {
    if (!mapHexes.length) return undefined;
    return {
      type: "FeatureCollection",
      features: mapHexes.map((zone) => ({
        type: "Feature",
        id: zone.zone_id,
        properties: {
          zone_id: zone.zone_id,
          name: zone.name,
          priority_score: zone.priority_score,
          center_lat: zone.center_lat,
          center_lng: zone.center_lng,
          priority_category: zone.priority_category,
          recommended_time: (zone as any).recommended_time,
          habitat: zone.habitat ?? "Other",
          target_taxa: JSON.stringify((zone as any).target_taxa ?? {}),
          non_cnc_observation_count: (zone as any).non_cnc_observation_count,
          cnc_observation_count: (zone as any).cnc_observation_count,
          non_cnc_unique_species: (zone as any).non_cnc_unique_species,
          cnc_unique_species: (zone as any).cnc_unique_species
        },
        geometry: zone.geometry as any,
      })),
    };
  }, [mapHexes]);

  const zonesGeoJson = useMemo<GeoJSON.FeatureCollection | undefined>(() => {
    if (!fullGeoJson) return undefined;
    if (habitatFilter === "All") return fullGeoJson;
    const target = norm(habitatFilter);
    return {
      ...fullGeoJson,
      features: fullGeoJson.features.filter((f: any) => norm(f.properties?.habitat) === target),
    };
  }, [fullGeoJson, habitatFilter]);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden" style={{ contain: "layout" }}>
      <div className="min-w-0">
        <h2 className="text-3xl font-bold text-gray-900">Strategy Recommendations</h2>
        <p className="text-gray-600 mt-2">
          Priority zones, optimal timing, and habitat-based participant guidance
        </p>
      </div>

      {/* ✅ SAME COLUMN SIZING AS VERSION 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-full min-w-0">

        {/* LEFT: MAP */}
        <div className="lg:col-span-7 xl:col-span-8 w-full max-w-full min-w-0">   {/* map */}

          <ChartCard
            title={`Priority Zones Map (${zonesGeoJson?.features.length ?? 0} Total Zones)`}
            subtitle="Hover to preview · Click to lock selection"
            loading={loadingZones}
            error={errorZones}
          >
            <div className="flex flex-wrap gap-2 mb-3 min-w-0">
              {["All", "Urban", "Coastal", "Ocean", "Chaparral", "Riparian", "Mixed", "Other"].map(
                (h) => {
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
                }
              )}
            </div>

            {/* ✅ contain Leaflet */}
            <div className="w-full max-w-full min-w-0 overflow-hidden">
              <MapWrapper
                geoJsonLayer={zonesGeoJson}
                height={MAP_H}
                hoveredZoneId={hoveredZoneId}
                selectedZoneId={selectedZoneId}
                onFeatureHover={(id) => setHoveredZoneId(id)}
                onFeatureClick={(id) => setSelectedZoneId((prev) => (prev === id ? null : id))}
              />
            </div>
          </ChartCard>
        </div>

        {/* RIGHT: DETAIL (same width behavior as v1 right panel) */}
        <div className="lg:col-span-5 xl:col-span-4 w-full max-w-full min-w-0">   {/* detail */}

          <ChartCard
            title="Zone Detail"
            subtitle={selectedZoneId ? "Locked — click map to change" : "Hover over a zone to preview"}
            loading={loadingZones}
            error={errorZones}
          >
            {/* ✅ match map height, scroll inside */}
            <div className="flex flex-col min-w-0">

              {activeZone ? (
                <div className="flex flex-col gap-4 min-w-0">


                  <div
                    className="rounded-lg p-4 text-white min-w-0"
                    style={{ backgroundColor: getPriorityColor(activeZone.priority_score) }}
                  >
                    <div className="flex justify-between items-start gap-3 min-w-0">
                      <h3 className="font-bold text-lg leading-tight min-w-0 truncate">
                        {activeZone.name ?? `Hex ${activeZone.zone_id.slice(0, 8)}`}
                      </h3>
                      <span className="text-2xl font-bold flex-shrink-0">
                        {activeZone.priority_score.toFixed(1)}
                      </span>
                    </div>
                    {(activeZone as any).habitat && (
                      <span className="text-sm opacity-90 mt-1 inline-block">
                        {(activeZone as any).habitat}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 border rounded-lg p-3 bg-gray-50 break-words min-w-0">
                    {activeZone.rationale}
                  </div>

                  <div className="grid grid-cols-2 gap-3 min-w-0">
                <div className="border rounded-lg p-3 text-center min-w-0">
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const total = ((activeZone as any).non_cnc_observation_count ?? 0) + ((activeZone as any).cnc_observation_count ?? 0);
                      const pct = total > 0 ? ((activeZone as any).cnc_observation_count ?? 0) / total * 100 : 0;
                      return `${pct.toFixed(1)}%`;
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">CNC Coverage</div>
                  <div className="text-xs text-gray-400 mt-0.5">CNC Coverage = # cnc obs / # total obs</div>

                </div>
                <div className="border rounded-lg p-3 text-center min-w-0">
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const total = ((activeZone as any).non_cnc_unique_species ?? 0) + ((activeZone as any).cnc_unique_species ?? 0);
                      const pct = total > 0 ? ((activeZone as any).cnc_unique_species ?? 0) / total * 100 : 0;
                      return `${pct.toFixed(1)}%`;
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Species Captured</div>
                  <div className="text-xs text-gray-400 mt-0.5">Species Captured = # unique cnc species / # total unique species</div>
                </div>
              </div>

                  {activeZone.recommended_time && (
                    <div className="border rounded-lg p-3 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">Best Time</div>
                      <div className="font-semibold text-gray-800 break-words">
                        {activeZone.recommended_time}
                      </div>
                    </div>
                  )}

                  {activeZone.target_taxa && Object.keys(activeZone.target_taxa).length > 0 && (
                    <div className="border rounded-lg p-3 min-w-0">
                      <div className="text-xs text-gray-500 mb-2">Target Species</div>
                      <div className="space-y-2 min-w-0">
                        {Object.entries(activeZone.target_taxa as Record<string, string[]>).map(
                          ([group, names]) => (
                            <div key={group} className="min-w-0">
                              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                {group}
                              </span>
                              <p className="text-sm text-gray-600 mt-0.5 break-words">
                                {(names ?? []).join(", ")}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {selectedZoneId && (
                    <button
                      type="button"
                      onClick={() => setSelectedZoneId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 underline text-center mt-auto"
                    >
                      Click to unlock selection
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm min-w-0">
                  Hover over a hex on the map to see details
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      </div>

       {/* BOTTOM: Top Priority Zones — fixed overflow */}
      <ChartCard
  title={`Top Priority Zones${habitatFilter !== "All" ? ` · ${habitatFilter}` : ""}`}
  subtitle="Scroll sideways here · Click a card to highlight on map (Each Zone's Ranking is Out Of 594)"
  loading={loadingZones}
  error={errorZones}
>
  <div style={{ position: "relative" }}>
    <div style={{ position: "absolute", inset: 0, overflowX: "auto", overflowY: "hidden" }}>
      <div className="flex flex-nowrap gap-4 pb-2 pr-2">
        {filteredTopZones.slice(0, 20).map((zone, idx) => {
          const isSelected = selectedZoneId === zone.zone_id;
          const isHovered = hoveredZoneId === zone.zone_id;
          return (
            <button
              key={zone.zone_id}
              type="button"
              onMouseEnter={() => setHoveredZoneId(zone.zone_id)}
              onMouseLeave={() => setHoveredZoneId(null)}
              onClick={() =>
                setSelectedZoneId((prev) => (prev === zone.zone_id ? null : zone.zone_id))
              }
              className={[
                "shrink-0 w-52 text-left border rounded-lg p-3 hover:bg-gray-50 transition",
                isSelected || isHovered ? "ring-2 ring-gray-900 ring-inset" : "",
              ].join(" ")}
              style={{
                borderLeftWidth: "4px",
                borderLeftColor: getPriorityColor(zone.priority_score),
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs text-gray-500">#{idx + 1}</span>
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: getPriorityColor(zone.priority_score) }}
                >
                  {zone.priority_score.toFixed(1)}
                </span>
              </div>
              <h4 className="font-semibold text-sm truncate mb-1">
                {zone.name ?? `Hex ${zone.zone_id.slice(0, 8)}`}
              </h4>
              {(zone as any).habitat && (
                <span className="text-xs text-gray-500">{(zone as any).habitat}</span>
              )}
              {zone.recommended_time && (
                <p className="text-xs text-gray-600 mt-1 truncate">{zone.recommended_time}</p>
              )}
            </button>
          );
        })}
        {filteredTopZones.length === 0 && (
          <div className="text-sm text-gray-500 p-3 border rounded-lg bg-gray-50">
            No zones match <strong>{habitatFilter}</strong>.
          </div>
        )}
      </div>
    </div>
    {/* This div gives the absolute container its height */}
    <div style={{ height: "160px" }} />
  </div>
</ChartCard>
    </div>
  );
}