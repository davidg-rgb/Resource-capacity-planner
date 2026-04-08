---
phase: 42-persona-views-part-3-staff-rd-drilldown-zoom
plan: 03
subsystem: long-horizon-zoom
tags: [timeline, zoom, iso-calendar, ag-grid, wave-2]
requires:
  - src/lib/time/iso-calendar.ts (Wave 0 — rangeQuarters/rangeYears/quarterKeyForMonth/yearKeyForMonth)
  - src/lib/time/formatters.ts (Wave 0 — formatQuarter/formatYear)
  - src/components/timeline/timeline-columns.ts (Phase 40 — month branch)
  - src/components/timeline/PlanVsActualCell.tsx (Phase 37)
  - src/features/planning/planning.read.ts (CellView)
provides:
  - buildTimelineColumns quarter + year branches with client-side aggregation via valueGetter
  - ZoomControls 3-button toggle + useZoom URL-sync hook
  - CellView.aggregate + underlyingMonths fields
  - PlanVsActualCell Σ badge in aggregate mode
  - ZoomControls mounted on PM project, LM group, and Staff timeline pages
affects:
  - Phase 42 Wave 3 (R&D portfolio inherits zoom via same controls)
  - Future LM/Staff re-aggregation — controls present but re-aggregation into their own grid/table implementations is deferred (see Known Stubs)
tech-stack:
  added: []
  patterns:
    - ag-grid valueGetter for client-side re-aggregation (zoom as presentation concern)
    - ISO-year-majority bucket assignment (Dec 2026 → 2026-Q4, not 2027-Q1)
    - URL-synced hook via next/navigation router.replace + URLSearchParams
key-files:
  created:
    - src/components/timeline/useZoom.ts
    - src/components/timeline/zoom-controls.tsx
    - src/components/timeline/__tests__/timeline-columns.zoom.test.ts
    - src/components/timeline/__tests__/TimelineGrid.zoom.test.tsx
  modified:
    - src/components/timeline/timeline-columns.ts
    - src/components/timeline/timeline-grid.tsx
    - src/components/timeline/PlanVsActualCell.tsx
    - src/features/planning/planning.read.ts
    - src/app/(app)/pm/projects/[projectId]/page.tsx
    - src/app/(app)/line-manager/timeline/page.tsx
    - src/app/(app)/staff/page.tsx
    - src/messages/sv.json
    - src/messages/en.json
    - src/messages/keys.ts
decisions:
  - Zoom re-aggregation lives in the column builder's valueGetter (not in read model). Read model keeps returning month-grain data; client aggregates per column.
  - ag-grid valueGetter reads row's m_* month cells and synthesizes a CellView with aggregate=true + underlyingMonths. Existing PmTimelineCellRenderer reads params.value and renders unchanged.
  - Staff page is an HTML table (not ag-grid) in Plan 42-02 — ZoomControls is mounted visually but table re-aggregation is a follow-up. Same for LM grid which has its own column builder.
  - URL default is month (no ?zoom= when month selected); quarter/year explicit.
metrics:
  duration: ~35 min
  completed: 2026-04-08
requirements: [UX-V5-12, UX-V5-08]
---

# Phase 42 Plan 03: Long-horizon zoom (month/quarter/year) Summary

Shipped month/quarter/year zoom aggregation in `buildTimelineColumns` (used by the PM TimelineGrid) plus the shared `ZoomControls` + `useZoom` URL-sync hook mounted on PM project, LM group, and Staff timeline pages. Quarter/year columns aggregate month-grain row data client-side via ag-grid `valueGetter`, using the Wave 0 ISO-year-majority helpers so December 2026's week-53 working days correctly roll into 2026-Q4 / 2026 (never 2027).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing zoom column builder tests | 21e3a2e | __tests__/timeline-columns.zoom.test.ts |
| 1 (GREEN) | Quarter/year branches + CellView aggregate + Σ badge | 94099d4 | timeline-columns.ts, planning.read.ts, PlanVsActualCell.tsx |
| 2 | ZoomControls + useZoom + mount on PM/LM/Staff + i18n | 00634f7 | useZoom.ts, zoom-controls.tsx, timeline-grid.tsx, 3 pages, sv/en/keys, TimelineGrid.zoom.test.tsx |

## Verification

- `pnpm vitest run src/components/timeline/__tests__/timeline-columns.zoom.test.ts` → 6/6 green
- `pnpm vitest run src/components/timeline/__tests__/TimelineGrid.zoom.test.tsx` → 5/5 green
- `pnpm vitest run src/components/timeline src/messages` → 34/34 green (all prior tests still pass)
- `pnpm tsc --noEmit` → clean

