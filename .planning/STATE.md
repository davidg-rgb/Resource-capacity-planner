---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: Foundation & Quality
status: Phase 55 (Tenant-isolation consolidation) COMPLETE 2026-05-28 — withTenant removed, direct-predicate standard, ADR-V7-01, rejected-pattern guard
stopped_at: Phase 55 COMPLETE — TENANT-01..03 closed. Removed withTenant() wrapper (1 vestigial usage), standardized on requireRole+orgId+direct organizationId predicate (139 sites), first v7.0 ADR (ADR-V7-01), tightened tenant-isolation.static.test.ts with a rejected-pattern guard. typecheck+lint green; 1095 tests pass (only pre-existing imports.api fails). Phase 54.5 (dependency remediation) was PUSHED earlier this session (origin/main @ aa2c823, audit 0/0/0/0). Phase 55 commits are LOCAL, NOT yet pushed. NEXT TASK: Phase 56 — Change-log enum expansion (CHLOG-01..03). See .planning/phases/55-tenant-isolation-consolidation/55-SUMMARY.md.
last_updated: "2026-05-28T19:30:00.000Z"
last_activity: 2026-05-28
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 4
  completed_plans: 4
  percent: 25
---

# Nordic Capacity -- Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-11 — v7.0 Foundation & Quality started)

v7.0 planning artifacts:
- .planning/REQUIREMENTS.md — milestone requirements (31 total, all mapped)
- .planning/ROADMAP.md — phase structure (Phases 54–61)

v6.0 artifacts (completed, do not re-review):
- .planning/milestones/v6.0-REQUIREMENTS.md (archived)
- .planning/milestones/v6.0-ROADMAP.md (archived)
- .planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md (v6.0 source of truth)

Recent context:
- .planning/CODE-REVIEW-2026-05-10.md — 22 fixes landed; HI-03, MED-02, MED-03 deferred to v7.0
- .planning/CLEANUP-REVIEW-2026-05-11.md — codebase-surgeon pass (-285 lines dead code)
- .planning/UI-REVIEW-2026-05-11.md — frontend-app-reviewer audit + 7 fix commits

**Core value (this milestone):** Close architectural debt so v8.0 features land on a clean foundation. Audit-spine coverage, tenant-isolation consistency, change-log enum completeness, eslint guard coverage, E2E CI restoration, localization parity, responsive baseline, a11y consistency. **No new product features.**

**Current focus:** Phase 55 (Tenant-isolation consolidation) COMPLETE — TENANT-01..03 closed. ADR-V7-01 (first v7.0 ADR) records the decision to REMOVE the `withTenant()` wrapper and standardize on `requireRole()`+`orgId`+direct `organizationId` predicates (census made it lopsided: 139 direct sites vs 1 vestigial wrapper usage). `src/lib/tenant.ts` deleted; the lone caller migrated; `tenant-isolation.static.test.ts` tightened to `requireRole+orgId` only + a rejected-pattern guard so the wrapper can't return. Phase 54.5 (dependency remediation) was pushed earlier this session (`origin/main @ aa2c823`, audit 0/0/0/0); Phase 55 commits are LOCAL, not yet pushed. **Next task = Phase 56 — Change-log enum expansion** (CHLOG-01..03). See `.planning/phases/55-tenant-isolation-consolidation/55-SUMMARY.md`.

## Current Position

Phase: 55 — Tenant-isolation consolidation (COMPLETE 2026-05-28)
Plan: standalone — TENANT-01 (ADR-V7-01), TENANT-02 (migrate seedDefaults + delete src/lib/tenant.ts), TENANT-03 (tighten static invariant + rejected-pattern guard). Commits LOCAL on main, NOT yet pushed.
Status: withTenant() removed; direct-predicate is the single pattern (139 sites); `grep withTenant( src` → 0. typecheck + lint green; 1095 tests passing (+1 = new rejected-pattern test; only pre-existing imports.api env-harness suite fails). pnpm audit still clean (0/0/0/0). Earlier this session: Phase 54.5 dependency remediation pushed (origin/main @ aa2c823).
Last activity: 2026-05-28 — Phase 55 consolidated tenant scoping to one pattern, guarded against regression

### Phase 54 plan structure

