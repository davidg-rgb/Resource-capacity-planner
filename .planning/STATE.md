---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: UI Restructure & Journey Frictionless
status: Shipped 2026-04-27 — milestone archived; v6.0 Test 3 closed 2026-05-10
stopped_at: v6.0 closed 2026-04-27 (tag v6.0); Test 3 prod migrations applied 2026-05-10
last_updated: "2026-05-10T00:00:00.000Z"
last_activity: 2026-05-10
progress:
  total_phases: 53
  completed_phases: 53
  total_plans: 161
  completed_plans: 161
  percent: 100
---

# Nordic Capacity -- Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15 — v6.0 milestone added)
Planning artifacts (frozen, authoritative for v6.0):

- .planning/ui-reviews/UX-AUDIT-PERSONAS.md — click-count audit per journey
- .planning/ui-reviews/WIDGET-INVENTORY.md — widget duplication matrix + page-fit scores
- .planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md — **source of truth** (supersedes v1); 6 waves + optional Wave 5, with 3-agent review findings integrated

v5.0 artifacts (completed, do not re-review):

- .planning/v5.0-FEEDBACK.md
- .planning/v5.0-USER-JOURNEYS.md (journey source of truth — still authoritative)
- .planning/v5.0-ARCHITECTURE.md
- .planning/v5.0-HANDOFF.md
- .planning/milestones/v5.0-REQUIREMENTS.md (archived)

**Core value:** Every user journey at its target click-count — remove persona-blind chrome, delete duplicate surfaces, unblock the Line Manager / PM / Admin pages that regress today. No new features.
**Current focus:** v6.0 required work complete. Phase 54 (dashboard quadrant redesign) deferred pending Phase 53 viewport diagnostic telemetry.

## Current Position

Phase: v6.0 milestone archived 2026-04-27
Plan: n/a — between milestones
Next command: `/gsd-new-milestone` to start v7.0 (or capture ideas via `/gsd-add-backlog`)
Last activity: 2026-04-27

## v6.0 Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 48 | Pre-flight verification | Complete |
| 49 | Unbreak broken persona surfaces | Complete |
| 50 | Persona-aware landing & navigation | Complete |
| 51 | Lean cleanup — duplicate removal | Complete |
| 52 | Per-journey friction fixes | Complete |
| 53 | Chrome polish | Complete (shipped 2026-04-22; UAT Test 2 partial-pass, Tests 1+3 pending) |
| 54 | Dashboard quadrant redesign (optional) | Deferred — telemetry-gated on POLISH-07 |

## Previous Milestones

| Milestone | Phases | Status | Shipped |
| --------- | ------ | ------ | ------- |
| v1.0 Core Platform | 1-10 | Complete | 2026-03-27 |
| v2.0 Visibility & Insights | 11-17 | Complete | 2026-03-28 |
| v3.0 Switch from Excel | 18-22 | Complete | 2026-03-30 |
| v4.0 Dashboard Visualizations | 23-32 | Complete | 2026-04-01 |
| v5.0 Plan vs Actual + Approval | 33-47 | Complete | 2026-04-13 |
| v6.0 UI Restructure & Journey Frictionless | 48-53 | Required phases complete | 2026-04-22 |

## Accumulated Context

### v6.0 Locked Decisions (from UI-RESTRUCTURE-PLAN-v2.md §0 review response)

- **Feature-flag gating** mandatory for every wave. New flags: `uiV6.landing`, `uiV6.leanTrim`, `uiV6.perJourney`, `uiV6.polish`. Each acts as an independent kill-switch.
- **Wave ordering corrected** — Wave 1 (Landing) strictly precedes Wave 2 (Lean trim); they are not parallelizable. Prior v1 plan's parallel claim is obsolete.
- **Counter-proposal flow stays deferred** (from v5.0 non-goals) — not in any v6.0 phase.
- **DB schema corrected** — custom-dashboard audit uses `dashboard_layouts(layout jsonb)`, not the fictional `layout_versions.placements`. Audit SQL and migration scripted in LEAN-05 requirement.
- **`next.config.redirects[]`** is the chosen mechanism for deleted-route redirects (308 permanent, preserves query strings for deep-links like `/pm/wishes?tab=rejected`).
- **i18n keys land under `sidebar.personaSections.*`** to avoid collision with existing `sidebar.staff` / `sidebar.projects` section headings.
- **Widget-registry defensive fallback** — unknown widget IDs render a "Widget ej tillgänglig" placeholder, never throw. Protects tenant custom layouts during widget deletion rollout.

### v5.0 Locked Decisions (inherited, still binding)

