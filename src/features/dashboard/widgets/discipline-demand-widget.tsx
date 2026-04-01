'use client';

import React, { useMemo } from 'react';
import { Grid3X3, AlertTriangle } from 'lucide-react';

import { formatMonthHeader } from '@/lib/date-utils';
import { useDisciplineDemand } from '@/hooks/use-discipline-demand';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// V12: Discipline Demand Heatmap Widget
// ---------------------------------------------------------------------------

type DemandStatus = 'surplus' | 'balanced' | 'tight' | 'deficit';

/** Color classes for each demand status. */
const STATUS_COLORS: Record<DemandStatus, { bg: string; text: string; label: string }> = {
  surplus: { bg: 'bg-tertiary/20', text: 'text-tertiary', label: 'Surplus' },
  balanced: { bg: 'bg-primary/20', text: 'text-primary', label: 'Balanced' },
  tight: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Tight' },
  deficit: { bg: 'bg-error/20', text: 'text-error', label: 'Deficit' },
};

/** Map status to a compact dot for the status row. */
function StatusDot({ status }: { status: DemandStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <div
      className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${color.bg}`}
      title={color.label}
    >
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          status === 'surplus'
            ? 'bg-tertiary'
            : status === 'balanced'
              ? 'bg-primary'
              : status === 'tight'
                ? 'bg-amber-500'
                : 'bg-error'
        }`}
      />
    </div>
  );
}

const DisciplineDemandContent = React.memo(function DisciplineDemandContent({
  timeRange,
}: WidgetProps) {
  const { data, isLoading, error } = useDisciplineDemand(timeRange.from, timeRange.to);

  // Extract sorted month keys from data
  const months = useMemo(() => {
    if (!data || data.disciplines.length === 0) return [];
    const allMonths = new Set<string>();
    for (const disc of data.disciplines) {
      for (const m of Object.keys(disc.months)) {
        allMonths.add(m);
      }
    }
    return Array.from(allMonths).sort();
  }, [data]);

  if (error) {
    return <div className="text-sm text-red-600">Failed to load discipline demand data</div>;
  }

  if (isLoading || !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="bg-surface-container-high h-60 rounded-sm" />
      </div>
    );
  }

  if (data.disciplines.length === 0) {
    return (
      <div className="bg-surface-container-low text-on-surface-variant rounded-sm p-6 text-sm">
        No discipline demand data found for the selected period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* --- Legend --- */}
      <div className="text-outline flex flex-wrap items-center gap-4 text-[10px] font-medium">
        {Object.entries(STATUS_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                key === 'surplus'
                  ? 'bg-tertiary'
                  : key === 'balanced'
                    ? 'bg-primary'
                    : key === 'tight'
                      ? 'bg-amber-500'
                      : 'bg-error'
              }`}
            />
            {val.label}
          </div>
        ))}
      </div>

      {/* --- Heatmap Table --- */}
      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-xs">
          <thead>
            <tr className="text-outline border-outline-variant/10 border-b text-[10px] font-bold tracking-wider uppercase">
              <th className="w-28 py-3 text-left" />
              {months.map((m) => (
                <th key={m} className="py-3 text-center whitespace-nowrap">
                  {formatMonthHeader(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.disciplines.map((disc) => {
              const monthEntries = months.map((m) => ({
                month: m,
                ...(disc.months[m] ?? {
                  demand: 0,
                  supply: 0,
                  gap: 0,
                  status: 'balanced' as DemandStatus,
                }),
              }));

              return (
                <React.Fragment key={disc.disciplineId}>
                  {/* Discipline name row */}
                  <tr className="border-outline-variant/10 border-t">
                    <td className="text-on-surface py-2 font-semibold" rowSpan={4}>
                      <div className="flex items-center gap-2">
                        <span>{disc.abbreviation}</span>
                        {disc.sustainedDeficit && (
                          <span
                            className="text-error flex items-center gap-0.5 text-[9px] font-bold"
                            title="Sustained deficit: 3+ consecutive months"
                          >
                            <AlertTriangle size={11} />
                            Hire
                          </span>
                        )}
                      </div>
                      <div className="text-outline text-[9px] font-normal">
                        {disc.disciplineName}
                      </div>
                    </td>
                  </tr>
                  {/* Demand row */}
                  <tr>
                    {monthEntries.map((entry) => (
                      <td
                        key={`${disc.disciplineId}-demand-${entry.month}`}
                        className="py-0.5 text-center tabular-nums"
                      >
                        <div className="text-on-surface-variant text-[9px]">
                          {entry.demand.toLocaleString()}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {/* Supply row */}
                  <tr>
                    {monthEntries.map((entry) => (
                      <td
                        key={`${disc.disciplineId}-supply-${entry.month}`}
                        className="py-0.5 text-center tabular-nums"
                      >
                        <div className="text-outline text-[9px]">
                          {entry.supply.toLocaleString()}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {/* Status row (colored cells) */}
                  <tr className="border-outline-variant/10 border-b">
                    {monthEntries.map((entry) => {
                      const statusInfo = STATUS_COLORS[entry.status];
                      return (
                        <td key={`${disc.disciplineId}-status-${entry.month}`} className="p-1">
                          <div
                            className={`flex flex-col items-center justify-center rounded-sm px-1 py-1.5 ${statusInfo.bg}`}
                          >
                            <StatusDot status={entry.status} />
                            <span
                              className={`mt-0.5 text-[9px] font-bold tabular-nums ${statusInfo.text}`}
                            >
                              {entry.gap > 0 ? '+' : ''}
                              {entry.gap}h
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- Summary --- */}
      {(data.summary.combinedPeakDeficit > 0 ||
        data.disciplines.some((d) => d.sustainedDeficit)) && (
        <div className="bg-error/5 border-error/20 rounded-sm border px-4 py-3 text-xs">
          <div className="text-on-surface flex items-start gap-2">
            <AlertTriangle size={14} className="text-error mt-0.5 shrink-0" />
            <div className="space-y-1">
              {data.summary.combinedPeakDeficit > 0 && (
                <p>
                  Combined peak deficit:{' '}
                  <span className="font-bold">
                    {data.summary.combinedPeakDeficit.toLocaleString()}h/mo
                  </span>{' '}
                  = {data.summary.fteHiringNeed.toFixed(1)} FTE hiring need
                </p>
              )}
              {data.disciplines
                .filter((d) => d.sustainedDeficit)
                .map((d) => (
                  <p key={d.disciplineId} className="text-error font-medium">
                    {d.disciplineName}: sustained deficit (3+ months) — consider hiring
                  </p>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'discipline-demand',
  name: 'Discipline Demand Forecast',
  description:
    'Month x discipline heatmap showing demand vs supply gaps with status colors and hiring indicators.',
  category: 'timelines-planning',
  icon: Grid3X3,
  component: DisciplineDemandContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['manager'],
  requiredFeatureFlag: 'dashboards',
  dataHook: 'useDisciplineDemand',
});
