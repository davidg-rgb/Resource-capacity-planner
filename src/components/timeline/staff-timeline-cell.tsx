'use client';

// v5.0 — Phase 42 / Plan 42-02 Task 2 (D-19):
// Thin read-only wrapper around PlanVsActualCell for the Staff "My Schedule"
// grid. Staff never edits — no onCellEdit is ever forwarded. Clicking the
// cell fires onCellClick which the /staff page wires to the shared
// PlanVsActualDrawer in mode='daily'.

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
      // No onCellEdit — read-only (TC-UI read-only gating).
    />
  );
}
