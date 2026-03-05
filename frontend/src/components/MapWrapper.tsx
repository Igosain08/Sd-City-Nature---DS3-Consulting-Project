import { useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getPriorityColor } from "../utils/helpers";

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
  const center: [number, number] = [32.7157, -117.1611]; // San Diego
  const zoom = 10;

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
        fillOpacity = 0.85;
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
    <div style={{ height }} className="w-full rounded-lg overflow-hidden border relative">
      {/* Legend */}
      <div
        className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur rounded-lg border shadow-sm p-3"
        style={{ width: 190 }}
      >
        <div className="text-xs font-semibold text-gray-800 mb-2">Priority Score</div>

        <div className="space-y-1.5">
          {LEGEND_BUCKETS.map((b) => (
            <div
              key={b.label}
              className="flex items-center justify-between gap-2 text-xs text-gray-700"
            >
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
          }}
        />
      </MapContainer>
    </div>
  );
}