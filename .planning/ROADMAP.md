# Nordic Capacity -- Roadmap

## Milestones

- **v1.0 MVP** -- Phases 1-10 (shipped 2026-03-27) | [Archive](milestones/v1.0-ROADMAP.md)
- **v2.0 Visibility & Insights** -- Phases 11-17 (shipped 2026-03-28) | [Archive](v2.0-ROADMAP.md)
- **v3.0 Switch from Excel** -- Phases 18-22 (shipped 2026-03-30)
- **v4.0 Dashboard Visualizations & Customization** -- Phases 23-32 (shipped 2026-04-01)
- **v5.0 Plan vs Actual + Approval Workflow** -- Phases 33-45 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-10) -- SHIPPED 2026-03-27</summary>

- [x] Phase 1: Project Scaffolding & Dev Environment (1/1 plans)
- [x] Phase 2: Database Schema & Tenant Isolation (2/2 plans)
- [x] Phase 3: Authentication & App Shell (4/4 plans)
- [x] Phase 4: Person & Project CRUD (2/2 plans)
- [x] Phase 5: Reference Data Admin (2/2 plans)
- [x] Phase 6: AG Grid Spike & Core Grid (2/2 plans)
- [x] Phase 7: Grid Polish & Navigation (3/3 plans)
- [x] Phase 8: Import Wizard (4/4 plans)
- [x] Phase 9: Flat Table View & Export (2/2 plans)
- [x] Phase 10: Platform Admin (4/4 plans)

</details>

<details>
<summary>v2.0 Visibility & Insights (Phases 11-17) -- SHIPPED 2026-03-28</summary>

- [x] Phase 11: Infrastructure & Feature Flags
- [x] Phase 12: Team Overview Heat Map
- [x] Phase 13: Dashboard & Charts
- [x] Phase 14: Alerts & Project View
- [x] Phase 15: PDF Export
- [x] Phase 16: Onboarding & Announcements
- [x] Phase 17: Platform Operations

</details>

<details>
<summary>v3.0 Switch from Excel (Phases 18-22) -- SHIPPED 2026-03-30</summary>

- [x] Phase 18: Role-Based Landing Experience
- [x] Phase 19: Self-Explanatory Navigation
- [x] Phase 20: Heat Map as Hero
- [x] Phase 21: Import-to-Value Flow
- [ ] Phase 22: Swedish Localization (stretch — deferred)

</details>

<details>
<summary>v4.0 Dashboard Visualizations & Customization (Phases 23-32) -- SHIPPED 2026-04-01</summary>

- [x] Phases 23-32: 13 widget specs + custom dashboards + scenarios

</details>

### v5.0 Plan vs Actual + Approval Workflow

- [x] **Phase 33: Foundations — ISO calendar + Swedish holidays** — Centralized ISO 8601 / 53-week math and Swedish holiday helpers (completed 2026-04-07)
- [x] **Phase 34: Foundations — Personas, i18n catalog, historic-edit helper** — Role switcher context, empty SV/EN key catalog, server-now month helper
 (completed 2026-04-07)
- [x] **Phase 35: Foundations — Universal change_log infrastructure** — `change_log` table + `recordChange` + eslint rule + codegen manifest + runtime invariant test
 (completed 2026-04-07)
- [x] **Phase 36: Data model — v5.0 schema migrations** — Four new tables and the only existing-table mutation (`projects.lead_pm_person_id`)
 (completed 2026-04-07)
- [x] **Phase 37: Actuals layer — services, distribution, plan-vs-actual cell** — Day-grain actuals with largest-remainder distribution and the reusable comparison cell
 (completed 2026-04-07)
- [x] **Phase 38: Excel import pipeline** — SheetJS parsers, two-stage parse→preview→commit, idempotency, rollback, supersession, template
 (completed 2026-04-07)
- [ ] **Phase 39: Proposal / approval workflow** — Allocation proposals state machine, routing, approve/reject/resubmit lifecycle
- [x] **Phase 40: Persona views Part 1 — PM** — PM Home, PM project timeline, My Wishes panel, historic-edit dialog
 (completed 2026-04-08)
