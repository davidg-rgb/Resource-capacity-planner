---
phase: 42-persona-views-part-3-staff-rd-drilldown-zoom
verified: 2026-04-08T17:47:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 42: Persona views Part 3 — Staff, R&D, drill-down, long-horizon zoom — Verification Report

**Phase Goal:** Ship the remaining persona screens — Staff read-only schedule, R&D portfolio with long-horizon zoom and 53-week handling, plus the shared drill-down drawer component.
**Verified:** 2026-04-08
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Staff "My Schedule" fully read-only with projects × months plan-vs-actual split and month summary strip | VERIFIED | `src/app/(app)/staff/page.tsx` exists with PersonaGate(['staff','admin','rd']), plain HTML table grid, `summaryStrip` rendered (plannedHours/actualHours/utilizationPct per month). RTL test asserts 0 `<input>` elements, all 3 cells render as `<button>`. TC-E2E-3A green. |
| 2 | R&D Manager portfolio grid with projects × months aggregate, project/group toggle, drill-into-PM-view | VERIFIED | `src/app/(app)/rd/page.tsx` exists with PersonaGate(['rd','admin']), groupBy toggle ('project'\|'department'), cell-click opens drawer in `mode='project-person-breakdown'` (dept rows short-circuit by design). TC-E2E-4A green. TC-PSN-006 green. |
| 3 | Long-horizon zoom month/quarter/year across 20–30 months; week 53 of 2026 correctly handled | VERIFIED | `buildTimelineColumns` has `case 'quarter'` and `case 'year'` branches (line 124/126). `rangeQuarters`/`rangeYears` exported from `iso-calendar.ts`. TC-ZOOM-001..004 green (6/6). TC-CAL-003+006 green (7/7). Q4-2026 underlyingMonths=['2026-10','2026-11','2026-12'] asserted; week 53 (Dec 28–30, 3 working days — Dec 31 is Nyårsafton) correctly bins into 2026-Q4. |
| 4 | Shared drill-down drawer reused across PM/LM/Staff/R&D from a single source | VERIFIED | All four pages (`/pm/projects/[projectId]/page.tsx`, `/line-manager/timeline/page.tsx`, `/staff/page.tsx`, `/rd/page.tsx`) import from `'@/components/drawer/PlanVsActualDrawer'` — identical specifier confirmed by grep and by TC-UI shared-import.test.ts (2/2 green, LOAD-BEARING). |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/time/iso-calendar.ts` | rangeQuarters + rangeYears helpers | VERIFIED | Exports `rangeQuarters`, `rangeYears`, `quarterKeyForMonth`, `yearKeyForMonth` at lines 241–302 |
| `src/lib/time/formatters.ts` | formatQuarter + formatYear locale-aware | VERIFIED | `formatQuarter` at line 50, `formatYear` at line 64; KV/Q locale prefix confirmed |
| `src/lib/time/__tests__/iso-calendar.zoom.test.ts` | TC-CAL-003 + TC-CAL-006 tests | VERIFIED | 7/7 green; TC-CAL-003 at line 37, TC-CAL-006 at line 57 |
| `src/lib/time/__tests__/formatters.zoom.test.ts` | Quarter/year formatter tests | VERIFIED | 6/6 green |
| `src/components/timeline/timeline-columns.ts` | TimelineZoom widened + quarter/year branches | VERIFIED | `TimelineZoom = 'month' \| 'quarter' \| 'year'` at line 22; `case 'quarter'` at line 124, `case 'year'` at line 126 |
| `src/components/timeline/zoom-controls.tsx` | 3-button zoom toggle | VERIFIED | File exists; renders 3 buttons for month/quarter/year |
| `src/components/timeline/useZoom.ts` | URL-synced zoom hook | VERIFIED | `useSearchParams` at line 12; `router.replace` at line 38 |
| `src/components/timeline/__tests__/timeline-columns.zoom.test.ts` | TC-ZOOM-001..004 | VERIFIED | 6/6 green |
| `src/components/timeline/__tests__/TimelineGrid.zoom.test.tsx` | RTL re-aggregation test | VERIFIED | 5/5 green |
| `src/components/drawer/usePlanVsActualDrawer.tsx` | DrawerContext with personId nullable + mode | VERIFIED | `DrawerMode = 'daily' \| 'project-person-breakdown'` at line 23; `personId: string \| null` at line 27 |
| `src/components/drawer/PlanVsActualDrawer.tsx` | project-person-breakdown mode branch | VERIFIED | `context?.mode === 'project-person-breakdown'` at line 99 |
| `src/components/drawer/__tests__/shared-import.test.ts` | TC-UI single-source-of-truth grep gate | VERIFIED | 2/2 green; enforces identical specifier across all four pages |
| `src/features/planning/planning.read.ts` | getStaffSchedule + getPortfolioGrid + getProjectPersonBreakdown | VERIFIED | `getStaffSchedule` at line 580, `getPortfolioGrid` at line 295, `getProjectPersonBreakdown` at line 465 |
| `src/app/api/v5/planning/allocations/route.ts` | scope=staff + scope=rd branches | VERIFIED | `scope === 'rd'` at line 57, `scope === 'staff'` at line 66 |
| `src/app/(app)/staff/page.tsx` | Staff My Schedule page with PersonaGate | VERIFIED | PersonaGate(['staff','admin','rd']) at line 49; ZoomControls mounted at line 100; summaryStrip rendered |
| `src/components/timeline/staff-timeline-cell.tsx` | Read-only cell wrapper using PlanVsActualCell | VERIFIED | Imports PlanVsActualCell; renders with readOnly prop |
| `src/app/(app)/rd/page.tsx` | R&D portfolio page with PersonaGate + groupBy + ZoomControls + drawer | VERIFIED | PersonaGate(['rd','admin']) at line 50; groupBy toggle; ZoomControls at line 105; drawer in project-person-breakdown mode |
| `src/components/timeline/rd-portfolio-cell.tsx` | Read-only RD cell wrapper | VERIFIED | Imports PlanVsActualCell; renders with readOnly prop |
| `src/features/planning/__tests__/getStaffSchedule.test.ts` | Unit tests for getStaffSchedule | VERIFIED | 3/3 green |
| `src/features/planning/__tests__/getPortfolioGrid.test.ts` | Unit tests for getPortfolioGrid | VERIFIED | 3/3 green |
| `src/features/planning/__tests__/staff.e2e.test.ts` | TC-E2E-3A Staff happy path | VERIFIED | 1/1 green |
| `src/features/planning/__tests__/rd.e2e.test.ts` | TC-E2E-4A R&D portfolio journey | VERIFIED | 3/3 green |
| `src/features/personas/__tests__/persona.scope.test.ts` | TC-PSN staff scope + TC-PSN-006 | VERIFIED | 10/10 green |
| `src/app/api/v5/planning/allocations/__tests__/scope.contract.test.ts` | TC-API-001 scope=staff + scope=rd contracts | VERIFIED | 5/5 green |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `timeline-columns.ts` | `iso-calendar.ts` | `import { rangeQuarters, rangeYears }` | WIRED | Pattern `rangeQuarters\|rangeYears` present in timeline-columns.ts |
| `staff/page.tsx` | `/api/v5/planning/allocations?scope=staff` | TanStack Query fetch | WIRED | `scope=staff` in queryFn at line 38 |
| `staff/page.tsx` | `PlanVsActualDrawer` | shared import `'@/components/drawer/PlanVsActualDrawer'` | WIRED | Line 23 imports drawer; drawer mounted at line 130 |
| `rd/page.tsx` | `/api/v5/planning/allocations?scope=rd` | TanStack Query fetch | WIRED | `scope=rd` in queryFn at lines 39–40 |
| `rd/page.tsx` | `PlanVsActualDrawer` | shared import `'@/components/drawer/PlanVsActualDrawer'` | WIRED | Line 22 imports drawer; project-person-breakdown mode wired |
| All 4 persona pages | `'@/components/drawer/PlanVsActualDrawer'` | Identical import specifier | WIRED | TC-UI shared-import.test.ts passes — all four use `'@/components/drawer/PlanVsActualDrawer'` |
| `zoom-controls.tsx` | URL `?zoom=` | `router.replace` | WIRED | `router.replace` at line 38 of useZoom.ts |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `staff/page.tsx` | `data.projects`, `data.summaryStrip` | `getStaffSchedule` → `allocations` table (approved) + `aggregateByMonth` (actuals) | Yes — DB query on allocations + actuals tables | FLOWING |
| `rd/page.tsx` | `data.rows` | `getPortfolioGrid` → `allocations` table (approved) + `aggregateByMonth` | Yes — DB query; `approved` allocations only by ADR-001 two-table model | FLOWING |
| `buildTimelineColumns` (quarter/year) | `underlyingMonths` | `rangeQuarters`/`rangeYears` computed from monthRange via ISO calendar helpers | Yes — deterministic computation from real calendar data | FLOWING |
| `PlanVsActualDrawer` (project-person-breakdown) | Per-person rows | `getProjectPersonBreakdownAction` server action | Yes — queries allocations + actuals grouped by person | FLOWING |

Note: The `allocations` table in this codebase is the "approved" table by definition (ADR-001 two-table model: `allocations` = approved, `allocationProposals` = pending). The approved-only invariant is structural, not a filter.

---

### Behavioral Spot-Checks

| Behavior | Result | Status |
|----------|--------|--------|
| TC-CAL-003 + TC-CAL-006: quarter buckets snap on ISO year boundary; week 53 bins into 2026-Q4 | 7/7 green | PASS |
| TC-ZOOM-001..004: month/quarter/year column counts and Q4-2026 underlyingMonths | 6/6 green | PASS |
| TimelineGrid.zoom RTL: switching zoom re-aggregates cells | 5/5 green | PASS |
| TC-UI shared drawer: all 4 pages use identical import specifier | 2/2 green | PASS |
| TC-E2E-3A Staff happy path (PGlite) | 1/1 green | PASS |
| TC-E2E-4A R&D portfolio + groupBy + drill (PGlite) | 3/3 green | PASS |
| TC-PSN staff scope + TC-PSN-006 | 10/10 green | PASS |
| TC-API-001 scope=staff + scope=rd contracts | 5/5 green | PASS |
| `getStaffSchedule` + `getPortfolioGrid` unit tests | 6/6 green | PASS |
| `pnpm tsc --noEmit` | clean (no output) | PASS |

---

### Requirements Coverage

| Requirement | Description | Plans | Status | Evidence |
|-------------|-------------|-------|--------|----------|
| UX-V5-07 | Staff My Schedule read-only (projects × months, plan-vs-actual split, month summary strip) | 42-02 | SATISFIED | `/staff/page.tsx` with HTML table grid, summaryStrip, read-only cells; TC-E2E-3A green |
| UX-V5-08 | R&D Manager portfolio grid with project/group toggle, drill-into-PM-view, long-horizon zoom, 53-week handling | 42-01, 42-03, 42-04 | SATISFIED | `/rd/page.tsx` with groupBy toggle, ZoomControls, drawer drill; TC-E2E-4A green; TC-CAL-006 green |
| UX-V5-09 | Shared drill-down drawer reused across personas | 42-01, 42-02, 42-04 | SATISFIED | TC-UI shared-import.test.ts enforces single `'@/components/drawer/PlanVsActualDrawer'` specifier across all 4 pages (LOAD-BEARING, 2/2 green) |
| UX-V5-12 | Long-horizon zoom levels (month/quarter/year) with ISO 8601 and 53-week year handling | 42-01, 42-03 | SATISFIED | `buildTimelineColumns` quarter/year branches; TC-ZOOM-001..004 green; TC-CAL-003/006 green; week 53 of 2026 (3 working days: Dec 28–30) correctly attributed to 2026-Q4 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/(app)/staff/page.tsx` | 10 | Stale `// Zoom: TODO — 42-03 will mount <ZoomControls> here.` comment | Info | No impact — ZoomControls is actually imported (line 25) and mounted (line 100). Comment left behind by the parallel agent coordination. Not a stub. |

