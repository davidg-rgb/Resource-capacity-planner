# Phase 42: Persona views Part 3 — Staff, R&D, drill-down, long-horizon zoom — Research

**Researched:** 2026-04-08
**Domain:** Next.js 15 + ag-grid-community read-only persona surfaces + ISO-8601 calendar aggregation + drawer wiring
**Confidence:** HIGH (verified on-disk; no new libraries; all reuse targets exist)

## Summary

Phase 42 is a reuse-and-wire phase, not a build-from-scratch phase. Every load-bearing primitive exists on disk: `PlanVsActualDrawer` (Phase 37), `buildTimelineColumns` with a literal Phase 42 hook comment (Phase 40), `TimelineGrid` already accepts month-grain cell data via a `view` prop, `iso-calendar.ts` with `getISOWeek/getISOWeekYear/getISOWeeksInYear/workDaysInIsoWeek/workingDaysInRange/workDaysInMonth` already shipped (Phase 33), `capacity.read.getPersonMonthUtilization` (Phase 41), `actuals.read.aggregateByMonth/getProjectBurn` (Phase 37), `assertPersonaOrRedirect`/`PersonaGate` (Phase 41), and the `LineManagerTimelineGrid` flat-row pattern ready to clone for R&D groupBy.

The three new things to build are (1) `getStaffSchedule` + `getPortfolioGrid` read-model helpers, (2) `buildTimelineColumns` quarter/year branches + client-side cell aggregation, and (3) four thin page shells (`/staff`, `/rd`, wrapper `<TimelineHeader>`, `zoom-controls.tsx`). The drawer is not wired anywhere today — Phase 42 mounts it on PM/LM/Staff/R&D in a single wave.

**Primary recommendation:** Ship in four waves: Wave 0 = missing iso-calendar helpers (`rangeQuarters`, `rangeYears`) + failing TC-CAL-003/006 scaffolds; Wave 1 = Staff read-only (smallest surface, de-risks route guard + drawer wiring); Wave 2 = buildTimelineColumns zoom + zoom-controls + mount on all four timelines; Wave 3 = R&D portfolio + drawer `personId: null` mode + wire drawer across all four pages with the shared-import test as a gate.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 routes:** `src/app/(app)/staff/page.tsx`, `src/app/(app)/rd/page.tsx`, optional `src/app/(app)/rd/drilldown/page.tsx` (may be folded into `/rd` as modal — planner decides)
- **D-02:** Use existing `(app)` route group; no new route groups
- **D-03 route guards:** `/staff` allows `['staff','admin','rd']`; `/rd` allows `['rd','admin']`; reuse Phase 41 `assertPersonaOrRedirect` + `PersonaGate`
- **D-04:** Add `getStaffSchedule` + `getPortfolioGrid` to `src/features/planning/planning.read.ts` (same file as Phase 40/41)
- **D-05:** Both helpers sum APPROVED allocations only; pending proposals excluded (matches Phase 41 D-07)
- **D-06:** Staff summary strip reuses `getPersonMonthUtilization` from `features/capacity/capacity.read.ts` — do not duplicate
- **D-07:** Portfolio actuals use `features/actuals/actuals.read.ts#aggregateByMonth`
- **D-08:** Extend existing `src/app/api/v5/planning/allocations/route.ts` with `scope=staff` and `scope=rd` branches — do NOT create sibling routes
- **D-09:** R&D overcommit drill extends capacity route with a `breakdown` mode, not a sibling route (planner validates)
- **D-10:** Extend `src/components/timeline/timeline-columns.ts` — `TimelineZoom = 'month' | 'quarter' | 'year'`
- **D-11:** Quarter/year zoom aggregates CLIENT-SIDE from month-grain read-model data (presentation concern)
- **D-12:** Week 53 of 2026 belongs to ISO year 2026; Q4-2026 aggregate must include Dec 28–31 2026 working days (Jan 1 2027 is a Swedish holiday)
- **D-13:** `zoom-controls.tsx` with URL sync (`?zoom=month|quarter|year`), default=`month`
- **D-14:** Mount zoom controls on `/pm/projects/[id]`, `/line-manager/timeline`, `/rd`, `/staff` via a small `<TimelineHeader>` wrapper (not on `/pm` home)
- **D-15:** `<TimelineGrid>` accepts a `zoom` prop; extend `CellView` with `aggregate: boolean` and `underlyingMonths?: string[]`
- **D-16:** Do NOT create a new drawer — wire existing `PlanVsActualDrawer` from Phase 37 into 4 call sites
- **D-17:** R&D drill has `personId: null` — extend `DrawerContext.personId` to `string | null` and add a `'project-person-breakdown'` mode OR sibling (planner decides)
- **D-18:** TC-UI shared-component test asserts single-source import path via grep across four timeline pages
- **D-19:** Staff/R&D cells are thin wrappers around existing `PlanVsActualCell` with `readOnly=true`; no new cell primitive
- **D-20:** New i18n keys under `v5.staff.*`, `v5.rd.*`, `v5.timeline.zoom.*`; reuse `v5.drawer.*`
- **D-21:** Test codes mapped (see Validation Architecture section below)
- **D-22:** Load-bearing gates are TC-CAL-006 and TC-UI shared drawer test

