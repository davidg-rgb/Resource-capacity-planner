'use client';

import React, { useState, useMemo } from 'react';
import { ArrowRightLeft, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { usePeriodComparison } from '@/hooks/use-period-comparison';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build quarter boundaries from a date string (YYYY-MM). */
function getQuarterRange(year: number, quarter: number): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    from: `${year}-${String(startMonth).padStart(2, '0')}`,
    to: `${year}-${String(endMonth).padStart(2, '0')}`,
  };
}

function getCurrentQuarter(): { year: number; quarter: number } {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.ceil((now.getMonth() + 1) / 3) };
}

function getPreviousQuarter(year: number, quarter: number): { year: number; quarter: number } {
  if (quarter === 1) return { year: year - 1, quarter: 4 };
  return { year, quarter: quarter - 1 };
}

function formatQuarterLabel(year: number, quarter: number): string {
  return `Q${quarter} ${year}`;
}

/** Format a delta with + or - prefix. */
function formatDelta(delta: number, isPercent: boolean): string {
  const sign = delta > 0 ? '+' : '';
  if (isPercent) return `${sign}${delta.toFixed(1)}%`;
  return `${sign}${delta.toLocaleString()}`;
}

/** Format a metric value for display. */
function formatMetricValue(name: string, value: number): string {
  const lower = name.toLowerCase();
  if (lower.includes('utilization') || lower.includes('%')) return `${value.toFixed(1)}%`;
  if (lower.includes('hours') || lower.includes('hour')) return `${value.toLocaleString()}h`;
  return value.toLocaleString();
}

// ---------------------------------------------------------------------------
// Signal indicator
// ---------------------------------------------------------------------------

function SignalIcon({ signal }: { signal: 'improving' | 'worsening' | 'neutral' }) {
  if (signal === 'improving') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700">
        <TrendingUp size={12} />
      </span>
    );
  }
  if (signal === 'worsening') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700">
        <TrendingDown size={12} />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500">
      <Minus size={12} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Delta arrow for department rows
// ---------------------------------------------------------------------------

