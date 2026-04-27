# Nordic Capacity -- Roadmap

## Milestones

- **v1.0 MVP** -- Phases 1-10 (shipped 2026-03-27) | [Archive](milestones/v1.0-ROADMAP.md)
- **v2.0 Visibility & Insights** -- Phases 11-17 (shipped 2026-03-28) | [Archive](v2.0-ROADMAP.md)
- **v3.0 Switch from Excel** -- Phases 18-22 (shipped 2026-03-30)
- **v4.0 Dashboard Visualizations & Customization** -- Phases 23-32 (shipped 2026-04-01)
- **v5.0 Plan vs Actual + Approval Workflow** -- Phases 33-47 (shipped 2026-04-13) | 3-round architecture review
- **v6.0 UI Restructure & Journey Frictionless** -- Phases 48-53 (shipped 2026-04-27) | [Archive](milestones/v6.0-ROADMAP.md) | Phase 54 deferred (telemetry-gated)
- **v7.0 (TBD)** -- Not yet planned. Run `/gsd-new-milestone` to start scoping.

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
- [ ] Phase 54 (optional): Dashboard quadrant redesign — DEFERRED indefinitely (POLISH-07 SOFT-gate showed no quadrant-redesign signal; requirements QUAD-01..03 unimplemented)

</details>

### v7.0 (Not yet planned)

No phases defined. Run `/gsd-new-milestone` to start scoping.

## Carried-Forward Active Work (no milestone yet)

- LEGACY_LAYOUTS code path cleanup (post-stable rollout of `uiV6.polish` flag)
- Counter-proposal flow for LM approval (deferred from v5.0)
- Mobile-first responsive pass (deferred from v6.0)
- Email/Slack notification channel (currently in-app only)
- Real role-based permissions replacing the persona "UX shortcut" (ADR-004)
- Three dev-env harness gaps (`/api/test/seed` no-tx under neon-http; `/api/v5/*/count` 404 in Turbopack dev; `requireRole()` Clerk session-level bypass)

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Core Platform | 1-10 | 26/26 | Complete | 2026-03-27 |
| v2.0 Visibility & Insights | 11-17 | 14/14 | Complete | 2026-03-28 |
| v3.0 Switch from Excel | 18-21 | 4/4 | Complete | 2026-03-30 |
| v3.0 (Phase 22 stretch) | 22 | 0/? | Deferred | — |
| v4.0 Dashboard Visualizations | 23-32 | — | Complete | 2026-04-01 |
| v5.0 Plan vs Actual + Approval | 33-47 | 62/62 (with deferrals) | Complete | 2026-04-13 |
| v6.0 UI Restructure | 48-53 | 22/22 | Complete | 2026-04-27 |
| v6.0 Phase 54 (optional) | 54 | 0/TBD | Deferred (telemetry-gated, no signal) | — |

---

_Last updated: 2026-04-27 — v6.0 milestone shipped and archived. Between milestones._