### Claude's Discretion

- `/rd/drilldown` as separate page vs modal inside `/rd` — **default: modal**
- Drawer mode extension vs sibling component — **default: extend existing**
- New `useZoom` hook vs reusing existing URL-sync hook — planner decides
- Quarter label format — **default: "KV1 2026" (sv) / "Q1 2026" (en)**
- `columnGroupShow` hierarchy vs flat columns per zoom — **default: flat**

### Deferred Ideas (OUT OF SCOPE)

- Week zoom on timeline
- Drag-to-copy (F-016)
- R&D edit capability
- Staff edit capability
- Mobile layouts for /staff, /rd
- Notifications on overcommit / proposal events for Staff/R&D
- Drill-down drawer pagination / month-picker inside drawer
- Admin register screens (Phase 43)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UX-V5-07 | Staff "My Schedule" read-only (projects × months, plan-vs-actual, summary strip) | `getStaffSchedule` reuses `aggregateByMonth` + `getPersonMonthUtilization`; `PlanVsActualCell` already supports read-only render |
| UX-V5-08 | R&D Portfolio grid + 20–30 month zoom + 53-week handling | `getPortfolioGrid` reuses `aggregateByMonth`; clone `LineManagerTimelineGrid` flat-row pattern for groupBy toggle; `getISOWeeksInYear(2026)=53` verified on disk |
| UX-V5-09 | Shared drill-down drawer across 4 personas | `PlanVsActualDrawer` + `usePlanVsActualDrawer` exist; drawer is not wired anywhere today (grep confirmed); TC-UI shared-import test enforces single source |
| UX-V5-12 | Month/quarter/year zoom + ISO 53-week handling | `buildTimelineColumns` has a literal `void zoom; // future: 'quarter' \| 'year' land in Phase 42` hook on line 14; iso-calendar helpers exist; missing `rangeQuarters`/`rangeYears` are the only calendar gap |

## Standard Stack

**No new dependencies.** Everything in Phase 42 ships with current project stack.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ag-grid-community | ^35 (in repo) | Portfolio + timeline grids | Already used in Phase 40/41; flat-row pattern proven for LM group timeline |
| next-intl | current | i18n `v5.staff.*`, `v5.rd.*`, `v5.timeline.zoom.*` | Project-wide standard; v5 no-literals eslint guard |
| TanStack Query | current | Fetch `getStaffSchedule` / `getPortfolioGrid` | Same as Phase 40/41 |
| next/navigation | 15 | `useSearchParams` + `router.replace` for zoom URL sync | Pattern already used in `change-log-feed.tsx` lines 102/129 — copy verbatim |
| zod | current | Discriminated union for scope=staff/rd in allocations route | Mirrors Phase 40/41 Query discriminated union at `allocations/route.ts:30` |

**Installation:** None required — all deps present.

## Architecture Patterns

### Recommended layout

```
src/app/(app)/
├── staff/
│   ├── page.tsx                      # S9 My Schedule (client)
│   └── __tests__/staff-schedule.test.tsx
├── rd/
│   ├── page.tsx                      # S10 Portfolio (client)
│   └── __tests__/rd-portfolio.test.tsx
src/components/timeline/
├── timeline-columns.ts               # EXTEND: quarter/year branches
├── timeline-grid.tsx                 # EXTEND: zoom prop wiring
├── zoom-controls.tsx                 # NEW
├── timeline-header.tsx               # NEW (wrapper, hosts <ZoomControls/>)
├── staff-timeline-cell.tsx           # NEW (wraps PlanVsActualCell, readOnly)
├── rd-portfolio-cell.tsx             # NEW (wraps PlanVsActualCell with aggregate)
├── staff-timeline-grid.tsx           # NEW (mirrors TimelineGrid pattern)
└── rd-portfolio-grid.tsx             # NEW (clones LineManagerTimelineGrid flat-row for project|department toggle)
src/features/planning/planning.read.ts   # EXTEND: getStaffSchedule, getPortfolioGrid
src/lib/time/iso-calendar.ts             # EXTEND: rangeQuarters, rangeYears
src/components/drawer/usePlanVsActualDrawer.tsx  # EXTEND: DrawerContext.personId: string | null + mode
src/app/api/v5/planning/allocations/route.ts     # EXTEND: scope=staff, scope=rd
```

### Pattern 1: Client-side zoom aggregation

Read-model always returns month-grain. The cell renderer receives an `aggregate: boolean`. When aggregating:

```typescript
// timeline-columns.ts (sketch)
export type TimelineZoom = 'month' | 'quarter' | 'year';

export function buildTimelineColumns(
  monthRange: string[],
  zoom: TimelineZoom = 'month',
): ColDef[] {
  if (zoom === 'month') return [personCol, ...monthCols(monthRange)];
  if (zoom === 'quarter') {
    const quarters = rangeQuarters(monthRange[0], monthRange.at(-1)!);
    return [personCol, ...quarters.map((q) => ({
      field: `q_${q.key}`,           // e.g. 'q_2026-Q4'
      headerName: formatQuarter(q.key),
      width: 160,
      cellRenderer: 'pmTimelineCellRenderer',
      cellRendererParams: {
        aggregate: true,
        underlyingMonths: q.months,  // ['2026-10','2026-11','2026-12']
      },
    }))];
  }
  // year branch analogous using rangeYears
}
```