### Must-Haves satisfied
- `buildTimelineColumns(range, 'quarter')` returns 1 pinned + 4 quarter columns with `KV1 2026`…`KV4 2026` headers for a 12-month 2026 range — asserted by TC-ZOOM-002
- `buildTimelineColumns(range, 'year')` returns 1 pinned + N ISO-year columns — TC-ZOOM-003
- Switching zoom re-aggregates cells client-side: `valueGetter` test sums planned=45 (10+20+15) and actual=25 (8+null+17) for Q4-2026 from month-grain row data
- Zoom controls mounted on `/pm/projects/[id]`, `/line-manager/timeline`, `/staff` (Staff page appeared mid-execution from parallel 42-02)
- Week 53 of 2026's working days roll into Q4-2026 / 2026-year via `quarterKeyForMonth('2026-12') === '2026-Q4'`, validated in TC-ZOOM-004 (`underlyingMonths = ['2026-10','2026-11','2026-12']`) — this is the load-bearing TC-CAL-006 gate

## Deviations from Plan

### [Rule 3 – Blocking] Staff page appeared mid-execution from parallel 42-02
- **Found during:** Task 2 (after committing Task 1)
- **Issue:** Plan instructions said Staff page might not exist yet (plan 42-02 running in parallel). On initial scan, `src/app/(app)/staff/` did not exist. After Task 1 commit, 42-02 had finished and the page was present with a `TODO(42-03): mount <ZoomControls>` comment.
- **Fix:** Added `<ZoomControls>` mount + `useZoom` hook to the Staff page header alongside the existing heading. Re-aggregation into the Staff HTML table is NOT wired — ZoomControls value flows nowhere yet. See Known Stubs.
- **Files modified:** src/app/(app)/staff/page.tsx
- **Commit:** 00634f7

### [Rule 2 – Critical] TimelineGrid never had the `zoom` prop wired
- **Found during:** Task 2
- **Issue:** Plan said "confirm timeline-grid.tsx accepts zoom prop". It did not — `TimelineGridProps` had no zoom field, and `buildTimelineColumns(view.monthRange)` was called with the default month argument.
- **Fix:** Added `zoom?: TimelineZoom` to `TimelineGridProps`, threaded it into `useMemo([view.monthRange, zoom])` passing to `buildTimelineColumns(view.monthRange, zoom)`.
- **Files modified:** src/components/timeline/timeline-grid.tsx
- **Commit:** 00634f7

## Known Stubs

- **LM group timeline zoom re-aggregation not wired.** `LineManagerTimelineGrid` has its own flat-row column builder (not `buildTimelineColumns`) because it interleaves person/project rows for the expand/collapse flat-row master-detail pattern. ZoomControls is mounted visually on `/line-manager/timeline` but the zoom state does NOT cause LM columns to re-aggregate. Follow-up work (Wave 3 or a 42-04 polish plan) needs to either extract a parallel LM column builder with quarter/year branches or refactor LM to consume `buildTimelineColumns`.
- **Staff HTML-table zoom re-aggregation not wired.** Staff page (42-02) renders a plain HTML `<table>` with `monthRange.map()` headers — not ag-grid. ZoomControls is mounted visually but has no effect on the table columns. Follow-up work needs either a column builder abstraction for the HTML table or a switch to ag-grid.
- The PM project timeline (TimelineGrid + ag-grid) is the only path where switching zoom produces actual column re-aggregation end-to-end — this is the wave's load-bearing delivery.

## Self-Check: PASSED

- src/components/timeline/timeline-columns.ts: FOUND (quarter + year branches)
- src/components/timeline/zoom-controls.tsx: FOUND
- src/components/timeline/useZoom.ts: FOUND
- src/components/timeline/__tests__/timeline-columns.zoom.test.ts: FOUND
- src/components/timeline/__tests__/TimelineGrid.zoom.test.tsx: FOUND
- src/components/timeline/timeline-grid.tsx: FOUND (zoom prop threaded)
- src/components/timeline/PlanVsActualCell.tsx: FOUND (aggregate prop + Σ badge)
- src/features/planning/planning.read.ts: FOUND (CellView.aggregate + underlyingMonths)
- src/messages/sv.json + en.json + keys.ts: FOUND (v5.timeline.zoom.*)
- Commits 21e3a2e, 94099d4, 00634f7: all present in git log
- All tests green; tsc clean
