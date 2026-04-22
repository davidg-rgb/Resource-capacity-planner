'use client';

// v5.0 — Phase 42 / Plan 42-04 Task 2 (D-19):
// Thin read-only wrapper around PlanVsActualCell for the R&D portfolio grid.
// R&D never edits — no onCellEdit is ever forwarded. Clicking the cell fires
// onCellClick which the /rd page wires to the shared PlanVsActualDrawer in
// mode='project-person-breakdown' (personId=null).
//
// v6.0 — Phase 52 / Plan 52-04 (RD-02 / D-09): onCellClick now carries
// `state` so the /rd page can branch red cells (state === 'over') to the
// OvercommitDialog instead of the drawer. Red-state computation mirrors
// PlanVsActualCell#computeState: `over` when actual > planned (10%+), with
// `actual === 0 && planned > 0` treated as a potential overcommit flag to
// stay conservative. Flag-OFF path ignores `state` and preserves Phase 51
// drawer routing — handled at the /rd page level, not here.

import { PlanVsActualCell, computeState, type CellState } from './PlanVsActualCell';

// v6.0 — Phase 52 / REVIEW-FIX WR-03: reuse PlanVsActualCell#computeState as
// the single source of truth for plan/actual state thresholds. Previously
// `computeRdState` duplicated the thresholding logic and silently diverged
// when PlanVsActualCell's rules changed.
export type RdPortfolioCellState = CellState;

export interface RdPortfolioCellProps {
  rowId: string;
  monthKey: string;
  plannedHours: number;
  actualHours: number;
  onCellClick?: (ctx: { rowId: string; monthKey: string; state: RdPortfolioCellState }) => void;
}

export function RdPortfolioCell({
  rowId,
  monthKey,
  plannedHours,
  actualHours,
  onCellClick,
}: RdPortfolioCellProps) {
  const delta = actualHours - plannedHours;
  const state = computeState(plannedHours, actualHours);
  return (
    // Wrap in span so `data-clicks="true"` is a stable target for journey 4B's
    // click-tracker regardless of whether PlanVsActualCell renders a <button>
    // or <div> internally.
    <span data-clicks="true" data-testid={`rd-cell-${rowId}-${monthKey}`} data-state={state}>
      <PlanVsActualCell
        planned={plannedHours}
        actual={actualHours}
        delta={delta}
        personId={''}
        projectId={rowId}
        monthKey={monthKey}
        onCellClick={() => onCellClick?.({ rowId, monthKey, state })}
      />
    </span>
  );
}
