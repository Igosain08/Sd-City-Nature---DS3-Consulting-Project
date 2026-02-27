import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { ChartCard } from '../components/ChartCard';
import { ObservationMap } from '../components/ObservationMap';
import { ObservationsOverTime } from '../components/ObservationsOverTime';
import { TaxonomicBreakdown } from '../components/TaxonomicBreakdown';
import { UserContributionSection } from '../components/UserContributionSection';
import { Observation, ExploratoryDashboard, SpeciesAccumulationPoint } from '../types';
import { isInSDParkOrTrail } from '../data/sdParksAndTrails';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const OBSERVATIONS_MAP_LIMIT = 250_000;
const QUALITY_COLORS = { research: '#22c55e', needs_id: '#eab308', casual: '#94a3b8', unknown: '#64748b' };

export type MapObservationFilter = 'all' | 'competition' | 'research_grade';

export type CompetitionFilter = 'all' | 'competition' | 'non_competition';

function competitionQuery(filter: CompetitionFilter): string {
  if (filter === 'all') return '';
  return filter === 'competition' ? 'competition_only=true' : 'competition_only=false';
}

/**
 * Exploratory Analysis Page — Key metrics, quality, geography, time, and species EDA with narrative.
 * Toggle filters all data by competition window (during CNC) vs rest of year.
 */