function DeltaArrow({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.5) {
    return <span className="text-outline-variant text-[10px]">--</span>;
  }
  const isUp = delta > 0;
  return (
    <span
      className={`text-[11px] font-bold tabular-nums ${isUp ? 'text-green-700' : 'text-red-600'}`}
    >
      {isUp ? '\u25B2' : '\u25BC'} {formatDelta(delta, true)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/** Compute period A (same duration as B, immediately preceding B). */
function computePrecedingPeriod(from: string, to: string): { from: string; to: string } {
  const [fromY, fromM] = from.split('-').map(Number);
  const [toY, toM] = to.split('-').map(Number);
  const durationMonths = (toY - fromY) * 12 + (toM - fromM) + 1;

  // Shift back by durationMonths
  const aToDate = new Date(fromY, fromM - 2, 1); // month before B.from
  const aFromDate = new Date(aToDate.getFullYear(), aToDate.getMonth() - durationMonths + 1, 1);
  return {
    from: `${aFromDate.getFullYear()}-${String(aFromDate.getMonth() + 1).padStart(2, '0')}`,
    to: `${aToDate.getFullYear()}-${String(aToDate.getMonth() + 1).padStart(2, '0')}`,
  };
}

const PeriodComparisonContent = React.memo(function PeriodComparisonContent({
  timeRange,
}: WidgetProps) {
  // Use timeRange from props as period B; period A is the same duration immediately before
  const [periodB, setPeriodB] = useState(() => ({ from: timeRange.from, to: timeRange.to }));
  const [periodA, setPeriodA] = useState(() =>
    computePrecedingPeriod(timeRange.from, timeRange.to),
  );
  const [labelB, setLabelB] = useState(() =>
    timeRange.from === timeRange.to ? timeRange.from : `${timeRange.from} \u2013 ${timeRange.to}`,
  );
  const [labelA, setLabelA] = useState(() => {
    const a = computePrecedingPeriod(timeRange.from, timeRange.to);
    return a.from === a.to ? a.from : `${a.from} \u2013 ${a.to}`;
  });

  const { data, isLoading, error } = usePeriodComparison(
    periodA.from,
    periodA.to,
    periodB.from,
    periodB.to,
  );

  // Preset handler
  const applyPreset = (preset: 'qoq' | 'mom') => {
    if (preset === 'qoq') {
      const c = getCurrentQuarter();
      const p = getPreviousQuarter(c.year, c.quarter);
      setPeriodA(getQuarterRange(p.year, p.quarter));
      setPeriodB(getQuarterRange(c.year, c.quarter));
      setLabelA(formatQuarterLabel(p.year, p.quarter));
      setLabelB(formatQuarterLabel(c.year, c.quarter));
    } else if (preset === 'mom') {
      const now = new Date();
      const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      setPeriodA({ from: prevMonth, to: prevMonth });
      setPeriodB({ from: curMonth, to: curMonth });
      setLabelA(prevMonth);
      setLabelB(curMonth);
    }
  };

  // Sort departments by absolute delta descending
  const sortedDepartments = useMemo(() => {
    if (!data) return [];
    return [...data.departments].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [data]);

  if (error) {
    return (
      <div className="text-destructive flex items-center justify-center py-10 text-sm">
        Failed to load comparison data
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const displayLabelA = data.periodA.label || labelA;
  const displayLabelB = data.periodB.label || labelB;

  return (
    <div>
      {/* Header + Presets */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-headline text-sm font-semibold">Period Comparison</h4>
        <div className="flex gap-1.5">
          <button
            onClick={() => applyPreset('mom')}
            className="bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
          >
            Month vs Month
          </button>
          <button
            onClick={() => applyPreset('qoq')}
            className="bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
          >
            Quarter vs Quarter
          </button>
        </div>
      </div>

      <div className="text-on-surface-variant mb-3 text-[11px]">
        Comparing <span className="font-bold">{displayLabelA}</span> vs{' '}
        <span className="font-bold">{displayLabelB}</span>
      </div>

      {/* Key Metrics Table */}
      <div className="bg-surface-container-lowest border-outline-variant/10 mb-4 overflow-hidden rounded-sm border">
        <div className="text-outline-variant bg-surface-container-low/30 px-4 py-2 text-[10px] font-bold tracking-wider uppercase">
          Key Metrics
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-outline-variant/10 text-outline-variant border-b text-[9px] tracking-wider uppercase">
              <th scope="col" className="px-4 py-2 text-left font-bold">
                Metric
              </th>
              <th scope="col" className="px-3 py-2 text-right font-bold">
                {displayLabelA}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-bold">
                {displayLabelB}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-bold">
                Delta
              </th>
              <th scope="col" className="w-10 px-3 py-2 text-center font-bold">
                Signal
              </th>
            </tr>
          </thead>
          <tbody className="divide-outline-variant/5 divide-y">
            {data.metrics.map((metric) => (
              <tr key={metric.name} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="text-on-surface px-4 py-2 font-medium">{metric.name}</td>
                <td className="text-on-surface-variant px-3 py-2 text-right tabular-nums">
                  {formatMetricValue(metric.name, metric.valueA)}
                </td>
                <td className="text-on-surface px-3 py-2 text-right tabular-nums">
                  {formatMetricValue(metric.name, metric.valueB)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span
                    className={
                      metric.signal === 'improving'
                        ? 'text-green-700'
                        : metric.signal === 'worsening'
                          ? 'text-red-600'
                          : 'text-outline-variant'
                    }
                  >
                    {formatDelta(
                      metric.delta,
                      metric.name.toLowerCase().includes('%') ||
                        metric.name.toLowerCase().includes('utilization'),
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex justify-center">
                    <SignalIcon signal={metric.signal} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Department Shifts */}
      {sortedDepartments.length > 0 && (
        <div className="bg-surface-container-lowest border-outline-variant/10 mb-4 overflow-hidden rounded-sm border">
          <div className="text-outline-variant bg-surface-container-low/30 px-4 py-2 text-[10px] font-bold tracking-wider uppercase">
            Department Shifts
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-outline-variant/10 text-outline-variant border-b text-[9px] tracking-wider uppercase">
                <th scope="col" className="px-4 py-2 text-left font-bold">
                  Department
                </th>
                <th scope="col" className="px-3 py-2 text-center font-bold">
                  {displayLabelA} &rarr; {displayLabelB}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-bold">
                  Change
                </th>
                <th scope="col" className="w-24 px-3 py-2 text-right font-bold">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-outline-variant/5 divide-y">
              {sortedDepartments.map((dept) => (
                <tr
                  key={dept.departmentId}
                  className="hover:bg-surface-container-low/30 transition-colors"
                >
                  <td className="text-on-surface px-4 py-2 font-medium">{dept.departmentName}</td>
                  <td className="text-on-surface-variant px-3 py-2 text-center tabular-nums">
                    {dept.utilizationA.toFixed(0)}% &rarr; {dept.utilizationB.toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DeltaArrow delta={dept.delta} />
                  </td>
                  <td className="text-outline-variant px-3 py-2 text-right text-[10px]">
                    {dept.note ?? (Math.abs(dept.delta) < 2 ? 'stable' : '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notable Changes */}
      {data.notableChanges.length > 0 && (
        <div className="border-outline-variant/10 bg-surface-container-lowest rounded-sm border px-4 py-3">
          <div className="text-outline-variant mb-2 text-[10px] font-bold tracking-wider uppercase">
            Notable Changes
          </div>
          <ul className="space-y-1">
            {data.notableChanges.map((change, idx) => (
              <li
                key={idx}
                className="text-on-surface-variant flex items-start gap-1.5 text-[11px]"
              >
                <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'period-comparison',
  name: 'Period-over-Period Comparison',
  description:
    'Two-column metric comparison with delta signals showing whether resource planning is improving or worsening.',
  category: 'breakdowns',
  icon: ArrowRightLeft,
  component: PeriodComparisonContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager', 'project-leader'],
  dataHook: 'usePeriodComparison',
});
