'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { calculateHeatMapStatus } from '@/lib/capacity';
import type { HeatMapResponse } from '@/features/analytics/analytics.types';

interface HeatMapSummaryBannerProps {
  data: HeatMapResponse;
}

/** Format YYYY-MM to Swedish month label, e.g. "2026-04" → "april 2026". */
function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
}

function getOverloadSummary(data: HeatMapResponse): {
  overloadedCount: number;
  criticalMonth: string | null;
} {
  let overloadedCount = 0;
  const monthOverloadHours: Record<string, number> = {};

  for (const dept of data.departments) {
    for (const person of dept.people) {
      let personOverloaded = false;
      for (const month of data.months) {
        const hours = person.months[month] ?? 0;
        const status = calculateHeatMapStatus(hours, person.targetHours);
        if (status === 'over') {
          personOverloaded = true;
          monthOverloadHours[month] = (monthOverloadHours[month] ?? 0) + hours - person.targetHours;
        }
      }
      if (personOverloaded) overloadedCount++;
    }
  }

  let criticalMonth: string | null = null;
  let maxOverload = 0;
  for (const [month, excess] of Object.entries(monthOverloadHours)) {
    if (excess > maxOverload) {
      maxOverload = excess;
      criticalMonth = month;
    }
  }

  return { overloadedCount, criticalMonth };
}

export function HeatMapSummaryBanner({ data }: HeatMapSummaryBannerProps) {
  const { overloadedCount, criticalMonth } = useMemo(() => getOverloadSummary(data), [data]);
  const t = useTranslations('heatMap');

  if (data.departments.length === 0) return null;

  if (overloadedCount === 0) {
    return (
      <div className="flex items-center gap-3 rounded-sm border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
        <p className="text-sm font-medium text-emerald-800">{t('noOverloads')}</p>
      </div>
    );
  }

  const criticalLabel = criticalMonth ? formatMonthLabel(criticalMonth) : '';

  return (
    <div className="bg-error/5 border-error/20 flex items-center gap-3 rounded-sm border px-4 py-3">
      <AlertTriangle size={18} className="text-error shrink-0" />
      <p className="text-error text-sm font-medium">
        {t('overloadedBanner', { count: overloadedCount })}
        {criticalLabel && (
          <span className="text-on-surface-variant font-normal">
            {' '}
            — {t('criticalMonth', { month: criticalLabel })}
          </span>
        )}
      </p>
    </div>
  );
}
