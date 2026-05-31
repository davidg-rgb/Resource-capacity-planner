# Nordic Capacity -- Roadmap

## Milestones

- **v1.0 MVP** -- Phases 1-10 (shipped 2026-03-27) | [Archive](milestones/v1.0-ROADMAP.md)
- **v2.0 Visibility & Insights** -- Phases 11-17 (shipped 2026-03-28) | [Archive](v2.0-ROADMAP.md)
- **v3.0 Switch from Excel** -- Phases 18-22 (shipped 2026-03-30)
- **v4.0 Dashboard Visualizations & Customization** -- Phases 23-32 (shipped 2026-04-01)
- **v5.0 Plan vs Actual + Approval Workflow** -- Phases 33-47 (shipped 2026-04-13) | 3-round architecture review
- **v6.0 UI Restructure & Journey Frictionless** -- Phases 48-53 (shipped 2026-04-27) | [Archive](milestones/v6.0-ROADMAP.md)
- **v7.0 Foundation & Quality** -- Phases 54-61 (started 2026-05-11) | Debt cleanup, zero new features

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
- [ ] Phase 22: Swedish Localization (stretch — deferred; absorbed into v7.0 Phase 59)

</details>

<details>
<summary>v4.0 Dashboard Visualizations & Customization (Phases 23-32) -- SHIPPED 2026-04-01</summary>

- [x] Phases 23-32: 13 widget specs + custom dashboards + scenarios

</details>

<details>
<summary>v5.0 Plan vs Actual + Approval Workflow (Phases 33-47) -- SHIPPED 2026-04-13</summary>

- [x] Phase 33: Foundations — ISO calendar + Swedish holidays (1/1)
- [x] Phase 34: Foundations — Personas, i18n catalog, historic-edit helper (1/1)
- [x] Phase 35: Foundations — Universal change_log infrastructure (1/1)
- [x] Phase 36: Data model — v5.0 schema migrations (1/1)
- [x] Phase 37: Actuals layer — services, distribution, plan-vs-actual cell (2/2)
- [x] Phase 38: Excel import pipeline (3/3)
- [x] Phase 39: Proposal / approval workflow (10/10)
- [x] Phase 40: Persona views Part 1 — PM (5/5)
- [x] Phase 41: Persona views Part 2 — Line Manager (5/5)
- [x] Phase 42: Persona views Part 3 — Staff, R&D, drill-down, long-horizon zoom (4/4)
- [x] Phase 43: Admin register maintenance (4/4)
- [x] Phase 44: API hardening + test contract fill (14/14, with deferrals)
- [x] Phase 45: Launch gate — PDF export bug fix (1/1, with deferrals)
- [x] Phase 46: PDF widget rendering polish (1/1)
- [x] Phase 47: Playwright E2E infrastructure (10/10)
- [x] v5.0 Architecture Review — 3 iterations, all findings closed

</details>

<details>
<summary>v6.0 UI Restructure & Journey Frictionless (Phases 48-53) -- SHIPPED 2026-04-27</summary>

- [x] Phase 48: Pre-flight verification (2/2)
- [x] Phase 49: Unbreak broken persona surfaces (4/4)
- [x] Phase 50: Persona-aware landing & navigation (3/3)
- [x] Phase 51: Lean cleanup — duplicate removal (3/3)
- [x] Phase 52: Per-journey friction fixes (5/5)
- [x] Phase 53: Chrome polish (5/5)

**Note:** The previously-tracked "Phase 54 (optional) Dashboard quadrant redesign" (QUAD-01..03) is deferred indefinitely (POLISH-07 SOFT-gate telemetry showed no signal). The Phase 54 slot is reused by v7.0 below. QUAD-01..03 remain documented under REQUIREMENTS.md "v8+ deferred."

</details>

### v7.0 Foundation & Quality (Phases 54-61)

