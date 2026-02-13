import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { UserContributionDashboard, UserRetention } from '../types';

const SEGMENT_COLORS: Record<string, string> = {
  '1': '#94a3b8',
  '2–5': '#3b82f6',
  '6–20': '#8b5cf6',
  '21–100': '#f97316',
  '100+': '#dc2626',
};

interface UserContributionSectionProps {
  userContribution: UserContributionDashboard | null | undefined;
  userRetention: UserRetention | null | undefined;
  loading: boolean;
  error: string | null;
}

export function UserContributionSection({
  userContribution,
  userRetention,
  loading,
  error,
}: UserContributionSectionProps) {
  const uc = userContribution;
  const buckets = uc?.buckets ?? [];
  const paretoCurve = uc?.pareto_curve ?? [];
  const researchBySegment = (uc?.research_rate_by_segment ?? []).map((r) => ({
    ...r,
    segment_name: buckets.find((b) => b.bucket_label === r.bucket_label)?.segment_name ?? r.bucket_label,
  }));

  return (
    <section>
      <p className="text-gray-700 mb-4 max-w-3xl">
        Engagement depth: first-timers (1 obs), returning (2–5), regular (6–20), power (21–100), and super users (100+).
        Median, mean, and mode describe the distribution; the Pareto curve shows what share of users contribute what share of observations. Retention shows whether 2024 participants returned in 2025.
      </p>
      <ChartCard
        title="User contribution distribution"
        subtitle="Segmentation, engagement metrics, retention, and research-grade by segment"
        loading={loading}
        error={error}
      >
        <div className="space-y-8">
          {/* Stats: mean, median, mode */}
          {(uc?.mean_obs_per_user != null || uc?.median_obs_per_user != null || uc?.mode_obs_per_user != null) && (
            <div className="flex flex-wrap gap-6 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
              {uc?.mean_obs_per_user != null && (
                <span><strong>Mean:</strong> {uc.mean_obs_per_user} obs/user</span>
              )}
              {uc?.median_obs_per_user != null && (
                <span><strong>Median:</strong> {uc.median_obs_per_user} obs/user</span>
              )}
              {uc?.mode_obs_per_user != null && (
                <span><strong>Mode:</strong> {uc.mode_obs_per_user} obs/user {uc?.mode_bucket && `(most users in bucket: ${uc.mode_bucket})`}</span>
              )}
            </div>
          )}

          {/* Histogram: segments with labels */}
          {buckets.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Users by segment (First-timers → Super)</h4>
              {uc?.pareto_label && (
                <p className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-sm">
                  {uc.pareto_label}
                </p>
              )}
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={buckets} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket_label" tickFormatter={(v) => buckets.find(b => b.bucket_label === v)?.segment_name ?? v} />
                  <YAxis />
                  <Tooltip
                    formatter={(v: number, name: string) => [v, name === 'user_count' ? 'Users' : 'Observations']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.segment_name ?? _}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded shadow-lg p-2 text-sm">
                          <div className="font-medium">{row.segment_name ?? row.bucket_label}</div>
                          <div>Users: {row.user_count?.toLocaleString()}</div>
                          {row.total_obs != null && <div>Total obs: {row.total_obs.toLocaleString()}</div>}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="user_count" name="Users" radius={[4, 4, 0, 0]}>
                    {buckets.map((_, i) => (
                      <Cell key={i} fill={SEGMENT_COLORS[buckets[i].bucket_label] ?? '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pareto curve: cumulative % users → % observations */}
          {paretoCurve.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Cumulative curve (Pareto)</h4>
              <p className="text-xs text-slate-500 mb-1">What % of users (sorted by contribution) contribute what % of observations?</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={paretoCurve} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="user_pct" unit="%" />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Cumulative observations']} labelFormatter={(v) => `${v}% of users`} />
                  <Legend />
                  <Line type="monotone" dataKey="obs_pct" stroke="#8b5cf6" strokeWidth={2} name="Cumulative % of observations" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* User retention: 2024 → 2025 */}
          {userRetention != null && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">User retention (2024 → 2025)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-bold text-slate-800">{userRetention.users_2024.toLocaleString()}</div>
                  <div className="text-xs text-slate-600">Users in 2024</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-bold text-slate-800">{userRetention.users_2025.toLocaleString()}</div>
                  <div className="text-xs text-slate-600">Users in 2025</div>
                </div>
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-center">
                  <div className="text-2xl font-bold text-sky-800">{userRetention.users_both.toLocaleString()}</div>
                  <div className="text-xs text-sky-600">Returned (both years)</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-bold text-slate-800">{userRetention.retention_pct != null ? `${userRetention.retention_pct}%` : '—'}</div>
                  <div className="text-xs text-slate-600">Retention (2024→2025)</div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">{userRetention.users_2024_only.toLocaleString()} users observed only in 2024 (did not return in 2025).</p>
            </div>
          )}

          {/* Research-grade rate by segment */}
          {researchBySegment.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Average research-grade rate by user segment</h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={researchBySegment} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segment_name" />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Research-grade']} />
                  <Bar dataKey="research_pct" name="Research-grade %" radius={[4, 4, 0, 0]} fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </ChartCard>
    </section>
  );
}
