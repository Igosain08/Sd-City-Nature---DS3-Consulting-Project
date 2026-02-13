import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { TemporalTrend, HourlyByDowItem } from '../types';

const COMPETITION_DATES = { start: '2025-04-25', end: '2025-04-28' };
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ObservationsOverTimeProps {
  temporalTrends: TemporalTrend[];
  hourlyByDow: HourlyByDowItem[];
  loading: boolean;
  error: string | null;
}

export function ObservationsOverTime({
  temporalTrends,
  hourlyByDow,
  loading,
  error,
}: ObservationsOverTimeProps) {
  const dayOfWeekPattern = useMemo(() => {
    if (!temporalTrends?.length) return [];
    const byDow: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    temporalTrends.forEach((d) => {
      const date = new Date(d.date);
      const dow = date.getDay();
      const isoDow = dow === 0 ? 6 : dow - 1;
      byDow[isoDow].push(d.count);
    });
    return DAY_NAMES.map((day_name, i) => {
      const arr = byDow[i] || [];
      const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      return { day_name, day_of_week: i, avg: Math.round(avg), is_weekend: i >= 5 };
    });
  }, [temporalTrends]);

  const hourlyByDowGrid = useMemo(() => {
    if (!hourlyByDow?.length) return [];
    const byDow: Record<number, Record<number, number>> = {};
    for (let d = 0; d < 7; d++) byDow[d] = {};
    hourlyByDow.forEach((x) => {
      byDow[x.day_of_week][x.hour] = x.count;
    });
    return DAY_NAMES.map((day_name, day_of_week) => {
      const hours = Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour}:00`,
        hourNum: hour,
        count: byDow[day_of_week]?.[hour] ?? 0,
      }));
      return { day_name, day_of_week, hours };
    });
  }, [hourlyByDow]);

  return (
    <section>
      <p className="text-gray-700 mb-4 max-w-3xl">
        When do people observe? Daily trends show the competition spike (April 25–28), all vs
        research-grade submissions, and weekday vs weekend patterns. Small multiples show hourly
        distribution by day of week to inform timing recommendations.
      </p>
      <ChartCard
        title="Observations over time"
        subtitle="Daily counts with competition window, research-grade line, and day-of-week pattern"
        loading={loading}
        error={error}
      >
        <div className="space-y-8">
          {/* Main line chart: all + research-grade, competition area, anomaly highlight */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Daily observations (all vs research-grade)</h4>
            {temporalTrends && temporalTrends.length > 0 && (
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={temporalTrends} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [value.toLocaleString(), name === 'count' ? 'All' : name === 'research_count' ? 'Research-grade' : name]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <ReferenceArea
                    x1={COMPETITION_DATES.start}
                    x2={COMPETITION_DATES.end}
                    fill="#0ea5e9"
                    fillOpacity={0.15}
                    strokeOpacity={0}
                  />
                  <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} name="All observations" dot={false} />
                  <Line type="monotone" dataKey="research_count" stroke="#22c55e" strokeWidth={2} name="Research-grade" dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Shaded area: City Nature Challenge competition dates (April 25–28, 2025).
            </p>
          </div>

          {/* Day-of-week pattern overlay */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Average observations by day of week</h4>
            {dayOfWeekPattern.length > 0 && (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dayOfWeekPattern} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day_name" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Avg observations']} />
                  <Bar dataKey="avg" name="Average daily observations" radius={[4, 4, 0, 0]}>
                    {dayOfWeekPattern.map((_, i) => (
                      <Cell key={i} fill={dayOfWeekPattern[i].is_weekend ? '#94a3b8' : '#0ea5e9'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-xs text-slate-500 mt-1">Blue: weekday · Gray: weekend.</p>
          </div>

          {/* Intra-day: small multiples by day of week */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Hourly distribution by day of week (small multiples)</h4>
            {hourlyByDowGrid.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {hourlyByDowGrid.map(({ day_name, hours }) => (
                  <div key={day_name} className="border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                    <div className="text-xs font-medium text-slate-700 mb-1">{day_name}</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={hours} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <XAxis dataKey="hourNum" tick={{ fontSize: 8 }} tickFormatter={(h) => `${h}`} />
                        <YAxis hide />
                        <Tooltip formatter={(v: number) => [v, 'Observations']} labelFormatter={(h) => `Hour: ${h}:00`} />
                        <Bar dataKey="count" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Hourly-by-weekday data requires observation timestamps.</p>
            )}
          </div>

          {/* Anomalies / known events */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm">
            <h4 className="font-semibold text-amber-900 mb-1">Highlighted events</h4>
            <ul className="text-amber-800 space-y-0.5">
              <li><strong>April 25–28, 2025:</strong> City Nature Challenge competition window (shaded in chart).</li>
              <li>Peak days and other anomalies (e.g. weather, bioblitzes) can be added here when known.</li>
            </ul>
          </div>
        </div>
      </ChartCard>
    </section>
  );
}