- [x] **Phase 54: Audit-spine + eslint regex expansion** — Route 5 legacy register services through `register.service.ts` so every register-table mutation emits a `change_log` row; expand `MUTATION_PREFIX_REGEX` to cover `execute|promote|apply|cancel|stage` verbs. (Done 2026-05-28: AUDIT-01..07, verified PASS `321914c`. Phase 54.5 dependency remediation pushed separately.)
- [x] **Phase 55: Tenant-isolation consolidation** — ADR-driven decision on `withTenant()` scope, then full execution so coverage is binary (all or none), guarded by a runtime invariant. (Done 2026-05-28: removed the wrapper, standardized direct predicates, ADR-V7-01.)
- [x] **Phase 56: Change-log enum expansion** — Add `scenario`, `scenario_allocation`, `import_session` to `change_log_entity` enum via schema migration; remove `@no-change-log` escape hatches that depended on the deferred enum. (Done 2026-05-31: migration 0010 + 6 new `change_log_action` values; all scenario + import_session lifecycle mutations now audited; 1101 tests pass. Migration not yet applied to prod-equivalent DB — see 56-SUMMARY.)
- [ ] **Phase 57: E2E CI rehab** — Diagnose Clerk-key blocker, restore the Playwright CI job disabled on 2026-04-28, prove the 11-spec persona suite + axe-core a11y assertions run green.
- [ ] **Phase 58: Dev-env harness fixes** — Three documented harness gaps from STATE.md Blockers so local + CI test runs are unblocked.
- [ ] **Phase 59: Localization completeness** — Move remaining hardcoded sv/en strings to i18n bundles and add a sv↔en parity invariant; absorbs deferred v3.0 Phase 22 Swedish localization scope.
- [ ] **Phase 60: Responsive design baseline** — Mobile-first pass on persona home pages, heatmap, allocation grid, and dashboard widgets so 375px viewport is usable.
- [ ] **Phase 61: A11y consistency** — Site-wide `motion-reduce` fallbacks, `focus-visible` ring consistency, and WCAG 2.2 AA touch-target uprating on primary-action elements.

## Phase Details

### Phase 54: Audit-spine + eslint regex expansion
**Goal**: Every register-table mutation (people, projects, programs, departments, disciplines) flows through the single audited service so the universal `change_log` invariant is enforceable end-to-end; eslint regex catches future mutating verbs as they're written.
**Depends on**: v6.0 shipped (Phase 53)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05, AUDIT-06, AUDIT-07
**Success Criteria** (what must be TRUE):
  1. Every `PUT/POST/DELETE` on `/api/people/*`, `/api/projects/*`, `/api/programs/*`, `/api/departments/*`, `/api/disciplines/*` routes through `register.service.ts` (grep-verified, no direct ORM call outside the service)
  2. Per-entity contract test asserts that a `change_log` row is written for each mutating route (5 tests, one per entity)
  3. `MUTATION_PREFIX_REGEX` matches the verbs `execute|promote|apply|cancel|stage` in addition to existing prefixes; an eslint test confirms a sample mutating function with each new prefix fails the rule without `@no-change-log` or a `change_log` write
  4. `npm run check:mutations-manifest` (or equivalent CI invariant) passes after regeneration
  5. No regression: existing `change_log` row count for an admin "create person → update → delete" flow increments by exactly 3 (or matches prior expected baseline)
**Plans**: 3 plans (2 waves)
- [ ] 54-01-PLAN.md — AUDIT-07: add RuleTester unit tests in require-change-log.rule.test.ts for execute|promote|apply|cancel|stage prefixes (Wave 1, independent)
- [ ] 54-02-PLAN.md — AUDIT-01..05: refactor 5 legacy register services to delegate to register.service.ts; thread userId from requireRole('admin') through 10 mutating route handlers (Wave 1, file-disjoint from 54-01)
- [ ] 54-03-PLAN.md — AUDIT-06: 5 per-entity contract tests asserting change_log writes for POST/PATCH/DELETE on legacy routes; regenerate tests/invariants/mutations.json (Wave 2, depends on 54-02)

### Phase 55: Tenant-isolation consolidation
**Goal**: The `withTenant()` coverage decision is documented as an ADR and fully executed so every tenant-scoped query follows one pattern, with a runtime invariant blocking regression.
**Depends on**: Phase 54
**Requirements**: TENANT-01, TENANT-02, TENANT-03
**Success Criteria** (what must be TRUE):
  1. An ADR file (`.planning/adr/ADR-V7-tenant-isolation.md` or similar) exists and states the chosen direction (extend wrapper to all 16 tables OR remove wrapper and standardize on direct `eq(organizationId, orgId)` predicates), with rationale
  2. Every tenant-scoped query in the codebase follows the chosen pattern — verified by grep/AST scan returning zero violations of the rejected pattern
  3. A runtime invariant test (regex or AST check, similar in shape to the universal change_log invariant) fails CI if a mixed pattern is reintroduced
  4. No tenant data leak regression: existing tenant-isolation contract tests still pass
**Plans**: TBD

