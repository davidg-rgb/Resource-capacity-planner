'use client';

import { useMemo } from 'react';

import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';
import type { FlatAllocation } from '@/features/allocations/allocation.types';

interface PersonAnalyticsProps {
  allocations: FlatAllocation[];
  targetHoursPerMonth: number;
}

/** Window of months the analytics cards summarize. Forward-only — past trends
 *  are visible in the grid itself. */
const TREND_WINDOW = 7;

interface ProjectTotal {
  projectId: string;
  projectName: string;
  hours: number;
  pct: number;
}

interface AnalyticsSummary {
  monthlyTotals: { month: string; hours: number }[];
  peakOverloadPct: number; // 0 when never exceeds target
  projectTotals: ProjectTotal[];
  totalHours: number;
  insight: { month: string; excess: number; topProjects: string[] } | null;
}

function summarize(
  allocations: FlatAllocation[],
  targetHoursPerMonth: number,
  months: string[],
): AnalyticsSummary {
  // Bucket allocations by month within the window.
  const monthSet = new Set(months);
  const monthBucket: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
  const projectBucket = new Map<string, { projectName: string; hours: number }>();
  const monthProjectHours: Record<string, Map<string, number>> = Object.fromEntries(
    months.map((m) => [m, new Map<string, number>()]),
  );

  for (const a of allocations) {
    if (!monthSet.has(a.month)) continue;
    monthBucket[a.month] = (monthBucket[a.month] ?? 0) + a.hours;
    const prior = projectBucket.get(a.projectId)?.hours ?? 0;
    projectBucket.set(a.projectId, {
      projectName: a.projectName,
      hours: prior + a.hours,
    });
    const mp = monthProjectHours[a.month]!;
    mp.set(a.projectId, (mp.get(a.projectId) ?? 0) + a.hours);
  }

  const monthlyTotals = months.map((m) => ({ month: m, hours: monthBucket[m] ?? 0 }));
  const totalHours = monthlyTotals.reduce((s, x) => s + x.hours, 0);

  // Peak overload over the window: which month has the highest hours/target ratio.
  let peakOverloadPct = 0;
  let peakMonth: string | null = null;
  for (const { month, hours } of monthlyTotals) {
    if (targetHoursPerMonth > 0) {
      const pct = (hours / targetHoursPerMonth) * 100;
      if (pct > peakOverloadPct) {
        peakOverloadPct = pct;
        peakMonth = month;
      }
    }
  }

  // Project distribution — top 3 by absolute hours.
  const projectTotals: ProjectTotal[] = Array.from(projectBucket.entries())
    .map(([projectId, v]) => ({
      projectId,
      projectName: v.projectName,
      hours: v.hours,
      pct: totalHours > 0 ? (v.hours / totalHours) * 100 : 0,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);

  // Capacity insight: name the peak-overloaded month and the 1-2 top projects
  // contributing to it. Only surfaces when ratio > 100%.
  let insight: AnalyticsSummary['insight'] = null;
  if (peakMonth && peakOverloadPct > 100) {
    const mp = monthProjectHours[peakMonth]!;
    const topProjects = Array.from(mp.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([projectId]) => projectBucket.get(projectId)?.projectName ?? '')
      .filter(Boolean);
    insight = {
      month: peakMonth,
      excess: Math.round((peakOverloadPct - 100) * (targetHoursPerMonth / 100)),
      topProjects,
    };
  }

  return { monthlyTotals, peakOverloadPct, projectTotals, totalHours, insight };
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
}

/**
 * Bento-grid analytics section below the allocation grid.
 * 3 cards: Allocation Trend, Project Distribution, Capacity Insight.
 * Bound to real allocation data — previously rendered hardcoded Atlas/Vega/Nova
 * placeholder content per Stitch mockup #04 with no data wiring.
 */
export function PersonAnalytics({ allocations, targetHoursPerMonth }: PersonAnalyticsProps) {
  const months = useMemo(() => generateMonthRange(getCurrentMonth(), TREND_WINDOW), []);
  const summary = useMemo(
    () => summarize(allocations, targetHoursPerMonth, months),
    [allocations, targetHoursPerMonth, months],
  );

  // Trend chart Y-axis ceiling — peak bar should never exceed 100% of card height.
  // Compare against target so overloaded months read as visually >target.
  const trendCeiling = Math.max(
    targetHoursPerMonth * 1.25,
    ...summary.monthlyTotals.map((x) => x.hours),
    1,
  );

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
      {/* Card 1: Allocation Trend (4/12 cols) */}
      <div className="bg-surface-container-lowest border-outline-variant/10 flex flex-col justify-between rounded-sm border p-6 shadow-sm md:col-span-4">
        <div>
          <h4 className="text-outline mb-4 text-xs font-bold tracking-widest uppercase">
            Allokeringstrend
          </h4>
          <div
            className="flex h-24 w-full items-end gap-2 px-2"
            data-testid="person-analytics-trend"
          >
            {summary.monthlyTotals.map(({ month, hours }) => {
              const ratio = trendCeiling > 0 ? Math.max(0.04, hours / trendCeiling) : 0;
              const isOver = targetHoursPerMonth > 0 && hours > targetHoursPerMonth;
              return (
                <div
                  key={month}
                  className={`w-full ${isOver ? 'bg-error' : 'bg-primary/20'}`}
                  style={{ height: `${ratio * 100}%` }}
                  title={`${formatMonthLabel(month)}: ${hours}h`}
                  data-month={month}
                  data-hours={hours}
                />
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-outline text-xs font-medium">{formatMonthLabel(months[0]!)}</span>
          <span
            className={`text-sm font-bold tabular-nums ${
              summary.peakOverloadPct > 100 ? 'text-error' : 'text-on-surface'
            }`}
          >
            {targetHoursPerMonth > 0
              ? `${summary.peakOverloadPct.toFixed(0)}% topp`
              : `${Math.max(...summary.monthlyTotals.map((x) => x.hours), 0)}h topp`}
          </span>
        </div>
      </div>

      {/* Card 2: Project Distribution (5/12 cols) */}
      <div className="bg-surface-container-lowest border-outline-variant/10 rounded-sm border p-6 shadow-sm md:col-span-5">
        <h4 className="text-outline mb-4 text-xs font-bold tracking-widest uppercase">
          Projektfördelning
        </h4>
        <div className="space-y-3" data-testid="person-analytics-projects">
          {summary.projectTotals.length === 0 && (
            <p className="text-on-surface-variant text-xs">Inga allokeringar i intervallet.</p>
          )}
          {summary.projectTotals.map((p, idx) => {
            const barClass =
              idx === 0
                ? 'bg-primary'
                : idx === 1
                  ? 'bg-primary-fixed-dim'
                  : 'bg-secondary-fixed-dim';
            return (
              <div key={p.projectId} className="flex items-center gap-4">
                <span
                  className="text-on-surface w-24 truncate text-xs font-medium"
                  title={p.projectName}
                >
                  {p.projectName}
                </span>
                <div className="bg-surface-container-low h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className={`h-full ${barClass}`}
                    style={{ width: `${Math.min(100, p.pct)}%` }}
                  />
                </div>
                <span className="text-primary w-10 text-right text-xs font-bold tabular-nums">
                  {p.pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 3: Capacity Insight (3/12 cols) */}
      <div className="bg-primary text-on-primary flex flex-col justify-between rounded-sm p-6 shadow-sm md:col-span-3">
        <div>
          <span className="material-symbols-outlined mb-2">lightbulb</span>
          <h4 className="text-xs font-bold tracking-widest uppercase opacity-80">
            Kapacitetsinsikt
          </h4>
          <p className="mt-2 text-sm leading-relaxed font-medium">
            {summary.insight
              ? `${formatMonthLabel(summary.insight.month)} överskrider målet med ${
                  summary.insight.excess
                }h${
                  summary.insight.topProjects.length > 0
                    ? ` på grund av överlapp i ${summary.insight.topProjects.join(' & ')}`
                    : ''
                }.`
              : 'Inga överbelastningar i intervallet — beläggningen ligger inom målet.'}
          </p>
        </div>
      </div>
    </div>
  );
}
