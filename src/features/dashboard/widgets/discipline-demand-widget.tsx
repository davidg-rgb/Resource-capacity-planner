'use client';

import React, { useMemo } from 'react';
import { Grid3X3, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatMonthHeader } from '@/lib/date-utils';
import { useDisciplineDemand } from '@/hooks/use-discipline-demand';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// V12: Discipline Demand Heatmap Widget
// ---------------------------------------------------------------------------

type DemandStatus = 'surplus' | 'balanced' | 'tight' | 'deficit';

/** Color classes for each demand status (labels resolved via i18n). */
const STATUS_BG: Record<DemandStatus, { bg: string; text: string }> = {
  surplus: { bg: 'bg-tertiary/20', text: 'text-tertiary' },
  balanced: { bg: 'bg-primary/20', text: 'text-primary' },
  tight: { bg: 'bg-amber-100', text: 'text-amber-700' },
  deficit: { bg: 'bg-error/20', text: 'text-error' },
};

const STATUS_DOT_COLORS: Record<DemandStatus, string> = {
  surplus: 'bg-tertiary',
  balanced: 'bg-primary',
  tight: 'bg-amber-500',
  deficit: 'bg-error',
};

/** Map status to a compact dot for the status row. */
function StatusDot({ status, label }: { status: DemandStatus; label: string }) {
  const color = STATUS_BG[status];
  return (
    <div
      className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${color.bg}`}
      title={label}
    >
      <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[status]}`} />
    </div>
  );
}

const DisciplineDemandContent = React.memo(function DisciplineDemandContent({
  timeRange,
}: WidgetProps) {
  const t = useTranslations('widgets.disciplineDemand');
  const { data, isLoading, error } = useDisciplineDemand(timeRange.from, timeRange.to);

  const statusLabels: Record<DemandStatus, string> = useMemo(
    () => ({
      surplus: t('surplus'),
      balanced: t('balanced'),
      tight: t('tight'),
      deficit: t('deficit'),
    }),
    [t],
  );

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
    return <div className="text-sm text-red-600">{t('error')}</div>;
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
        {t('empty')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* --- Legend --- */}
      <div className="text-outline flex flex-wrap items-center gap-4 text-[10px] font-medium">
        {(Object.keys(STATUS_BG) as DemandStatus[]).map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[key]}`} />
            {statusLabels[key]}
          </div>
        ))}
      </div>

      {/* --- Heatmap Table --- */}
      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-xs">
          <thead>
            <tr className="text-outline border-outline-variant/10 border-b text-[10px] font-bold tracking-wider uppercase">
              <th scope="col" className="w-28 py-3 text-left" />
              {months.map((m) => (
                <th scope="col" key={m} className="py-3 text-center whitespace-nowrap">
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
                            title={t('sustainedDeficitTitle')}
                          >
                            <AlertTriangle size={11} />
                            {t('hire')}
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
                      const statusInfo = STATUS_BG[entry.status];
                      return (
                        <td key={`${disc.disciplineId}-status-${entry.month}`} className="p-1">
                          <div
                            className={`flex flex-col items-center justify-center rounded-sm px-1 py-1.5 ${statusInfo.bg}`}
                          >
                            <StatusDot status={entry.status} label={statusLabels[entry.status]} />
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
                  {t('combinedPeakDeficit')}{' '}
                  <span className="font-bold">
                    {data.summary.combinedPeakDeficit.toLocaleString()}h/mo
                  </span>{' '}
                  {t('fteHiringNeed', { fte: data.summary.fteHiringNeed.toFixed(1) })}
                </p>
              )}
              {data.disciplines
                .filter((d) => d.sustainedDeficit)
                .map((d) => (
                  <p key={d.disciplineId} className="text-error font-medium">
                    {t('sustainedDeficit', { name: d.disciplineName })}
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
