'use client';

import { useSearchParams, useRouter } from 'next/navigation';

import { KPICard } from '@/components/charts/kpi-card';
import { UtilizationHeatMap } from '@/components/charts/utilization-heat-map';
import { DisciplineProgress } from '@/components/charts/discipline-progress';
import { StrategicAlerts } from '@/components/charts/strategic-alerts';
import { ProjectImpact } from '@/components/charts/project-impact';
import {
  useDashboardKPIs,
  useDepartmentUtilization,
  useDisciplineBreakdown,
} from '@/hooks/use-dashboard';
import { getCurrentMonth, generateMonthRange } from '@/lib/date-utils';

const TIME_RANGES = [
  { label: '3 months', value: '3' },
  { label: '6 months', value: '6' },
  { label: '12 months', value: '12' },
] as const;

export function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const range = searchParams.get('range') ?? '3';
  const monthFrom = getCurrentMonth();
  const monthTo = generateMonthRange(monthFrom, parseInt(range, 10)).at(-1)!;

  const {
    data: kpis,
    isLoading: kpisLoading,
    error: kpisError,
  } = useDashboardKPIs(monthFrom, monthTo);

  // Keep hooks active even though we use static demo components below
  useDepartmentUtilization(monthFrom, monthTo);
  useDisciplineBreakdown(monthFrom, monthTo);

  const handleRangeChange = (value: string) => {
    router.replace(`/dashboard?range=${value}`, { scroll: false });
  };

  return (
    <div className="mt-6 space-y-8">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="border-outline-variant/30 flex gap-1 rounded-md border p-1">
          {TIME_RANGES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleRangeChange(value)}
              className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                range === value
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {kpisError ? (
        <div className="text-sm text-red-600">Failed to load KPI data</div>
      ) : kpisLoading || !kpis ? (
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border-primary/10 h-28 animate-pulse rounded-sm border-b-2"
            />
          ))}
        </div>
      ) : kpis.totalPeople === 0 ? (
        <div className="bg-surface-container-low text-on-surface-variant rounded-sm p-6 text-sm">
          No team members found. Add people to see capacity metrics.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <KPICard
            title="Total Resources"
            value={kpis.totalPeople}
            badge="+4 New"
            variant="primary"
            href="/dashboard/team"
          />
          <KPICard
            title="Avg Utilization"
            value={`${kpis.utilizationPercent}%`}
            subtitle="Optimal Range"
            variant="primary"
            href="/dashboard/team"
          />
          <KPICard
            title="Overloaded"
            value={kpis.overloadedCount}
            badge="High Priority"
            variant="error"
            href="/dashboard/team?status=over"
          />
          <KPICard
            title="Unallocated"
            value={kpis.underutilizedCount}
            subtitle="Available Bench"
            variant="outline"
            href="/dashboard/team?status=under"
          />
        </div>
      )}

      {/* Main Grid: Heat Map + Alerts | Discipline + Project Impact */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-8">
          <UtilizationHeatMap />
          <StrategicAlerts />
        </div>

        {/* Right column */}
        <div className="col-span-12 space-y-6 lg:col-span-4">
          <DisciplineProgress />
          <ProjectImpact />
        </div>
      </div>
    </div>
  );
}
