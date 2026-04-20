---
phase: 49-unbreak-broken-persona-surfaces
plan: 03
subsystem: database
tags: [drizzle, neon, postgres, migrations, schema-drift]

requires:
  - phase: 49-research
    provides: "Root cause analysis: dev Neon branch had 5 of 9 migrations applied, missing archived_at + change_log"
provides:
  - "Dev Neon branch schema fully aligned with drizzle migration journal (9/9 migrations)"
  - "Admin pages (/admin, /admin/people, /admin/departments, /admin/disciplines, /admin/programs) load without 500"
  - "Production Neon branch deploy checklist for the same migration remediation"
affects: [49-04-playwright-specs, production-deploy]

tech-stack:
  added: []
  patterns:
    - "Neon branch snapshot before migration for rollback safety"
    - "Migration 0003 manual seed pattern when tracker/schema diverge"

key-files:
  created:
    - .planning/phases/49-unbreak-broken-persona-surfaces/49-03-EVIDENCE.md
    - .planning/phases/49-unbreak-broken-persona-surfaces/PROD-NEON-MIGRATION-CHECKLIST.md
  modified: []

key-decisions:
  - "Manual seed of 0003 objects (change_log table + enums) required before db:migrate because tracker showed 0003 as applied but objects were absent"
  - "Neon CLI unavailable locally -- rollback documented via dashboard branch-restore instead"
  - "Production migration deferred to next deploy -- Phase 49 only authors the checklist"

patterns-established:
  - "Pre/post-migration evidence capture pattern for Drizzle on Neon"
  - "Migration idempotency audit before running db:migrate on drifted branches"

requirements-completed: [UNBREAK-04, UNBREAK-05]

duration: 14min
completed: 2026-04-20
---

# Phase 49 Plan 03: Admin 500 Fix Summary

**Dev Neon branch migration drift remediated (5 to 9 migrations) -- all 5 admin pages restored from 500 to working state, production deploy checklist authored**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-20T09:05:00Z
- **Completed:** 2026-04-20T09:19:13Z
- **Tasks:** 5
- **Files created:** 2

## Accomplishments
- Identified and documented pre-migration state: dev Neon branch had 5 migrations tracked but migration 0003's DDL objects (change_log table, two enums) were absent despite being marked as applied
- Manually seeded 0003 objects, then ran `pnpm db:migrate` to apply migrations 0005-0008, bringing the branch to 9/9 migrations
- Verified all 5 admin pages (`/admin`, `/admin/people`, `/admin/departments`, `/admin/disciplines`, `/admin/programs`) load without errors
- Authored production Neon branch deploy checklist with pre-deploy snapshot, idempotency carry-over, execution steps, post-deploy verification, and rollback plan

## Task Commits

Each task was committed atomically:

1. **Task 1: Pre-migration snapshot** - `03304a3` (docs)
2. **Task 2: Migration 0003 idempotency check + manual seed** - `097a3dd` (docs)
3. **Task 3: Run pnpm db:migrate + post-migration state** - `5e87167` (docs)
4. **Task 4: Browser smoke test (checkpoint)** - APPROVED by operator (no commit -- verification only)
5. **Task 5: Production deploy checklist** - `bb91c9b` (docs)

## Files Created/Modified
- `.planning/phases/49-unbreak-broken-persona-surfaces/49-03-EVIDENCE.md` - Pre/post-migration evidence with snapshot queries, idempotency analysis, migration execution capture, and smoke test results
- `.planning/phases/49-unbreak-broken-persona-surfaces/PROD-NEON-MIGRATION-CHECKLIST.md` - Production deploy checklist with rollback procedure, not executed in Phase 49

## Decisions Made
- **Manual 0003 seed required:** Migration 0003 was tracked as applied but its DDL objects were absent (Neon branch created from pre-0003 snapshot with tracker populated separately). Manually created the enums and table before running `db:migrate`.
- **Neon CLI unavailable:** Rollback documented via Neon dashboard branch-restore rather than CLI branch creation.
- **Production deferred:** The identical migration must be run against production at next deploy -- checklist authored but NOT executed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `drizzle.config.ts` reads from `dotenv/config` (`.env` not `.env.local`). Required temporary `.env` copy for the migration run, removed immediately after. Documented in evidence.

## User Setup Required
None - no external service configuration required. Production migration is a future deploy step documented in `PROD-NEON-MIGRATION-CHECKLIST.md`.

## Next Phase Readiness
- All 5 admin pages functional on dev -- UNBREAK-04 and UNBREAK-05 closed
- Production Neon branch still needs the same migration at next deploy (checklist ready)
- Plan 49-04 (Playwright spec updates) can proceed -- admin pages now return 200

---
*Phase: 49-unbreak-broken-persona-surfaces*
*Completed: 2026-04-20*
