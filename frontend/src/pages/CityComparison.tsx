import { useMemo, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { ChartCard } from '../components/ChartCard';
import {
  CityStats,
  CityTopSpeciesItem,
} from '../types';
import { formatNumber } from '../utils/helpers';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  Label,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Top 5 in each CNC 2025 category  (from official leaderboard)      */
/* ------------------------------------------------------------------ */
const TOP5_OBS = ['La Paz', 'San Antonio', 'Cochabamba', 'Ostrava', 'Dallas-Fort Worth'] as const;
const TOP5_SPP = ['Cochabamba', 'San Antonio', 'Hong Kong', 'Graz', 'La Paz'] as const;
const TOP5_PPL = ['La Paz', 'Cochabamba', 'San Francisco Bay Area', 'San Antonio', 'Washington DC'] as const;

const SD = 'San Diego';
const SD_GLOBAL_RANKS = { observations: 21, species: 20, people: 16, total_cities: 669 } as const;

const ALL_CITIES = [
  SD, 'La Paz', 'San Antonio', 'Cochabamba', 'Ostrava',
  'Dallas-Fort Worth', 'Hong Kong', 'Graz', 'San Francisco Bay Area', 'Washington DC',
] as const;

const CITY_COLOR: Record<string, string> = {
  'San Diego': '#0ea5e9',
  'La Paz': '#ef4444',
  'San Antonio': '#8b5cf6',
  'Cochabamba': '#f97316',
  'Ostrava': '#14b8a6',
  'Dallas-Fort Worth': '#f59e0b',
  'Hong Kong': '#ec4899',
  'Graz': '#84cc16',
  'San Francisco Bay Area': '#6366f1',
  'Washington DC': '#0d9488',
};

const FLAG: Record<string, string> = {
  'San Diego': '🇺🇸', 'La Paz': '🇧🇴', 'San Antonio': '🇺🇸', 'Cochabamba': '🇧🇴',
  'Ostrava': '🇨🇿', 'Dallas-Fort Worth': '🇺🇸', 'Hong Kong': '🇭🇰', 'Graz': '🇦🇹',
  'San Francisco Bay Area': '🇺🇸', 'Washington DC': '🇺🇸',
};

// CNC 2025 official global rankings (out of 669 cities)
const GLOBAL_RANK_OBS: Record<string, number> = {
  'La Paz': 1, 'San Antonio': 2, 'Cochabamba': 3, 'Ostrava': 4, 'Dallas-Fort Worth': 5,
  'Washington DC': 8, 'Graz': 9, 'San Francisco Bay Area': 10, 'Hong Kong': 12, 'San Diego': 21,
};
const GLOBAL_RANK_SPP: Record<string, number> = {
  'Cochabamba': 1, 'San Antonio': 2, 'Hong Kong': 3, 'Graz': 4, 'La Paz': 5,
  'Dallas-Fort Worth': 6, 'San Francisco Bay Area': 10, 'Washington DC': 12, 'San Diego': 20, 'Ostrava': 50,
};
const GLOBAL_RANK_PPL: Record<string, number> = {
  'La Paz': 1, 'Cochabamba': 2, 'San Francisco Bay Area': 3, 'San Antonio': 4, 'Washington DC': 5,
  'Dallas-Fort Worth': 8, 'Ostrava': 15, 'San Diego': 16, 'Hong Kong': 17, 'Graz': 49,
};

type SortKey = 'city' | 'year' | 'total_observations' | 'unique_species' | 'total_participants' | 'species_per_observer';
type Tab = 'observations' | 'species' | 'people';
type DataTab = 'observations' | 'species' | 'people' | 'all';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function CityComparison() {
  const [tab, setTab] = useState<Tab>('observations');
  const [dataTab, setDataTab] = useState<DataTab>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [tableSort, setTableSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'total_observations', dir: 'desc' });

  const { data: yearlyTrends, loading: loadingTrends, error: errorTrends } = useApi<CityStats[]>('/api/comparison/yearly-trends');
  const { data: citySpecies, loading: loadingSpecies, error: errorSpecies } = useApi<CityTopSpeciesItem[]>('/api/comparison/city-top-species');

  const availableYears = useMemo(() => {
    if (!yearlyTrends?.length) return [];
    return [...new Set(yearlyTrends.map((t) => t.year))].sort((a, b) => a - b);
  }, [yearlyTrends]);
  const maxYear = availableYears.length > 0 ? Math.max(...availableYears) : null;

  const latest = useMemo(() => {
    if (!yearlyTrends?.length || maxYear == null) return [] as CityStats[];
    return yearlyTrends.filter((s) => s.year === maxYear);
  }, [yearlyTrends, maxYear]);

  const sdRow = useMemo(() => latest.find((s) => s.city === SD), [latest]);

  const activeCities: readonly string[] = tab === 'observations' ? TOP5_OBS : tab === 'species' ? TOP5_SPP : TOP5_PPL;
  const tabCities = useMemo(() => [SD, ...activeCities] as string[], [activeCities]);

  const tabLatest = useMemo(() => latest.filter((s) => tabCities.includes(s.city)), [latest, tabCities]);
  const tabMetricKey: keyof CityStats =
    tab === 'observations' ? 'total_observations' : tab === 'species' ? 'unique_species' : 'total_participants';
  const tabSorted = useMemo(() => [...tabLatest].sort((a, b) => (b[tabMetricKey] as number) - (a[tabMetricKey] as number)), [tabLatest, tabMetricKey]);
  const sdGlobalRank = tab === 'observations' ? SD_GLOBAL_RANKS.observations : tab === 'species' ? SD_GLOBAL_RANKS.species : SD_GLOBAL_RANKS.people;
  const tabLabel = tab === 'observations' ? 'Observations' : tab === 'species' ? 'Species' : 'People';

  // Efficiency
  const efficiencyData = useMemo(() => {
    if (!tabLatest?.length) return [];
    return [...tabLatest].map((s) => ({
      city: s.city,
      spp_per_observer: s.species_per_observer,
      obs_per_participant: s.total_participants > 0 ? Math.round(s.total_observations / s.total_participants) : 0,
    })).sort((a, b) => b.spp_per_observer - a.spp_per_observer);
  }, [tabLatest]);

  // Species over time (species tab)
  const speciesTrend = useMemo(() => {
    if (!yearlyTrends?.length) return [];
    const byYear: Record<number, Record<string, number>> = {};
    yearlyTrends.filter((t) => tabCities.includes(t.city)).forEach((t) => {
      if (!byYear[t.year]) byYear[t.year] = { year: t.year };
      byYear[t.year][t.city] = t.unique_species;
    });
    return Object.values(byYear).sort((a, b) => (a.year as number) - (b.year as number));
  }, [yearlyTrends, tabCities]);

  // Participants over time (people tab)
  const peopleTrend = useMemo(() => {
    if (!yearlyTrends?.length) return [];
    const byYear: Record<number, Record<string, number>> = {};
    yearlyTrends.filter((t) => tabCities.includes(t.city)).forEach((t) => {
      if (!byYear[t.year]) byYear[t.year] = { year: t.year };
      byYear[t.year][t.city] = t.total_participants;
    });
    return Object.values(byYear).sort((a, b) => (a.year as number) - (b.year as number));
  }, [yearlyTrends, tabCities]);

  // People tab: participant-to-observation conversion (how effectively participants translate into observations)
  const conversionData = useMemo(() => {
    if (!tabLatest?.length) return [];
    return [...tabLatest].map((s) => ({
      city: s.city,
      participants: s.total_participants,
      observations: s.total_observations,
      species: s.unique_species,
      obs_per_person: s.total_participants > 0 ? Math.round(s.total_observations / s.total_participants) : 0,
      spp_per_person: s.total_participants > 0 ? +(s.unique_species / s.total_participants).toFixed(1) : 0,
    })).sort((a, b) => b.participants - a.participants);
  }, [tabLatest]);

  // Top species
  const speciesByCity = useMemo(() => {
    if (!citySpecies?.length) return {} as Record<string, CityTopSpeciesItem[]>;
    const map: Record<string, CityTopSpeciesItem[]> = {};
    citySpecies.forEach((s) => { if (!map[s.city]) map[s.city] = []; map[s.city].push(s); });
    return map;
  }, [citySpecies]);

  // All 10 cities latest data (for All Data View KPI cards)
  const dataTabRankMap: Record<string, number> | null =
    dataTab === 'observations' ? GLOBAL_RANK_OBS : dataTab === 'species' ? GLOBAL_RANK_SPP : dataTab === 'people' ? GLOBAL_RANK_PPL : null;

  const dataTabTop5: readonly string[] =
    dataTab === 'observations' ? TOP5_OBS : dataTab === 'species' ? TOP5_SPP : dataTab === 'people' ? TOP5_PPL : [];

  const allCitiesLatest = useMemo(() => {
    if (!latest?.length) return [];
    const filtered = latest.filter((s) => ALL_CITIES.includes(s.city as typeof ALL_CITIES[number]));
    const sd = filtered.find((s) => s.city === SD);
    const rest = filtered.filter((s) => s.city !== SD);
    if (dataTab !== 'all' && dataTabRankMap) {
      rest.sort((a, b) => (dataTabRankMap[a.city] ?? 999) - (dataTabRankMap[b.city] ?? 999));
    } else {
      rest.sort((a, b) => b.total_observations - a.total_observations);
    }
    return sd ? [sd, ...rest] : rest;
  }, [latest, dataTab, dataTabRankMap]);

  const dataTabLabel = dataTab === 'observations' ? 'Observations' : dataTab === 'species' ? 'Species' : dataTab === 'people' ? 'People' : '';

  // Full table
  const tableRows = useMemo(() => {
    if (!yearlyTrends?.length) return [];
    let rows = yearFilter === 'all' ? yearlyTrends.slice() : yearlyTrends.filter((s) => s.year === yearFilter);
    rows = rows.filter((s) => ALL_CITIES.includes(s.city as typeof ALL_CITIES[number]));
    const { key, dir } = tableSort;
    rows.sort((a, b) => {
      const av = a[key], bv = b[key];
      const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
      return dir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [yearlyTrends, yearFilter, tableSort]);

  const handleSort = useCallback((key: SortKey) => {
    setTableSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
  }, []);

  const SortableTh = ({ label, sortKey, align = 'right' }: { label: string; sortKey: SortKey; align?: 'left' | 'right' }) => (
    <th className={`px-4 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`} onClick={() => handleSort(sortKey)}>
      {label} {tableSort.key === sortKey && (tableSort.dir === 'asc' ? '↑' : '↓')}
    </th>
  );

  /* ================================================================ */
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">San Diego vs. CNC 2025 Top 5</h2>
        <p className="text-gray-600 mt-2 max-w-3xl">
          The City Nature Challenge ranks 669 cities in three categories: <strong>Observations</strong>, <strong>Species</strong>, and <strong>People</strong>.
          San Diego placed <strong>#{SD_GLOBAL_RANKS.observations}</strong> in observations, <strong>#{SD_GLOBAL_RANKS.species}</strong> in species,
          and <strong>#{SD_GLOBAL_RANKS.people}</strong> in participants.
          Select a category below — everything on this page adapts to show SD vs. that category's top 5.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  TAB SELECTOR                                                 */}
      {/* ============================================================ */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'observations' as Tab, label: 'Most Observations', rank: SD_GLOBAL_RANKS.observations, color: '#0ea5e9' },
          { key: 'species' as Tab, label: 'Most Species', rank: SD_GLOBAL_RANKS.species, color: '#10b981' },
          { key: 'people' as Tab, label: 'Most People', rank: SD_GLOBAL_RANKS.people, color: '#8b5cf6' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
              tab === t.key
                ? 'text-white shadow-lg scale-[1.02]'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
            }`}
            style={tab === t.key ? { backgroundColor: t.color } : {}}
          >
            {t.label}
            <span className="ml-2 text-xs opacity-80">(SD #{t.rank})</span>
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  SD POSITION CARD                                             */}
      {/* ============================================================ */}
      {sdRow && (
        <ChartCard
          title={`San Diego — #${sdGlobalRank} of 669 in ${tabLabel}`}
          subtitle={`How SD stacks up against the top 5 cities for ${tabLabel.toLowerCase()}`}
          loading={loadingTrends} error={errorTrends} compact
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
            {(() => {
              const leader = tabSorted[0];
              if (!leader) return null;
              const sdVal = sdRow[tabMetricKey] as number;
              const leaderVal = leader[tabMetricKey] as number;
              const gap = leaderVal - sdVal;
              const pct = Math.round((sdVal / leaderVal) * 100);
              return (
                <>
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <div className="text-xs font-semibold text-sky-600 uppercase tracking-wide">{tabLabel} — San Diego</div>
                    <div className="mt-1 text-3xl font-bold text-sky-700">{formatNumber(sdVal)}</div>
                    <div className="mt-1 text-sm text-sky-500 font-medium">#{sdGlobalRank} of 669 globally</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tabLabel} — #1 ({leader.city})</div>
                    <div className="mt-1 text-3xl font-bold text-slate-700">{formatNumber(leaderVal)}</div>
                    <div className="mt-1 text-sm text-slate-400">{FLAG[leader.city]} Global leader</div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="text-xs font-semibold text-red-500 uppercase tracking-wide">Gap to Close</div>
                    <div className="mt-1 text-3xl font-bold text-red-600">{formatNumber(gap)}</div>
                    <div className="mt-2 w-full bg-red-200 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                    <div className="text-xs text-red-400 mt-1">SD is at {pct}% of the leader</div>
              </div>
                </>
              );
            })()}
          </div>
        </ChartCard>
      )}

      {/* ============================================================ */}
      {/*  RANKED BAR CHART                                             */}
      {/* ============================================================ */}
      <ChartCard
        title={`CNC 2025 — Top 5 by ${tabLabel} + San Diego`}
        subtitle="Official rankings from the City Nature Challenge leaderboard"
        loading={loadingTrends} error={errorTrends}
      >
        {tabSorted.length > 0 && (
          <ResponsiveContainer width="100%" height={Math.max(280, tabSorted.length * 52)}>
            <BarChart data={tabSorted} layout="vertical" margin={{ top: 8, right: 40, left: 8, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatNumber(v)}>
                <Label value={tabLabel} position="insideBottom" offset={-18} style={{ fontSize: 12, fill: '#64748b' }} />
              </XAxis>
              <YAxis
                type="category" dataKey="city" width={190}
                tick={(props: { x: number; y: number; payload: { value: string } }) => {
                  const city = props.payload.value;
                  const isSd = city === SD;
                  const rank = isSd ? `#${sdGlobalRank}` : `#${activeCities.indexOf(city as typeof activeCities[number]) + 1}`;
                  return (
                    <text x={props.x} y={props.y} dy={4} textAnchor="end" fontSize={12} fontWeight={isSd ? 700 : 400} fill={isSd ? '#0ea5e9' : '#334155'}>
                      {rank} {FLAG[city]} {city}
                    </text>
                  );
                }}
              />
              <Tooltip formatter={(v: number) => formatNumber(v)} />
              <Bar dataKey={tabMetricKey} name={tabLabel} radius={[0, 6, 6, 0]}>
                {tabSorted.map((d) => (
                  <Cell key={d.city} fill={d.city === SD ? '#0ea5e9' : CITY_COLOR[d.city] ?? '#94a3b8'} stroke={d.city === SD ? '#0369a1' : 'transparent'} strokeWidth={d.city === SD ? 2 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ============================================================ */}
      {/*  EFFICIENCY — all tabs                                        */}
      {/* ============================================================ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Species per Observer" subtitle={`Comparing SD against the top 5 cities by ${tabLabel.toLowerCase()}. Switch tabs above to compare against a different category's top 5.`} loading={loadingTrends} error={errorTrends}>
          {efficiencyData.length > 0 && (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={efficiencyData} layout="vertical" margin={{ top: 8, right: 30, left: 8, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number">
                  <Label value="Species per Observer" position="insideBottom" offset={-18} style={{ fontSize: 12, fill: '#64748b' }} />
                </XAxis>
                <YAxis type="category" dataKey="city" width={160} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v.toFixed(2), 'Species / Observer']} />
                <Bar dataKey="spp_per_observer" name="Spp / Observer" radius={[0, 6, 6, 0]}>
                  {efficiencyData.map((d) => <Cell key={d.city} fill={CITY_COLOR[d.city]} stroke={d.city === SD ? '#0369a1' : 'transparent'} strokeWidth={d.city === SD ? 2.5 : 0} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Observations per Participant" subtitle={`Comparing SD against the top 5 cities by ${tabLabel.toLowerCase()}. Switch tabs above to compare against a different category's top 5.`} loading={loadingTrends} error={errorTrends}>
          {efficiencyData.length > 0 && (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={[...efficiencyData].sort((a, b) => b.obs_per_participant - a.obs_per_participant)} layout="vertical" margin={{ top: 8, right: 30, left: 8, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number">
                  <Label value="Observations per Participant" position="insideBottom" offset={-18} style={{ fontSize: 12, fill: '#64748b' }} />
                </XAxis>
                <YAxis type="category" dataKey="city" width={160} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v, 'Obs / Participant']} />
                <Bar dataKey="obs_per_participant" name="Obs / Participant" radius={[0, 6, 6, 0]}>
                  {[...efficiencyData].sort((a, b) => b.obs_per_participant - a.obs_per_participant).map((d) => <Cell key={d.city} fill={CITY_COLOR[d.city]} stroke={d.city === SD ? '#0369a1' : 'transparent'} strokeWidth={d.city === SD ? 2.5 : 0} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* ============================================================ */}
      {/*  SPECIES TAB ONLY — Species trend + Top species               */}
      {/* ============================================================ */}
      {tab === 'species' && (
        <>
          <ChartCard title="Species Documented Over Time" subtitle="Unique species per CNC year (2023-2025)" loading={loadingTrends} error={errorTrends}>
            {speciesTrend.length > 0 && (
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={speciesTrend} margin={{ top: 8, right: 24, left: 8, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year">
                    <Label value="Year" position="insideBottom" offset={-18} style={{ fontSize: 12, fill: '#64748b' }} />
                  </XAxis>
                  <YAxis tickFormatter={(v) => formatNumber(v)}>
                    <Label value="Unique Species" angle={-90} position="insideLeft" offset={10} style={{ fontSize: 12, fill: '#64748b', textAnchor: 'middle' }} />
                  </YAxis>
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {tabCities.map((c) => <Line key={c} type="monotone" dataKey={c} stroke={CITY_COLOR[c]} strokeWidth={c === SD ? 3 : 1.5} dot={{ r: c === SD ? 6 : 3 }} />)}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <section>
            <ChartCard title="Top 10 Species per City" subtitle="Most frequently observed species in CNC 2025" loading={loadingSpecies} error={errorSpecies}>
              {Object.keys(speciesByCity).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {tabCities.filter((c) => speciesByCity[c]).map((city) => {
                    const species = speciesByCity[city] ?? [];
                    const isSd = city === SD;
                    const maxCount = species[0]?.count || 1;
                    return (
                      <div key={city} className={`rounded-xl p-4 ${isSd ? 'ring-2 ring-sky-300 bg-sky-50/50' : 'bg-slate-50/50'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span>{FLAG[city]}</span>
                          <span className="text-sm font-bold" style={{ color: CITY_COLOR[city] }}>{city}</span>
                        </div>
                        <div className="space-y-1.5">
                          {species.map((s) => (
                            <div key={s.rank} className="flex items-center gap-2 text-sm">
                              <span className="text-slate-400 w-5 text-right font-mono text-xs">{s.rank}.</span>
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-medium text-slate-800 text-xs" title={`${s.common_name} (${s.scientific_name})`}>{s.common_name}</div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="h-1.5 rounded-full bg-slate-200 flex-1">
                                    <div className="h-1.5 rounded-full" style={{ width: `${(s.count / maxCount) * 100}%`, backgroundColor: CITY_COLOR[city] }} />
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono w-10 text-right">{formatNumber(s.count)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </section>
        </>
      )}

      {/* ============================================================ */}
      {/*  PEOPLE TAB ONLY — Participant trend + conversion analysis     */}
      {/* ============================================================ */}
      {tab === 'people' && (
        <>
          <ChartCard title="Participants Over Time" subtitle="Number of CNC observers by city (2023-2025)" loading={loadingTrends} error={errorTrends}>
            {peopleTrend.length > 0 && (
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={peopleTrend} margin={{ top: 8, right: 24, left: 8, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year">
                    <Label value="Year" position="insideBottom" offset={-18} style={{ fontSize: 12, fill: '#64748b' }} />
                  </XAxis>
                  <YAxis tickFormatter={(v) => formatNumber(v)}>
                    <Label value="Participants" angle={-90} position="insideLeft" offset={10} style={{ fontSize: 12, fill: '#64748b', textAnchor: 'middle' }} />
                  </YAxis>
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {tabCities.map((c) => <Line key={c} type="monotone" dataKey={c} stroke={CITY_COLOR[c]} strokeWidth={c === SD ? 3 : 1.5} dot={{ r: c === SD ? 6 : 3 }} />)}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Participant Impact" subtitle="What does each city's participant base produce?" loading={loadingTrends} error={errorTrends}>
            {conversionData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-4 py-2 text-slate-500 font-medium">City</th>
                      <th className="text-right px-4 py-2 text-slate-500 font-medium">Participants</th>
                      <th className="text-right px-4 py-2 text-slate-500 font-medium">Obs / Person</th>
                      <th className="text-right px-4 py-2 text-slate-500 font-medium">Spp / Person</th>
                      <th className="text-right px-4 py-2 text-slate-500 font-medium">Total Observations</th>
                      <th className="text-right px-4 py-2 text-slate-500 font-medium">Total Species</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversionData.map((d) => {
                      const isSd = d.city === SD;
                      return (
                        <tr key={d.city} className={isSd ? 'bg-sky-50 font-medium' : 'hover:bg-slate-50'}>
                          <td className="px-4 py-2.5 font-medium" style={{ color: CITY_COLOR[d.city] }}>{FLAG[d.city]} {d.city}</td>
                          <td className="px-4 py-2.5 text-right font-bold">{formatNumber(d.participants)}</td>
                          <td className="px-4 py-2.5 text-right">{d.obs_per_person}</td>
                          <td className="px-4 py-2.5 text-right">{d.spp_per_person}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{formatNumber(d.observations)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{formatNumber(d.species)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
        </div>
            )}
          </ChartCard>
        </>
      )}

      {/* ============================================================ */}
      {/*  ACTIONABLE INSIGHTS  (tab-specific, above "all data")        */}
      {/* ============================================================ */}
      <section>
        <div className="border-t-2 border-slate-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900">Actionable Insights — Improving SD's {tabLabel} Ranking</h2>
          <p className="text-gray-600 mt-1 max-w-3xl">
            Specific strategies drawn from how the top 5 outperform San Diego in {tabLabel.toLowerCase()}.
          </p>
        </div>

        {tab === 'observations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            <InsightCard num={1} title="Replicate San Antonio's Exponential Mobilization" colorHex="#8b5cf6">
              San Antonio grew from 20K to 135K observations in 3 years (+571%). Their secret: strong coordination between Texas Parks & Wildlife,
              local Audubon chapters, and a charismatic urban biologist who became the public face of the effort.
              <strong> SD should appoint a visible "CNC Champion"</strong> and partner with NRS, SD Zoo, and Audubon to run coordinated field events across all 4 days.
            </InsightCard>
            <InsightCard num={2} title="Boost Per-Person Output to 50+" colorHex="#f59e0b">
              SD averages ~25 observations per participant. La Paz and San Antonio average ~45-49.
              <strong> Create "50-Observation Challenge" badges</strong> and guided routes at Torrey Pines, Mission Trails, and Balboa Park
              that walk participants through 50+ species systematically.
            </InsightCard>
            <InsightCard num={3} title="Engage Schools and Universities" colorHex="#0ea5e9">
              Cochabamba went from 4K to 110K in 3 years by mobilizing universities. With UCSD, SDSU, and USD in the metro area,
              <strong> integrate CNC into spring biology lab assignments</strong> — even 500 students doing 30 observations each adds 15K observations.
            </InsightCard>
            <InsightCard num={4} title="Extend Coverage Beyond Parks" colorHex="#10b981">
              Ostrava achieved 100K observations from a mid-size Czech city through neighborhood-level organizing.
              <strong> Recruit observers in underserved communities</strong> — National City, Chula Vista, El Cajon — where biodiversity data gaps are largest.
            </InsightCard>
          </div>
        )}

        {tab === 'species' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            <InsightCard num={1} title="Target Under-Sampled Taxa" colorHex="#10b981">
              Cochabamba documented 7,134 species — 2.5x SD's 2,844. Hong Kong got 4,970 species with a highly balanced mix of plants, insects, and arachnids.
              <strong> Organize taxon-focused events</strong>: night insect walks, tidepool forays, and fungal foraging meetups to push beyond plants.
            </InsightCard>
            <InsightCard num={2} title="Learn from Graz's Expert-Led Approach" colorHex="#84cc16">
              Graz documents 4,901 species with only 504 observers — 9.7 species per person vs SD's 2.18.
              Their strategy: expert naturalists leading targeted surveys of specific habitats.
              <strong> Recruit expert identifiers</strong> from SDNHM and UCSD to lead small, focused survey teams in under-explored habitats.
            </InsightCard>
            <InsightCard num={3} title="Cover More Habitat Types" colorHex="#0ea5e9">
              San Diego County has extraordinary habitat diversity (coastal, chaparral, desert, montane) but most CNC observations cluster in urban parks.
              <strong> Organize drives to Anza-Borrego edge, Laguna Mountains, and coastal wetlands</strong> where unique species are more likely.
            </InsightCard>
            <InsightCard num={4} title="Improve Identification Rates" colorHex="#8b5cf6">
              Hong Kong achieves 45%+ research-grade rate through active identifier recruitment. More confirmed IDs means more species counted.
              <strong> Host a parallel "ID-a-thon"</strong> during identification week to convert "needs ID" observations into confirmed species.
            </InsightCard>
                </div>
        )}

        {tab === 'people' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            <InsightCard num={1} title="Build on La Paz's Community Model" colorHex="#ef4444">
              La Paz mobilized 3,321 people — 2.5x San Diego's 1,304. They did it through partnerships with municipal government, schools, and
              indigenous community organizations.
              <strong> Partner with SD County, City Parks & Rec, and community centers</strong> in every neighborhood to create hyper-local events.
            </InsightCard>
            <InsightCard num={2} title="Leverage the Bay Area Playbook" colorHex="#6366f1">
              San Francisco Bay Area recruited 3,161 people by leveraging its dense network of nature organizations (Cal Academy, Audubon, Sierra Club).
              <strong> Coordinate a "San Diego Nature Alliance"</strong> — bring SD Zoo, Birch Aquarium, SDNHM, local Audubon, and NRS under one CNC umbrella campaign.
            </InsightCard>
            <InsightCard num={3} title="Tap Into Washington DC's Institutional Strategy" colorHex="#0d9488">
              DC mobilized 2,506 people through Smithsonian, National Park Service, and government agencies.
              <strong> Engage military bases (Camp Pendleton, MCAS Miramar)</strong>, federal land managers, and tribal communities
              who manage significant biodiversity areas in San Diego County.
            </InsightCard>
            <InsightCard num={4} title="Make It Social and Accessible" colorHex="#f97316">
              Cochabamba grew participants from 214 to 3,251 in 3 years (+1,419%). Key: making it a social event, not a science project.
              <strong> Create family-friendly "Nature Scavenger Hunt" events</strong> at accessible locations with food trucks, prizes, and photo contests
              to attract first-time participants.
            </InsightCard>
            </div>
          )}
      </section>

      {/* ============================================================ */}
      {/*  ALL DATA VIEW — always visible                               */}
      {/* ============================================================ */}
      <section>
        <div className="border-t-4 border-slate-300 pt-10 mb-4">
          <h2 className="text-2xl font-bold text-gray-900">All Data View</h2>
          <p className="text-gray-500 mt-1">All 10 comparison cities with CNC 2025 metrics. Select a category to see official global rankings.</p>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {([
            { key: 'all' as DataTab, label: 'All Metrics', color: '#64748b' },
            { key: 'observations' as DataTab, label: 'Observations', color: '#0ea5e9' },
            { key: 'species' as DataTab, label: 'Species', color: '#10b981' },
            { key: 'people' as DataTab, label: 'People', color: '#8b5cf6' },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setDataTab(t.key)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                dataTab === t.key
                  ? 'text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
              }`}
              style={dataTab === t.key ? { backgroundColor: t.color } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* KPI Cards — all 10 cities */}
        <ChartCard
          title={`CNC ${maxYear ?? ''} — ${dataTab === 'all' ? 'All Metrics' : dataTabLabel + ' Rankings'}`}
          subtitle={dataTab === 'all' ? 'Side-by-side comparison of all 10 cities' : `Sorted by ${dataTabLabel.toLowerCase()} — official CNC 2025 global rank shown`}
          loading={loadingTrends} error={errorTrends} compact
        >
          {allCitiesLatest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 py-1">
              {allCitiesLatest.map((s) => {
                const isSd = s.city === SD;
                const rank = dataTabRankMap?.[s.city];
                const isHighlighted = dataTab === 'all' || isSd || dataTabTop5.includes(s.city);
                const cardColor = isHighlighted ? CITY_COLOR[s.city] : '#94a3b8';
                return (
                  <div key={s.city} className={`rounded-xl p-4 transition-shadow ${isSd ? 'ring-2 ring-sky-400 shadow-lg' : 'shadow-sm'} ${!isHighlighted ? 'opacity-60' : ''}`} style={{ backgroundColor: `${cardColor}08`, border: `1.5px solid ${cardColor}40` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{FLAG[s.city]}</span>
                      <span className="text-sm font-bold" style={{ color: cardColor }}>
                        {dataTab !== 'all' && rank != null && <span className="mr-1">#{rank}</span>}
                        {s.city}
                      </span>
                      {isSd && dataTab === 'all' && <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full ml-auto">San Diego</span>}
                          </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-slate-500">Observations</span><br /><span className={`font-bold ${dataTab === 'observations' && isHighlighted ? 'text-sky-700 text-lg' : 'text-slate-800'}`}>{formatNumber(s.total_observations)}</span></div>
                      <div><span className="text-slate-500">Species</span><br /><span className={`font-bold ${dataTab === 'species' && isHighlighted ? 'text-emerald-700 text-lg' : 'text-slate-800'}`}>{formatNumber(s.unique_species)}</span></div>
                      <div><span className="text-slate-500">Participants</span><br /><span className={`font-bold ${dataTab === 'people' && isHighlighted ? 'text-purple-700 text-lg' : 'text-slate-800'}`}>{formatNumber(s.total_participants)}</span></div>
                      <div><span className="text-slate-500">Spp/Observer</span><br /><span className="font-bold text-slate-800">{s.species_per_observer.toFixed(2)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Data Table */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-sm font-medium text-slate-700">Year:</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-300">
              <button type="button" onClick={() => setYearFilter('all')} className={`px-3 py-1.5 text-sm font-medium ${yearFilter === 'all' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>All</button>
              {availableYears.map((y) => (
                <button key={y} type="button" onClick={() => setYearFilter(y)} className={`px-3 py-1.5 text-sm font-medium ${yearFilter === y ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>{y}</button>
              ))}
            </div>
          </div>
          <ChartCard title="" loading={loadingTrends} error={errorTrends}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableTh label="City" sortKey="city" align="left" />
                    <SortableTh label="Year" sortKey="year" />
                    <SortableTh label="Observations" sortKey="total_observations" />
                    <SortableTh label="Species" sortKey="unique_species" />
                    <SortableTh label="Participants" sortKey="total_participants" />
                    <SortableTh label="Spp/Observer" sortKey="species_per_observer" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableRows.map((s) => {
                    const isSd = s.city === SD;
                    return (
                      <tr key={`${s.city}-${s.year}`} className={isSd ? 'bg-sky-50 hover:bg-sky-100' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-2.5 whitespace-nowrap font-medium" style={{ color: CITY_COLOR[s.city] ?? '#334155' }}>{FLAG[s.city]} {s.city}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-600 text-right">{s.year}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-medium">{formatNumber(s.total_observations)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">{formatNumber(s.unique_species)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">{formatNumber(s.total_participants)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">{s.species_per_observer.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Insight Card                                                       */
/* ------------------------------------------------------------------ */
function InsightCard({ num, title, colorHex, children }: {
  num: number; title: string; colorHex: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: `linear-gradient(135deg, ${colorHex}08, ${colorHex}15)`, border: `1.5px solid ${colorHex}40` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold" style={{ backgroundColor: colorHex }}>{num}</div>
        <h3 className="font-bold text-sm" style={{ color: colorHex }}>{title}</h3>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: `${colorHex}dd` }}>{children}</p>
    </div>
  );
}
