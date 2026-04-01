'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { FolderKanban, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CHART_COLORS } from '@/components/charts/chart-colors';
import { formatMonthHeader } from '@/lib/date-utils';
import { useProgramRollup } from '@/hooks/use-program-rollup';
import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="bg-surface-container-low rounded-sm px-4 py-3 text-center">
      <div className="font-headline text-on-surface text-lg font-bold">{value}</div>
      <div className="text-outline-variant text-[10px] font-medium tracking-wider uppercase">
        {label}
      </div>
      {sub && <div className="text-outline-variant mt-0.5 text-[9px]">{sub}</div>}
    </div>
  );
}

interface CoverageBarProps {
  discipline: {
    disciplineName: string;
    abbreviation: string;
    coveragePercent: number;
    peopleCount: number;
    gapFte: number;
  };
  persLabel: string;
}

function CoverageBar({ discipline, persLabel }: CoverageBarProps) {
  const isLow = discipline.coveragePercent < 80;
  const widthPercent = Math.min(discipline.coveragePercent, 100);

  return (
    <div className="flex items-center gap-3">
      <div className="text-on-surface-variant w-12 shrink-0 text-right text-[10px] font-bold">
        {discipline.abbreviation}
      </div>
      <div className="min-w-0 flex-1">
        <div className="bg-surface-container-low h-4 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${widthPercent}%`,
              backgroundColor: isLow ? CHART_COLORS.under : CHART_COLORS.healthy,
            }}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-[10px]">
        <span className="font-bold tabular-nums">{discipline.coveragePercent}%</span>
        <span className="text-outline-variant">
          {discipline.peopleCount} {persLabel}
        </span>
        {discipline.gapFte > 0 && (
          <span className="text-error flex items-center gap-0.5 font-medium">
            <AlertTriangle size={10} />+{discipline.gapFte}
          </span>
        )}
      </div>
    </div>
  );
}

interface MonthLoadBarProps {
  month: string;
  hours: number;
  maxHours: number;
  isPeak: boolean;
  peakLabel: string;
}