| Plan | Wave | Reqs | Objective |
|------|------|------|-----------|
| 54-01 | 1 | AUDIT-07 | 10 RuleTester cases for execute\|promote\|apply\|cancel\|stage prefixes |
| 54-02 | 1 | AUDIT-01..05 | 5 legacy service shims delegating to register.service.ts + actorUserId threading through 10 route handlers |
| 54-03 | 2 | AUDIT-06 | 5 per-entity contract tests + mutations.json manifest regen |

### v7.0 Phase Overview

| # | Phase | Requirements | Status |
|---|-------|--------------|--------|
| 54 | Audit-spine + eslint regex expansion | AUDIT-01..07 | ✅ Complete (3 plans, 2026-05-28) |
| 54.5 | Dependency security remediation | (ad-hoc cross-cutting) | ✅ Complete (6 commits, 2026-05-28) — audit 0/0/0/0, PUSHED |
| 55 | Tenant-isolation consolidation | TENANT-01..03 | ✅ Complete (2026-05-28) — ADR-V7-01, wrapper removed |
| 55 | Tenant-isolation consolidation | TENANT-01..03 | Not started |
| 56 | Change-log enum expansion | CHLOG-01..03 | Not started |
| 57 | E2E CI rehab | E2E-01..04 | Not started |
| 58 | Dev-env harness fixes | QUAL-04..06 | Not started |
| 59 | Localization completeness | L10N-01..04 | Not started |
| 60 | Responsive design baseline | RESP-01..04 | Not started |
| 61 | A11y consistency | A11Y-01..03 | Not started |

## Accumulated Context

### v7.0 Locked Decisions (forming)

To be added as decisions land during phases. Phase 55 ADR (TENANT-01) will be the first.

### v6.0 Locked Decisions (inherited, still binding)

- **Feature-flag gating mandatory** for every restructure wave — independent kill-switches.
- **`next.config.redirects[]`** is the chosen mechanism for deleted-route redirects (308 permanent, preserves query strings).
- **i18n keys land under `sidebar.personaSections.*`** to avoid collision.
- **Widget-registry defensive fallback** — unknown widget IDs render placeholder, never throw.
- **SOFT gate over HARD gate** for viewport-fit diagnostics — emit JSON artifacts to CI rather than failing builds.

### v5.0 Locked Decisions (inherited, still binding)

- **ADR-004** Personas are UX shortcuts, not security boundaries.
- **Q5** Staff read-only "My Schedule" only.
- **Q6** Historic edits allowed with soft warning, no hard locks.
- **ISO 8601 + 53-week year** first-class. 2026 is a 53-week year. Swedish holidays 2026–2030 hardcoded.
- **Universal change_log** enforced via eslint + codegen + runtime test (TC-CL-005).

### Pending Todos

- All v6.0 53-HUMAN-UAT items closed (see prior STATE.md history)

### Blockers/Concerns

- **Dev env harness gaps** logged during Phase 53 UAT — addressed by v7.0 Phase 58 (QUAL-04..06):
  - `/api/test/seed` fails under neon-http driver (no transactions)
  - `/api/v5/proposals/queue/count` + `/api/v5/capacity/overcommit/count` 404 in dev Turbopack
  - Route-level `requireRole()` returns 401 even with `E2E_TEST` proxy bypass
  - Intermittent Turbopack panics on `/team/page`
- **E2E CI job disabled** since 2026-04-28 (`a60b493`) — addressed by v7.0 Phase 57. Recommended ordering: Phase 58 first (harness) then Phase 57 (CI restore) so the harness fixes are available when E2E runs.

## Deferred Items (from prior milestones)

See PROJECT.md "Carried-Forward (deferred beyond v7.0)" section.

Phase 54 of v6.0 (Dashboard quadrant redesign, QUAD-01..03) is deferred indefinitely — telemetry-gated, no signal at v6.0 close. The Phase 54 numeric slot is reused by v7.0 (Audit-spine + eslint regex expansion); the deferred quadrant work remains documented under REQUIREMENTS.md "v8+ deferred."

## Session Continuity

Last session: 2026-05-13 — Phase 54 research (582-line RESEARCH.md) + planning (3 PLAN.md files, 2 waves) + verification (gsd-plan-checker PASSED with 0 blockers)
Stopped at: Phase 54 ready to execute; awaiting `/gsd-execute-phase 54`

---

_Last updated: 2026-05-13 — Phase 54 planned (3 plans across 2 waves, AUDIT-01..07 covered, verification passed)._
