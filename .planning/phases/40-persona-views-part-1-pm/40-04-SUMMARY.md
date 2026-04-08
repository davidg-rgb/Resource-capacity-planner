---
phase: 40-persona-views-part-1-pm
plan: 04
subsystem: PM timeline grid + historic-edit dialog (Wave 3)
tags: [wave-3, frontend, pm, timeline, ag-grid, historic-edit, i18n]
requires:
  - PlanVsActualCell (Phase 37)
  - resolveEditGate (Phase 39)
  - ProposalCell + useCreateProposal (Phase 39)
  - usePersona (Phase 34)
  - PmTimelineView / CellView (40-02)
  - PATCH /api/v5/planning/allocations/[id] (40-01)
  - GET /api/v5/planning/allocations?scope=pm (40-02)
provides:
  - HistoricEditDialog (persona-agnostic, hand-rolled)
  - PmTimelineCell (cell-edit orchestrator, all 7 edit-gate branches)
  - buildTimelineColumns (ColDef builder)
  - TimelineGrid (ag-grid wrapper)
  - CellView.allocationId
  - v5.historicEdit.* i18n namespace
affects:
  - /pm/projects/[projectId] now renders the real timeline grid
  - Unblocks Wave 4 (e2e smoke + verifier)
tech-stack:
  added: []
  patterns:
    - "Hand-rolled dialog: <div role='dialog' aria-modal fixed inset-0> mirroring reject-modal.tsx / my-wishes-panel.tsx per D-14 post-research"
    - "ag-grid framework cell renderer resolved by string name (pmTimelineCellRenderer); shared props threaded via grid context"
    - "Row pivot: `${personId}::${monthKey}` map → one TimelineRow per person with m_YYYY-MM columns holding CellView values"
    - "Debounce lives inside PlanVsActualCell; orchestrator is stateless w.r.t. debounce"
key-files:
  created:
    - src/components/dialogs/historic-edit-dialog.tsx
    - src/components/timeline/pm-timeline-cell.tsx
    - src/components/timeline/timeline-columns.ts
    - src/components/timeline/timeline-grid.tsx
  modified:
    - src/messages/sv.json
    - src/messages/en.json
    - src/messages/keys.ts
    - src/features/planning/planning.read.ts
    - src/app/(app)/pm/projects/[projectId]/page.tsx
key-decisions:
  - "CellView gains an optional allocationId (string | null) populated by getPmTimeline so the cell can PATCH the correct row; null means no existing allocation to edit directly"
  - "HistoricEditDialog uses the new v5.historicEdit.* namespace (new top-level subkey in sv/en/keys.ts) rather than the pre-existing v5.timeline.historic.* keys — plan-specified, keeps persona-agnostic dialog decoupled from timeline/cell copy evolution"
  - "resolveEditGate requires departmentId: string; coerce null → '' at call site (out-of-dept fallback) to keep the gate pure"
  - "ProposalCell popover positioned absolutely under the cell — avoids ag-grid overflow fighting"
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_created: 4
  files_modified: 5
  tests_added: 0
  completed_date: 2026-04-08
requirements:
  - UX-V5-02
  - UX-V5-11
  - HIST-01
---

# Phase 40 Plan 04: TimelineGrid + PmTimelineCell + HistoricEditDialog Summary

**One-liner:** Wave 3 lights up `/pm/projects/[id]` with a real ag-grid timeline whose cells route every edit through `resolveEditGate` — direct PATCH, proposal popover, or HistoricEditDialog — and completes the `confirmHistoric` round-trip from UI click to the 40-01 PATCH route.

## What shipped

1. **`src/components/dialogs/historic-edit-dialog.tsx`** — persona-agnostic soft-warn dialog. Hand-rolled `<div role="dialog" aria-modal="true" fixed inset-0>` pattern per D-14 post-research (no shadcn Dialog in codebase). Escape cancels, Enter confirms. i18n via `useTranslations('v5.historicEdit')`.

2. **`src/components/timeline/pm-timeline-cell.tsx`** — cell-edit orchestrator wrapping `PlanVsActualCell`. On every edit, calls `resolveEditGate({ persona, targetPerson, month, currentMonth })` and handles all 7 branches:
   - `direct` → `onAllocationPatch({ confirmHistoric: false })`
   - `proposal` → opens `ProposalCell` popover (which self-submits via `useCreateProposal`)
   - `historic-warn-direct` → `HistoricEditDialog` → confirm → PATCH with `confirmHistoric: true`
   - `historic-warn-proposal` → `HistoricEditDialog` → confirm → `ProposalCell` popover
   - `blocked` → no-op (staff persona, defensive)
   The 600ms debounce lives inside `PlanVsActualCell` per 40-RESEARCH Pitfall 7 — the orchestrator is stateless w.r.t. debounce.

3. **`src/components/timeline/timeline-columns.ts`** — `buildTimelineColumns(monthRange, zoom='month')` returns a pinned-left person column plus one ColDef per month with `cellRenderer: 'pmTimelineCellRenderer'` + `cellRendererParams: { monthKey }`. `formatMonthHeader` from `@/lib/date-utils` generates "Jun 2026" style headers.