### Phase 56: Change-log enum expansion
**Goal**: `scenario`, `scenario_allocation`, and `import_session` mutations stop being silently `@no-change-log` and start emitting audit rows like every other entity.
**Depends on**: Phase 54 (audit-spine in place)
**Requirements**: CHLOG-01, CHLOG-02, CHLOG-03
**Success Criteria** (what must be TRUE):
  1. A Drizzle migration adds `scenario`, `scenario_allocation`, `import_session` values to the `change_log_entity` Postgres enum and is applied to dev + prod-equivalent branches
  2. The scenario service mutations that previously carried `@no-change-log` escape hatches now write a row to `change_log` with the correct entity type, verified by a contract test per entity
  3. `npm run check:mutations-manifest` passes after regeneration; the manifest lists the three new entity types
  4. `change_log` row count increments by 1 for a "create scenario → add scenario_allocation → commit import_session" smoke test
**Plans**: 56-01 enum expansion (migration 0010) · 56-02 service wiring · 56-03 tests + manifest — executed inline 2026-05-31; see 56-PLAN.md / 56-SUMMARY.md (DONE)

### Phase 57: E2E CI rehab
**Goal**: The Playwright CI job runs green on every PR push to main, exercising the full 11-spec persona journey suite plus axe-core a11y assertions; no more disabled job sitting in `.github/workflows/`.
**Depends on**: Phase 58 (`requireRole()` E2E_TEST bypass) — recommended ordering, but not strictly blocking if E2E env can be unblocked first
**Requirements**: E2E-01, E2E-02, E2E-03, E2E-04
**Success Criteria** (what must be TRUE):
  1. The Clerk-key blocker is diagnosed in a one-line root-cause note committed alongside the fix (so future regressions are recognizable)
  2. The CI workflow under `.github/workflows/*` runs Playwright on PR open + main push; the `if: false` or skip directive from `a60b493` is removed
  3. All 11 persona journey specs (PM × 4, LM × 3, Staff × 1, R&D × 2, Admin × 1) pass in CI on at least three consecutive runs with no flake
  4. axe-core a11y assertions pass against the live CI build (no new violations beyond the documented baseline)
**Plans**: TBD
**UI hint**: yes

### Phase 58: Dev-env harness fixes
**Goal**: The three documented harness gaps that block local + CI test runs are closed so developers can seed test data, read counts, and bypass auth in E2E without workarounds.
**Depends on**: Nothing (independent fixes; can run in parallel with Phase 54-56, but should land before or together with Phase 57)
**Requirements**: QUAL-04, QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):
  1. `POST /api/test/seed` succeeds under the neon-http driver — rewritten as multiple non-transactional statements with idempotent inserts; a smoke test confirms it seeds a clean DB and is rerunnable
  2. `GET /api/v5/proposals/queue/count` and `GET /api/v5/capacity/overcommit/count` return live data (not 404) in dev Turbopack; LM dashboard badge reads the correct count instead of 0
  3. `requireRole()` honors the `E2E_TEST` proxy bypass at every route layer it guards; a Playwright spec invoking a guarded route with the bypass header returns 200, not 401
  4. None of the fixes weaken production auth — the bypass is gated on `process.env.E2E_TEST === '1' && process.env.NODE_ENV !== 'production'` (or equivalent)
**Plans**: TBD

### Phase 59: Localization completeness
**Goal**: Every visible string in the app is in the i18n bundle, with sv↔en parity enforceable in CI; absorbs the deferred v3.0 Phase 22 Swedish localization scope.
**Depends on**: Nothing (independent of audit/tenant work)
**Requirements**: L10N-01, L10N-02, L10N-03, L10N-04
**Success Criteria** (what must be TRUE):
  1. `src/app/(app)/input/[personId]/page.tsx` contains zero literal user-facing Swedish strings; all moved to a `v5.*` (or appropriate) i18n namespace
  2. `src/components/person/person-analytics.tsx` contains zero literal Swedish strings; all moved to i18n
  3. A repo-wide grep for `[A-ZÅÄÖ][a-zåäö]{4,}` inside JSX (excluding tests + comments) returns zero ungated matches — or each match is documented as intentional (e.g., proper noun)
  4. A lint/test script (`npm run check:i18n-parity` or similar) fails CI if any key exists in `sv.json` but not `en.json`, or vice versa; the script passes after this phase
**Plans**: TBD
**UI hint**: yes