- [ ] **Phase 41: Persona views Part 2 — Line Manager** — Line Mgr Home heatmap, group timeline, approval queue, change log feed
- [ ] **Phase 42: Persona views Part 3 — Staff, R&D, drill-down, long-horizon zoom** — Staff schedule, R&D portfolio, shared drill-down drawer, zoom levels
- [ ] **Phase 43: Admin register maintenance** — Self-service CRUD with archive, dependent-row blocking, change-log feed landing
- [ ] **Phase 44: API hardening + test contract fill** — Every TC-* assertion from §15 has a passing automated test; AppError taxonomy coverage
- [ ] **Phase 45: Launch gate — PDF export bug fix** — Swap html2canvas for html-to-image / modern-screenshot (LAUNCH-01); blocks v5.0 launch

## Phase Details

> v1.0–v4.0 phase details archived. See `milestones/` and `v2.0-ROADMAP.md` / `v3.0-ROADMAP.md` / `v4.0-ROADMAP.md`.

### Phase 33: Foundations — ISO calendar + Swedish holidays
**Goal**: Provide a single, tested ISO 8601 / 53-week calendar utility (with Swedish holidays 2026–2030) that every other v5.0 module depends on.
**Depends on**: Nothing (first v5.0 phase)
**Requirements**: FOUND-V5-01, FOUND-V5-02
**Success Criteria** (what must be TRUE):
  1. `lib/time/iso-calendar.ts` exposes `isoWeek`, `weeksInIsoYear`, `rangeWeeks`, `rangeMonths`, `workDaysInIsoWeek`, `workDaysInMonth`, `monthKey`, `quarterKey`, `parseIsoDate`, `formatWeekLabel`, `isHistoricPeriod` and round-trips ISO dates 2020–2030 (verified by **TC-CAL-001..021**)
  2. 2026 is correctly detected as a 53-week year and week 53 straddles Dec/Jan with 5 working days (TC-CAL-003, TC-CAL-006, TC-CAL-011)
  3. `isSwedishHoliday(date)` returns true for all 12 hardcoded holidays in 2026–2030 and `workingDaysInRange()` excludes them
  4. Eslint rule prevents any source file outside `lib/time/iso-calendar.ts` from importing `date-fns` week APIs (TC-CAL-022)
**Plans**: TBD

### Phase 34: Foundations — Personas, i18n catalog, historic-edit helper
**Goal**: Ship the persona/role-switching infrastructure, the empty Swedish/English key catalog, and the per-request server-now helper before any UI or service code lands.
**Depends on**: Phase 33
**Requirements**: FOUND-V5-03, FOUND-V5-05, FOUND-V5-06
**Success Criteria** (what must be TRUE):
  1. User can switch between PM, Line Mgr, Staff, R&D Mgr, Admin in the header; selection persists in localStorage and re-routes to that persona's landing page (**TC-PSN-001..006**)
  2. `src/messages/sv.json`, `src/messages/en.json`, and `src/messages/keys.ts` exist with empty values for every string referenced in §11.4, §6.13–§6.18, and §11.1; CI fails if any v5.0 component renders a hardcoded user-facing string
  3. `getServerNowMonthKey(tx)` is per-request cached and used by every historic-edit guard (consumed in TC-PS-005, TC-PS-006)
**Plans:** 1/1 plans complete
- [x] 34-01-PLAN.md — Persona context + switcher, v5 i18n key catalog + eslint guard, getServerNowMonthKey + isHistoricPeriod
**UI hint**: yes