Cell renderer sums `plannedHours` and `actualHours` over `underlyingMonths` using its row's month-keyed cells. Drill-down on an aggregated cell opens the drawer for the **first month** in the aggregate (documented UX simplification per CONTEXT deferred ideas).

### Pattern 2: Flat-row groupBy toggle (R&D portfolio)

Clone `LineManagerTimelineGrid`'s `buildLmRows` pattern verbatim but swap dimensions:
- `groupBy='project'` → rows = projects, no expand
- `groupBy='department'` → rows = departments with projects as child rows

Two separate read queries per toggle (simpler than one-query-two-views). Toggle state lives in page URL (`?group=project|department`) using the same `useSearchParams` pattern as `change-log-feed.tsx`.

### Pattern 3: Drawer wiring (UX-V5-09)

Add `<PlanVsActualDrawerProvider>` at the `(app)` layout or on each page (4 places). Every cell in PM/LM/Staff/R&D calls `usePlanVsActualDrawer().open({...})`. The TC-UI shared-import test greps all four pages for the literal:

```
from '@/components/drawer/PlanVsActualDrawer'
```

and fails if more than one import path variant exists.

### Anti-patterns to avoid

- **Building a new drawer.** CONTEXT.md D-16 is explicit.
- **Aggregating quarter/year data in the read-model.** ARCHITECTURE §1603: zoom is presentation.
- **Using `date-fns` for ISO week math.** FOUND-V5-01 forbids it — iso-calendar.ts is the only allowed source.
- **Stub persona IDs for Staff.** `persona-switcher.tsx` already has a real person picker (lines 76–95) — it works for staff. Verify, don't rebuild.
- **Creating sibling API routes.** D-08 mandates scope-branch extension.
- **ag-grid tree mode for groupBy.** Enterprise only — clone flat-row pattern from Phase 41.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ISO week / 53-week detection | Custom Date math | `getISOWeeksInYear`, `getISOWeekYear` from `iso-calendar.ts` | Phase 33 shipped correct impl with tests |
| Quarter label format | Ad-hoc string builder | i18n keys `v5.timeline.zoom.qLabel` + helper in `date-utils.ts` | Matches `formatMonthHeader` pattern |
| Person × month utilization | New aggregation | `getPersonMonthUtilization` (Phase 41) | Already dense, already approved-only |
| Daily actual drill | New drawer | `PlanVsActualDrawer` (Phase 37) | Load-bearing reuse target |
| Flat-row master/detail | ag-grid enterprise master/detail | `buildLmRows` flat-row pattern from `LineManagerTimelineGrid` | Community edition only |
| URL state sync | Hand-rolled router push | `useSearchParams` + `router.replace({scroll:false})` | Pattern at `change-log-feed.tsx:102,129` |
| Persona guard | Custom redirect | `PersonaGate` / `assertPersonaOrRedirect` | Phase 41 ships both (`persona-route-guard.ts`) |

## Common Pitfalls

### Pitfall 1: Treating week 53 as "2027 week 1"
**What goes wrong:** Summing quarter/year totals and rolling Dec 28–31 2026 into 2027.
**Why:** Postgres `EXTRACT(ISOYEAR)` is correct but JS `Date.getMonth()` is not ISO-aware.
**How to avoid:** Aggregate by calendar month (already what read-model returns); only use ISO-year routing in `rangeQuarters`/`rangeYears` helper when a month is ambiguous. For `2026-12`, `getISOWeekYear(Dec 31 2026) === 2026` (verified in `iso-calendar.ts:143-148`) — so the month stays in 2026's Q4 and year-2026 bucket. **Zero months are ambiguous** in 2026: every day of December 2026 is in ISO year 2026 except Jan 1 2027 which is a Swedish holiday.
**Warning signs:** Q4-2026 plannedHours total differs from sum of Oct+Nov+Dec 2026 cells.

### Pitfall 2: Drawer import-path drift
**What goes wrong:** Someone imports from `@/components/drawer` barrel in one page and from `@/components/drawer/PlanVsActualDrawer` in another. TC-UI shared test fails.
**How to avoid:** Decide one canonical path up front and enforce it in the test. Recommend `@/components/drawer/PlanVsActualDrawer` (direct).

### Pitfall 3: Staff persona not seeding `personId`
**What goes wrong:** `/staff` page renders before the persona switcher has picked a person → `personId=''`.
**How to avoid:** `persona-switcher.tsx:85-95` already defaults to `people[0]?.id`. Gate the `/staff` query on `persona.kind === 'staff' && persona.personId !== ''` via TanStack Query `enabled`.

