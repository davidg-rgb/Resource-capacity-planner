# Phase 42: Persona views Part 3 — Staff, R&D, drill-down, long-horizon zoom — Context

**Gathered:** 2026-04-08
**Status:** Ready for research / planning
**Mode:** `--auto` (recommended defaults selected by Claude; review and override before planning if needed)

<domain>
## Phase Boundary

Final persona-view phase. Ships the remaining three persona surfaces (Staff, R&D), the shared drill-down drawer integration across all four personas, and the long-horizon zoom on the timeline grid.

In scope:
- **Staff "My Schedule"** (`/staff`) — read-only projects × months grid with plan-vs-actual split + month summary strip (UX-V5-07 / S9).
- **R&D Portfolio grid** (`/rd`) — projects × months aggregate (or departments × months, toggleable), read across all projects, drill-into-PM-view, with long-horizon zoom 20–30 months forward (UX-V5-08 / S10).
- **Long-horizon zoom** — month / quarter / year zoom controls on the timeline-grid wrapper, ISO-8601 53-week handling (week 53 of 2026 gets its own column), quarter aggregation snaps on ISO-year boundary (UX-V5-12 / TC-ZOOM-*, TC-CAL-003, TC-CAL-006).
- **Shared drill-down drawer integration** — the existing `PlanVsActualDrawer` (Phase 37, `src/components/drawer/PlanVsActualDrawer.tsx`) is wired into PM timeline, LM group timeline, Staff schedule, and R&D portfolio via `onCellClick` — one component, four call sites (UX-V5-09 / S11).
- Required new read-model helpers: `planning.read.getStaffSchedule`, `planning.read.getPortfolioGrid` (matches ARCHITECTURE §585-589).
- Extend `buildTimelineColumns(range, zoom)` to actually handle `quarter` and `year` zoom levels. Phase 40 shipped the function with a `zoom` param and a comment "future: quarter/year land in Phase 42" — that hook is exactly where this phase plugs in.
- New `components/timeline/zoom-controls.tsx` with a 3-button toggle.

Out of scope (deferred):
- R&D write capability — explicitly read-only in v5.0 per ADR §85.
- Staff write capability — read-only by design.
- Admin register maintenance screens — Phase 43.
- Counter-proposal / notifications — still out.
- Mobile layouts for /staff, /rd — desktop-only per TC-MOBILE-001 pattern.
- Drag-to-copy on cells (F-016) — post-v5.0 polish.

</domain>

<decisions>
## Implementation Decisions

