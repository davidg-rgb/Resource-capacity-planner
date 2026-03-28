'use client';

import { useSearchParams, useRouter } from 'next/navigation';

import { KPICard } from '@/components/charts/kpi-card';
import { DepartmentBarChart } from '@/components/charts/department-bar-chart';
import { DisciplineChart } from '@/components/charts/discipline-chart';
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

  const {
    data: departments,
    isLoading: deptsLoading,
    error: deptsError,
  } = useDepartmentUtilization(monthFrom, monthTo);

  const {
    data: disciplines,
    isLoading: discLoading,
    error: discError,
  } = useDisciplineBreakdown(monthFrom, monthTo);

  const handleRangeChange = (value: string) => {
    router.replace(`/dashboard?range=${value}`, { scroll: false });
  };

  return (
    <div className="mt-6 space-y-6">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-outline-variant/30 bg-surface-container-low h-28 animate-pulse rounded-lg border"
            />
          ))}
        </div>
      ) : kpis.totalPeople === 0 ? (
        <div className="border-outline-variant/30 bg-surface-container-low text-on-surface-variant rounded-lg border p-6 text-sm">
          No team members found. Add people to see capacity metrics.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Utilization"
            value={`${kpis.utilizationPercent}%`}
            href="/dashboard/team"
          />
          <KPICard title="Headcount" value={kpis.totalPeople} href="/dashboard/team" />
          <KPICard
            title="Overloaded"
            value={kpis.overloadedCount}
            subtitle="Above 100%"
            href="/dashboard/team?status=over"
          />
          <KPICard
            title="Underutilized"
            value={kpis.underutilizedCount}
            subtitle="Below 50%"
            href="/dashboard/team?status=under"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Utilization */}
        <div className="border-outline-variant/30 bg-surface-container-low rounded-lg border p-6">
          <h2 className="font-headline text-outline mb-4 text-sm font-semibold tracking-widest uppercase">
            Department Utilization
          </h2>
          {deptsError ? (
            <div className="text-sm text-red-600">Failed to load department data</div>
          ) : deptsLoading || !departments ? (
            <div className="bg-surface-container h-[300px] animate-pulse rounded" />
          ) : departments.length === 0 ? (
            <div className="text-on-surface-variant flex h-[300px] items-center justify-center text-sm">
              No department data available
            </div>
          ) : (
            <div className="h-[300px]">
              <DepartmentBarChart data={departments} />
            </div>
          )}
        </div>

        {/* Discipline Breakdown */}
        <div className="border-outline-variant/30 bg-surface-container-low rounded-lg border p-6">
          <h2 className="font-headline text-outline mb-4 text-sm font-semibold tracking-widest uppercase">
            Discipline Breakdown
          </h2>
          {discError ? (
            <div className="text-sm text-red-600">Failed to load discipline data</div>
          ) : discLoading || !disciplines ? (
            <div className="bg-surface-container h-[300px] animate-pulse rounded" />
          ) : disciplines.length === 0 ? (
            <div className="text-on-surface-variant flex h-[300px] items-center justify-center text-sm">
              No discipline data available
            </div>
          ) : (
            <div className="h-[300px]">
              <DisciplineChart data={disciplines} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
