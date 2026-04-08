'use client';

// v5.0 — Phase 42 / Plan 42-02 Task 2 (UX-V5-07, D-01, D-03, D-19):
// Staff "My Schedule" — read-only projects × months grid + summary strip.
//
// PersonaGate: allowed=['staff','admin','rd'] (D-03).
// Data: GET /api/v5/planning/allocations?scope=staff&personId=... (Phase 42-02 Task 1).
// Drawer: PlanVsActualDrawer imported from '@/components/drawer/PlanVsActualDrawer'
// (EXACT path — load-bearing for Phase 42 Wave 4 TC-UI shared drawer test).
// Zoom: TODO — 42-03 will mount <ZoomControls> here.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

import { PersonaGate } from '@/features/personas/persona-route-guard';
import { usePersona } from '@/features/personas/persona.context';
import {
  PlanVsActualDrawerProvider,
  usePlanVsActualDrawer,
} from '@/components/drawer/usePlanVsActualDrawer';
import { PlanVsActualDrawer } from '@/components/drawer/PlanVsActualDrawer';
import { StaffTimelineCell } from '@/components/timeline/staff-timeline-cell';
import { ZoomControls } from '@/components/timeline/zoom-controls';
import { useZoom } from '@/components/timeline/useZoom';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';
import type { StaffScheduleResult } from '@/features/planning/planning.read';

const MONTH_HORIZON = 12;

async function fetchStaffSchedule(
  personId: string,
  startMonth: string,
  endMonth: string,
): Promise<StaffScheduleResult> {
  const url =
    `/api/v5/planning/allocations?scope=staff` +
    `&personId=${encodeURIComponent(personId)}` +
    `&startMonth=${encodeURIComponent(startMonth)}` +
    `&endMonth=${encodeURIComponent(endMonth)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`staff-schedule ${res.status}`);
  return (await res.json()) as StaffScheduleResult;
}

export default function StaffPage() {
  return (
    <PersonaGate allowed={['staff', 'admin', 'rd']}>
      <PlanVsActualDrawerProvider>
        <StaffPageInner />
      </PlanVsActualDrawerProvider>
    </PersonaGate>
  );
}

function StaffPageInner() {
  const { persona } = usePersona();
  const { orgId } = useAuth();
  const t = useTranslations('v5.staff');
  const drawer = usePlanVsActualDrawer();
  const [zoom, setZoom] = useZoom();

  // Staff persona carries a personId; admin/rd use empty until they pick.
  const personId =
    persona.kind === 'staff' ? persona.personId : '';

  const months = useMemo(() => generateMonthRange(getCurrentMonth(), MONTH_HORIZON), []);
  const startMonth = months[0]!;
  const endMonth = months[months.length - 1]!;
  const monthRange = `${startMonth}:${endMonth}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['staff-schedule', personId, monthRange],
    queryFn: () => fetchStaffSchedule(personId, startMonth, endMonth),
    enabled: !!personId,
  });

  function handleCellClick(
    projectId: string,
    projectName: string,
    personName: string,
    monthKey: string,
  ) {
    drawer.open({
      mode: 'daily',
      personId,
      projectId,
      monthKey,
      personName,
      projectName,
      monthLabel: monthKey,
    });
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-headline text-2xl font-bold">{t('title')}</h1>
        <ZoomControls value={zoom} onChange={setZoom} />
      </div>

      {!personId && (
        <div
          data-testid="staff-no-persona"
          className="text-on-surface-variant p-4 text-sm"
        >
          {t('noPersonaHint')}
        </div>
      )}

      {isLoading && (
        <div
          data-testid="staff-skeleton"
          className="bg-surface-container-low h-[400px] animate-pulse rounded-md"
        />
      )}

      {error && <div className="text-error p-4 text-sm">{(error as Error).message}</div>}

      {data && (
        <StaffScheduleTable
          data={data}
          onCellClick={(projectId, projectName, monthKey) =>
            handleCellClick(projectId, projectName, data.person.name, monthKey)
          }
        />
      )}

      <PlanVsActualDrawer orgId={orgId ?? ''} />
    </div>
  );
}

interface StaffScheduleTableProps {
  data: StaffScheduleResult;
  onCellClick: (projectId: string, projectName: string, monthKey: string) => void;
}

function StaffScheduleTable({ data, onCellClick }: StaffScheduleTableProps) {
  const t = useTranslations('v5.staff');
  const { monthRange, projects, summaryStrip } = data;

  if (projects.length === 0) {
    return (
      <div data-testid="staff-empty" className="text-on-surface-variant p-4 text-sm">
        {t('empty')}
      </div>
    );
  }

  return (
    <div data-testid="staff-grid" className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-surface p-2 text-left" />
            {monthRange.map((mk) => (
              <th key={mk} className="p-2 text-left font-medium">
                {mk}
              </th>
            ))}
          </tr>
          <tr data-testid="staff-summary-strip" className="text-on-surface-variant text-xs">
            <th className="sticky left-0 bg-surface p-2 text-left font-normal">
              {t('summaryStrip.planned')} / {t('summaryStrip.actual')} /{' '}
              {t('summaryStrip.utilization')}
            </th>
            {monthRange.map((mk) => {
              const s = summaryStrip[mk];
              return (
                <td
                  key={mk}
                  data-testid={`staff-summary-${mk}`}
                  className="p-2 tabular-nums"
                >
                  {s?.plannedHours.toFixed(0) ?? '0'} / {s?.actualHours.toFixed(0) ?? '0'} /{' '}
                  {s?.utilizationPct ?? 0}%
                </td>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {projects.map((row) => (
            <tr key={row.projectId} data-testid={`staff-row-${row.projectId}`}>
              <td className="sticky left-0 bg-surface p-2 font-medium">{row.projectName}</td>
              {monthRange.map((mk) => {
                const cell = row.months[mk]!;
                return (
                  <td key={mk} className="p-1 align-top">
                    <StaffTimelineCell
                      view={cell}
                      projectId={row.projectId}
                      onCellClick={({ monthKey }) =>
                        onCellClick(row.projectId, row.projectName, monthKey)
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
