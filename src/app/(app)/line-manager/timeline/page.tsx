'use client';

// v5.0 — Phase 41 / Plan 41-03 Task 2 (UX-V5-05, D-01, D-17, D-19):
// Line Manager group timeline route.
//
// Wraps LineManagerTimelineGrid in <DesktopOnlyScreen><PersonaGate> to enforce
// the persona-scoped, desktop-only access contract (TC-MOBILE-001, TC-NEG-013).
//
// Data: GET /api/v5/planning/allocations?scope=line-manager&departmentId=... (Phase 41-01).
// Query key: ['line-manager-group-timeline', departmentId, monthRange] (D-19).
// Edits: direct patchAllocation via PATCH /api/v5/planning/allocations/[id];
// on success, invalidates both ['line-manager-group-timeline', ...] and
// ['line-manager-capacity', ...] so the LM Home heatmap reflects the change.

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { DesktopOnlyScreen } from '@/components/responsive/desktop-only-screen';
import { LineManagerTimelineGrid } from '@/components/timeline/line-manager-timeline-grid';
import { ZoomControls } from '@/components/timeline/zoom-controls';
import { useZoom } from '@/components/timeline/useZoom';
import { PersonaGate } from '@/features/personas/persona-route-guard';
import { usePersona } from '@/features/personas/persona.context';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';
import type { GroupTimelineView } from '@/features/planning/planning.read';

const MONTH_HORIZON = 12;

async function fetchGroupTimeline(
  departmentId: string,
  startMonth: string,
  endMonth: string,
): Promise<GroupTimelineView> {
  const url =
    `/api/v5/planning/allocations?scope=line-manager` +
    `&departmentId=${encodeURIComponent(departmentId)}` +
    `&startMonth=${encodeURIComponent(startMonth)}` +
    `&endMonth=${encodeURIComponent(endMonth)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`group-timeline ${res.status}`);
  return (await res.json()) as GroupTimelineView;
}

async function patchAllocationHttp(args: {
  allocationId: string;
  hours: number;
  confirmHistoric?: boolean;
}): Promise<void> {
  const res = await fetch(`/api/v5/planning/allocations/${args.allocationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hours: args.hours, confirmHistoric: args.confirmHistoric ?? false }),
  });
  if (!res.ok) throw new Error(`alloc-patch ${res.status}`);
}

export default function LineManagerTimelinePage() {
  return (
    <DesktopOnlyScreen>
      <PersonaGate allowed={['line-manager']}>
        <LineManagerTimelineInner />
      </PersonaGate>
    </DesktopOnlyScreen>
  );
}

function LineManagerTimelineInner() {
  const { persona } = usePersona();
  const t = useTranslations('v5.lineManager');
  const queryClient = useQueryClient();
  const [zoom, setZoom] = useZoom();

  const departmentId = persona.kind === 'line-manager' ? persona.departmentId : '';

  const months = useMemo(() => generateMonthRange(getCurrentMonth(), MONTH_HORIZON), []);
  const startMonth = months[0];
  const endMonth = months[months.length - 1];
  const monthRange = `${startMonth}:${endMonth}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['line-manager-group-timeline', departmentId, monthRange],
    queryFn: () => fetchGroupTimeline(departmentId, startMonth, endMonth),
    enabled: !!departmentId,
  });

  async function handlePatch(args: {
    allocationId: string;
    personId: string;
    projectId: string;
    monthKey: string;
    hours: number;
    confirmHistoric?: boolean;
  }) {
    await patchAllocationHttp({
      allocationId: args.allocationId,
      hours: args.hours,
      confirmHistoric: args.confirmHistoric,
    });
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['line-manager-group-timeline', departmentId, monthRange],
      }),
      queryClient.invalidateQueries({
        queryKey: ['line-manager-capacity', departmentId, monthRange],
      }),
    ]);
  }

  const title = safeT(t, 'timeline.title', 'Team timeline');

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-headline text-2xl font-bold">{title}</h1>
        <ZoomControls value={zoom} onChange={setZoom} />
      </div>
      {!departmentId && (
        <div className="text-on-surface-variant p-4 text-sm">
          {safeT(t, 'timeline.selectDepartment', 'Select a department in the persona switcher.')}
        </div>
      )}
      {isLoading && (
        <div
          data-testid="lm-timeline-skeleton"
          className="bg-surface-container-low h-[600px] animate-pulse rounded-md"
        />
      )}
      {error && (
        <div className="text-error p-4 text-sm">
          {safeT(t, 'timeline.error', 'Failed to load timeline.')}
        </div>
      )}
      {data && (
        <LineManagerTimelineGrid
          view={data}
          departmentId={departmentId}
          currentMonth={getCurrentMonth()}
          onPatchAllocation={handlePatch}
        />
      )}
    </div>
  );
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
  try {
    const v = t(key);
    return typeof v === 'string' && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}
