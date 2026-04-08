'use client';

// v5.0 — Phase 42 / Plan 42-04 Task 2 (D-19):
// Thin read-only wrapper around PlanVsActualCell for the R&D portfolio grid.
// R&D never edits — no onCellEdit is ever forwarded. Clicking the cell fires
// onCellClick which the /rd page wires to the shared PlanVsActualDrawer in
// mode='project-person-breakdown' (personId=null).

import { PlanVsActualCell } from './PlanVsActualCell';

export interface RdPortfolioCellProps {
  rowId: string;
  monthKey: string;
  plannedHours: number;
  actualHours: number;
  onCellClick?: (ctx: { rowId: string; monthKey: string }) => void;
}

export function RdPortfolioCell({
  rowId,
  monthKey,
  plannedHours,
  actualHours,
  onCellClick,
}: RdPortfolioCellProps) {
  const delta = actualHours - plannedHours;
  return (
    <PlanVsActualCell
      planned={plannedHours}
      actual={actualHours}
      delta={delta}
      personId={''}
      projectId={rowId}
      monthKey={monthKey}
      onCellClick={() => onCellClick?.({ rowId, monthKey })}
    />
  );
}
