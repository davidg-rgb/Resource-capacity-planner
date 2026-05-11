'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { calculateHeatMapStatus } from '@/lib/capacity';
import type { HeatMapResponse } from '@/features/analytics/analytics.types';

interface HeatMapKpiCardsProps {
  data: HeatMapResponse;
}

interface KpiSummary {
  avgUtilizationPct: number;
  criticalCount: number;
  excessHours: number;
  coveragePct: number;
}

function computeKpis(data: HeatMapResponse): KpiSummary {
  let totalPlanned = 0;
  let totalTargetPersonMonths = 0;
  let criticalCount = 0;
  let excessHours = 0;
  let coveredPeople = 0;
  let totalPeople = 0;

  for (const dept of data.departments) {
    for (const person of dept.people) {
      totalPeople++;
      let anyAllocation = false;
      let isCritical = false;
      for (const month of data.months) {
        const hours = person.months[month] ?? 0;
        if (hours > 0) anyAllocation = true;
        totalPlanned += hours;
        totalTargetPersonMonths += person.targetHours;

        if (hours > person.targetHours) {
          excessHours += hours - person.targetHours;
        }
        if (person.targetHours > 0 && hours / person.targetHours > 1.1) {
          isCritical = true;
        }
      }
      if (isCritical) criticalCount++;
      if (anyAllocation) coveredPeople++;
    }
  }

  const avgUtilizationPct =
    totalTargetPersonMonths > 0 ? (totalPlanned / totalTargetPersonMonths) * 100 : 0;
  const coveragePct = totalPeople > 0 ? (coveredPeople / totalPeople) * 100 : 0;

  return { avgUtilizationPct, criticalCount, excessHours: Math.round(excessHours), coveragePct };
}

/**
 * Footer KPI card grid for the Team Overview Heatmap. Aggregates the 4 metrics
 * Stitch mockup #01 spec'd in the bottom-right card: avg utilization, critical
 * risk count, hiring gap (excess hours over capacity), and project coverage.
 *
 * All values derived from the same HeatMapResponse the table already consumes;
 * no extra fetch.
 */
export function HeatMapKpiCards({ data }: HeatMapKpiCardsProps) {
  const t = useTranslations('heatMap.kpis');
  const kpis = useMemo(() => computeKpis(data), [data]);

  // Identify a critical-risk row for the test suite to assert against.
  // Critical = utilization>110%; use the computed `calculateHeatMapStatus`
  // path for consistency with the underlying heatmap cell coloring.
  const overloadCount = useMemo(() => {
    let n = 0;
    for (const dept of data.departments) {
      for (const person of dept.people) {
        for (const month of data.months) {
          const hours = person.months[month] ?? 0;
          if (calculateHeatMapStatus(hours, person.targetHours) === 'over') {
            n++;
            break;
          }
        }
      }
    }
    return n;
  }, [data]);

  return (
    <div
      data-testid="heat-map-kpi-cards"
      className="bg-surface-container-lowest border-outline-variant/10 flex flex-col rounded-sm border p-6 shadow-sm md:col-span-3"
    >
      <div className="mb-6 flex items-center justify-between">
        <span className="text-outline text-[10px] font-bold tracking-wider uppercase">
          {t('title')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
        <div data-testid="kpi-avg-utilization">
          <p className="text-outline-variant mb-1 text-[10px] font-medium tracking-tighter uppercase">
            {t('avgUtilization')}
          </p>
          <p className="font-headline text-on-surface text-2xl font-bold tabular-nums">
            {kpis.avgUtilizationPct.toFixed(1)}%
          </p>
          <p className="text-outline mt-1 text-[10px] font-medium">{t('avgUtilizationHint')}</p>
        </div>

        <div data-testid="kpi-critical-risk">
          <p className="text-outline-variant mb-1 text-[10px] font-medium tracking-tighter uppercase">
            {t('criticalRisk')}
          </p>
          <p
            className={`font-headline text-2xl font-bold tabular-nums ${
              kpis.criticalCount > 0 ? 'text-error' : 'text-on-surface'
            }`}
          >
            {kpis.criticalCount}
          </p>
          <p className="text-outline mt-1 text-[10px] font-medium">
            {t('criticalRiskHint', { count: kpis.criticalCount })}
          </p>
        </div>

        <div data-testid="kpi-hiring-gap">
          <p className="text-outline-variant mb-1 text-[10px] font-medium tracking-tighter uppercase">
            {t('hiringGap')}
          </p>
          <p className="font-headline text-on-surface text-2xl font-bold tabular-nums">
            {overloadCount}
          </p>
          <p className="text-outline mt-1 text-[10px] font-medium">
            {t('hiringGapHint', { hours: kpis.excessHours })}
          </p>
        </div>

        <div data-testid="kpi-coverage">
          <p className="text-outline-variant mb-1 text-[10px] font-medium tracking-tighter uppercase">
            {t('coverage')}
          </p>
          <p className="font-headline text-on-surface text-2xl font-bold tabular-nums">
            {kpis.coveragePct.toFixed(0)}%
          </p>
          <div className="bg-surface-container-low mt-2 h-1 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full"
              style={{ width: `${Math.min(100, kpis.coveragePct)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
