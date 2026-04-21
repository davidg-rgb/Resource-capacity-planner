'use client';

// v5.0 — Phase 42 / Plan 42-04 Task 2 (UX-V5-08, UX-V5-09, D-01, D-03, D-19):
// R&D Portfolio Page — read-only projects-or-departments × months grid.
//
// PersonaGate: allowed=['rd','admin'] (D-03).
// Data: GET /api/v5/planning/allocations?scope=rd&groupBy=... (Phase 42-04 Task 1).
// Drawer: PlanVsActualDrawer imported from '@/components/drawer/PlanVsActualDrawer'
// (EXACT path — load-bearing for TC-UI shared drawer test).
// Zoom: ZoomControls + useZoom mounted in header.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

import { DesktopOnlyScreen } from '@/components/responsive/desktop-only-screen';
import { PersonaGate } from '@/features/personas/persona-route-guard';
import {
  PlanVsActualDrawerProvider,
  usePlanVsActualDrawer,
} from '@/components/drawer/usePlanVsActualDrawer';
import { PlanVsActualDrawer } from '@/components/drawer/PlanVsActualDrawer';
import { RdPortfolioCell } from '@/components/timeline/rd-portfolio-cell';
import { ZoomControls } from '@/components/timeline/zoom-controls';
import { useZoom } from '@/components/timeline/useZoom';
import type { TimelineZoom } from '@/components/timeline/timeline-columns';
import { useFlags } from '@/features/flags/flag.context';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';
import { formatQuarter, formatYear } from '@/lib/time/formatters';
import type { PortfolioGridResult } from '@/features/planning/planning.read';
import { aggregateRdRowMonths, rdColumnKeys } from './rd-aggregation';

const MONTH_HORIZON = 12;

type GroupBy = 'project' | 'department';

