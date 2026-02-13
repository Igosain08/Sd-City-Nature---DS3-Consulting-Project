import { useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Observation } from '../types';

const QUALITY_COLORS: Record<string, string> = {
  research: '#22c55e',
  needs_id: '#eab308',
  casual: '#94a3b8',
  unknown: '#64748b',
};

const TAXON_COLORS: Record<string, string> = {
  Plantae: '#22c55e',
  Aves: '#3b82f6',
  Insecta: '#eab308',
  Fungi: '#a855f7',
  Mammalia: '#f97316',
  Reptilia: '#14b8a6',
  Amphibia: '#06b6d4',
  Mollusca: '#ec4899',
  Arachnida: '#84cc16',
  Actinopterygii: '#0ea5e9',
};

const TIER_COLORS: Record<string, string> = {
  '1': '#94a3b8',
  '2-5': '#3b82f6',
  '6-20': '#8b5cf6',
  '21+': '#dc2626',
};

const QUALITY_LEGEND: { key: string; label: string; color: string }[] = [
  { key: 'research', label: 'Research', color: QUALITY_COLORS.research },
  { key: 'needs_id', label: 'Needs ID', color: QUALITY_COLORS.needs_id },
  { key: 'casual', label: 'Casual', color: QUALITY_COLORS.casual },
  { key: 'unknown', label: 'Unknown', color: QUALITY_COLORS.unknown },
];

const TAXON_LEGEND: { key: string; label: string; color: string }[] = Object.entries(TAXON_COLORS).map(
  ([key, color]) => ({ key, label: key, color })
);
TAXON_LEGEND.push({ key: 'Other', label: 'Other', color: '#64748b' });

const TIER_LEGEND: { key: string; label: string; color: string }[] = [
  { key: '1', label: '1 observation', color: TIER_COLORS['1'] },
  { key: '2-5', label: '2–5 observations', color: TIER_COLORS['2-5'] },
  { key: '6-20', label: '6–20 observations', color: TIER_COLORS['6-20'] },
  { key: '21+', label: '21+ observations', color: TIER_COLORS['21+'] },
];

function getColor(obs: Observation, colorBy: 'quality_grade' | 'taxon_group' | 'contributor_tier'): string {
  if (colorBy === 'quality_grade') {
    const g = (obs.quality_grade || 'unknown').toLowerCase();
    return QUALITY_COLORS[g] ?? QUALITY_COLORS.unknown;
  }
  if (colorBy === 'taxon_group') {
    const t = obs.taxon_group || 'Other';
    return TAXON_COLORS[t] ?? '#64748b';
  }
  if (colorBy === 'contributor_tier') {
    const tier = obs.contributor_tier || '1';
    return TIER_COLORS[tier] ?? TIER_COLORS['1'];
  }
  return '#0ea5e9';
}

function popupContent(obs: Observation): string {
  const name = obs.common_name || obs.species_name;
  const line2 = obs.species_name;
  const line3 = `${obs.taxon_group ?? ''} · ${obs.quality_grade ?? ''} · ${obs.observed_on ?? ''}`;
  return `<div class="text-sm">
    <div class="font-medium">${escapeHtml(name)}</div>
    <div class="text-slate-600">${escapeHtml(line2)}</div>
    <div class="text-xs mt-1">${escapeHtml(line3)}</div>
  </div>`;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

const canvasRenderer = L.canvas();

interface CanvasMarkersProps {
  data: Observation[];
  colorBy: 'quality_grade' | 'taxon_group' | 'contributor_tier';
}

const BATCH_SIZE = 8000;

function CanvasMarkers({ data, colorBy }: CanvasMarkersProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!map || data.length === 0) return;
    cancelledRef.current = false;
    const layerGroup = L.layerGroup().addTo(map);
    layerRef.current = layerGroup;

    let index = 0;

    function addBatch() {
      if (cancelledRef.current) return;
      const end = Math.min(index + BATCH_SIZE, data.length);
      for (let i = index; i < end; i++) {
        const obs = data[i];
        const marker = L.circleMarker([obs.latitude, obs.longitude], {
          renderer: canvasRenderer,
          radius: 5,
          fillColor: getColor(obs, colorBy),
          color: '#1e293b',
          weight: 0.8,
          fillOpacity: 0.85,
        });
        marker.bindPopup(popupContent(obs), { className: 'observation-popup' });
        layerGroup.addLayer(marker);
      }
      index = end;
      if (index < data.length) {
        requestAnimationFrame(addBatch);
      }
    }

    requestAnimationFrame(addBatch);

    return () => {
      cancelledRef.current = true;
      map.removeLayer(layerGroup);
      layerRef.current = null;
    };
  }, [map, data, colorBy]);

  return null;
}

function getLegendForColorBy(colorBy: 'quality_grade' | 'taxon_group' | 'contributor_tier'): {
  title: string;
  items: { key: string; label: string; color: string }[];
} {
  switch (colorBy) {
    case 'quality_grade':
      return { title: 'Quality grade', items: QUALITY_LEGEND };
    case 'taxon_group':
      return { title: 'Taxon group', items: TAXON_LEGEND };
    case 'contributor_tier':
      return { title: 'User experience level', items: TIER_LEGEND };
    default:
      return { title: '', items: [] };
  }
}

interface ObservationMapProps {
  observations: Observation[];
  colorBy: 'quality_grade' | 'taxon_group' | 'contributor_tier';
  dateRange: [string, string] | null;
  height?: string;
}

export function ObservationMap({
  observations,
  colorBy,
  dateRange,
  height = '600px',
}: ObservationMapProps) {
  const filtered = useMemo(() => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return observations;
    const [from, to] = dateRange;
    return observations.filter((o) => {
      const d = o.observed_on?.slice(0, 10);
      return d && d >= from && d <= to;
    });
  }, [observations, dateRange]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const species = new Set(filtered.map((o) => o.species_name).filter(Boolean)).size;
    const users = new Set(filtered.map((o) => o.user_id).filter(Boolean)).size;
    return { total, species, users };
  }, [filtered]);

  const legend = getLegendForColorBy(colorBy);

  return (
    <div className="relative" style={{ height, width: '100%' }}>
      <MapContainer
        center={[32.7157, -117.1611]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        className="rounded-lg overflow-hidden"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CanvasMarkers data={filtered} colorBy={colorBy} />
      </MapContainer>
      {legend.items.length > 0 && (
        <div className="absolute top-4 right-4 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg border border-slate-200 px-3 py-2 text-sm">
            <div className="font-semibold text-slate-800 mb-1.5">{legend.title}</div>
            <ul className="space-y-1">
              {legend.items.map(({ key, label, color }) => (
                <li key={key} className="flex items-center gap-2">
                  <span
                    className="shrink-0 w-3 h-3 rounded-full border border-slate-300"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-slate-700">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] flex justify-center pointer-events-none">
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg border border-slate-200 px-4 py-2 flex gap-6 text-sm">
          <span><strong>Observations:</strong> {stats.total.toLocaleString()}</span>
          <span><strong>Species:</strong> {stats.species.toLocaleString()}</span>
          <span><strong>Users:</strong> {stats.users.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
