---
phase: 39-proposal-approval-workflow
plan: 06
subsystem: proposals-ui
tags: [proposals, ag-grid, react-query, prop-03]
requirements: [PROP-03]
dependency-graph:
  requires:
    - "39-02 edit-gate (resolveEditGate)"
    - "39-05 POST/GET /api/v5/proposals (parallel wave; mocked in tests)"
  provides:
    - "useCreateProposal + useListProposals react-query hooks"
    - "ProposalCellEditor (ag-grid custom cell editor)"
    - "ProposalCellRenderer (dashed border + Pending badge)"
    - "Standalone ProposalCell for Phase 40 PlanVsActualCell reuse"
  affects:
    - "src/components/grid/allocation-grid.tsx (proposal-mode dispatch)"
    - "src/app/(app)/input/[personId]/page.tsx (passes targetPerson)"
    - "src/hooks/use-allocations.ts (departmentId on PersonDetail)"
    - "src/features/analytics/* (departmentId added to PersonDetailResponse)"
tech-stack:
  added:
    - "@testing-library/user-event (already present)"
  patterns:
    - "ag-grid cellEditorSelector / cellRendererSelector dispatch via context flag"
    - "ag-grid forwardRef + useImperativeHandle custom editor (legacy ICellEditor pattern)"
    - "react-query mutation with queryKey invalidation"
key-files:
  created:
    - src/features/proposals/use-proposals.ts
    - src/components/grid/cell-editors/proposal-cell-editor.tsx
    - src/components/grid/cell-renderers/proposal-cell-renderer.tsx
    - src/features/proposals/ui/proposal-cell.tsx
    - src/features/proposals/__tests__/proposal-cell.test.tsx
  modified:
    - src/components/grid/grid-config.ts
    - src/components/grid/allocation-grid.tsx
    - src/app/(app)/input/[personId]/page.tsx
    - src/hooks/use-allocations.ts
    - src/features/analytics/analytics.types.ts
    - src/features/analytics/analytics.service.ts
decisions:
  - "ProposalCellEditor.getValue() always returns the original value — proposal flow never writes through to ag-grid; the only persistence path is the explicit Submit wish button (POST). isCancelAfterEnd returns true to defensively cancel any tab/blur write."
  - "isOutOfDept resolved once at the AllocationGrid level (not per-cell) — the entire grid is either direct-mode or proposal-mode for a given (persona, targetPerson) pair. Historic warn-modals deferred to a future plan."
  - "useListProposals fires unconditionally even before Plan 39-05 lands — the query returns no rows, then auto-lights up post-wave via react-query refetch. No flag to flip."
  - "Added departmentId to PersonDetailResponse + getPersonById hook return so the page can pass targetPerson to AllocationGrid without an extra fetch."
metrics:
  duration: ~25min
  completed: 2026-04-08
  tasks: 3
  files_touched: 11
---

# Phase 39 Plan 06: Proposal Cell UI (PROP-03) Summary

PROP-03 ag-grid custom editor + renderer pair plus standalone Phase-40-ready proposal cell, gated by `resolveEditGate` from Plan 39-02.

## What was built

### Task 1 — react-query hooks (`use-proposals.ts`)
- `useCreateProposal()` — POST `/api/v5/proposals`, invalidates `['proposals']` and `['proposals', 'person', personId]` on success.
- `useListProposals(filter)` — GET with status / departmentId / proposerId / personId / projectId filters; returns `{ proposals: ProposalDTO[] }`.
- Targets the contract from Plan 39-05 (parallel wave). Tests mock `fetch` directly.