### Pitfall 4: ag-grid re-rendering all columns on zoom change
**What goes wrong:** Switching zoom recomputes `columnDefs`, ag-grid does full teardown instead of animated transition.
**How to avoid:** Key the grid by `zoom` (force remount) and accept the brief flash — documented trade-off. Alternative: ag-grid `api.setColumnDefs(next)` but the flash is acceptable per ag-grid community docs.

### Pitfall 5: Drawer open on aggregated cell
**What goes wrong:** User clicks a Q4-2026 cell; drawer needs a single `monthKey`.
**How to avoid:** Documented simplification — drawer opens for first month of aggregate (CONTEXT deferred). Pass `underlyingMonths[0]`.

## Code Examples

### Extending `DrawerContext` for R&D (personId: null)

```typescript
// usePlanVsActualDrawer.tsx — proposed extension
export type DrawerMode = 'daily' | 'project-person-breakdown';

export interface DrawerContext {
  personId: string | null;   // null = R&D project drill
  projectId: string;
  monthKey: string;
  personName: string | null;
  projectName: string;
  monthLabel: string;
  mode?: DrawerMode;         // default 'daily'
}
```

The `PlanVsActualDrawer` branches on `context.mode`: `'daily'` uses existing `getDailyCellBreakdown`; `'project-person-breakdown'` calls a new server action that returns `{ personId, personName, plannedHours, actualHours }[]` for the project-month.

### URL-sync hook (copy from change-log-feed pattern)

```typescript
// hooks/use-zoom.ts
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import type { TimelineZoom } from '@/components/timeline/timeline-columns';

const VALID: TimelineZoom[] = ['month', 'quarter', 'year'];

export function useZoom(): [TimelineZoom, (z: TimelineZoom) => void] {
  const router = useRouter();
  const params = useSearchParams();
  const zoom = useMemo<TimelineZoom>(() => {
    const raw = params.get('zoom');
    return VALID.includes(raw as TimelineZoom) ? (raw as TimelineZoom) : 'month';
  }, [params]);
  const setZoom = useCallback((next: TimelineZoom) => {
    const qs = new URLSearchParams(params);
    if (next === 'month') qs.delete('zoom'); else qs.set('zoom', next);
    router.replace(qs.toString() ? `?${qs}` : '?', { scroll: false });
  }, [params, router]);
  return [zoom, setZoom];
}
```

### `rangeQuarters` sketch

```typescript
// iso-calendar.ts — new export
export function rangeQuarters(
  startMonth: string, // 'YYYY-MM'
  endMonth: string,
): Array<{ key: string; year: number; q: 1 | 2 | 3 | 4; months: string[] }> {
  // Iterate months, bin by calendar quarter (Q1=Jan-Mar, Q2=Apr-Jun, ...).
  // Rationale: the ISO-year concern is a week-level concern. Months are
  // unambiguous: every month of 2026 belongs to ISO year 2026 because no
  // month of 2026 contains Jan 4 of 2027. D-12 concretely maps week 53
  // hours via the Dec 2026 month which is already in Q4-2026.
  // Planner verifies this reasoning against TC-CAL-003 + TC-CAL-006.
}
```

## State of the Art

| Old | Current | Impact |
|-----|---------|--------|
| Phase 40 `TimelineZoom = 'month'` only | Phase 42 extends to `'month' \| 'quarter' \| 'year'` | TimelineGrid/Cell types breaking-change, all existing callers pass `'month'` explicitly or use default |
| Drawer unwired | Drawer mounted on 4 pages | New provider wrapping required |
| `DrawerContext.personId: string` | `DrawerContext.personId: string \| null` | All existing Phase 37 callers pass strings — runtime-safe widening |

## Open Questions Resolved

