import { useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getPriorityColor } from "../utils/helpers";

const LEGEND_BUCKETS = [
  { label: "Low", range: "0–25", mid: 12.5 },
  { label: "Moderate", range: "25–50", mid: 37.5 },
  { label: "High", range: "50–70", mid: 60 },
  { label: "Very High", range: "70–85", mid: 77.5 },
  { label: "Top", range: "85–100", mid: 92.5 },
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
  const center: [number, number] = [32.7157, -117.1611]; // San Diego
  const zoom = 10;

  const styleFn = useMemo(() => {
    return (feature: any) => {
      const p: any = feature?.properties ?? {};
      const id: string | undefined = p.zone_id ?? p.hex_id;

      const score = Number(p.priority_score ?? 0);

      const isSelected = !!id && selectedZoneId === id;
      const isHovered = !!id && hoveredZoneId === id;

      // Base styling
      let weight = 1;
      let fillOpacity = 0.35;
      let color = "#333";

      // Hover highlight
      if (isHovered) {
        weight = 3;
        fillOpacity = 0.6;
        color = "#111827";
      }

      // Selected highlight (stronger than hover)
      if (isSelected) {
        weight = 4;
        fillOpacity = 0.75;
        color = "#000";
      }

      return {
        weight,
        opacity: 1,
        color,
        fillOpacity,
        fillColor: getPriorityColor(score),
      };
    };
  }, [hoveredZoneId, selectedZoneId]);

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

  return (
    // legend
    <div style={{ height }} className="w-full rounded-lg overflow-hidden border relative">
      
      <div
        className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur rounded-lg border shadow-sm p-3"
        style={{ width: 180 }}
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
      </div>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GeoJSON
          // key forces Leaflet layer to restyle correctly when selection changes
          key={`${hoveredZoneId ?? "none"}-${selectedZoneId ?? "none"}`}
          data={geoJsonLayer as any}
          style={styleFn as any}
          onEachFeature={(feature, layer) => {
            const p: any = feature?.properties ?? {};
            const id: string | undefined = p.zone_id ?? p.hex_id;

            const bestTime = p.recommended_time ?? "—";

            const lat =
              typeof p.center_lat === "number" ? p.center_lat.toFixed(5) : (p.center_lat ?? "—");
            const lng =
              typeof p.center_lng === "number" ? p.center_lng.toFixed(5) : (p.center_lng ?? "—");

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
          }}
        />
      </MapContainer>
    </div>
  );
}
