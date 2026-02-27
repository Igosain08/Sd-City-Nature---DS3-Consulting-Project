import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { SpeciesSummary, ResearchRateByTaxonItem } from '../types';

const ICONIC_TAXON_ICONS: Record<string, string> = {
  Plantae: '🌿',
  Aves: '🐦',
  Insecta: '🦋',
  Fungi: '🍄',
  Mammalia: '🦊',
  Reptilia: '🦎',
  Amphibia: '🐸',
  Mollusca: '🐌',
  Arachnida: '🕷️',
  Actinopterygii: '🐟',
  Chromista: '🦠',
  Protozoa: '🦠',
  Unknown: '❓',
};

function getTaxonIcon(taxon: string): string {
  return ICONIC_TAXON_ICONS[taxon] ?? '🔬';
}

interface TaxonomicBreakdownProps {
  taxonomySummary: SpeciesSummary[];
  researchByTaxon: ResearchRateByTaxonItem[];
  loading: boolean;
  error: string | null;
}

type RedundancyView = 'count' | 'log';

export function TaxonomicBreakdown({
  taxonomySummary,
  researchByTaxon,
  loading,
  error,
}: TaxonomicBreakdownProps) {
  const [expandedTaxon, setExpandedTaxon] = useState<string | null>(null);
  const [redundancyView, setRedundancyView] = useState<RedundancyView>('count');

  // Single order for all charts: by total_observations descending
  const stackedData = useMemo(() => {
    return (taxonomySummary ?? [])
      .map((row) => ({ ...row }))
      .sort((a, b) => b.total_observations - a.total_observations);
  }, [taxonomySummary]);

  const taxonOrder = useMemo(() => stackedData.map((d) => d.taxon_group), [stackedData]);

  const researchByTaxonOrdered = useMemo(() => {
    if (!researchByTaxon.length || !taxonOrder.length) return researchByTaxon;
    const orderIndex = (t: string) => {
      const i = taxonOrder.indexOf(t);
      return i === -1 ? 999 : i;
    };
    return [...researchByTaxon].sort((a, b) => orderIndex(a.taxon_group) - orderIndex(b.taxon_group));
  }, [researchByTaxon, taxonOrder]);

  return (
    <section>
      <p className="text-gray-700 mb-4 max-w-3xl">
        Multi-dimensional view by iconic taxon (Plants, Birds, Insects, etc.): stacked bars show
        unique species vs redundant observations; research-grade rate highlights identification
        quality. Click a group to drill down to top species.
      </p>
      <ChartCard
        title="Taxonomic breakdown"
        subtitle="Observations vs species (redundancy) and research-grade rate by taxon"
        loading={loading}
        error={error}
      >
        <div className="space-y-8">
          {/* Grouped bar: observations vs unique species */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-700">
                  Observations vs unique species (redundancy)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  High obs-to-species ratio = many repeat sightings of same species (redundancy).
                  {redundancyView === 'log' && ' Log scale applied — each gridline is 10×.'}
                </p>
              </div>
              <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs shrink-0">
                {(['count', 'log'] as RedundancyView[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setRedundancyView(mode)}
                    className={`px-3 py-1 transition-colors ${
                      redundancyView === mode
                        ? 'bg-slate-700 text-white font-medium'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'count' ? 'Count' : 'Log scale'}
                  </button>
                ))}
              </div>
            </div>
            {stackedData.length > 0 && (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={stackedData} margin={{ top: 8, right: 16, left: 16, bottom: 56 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="taxon_group"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    height={64}
                    interval={0}
                  />
                  <YAxis
                    scale={redundancyView === 'log' ? 'log' : 'linear'}
                    domain={redundancyView === 'log' ? ['auto', 'auto'] : [0, 'auto']}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v)
                    }
                    allowDataOverflow
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name === 'total_observations' ? 'Total observations' : 'Unique species',
                    ]}
                    labelFormatter={(label) => `Taxon: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="total_observations" name="Total observations" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_species" name="Unique species" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Research-grade rate by taxon */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Research-grade rate by taxon (quality)</h4>
            {researchByTaxonOrdered.length > 0 && (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={researchByTaxonOrdered} margin={{ top: 8, right: 8, left: 8, bottom: 56 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="taxon_group"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    height={64}
                    interval={0}
                  />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Research-grade']} />
                  <Bar dataKey="research_pct" name="Research-grade %" radius={[4, 4, 0, 0]}>
                    {researchByTaxonOrdered.map((_, i) => (
                      <Cell key={i} fill={researchByTaxonOrdered[i].research_pct >= 70 ? '#22c55e' : researchByTaxonOrdered[i].research_pct >= 40 ? '#eab308' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Iconic taxon view + drill-down to top species */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Iconic taxon view — drill down</h4>
            {stackedData.length > 0 ? (
              <div className="flex flex-col gap-2">
                {stackedData.map((row) => {
                  const isExpanded = expandedTaxon === row.taxon_group;
                  const icon = getTaxonIcon(row.taxon_group);
                  return (
                    <div
                      key={row.taxon_group}
                      className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedTaxon(isExpanded ? null : row.taxon_group)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100 transition-colors"
                      >
                        <span className="text-2xl" aria-hidden>{icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-slate-800">{row.taxon_group}</span>
                          <span className="text-slate-500 text-sm ml-2">
                            {row.total_observations.toLocaleString()} obs · {row.total_species.toLocaleString()} species
                          </span>
                        </div>
                        <span className="text-slate-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-200 bg-white">
                          {(row.species_breakdown?.length ?? 0) > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-slate-500 mb-2">Observations by species (top 9 + Other)</p>
                              <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={row.species_breakdown!} margin={{ top: 8, right: 8, left: 8, bottom: 60 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis
                                    dataKey="species"
                                    tick={{ fontSize: 10 }}
                                    angle={-35}
                                    textAnchor="end"
                                    height={56}
                                    interval={0}
                                    tickFormatter={(v) => (v.length > 14 ? `${v.slice(0, 12)}…` : v)}
                                  />
                                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
                                  <Tooltip
                                    formatter={(v: number) => [v.toLocaleString(), 'Observations']}
                                    labelFormatter={(label) => label}
                                  />
                                  <Bar dataKey="count" name="Observations" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                                    {(row.species_breakdown ?? []).map((entry, i) => (
                                      <Cell key={i} fill={entry.species === 'Other' ? '#94a3b8' : '#0ea5e9'} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                          <p className="text-xs text-slate-500 mb-2">Top species in this group</p>
                          <div className="flex flex-wrap gap-4">
                            {(row.top_species ?? []).slice(0, 9).map((species) => {
                              const inatSearchUrl = `https://www.inaturalist.org/observations?place_id=any&taxon_name=${encodeURIComponent(species)}`;
                              return (
                                <a
                                  key={species}
                                  href={inatSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 min-w-[140px] hover:bg-slate-100 hover:border-slate-300 transition-colors"
                                >
                                  <div
                                    className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center text-xl shrink-0"
                                    title={`View ${species} on iNaturalist`}
                                  >
                                    {icon}
                                  </div>
                                  <span className="text-sm text-slate-800 truncate" title={species}>
                                    {species}
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No taxonomy data available.</p>
            )}
          </div>
        </div>
      </ChartCard>
    </section>
  );
}
