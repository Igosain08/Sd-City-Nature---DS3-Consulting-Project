import { useMemo, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getPriorityColor } from "../utils/helpers";
import * as L from "leaflet";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";


const ICONIC_COLORS: Record<string, string> = {
  Plantae:    "#16a34a",
  Insecta:    "#d97706",
  Aves:       "#2563eb",
  Mammalia:   "#7c3aed",
  Reptilia:   "#b45309",
  Amphibia:   "#0891b2",
  Fungi:      "#db2777",
  Animalia:   "#6b7280",
  Unknown:    "#9ca3af",
};


const LEGEND_BUCKETS = [
  { label: "Low", range: "0–25", mid: 12.5 },
  { label: "Moderate", range: "25–50", mid: 37.5 },
  { label: "High", range: "50–75", mid: 62.5 },
  { label: "Very High", range: "75–100", mid: 87.5 },
];

type Props = {
  geoJsonLayer?: GeoJSON.FeatureCollection;
  height?: string;

  hoveredZoneId?: string | null;
  selectedZoneId?: string | null;

  onFeatureHover?: (id: string | null) => void;
  onFeatureClick?: (id: string | null) => void;
};

export function MapWrapper({
  geoJsonLayer,
  height = "600px",
  hoveredZoneId = null,
  selectedZoneId = null,
  onFeatureHover,
  onFeatureClick,
}: Props) {
  // for the unique in hex
  const [showBaseline, setShowBaseline] = useState(false);
  const [showCnc, setShowCnc]           = useState(false);
  const [baselineObs, setBaselineObs]   = useState<any[]>([]);
  const [cncObs, setCncObs]             = useState<any[]>([]);
  const [obsLoading, setObsLoading]     = useState(false);

  const center: [number, number] = [32.7157, -117.1611]; // San Diego
  const zoom = 10;
  const [pinActive, setPinActive] = useState(false);
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null);

  const mapRef = useRef<L.Map | null>(null);

  const findHexAtPoint = (lat: number, lng: number): string | null => {
    if (!geoJsonLayer) return null;
    const pt = point([lng, lat]);
    for (const feat of geoJsonLayer.features) {
      if (!feat.geometry) continue;
      try {
        if (booleanPointInPolygon(pt, feat as any)) {
          return (feat as any).properties?.zone_id ?? null;
        }
      } catch {
        continue;
      }
    }
    return null;
  };

  const styleFn = useMemo(() => {
    return (feature: any) => {
      const p: any = feature?.properties ?? {};
      const id: string | undefined = p.zone_id ?? p.hex_id;
      const score = Number(p.priority_score ?? 0);

      const isSelected = !!id && selectedZoneId === id;
      const isHovered = !!id && hoveredZoneId === id;

      // Base styling (stronger than before for clarity on basemap)
      let weight = 1;
      let fillOpacity = 0.55;
      let color = "#0f172a"; // slate-900-ish outline
      let opacity = 0.55;

      // Hover highlight
      if (isHovered) {
        weight = 3;
        fillOpacity = 0.75;
        color = "#111827";
        opacity = 0.9;
      }

      // Selected highlight (stronger than hover)
      if (isSelected) {
        weight = 4;
        fillOpacity = 0.2;
        color = "#000000";
        opacity = 1;
      }

      return {
        weight,
        opacity,
        color,
        fillOpacity,
        fillColor: getPriorityColor(score),
      };
    };
  }, [hoveredZoneId, selectedZoneId]);

  const selectedTopPlaces = useMemo(() => {
    if (!selectedZoneId || !geoJsonLayer) return [];
    const feat = geoJsonLayer.features.find(
      (f: any) => f.properties?.zone_id === selectedZoneId
    );
    if (!feat) return [];
    try {
      const raw = feat.properties?.top_places;
      return typeof raw === "string" ? JSON.parse(raw) : (raw ?? []);
    } catch {
      return [];
    }
  }, [selectedZoneId, geoJsonLayer]);


  if (!geoJsonLayer) {
    return (
      <div
        style={{ height }}
        className="w-full rounded-lg border flex items-center justify-center text-gray-500"
      >
        No map data
      </div>
    );
  }
  // this is where we fetch the total unique
  useEffect(() => {
    if (!selectedZoneId) {
      setBaselineObs([]);
      setCncObs([]);
      return;
    }
    if (!showBaseline && !showCnc) return;

    setObsLoading(true);
    const type = showBaseline && showCnc ? "both" : showBaseline ? "non_cnc" : "cnc";

    fetch(`/api/strategy/hex-observations/${selectedZoneId}?type=${type}`)
      .then((r) => r.json())
      .then((data: any[]) => {
        setBaselineObs(showBaseline ? data.filter((d) => !d.is_cnc) : []);
        setCncObs(showCnc ? data.filter((d) => d.is_cnc) : []);
      })
      .catch(console.error)
      .finally(() => setObsLoading(false));
  }, [selectedZoneId, showBaseline, showCnc]);

  useEffect(() => {
    if (!selectedZoneId) {
      setShowBaseline(false);
      setShowCnc(false);
    }
  }, [selectedZoneId]);

  return (
    <div style={{ height }} className="w-full rounded-lg overflow-hidden border relative">
      {/* Legend */}
        <div
    className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur rounded-lg border shadow-sm p-3"
    style={{ width: 190 }}
  >
    <div className="text-xs font-semibold text-gray-800 mb-2">Priority Score</div>
    <div className="space-y-1.5">
      {LEGEND_BUCKETS.map((b) => (
        <div key={b.label} className="flex items-center justify-between gap-2 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3.5 h-3.5 rounded-sm border"
              style={{ backgroundColor: getPriorityColor(b.mid) }}
            />
            <span className="font-medium">{b.label}</span>
          </div>
          <span className="text-gray-500">{b.range}</span>
        </div>
      ))}
    </div>

  {/* Species legend — only show when obs layer is active */}
  {(showBaseline || showCnc) && (
    <>
      <div className="border-t mt-2 pt-2">
        <div className="text-xs font-semibold text-gray-800 mb-1.5">Species Group</div>
        <div className="space-y-1">
          {Object.entries(ICONIC_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2 text-xs text-gray-700">
              <span
                className="inline-block w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: color }}
              />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )}
</div>

      {/* Drop Pin button */}
        <div className="absolute top-3 left-3 z-[1000] flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (pinActive) {
                setPinActive(false);
                setPinPosition(null);
                if (onFeatureClick) onFeatureClick(null);
              } else {
                setPinActive(true);
                const mapCenter = mapRef.current?.getCenter();
                setPinPosition(
                  mapCenter ? [mapCenter.lat, mapCenter.lng] : center
                );
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium shadow border transition ${
              pinActive
                ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {pinActive ? "✕ Clear Pin" : "📍 Drop Pin"}
          </button>
          {pinActive && (
            <div className="bg-white/90 backdrop-blur text-xs text-gray-500 px-2 py-1.5 rounded-lg border shadow">
              Drag the pin to a hex
            </div>
          )}
        </div>

        {selectedZoneId && (
          <div className="absolute bottom-3 left-3 z-[1000] flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setShowBaseline((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow border transition flex items-center gap-1.5 ${
                showBaseline
                  ? "bg-green-600 text-white border-green-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#16a34a" }} />
              🌿 Baseline Obs {showBaseline && obsLoading ? "…" : ""}
            </button>
            <button
              type="button"
              onClick={() => setShowCnc((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow border transition flex items-center gap-1.5 ${
                showCnc
                  ? "bg-blue-600 text-white border-blue-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#2563eb" }} />
              🎯 CNC Obs {showCnc && obsLoading ? "…" : ""}
            </button>
          </div>
        )}


      <MapContainer ref={mapRef} center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GeoJSON
          // This key forces Leaflet to re-evaluate styles when hover/selection changes.
          // (Not strictly needed for the legend, but helps for consistent highlighting.)
          key={`${geoJsonLayer.features.length}-${geoJsonLayer.features.map(f => (f as any).id).join(",")}-${hoveredZoneId ?? "none"}-${selectedZoneId ?? "none"}`}

          data={geoJsonLayer as any}
          style={styleFn as any}
          onEachFeature={(feature, layer) => {
            const p: any = feature?.properties ?? {};
            const id: string | undefined = p.zone_id ?? p.hex_id;

            const bestTime = p.recommended_time ?? "—";
            const score =
              typeof p.priority_score === "number"
                ? p.priority_score.toFixed(1)
                : (p.priority_score ?? "—");

            const html = `
              <div style="font-size:12px; line-height:1.25;">
                <div><b>Score:</b> ${score}</div>
                <div><b>Best Time:</b> ${bestTime}</div>
                
              </div>
            `;

            (layer as any).bindTooltip(html, { sticky: true });

            layer.on("mouseover", () => {
              if (onFeatureHover && id) onFeatureHover(id);
            });

            layer.on("mouseout", () => {
              if (onFeatureHover) onFeatureHover(null);
            });

            layer.on("click", () => {
              if (onFeatureClick) onFeatureClick(id ?? null);
            });

          }

          
        }
          
        />

         {/* TOP 3 PLACE MARKERS — completely separate, after GeoJSON */}
        {selectedTopPlaces.map((place: any, i: number) => (
          <Marker
            key={`place-${i}`}
            position={[place.lat, place.lng]}
            icon={L.divIcon({
              html: `<div style="
                background:white;
                border: 2.5px solid #1e3a5f;
                border-radius: 50%;
                width: 24px; height: 24px;
                display: flex; align-items: center; justify-content: center;
                font-size: 11px; font-weight: 700; color: #1e3a5f;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              ">${i + 1}</div>`,
              className: "",
              iconAnchor: [12, 12],
              popupAnchor: [0, -16],
            })}
          >
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 140 }}>
                <strong>{place.name}</strong><br />
                <span style={{ color: "#6b7280", textTransform: "capitalize" }}>
                  {place.type?.replace(/_/g, " ")}
                </span><br />
                <span style={{ color: place.inside_hex ? "#16a34a" : "#6b7280" }}>
                  {place.inside_hex ? "✓ Inside this zone" : `${(place.distance_m / 1000).toFixed(1)} km away`}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
        {/* Draggable pin */}
        {pinActive && pinPosition && (
          <Marker
            position={pinPosition}
            draggable={true}
            icon={L.divIcon({
              html: `<div style="
                font-size: 28px;
                line-height: 1;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
                cursor: grab;
              ">📍</div>`,
              className: "",
              iconAnchor: [14, 28],
              popupAnchor: [0, -30],
            })}
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                setPinPosition([lat, lng]);
                const hexId = findHexAtPoint(lat, lng);
                if (hexId && onFeatureClick) {
                  onFeatureClick(hexId);
                }
              },
            }}
          />
        )}

        {/* Baseline observation dots */}
        {showBaseline && baselineObs.map((obs, i) => (
          <CircleMarker
            key={`baseline-${i}`}
            center={[obs.lat, obs.lng]}
            radius={4}
            pathOptions={{
              fillColor: ICONIC_COLORS[obs.iconic_taxon] ?? "#9ca3af",
              fillOpacity: 0.8,
              color: "#fff",
              weight: 0.5,
            }}
          >
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <strong>{obs.common_name}</strong><br />
                <span style={{ color: "#6b7280" }}>{obs.iconic_taxon}</span><br />
                <span style={{ color: "#16a34a", fontSize: 10 }}>● Baseline</span>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* CNC observation dots */}
        {showCnc && cncObs.map((obs, i) => (
          <CircleMarker
            key={`cnc-${i}`}
            center={[obs.lat, obs.lng]}
            radius={4}
            pathOptions={{
              fillColor: ICONIC_COLORS[obs.iconic_taxon] ?? "#9ca3af",
              fillOpacity: 0.8,
              color: "#fff",
              weight: 0.5,
            }}
          >
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <strong>{obs.common_name}</strong><br />
                <span style={{ color: "#6b7280" }}>{obs.iconic_taxon}</span><br />
                <span style={{ color: "#2563eb", fontSize: 10 }}>● CNC</span>
              </div>
            </Popup>
          </CircleMarker>
        ))}
        
      </MapContainer>


    </div>
  );
}