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

export function TaxonomicBreakdown({
  taxonomySummary,
  researchByTaxon,
  loading,
  error,
}: TaxonomicBreakdownProps) {
  const [expandedTaxon, setExpandedTaxon] = useState<string | null>(null);

  const stackedData = useMemo(() => {
    return (taxonomySummary ?? []).map((row) => ({
      ...row,
      redundant: Math.max(0, row.total_observations - row.total_species),
    }));
  }, [taxonomySummary]);

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
          {/* Stacked bar: unique species + redundant observations */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">
              Observations vs unique species (redundancy)
            </h4>
            {stackedData.length > 0 && (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={stackedData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="taxon_group" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name === 'total_species' ? 'Unique species' : name === 'redundant' ? 'Extra observations' : name,
                    ]}
                    labelFormatter={(label) => `Taxon: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="total_species" name="Unique species" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="redundant" name="Extra observations (redundancy)" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Research-grade rate by taxon */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Research-grade rate by taxon (quality)</h4>
            {researchByTaxon.length > 0 && (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={researchByTaxon} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="taxon_group" />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Research-grade']} />
                  <Bar dataKey="research_pct" name="Research-grade %" radius={[4, 4, 0, 0]}>
                    {researchByTaxon.map((_, i) => (
                      <Cell key={i} fill={researchByTaxon[i].research_pct >= 70 ? '#22c55e' : researchByTaxon[i].research_pct >= 40 ? '#eab308' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Iconic taxon view + drill-down to top species */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Iconic taxon view — drill down</h4>
            {taxonomySummary.length > 0 ? (
              <div className="flex flex-col gap-2">
                {taxonomySummary.map((row) => {
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
                          <p className="text-xs text-slate-500 mb-2">Top species in this group</p>
                          <div className="flex flex-wrap gap-4">
                            {(row.top_species ?? []).slice(0, 6).map((species) => {
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
