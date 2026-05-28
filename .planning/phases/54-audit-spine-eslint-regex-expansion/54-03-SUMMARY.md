---
phase: 54-audit-spine-eslint-regex-expansion
plan: 03
subsystem: testing
tags: [audit-spine, contract-test, change-log, pglite, mutations-manifest]

requires:
  - phase: 54-02
    provides: legacy register routes delegating to register.service.ts
  - phase: 43-admin-register-maintenance
    provides: register.test-fixtures.ts (PGlite bootstrap reused as-is)
provides:
  - 5 per-entity PGlite HTTP contract tests proving change_log is written for every POST/PATCH/DELETE on the legacy routes
affects: [future audit-spine regressions, Phase 55+ register work]

tech-stack:
  added: []
  patterns: [per-entity audit.contract.test.ts cloning register.integration prelude; vi.mock(@/db,@/lib/auth) + dynamic route import + change_log row assertions]

key-files:
  created:
    - src/features/people/__tests__/audit.contract.test.ts
    - src/features/projects/__tests__/audit.contract.test.ts
    - src/features/programs/__tests__/audit.contract.test.ts
    - src/features/departments/__tests__/audit.contract.test.ts
    - src/features/disciplines/__tests__/audit.contract.test.ts
  modified: []

key-decisions:
  - "5 separate files (one per entity) over a parameterized it.each — matches the literal 'one test per entity' requirement and keeps each feature folder owning its audit guarantee"
  - "mutations.json NOT regenerated with new entries: the generator tracks DIRECT recordChange writers (the register.service dispatcher, already listed), not delegating shims — so it correctly stays at 22 entries"

patterns-established:
  - "Per-entity audit contract test: create→update→delete via route handlers asserts exactly 3 change_log rows [CREATED,UPDATED,DELETED] all attributed to actor userId"

requirements-completed: [AUDIT-06]

duration: ~20min
completed: 2026-05-28
---

# Phase 54 / Plan 03: per-entity change_log contract tests

**5 PGlite HTTP contract tests (20 cases) prove every legacy register route's POST/PATCH/DELETE writes a change_log row attributed to the acting admin user — and that project DELETE archives the row**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-05-28
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- One contract test per entity (people/projects/programs/departments/disciplines), each with 4 `it` blocks: POST→1 CREATED, PATCH→1 UPDATED, DELETE→1 DELETED (204), and an aggregate create→update→delete→exactly-3-rows-in-order
- Every test asserts `actorPersonaId === fakeAuth.userId` (proves the route threaded `userId`, not `orgId`)
- projects test additionally asserts DELETE leaves `status='archived'` AND `archivedAt != null`
- 20 new tests green; full suite 1094 passing; `check:mutations-manifest` + `change-log.coverage` invariant both green

## Task Commits

1. **Task 1: 5 audit contract tests** + **Task 2: manifest verification** - `8d010d0` (test)

## Files Created/Modified
- 5 `src/features/<entity>/__tests__/audit.contract.test.ts` - PGlite + vi.mock prelude (cloned from register.integration.test.ts) + 4 `it` blocks each

## Decisions Made
- See key-decisions frontmatter.

## Deviations from Plan
- **mutations.json was NOT given 15 new shim entries** (the plan's Task 2 acceptance expected them). Root cause: the plan mis-modeled `generate-mutations-manifest.ts`. The generator records functions that DIRECTLY call `recordChange` (the audit-spine writers — `register.service.ts` dispatcher, already present), not delegating shims. So the shims (`createPerson` etc.) are correctly absent and the manifest stays at 22 entries with no drift. `check:mutations-manifest` exits 0 and `change-log.coverage.test.ts` passes. The shims' audit guarantee is proven by these contract tests instead — which is the stronger end-to-end proof. No manual edit of the codegen file was made (the plan forbids it).

## Issues Encountered
- None. The pre-commit `eslint --fix`/prettier reformatted some line-wrapping in the new files (cosmetic); tests unaffected.

## User Setup Required
None.

## Next Phase Readiness
- AUDIT-06 closed. With 54-01 (AUDIT-07) and 54-02 (AUDIT-01..05), all 7 phase requirements are closed.

---
*Phase: 54-audit-spine-eslint-regex-expansion*
*Completed: 2026-05-28*