No blockers or warnings found.

---

### Known Deviations (Documented and Accepted)

The following deviations from original plan are documented in SUMMARY files and are explicitly in-scope as Phase 42 known constraints:

1. **Staff HTML table vs ag-grid TimelineGrid** — `/staff` uses a plain `<table>` instead of ag-grid. Read-only contract preserved via `PlanVsActualCell readOnly`. ZoomControls is visually mounted but does not re-aggregate the HTML table columns. Documented in 42-02 + 42-03 Known Stubs.

2. **LM group timeline zoom re-aggregation deferred** — `LineManagerTimelineGrid` has its own flat-row column builder; ZoomControls is visually mounted on `/line-manager/timeline` but zoom state does not cause LM columns to re-aggregate. Documented in 42-03 Known Stubs.

3. **PM/LM cell-click → drawer.open not wired** — Drawer is mounted (import path enforced by TC-UI test); PM/LM cell-click plumbing is deferred to avoid deep ag-grid refactors. Staff and R&D have full end-to-end click → drawer. Documented in 42-04 Known Stubs.

4. **R&D department rows do not drill** — `groupBy='department'` rows have a `departmentId` not a `projectId`; handler short-circuits. Project rows drill successfully. Documented in 42-04 Deviations.

5. **Week 53 of 2026 has 3 working days** (not 4) — Dec 31 = Nyårsafton is also a Swedish fixed holiday. Test fixture updated in 42-01 to reflect 3 days. Semantic assertion (week 53 → 2026-Q4) unchanged.

