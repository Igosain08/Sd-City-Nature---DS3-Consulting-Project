import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
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

const COMPETITION_START = '2025-04-25';
const COMPETITION_END = '2025-04-28';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ZOOM_FACTOR = 0.05;

interface ObservationsOverTimeProps {
  temporalTrends: TemporalTrend[];
  hourlyByDow: HourlyByDowItem[];
  loading: boolean;
  error: string | null;
}

/** Pick evenly-spaced tick dates from visibleData based on span size. */
function pickTicks(dates: string[]): string[] {
  const n = dates.length;
  if (n === 0) return [];
  let step: number;
  if (n > 365) step = 30;
  else if (n > 180) step = 14;
  else if (n > 60) step = 7;
  else if (n > 14) step = 3;
  else step = 1;
  return dates.filter((_, i) => i % step === 0);
}

/** Format a date string for the axis label given the visible span (days). */
function formatTick(date: string, spanDays: number): string {
  const d = new Date(date + 'T00:00:00');
  if (spanDays > 365) {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  if (spanDays > 14) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ObservationsOverTime({
  temporalTrends,
  hourlyByDow,
  loading,
  error,
}: ObservationsOverTimeProps) {
  const sortedData = useMemo(
    () => [...(temporalTrends ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [temporalTrends],
  );

  // [startIdx, endIdx] into sortedData; null = show all
  const [viewRange, setViewRange] = useState<[number, number] | null>(null);

  // Reset to full view whenever underlying data changes
  useEffect(() => { setViewRange(null); }, [sortedData]);

  const effectiveRange = useMemo((): [number, number] => {
    if (!sortedData.length) return [0, 0];
    return viewRange ?? [0, sortedData.length - 1];
  }, [viewRange, sortedData.length]);

  const visibleData = useMemo(
    () => sortedData.slice(effectiveRange[0], effectiveRange[1] + 1),
    [sortedData, effectiveRange],
  );

  const isFullView = viewRange === null ||
    (effectiveRange[0] === 0 && effectiveRange[1] === sortedData.length - 1);

  const zoom = useCallback((deltaY: number) => {
    if (!sortedData.length) return;
    const [start, end] = effectiveRange;
    const span = end - start;
    const delta = Math.max(1, Math.round(span * ZOOM_FACTOR));

    if (deltaY > 0) {
      // Zoom in: shrink range symmetrically from centre
      const newStart = Math.min(start + delta, end - 1);
      const newEnd = Math.max(end - delta, newStart + 1);
      if (newEnd > newStart) setViewRange([newStart, newEnd]);
    } else {
      // Zoom out: expand range
      const newStart = Math.max(0, start - delta);
      const newEnd = Math.min(sortedData.length - 1, end + delta);
      if (newStart === 0 && newEnd === sortedData.length - 1) {
        setViewRange(null); // fully zoomed out
      } else {
        setViewRange([newStart, newEnd]);
      }
    }
  }, [effectiveRange, sortedData.length]);

  // Drag-to-pan state
  const dragStart = useRef<{ x: number; range: [number, number] } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pan = useCallback((pixelDelta: number, containerWidth: number, startRange: [number, number]) => {
    if (!sortedData.length || containerWidth === 0) return;
    const [start, end] = startRange;
    const span = end - start;
    // How many data points per pixel
    const pointsPerPixel = span / containerWidth;
    // Dragging right (positive pixelDelta) → pan left (earlier dates)
    const shift = Math.round(pixelDelta * pointsPerPixel);
    const newStart = Math.max(0, start - shift);
    const newEnd = Math.min(sortedData.length - 1, end - shift);
    // Keep span constant
    if (newEnd - newStart === span) {
      if (newStart === 0 && newEnd === sortedData.length - 1) {
        setViewRange(null);
      } else {
        setViewRange([newStart, newEnd]);
      }
    }
  }, [sortedData.length]);

  // Attach non-passive wheel listener + drag listeners
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(e.deltaY);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const range = viewRange ?? (sortedData.length ? [0, sortedData.length - 1] as [number, number] : null);
      if (!range) return;
      dragStart.current = { x: e.clientX, range };
      setIsDragging(true);
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const width = el.getBoundingClientRect().width;
      pan(dx, width, dragStart.current.range);
    };
    const onMouseUp = () => {
      dragStart.current = null;
      setIsDragging(false);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [zoom, pan, viewRange, sortedData.length]);

  const visibleDates = useMemo(() => visibleData.map((d) => d.date), [visibleData]);
  const spanDays = visibleData.length;
  const ticks = useMemo(() => pickTicks(visibleDates), [visibleDates]);

  // Day-of-week pattern
  const dayOfWeekPattern = useMemo(() => {
    if (!sortedData?.length) return [];
    const byDow: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    sortedData.forEach((d) => {
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
  }, [sortedData]);

  const hourlyByDowGrid = useMemo(() => {
    if (!hourlyByDow?.length) return [];
    const byDow: Record<number, Record<number, number>> = {};
    for (let d = 0; d < 7; d++) byDow[d] = {};
    hourlyByDow.forEach((x) => { byDow[x.day_of_week][x.hour] = x.count; });
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
          {/* Main line chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-700">
                Daily observations (all vs research-grade)
              </h4>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 select-none">Scroll to zoom · Drag to pan</span>
                {!isFullView && (
                  <button
                    onClick={() => setViewRange(null)}
                    className="text-xs text-sky-600 hover:text-sky-800 border border-sky-300 rounded px-2 py-0.5 transition-colors"
                  >
                    Reset zoom
                  </button>
                )}
              </div>
            </div>

            {visibleData.length > 0 && (
              <div ref={chartRef} className={`select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={visibleData} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      ticks={ticks}
                      tickFormatter={(d) => formatTick(d, spanDays)}
                      angle={-35}
                      textAnchor="end"
                      height={56}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value.toLocaleString(),
                        name === 'count' ? 'All' : name === 'research_count' ? 'Research-grade' : name,
                      ]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    {/* Competition window — only render if dates are within visible range */}
                    {visibleDates.includes(COMPETITION_START) || visibleDates.includes(COMPETITION_END) ||
                      (visibleData[0]?.date <= COMPETITION_START && visibleData[visibleData.length - 1]?.date >= COMPETITION_END) ? (
                      <ReferenceArea
                        x1={COMPETITION_START}
                        x2={COMPETITION_END}
                        fill="#0ea5e9"
                        fillOpacity={0.15}
                        strokeOpacity={0}
                      />
                    ) : null}
                    <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} name="All observations" dot={false} />
                    <Line type="monotone" dataKey="research_count" stroke="#22c55e" strokeWidth={2} name="Research-grade" dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Shaded area: City Nature Challenge competition window (April 25–28, 2025).{' '}
              {!isFullView && (
                <span>
                  Showing {visibleData[0]?.date} → {visibleData[visibleData.length - 1]?.date} ({spanDays} days).
                </span>
              )}
            </p>
          </div>

          {/* Day-of-week pattern */}
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

          {/* Hourly small multiples */}
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

          {/* Events callout */}
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
