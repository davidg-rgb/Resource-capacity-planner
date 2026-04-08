---
phase: 41-persona-views-part-2-line-manager
plan: 03
subsystem: line-manager group timeline (UX-V5-05)
tags: [frontend, wave-2, line-manager, timeline, ag-grid, master-detail-override, direct-edit]
requires:
  - planning.read.getGroupTimeline + scope=line-manager branch (Plan 41-01)
  - PersonaGate + DesktopOnlyScreen (Plan 41-02 / 41-01)
  - resolveEditGate (Phase 39)
  - patchAllocation (Phase 40)
  - PlanVsActualCell (Phase 37)
  - HistoricEditDialog (Phase 40)
provides:
  - LineManagerTimelineGrid (flat-row master/detail alternative, ag-grid community)
  - LmPersonColumnCell / LmTimelineCell (person disclosure + month edit)
  - buildLmRows (flat row builder with zero-filled month totals)
  - /line-manager/timeline route wired to GET /api/v5/planning/allocations?scope=line-manager
  - allocationIds threaded through GroupTimelineProjectRow for direct PATCH-by-id
affects:
  - src/features/planning/planning.read.ts (GroupTimelineProjectRow.allocationIds added)
tech-stack:
  added: []
  patterns:
    - ag-grid community flat-row master/detail override via dual-namespace getRowId (person:/project:) and Set<personId> expand state
    - rowClassRules (lm-child-row) as a visual indent substitute for ag-grid tree mode
    - useRef-free expand state (useState<Set>) so refetches do not reset disclosure
    - cellRendererParams.monthKey threaded from columnDefs into the month cell renderer
    - ag-grid stub pattern in jsdom tests (render rowData as plain divs)
key-files:
  created:
    - src/components/timeline/lm-timeline-cell.tsx
    - src/components/timeline/line-manager-timeline-grid.tsx
    - src/components/timeline/__tests__/line-manager-timeline-grid.test.tsx
    - src/app/(app)/line-manager/timeline/page.tsx
    - src/features/planning/__tests__/group-timeline-edit.test.ts
  modified:
    - src/features/planning/planning.read.ts
decisions:
  - CONTEXT D-12 ag-grid master/detail override: ag-grid-community ^35 does NOT ship master/detail. Implemented the flat-row alternative: interleave synthetic `kind: 'project'` child rows after their parent `kind: 'person'` row, keyed by `person:${id}` / `project:${personId}:${projectId}` to avoid Pitfall 7 row-id collisions.
  - Edit target resolution on the aggregate person row: pick the first project whose allocationIds contains an id for the given month. If none exist, the cell is effectively read-only — creating a brand-new allocation from an empty aggregate cell is out of scope for Phase 41-03 (would need a create-allocation path).
  - GroupTimelineProjectRow gained `allocationIds: Record<monthKey, string>` (Rule 3 blocking): the PATCH-by-id route requires an allocation id, and the previous shape omitted it. The schema extension is additive and did not break the existing group-timeline.test.ts assertions.
  - Duplicated the ag-grid bootstrap (rather than wrapping <TimelineGrid>) because the PM grid doesn't accept a row-kind discriminator and the LM grid needs a distinct cell renderer pair (LmPersonColumnCell + LmMonthCellRenderer) keyed on `row.kind`.
metrics:
  duration: ~18min
  completed: 2026-04-08
  tasks: 2
  files_created: 5
  files_modified: 1
---

# Phase 41 Plan 03: Line Manager group timeline Summary

Wave 2 UI for UX-V5-05. Ships the Line Manager `/line-manager/timeline` route with an expandable per-project breakdown and direct edit for in-department people. ag-grid-community master/detail is enterprise-only, so the grid uses a flat-row synthetic child-row model with a dual-namespace `getRowId` and a useState-backed `Set<personId>` expand store. Direct edits route through `resolveEditGate` and `patchAllocation`; historic edits open the reused `HistoricEditDialog`; the whole screen is gated by `<DesktopOnlyScreen><PersonaGate>` per D-01 / TC-MOBILE-001.

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | LM timeline grid + cell with flat child rows (TC-PS-001..010) | `cb9d0cf` | lm-timeline-cell.tsx, line-manager-timeline-grid.tsx, line-manager-timeline-grid.test.tsx |
| 2 | /line-manager/timeline page + PGlite edit round-trip (TC-API-040..041) | `ea52859` | app/(app)/line-manager/timeline/page.tsx, group-timeline-edit.test.ts, planning.read.ts (+ allocationIds threading in grid/cell) |