- **ADR-004** Personas are UX shortcuts, not security boundaries. Role switcher in header, no real auth.
- **Q5** Staff read-only "My Schedule" only.
- **Q6** Historic edits allowed with soft warning, no hard locks, no mandatory reasons.
- **ISO 8601** + 53-week year first-class. 2026 is a 53-week year. Swedish holidays 2026–2030 hardcoded in `lib/time/iso-calendar.ts`.
- **Universal change_log** enforced via eslint + codegen + runtime test (TC-CL-005).

### Pending Todos

_All v6.0 53-HUMAN-UAT items closed:_

- ~~**Test 1 (POLISH-07 SOFT gate):** viewport JSON artifacts.~~ **CLOSED 2026-04-24** — operator confirmed CI artifacts captured; overflow within acceptable threshold; SOFT gate satisfied; no Phase 54 quadrant-redesign signal.
- ~~**Test 2 remaining combos:** Staff + flag-ON, all 5 personas + flag-OFF.~~ **CLOSED 2026-04-23** — 4/10 combos verified live 2026-04-22; remaining 6 combos verified structurally via unit tests (notification-bell.test.tsx, top-nav.visibleFor.test.tsx, flag.service.test.ts) and live flag-OFF parity sweep on Vercel prod.
- ~~**Test 3:** prod migration rowcount check.~~ **CLOSED 2026-05-10** — applied to prod via Neon MCP; result table matches dry-run; idempotence proven.

### Blockers/Concerns

- **Dev env harness gaps logged during Phase 53 UAT:**
  - `/api/test/seed` fails under neon-http driver (no transactions). Workaround: direct SQL insert for flag toggling.
  - `/api/v5/proposals/queue/count` + `/api/v5/capacity/overcommit/count` 404 in dev Turbopack; counts always read 0. Production behavior not affected per route tests.
  - Route-level `requireRole()` returns 401 even with `E2E_TEST` proxy bypass — Clerk session-level guards still fire.
  - Intermittent Turbopack panics on `/team/page` cause 500s and stale React state.

## Deferred Items

Items acknowledged and deferred at v6.0 milestone close on 2026-04-27. All entries are pre-existing accepted gaps from prior shipped milestones or v6.0 SOFT gates designed as `human_needed`. None blocked v6.0 ship.

| Category | Phase | Item | Status |
|----------|-------|------|--------|
| uat_gap | 03 | 03-HUMAN-UAT.md | partial (7 pending — v1.0) |
| uat_gap | 04 | 04-HUMAN-UAT.md | partial (6 pending — v1.0) |
| uat_gap | 05 | 05-HUMAN-UAT.md | partial (3 pending — v1.0) |
| uat_gap | 07 | 07-HUMAN-UAT.md | partial (6 pending — v1.0) |
| uat_gap | 09 | 09-HUMAN-UAT.md | partial (6 pending — v1.0) |
| uat_gap | 52 | 52-HUMAN-UAT.md | partial (6 pending — v6.0) |
| verification_gap | 03 | 03-VERIFICATION.md | human_needed (v1.0) |
| verification_gap | 04 | 04-VERIFICATION.md | human_needed (v1.0) |
| verification_gap | 05 | 05-VERIFICATION.md | human_needed (v1.0) |
| verification_gap | 07 | 07-VERIFICATION.md | gaps_found (v1.0) |
| verification_gap | 09 | 09-VERIFICATION.md | human_needed (v1.0) |
| verification_gap | 10 | 10-VERIFICATION.md | gaps_found (v1.0) |
| verification_gap | 12 | 12-VERIFICATION.md | human_needed (v2.0) |
| verification_gap | 15 | 15-VERIFICATION.md | human_needed (v2.0) |
| verification_gap | 17 | 17-VERIFICATION.md | gaps_found (v2.0) |
| verification_gap | 35 | 35-VERIFICATION.md | gaps_found (v5.0) |
| verification_gap | 52 | 52-VERIFICATION.md | human_needed (v6.0 SOFT gate) |
| verification_gap | 53 | 53-VERIFICATION.md | human_needed (v6.0 SOFT gate) |
| context_question | 43 | 43-CONTEXT.md | 3 open Q (Q-01..Q-03 archive defaults — v5.0 already shipped on documented defaults) |

## Session Continuity

Last session: 2026-04-22T11:49:30.488Z
Stopped at: Phase 53 shipped (commit eb9807f)

---

_Last updated: 2026-05-10 — v6.0 Test 3 prod migrations applied; uat_gap row for phase 53 dropped_