### Routes & file layout (matches ARCHITECTURE §321-326)
- **D-01:** Create:
  - `src/app/(app)/staff/page.tsx` — My Schedule (S9)
  - `src/app/(app)/rd/page.tsx` — Portfolio grid (S10)
  - `src/app/(app)/rd/drilldown/page.tsx` — Overcommit drill (Journey 4B); MAY be deferred to a small follow-up if it bloats the plan — planner decides (see Claude's Discretion).
- **D-02:** No new route groups — both live under the existing `(app)` shell, wrapped by the already-mounted PersonaProvider + PersonaGate (reuse from Phase 41 route guard).
- **D-03:** Persona route guards (from Phase 41 `assertPersonaOrRedirect` helper):
  - `/staff` — allowed: `['staff', 'admin', 'rd']`
  - `/rd` — allowed: `['rd', 'admin']`
  Non-matching personas see a "switch persona" hint card, matching the Phase 41 pattern.

### Read-model extensions (reuse existing `planning.read.ts`)
- **D-04:** Add TWO helpers to `src/features/planning/planning.read.ts`:
  ```
  getStaffSchedule({ orgId, personId, monthRange }):
    Promise<{ projects: Array<{ projectId, projectName, months: Record<monthKey, CellView> }>, summaryStrip: Record<monthKey, { plannedHours, actualHours, utilizationPct }> }>
  getPortfolioGrid({ orgId, monthRange, groupBy: 'project' | 'department' }):
    Promise<{ rows: Array<{ id, label, meta, months: Record<monthKey, { plannedHours, actualHours }> }> }>
  ```
- **D-05:** Both helpers sum APPROVED allocations only (ADR-001 two-table model; pending proposals do not affect read views) — same rule as Phase 41 D-07.
- **D-06:** Staff schedule's `summaryStrip` uses `getPersonMonthUtilization` from Phase 41 `features/capacity/capacity.read.ts` — reuse, don't duplicate. One call per month range.
- **D-07:** Portfolio grid reuses `features/actuals/actuals.read.ts#aggregateByMonth` to compute the actual totals per project/dept per month.

### API routes
- **D-08:** Extend the existing `src/app/api/v5/planning/allocations/route.ts` GET handler (Phase 40 + Phase 41 both live there) with TWO more scope branches:
  - `scope=staff&personId=...&startMonth=...&endMonth=...` → `getStaffSchedule`
  - `scope=rd&groupBy=project|department&startMonth=...&endMonth=...` → `getPortfolioGrid`
  Do NOT create sibling route files — mirror the `scope=pm` / `scope=line-manager` branch pattern already there.
- **D-09:** No new capacity / change-log routes needed — Staff uses capacity.read; R&D overcommit drill reuses Phase 41's `getCapacityBreakdown` via `GET /api/v5/capacity?breakdown=...` or a new `GET /api/v5/capacity/breakdown` route. Default: add a `breakdown` mode to the existing capacity route rather than a sibling. Planner validates.

### Long-horizon zoom (the load-bearing piece)
- **D-10:** Extend `src/components/timeline/timeline-columns.ts`:
  ```
  export type TimelineZoom = 'month' | 'quarter' | 'year';
  buildTimelineColumns(monthRange: string[], zoom: TimelineZoom = 'month'): ColDef[]
  ```
  - `month` — unchanged (current Phase 40 behavior).
  - `quarter` — columns are `YYYY-Q[1-4]` aggregating 3 months each, using **ISO year boundaries** per ARCHITECTURE §112. A month that crosses an ISO-year boundary (only week 53 of 2026 scenario) is assigned to whichever ISO year owns its majority of working days. Planner validates with `lib/time/iso-calendar.ts` helpers.
  - `year` — columns are `YYYY` aggregating 12 months each; use ISO years.
- **D-11:** Quarter/year column rendering aggregates cell values CLIENT-SIDE by summing the month-grain data returned from the read model. The read model always returns month-grain data; zoom is a presentation concern. This keeps the read model simple and matches ARCHITECTURE §1603 ("read-model unchanged; UI aggregates client-side via actuals.read helpers").
- **D-12:** **Week 53 of 2026 handling:** Quarter and year views must treat week 53 as a distinct ISO week belonging to ISO year 2026 (not rolled into ISO year 2027). The existing `iso-calendar.ts#getISOWeeksInYear(2026)` returns `53` — planner verifies. TC-CAL-006 specifically asserts that week 53 of 2026 renders as its own column in **week-zoom** views (if the phase chooses to add week zoom) OR that the year-2026 aggregate includes week 53's hours (if only quarter/year zoom ships).
  Phase 42 ships **month / quarter / year** zoom only — NOT week zoom. Week zoom is deferred. TC-CAL-006 is validated via the quarter-aggregation test: Q4-2026 must include week-53 working days (Dec 28–31 2026, which is 4 days since Jan 1 2027 is a Swedish holiday) in its `plannedHours` totals.
- **D-13:** New `src/components/timeline/zoom-controls.tsx` — three-button toggle (Månad / Kvartal / År) wired via a `useZoom()` hook that stores the choice in URL query string (`?zoom=month|quarter|year`) so refresh preserves it. Default = `month`.
- **D-14:** Zoom controls surface on /pm/projects/[id], /line-manager/timeline, /rd, and /staff timelines. NOT on /pm (PM Home overview card). Phase 42 must mount the controls in all four timeline pages without rewriting the existing pages — planner uses a small `<TimelineHeader>` wrapper component.
- **D-15:** `<TimelineGrid>` accepts the new `zoom` prop (already spec'd in ARCHITECTURE §1033) and passes it to `buildTimelineColumns`. When zoom changes, the grid re-renders with aggregated cells. Existing cell renderers (`PmTimelineCell`, `LmTimelineCell`, new `StaffTimelineCell`, `RdPortfolioCell`) must accept an aggregated `CellView` shape — which means Phase 42 extends the `CellView` type with an `aggregate: boolean` flag and an `underlyingMonths?: string[]` list so the cell can decide how to render.

### Drill-down drawer integration (UX-V5-09)
- **D-16:** The `PlanVsActualDrawer` component already exists at `src/components/drawer/PlanVsActualDrawer.tsx` (Phase 37, ACT-04). Phase 42 does NOT create a new drawer — it wires the existing one into four call sites:
  1. PM project timeline (`/pm/projects/[projectId]`) — already wired? planner verifies; if not, wire it
  2. LM group timeline (`/line-manager/timeline`) — wire via `onCellClick`
  3. Staff schedule (`/staff`) — wire via `onCellClick`
  4. R&D portfolio (`/rd`) — wire via `onCellClick` on project rows (context = { personId: null, projectId, monthKey })
- **D-17:** The R&D drill is a "project drill" not a "person-project drill" — context has `personId: null`. Extend `DrawerContext` to accept `personId: string | null`; when null, the drawer shows per-person rows for that project-month instead of per-day rows. This is a new drawer view mode: `'daily'` (original) vs `'project-person-breakdown'` (new). Planner decides whether to extend the existing drawer or add a thin sibling component.
- **D-18:** **TC-UI shared component test** asserts the drawer is imported from the SAME source file in all four call sites (grep-verifiable). This is the "single source of truth" check that makes UX-V5-09 meaningful.

### Cell renderer reuse (matches ACT-03)
- **D-19:** The existing `PlanVsActualCell` (Phase 37) is the shared cell for plan/actual/delta rendering. Staff and R&D cells are thin wrappers that pass `readOnly=true` (no edit gate invoked). NO new cell primitive — just two thin wrapper components under `src/components/timeline/`:
  - `staff-timeline-cell.tsx` — reads `CellView`, renders via `PlanVsActualCell` in read-only mode
  - `rd-portfolio-cell.tsx` — reads `CellView` with aggregation, renders via `PlanVsActualCell` in read-only mode

### i18n
- **D-20:** New keys under `v5.staff.*` and `v5.rd.*` in `src/messages/sv.json` + `en.json` + `keys.ts`. Zoom controls use `v5.timeline.zoom.{month,quarter,year}`. Reuse existing `v5.drawer.*` keys (Phase 37 drawer is already i18n'd).

### Tests (mapping to roadmap success criteria)
- **D-21:** Test codes:
  - **TC-PSN staff scope** + TC-UI read-only gating — `src/features/personas/__tests__/persona.scope.test.ts` (extend existing) + `src/app/(app)/staff/__tests__/staff-schedule.test.tsx`
  - **TC-PSN-006** R&D portfolio scope — `src/features/personas/__tests__/persona.scope.test.ts` (extend)
  - **TC-API-001** allocations route scope=rd/scope=staff contract — extend `src/app/api/v5/planning/allocations/__tests__/scope.contract.test.ts` (or create; planner verifies)
  - **TC-ZOOM-*** — `src/components/timeline/__tests__/timeline-columns.zoom.test.ts` (unit: buildTimelineColumns for quarter/year) + `src/components/timeline/__tests__/TimelineGrid.zoom.test.tsx` (RTL: switching zoom re-aggregates)
  - **TC-CAL-003** (quarter snaps on ISO year boundary) + **TC-CAL-006** (week 53 2026 handling in aggregation) — `src/lib/time/__tests__/iso-calendar.zoom.test.ts`
  - **TC-UI shared drawer test** — `src/components/drawer/__tests__/shared-import.test.ts` — greps all four timeline pages to assert the import path is identical
  - **TC-E2E-3A** Staff journey — `src/features/planning/__tests__/staff.e2e.test.ts` (PGlite + RTL, read-only happy path)
  - **TC-E2E-4A** R&D portfolio journey — `src/features/planning/__tests__/rd.e2e.test.ts`
- **D-22:** The load-bearing gates are TC-CAL-006 (week 53 correctness) and TC-UI shared drawer test (single source of truth).

### Claude's Discretion
- Whether `/rd/drilldown` lands in this phase or is folded into the existing `/rd` page via a modal. Default = modal (less scope, less file surface).
- Whether to extend the drawer with a `mode` prop or add a sibling `ProjectPersonBreakdownDrawer`. Default = extend.
- URL-sync hook for zoom state — new hook or reuse an existing one if present.
- Exact quarter column label format ("Q1 2026" vs "2026-Q1" vs "KV1 2026" for Swedish). Default = "KV1 2026" (Swedish) / "Q1 2026" (English) via i18n.
- Whether buildTimelineColumns returns ag-grid `columnGroupShow` for hierarchical zoom (e.g., year column expands to quarters expands to months) or flat columns per zoom level. Default = flat per zoom level (simpler; matches the 3-button toggle UX).

### Folded Todos
None — no pending todos matched Phase 42.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & ADRs
- `.planning/v5.0-ARCHITECTURE.md`
  - §61-62 (F-009 Staff, F-010 R&D features)
  - §75-76 (F-023 53-week, F-024 zoom levels)
  - §85 (R&D read-only in v5.0)
  - §112 (53-week handling + quarter ISO-year snap)
  - §164-169 (ADR-005 centralized ISO calendar)
  - §185-191 (ADR — ag-grid community wrapper; long-horizon 200+ columns acceptable)
  - §321-326 (route layout staff/, rd/, rd/drilldown/)
  - §345 (actuals/daily GET for drill-down)
  - §404-409 (timeline-columns + zoom-controls + drill-down-drawer files)
  - §455-494 (iso-calendar helper signatures — weeksInIsoYear, enumerateIsoWeeks, workDaysInIsoWeek)
  - §585-589 (planning.read.getStaffSchedule + getPortfolioGrid contracts)
  - §1025-1044 (TimelineGrid props — includes zoom + onCellClick)
  - §1045-1090 (plan-actual-cell render states — read-only works out of the box)
  - §1091-1105 (drill-down-drawer component contract)
  - §1289-1296 (planning/allocations GET scope param)
  - §1591-1613 (Journey 4A — R&D portfolio data flow including zoom re-render)
  - §1772 (R-01 53-week mishandling risk mitigation)
  - §2124+ (TC-PSN, TC-ZOOM, TC-CAL, TC-E2E test catalog)

### Requirements
- `.planning/REQUIREMENTS.md`
  - L59 UX-V5-07 — Staff My Schedule read-only
  - L60 UX-V5-08 — R&D Portfolio + long-horizon zoom + 53-week handling
  - L61 UX-V5-09 — Shared drill-down drawer
  - L64 UX-V5-12 — Zoom levels + ISO 53-week year

### Roadmap
- `.planning/ROADMAP.md` §193-203 — Phase 42 goal, deps, 4 success criteria, test codes

### Prior phase context
- `.planning/phases/40-persona-views-part-1-pm/40-CONTEXT.md` — TimelineGrid, buildTimelineColumns (month zoom only), persona-aware cell
- `.planning/phases/41-persona-views-part-2-line-manager/41-CONTEXT.md` — LM timeline flat-row model (Phase 42 may reuse pattern for R&D portfolio group-by toggle), capacity.read, PersonaGate
- `.planning/phases/37-actuals-layer-services-distribution-plan-vs-actual-cell/` — PlanVsActualCell + PlanVsActualDrawer

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (confirmed on disk)
- `src/components/drawer/PlanVsActualDrawer.tsx` + `usePlanVsActualDrawer.tsx` — Phase 37 drill-down drawer. Already i18n'd, already TanStack-Query backed via `getDailyCellBreakdown` server action. The load-bearing reuse target for UX-V5-09.
- `src/components/timeline/PlanVsActualCell.tsx` — Phase 37 shared cell; renders plan/actual/delta with color rules; readonly out of the box.
- `src/components/timeline/timeline-grid.tsx` + `timeline-columns.ts` — Phase 40 primitive. `timeline-columns.ts` line 13 has a literal `void zoom; // future: 'quarter' | 'year' land in Phase 42` comment. Phase 42 fills the gap.
- `src/components/timeline/line-manager-timeline-grid.tsx` — Phase 41 flat-row pattern that R&D portfolio grid can mirror for the project/department toggle.
- `src/features/planning/planning.read.ts` — Phase 40/41 file; add `getStaffSchedule` + `getPortfolioGrid` here.
- `src/app/api/v5/planning/allocations/route.ts` — Phase 40/41 GET handler with `scope=pm|line-manager` branches; extend with `scope=staff|rd`.
- `src/features/capacity/capacity.read.ts` — Phase 41 module; `getPersonMonthUtilization` reused for Staff summary strip; `getCapacityBreakdown` reused for R&D overcommit drill.
- `src/features/actuals/actuals.read.ts` — `getDailyRows`, `aggregateByMonth`, `getProjectBurn` already exist (Phase 37); reused for portfolio aggregation.
- `src/lib/time/iso-calendar.ts` — `getISOWeeksInYear`, `isISO53WeekYear`, `workDaysInIsoWeek`, `workingDaysInRange`, `workDaysInMonth` all exist (Phase 33 output). Week 53 helpers ARE already there — Phase 42 uses them, not rebuilds them.
- `src/features/personas/persona.context.tsx` + persona route guard helper — Phase 41; used for /staff and /rd guards.

### Missing helpers (Phase 42 must add)
- `src/lib/time/iso-calendar.ts` — `rangeQuarters(startMonth, endMonth): string[]` and `rangeYears(...)` — quarter/year boundary enumerators with ISO-year semantics. Must use existing `getISOWeekYear` / `isISO53WeekYear` internally.
- `src/components/timeline/zoom-controls.tsx` — does not exist
- `src/app/(app)/staff/` — directory does not exist
- `src/app/(app)/rd/` — directory does not exist
- `src/components/timeline/staff-timeline-cell.tsx` — does not exist
- `src/components/timeline/rd-portfolio-cell.tsx` — does not exist

### Established Patterns
- Route-group `(app)` for authenticated shells.
- `'use client'` pages with `useParams` + TanStack Query.
- i18n via `useTranslations('v5.<namespace>')`.
- API routes under `src/app/api/v5/**` return AppError.
- PGlite + vitest for DB integration tests; RTL for component tests.

### Integration Points
- `<TimelineGrid>` already accepts a `zoom` prop slot (Phase 40 reserved it). Phase 42 wires it through.
- PersonaSwitcher stub from Phase 40-03 — Phase 41 wired the department dropdown for LM; Phase 42 should verify that switching to `staff` persona picks a `personId` (currently probably stubbed to `'stub-staff'` or similar). Wire a real person picker if missing.
- ZoomControls URL sync — Next.js `useSearchParams` + `router.replace` (same pattern used by change-log-feed in Phase 41).

### Known gaps (must be created by Phase 42)
- `/staff/page.tsx`, `/rd/page.tsx`, optionally `/rd/drilldown/page.tsx`
- `planning.read.getStaffSchedule`, `planning.read.getPortfolioGrid`
- `scope=staff` + `scope=rd` branches in allocations route
- `timeline-columns.ts` quarter/year zoom implementation
- `zoom-controls.tsx` + `useZoom` URL-sync hook
- `iso-calendar.ts` quarter/year range helpers
- Drill-down drawer integration on PM/LM/Staff/R&D timelines (if not yet wired)
- Drawer project-person-breakdown mode (for R&D drill which has `personId: null`)
- Staff + R&D cell wrappers

</code_context>

<specifics>
## Specific Ideas

- **Don't rebuild the drawer.** UX-V5-09 is fundamentally a "wire what exists" phase, not a "build a drawer" phase. The TC-UI shared-component test literally asserts the import path matches across four pages.
- **Zoom is a presentation concern, not a read-model concern.** Always fetch month-grain data; aggregate in the column builder / cell renderer. This matches ARCHITECTURE §1603.
- **Week 53 of 2026 is the highest-risk calendrical edge case.** Phase 33 already laid the iso-calendar foundation and has tests for `getISOWeeksInYear(2026) === 53`. Phase 42's responsibility is to make sure quarter/year aggregation correctly bins week 53's working days (Dec 28–31 2026, 4 working days) into Q4-2026 / year-2026, NOT into 2027. Add a property-based test that sums every day in a 20-month range at month grain, then aggregates to quarter and year, and asserts the totals match.
- **R&D portfolio groupBy toggle can reuse the Phase 41 flat-row pattern.** Projects become "person rows" and per-department sub-rows become "project child rows" in the flat model. Or build two separate queries and swap rows on toggle — simpler.
- **Staff "My Schedule" is the smallest surface** — read-only cell rendering + summary strip + one query. Start with this in Wave 1 to de-risk routing/guard pieces before tackling zoom.
- **R&D drill-down drawer has `personId: null`** — this is the only place where the existing drawer's "single person-project-month" contract doesn't fit. Plan the extension carefully; consider whether a second drawer mode is cleaner than overloading the existing one.

</specifics>

<deferred>
## Deferred Ideas

- **Week zoom** on the timeline. Not in UX-V5-12 explicitly — month/quarter/year only. Week zoom would require a separate aggregation level and is post-v5.0 polish.
- **Drag-to-copy on cells** (F-016) — not in Phase 42 scope.
- **R&D edit capability** — explicitly out in v5.0 (ADR §85).
- **Staff edit capability** — explicitly out.
- **Mobile layouts for /staff, /rd** — desktop-only interstitial per Phase 41 TC-MOBILE-001 pattern.
- **Notifications on overcommit or proposal events for Staff/R&D.**
- **Drill-down drawer pagination / infinite scroll** — current drawer shows one month; zoom levels showing multiple months don't expand the drawer. If a user clicks a Q4-2026 cell, the drawer opens for the first month in that quarter (Oct 2026). This is a known UX simplification; follow-up could add a month-picker inside the drawer.
- **Admin register screens** — Phase 43.

### Reviewed Todos (not folded)
None — no todos matched Phase 42.

</deferred>

---

*Phase: 42-persona-views-part-3-staff-rd-drilldown-zoom*
*Context gathered: 2026-04-08*