## Verification

| Test File | Tests | Status |
|-----------|-------|--------|
| src/components/timeline/__tests__/line-manager-timeline-grid.test.tsx | 11 (TC-PS-001..010 + buildLmRows zero-fill) | green |
| src/features/planning/__tests__/group-timeline-edit.test.ts | 2 (TC-API-040 group timeline GET + TC-API-041 edit→capacity→change_log round-trip) | green |
| src/features/planning/__tests__/group-timeline.test.ts (regression — allocationIds addition) | 3 | green |

`pnpm tsc --noEmit` clean for all Phase 41-03 files. Pre-existing errors in `src/components/change-log/change-log-feed.tsx` (parallel 41-04) are out of scope per the deviation scope boundary.

### Acceptance grep checks (from PLAN)

- `person:\${` / `project:\${` — both present in line-manager-timeline-grid.tsx `getRowId`
- `Set<string>` + `expanded` — present via `useState<Set<string>>(new Set())`
- `lm-child-row` — present in `rowClassRules`
- `TC-PS-001 / TC-PS-005 / TC-PS-007 / TC-PS-009` — all present in line-manager-timeline-grid.test.tsx
- No `ag-grid-enterprise` or `masterDetail` references in the new grid file
- `DesktopOnlyScreen` + `PersonaGate allowed={['line-manager']}` — present in the page
- `line-manager-group-timeline` query key — present in the page
- `scope=line-manager` — present in the page fetch URL
- `TC-API-040 / TC-API-041` — present in group-timeline-edit.test.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] GroupTimelineProjectRow did not expose allocation IDs**
- **Found during:** Task 2 (writing the page fetch handler)
- **Issue:** The plan's architecture uses PATCH `/api/v5/planning/allocations/[id]` which requires the allocation id, but 41-01's `getGroupTimeline` returned only aggregated hours. A runtime lookup endpoint didn't exist either, so the page had no way to resolve `(person, project, month) → allocationId`.
- **Fix:** Extended `GroupTimelineProjectRow` with `allocationIds: Record<monthKey, string>` and populated it from `schema.allocations.id`. The unique index on `(org, person, project, month)` guarantees a single id per cell. Threaded `allocationIds` through `LmPersonRow` / `LmProjectRow` / `buildLmRows` / `LmTimelineCell` so the direct-edit dispatch includes the id.
- **Files:** `src/features/planning/planning.read.ts`, `src/components/timeline/line-manager-timeline-grid.tsx`, `src/components/timeline/lm-timeline-cell.tsx`
- **Commit:** `ea52859`

### Auth gates

None.

## Known Stubs

- **"Create allocation from empty aggregate cell" is not wired.** If a person has zero approved hours for a given month (i.e. no `allocationIds[monthKey]`), editing the cell on the aggregate person row is a no-op — the edit path requires an existing allocation id. Creating a brand-new allocation from the aggregate view requires a create-allocation path (which project? which new id?) that is out of scope for UX-V5-05 and deferred to a later LM polish wave. Users can still create allocations in the existing Person Input Form or by expanding the row and editing a per-project breakdown cell once such cells become editable (currently read-only).
- **Per-project child row cells are read-only.** Edits happen on the aggregate person row. This matches the plan's behavior section ("editing a cell on an in-department person directly patches the allocation") which describes the person row, not the breakdown. A future wave could make child cells editable, but it would need to route the edit to the specific `allocationIds[monthKey]` for that project (straightforward) and decide how aggregate vs per-project edits interact.
- **i18n keys `v5.lineManager.timeline.*`** are rendered via `safeT` fallbacks (English-only). Wave 4 will add the sv/en catalog entries, matching the Plan 41-02 pattern for `v5.lineManager.home.*`.

## Self-Check: PASSED

Created files verified on disk:
- FOUND: src/components/timeline/lm-timeline-cell.tsx
- FOUND: src/components/timeline/line-manager-timeline-grid.tsx
- FOUND: src/components/timeline/__tests__/line-manager-timeline-grid.test.tsx
- FOUND: src/app/(app)/line-manager/timeline/page.tsx
- FOUND: src/features/planning/__tests__/group-timeline-edit.test.ts

Commits verified via `git log --oneline`:
- FOUND: cb9d0cf (Task 1)
- FOUND: ea52859 (Task 2)

Tests: 16 green across the 3 affected files. tsc clean in Phase 41-03 scope.