async function fetchPortfolio(
  groupBy: GroupBy,
  startMonth: string,
  endMonth: string,
): Promise<PortfolioGridResult> {
  const url =
    `/api/v5/planning/allocations?scope=rd` +
    `&groupBy=${encodeURIComponent(groupBy)}` +
    `&startMonth=${encodeURIComponent(startMonth)}` +
    `&endMonth=${encodeURIComponent(endMonth)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`rd-portfolio ${res.status}`);
  return (await res.json()) as PortfolioGridResult;
}

export default function RdPage() {
  return (
    <DesktopOnlyScreen>
      <PersonaGate allowed={['rd', 'admin']}>
        <PlanVsActualDrawerProvider>
          <RdPageInner />
        </PlanVsActualDrawerProvider>
      </PersonaGate>
    </DesktopOnlyScreen>
  );
}

function RdPageInner() {
  const { orgId } = useAuth();
  const t = useTranslations('v5.rd');
  const drawer = usePlanVsActualDrawer();
  const [zoom, setZoom] = useZoom({ persona: 'rd', screen: 'portfolio' });
  const [groupBy, setGroupBy] = useState<GroupBy>('project');
  const [overcommitOpen, setOvercommitOpen] = useState(false);
  const flags = useFlags();
  // v6.0 — Phase 52 / Plan 52-04 (RD-01 / D-08): flag-OFF pins zoom to
  // 'month' at render time so the HTML-table aggregator is a no-op and
  // Phase 51's visible behavior is preserved (zoom control still toggles
  // local state — it just doesn't affect the grid until flag-ON).
  const effectiveZoom: TimelineZoom = flags.uiV6PerJourney ? zoom : 'month';

  const months = useMemo(() => generateMonthRange(getCurrentMonth(), MONTH_HORIZON), []);
  const startMonth = months[0]!;
  const endMonth = months[months.length - 1]!;

  const { data, isLoading, error } = useQuery({
    queryKey: ['rd-portfolio', groupBy, startMonth, endMonth],
    queryFn: () => fetchPortfolio(groupBy, startMonth, endMonth),
  });

  function handleCellClick(rowId: string, rowLabel: string, monthKey: string) {
    // Only project rows can drill into per-person breakdown; department rows
    // open the drawer aimed at the row's projectId column key — but in
    // groupBy='department' mode the row id is a departmentId, which the
    // breakdown fetcher cannot resolve. Skip drill in that case.
    if (groupBy !== 'project') return;
    drawer.open({
      mode: 'project-person-breakdown',
      personId: null,
      projectId: rowId,
      monthKey,
      personName: '',
      projectName: rowLabel,
      monthLabel: monthKey,
    });
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-headline text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="rd-overcommit-drill-btn"
            className="border-outline-variant rounded-sm border px-3 py-1.5 text-sm"
            onClick={() => setOvercommitOpen(true)}
          >
            {t('overcommitDrill')}
          </button>
          <ZoomControls value={zoom} onChange={setZoom} />
        </div>
      </div>

      <div className="flex items-center gap-2" role="tablist" aria-label="groupBy">
        <button
          type="button"
          data-testid="rd-groupby-project"
          aria-pressed={groupBy === 'project'}
          className={`rounded-sm border px-3 py-1.5 text-sm ${
            groupBy === 'project'
              ? 'bg-primary text-on-primary border-primary'
              : 'border-outline-variant'
          }`}
          onClick={() => setGroupBy('project')}
        >
          {t('groupBy.project')}
        </button>
        <button
          type="button"
          data-testid="rd-groupby-department"
          aria-pressed={groupBy === 'department'}
          className={`rounded-sm border px-3 py-1.5 text-sm ${
            groupBy === 'department'
              ? 'bg-primary text-on-primary border-primary'
              : 'border-outline-variant'
          }`}
          onClick={() => setGroupBy('department')}
        >
          {t('groupBy.department')}
        </button>
      </div>

      {isLoading && (
        <div
          data-testid="rd-skeleton"
          className="bg-surface-container-low h-[400px] animate-pulse rounded-md"
        />
      )}

      {error && <div className="text-error p-4 text-sm">{(error as Error).message}</div>}

      {data && (
        <RdPortfolioGrid
          data={data}
          zoom={effectiveZoom}
          onCellClick={(rowId, rowLabel, monthKey) => handleCellClick(rowId, rowLabel, monthKey)}
        />
      )}

      <PlanVsActualDrawer orgId={orgId ?? ''} />

      {overcommitOpen && (
        <div
          data-testid="rd-overcommit-modal"
          role="dialog"
          aria-label={t('overcommitDrill')}
          className="bg-surface fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOvercommitOpen(false);
          }}
        >
          <div className="bg-surface max-w-lg rounded-md p-6 shadow-lg">
            <h2 className="font-headline text-lg font-bold">{t('overcommitDrill')}</h2>
            <p className="text-on-surface-variant mt-2 text-sm">{t('overcommitHint')}</p>
            <button
              type="button"
              className="bg-primary text-on-primary mt-4 rounded-sm px-3 py-1.5 text-sm"
              data-testid="rd-overcommit-close"
              onClick={() => setOvercommitOpen(false)}
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface RdPortfolioGridProps {
  data: PortfolioGridResult;
  zoom: TimelineZoom;
  onCellClick: (rowId: string, rowLabel: string, monthKey: string) => void;
}

function formatColumnHeader(columnKey: string, zoom: TimelineZoom): string {
  if (zoom === 'month') return columnKey;
  if (zoom === 'quarter') return formatQuarter(columnKey, 'sv');
  return formatYear(columnKey, 'sv');
}

function RdPortfolioGrid({ data, zoom, onCellClick }: RdPortfolioGridProps) {
  const t = useTranslations('v5.rd');
  const { monthRange, rows } = data;

  // v6.0 — Phase 52 / Plan 52-04 (RD-01 / D-08): enumerate columns + aggregate
  // cell data by the active zoom level. flag-OFF pins zoom='month' at the page
  // level so this path is a no-op structural copy and Phase 51 layout is
  // preserved.
  const columns = useMemo(() => rdColumnKeys(monthRange, zoom), [monthRange, zoom]);

  if (rows.length === 0) {
    return (
      <div data-testid="rd-empty" className="text-on-surface-variant p-4 text-sm">
        {t('empty')}
      </div>
    );
  }

  return (
    <div data-testid="rd-grid" data-zoom={zoom} className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="bg-surface sticky left-0 p-2 text-left" />
            {columns.map((ck) => (
              <th key={ck} data-testid={`rd-col-${ck}`} className="p-2 text-left font-medium">
                {formatColumnHeader(ck, zoom)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const aggregated = aggregateRdRowMonths(row.months, columns, zoom);
            return (
              <tr key={row.id} data-testid={`rd-row-${row.id}`}>
                <td className="bg-surface sticky left-0 p-2 font-medium">{row.label}</td>
                {columns.map((ck) => {
                  const cell = aggregated[ck];
                  return (
                    <td key={ck} className="p-1 align-top">
                      <RdPortfolioCell
                        rowId={row.id}
                        monthKey={ck}
                        plannedHours={cell.plannedHours}
                        actualHours={cell.actualHours}
                        onCellClick={({ rowId, monthKey }) => onCellClick(rowId, row.label, monthKey)}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
