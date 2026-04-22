'use client';

// v6.0 Phase 53 Plan 03 POLISH-03 — Unified discipline breakdown widget.
// Merges legacy `discipline-chart` (org-wide) + `discipline-distribution` (per-project)
// into a single widget that infers scope from `config.projectId` and exposes a
// bar/donut chart-type toggle per D-07. Small-N (< 3 disciplines) per-project scope
// falls back to the existing progress-bar list (D-02). Legacy widget files stay
// on disk (D-06) so LEGACY_LAYOUTS / flag-off rollback continues to work.

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PieChart as PieIcon, Loader2 } from 'lucide-react';

import { DisciplineChart } from '@/components/charts/discipline-chart';
import { DisciplineDonut } from '@/components/charts/discipline-donut';
import { DisciplineDistribution } from '@/components/project-view/discipline-distribution';
import { useDisciplineBreakdown } from '@/hooks/use-dashboard';
import { useProjectStaffing } from '@/hooks/use-project-staffing';
import type {
  DisciplineBreakdown,
  ProjectStaffingResponse,
} from '@/features/analytics/analytics.types';

import { registerWidget } from '../widget-registry';
import type { WidgetProps } from '../widget-registry.types';

type ChartType = 'bar' | 'donut';

// ---------------------------------------------------------------------------
// normalizeProjectStaffing — shared helper for project-scope rows.
// ---------------------------------------------------------------------------
// Walks `people[]`, sums monthly hours per discipline (exactly the same total
// the progress-bar fallback computes in `DisciplineDistribution`). Uses the
// abbreviation string as both ID and display name — per-project data does not
// carry a separate discipline UUID (ARCHITECTURE.md §16, ProjectStaffingPerson
// only exposes `discipline: string`).
// Guards Pitfall 5 (normalization producing wrong totals) by unit-testing
// against a fixture where a single discipline is split across two people.
export function normalizeProjectStaffing(
  data: ProjectStaffingResponse | null | undefined,
): DisciplineBreakdown[] {
  if (!data || !data.people || data.people.length === 0) return [];

  const byDiscipline = new Map<string, number>();
  for (const person of data.people) {
    const key = person.discipline && person.discipline.length > 0 ? person.discipline : 'unassigned';
    const personTotal = Object.values(person.months ?? {}).reduce(
      (sum, h) => sum + (typeof h === 'number' ? h : 0),
      0,
    );
    byDiscipline.set(key, (byDiscipline.get(key) ?? 0) + personTotal);
  }

  return Array.from(byDiscipline.entries())
    .map(([key, hours]) => ({
      disciplineId: key,
      disciplineName: key,
      totalHours: hours,
    }))
    .filter((row) => row.totalHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours);
}

// ---------------------------------------------------------------------------
// Widget component
// ---------------------------------------------------------------------------

export function DisciplineBreakdownWidget({ config, timeRange }: WidgetProps) {
  const t = useTranslations('v6.polish.discipline');
  const projectId = (config?.projectId as string | undefined) ?? undefined;
  const scope: 'org' | 'project' = projectId ? 'project' : 'org';
  const defaultChartType: ChartType = scope === 'project' ? 'donut' : 'bar';

  // Persistence note (D-06 trade-off): WidgetProps has no onConfigChange callback
  // in the current widget infra, so toggle state is session-local. Initial value
  // can still come from `config.chartType` so tenants who set it via the API get
  // their default. Full cross-session persistence is deferred to a future plan
  // that extends WidgetProps with onConfigChange + layout mutation.
  const initialChartType = ((config?.chartType as ChartType | undefined) ??
    defaultChartType) as ChartType;
  const [chartType, setChartType] = useState<ChartType>(initialChartType);

  // Both hooks are ALWAYS called (React rules of hooks). `useProjectStaffing`
  // internally gates on `!!projectId`, so the org-scope path skips the fetch.
  // `useDisciplineBreakdown` runs unconditionally; the extra query in project
  // mode is cheap (cached by TanStack), but a future optimization could add an
  // `enabled` option to skip it entirely.
  const orgQuery = useDisciplineBreakdown(timeRange.from, timeRange.to);
  const projectQuery = useProjectStaffing(
    scope === 'project' ? projectId : undefined,
    timeRange.from,
    timeRange.to,
  );

  const rows: DisciplineBreakdown[] = useMemo(() => {
    if (scope === 'org') return orgQuery.data ?? [];
    return normalizeProjectStaffing(projectQuery.data);
  }, [scope, orgQuery.data, projectQuery.data]);

  const isLoading = scope === 'org' ? orgQuery.isLoading : projectQuery.isLoading;
  const error = scope === 'org' ? orgQuery.error : projectQuery.error;

  // Error / loading states mirror the legacy widgets for visual continuity.
  if (error) {
    return (
      <div className="text-destructive flex items-center justify-center py-10 text-sm">
        Kunde inte ladda disciplinfördelning
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  // D-02: per-project scope + > 0 AND < 3 disciplines -> progress-bar list.
  // The donut / bar primitives mis-read a 2-slice chart as "half the team is SW";
  // progress bars are unambiguous for small palettes.
  if (scope === 'project' && rows.length > 0 && rows.length < 3) {
    return (
      <DisciplineDistribution
        people={projectQuery.data?.people ?? []}
        months={projectQuery.data?.months ?? []}
      />
    );
  }

  if (rows.length === 0) {
    return <div className="text-on-surface-variant py-10 text-center text-sm">Ingen data</div>;
  }

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label={`${t('toggleBar')} / ${t('toggleDonut')}`}
        className="flex gap-2 text-sm"
      >
        <button
          type="button"
          role="tab"
          aria-selected={chartType === 'bar'}
          onClick={() => setChartType('bar')}
          className={
            chartType === 'bar'
              ? 'text-on-surface font-semibold underline underline-offset-4'
              : 'text-on-surface-variant hover:text-on-surface'
          }
        >
          {t('toggleBar')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={chartType === 'donut'}
          onClick={() => setChartType('donut')}
          className={
            chartType === 'donut'
              ? 'text-on-surface font-semibold underline underline-offset-4'
              : 'text-on-surface-variant hover:text-on-surface'
          }
        >
          {t('toggleDonut')}
        </button>
      </div>
      {chartType === 'bar' ? <DisciplineChart data={rows} /> : <DisciplineDonut data={rows} />}
    </div>
  );
}

const DisciplineBreakdownContent = React.memo(DisciplineBreakdownWidget);

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

registerWidget({
  id: 'discipline-breakdown',
  name: 'Discipline Breakdown',
  description:
    'Unified discipline distribution — org-wide when no project is selected, per-project when config.projectId is set. Toggle between bar and donut.',
  category: 'breakdowns',
  icon: PieIcon,
  component: DisciplineBreakdownContent,
  defaultColSpan: 6,
  minColSpan: 6,
  supportedDashboards: ['manager', 'project-leader'],
  dataHook: 'useDisciplineBreakdown',
});