| # | Question | Answer |
|---|----------|--------|
| 1 | Which iso-calendar helpers exist vs missing? | **Exist:** `getISOWeek`, `getISOWeekYear`, `getISOWeeksInYear`, `isISO53WeekYear`, `workDaysInIsoWeek`, `workDaysInMonth`, `workingDaysInRange`, `countWorkingDays`, `distribute`, `isHistoricPeriod`. **Missing:** `rangeQuarters`, `rangeYears`, `formatQuarter`, `formatYear`. (Verified `src/lib/time/iso-calendar.ts` r3) |
| 2 | Does `DrawerContext` accept `personId: null`? | **No.** Current type `personId: string` (`usePlanVsActualDrawer.tsx:15`). Minimal extension: widen to `string \| null`, add optional `mode?: 'daily' \| 'project-person-breakdown'`, and widen `personName: string \| null`. Drawer component reads `context.personId!` on line 80 inside the query — must guard. |
| 3 | Is drawer wired anywhere today? | **No.** Grep for `PlanVsActualDrawer` returns only the component itself + its test. Phase 40 PM timeline does NOT import it. Phase 41 LM timeline does NOT import it. Phase 42 is the first wire-up. |
| 4 | `TimelineGrid` props — does it accept `zoom`? | **No.** Current props are `view`, `currentMonth`, `onAllocationPatch` (verified `timeline-grid.tsx:20-29`). The zoom prop is RESERVED in ARCHITECTURE §1033 but NOT implemented. Phase 42 must add `zoom?: TimelineZoom` and pass to `buildTimelineColumns`. |
| 5 | What does `buildTimelineColumns(range, zoom='quarter')` return today? | **Nothing branching — `void zoom;` on line 14.** Literal comment `// future: 'quarter' \| 'year' land in Phase 42`. Type is `TimelineZoom = 'month'` only. Phase 42 widens the type and adds two branches. Propose: month branch unchanged; quarter + year branches return `[personCol, ...aggregatedCols]` with `cellRendererParams: { aggregate: true, underlyingMonths }`. |
| 6 | Does `getProjectBurn`/`aggregateByMonth` support project-scope portfolio queries? | **Yes.** `aggregateByMonth(orgId, { projectIds, monthKeys })` returns `{ personId, projectId, monthKey, hours }[]` (`actuals.read.ts:49`). `getProjectBurn(orgId, projectId, range)` returns `{ plannedHours, actualHours }` (`actuals.read.ts:175`). Portfolio grid can call `aggregateByMonth` once with all project IDs and pivot client-side. No extension needed. |
| 7 | Is `PersonaGate` ready to reuse? | **Yes.** Both `assertPersonaOrRedirect` (pure) and `PersonaGate` (React wrapper) exported from `src/features/personas/persona-route-guard.ts` (Phase 41). Already used by `line-manager/page.tsx`. Phase 42 imports directly. |
| 8 | Is staff persona's person picker wired? | **Yes.** `persona-switcher.tsx:76-95` handles both `'pm'` and `'staff'` kinds via the same person picker (`needsPerson = persona.kind === 'pm' \|\| persona.kind === 'staff'`). `buildPersona('staff', label, personId)` constructs `{ kind: 'staff', personId, displayName }`. No rebuild needed. |
| 9 | Zoom URL-sync pattern | **Copy `change-log-feed.tsx` lines 102, 129.** Uses `useSearchParams` + `router.replace(qs ? '?' + qs : '?', { scroll: false })`. No special library — plain Next.js 15. |
| 10 | Does `getCapacityBreakdown` fit R&D overcommit drill? | **Partial.** Current signature is `scope: 'person'` only (`capacity.read.ts:158-209`) and returns per-project rows for a single person-month. R&D overcommit drill wants the INVERSE: per-person rows for a project-month (or a person-month with over-100% status). Add a `scope: 'project'` branch returning `Array<{ personId, personName, hours }>` for a project-month. Or — simpler — reuse Phase 41's person-scope breakdown and iterate; R&D overcommit drill navigates to a person's LM view, not a project's. Planner decides between "extend capacity breakdown" vs "navigate to LM view". Default recommendation: extend with `scope: 'project'` for symmetry. |
| 11 | TC-CAL test harness for Phase 33? | **Vitest + pure unit tests.** `src/lib/time/__tests__/iso-calendar.test.ts` + `formatters.test.ts` + `swedish-holidays.test.ts` + `distribute.test.ts`. No PGlite needed for calendar math. Phase 42 adds `iso-calendar.zoom.test.ts` in the same directory with the same import pattern. |
| 12 | Existing `formatQuarter`/`formatYear`? | **No.** Only `formatMonthHeader` at `src/lib/date-utils.ts:53`. Phase 42 adds `formatQuarter(key, locale)` and `formatYear(key)` in the same file. i18n keys under `v5.timeline.zoom.qLabel`. |
| 13 | Does LM flat-row pattern work for R&D project/department? | **Yes with trivial swap.** `buildLmRows` in `line-manager-timeline-grid.tsx:149-186` takes a `GroupTimelineView` shaped as `persons[]` with `projects[]` children. For R&D groupBy='department', swap to `departments[]` with `projects[]` children — same recursion depth, same row-kind discriminator pattern. For groupBy='project' just emit flat project rows without children. Namespace row IDs as `project:<id>` / `department:<id>:project:<id>` to avoid collisions. |
| 14 | ag-grid perf with 30 columns × 200 rows? | **See dedicated section "ag-grid Long-Horizon Perf Risk" below.** Short answer: acceptable with default virtualization; ARCHITECTURE §185-191 explicitly OKs "200+ columns" for ag-grid community. |
| 15 | Grep-based assertion pattern for TC-UI shared drawer test? | **Use vitest + Node `fs.readFileSync`** reading the 4 known files and asserting identical import-path substring. Example pattern from existing Phase 41 negative-assertion tests: `const src = readFileSync('src/app/(app)/staff/page.tsx', 'utf8'); expect(src).toMatch(/from ['"]@\/components\/drawer\/PlanVsActualDrawer['"]/);`. Assert all 4 files match the exact same regex. |

## Wave 0 Gaps

These MUST land before UI waves touch them, because UI waves will red-test against them:

- [ ] **`src/lib/time/iso-calendar.ts` — `rangeQuarters(startMonth, endMonth)`**
  - Returns `Array<{ key: 'YYYY-Q[1-4]', year: number, q: 1|2|3|4, months: string[] }>`
  - Uses calendar-quarter binning (Jan-Mar = Q1). ISO-year ambiguity does NOT apply at month granularity.
  - Unit test covers: 20-month range crossing year boundary, Q4-2026 includes `2026-12`