### Task 2 — ag-grid wiring
- **`ProposalCellEditor`** (`src/components/grid/cell-editors/proposal-cell-editor.tsx`) — `forwardRef` + `useImperativeHandle` custom editor. Reads `personId` from grid `context`, builds `month` from `props.column.getColId()`, `projectId` from `props.data`. Submit wish calls `useCreateProposal.mutateAsync` then `props.api.stopEditing(true)`. `getValue()` returns the original value; `isCancelAfterEnd()` returns true to guarantee no direct write.
- **`ProposalCellRenderer`** — dashed amber border, right-aligned hours, optional `Pending` badge driven by `context.hasPendingProposal`.
- **`grid-config.buildColumnDefs(months, currentMonth, { isOutOfDept })`** — extended signature; each editable month column now has `cellRendererSelector` and `cellEditorSelector` that dispatch to the proposal components when `isOutOfDept` is true (and the cell is not pinned/add-row/historic).
- **`allocation-grid.tsx`** —
  - new optional `targetPerson?: { id, departmentId }` prop (back-compat: omitting falls back to direct-edit)
  - `usePersona()` + `resolveEditGate({ persona, targetPerson, month: currentMonth, currentMonth })` → `isOutOfDept`
  - `useListProposals({ personId, status: 'proposed' })` drives `hasPendingProposal`
  - Registers `proposalCellEditor` + `proposalCellRenderer` in the components map
  - Threads `{ isOutOfDept, personId, hasPendingProposal }` via the `context` prop
  - `handleCellValueChanged` early-returns when `isOutOfDept` (defense-in-depth; the editor's `getValue()` already prevents writes)
- **`input/[personId]/page.tsx`** — passes `targetPerson={{ id: personId, departmentId: person.departmentId }}`.
- **`PersonDetailResponse` + `getPersonById` hook** — exposes `departmentId` (added to type, SQL select, and return).

### Task 3 — Standalone `ProposalCell` (`features/proposals/ui/proposal-cell.tsx`)
- Framework-agnostic version Phase 40 can drop into `PlanVsActualCell`. Same hours/note/Submit wish UX, no ag-grid coupling. Props: `personId, projectId, month, initialHours, onSubmitted?, onCancelled?`.
- **RTL test** (`__tests__/proposal-cell.test.tsx`) — 4 specs:
  1. Renders with dashed border + initial hours
  2. Edits hours + note, clicks Submit wish, asserts POST body shape and `onSubmitted` fires
  3. API 500 → `onSubmitted` NOT called, error alert visible
  4. Cancel button calls `onCancelled`

## Verification

- `npm run build` — passes (full Next.js build, all routes compile)
- `npx tsc --noEmit` — clean
- `npx vitest run src/features/proposals/__tests__/proposal-cell.test.tsx` — 4/4 passing
- Acceptance grep checks:
  - `cellEditorSelector` / `cellRendererSelector` present in `grid-config.ts`
  - `ProposalCellEditor` / `ProposalCellRenderer` imported + registered in `allocation-grid.tsx`
  - `isOutOfDept` appears 5x in `allocation-grid.tsx` (compute, deps, context, value-changed guard, columnDefs option)
  - `resolveEditGate` imported in `allocation-grid.tsx`
  - `useCreateProposal` imported in both `proposal-cell-editor.tsx` and `proposal-cell.tsx`
  - `border-dashed` present in `proposal-cell.tsx`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `departmentId` to PersonDetailResponse + getPersonById hook**
- **Found during:** Task 2 (wiring `targetPerson` in `input/[personId]/page.tsx`)
- **Issue:** The page's existing `usePersonDetail` returned only `departmentName`, not `departmentId`. `resolveEditGate` requires `departmentId` to compare against the persona's home/department.
- **Fix:** Added `department_id` column to the SQL `SELECT` in `getPersonDetail`, exposed it on `PersonDetailResponse`, and on the inline type in `usePersonDetail`. (Note: `getPersonById` already returned it server-side; only the client hook type needed updating.)
- **Files modified:** `src/features/analytics/analytics.types.ts`, `src/features/analytics/analytics.service.ts`, `src/hooks/use-allocations.ts`
- **Commit:** 395c3d8

**2. [Rule 2 - Critical] Defensive `isCancelAfterEnd: () => true`**
- **Found during:** Task 2 spike on `ICellEditor` semantics
- **Issue:** Plan said "do not write through on stopEditing" but ag-grid's default behavior is to call `getValue()` and write the result on tab/enter/blur.
- **Fix:** `getValue()` returns `props.value` (original), AND `isCancelAfterEnd()` returns true so ag-grid discards the edit entirely. Two layers ensure direct save can never happen on the proposal path.
- **Commit:** 395c3d8 (part of editor implementation)

### Architectural notes (not deviations, just decisions)

- Used the legacy `forwardRef` + `useImperativeHandle` editor pattern instead of the newer `useGridCellEditor` hook because (a) no existing custom editor was present in the repo to mirror, (b) `forwardRef` is the documented stable pattern for `ag-grid-react` 32.x, and (c) it cleanly satisfies the "block direct write" requirement via `isCancelAfterEnd`.
- `useListProposals` is hooked up at the grid level even though Plan 39-05 hasn't shipped yet — the query simply returns nothing until the API exists, then auto-populates via react-query's normal refetch. No feature flag.

## Authentication gates

None — pure UI/hook work.

## Known Stubs

- **`useListProposals` returns no rows until Plan 39-05 ships** the GET handler. This is expected (parallel wave) and will resolve automatically when the route lands. Not a blocker for PROP-03 — the editor + POST path are fully functional against any future API matching the contract in `proposal.types.ts`.
- **`hasPendingProposal` is a boolean** (any pending → all out-of-dept cells show the badge). A per-cell match (by `projectId` + `month`) is a Phase 40 refinement; the current behavior is conservative and correct for the "show me there's something pending on this person" UX.

## Self-Check: PASSED

- `src/features/proposals/use-proposals.ts` — FOUND
- `src/components/grid/cell-editors/proposal-cell-editor.tsx` — FOUND
- `src/components/grid/cell-renderers/proposal-cell-renderer.tsx` — FOUND
- `src/features/proposals/ui/proposal-cell.tsx` — FOUND
- `src/features/proposals/__tests__/proposal-cell.test.tsx` — FOUND
- Commit `81bf2bd` (Task 1) — FOUND
- Commit `395c3d8` (Task 2) — FOUND
- Commit `e1f1861` (Task 3) — FOUND