### Phase 35: Foundations — Universal change_log infrastructure
**Goal**: Stand up the `change_log` table, `recordChange` helper, and the three-mechanism enforcement (eslint rule + codegen manifest + runtime test) that guarantees every mutating service writes an audit row.
**Depends on**: Phase 33
**Requirements**: FOUND-V5-04
**Success Criteria** (what must be TRUE):
  1. `recordChange()` inserts an audit row inside the caller's transaction and rolls back with it (**TC-CL-001..004**)
  2. Eslint rule `nordic/require-change-log` AST-walks `features/**/*.service.ts` and fails CI if any mutating function omits `recordChange` without an `@no-change-log` escape hatch
  3. `scripts/generate-mutations-manifest.ts` regenerates `tests/invariants/mutations.json` deterministically; CI fails when the committed manifest is stale
  4. Runtime invariant test calls every entry in the manifest and asserts ≥1 `recordChange` call (**TC-CL-005**)
**Plans:** 1/1 plans complete
- [x] 35-01-PLAN.md — change_log table + recordChange + nordic/require-change-log eslint rule + mutations manifest codegen + TC-CL-005 runtime invariant

### Phase 36: Data model — v5.0 schema migrations
**Goal**: Land the four new tables (`allocation_proposals`, `actual_entries`, `import_batches`, `change_log`) plus the only existing-table mutation (`projects.lead_pm_person_id`) — strictly additive to the v4.0 schema.
**Depends on**: Phase 35
**Requirements**: ACT-01, IMP-01, PROP-01, PROP-02
**Success Criteria** (what must be TRUE):
  1. `pnpm db:generate && pnpm db:migrate && pnpm db:seed` succeeds against a fresh Neon branch and existing v4.0 screens still load (**TC-DB-001..010**)
  2. `actual_entries` enforces unique `(organization_id, person_id, project_id, date)` with `hours numeric(5,2)` (TC-DB-003, TC-DB-004)
  3. `proposal_status` enum contains exactly `proposed, approved, rejected, withdrawn, superseded` and FK constraints to people/projects/orgs are enforced (TC-DB-007, TC-DB-008)
  4. `projects.lead_pm_person_id` exists and is the **only** v4.0 table mutation; the v4.0 unique index `allocations_org_person_project_month_uniq` is preserved (TC-DB-002)
**Plans**: TBD

### Phase 37: Actuals layer — services, distribution, plan-vs-actual cell
**Goal**: Deliver the day-grain actuals service (with largest-remainder week/month → day distribution), aggregation read model, and the reusable plan-vs-actual cell + drill-down drawer hook.
**Depends on**: Phase 36
**Requirements**: ACT-02, ACT-03, ACT-04, ACT-05
**Success Criteria** (what must be TRUE):
  1. `upsertActuals({ grain: 'day'|'week'|'month' })` distributes via largest-remainder, is idempotent on the unique key, and writes change_log (**TC-AC-001..006**, **TC-AR-001..004**)
  2. Sum of distributed daily rows matches the input total within ±0.01h for every grain (TC-AC-004, TC-AC-006)
  3. Plan-vs-actual cell renders planned/actual/delta with green-under / red-over / neutral-on-plan color coding and is reused across PM, Line Mgr, Staff, R&D timelines (**TC-UI-001..002**)
  4. Drill-down drawer shows daily plan vs actual breakdown for any cell click and works against seeded fixtures
**Plans**: TBD
**UI hint**: yes

### Phase 38: Excel import pipeline
**Goal**: Build the two-stage SheetJS import pipeline (parse → preview → commit) with idempotency, override flag, rollback + supersession, fuzzy name matching, and a downloadable template.
**Depends on**: Phase 37
**Requirements**: IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, WIZ-01
**Success Criteria** (what must be TRUE):
  1. Parser accepts row-per-entry (`person_name, project_name, date, hours`) and pivoted layouts; US `WEEKNUM()` headers raise `ERR_US_WEEK_HEADERS` (**TC-EX-001..012**, **TC-IMP-***)
  2. Line Manager can upload a file, see a preview with new/updated/warning row counts and unmatched-name fuzzy suggestions, then commit explicitly; manual edits are preserved unless "Skriv över manuella ändringar" is checked (**TC-AC-007..010**, **TC-API-030..032**)
  3. `POST /api/v5/imports/{id}/rollback` restores pre-batch state via `reversal_payload` within 24h and refuses after (**TC-AC-012..017**, **TC-API-033..034**)
  4. A second import that touches the same rows correctly supersedes the previous batch and prevents reversal corruption (TC-AC-016)
  5. `template_row_per_entry.xlsx` is served as a static asset and matches parser expectations