- [ ] **`src/lib/time/iso-calendar.ts` — `rangeYears(startMonth, endMonth)`**
  - Returns `Array<{ key: 'YYYY', year: number, months: string[] }>`
- [ ] **`src/lib/date-utils.ts` — `formatQuarter(key: string, locale: 'sv'|'en')` + `formatYear(key)`**
  - Or route via i18n keys `v5.timeline.zoom.qLabel` with interpolation — planner chooses
- [ ] **`src/lib/time/__tests__/iso-calendar.zoom.test.ts` — TC-CAL-003 + TC-CAL-006**
  - TC-CAL-003: `rangeQuarters('2026-01', '2027-12')` returns exactly 8 entries with correct month bins and ISO-year snap
  - TC-CAL-006: Sum of `workDaysInMonth(2026, 11)` × planned-rate should feed into Q4-2026 aggregate; property test: `sum(months) === sum(quarters) === sum(years)` for a seeded 24-month range
- [ ] **`DrawerContext` type widening + `PlanVsActualDrawer` null-personId branch**
  - Even if R&D drill lands in Wave 3, the TYPE change is needed before Staff wiring to avoid double-refactor
- [ ] **`TimelineZoom` type widen to `'month' \| 'quarter' \| 'year'`** in `timeline-columns.ts`
  - Unblocks `TimelineGrid` zoom-prop work and downstream Wave 2

**Wave 0 is pure foundation — no routes, no pages, no drawer wiring. Purely type + helper + red tests.**

## 53-Week Edge Case Verification

**Question:** Does Q4-2026 / year-2026 aggregation correctly include week 53 of 2026 working days?

**Verified facts from `src/lib/time/iso-calendar.ts`:**

1. **`getISOWeeksInYear(2026)` returns `53`** (lines 156-161). Jan 1 2026 is a Thursday → rule `jan1 === 4` triggers → returns 53. Confirmed.
2. **`getISOWeekYear(new Date(Date.UTC(2026, 11, 31)))` returns `2026`** (lines 143-148). Dec 31 2026 is a Thursday; shift to Thu of its own ISO week = itself; `target.getUTCFullYear() === 2026`. Confirmed.
3. **`workDaysInIsoWeek(2026, 53)`** (lines 87-97) spans Mon Dec 28 2026 → Fri Jan 1 2027. `workingDaysInRange` excludes Jan 1 (Swedish holiday). Returns **4 working days** (Dec 28, 29, 30, 31) — matches CONTEXT D-12.
4. **`isSwedishHoliday(new Date(2027, 0, 1))` returns `true`** — Jan 1 is `newYear` per `swedish-holidays.ts` (implied from FOUND-V5-02).

**Aggregation correctness:**

- The read-model returns month-grain data keyed by Postgres `to_char(date, 'YYYY-MM')` (confirmed `actuals.read.ts:53`). Dec 28–31 2026 all hash to `'2026-12'`.
- The planned-side allocation table keys on `allocations.month` = first day of month. `2026-12` allocations carry Dec 28–31 via the Phase 37 `distribute` largest-remainder split (ADR-010).
- Phase 42's `rangeQuarters('2026-01','2027-12')` must bin `'2026-12'` into Q4-2026 (not "Q4 ISO-2026-wk53-2027"). Since `rangeQuarters` works at **calendar month** granularity (Jan-Mar=Q1 etc.), the binning is unambiguous.
- **Year-level aggregate for 2026 includes all 12 calendar months of 2026**, thereby including the full 4 working days of Dec 28–31 2026, thereby satisfying TC-CAL-006.

**TC-CAL-006 assertion:**

```typescript
// Pseudo
const seeded = seedFullYear2026(planned=8h/day);
const byMonth = await getPortfolioGrid({...'2026-01'..'2026-12'...});
const q4 = sumMonths(byMonth, ['2026-10','2026-11','2026-12']);
const year = sumMonths(byMonth, allTwelveMonthsOf2026);
expect(year).toEqual(q4 + sumMonths(byMonth, ['2026-01'..'2026-09']));
// AND: the Dec-2026 total must include Dec 28-31 (4 working days × 8h = 32h)
expect(byMonth['2026-12']).toBeGreaterThanOrEqual(32);
```

**Zero calendar ambiguity at Phase 42 grain.** The week-53 risk lives entirely at the week-zoom layer, which is DEFERRED. Phase 42's month-grain aggregation is calendrically trivial — risk R-01 does not bite here.

## ag-grid Long-Horizon Perf Risk

**Concern:** Portfolio grid renders ~30 month columns (or up to 360 day columns deferred) × ~50-200 project/department rows.

**Verified architecture guidance:** ARCHITECTURE §185-191 (cited in CONTEXT canonical refs) explicitly accepts "200+ columns" for ag-grid community edition. Phase 40 PM timeline and Phase 41 LM timeline both use the same baseline config without perf complaints in their verification reports.