function MonthLoadBar({ month, hours, maxHours, isPeak, peakLabel }: MonthLoadBarProps) {
  const widthPercent = maxHours > 0 ? (hours / maxHours) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="text-on-surface-variant w-14 shrink-0 text-right text-[10px] font-medium">
        {formatMonthHeader(month)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="bg-surface-container-low h-3.5 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${widthPercent}%`,
              backgroundColor: isPeak ? CHART_COLORS.primary : CHART_COLORS.primaryDim,
            }}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-[10px] tabular-nums">
        <span className={isPeak ? 'text-on-surface font-bold' : 'text-outline-variant'}>
          {hours.toLocaleString()}h
        </span>
        {isPeak && <span className="text-primary text-[8px] font-bold uppercase">{peakLabel}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staffing Completeness Gauge (simple donut via SVG)
// ---------------------------------------------------------------------------

function StaffingGauge({ percent }: { percent: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  const color =
    percent >= 80 ? CHART_COLORS.healthy : percent >= 50 ? CHART_COLORS.under : CHART_COLORS.over;

  return (
    <div className="relative flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-surface-container-low"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-headline text-xl font-bold" style={{ color }}>
          {percent}%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: 'active' | 'planned' | 'archived' }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    planned: 'bg-amber-100 text-amber-800',
    archived: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const ProgramRollupContent = React.memo(function ProgramRollupContent({
  timeRange,
  config,
}: WidgetProps) {
  const t = useTranslations('widgets.programRollup');
  // Program ID from widget config -- dropdown will be wired when program list endpoint is available
  const selectedProgram = (config?.programId as string) ?? undefined;

  const { data, isLoading, error } = useProgramRollup(
    timeRange.from,
    timeRange.to,
    selectedProgram,
  );

  // Compute peak month
  const { monthEntries, peakMonth } = useMemo(() => {
    if (!data) return { monthEntries: [], peakMonth: '' };
    const entries = Object.entries(data.monthlyLoad).sort(([a], [b]) => a.localeCompare(b));
    const peak = entries.reduce((max, [m, h]) => (h > max[1] ? [m, h] : max), ['', 0] as [
      string,
      number,
    ]);
    return { monthEntries: entries, peakMonth: peak[0] };
  }, [data]);

  if (error) {
    return (
      <div className="text-destructive flex items-center justify-center py-10 text-sm">
        {t('error')}
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

  const programLabel = data.program?.programName ?? t('allPrograms');
  const peakHours = monthEntries.length > 0 ? Math.max(...monthEntries.map(([, h]) => h)) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-headline text-sm font-semibold">{t('title')}</h4>
        {/* Program selector placeholder -- would use a dropdown of programs in production */}
        <div className="text-on-surface-variant bg-surface-container-low rounded px-2 py-1 text-[11px] font-medium">
          {programLabel}
        </div>
      </div>

      {/* KPI Row */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <KpiCard
          label={t('projects')}
          value={data.program?.projectCount ?? data.projects.length}
          sub={t('active')}
        />
        <KpiCard
          label={t('people')}
          value={data.program?.totalPeople ?? data.projects.reduce((s, p) => s + p.peopleCount, 0)}
          sub={t('assigned')}
        />
        <KpiCard
          label={t('peakLoad')}
          value={`${(data.program?.peakMonthlyHours ?? peakHours).toLocaleString()}h`}
          sub={t('perMonth')}
        />
      </div>

      {/* Staffing Completeness */}
      <div className="bg-surface-container-lowest border-outline-variant/10 mb-4 rounded-sm border p-4">
        <div className="text-outline-variant mb-2 text-[10px] font-bold tracking-wider uppercase">
          {t('staffingCompleteness')}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center">
            <StaffingGauge percent={data.staffingCompleteness} />
          </div>
          <div className="text-on-surface-variant text-[11px]">{t('basedOnAllocation')}</div>
        </div>
      </div>

      {/* Discipline Coverage */}
      {data.disciplineCoverage.length > 0 && (
        <div className="mb-4">
          <div className="text-outline-variant mb-2 text-[10px] font-bold tracking-wider uppercase">
            {t('disciplineCoverage')}
          </div>
          <div className="space-y-2">
            {data.disciplineCoverage.map((disc) => (
              <CoverageBar key={disc.disciplineId} discipline={disc} persLabel={t('pers')} />
            ))}
          </div>
        </div>
      )}

      {/* Monthly Load */}
      {monthEntries.length > 0 && (
        <div className="mb-4">
          <div className="text-outline-variant mb-2 text-[10px] font-bold tracking-wider uppercase">
            {t('monthlyLoad')}
          </div>
          <div className="space-y-1.5">
            {monthEntries.map(([month, hours]) => (
              <MonthLoadBar
                key={month}
                month={month}
                hours={hours}
                maxHours={peakHours}
                isPeak={month === peakMonth}
                peakLabel={t('peak')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Projects in Program */}
      {data.projects.length > 0 && (
        <div className="mb-3">
          <div className="text-outline-variant mb-2 text-[10px] font-bold tracking-wider uppercase">
            {t('projectsInProgram')}
          </div>
          <div className="divide-outline-variant/10 divide-y">
            {data.projects.map((proj) => (
              <div key={proj.projectId} className="flex items-center justify-between py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: CHART_COLORS.primary }}
                  />
                  <Link
                    href={`/projects/${proj.projectId}`}
                    className="text-on-surface hover:text-primary truncate text-[11px] font-medium transition-colors"
                  >
                    {proj.projectName}
                  </Link>
                </div>
                <div className="text-outline-variant flex shrink-0 items-center gap-3 text-[10px]">
                  <span>
                    {proj.peopleCount} {t('pers')}
                  </span>
                  <span className="tabular-nums">{proj.monthlyHours.toLocaleString()}h/mo</span>
                  <StatusBadge status={proj.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gap Alert */}
      {data.gapAlert && (
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <span>{data.gapAlert}</span>
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
  id: 'program-rollup',
  name: 'Program Portfolio Roll-up',
  description:
    'Program-level aggregation with staffing completeness gauge, discipline coverage, and project list.',
  category: 'breakdowns',
  icon: FolderKanban,
  component: ProgramRollupContent,
  defaultColSpan: 12,
  minColSpan: 6,
  supportedDashboards: ['project-leader', 'manager'],
  dataHook: 'useProgramRollup',
});