### Phase 60: Responsive design baseline
**Goal**: The four highest-impact surfaces (persona homes, heatmap, allocation grid, dashboard widgets) render usable on a 375px-wide viewport, closing the v6.0 "not responsive" gap.
**Depends on**: Nothing (independent of backend phases)
**Requirements**: RESP-01, RESP-02, RESP-03, RESP-04
**Success Criteria** (what must be TRUE):
  1. Persona home pages for PM, LM, Staff, R&D, and Admin render in a usable single-column flow at 375px viewport — primary action visible without horizontal scroll, headers scrollable, no clipped controls
  2. The team heatmap (`/dashboard/team`) at 375px keeps the sticky-left person column visible and supports horizontal scrolling across months without breaking the row alignment
  3. The allocation grid (`/input/[personId]`) at 375px shows a responsive treatment — either AG Grid mobile config or a read-only mode that surfaces the data without broken edit affordances (decision documented in phase notes)
  4. Dashboard widgets stack to a single column on narrow viewports; no widget overflows into negative-x layout regions or clips its primary content
**Plans**: TBD
**UI hint**: yes

### Phase 61: A11y consistency
**Goal**: Three site-wide a11y categories surfaced by the 2026-05-11 frontend audit are closed: motion-reduce fallbacks, focus-visible rings, and WCAG 2.2 AA touch targets on primary actions.
**Depends on**: Phase 60 (responsive baseline) — recommended ordering so touch-target sizing reflects mobile layouts
**Requirements**: A11Y-01, A11Y-02, A11Y-03
**Success Criteria** (what must be TRUE):
  1. Every `animate-pulse` and `animate-spin` Tailwind utility in the codebase pairs with a `motion-reduce:animate-none` fallback (or equivalent via a Tailwind plugin) — grep-verified
  2. Every interactive element (button, link, toggle) has a visible `focus-visible:ring-*` or `focus-visible:outline-*` treatment — sampling by axe-core + manual keyboard nav across persona journeys finds no element without a visible focus state
  3. Every primary-action interactive element is ≥ 44×44 CSS pixels (WCAG 2.2 AA); exceptions are documented inline (per-element comment) with the reason and the alternate large-target available on the same screen
  4. axe-core run against the post-fix build reports no new violations and ideally a reduction vs. the pre-phase baseline
**Plans**: TBD
**UI hint**: yes

## Carried-Forward Active Work (no milestone yet)

- LEGACY_LAYOUTS code path cleanup (post-stable rollout of `uiV6.polish` flag)
- Counter-proposal flow for LM approval (deferred from v5.0)
- Email/Slack notification channel (currently in-app only)
- Real role-based permissions replacing the persona "UX shortcut" (ADR-004)
- Dashboard quadrant redesign (QUAD-01..03) — telemetry-gated, no signal at v6.0 close

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Core Platform | 1-10 | 26/26 | Complete | 2026-03-27 |
| v2.0 Visibility & Insights | 11-17 | 14/14 | Complete | 2026-03-28 |
| v3.0 Switch from Excel | 18-21 | 4/4 | Complete | 2026-03-30 |
| v3.0 (Phase 22 stretch) | 22 | 0/0 | Absorbed into v7.0 Phase 59 | — |
| v4.0 Dashboard Visualizations | 23-32 | — | Complete | 2026-04-01 |
| v5.0 Plan vs Actual + Approval | 33-47 | 62/62 (with deferrals) | Complete | 2026-04-13 |
| v6.0 UI Restructure | 48-53 | 22/22 | Complete | 2026-04-27 |
| v6.0 Phase 54 (Dashboard quadrant) | — | — | Deferred indefinitely (telemetry, no signal) — slot reused by v7.0 | — |
| v7.0 Phase 54 — Audit-spine + eslint | 54 | 0/3 | Planned (3 plans, 2 waves) | — |
| v7.0 Phase 55 — Tenant-isolation consolidation | 55 | 1/1 | Complete (2026-05-28) — ADR-V7-01, wrapper removed | — |
| v7.0 Phase 56 — Change-log enum expansion | 56 | 0/TBD | Not started | — |
| v7.0 Phase 57 — E2E CI rehab | 57 | 0/TBD | Not started | — |
| v7.0 Phase 58 — Dev-env harness fixes | 58 | 0/TBD | Not started | — |
| v7.0 Phase 59 — Localization completeness | 59 | 0/TBD | Not started | — |
| v7.0 Phase 60 — Responsive design baseline | 60 | 0/TBD | Not started | — |
| v7.0 Phase 61 — A11y consistency | 61 | 0/TBD | Not started | — |

---

_Last updated: 2026-05-11 — v7.0 Foundation & Quality roadmap created (8 phases, 31 requirements mapped)._