**Realistic worst case for Phase 42:**
- Staff `/staff`: 1 person × ~10 projects × 30 months = **10 rows × 31 cols**. Trivial.
- R&D `/rd` groupBy=project: ~50 projects × 30 months = **50 rows × 31 cols**. Trivial.
- R&D `/rd` groupBy=department (expanded): ~10 depts × ~5 projects each = ~60 rows × 31 cols. Trivial.
- Quarter zoom: 30 months → 10 quarters → **31 → 11 cols**. Strictly smaller, faster.
- Year zoom: 30 months → 3 years → **31 → 4 cols**. Strictly smaller.

**Conclusion:** Default ag-grid virtualization (column virtualization enabled by default in community edition) handles this comfortably. NO special config required.

**Recommendations:**
- **Do NOT set `suppressColumnVirtualisation: true`.** Leave virtualization on — grep confirmed no existing config uses suppression.
- **Do NOT paginate.** Row counts are < 500 across all v5.0 realistic scenarios.
- **Set `rowHeight: 64`** (not 100 like PM/LM) on /rd to fit more rows in viewport — cells are read-only so no inline editor needs the extra height.
- **Key the grid by zoom level** (`<AgGridReact key={zoom} ...>`) on zoom change — forces clean remount rather than animated transition, avoiding ag-grid's occasional "header row stuck on old column set" bug documented in community GitHub issues. Acceptable flash.
- **Memoize `columnDefs` and `rowData`** — already the pattern in `timeline-grid.tsx:64,66` and `line-manager-timeline-grid.tsx:205,210`. Copy verbatim.
- **Do NOT enable ag-grid tree data or master/detail** — enterprise only. Flat-row pattern is mandatory.

**Monitoring:** If a client organization exceeds 500 projects the portfolio grid may need row virtualization tuning, but that is a post-v5.0 polish concern. Document as a known scalability ceiling.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (unit + RTL) + PGlite (integration) |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `pnpm vitest run <path>` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map

| Req ID | Test Code | Behavior | Type | Command | File |
|--------|-----------|----------|------|---------|------|
| UX-V5-07 | TC-PSN staff scope | Staff persona on `/staff` sees read-only schedule; other personas see gate hint | RTL | `pnpm vitest run src/app/\(app\)/staff/__tests__/staff-schedule.test.tsx` | ❌ Wave 0 |
| UX-V5-07 | TC-UI read-only gating | PlanVsActualCell rendered with `readOnly=true` — no edit handlers fire on click | RTL | same file | ❌ Wave 0 |
| UX-V5-08 | TC-PSN-006 | R&D persona on `/rd` allowed; PM on `/rd` shows gate hint | RTL | `pnpm vitest run src/features/personas/__tests__/persona.scope.test.ts` | ✅ extend existing |
| UX-V5-08 | TC-API-001 | `GET /api/v5/planning/allocations?scope=rd&...` returns portfolio shape; `scope=staff` returns schedule shape; invalid scope → zod error | unit | `pnpm vitest run src/app/api/v5/planning/allocations/__tests__/scope.contract.test.ts` | ❌ Wave 0 |
| UX-V5-12 | TC-ZOOM-001 | `buildTimelineColumns(range, 'quarter')` produces correct column count | unit | `pnpm vitest run src/components/timeline/__tests__/timeline-columns.zoom.test.ts` | ❌ Wave 0 |
| UX-V5-12 | TC-ZOOM-002 | `buildTimelineColumns(range, 'year')` produces correct column count | unit | same file | ❌ Wave 0 |
| UX-V5-12 | TC-ZOOM-003 | `<TimelineGrid zoom='quarter'>` re-renders with aggregated cells | RTL | `pnpm vitest run src/components/timeline/__tests__/TimelineGrid.zoom.test.tsx` | ❌ Wave 0 |
| UX-V5-12 | TC-ZOOM-004 | `useZoom()` reads/writes `?zoom=...` URL param | RTL | `pnpm vitest run src/components/timeline/__tests__/zoom-controls.test.tsx` | ❌ Wave 0 |
| UX-V5-12 | TC-CAL-003 | `rangeQuarters` snaps on calendar-quarter boundary across year transitions | unit | `pnpm vitest run src/lib/time/__tests__/iso-calendar.zoom.test.ts` | ❌ Wave 0 |
| UX-V5-12 | TC-CAL-006 | Year-2026 aggregate includes Dec 28-31 2026 working-day hours (4 days × rate) | unit | same file | ❌ Wave 0 |
| UX-V5-09 | TC-UI shared drawer | All 4 timeline pages import PlanVsActualDrawer from identical path | unit | `pnpm vitest run src/components/drawer/__tests__/shared-import.test.ts` | ❌ Wave 0 |
| UX-V5-09 | drawer wiring | Clicking a cell on PM/LM/Staff/R&D opens the drawer | RTL | 4 page test files | ❌ Wave 0 |
| UX-V5-07 | TC-E2E-3A | Staff read-only happy path: set persona → navigate /staff → cell click → drawer opens | PGlite+RTL | `pnpm vitest run src/features/planning/__tests__/staff.e2e.test.ts` | ❌ Wave 0 |
| UX-V5-08 | TC-E2E-4A | R&D portfolio happy path: groupBy toggle → zoom change → cell click → drawer opens with personId=null breakdown | PGlite+RTL | `pnpm vitest run src/features/planning/__tests__/rd.e2e.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run <path-to-touched-test>` (< 30s)
- **Per wave merge:** `pnpm vitest run src/lib/time src/components/timeline src/components/drawer src/features/planning src/app/\(app\)/staff src/app/\(app\)/rd src/app/api/v5/planning`
- **Phase gate:** `pnpm vitest run` (full suite) green before `/gsd:verify-work`

