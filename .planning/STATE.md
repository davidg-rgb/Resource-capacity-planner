---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: Foundation & Quality
status: Phase 56 (Change-log enum expansion) COMPLETE 2026-05-31 — scenario + import_session mutations now on the audit spine; migration 0010
stopped_at: Phase 56 COMPLETE — CHLOG-01..03 closed. Migration 0010 adds 3 change_log_entity + 6 change_log_action values (hand-written idempotent ADD VALUE IF NOT EXISTS, journaled idx 9). All five @no-change-log hatches removed: createScenario (now tx-wrapped) / updateScenario / deleteScenario / upsertScenarioAllocations (one row/op, counts in context) / parseAndStageActuals (IMPORT_SESSION_STAGED) / cancelStaged (IMPORT_SESSION_CANCELLED); commit stays under import_batch (no double-log). userId threaded through allocations PUT + imports DELETE routes. typecheck + lint (incl check:mutations-manifest) green; 1101 tests pass (+6; only pre-existing imports.api env-harness suite fails — regression override in 56-GATES.md). Phase 55 was PUSHED this session (origin/main @ ef345d6). Phase 56 commits are LOCAL, NOT yet pushed. IRREVERSIBLE STEP PENDING: migration 0010 not yet applied to prod-equivalent DB (no DROP VALUE in Postgres). NEXT TASK: Phase 57 — E2E CI rehab (E2E-01..04) OR Phase 58 dev-env harness (unblocks imports.api). See .planning/phases/56-change-log-enum-expansion/56-SUMMARY.md.
last_updated: "2026-05-31T12:30:00.000Z"
last_activity: 2026-05-31
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 5
  completed_plans: 5
  percent: 38
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

**Current focus:** Phase 56 (Change-log enum expansion) COMPLETE — CHLOG-01..03 closed. The universal `change_log` audit spine now covers `scenario`, `scenario_allocation`, and `import_session` mutations (the last three `@no-change-log` hatches removed). Migration `0010` adds those 3 entity values + 6 action values (`SCENARIO_CREATED/UPDATED/DELETED`, `SCENARIO_ALLOCATIONS_UPSERTED`, `IMPORT_SESSION_STAGED/CANCELLED`) — hand-written idempotent `ADD VALUE IF NOT EXISTS` because the drizzle snapshot froze at `0006` (repo convention: `0007`+ are raw-SQL). `createScenario` is now transactional (ADR-003). Commit stays audited under `import_batch` (no double-log). **IRREVERSIBLE STEP PENDING:** migration `0010` is committed but NOT yet applied to the prod-equivalent DB. Phase 55 was pushed this session (`origin/main @ ef345d6`); Phase 56 commits are LOCAL, not yet pushed. **Next task = Phase 57 (E2E CI rehab) or Phase 58 (dev-env harness — would unblock the imports.api suite).** See `.planning/phases/56-change-log-enum-expansion/56-SUMMARY.md`.

## Current Position

Phase: 56 — Change-log enum expansion (COMPLETE 2026-05-31)
Plan: 56-01 enum expansion (migration 0010) · 56-02 service wiring · 56-03 tests + manifest — executed inline. Commits LOCAL on main, NOT yet pushed.
Status: scenario + import_session lifecycle mutations audited; 5 `@no-change-log` hatches removed; migration 0010 committed (NOT applied to prod-equivalent DB yet). typecheck + lint (incl check:mutations-manifest) green; 1101 tests passing (+6 from the new phase-56 contract+smoke suite; only pre-existing imports.api env-harness suite fails — regression override recorded in 56-GATES.md). pnpm audit clean (0/0/0/0). Production-tier exec-gates pass.
Last activity: 2026-05-31 — Phase 56 brought scenario + import_session mutations onto the change_log audit spine

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