4. **`src/components/timeline/timeline-grid.tsx`** — thin `AgGridReact` wrapper mirroring `allocation-grid.tsx` bootstrap (`ModuleRegistry.registerModules([AllCommunityModule])`, `modules={modules}`, custom theme wrapper div). Pivots `view.cells` by `${personId}::${monthKey}` into one row per person with `m_YYYY-MM` columns holding `CellView` values. Threads `projectId` / `currentMonth` / `onAllocationPatch` down to every `PmTimelineCell` via ag-grid `context` (typed as `TimelineGridContext`). Registers `PmTimelineCellRenderer` via `components={{ pmTimelineCellRenderer }}`.

5. **`src/features/planning/planning.read.ts`** — extended `CellView` with `allocationId: string | null`; `getPmTimeline` now selects `allocations.id` and populates an `allocIdByKey` map so each cell knows which allocation row to PATCH. Null when no allocation row exists for that (person, month).

6. **`src/app/(app)/pm/projects/[projectId]/page.tsx`** — replaced the Wave 2 `data-testid="pm-timeline-grid-placeholder"` div with `<TimelineGrid view={data} currentMonth={getCurrentMonth()} onAllocationPatch={handlePatch} />`. `handlePatch` fires `fetch('/api/v5/planning/allocations/[id]', PATCH)` and invalidates `['pm-timeline', projectId]` on success via `useQueryClient()`.

7. **i18n** — Added new `v5.historicEdit.{title, body, cancel, confirm}` subkey to `sv.json`, `en.json`, and `keys.ts`. Parity enforced by existing `keys.test.ts` (sv non-empty, sv/en identical key sets).

## Verification

- `pnpm tsc --noEmit` after Task 1 — clean (zero output).
- `pnpm tsc --noEmit` after Task 2 — clean (zero output).
- grep `from '@/components/ui/dialog'` src/components/dialogs/historic-edit-dialog.tsx → zero hits (hand-rolled, no shadcn).
- grep `role="dialog"` src/components/dialogs/historic-edit-dialog.tsx → hit.
- grep `resolveEditGate` src/components/timeline/pm-timeline-cell.tsx → hit.
- grep `HistoricEditDialog` src/components/timeline/pm-timeline-cell.tsx → hit.
- grep `historicEdit` src/messages/sv.json → 5 hits (namespace + 4 leaves).
- grep `historicEdit` src/messages/en.json → 5 hits.
- grep `pm-timeline-cell` src/components/timeline/timeline-grid.tsx → hit (import resolves).
- grep `TimelineGrid` src/app/(app)/pm/projects/[projectId]/page.tsx → hit.
- grep `pm-timeline-grid-placeholder` src/app/(app)/pm/projects/[projectId]/page.tsx → zero hits (replaced).

## Deviations from Plan

**[Rule 3 — Blocking] `resolveEditGate` requires `departmentId: string`, not nullable.**
- **Found during:** Task 1 (typing `PmTimelineCellProps.targetPerson`).
- **Issue:** `CellView.people[].departmentId` is `string | null` (a person can have no department), but `EditGateTargetPerson.departmentId` is `string` (non-null).
- **Fix:** Coerce `departmentId ?? ''` at the `resolveEditGate` call site. Empty string will never match any real persona `homeDepartmentId` / `departmentId`, so people without a department correctly route through the proposal flow (same behaviour as out-of-dept).
- **Files modified:** `src/components/timeline/pm-timeline-cell.tsx`
- **Commit:** `f4d3996`

**[Rule 2 — Critical] `CellView.allocationId` extension was required for PATCH routing.**
- **Found during:** Task 1 read-first pass of planning.read.ts.
- **Issue:** The plan's `<action>` noted "`cell.allocationId` may not exist on `CellView` today — if so, extend `CellView` in `planning.read.ts` in this task". The existing `CellView` did not carry allocation ids, so `runDirectPatch` had no row identifier.
- **Fix:** Added `allocationId: string | null` to `CellView`, extended the allocations select to include `id`, built a parallel `allocIdByKey` map and populated it when composing cells. `runDirectPatch` no-ops if `allocationId === null` (no existing row to edit directly — a future plan will create one on demand).
- **Files modified:** `src/features/planning/planning.read.ts`
- **Commit:** `f4d3996`

## Authentication Gates

None. All work is client/UI plumbing. The `/api/v5/planning/allocations/[id]` PATCH route (from 40-01) already handles `requireRole('planner')` server-side.

## Known Stubs

- **`CellView.allocationId === null` cells are no-op on direct edit.** If a person has no existing allocation row for a month, `runDirectPatch` silently returns. The proposal flow still works in that case. Creating allocation rows on first edit is a future-phase concern — not in this plan's scope and not required by UX-V5-02 success criteria (which target the edit-existing-hours flow).
- **`buildTimelineColumns` `zoom` param is declared but ignored** (`void zoom`). Quarter/year zoom lands in Phase 42; the parameter is in place to avoid a breaking API change when that ships.

## Commits

- `f4d3996` feat(40-04): add PmTimelineCell orchestrator + HistoricEditDialog + historicEdit i18n
- `7fbfe1a` feat(40-04): wire TimelineGrid + buildTimelineColumns into PM project page

## Self-Check: PASSED

- FOUND: src/components/dialogs/historic-edit-dialog.tsx
- FOUND: src/components/timeline/pm-timeline-cell.tsx
- FOUND: src/components/timeline/timeline-columns.ts
- FOUND: src/components/timeline/timeline-grid.tsx
- FOUND: commit f4d3996
- FOUND: commit 7fbfe1a