**Plans**: 3 plans
Plans:
- [x] 38-01-PLAN.md — SheetJS parser (row-per-entry + pivoted) + name matcher + static xlsx template
- [x] 38-02-PLAN.md — Import service (parse/preview/commit/rollback/supersession) + migration 0006 + /api/v5/imports/* routes
- [x] 38-03-PLAN.md — Line Manager import wizard UI (WIZ-01) + i18n v5.import.* + rollback button
**UI hint**: yes

### Phase 39: Proposal / approval workflow
**Goal**: Implement the full PM-wish → Line-Manager-approval state machine with routing, audit trail, and resubmit-from-rejected support.
**Depends on**: Phase 36
**Requirements**: PROP-03, PROP-04, PROP-05, PROP-06, PROP-07, PROP-08
**Success Criteria** (what must be TRUE):
  1. PM editing an out-of-department cell triggers proposal mode (dashed border, Pending badge) and requires explicit "Submit wish" — direct save is blocked (**TC-PR-001..003**, **TC-PS-001..010**)
  2. Line Manager approval queue lists pending proposals with impact preview and approve/reject actions; rejection requires a reason; approve writes through to `allocations` and records both `PROPOSAL_APPROVED` and `ALLOCATION_EDITED via='proposal'` change_log rows (**TC-PR-004..009**, **TC-API-010..014**)
  3. Editing a rejected proposal creates a new proposal row with `parent_proposal_id`; concurrent approves resolve with exactly one winner via `PROPOSAL_NOT_ACTIVE` (TC-PR-011, TC-PR-013)
  4. When a target person changes department while a proposal is pending, the proposal re-routes to the new department's line manager (PROP-07 routing test in TC-PR group)
  5. Line Mgr direct edits within own department bypass the gate but still write change_log (PROP-08, TC-PS-007)
**Plans**: TBD
**UI hint**: yes

### Phase 40: Persona views Part 1 — PM
**Goal**: Ship the PM persona screens — PM Home, project timeline with plan-vs-actual cells and inline approval gate, My Wishes panel, and the historic-edit confirmation dialog.
**Depends on**: Phase 37, Phase 39, Phase 34
**Requirements**: UX-V5-01, UX-V5-02, UX-V5-03, UX-V5-11, HIST-01
**Success Criteria** (what must be TRUE):
  1. PM lands on PM Home with overview card and can drill into a project timeline rendering month-column plan-vs-actual cells (**TC-UI-001..002**, TC-PSN-003)
  2. Inline cell edit on an out-of-department person opens proposal mode and Submit wish; in-department edit auto-saves with debounce (TC-UI debounce, TC-PR-001)
  3. PM "My Wishes" panel filters by proposed / approved / rejected and supports resubmit from a rejected card (PROP-06 lifecycle)
  4. Editing any period before `getServerNowMonthKey()` opens a confirmation dialog with no hard lock; confirming writes `ALLOCATION_HISTORIC_EDITED` (**TC-PS-005..006**, TC-API-004)
**Plans**: TBD
**UI hint**: yes

### Phase 41: Persona views Part 2 — Line Manager
**Goal**: Ship the Line Manager persona screens — capacity heatmap home, group timeline with project breakdown, approval queue, and the change log feed.
**Depends on**: Phase 39, Phase 40
**Requirements**: UX-V5-04, UX-V5-05, UX-V5-06, UX-V5-10
**Success Criteria** (what must be TRUE):
  1. Line Mgr Home renders a person × month heatmap with thresholds green 60–90%, red >100%, yellow <60%, grey absence (**TC-CP-001..004**, **TC-API-050..051**)
  2. Group timeline shows project breakdown per person with direct edit and visible change log (TC-PS-001..010, TC-API-040..041)
  3. Approval queue shows impact preview ("Sara's June utilization 40% → 90%") and Approve / Reject actions; counter-proposal is explicitly absent (TC-PR-004..009)
  4. Change log feed is filterable by project / person / period / author with persona-scoped defaults (**TC-API-040..041**, **TC-CL-***)
**Plans**: 5 plans
Plans:
- [x] 41-01-PLAN.md — Wave 0 backend gap fill (capacity.read, change-log.read, impact % extension, line-manager scope branch, DesktopOnlyScreen, dept dropdown)
- [x] 41-02-PLAN.md — Wave 1 LM Home capacity heatmap + persona route guard
- [ ] 41-03-PLAN.md — Wave 2 group timeline (flat synthetic child rows override) + direct edit
- [x] 41-04-PLAN.md — Wave 3 approval queue impact wording + change log feed UI
- [ ] 41-05-PLAN.md — Wave 4 i18n sweep + TC-E2E-2A + TC-MOBILE-001 + TC-NEG-013
**UI hint**: yes

### Phase 42: Persona views Part 3 — Staff, R&D, drill-down, long-horizon zoom
**Goal**: Ship the remaining persona screens — Staff read-only schedule, R&D portfolio with long-horizon zoom and 53-week handling, plus the shared drill-down drawer component.
**Depends on**: Phase 41
**Requirements**: UX-V5-07, UX-V5-08, UX-V5-09, UX-V5-12
**Success Criteria** (what must be TRUE):
  1. Staff "My Schedule" is fully read-only with projects × months plan-vs-actual split and a month summary strip (TC-PSN staff scope, TC-UI read-only gating)
  2. R&D Manager portfolio grid shows projects × months aggregate with project/group toggle and supports drill-into-PM-view (**TC-PSN-006**, TC-API-001)
  3. Long-horizon zoom levels (month / quarter / year) render correctly across 20–30 forward months and give ISO week 53 of 2026 its own column (**TC-ZOOM-***, TC-CAL-003, TC-CAL-006)
  4. Shared drill-down drawer component is reused across PM, Line Mgr, Staff, R&D timelines from a single source (TC-UI shared component test)
**Plans**: TBD
**UI hint**: yes

### Phase 43: Admin register maintenance
**Goal**: Deliver Admin self-service CRUD for People, Projects, Departments, Disciplines, Programs with archive + dependent-row blocking and a change-log landing view.
**Depends on**: Phase 35, Phase 41
**Requirements**: ADM-01, ADM-02, ADM-03, ADM-04
**Success Criteria** (what must be TRUE):
  1. Admin sees list view (active default, archived toggle) for each register and can create / edit via side-sheet form (**TC-REG-***)
  2. Archiving a project that has active allocations raises `ConflictError DEPENDENT_ROWS_EXIST`; archived rows are hidden by default (TC-REG dependent-row test)
  3. Every register mutation writes a `REGISTER_ROW_CREATED` / `_UPDATED` / `_DELETED` change_log entry (TC-CL-005 invariant + TC-REG audit)
  4. Admin landing route is the change_log feed scoped to all entities (TC-PSN-001 default persona)
**Plans**: TBD
**UI hint**: yes

### Phase 44: API hardening + test contract fill
**Goal**: Ensure every TC-* assertion in ARCHITECTURE.md §15 has a corresponding passing automated test, all `/api/v5/*` routes use the AppError taxonomy with consistent codes, and every mutating endpoint is tenant-scoped.
**Depends on**: Phase 43
**Requirements**: API-V5-01, API-V5-02, TEST-V5-01, TEST-V5-02
**Success Criteria** (what must be TRUE):
  1. All ~280 §15 assertions (TC-CAL-*, TC-DB-*, TC-CL-*, TC-PS-*, TC-PR-*, TC-AC-*, TC-AR-*, TC-CP-*, TC-EX-*, TC-API-*, TC-PSN-*, TC-UI-*, TC-ZOOM-*, TC-REG-*, TC-E2E-*, TC-NEG-*, TC-PERF-*) map 1:1 to passing automated tests in CI
  2. Every `/api/v5/*` endpoint returns the AppError hierarchy with the documented error codes (`HISTORIC_CONFIRM_REQUIRED`, `BAD_HOURS`, `PROPOSAL_NOT_ACTIVE`, `REASON_REQUIRED`, `BATCH_ALREADY_ROLLED_BACK`, `ROLLBACK_WINDOW_EXPIRED`, `DEPENDENT_ROWS_EXIST`, `ERR_US_WEEK_HEADERS`) — verified by **TC-NEG-***
  3. Every mutating endpoint goes through `withTenant()`; cross-tenant read attempt returns 404 (TC-API tenant-isolation tests)
  4. Deterministic UUID v5 seed (§16) produces identical fixtures across test runs (TEST-V5-02)
**Plans**: TBD

### Phase 45: Launch gate — PDF export bug fix
**Goal**: Fix the v4.0 PDF export bug (html2canvas blank for non-SVG widgets) by swapping to `html-to-image` or `modern-screenshot`. This is the launch gate for v5.0 and is separate from v5.0 feature work.
**Depends on**: Phase 44
**Requirements**: LAUNCH-01
**Success Criteria** (what must be TRUE):
  1. PDF export captures every dashboard widget type (chart, table, KPI, heatmap, custom) with no blank tiles
  2. Exported PDF retains Swedish characters (åäö), inline CSS custom properties, and tabular-num alignment
  3. Regression test asserts a multi-widget dashboard PDF is non-empty and each widget region has non-zero pixel content
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 33 -> 34 -> ... -> 45

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-10 | v1.0 | 26/26 | Complete | 2026-03-27 |
| 11-17 | v2.0 | 14/14 | Complete | 2026-03-28 |
| 18-21 | v3.0 | 4/4 | Complete | 2026-03-30 |
| 22 | v3.0 | 0/? | Deferred (stretch) | - |
| 23-32 | v4.0 | -/- | Complete | 2026-04-01 |
| 33. Foundations — ISO calendar | v5.0 | 1/1 | Complete    | 2026-04-07 |
| 34. Foundations — Personas + i18n + helper | v5.0 | 1/1 | Complete    | 2026-04-07 |
| 35. Foundations — change_log infrastructure | v5.0 | 1/1 | Complete    | 2026-04-07 |
| 36. v5.0 schema migrations | v5.0 | 1/1 | Complete    | 2026-04-07 |
| 37. Actuals layer | v5.0 | 2/2 | Complete    | 2026-04-07 |
| 38. Excel import pipeline | v5.0 | 3/3 | Complete    | 2026-04-07 |
| 39. Proposal / approval workflow | v5.0 | 8/10 | In Progress|  |
| 40. Persona views Part 1 — PM | v5.0 | 5/5 | Complete   | 2026-04-08 |
| 41. Persona views Part 2 — Line Manager | v5.0 | 3/5 | In Progress|  |
| 42. Persona views Part 3 — Staff/R&D/zoom | v5.0 | 0/0 | Not started | - |
| 43. Admin register maintenance | v5.0 | 0/0 | Not started | - |
| 44. API hardening + test contract fill | v5.0 | 0/0 | Not started | - |
| 45. Launch gate — PDF export bug fix | v5.0 | 0/0 | Not started | - |

---

_60 v1 requirements shipped across 10 phases, 26 plans._
_38 v2 requirements across 7 phases. Coverage: 38/38._
_15 v3 requirements across 5 phases. Coverage: 15/15._
_v4.0 dashboard visualizations shipped across phases 23-32._
_38 v5.0 requirements + 1 launch gate across 13 phases (33-45). Coverage: 39/39 mapped._

_Last updated: 2026-04-07 — v5.0 roadmap created_
