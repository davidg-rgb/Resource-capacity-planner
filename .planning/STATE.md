---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: Foundation & Quality
status: Started 2026-05-11 — defining requirements
stopped_at: v7.0 milestone initialized; requirements pending roadmap
last_updated: "2026-05-11T00:00:00.000Z"
last_activity: 2026-05-11
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Nordic Capacity -- Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-11 — v7.0 Foundation & Quality started)

v7.0 planning artifacts (in progress):
- .planning/REQUIREMENTS.md — milestone requirements (this milestone)
- .planning/ROADMAP.md — phase structure (pending roadmapper)

v6.0 artifacts (completed, do not re-review):
- .planning/milestones/v6.0-REQUIREMENTS.md (archived)
- .planning/milestones/v6.0-ROADMAP.md (archived)
- .planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md (v6.0 source of truth)

Recent context:
- .planning/CODE-REVIEW-2026-05-10.md — 22 fixes landed; HI-03, MED-02, MED-03 deferred to v7.0
- .planning/CLEANUP-REVIEW-2026-05-11.md — codebase-surgeon pass (-285 lines dead code)
- .planning/UI-REVIEW-2026-05-11.md — frontend-app-reviewer audit + 7 fix commits

**Core value (this milestone):** Close architectural debt so v8.0 features land on a clean foundation. Audit-spine coverage, tenant-isolation consistency, change-log enum completeness, eslint guard coverage, E2E CI restoration, localization parity, responsive baseline, a11y consistency. **No new product features.**

**Current focus:** Requirements definition → roadmap.

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-11 — Milestone v7.0 started

## Accumulated Context

### v7.0 Locked Decisions (forming)

To be added as decisions land during phases.

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

- **Dev env harness gaps** logged during Phase 53 UAT — addressed by v7.0 Category 6 (QUAL-04..06):
  - `/api/test/seed` fails under neon-http driver (no transactions)
  - `/api/v5/proposals/queue/count` + `/api/v5/capacity/overcommit/count` 404 in dev Turbopack
  - Route-level `requireRole()` returns 401 even with `E2E_TEST` proxy bypass
  - Intermittent Turbopack panics on `/team/page`

## Deferred Items (from prior milestones)

See PROJECT.md "Carried-Forward (deferred beyond v7.0)" section.

## Session Continuity

Last session: 2026-05-11 — frontend-app-reviewer Phase 6 complete, 9 commits pushed to origin/main
Stopped at: v7.0 milestone initialized; requirements drafted

---

_Last updated: 2026-05-11 — v7.0 Foundation & Quality milestone initialized._
