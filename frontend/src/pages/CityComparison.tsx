import { useMemo, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { ChartCard } from '../components/ChartCard';
import { MapWrapper } from '../components/MapWrapper';
import {
  CityStats,
  CitySpatial,
  CompetitionSplit,
  CommunityRank,
  CityTaxonItem,
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
} from 'recharts';

const CITIES = ['San Diego', 'San Antonio', 'Los Angeles'] as const;
const CITY_COLORS: Record<string, string> = {
  'San Diego': '#0ea5e9',
  'San Antonio': '#8b5cf6',
  'Los Angeles': '#f59e0b',
};

type SortKey = 'city' | 'year' | 'total_observations' | 'unique_species' | 'total_participants' | 'species_per_observer';

export function CityComparison() {
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [tableSort, setTableSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'total_observations', dir: 'desc' });



  // Three-city comparison data (real CNC results from iNaturalist)
  const { data: yearlyTrends, loading: loadingTrends, error: errorTrends } = useApi<CityStats[]>('/api/comparison/yearly-trends');
  const { data: spatialData, loading: loadingSpatial, error: errorSpatial } = useApi<CitySpatial[]>('/api/comparison/spatial');

  // Cross-city comparison data (real CNC 2025 from iNaturalist)
  const { data: cityTaxon, loading: loadingTaxon, error: errorTaxon } = useApi<CityTaxonItem[]>('/api/comparison/city-taxon-breakdown');
  const { data: citySpecies, loading: loadingSpecies, error: errorSpecies } = useApi<CityTopSpeciesItem[]>('/api/comparison/city-top-species');

  // SD-specific deep-dive data from the local dataset
  const { data: compSplit, loading: loadingSplit, error: errorSplit } = useApi<CompetitionSplit[]>('/api/comparison/competition-split');
  const { data: topComms, loading: loadingComms, error: errorComms } = useApi<CommunityRank[]>('/api/comparison/top-communities');

  const availableYears = useMemo(() => {
    if (!yearlyTrends?.length) return [];
    return [...new Set(yearlyTrends.map((t) => t.year))].sort((a, b) => a - b);
  }, [yearlyTrends]);
  const maxYear = availableYears.length > 0 ? Math.max(...availableYears) : null;

  const latestStats = useMemo(() => {
    if (!yearlyTrends?.length || maxYear == null) return [];
    return yearlyTrends.filter((s) => s.year === maxYear);
  }, [yearlyTrends, maxYear]);

  const tableRows = useMemo(() => {
    const rows = yearFilter === 'all' ? (yearlyTrends ?? []).slice() : (yearlyTrends ?? []).filter((s) => s.year === yearFilter);
    const { key, dir } = tableSort;
    rows.sort((a, b) => {
      const aVal = a[key], bVal = b[key];
      const cmp = typeof aVal === 'string' ? (aVal as string).localeCompare(bVal as string) : (aVal as number) - (bVal as number);
      return dir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [yearlyTrends, yearFilter, tableSort]);

  // Trend line data: one row per year, one key per city
  const observationsByYear = useMemo(() => {
    if (!yearlyTrends?.length) return [];
    const byYear: Record<number, Record<string, number>> = {};
    yearlyTrends.forEach((t) => { if (!byYear[t.year]) byYear[t.year] = { year: t.year }; byYear[t.year][t.city] = t.total_observations; });
    return Object.values(byYear).sort((a, b) => (a.year as number) - (b.year as number));
  }, [yearlyTrends]);

  const speciesByYear = useMemo(() => {
    if (!yearlyTrends?.length) return [];
    const byYear: Record<number, Record<string, number>> = {};
    yearlyTrends.forEach((t) => { if (!byYear[t.year]) byYear[t.year] = { year: t.year }; byYear[t.year][t.city] = t.unique_species; });
    return Object.values(byYear).sort((a, b) => (a.year as number) - (b.year as number));
  }, [yearlyTrends]);

  const participantsByYear = useMemo(() => {
    if (!yearlyTrends?.length) return [];
    const byYear: Record<number, Record<string, number>> = {};
    yearlyTrends.forEach((t) => { if (!byYear[t.year]) byYear[t.year] = { year: t.year }; byYear[t.year][t.city] = t.total_participants; });
    return Object.values(byYear).sort((a, b) => (a.year as number) - (b.year as number));
  }, [yearlyTrends]);

  // Efficiency: species / 1000 observations (how much biodiversity per unit effort)
  const efficiencyData = useMemo(() => {
    if (!latestStats?.length) return [];
    return latestStats.map((s) => ({
      city: s.city,
      species_per_1k_obs: s.total_observations > 0 ? Math.round((s.unique_species / s.total_observations) * 1000) : 0,
      obs_per_participant: s.total_participants > 0 ? Math.round(s.total_observations / s.total_participants) : 0,
    }));
  }, [latestStats]);

  // SD-specific derived data
  const topCommsFiltered = useMemo(() => (topComms ?? []).filter((c) => c.community && c.community !== 'Unknown'), [topComms]);
  const commYieldData = useMemo(() => [...topCommsFiltered].sort((a, b) => b.species_per_observation - a.species_per_observation), [topComms]);

  // Cross-city species grouped by city for display
  const speciesByCity = useMemo(() => {
    if (!citySpecies?.length) return {} as Record<string, CityTopSpeciesItem[]>;
    const map: Record<string, CityTopSpeciesItem[]> = {};
    citySpecies.forEach((s) => { if (!map[s.city]) map[s.city] = []; map[s.city].push(s); });
    return map;
  }, [citySpecies]);

  const handleSort = useCallback((key: SortKey) => {
    setTableSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
  }, []);

  const WINDOW_LABELS: Record<string, string> = { competition: 'During CNC', non_competition: 'Rest of year' };

  const SortableTh = ({ label, sortKey, align = 'right' }: { label: string; sortKey: SortKey; align?: 'left' | 'right' }) => (
    <th className={`px-6 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`} onClick={() => handleSort(sortKey)}>
      {label} {tableSort.key === sortKey && (tableSort.dir === 'asc' ? '↑' : '↓')}
    </th>
  );

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/*  PART 1: SD vs San Antonio vs LA (per consulting doc)        */}
      {/* ============================================================ */}

      <div>
        <h2 className="text-3xl font-bold text-gray-900">City Comparison</h2>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Comparative analysis of <strong>San Diego vs. San Antonio vs. Los Angeles</strong> in the City Nature Challenge.
          All numbers are real CNC results from iNaturalist (2023-2025). San Antonio has massively outpaced both SD and LA,
          and understanding why is key to improving San Diego's strategy.
        </p>
      </div>

      {/* KPI strip: latest-year headline numbers per city */}
      <ChartCard title={`CNC ${maxYear ?? ''} results`} subtitle="Official City Nature Challenge totals" loading={loadingTrends} error={errorTrends} compact>
        {latestStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-1">
            {latestStats.map((s) => (
              <div key={s.city} className="rounded-lg p-4" style={{ backgroundColor: `${CITY_COLORS[s.city]}10`, border: `1px solid ${CITY_COLORS[s.city]}40` }}>
                <div className="text-sm font-bold mb-2" style={{ color: CITY_COLORS[s.city] }}>{s.city}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">Observations</span><br /><span className="font-bold text-slate-800">{formatNumber(s.total_observations)}</span></div>
                  <div><span className="text-slate-500">Species</span><br /><span className="font-bold text-slate-800">{formatNumber(s.unique_species)}</span></div>
                  <div><span className="text-slate-500">Participants</span><br /><span className="font-bold text-slate-800">{formatNumber(s.total_participants)}</span></div>
                  <div><span className="text-slate-500">Species/observer</span><br /><span className="font-bold text-slate-800">{s.species_per_observer.toFixed(2)}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Side-by-side stats table (consulting doc requirement) */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          Full side-by-side comparison across all CNC years. San Antonio's observation count exploded from ~20K in 2023 to 135K in 2025 (6.7× growth),
          while San Diego grew only 1.6×. Click column headers to sort.
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="text-sm font-medium text-slate-700">Year:</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-300">
            <button type="button" onClick={() => setYearFilter('all')} className={`px-3 py-1.5 text-sm font-medium ${yearFilter === 'all' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>All</button>
            {availableYears.map((y) => (
              <button key={y} type="button" onClick={() => setYearFilter(y)} className={`px-3 py-1.5 text-sm font-medium ${yearFilter === y ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>{y}</button>
            ))}
          </div>
        </div>
        <ChartCard title="City statistics" subtitle="Observations, species, participants per year (click column to sort)" loading={loadingTrends} error={errorTrends}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTh label="City" sortKey="city" align="left" />
                  <SortableTh label="Year" sortKey="year" />
                  <SortableTh label="Observations" sortKey="total_observations" />
                  <SortableTh label="Species" sortKey="unique_species" />
                  <SortableTh label="Participants" sortKey="total_participants" />
                  <SortableTh label="Species/observer" sortKey="species_per_observer" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableRows.map((s) => (
                  <tr key={`${s.city}-${s.year}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium" style={{ color: CITY_COLORS[s.city] ?? '#334155' }}>{s.city}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-right">{s.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">{formatNumber(s.total_observations)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{formatNumber(s.unique_species)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{formatNumber(s.total_participants)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{s.species_per_observer.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </section>

      {/* Multi-year trend charts (consulting doc requirement) */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          Multi-year trends reveal momentum. San Antonio's growth is exponential while SD and LA are roughly linear.
          This suggests a systemic advantage (community mobilization, event coordination) rather than just more biodiversity.
        </p>
        <ChartCard title="Observations over time" subtitle="Total CNC observations by city (2023-2025)" loading={loadingTrends} error={errorTrends}>
          {observationsByYear.length > 0 && (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={observationsByYear} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(v: number) => formatNumber(v)} />
                <Legend />
                {CITIES.map((c) => <Line key={c} type="monotone" dataKey={c} stroke={CITY_COLORS[c]} strokeWidth={2} dot={{ r: 5 }} />)}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <ChartCard title="Unique species over time" subtitle="Species documented per CNC" loading={loadingTrends} error={errorTrends}>
            {speciesByYear.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={speciesByYear} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Legend />
                  {CITIES.map((c) => <Line key={c} type="monotone" dataKey={c} stroke={CITY_COLORS[c]} strokeWidth={2} dot={{ r: 4 }} />)}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Participants over time" subtitle="Number of observers per CNC" loading={loadingTrends} error={errorTrends}>
            {participantsByYear.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={participantsByYear} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Legend />
                  {CITIES.map((c) => <Line key={c} type="monotone" dataKey={c} stroke={CITY_COLORS[c]} strokeWidth={2} dot={{ r: 4 }} />)}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      {/* Observation efficiency: species per 1K observations + observations per participant */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          Raw observation count is not everything. <strong>Efficiency</strong> matters for the CNC because only unique species count.
          San Diego actually has higher species-per-1000-observations than San Antonio, meaning SD observers are less redundant.
          However, San Antonio's sheer volume overwhelms: each SA participant contributes far more observations on average.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="Species per 1,000 observations" subtitle="Biodiversity yield (higher = less redundant sampling)" loading={loadingTrends} error={errorTrends}>
            {efficiencyData.length > 0 && (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={efficiencyData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => [v, 'Species per 1K obs']} />
                  <Bar dataKey="species_per_1k_obs" name="Species / 1K obs" radius={[4, 4, 0, 0]}>
                    {efficiencyData.map((d, i) => <Cell key={i} fill={CITY_COLORS[d.city] ?? '#64748b'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Observations per participant" subtitle="Engagement depth (higher = more effort per person)" loading={loadingTrends} error={errorTrends}>
            {efficiencyData.length > 0 && (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={efficiencyData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => [v, 'Obs per participant']} />
                  <Bar dataKey="obs_per_participant" name="Obs / participant" radius={[4, 4, 0, 0]}>
                    {efficiencyData.map((d, i) => <Cell key={i} fill={CITY_COLORS[d.city] ?? '#64748b'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      {/* Spatial distribution comparison maps */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          Geographic distribution of observations. Compare how each metro area's observers are spread across the landscape.
        </p>
        <ChartCard title="Observation distribution by city" subtitle="Geographic spread of CNC observations" loading={loadingSpatial} error={errorSpatial}>
          {spatialData && spatialData.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {spatialData.map((s) => (
                <div key={s.city}>
                  <div className="text-sm font-semibold mb-2" style={{ color: CITY_COLORS[s.city] }}>{s.city}</div>
                  <MapWrapper center={[s.center_lat, s.center_lng]} zoom={10} markers={s.markers} height="320px" markerColor={CITY_COLORS[s.city]} />
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </section>

      {/* ============================================================ */}
      {/*  PART 2: Cross-city taxonomic and species comparison          */}
      {/* ============================================================ */}

      <div className="border-t-2 border-slate-200 pt-8">
        <h2 className="text-2xl font-bold text-gray-900">What Each City Observes</h2>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Comparing the taxonomic mix and top species across all three cities reveals what drives
          San Antonio's dominance and where San Diego has room to improve.
        </p>
      </div>

      {/* Taxon breakdown across cities */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          San Antonio does not just have more observations. It has dramatically more in <strong>every taxon group</strong>,
          especially Insecta (24K vs SD's 3K). This suggests much broader participant engagement beyond just plants.
        </p>
        <ChartCard title="Taxon breakdown by city" subtitle="CNC 2025 observations per taxonomic group (all three cities)" loading={loadingTaxon} error={errorTaxon}>
          {cityTaxon && cityTaxon.length > 0 && (
            <ResponsiveContainer width="100%" height={Math.max(360, cityTaxon.length * 40)}>
              <BarChart data={cityTaxon} layout="vertical" margin={{ top: 4, right: 30, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                <YAxis type="category" dataKey="taxon_group" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatNumber(v)} />
                <Legend />
                <Bar dataKey="san_diego" name="San Diego" fill={CITY_COLORS['San Diego']} />
                <Bar dataKey="san_antonio" name="San Antonio" fill={CITY_COLORS['San Antonio']} />
                <Bar dataKey="los_angeles" name="Los Angeles" fill={CITY_COLORS['Los Angeles']} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* Top species per city - side by side */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          Each city's top species reveal local ecology and observer behavior. San Antonio's top species
          have 3-4x more observations than San Diego's, and LA's top species include a reptile and insect,
          showing more diverse observation effort compared to SD's plant-heavy list.
        </p>
        <ChartCard title="Top 10 species per city" subtitle="CNC 2025, most frequently observed species in each metro" loading={loadingSpecies} error={errorSpecies}>
          {Object.keys(speciesByCity).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {CITIES.map((city) => {
                const species = speciesByCity[city] ?? [];
                return (
                  <div key={city}>
                    <div className="text-sm font-bold mb-3" style={{ color: CITY_COLORS[city] }}>{city}</div>
                    <div className="space-y-1.5">
                      {species.map((s) => (
                        <div key={s.rank} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-400 w-5 text-right font-mono">{s.rank}.</span>
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium text-slate-800" title={`${s.common_name} (${s.scientific_name})`}>{s.common_name}</div>
                            <div className="text-xs text-slate-500 truncate italic">{s.scientific_name} · {s.taxon_group}</div>
                          </div>
                          <span className="font-bold text-slate-700 tabular-nums">{formatNumber(s.count)}</span>
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

      {/* ============================================================ */}
      {/*  PART 3: San Diego internal analysis                          */}
      {/* ============================================================ */}

      <div className="border-t-2 border-slate-200 pt-8">
        <h2 className="text-2xl font-bold text-gray-900">San Diego Internal Analysis</h2>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Digging into San Diego's 224K observations across 54 communities to find where effort is
          concentrated and where it could be better allocated.
        </p>
      </div>

      {/* Competition window head-to-head */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          How does San Diego's CNC window compare to the rest of the year? The competition produces
          a concentrated burst, but is it efficient at discovering new species?
        </p>
        <ChartCard title="SD: Competition window vs rest of year" subtitle="CNC period compared to year-round observations" loading={loadingSplit} error={errorSplit} compact>
          {compSplit && compSplit.length === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2">
              {compSplit.map((s) => (
                <div key={s.window} className={`rounded-lg p-5 ${s.window === 'competition' ? 'bg-sky-50 border border-sky-200' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="text-sm font-bold mb-3" style={{ color: s.window === 'competition' ? '#0369a1' : '#475569' }}>
                    {WINDOW_LABELS[s.window] ?? s.window}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-500 block">Observations</span><span className="font-bold text-lg">{formatNumber(s.observations)}</span></div>
                    <div><span className="text-slate-500 block">Unique species</span><span className="font-bold text-lg">{formatNumber(s.unique_species)}</span></div>
                    <div><span className="text-slate-500 block">Participants</span><span className="font-bold text-lg">{formatNumber(s.participants)}</span></div>
                    <div><span className="text-slate-500 block">Research-grade</span><span className="font-bold text-lg">{s.research_pct}%</span></div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Species per observation</span>
                      <span className="font-bold text-lg">{s.species_per_observation.toFixed(4)}</span>
                      <span className="text-xs text-slate-500 ml-2">(higher = more efficient)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </section>

      {/* Top communities + Biodiversity yield side by side */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          Which SD communities generate the most observations, and which have the best biodiversity yield?
          High-yield communities should be prioritized during the CNC.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="SD: Top communities by volume" subtitle="Observations and species for top 15 communities" loading={loadingComms} error={errorComms}>
            {topCommsFiltered.length > 0 && (
              <ResponsiveContainer width="100%" height={Math.max(360, topCommsFiltered.length * 32)}>
                <BarChart data={topCommsFiltered} layout="vertical" margin={{ top: 4, right: 30, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                  <YAxis type="category" dataKey="community" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, name: string) => [formatNumber(v), name]} />
                  <Legend />
                  <Bar dataKey="observations" name="Observations" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="unique_species" name="Species" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="SD: Biodiversity yield by community" subtitle="Species per observation (higher = more efficient)" loading={loadingComms} error={errorComms}>
            {commYieldData.length > 0 && (
              <ResponsiveContainer width="100%" height={Math.max(360, commYieldData.length * 32)}>
                <BarChart data={commYieldData} layout="vertical" margin={{ top: 4, right: 30, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => v.toFixed(2)} />
                  <YAxis type="category" dataKey="community" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v.toFixed(4), 'Species per obs']} />
                  <Bar dataKey="species_per_observation" name="Yield" radius={[0, 4, 4, 0]}>
                    {commYieldData.map((_, i) => <Cell key={i} fill={i < 5 ? '#059669' : i < 10 ? '#0ea5e9' : '#94a3b8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