### Wave 0 Gaps (test files to create)

- [ ] `src/lib/time/__tests__/iso-calendar.zoom.test.ts` — TC-CAL-003, TC-CAL-006
- [ ] `src/components/timeline/__tests__/timeline-columns.zoom.test.ts` — TC-ZOOM-001/002
- [ ] `src/components/timeline/__tests__/TimelineGrid.zoom.test.tsx` — TC-ZOOM-003
- [ ] `src/components/timeline/__tests__/zoom-controls.test.tsx` — TC-ZOOM-004
- [ ] `src/components/drawer/__tests__/shared-import.test.ts` — TC-UI shared drawer
- [ ] `src/app/(app)/staff/__tests__/staff-schedule.test.tsx` — TC-PSN staff + read-only gating
- [ ] `src/app/(app)/rd/__tests__/rd-portfolio.test.tsx` — UX-V5-08 component test
- [ ] `src/features/planning/__tests__/staff.e2e.test.ts` — TC-E2E-3A
- [ ] `src/features/planning/__tests__/rd.e2e.test.ts` — TC-E2E-4A
- [ ] Extend `src/app/api/v5/planning/allocations/__tests__/scope.contract.test.ts` with staff/rd scope branches (create file if it does not exist)
- [ ] Extend `src/features/personas/__tests__/persona.scope.test.ts` with staff+rd kinds

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | dev+test | ✓ (in repo) | per package.json | — |
| pnpm | test runner | ✓ | current | — |
| vitest | all tests | ✓ | current | — |
| ag-grid-community | timeline grids | ✓ | ^35 | — |
| PGlite | E2E tests | ✓ (Phase 37+) | current | — |
| next-intl | i18n | ✓ | current | — |

No new external dependencies. Everything required is already installed.

## Project Constraints (from CLAUDE.md)

**CLAUDE.md does not exist at repo root.** No project-level directives to honor beyond the CONTEXT.md locked decisions and the existing file-level ESLint guards (v5 no-literals, no-direct-mutation-without-change-log, date-fns week API ban per FOUND-V5-01).

## Sources

### Primary (HIGH confidence — verified on disk)
- `src/lib/time/iso-calendar.ts` — calendar helpers inventory (r3)
- `src/components/timeline/timeline-columns.ts` — `void zoom; // future: ... Phase 42` hook confirmed line 14 (r4)
- `src/components/timeline/timeline-grid.tsx` — `TimelineGridProps` shape, no zoom prop today (r5)
- `src/components/drawer/PlanVsActualDrawer.tsx` — drawer component implementation (r6)
- `src/components/drawer/usePlanVsActualDrawer.tsx` — `DrawerContext` type (r7)
- `src/app/api/v5/planning/allocations/route.ts` — scope discriminated union pattern (r8)
- `src/features/planning/planning.read.ts` — Phase 40/41 helpers live here (r9)
- `src/features/actuals/actuals.read.ts` — `aggregateByMonth`, `getProjectBurn`, `getDailyRows` (r10)
- `src/features/capacity/capacity.read.ts` — `getPersonMonthUtilization`, `getCapacityBreakdown` (r11)
- `src/components/timeline/line-manager-timeline-grid.tsx` — flat-row pattern (r12)
- `src/features/personas/persona.context.tsx` — PersonaProvider + persona-scoped query invalidation (r13)
- `src/features/personas/persona-route-guard.ts` — `assertPersonaOrRedirect` + `PersonaGate` confirmed exported (r16)
- `src/components/persona/persona-switcher.tsx` — staff person picker already wired at lines 76-95 (r17)
- Grep of `PlanVsActualDrawer` imports — confirmed drawer not yet wired to any page (r15)
- Grep of `useSearchParams`/`router.replace` in change-log-feed — pattern at lines 102, 129 (r18)

### Secondary (MEDIUM — CONTEXT.md + ARCHITECTURE references, not independently verified)
- ARCHITECTURE §585-589 contracts for `getStaffSchedule`/`getPortfolioGrid`
- ARCHITECTURE §185-191 ag-grid community 200+ column acceptance
- ARCHITECTURE §1603 read-model-unchanged zoom principle

### Tertiary (LOW — not needed, trivial Phase 42)
- None. All guidance is verified against on-disk code or frozen architecture.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, all verified on disk
- Architecture: HIGH — reuse targets all exist and were read
- Pitfalls: HIGH — week-53 math independently re-verified against `iso-calendar.ts` source
- ag-grid perf: MEDIUM — ARCHITECTURE §185-191 accepts 200+ cols but Phase 42 realistic max is ~60 rows × 31 cols so not stressed

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable; no fast-moving libs involved)