export function ExploratoryAnalysis() {
  const [competitionFilter, setCompetitionFilter] = useState<CompetitionFilter>('all');

  const querySuffix = useMemo(() => {
    const q = competitionQuery(competitionFilter);
    return q ? `?${q}` : '';
  }, [competitionFilter]);

  const [mapFilter, setMapFilter] = useState<MapObservationFilter>('all');
  const [parksAndTrailsOnly, setParksAndTrailsOnly] = useState(false);
  const [colorBy, setColorBy] = useState<'quality_grade' | 'taxon_group' | 'contributor_tier'>('quality_grade');
  const [dateRange, setDateRange] = useState<[string, string]>([
    '2025-04-25',
    '2025-04-28',
  ]);

  const observationsQuery = useMemo(() => {
    const base = `/api/exploratory/observations?limit=${OBSERVATIONS_MAP_LIMIT}`;
    const params = new URLSearchParams();
    if (mapFilter === 'competition') params.set('competition_only', 'true');
    if (mapFilter === 'research_grade') params.set('research_grade_only', 'true');
    const q = params.toString();
    return q ? `${base}&${q}` : base;
  }, [mapFilter]);

  const { data: dashboard, loading: loadingDash, error: errorDash } = useApi<ExploratoryDashboard>(
    `/api/exploratory/dashboard${querySuffix}`
  );
  const { data: observations, loading: loadingObs, error: errorObs } = useApi<Observation[]>(observationsQuery);
  const { data: speciesAccumulation, loading: loadingAccum, error: errorAccum } = useApi<SpeciesAccumulationPoint[]>(
    `/api/exploratory/species-accumulation${querySuffix}`
  );

  const mapObservations = useMemo(() => {
    const list = observations ?? [];
    if (!parksAndTrailsOnly || list.length === 0) return list;
    return list.filter((o) =>
      isInSDParkOrTrail(Number(o.latitude), Number(o.longitude))
    );
  }, [observations, parksAndTrailsOnly]);

  const dateExtent = useMemo(() => {
    if (!observations?.length) return null;
    const dates = observations.map((o) => o.observed_on?.slice(0, 10)).filter(Boolean) as string[];
    if (!dates.length) return null;
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    return [min, max] as [string, string];
  }, [observations]);

  const taxonomySummary = dashboard?.taxonomy_summary ?? [];
  const temporalTrends = dashboard?.temporal_trends ?? [];
  const loadingTax = loadingDash;
  const errorTax = errorDash;
  const loadingTemp = loadingDash;
  const errorTemp = errorDash;

  const kpis = dashboard?.kpis;
  const qualityGrade = dashboard?.quality_grade ?? [];
  const captiveWild = dashboard?.captive_wild ?? null;
  const byCommunityRaw = dashboard?.by_community ?? [];
  const byCommunity = useMemo(() => {
    if (byCommunityRaw.length <= 10) return byCommunityRaw;
    const sorted = [...byCommunityRaw].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    const top10 = sorted.slice(0, 10);
    const otherCount = sorted.slice(10).reduce((sum, r) => sum + (r.count ?? 0), 0);
    return [...top10, { community: 'Other', count: otherCount }];
  }, [byCommunityRaw]);
  const bySdNeighborhood = dashboard?.by_sd_neighborhood ?? [];
  const [communityViewMode, setCommunityViewMode] = useState<'region' | 'neighborhood'>('region');
  const communityChartData = communityViewMode === 'neighborhood' ? bySdNeighborhood : byCommunity;
  const byHour = dashboard?.by_hour ?? [];
  const userContrib = dashboard?.user_contribution;
  const uploadDelay = dashboard?.upload_delay ?? null;
  const researchByTaxon = dashboard?.research_rate_by_taxon ?? [];
  const hourlyByDow = dashboard?.hourly_by_dow ?? [];

  return (
    <div className="space-y-8">
      {/* Page title and intro */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Exploratory Analysis</h2>
        <p className="text-gray-600 mt-2 max-w-3xl">
          This page gives a descriptive overview of the iNaturalist observation data for the City Nature Challenge:
          who observed, what they saw, where and when, and how the data is graded. It sets the stage for later
          coverage analysis (Page 2), city comparison (Page 3), and strategy (Page 4).
        </p>
      </div>

      {/* Competition vs rest-of-year toggle */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <span className="text-sm font-medium text-slate-700">Show data:</span>
        <div className="flex rounded-lg overflow-hidden border border-slate-300">
          {(['all', 'competition', 'non_competition'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCompetitionFilter(option)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                competitionFilter === option
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {option === 'all' ? 'All' : option === 'competition' ? 'Competition only' : 'Non-competition only'}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {competitionFilter === 'all' && 'All observations in the dataset.'}
          {competitionFilter === 'competition' && 'Only observations during the City Nature Challenge window (e.g. April 26–29).'}
          {competitionFilter === 'non_competition' && 'Only observations outside the competition window.'}
        </p>
      </div>

      {/* KPI strip */}
      <ChartCard title="Key metrics" subtitle="Summary at a glance" loading={loadingDash} error={errorDash} compact>
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 py-1">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{kpis.total_observations.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Total observations</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{kpis.unique_species.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Unique species</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{kpis.unique_observers.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Unique observers</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-slate-800">
                {kpis.date_range_start && kpis.date_range_end
                  ? `${kpis.date_range_start} → ${kpis.date_range_end}`
                  : '—'}
              </div>
              <div className="text-sm text-slate-600">Date range</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">
                {kpis.research_grade_pct != null ? `${kpis.research_grade_pct}%` : '—'}
              </div>
              <div className="text-sm text-slate-600">Research-grade</div>
            </div>
          </div>
        )}
      </ChartCard>

      {/* Observation map + context */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          The map below shows where observations were recorded. Use the filters to focus on competition period,
          research-grade only, or color by quality, taxon group, or user experience. Drag the date range to see
          temporal evolution; markers cluster when zoomed out.
        </p>
        <ChartCard
          title="Observation distribution map"
          subtitle="Geographic distribution of observations"
          loading={loadingObs}
          error={errorObs}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Map data:</span>
                <div className="flex rounded-lg overflow-hidden border border-slate-300">
                  {(['all', 'competition', 'research_grade'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setMapFilter(opt)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        mapFilter === opt ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {opt === 'all' ? 'All' : opt === 'competition' ? 'Competition only' : 'Research-grade only'}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={parksAndTrailsOnly}
                  onChange={(e) => setParksAndTrailsOnly(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-slate-700">Parks and Trails</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Color by:</span>
                <select
                  value={colorBy}
                  onChange={(e) => setColorBy(e.target.value as typeof colorBy)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white text-slate-800"
                >
                  <option value="quality_grade">Quality grade</option>
                  <option value="taxon_group">Taxon group</option>
                  <option value="contributor_tier">User experience level</option>
                </select>
              </div>
            </div>
            {dateExtent && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Date range:</span>
                <input
                  type="date"
                  value={dateRange[0]}
                  onChange={(e) => setDateRange((prev) => [e.target.value, prev[1]])}
                  min={dateExtent[0]}
                  max={dateExtent[1]}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={dateRange[1]}
                  onChange={(e) => setDateRange((prev) => [prev[0], e.target.value])}
                  min={dateExtent[0]}
                  max={dateExtent[1]}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setDateRange(dateExtent)}
                  className="text-sm text-sky-600 hover:underline"
                >
                  Reset to full range
                </button>
              </div>
            )}
            {observations && (
              <ObservationMap
                observations={mapObservations}
                colorBy={colorBy}
                dateRange={dateRange}
                height="600px"
              />
            )}
          </div>
        </ChartCard>
      </section>

      {/* Species accumulation curve */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          The curve below shows how many unique species have been observed as the number of observations grows in <strong>chronological order</strong>. The x-axis is the number of observations (e.g. 1–1000 is the first thousand observations in time); the y-axis is the cumulative count of distinct species seen so far. It illustrates how quickly biodiversity accumulates and when the rate of new species levels off.
        </p>
        <ChartCard
          title="Species accumulation curve"
          subtitle="Cumulative unique species vs. number of observations (chronological)"
          loading={loadingAccum}
          error={errorAccum}
        >
          {speciesAccumulation && speciesAccumulation.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={speciesAccumulation} margin={{ top: 16, right: 24, left: 24, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="observation_count"
                  type="number"
                  name="Observations"
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                  label={{ value: 'Number of observations (chronological)', position: 'insideBottom', offset: -8 }}
                />
                <YAxis
                  dataKey="unique_species"
                  type="number"
                  name="Unique species"
                  label={{ value: 'Cumulative unique species', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number) => [value, 'Unique species']}
                  labelFormatter={(label) => `Observations: ${Number(label).toLocaleString()}`}
                />
                <Line
                  type="monotone"
                  dataKey="unique_species"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                  name="Unique species"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* Quality grade */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          For the City Nature Challenge, observation quality matters: <strong>research-grade</strong> observations
          have community agreement; <strong>needs_id</strong> and <strong>casual</strong> represent different
          levels of identification. This breakdown shows the mix of grades in the dataset.
        </p>
        <ChartCard
          title="Quality grade breakdown"
          subtitle="Research / needs_id / casual (counts and share)"
          loading={loadingDash}
          error={errorDash}
        >
          {qualityGrade.length > 0 && (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={qualityGrade}
                    dataKey="count"
                    nameKey="grade"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ grade, pct }) => `${grade} ${pct}%`}
                  >
                    {qualityGrade.map((_, i) => (
                      <Cell key={i} fill={QUALITY_COLORS[qualityGrade[i].grade as keyof typeof QUALITY_COLORS] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'observations']} />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={qualityGrade} layout="vertical" margin={{ left: 24 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="grade" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" name="Observations" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </section>

      {/* Captive vs wild */}
      {captiveWild != null && (
        <section>
          <p className="text-gray-700 mb-4 max-w-3xl">
            Captive or cultivated organisms do not count toward CNC totals. Only wild observations are included in challenge counts.
          </p>
          <ChartCard title="Captive vs wild" subtitle="Share of observations" loading={false} error={null} compact>
            <div className="flex flex-wrap items-center gap-8 w-fit">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Wild', value: captiveWild.wild_count, fill: '#22c55e' },
                      { name: 'Captive/cultivated', value: captiveWild.captive_count, fill: '#eab308' },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={64}
                    label={false}
                    labelLine={false}
                  />
                  <Tooltip formatter={(value: number, name: string) => [value.toLocaleString(), name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 w-3 h-3 rounded-sm bg-[#22c55e]" aria-hidden />
                  <span><strong>Wild:</strong> {captiveWild.wild_count.toLocaleString()} ({captiveWild.wild_pct}%) — count toward CNC</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 w-3 h-3 rounded-sm bg-[#eab308]" aria-hidden />
                  <span><strong>Captive/cultivated:</strong> {captiveWild.captive_count.toLocaleString()} ({captiveWild.captive_pct}%) — excluded</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-3 max-w-2xl">
              Total: {(captiveWild.wild_count + captiveWild.captive_count).toLocaleString()} observations.
              {captiveWild.wild_pct >= 90
                ? ' The vast majority are wild; dataset is well aligned with challenge rules.'
                : ' Consider outreach so participants record only wild organisms where possible.'}
            </p>
          </ChartCard>
        </section>
      )}

      {/* Observations by community */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          {communityViewMode === 'region'
            ? 'Activity by place name as recorded in the data (e.g. San Diego, Chula Vista, La Jolla). These are the top 10 labels from the dataset; each can be a city or a neighborhood depending on how the observation was tagged. All others are grouped as "Other".'
            : 'Observations within the City of San Diego, assigned to neighborhoods by map location only (coordinates). So "La Jolla" here means observations whose location falls in that area, regardless of how they were tagged. Areas not matching a defined neighborhood are grouped as "Other".'}
        </p>
        <ChartCard
          title="Observations by region / community"
          subtitle={communityViewMode === 'region' ? 'Observation count by community' : 'Observation count by San Diego neighborhood'}
          loading={loadingDash}
          error={errorDash}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-700">View by:</span>
              <div className="flex rounded-lg overflow-hidden border border-slate-300">
                <button
                  type="button"
                  onClick={() => setCommunityViewMode('region')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    communityViewMode === 'region' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Region (city)
                </button>
                <button
                  type="button"
                  onClick={() => setCommunityViewMode('neighborhood')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    communityViewMode === 'neighborhood' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  San Diego neighborhoods
                </button>
              </div>
            </div>
            {communityChartData.length > 0 && (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={communityChartData} margin={{ top: 8, right: 8, left: 8, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="community" angle={-45} textAnchor="end" height={80} interval={0} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" name="Observations" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </section>

      {/* Observations by hour */}
      <section>
        <p className="text-gray-700 mb-4 max-w-3xl">
          When do people tend to observe? This bar chart shows observation count by hour of day (0–23),
          revealing patterns such as morning or evening peaks.
        </p>
        <ChartCard
          title="Observations by hour of day"
          subtitle="Count by hour (0–23)"
          loading={loadingDash}
          error={errorDash}
        >
          {byHour.length > 0 && (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={byHour} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Observations" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <UserContributionSection
        userContribution={userContrib ?? null}
        userRetention={dashboard?.user_retention ?? null}
        loading={loadingDash}
        error={errorDash}
      />

      {uploadDelay != null && (
        <section>
          <p className="text-gray-700 mb-4 max-w-3xl">
            How quickly do people upload after observing? This describes behavior: same-day share and
            median delay in hours, plus a histogram of time from observation to upload.
          </p>
          <ChartCard
            title="Upload delay"
            subtitle="Time from observation to upload"
            loading={false}
            error={null}
          >
            <div className="mb-4 flex flex-wrap gap-6">
              <p><strong>Same-day uploads:</strong> {uploadDelay.same_day_pct}%</p>
              <p><strong>Median delay:</strong> {uploadDelay.median_hours} hours</p>
            </div>
            {uploadDelay.histogram.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={uploadDelay.histogram} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#06b6d4" name="Observations" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </section>
      )}

      {/* Observations over time: competition dates, all vs research-grade, day-of-week, hourly small multiples */}
      <ObservationsOverTime
        temporalTrends={temporalTrends}
        hourlyByDow={hourlyByDow}
        loading={loadingTemp}
        error={errorTemp}
      />

      {/* Taxonomic breakdown: stacked bar, research rate, iconic view + drill-down */}
      <TaxonomicBreakdown
        taxonomySummary={taxonomySummary ?? []}
        researchByTaxon={researchByTaxon}
        loading={loadingTax}
        error={errorTax}
      />
    </div>
  );
}