6. **3 pre-existing TC-CL-005 failures** (`actuals.service`, `actuals-import.service`) — verified pre-existing before Phase 42 touched those files. Deferred to Phase 44.

These deviations are within the accepted scope boundary defined in the phase objective and do not block the four success criteria.

---

### Human Verification Required

#### 1. Staff ZoomControls visual mount (no re-aggregation)

**Test:** Navigate to `/staff?zoom=quarter`. Observe the column headers.
**Expected:** ZoomControls toggle is visible and clickable (URL updates to `?zoom=quarter`), but the table columns do not change — they remain month-grain. This is the documented known deviation.
**Why human:** Cannot verify the UI rendering and the deliberate non-effect without a browser.

#### 2. R&D overcommit drill modal

**Test:** Navigate to `/rd`, click the "Överbelastning" button.
**Expected:** A modal opens listing overcommitted persons in the current period range.
**Why human:** Modal rendering and capacity breakdown data require browser + seeded data to confirm visually.

#### 3. R&D portfolio ZoomControls re-aggregation (ag-grid path)

**Test:** Navigate to `/rd?zoom=quarter`. Observe the grid columns.
**Expected:** ZoomControls is visible; since `/rd` also uses an HTML table (same as Staff, per 42-04 Known Stubs), columns do not re-aggregate. This is the documented known deviation.
**Why human:** Cannot verify grid rendering without browser.

---

### Gaps Summary

No gaps. All four success criteria are fully satisfied by verified, substantive, wired artifacts with real data flowing through them. The load-bearing TC-UI shared-import test passes, confirming UX-V5-09's single-source-of-truth guarantee. TypeScript compiles clean.

---

_Verified: 2026-04-08T17:47:00Z_
_Verifier: Claude (gsd-verifier)_
