'use client';

// v5.0 — Phase 42 / Plan 42-02 Task 2 (D-19):
// Thin read-only wrapper around PlanVsActualCell for the Staff "My Schedule"
// grid. Staff never edits — no onCellEdit is ever forwarded. Clicking the
// cell fires onCellClick which the /staff page wires to the shared
// PlanVsActualDrawer in mode='daily'.
//
// v6.0 — Phase 52 / Plan 52-04 (STAFF-01 / D-10): explicitly pins editable=false
// so `data-editable="false"` renders on the cell root for journey-3A E2E
// assertions. (PlanVsActualCell's `editable` internally defaults to
// `!!onCellEdit`, so omitting both was already read-only; the explicit pin
// is defensive — future refactors can't accidentally flip this.)

import type { CellView } from '@/features/planning/planning.read';

import { PlanVsActualCell } from './PlanVsActualCell';

export interface StaffTimelineCellProps {
  view: CellView;
  projectId: string;
  onCellClick?: (ctx: { personId: string; projectId: string; monthKey: string }) => void;
}

export function StaffTimelineCell({ view, projectId, onCellClick }: StaffTimelineCellProps) {
  const delta = view.actualHours === null ? null : view.actualHours - view.plannedHours;
  return (
    <PlanVsActualCell
      planned={view.plannedHours}
      actual={view.actualHours}
      delta={delta}
      personId={view.personId}
      projectId={projectId}
      monthKey={view.monthKey}
      onCellClick={onCellClick}
      editable={false}
      // No onCellEdit — read-only (TC-UI read-only gating).
    />
  );
}
