---
phase: 54-audit-spine-eslint-regex-expansion
plan: 02
subsystem: api
tags: [audit-spine, change-log, register-service, route-handlers, drizzle]

requires:
  - phase: 43-admin-register-maintenance
    provides: register.service.ts dispatcher (createRegisterRow/updateRegisterRow/archiveRegisterRow) writing change_log inside each tx (ADR-003)
provides:
  - 5 legacy register services rewritten as thin shims delegating to register.service.ts
  - actorUserId threaded from requireRole('admin') through 15 mutating route handlers
  - every POST/PATCH/DELETE on /api/{people,projects,programs,departments,disciplines}/* now emits a change_log row
affects: [54-03, future v8 route→register direct cleanup]

tech-stack:
  added: []
  patterns: [service-shim delegation (Pattern 1); actorUserId positional threading from auth into service]

key-files:
  created: []
  modified:
    - src/features/people/person.service.ts
    - src/features/projects/project.service.ts
    - src/features/programs/program.service.ts
    - src/features/departments/department.service.ts
    - src/features/disciplines/discipline.service.ts
    - src/app/api/people/route.ts
    - src/app/api/people/[id]/route.ts
    - src/app/api/projects/route.ts
    - src/app/api/projects/[id]/route.ts
    - src/app/api/programs/route.ts
    - src/app/api/programs/[id]/route.ts
    - src/app/api/departments/route.ts
    - src/app/api/departments/[id]/route.ts
    - src/app/api/disciplines/route.ts
    - src/app/api/disciplines/[id]/route.ts

key-decisions:
  - "Pattern 1 (service-shim delegation) over route→register-direct: smallest diff, preserves all import paths"
  - "Committed Task 1 (services) + Task 2 (routes) as ONE atomic commit — split would leave a typecheck-broken state on main"
  - "delete of program/department/discipline is now a soft archive via archiveRegisterRow, not a hard delete (aligns legacy routes with the v5 admin register route)"
  - "409 dependent-row shape changed from ConflictError(usageCount) to ConflictError('DEPENDENT_ROWS_EXIST', {entity,id,blockers})"
  - "Removed assertRefsInTenant from person.service — register.service.ts already does the tenant-scoped FK check"

patterns-established:
  - "Legacy <entity>.service mutation fns are thin shims: return {create|update|archive}RegisterRow({orgId, actorUserId, entity, id?, data?})"

requirements-completed: [AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05]

duration: ~30min
completed: 2026-05-28
---

# Phase 54 / Plan 02: legacy register routes now flow through the audit spine

**5 legacy register services delegate to register.service.ts and 15 mutating route handlers thread actorUserId, so every PUT/POST/DELETE on the people/projects/programs/departments/disciplines routes writes a change_log row**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-05-28
- **Tasks:** 2 (committed as 1 atomic change)
- **Files modified:** 15

## Accomplishments
- Rewrote all 5 legacy services' create/update/delete|archive functions as thin shims that delegate to the register.service.ts dispatcher (which records change_log in-tx)
- Threaded `userId` from `requireRole('admin')` as `actorUserId` into all 15 mutating handlers
- Preserved every route response envelope, status code, GET handler, and auth gate
- typecheck + lint green; full suite 1074 passing with zero regressions (existing register.integration/audit/dependents + both rbac contracts all green)

## Task Commits

1. **Task 1 (services) + Task 2 (routes)** - `465dba5` (refactor) — committed atomically because the signature change and call-site change are indivisible (either half alone breaks typecheck)

## Files Created/Modified
- 5 `*.service.ts` - mutation fns → shims delegating to register.service.ts; `withTenant`/`ConflictError`/`assertRefsInTenant` removed where now redundant; read helpers untouched
- 10 route files - `{ orgId, userId } = await requireRole('admin')` + `userId` passed as 2nd positional arg to each service call

## Decisions Made
- See key-decisions frontmatter. Notably the deliberate behavior alignment: program/department/discipline DELETE is now a soft archive with the v5 `DEPENDENT_ROWS_EXIST` blocker shape, replacing the legacy hard-delete + `usageCount` 409.

## Deviations from Plan
- **Combined Task 1 and Task 2 into one commit** (plan implied two). Rationale: Task 1 alone leaves the 10 routes failing typecheck (2-arg calls to now-3/4-arg fns); committing that intermediate state to `main` (branching=none) would break the build. Verified the service refactor in isolation first (typecheck showed exactly 15 route-layer arg errors and nothing else), then closed routes, then one green commit.

## Issues Encountered
- Checked the `nordic/require-change-log` lint risk the plan flagged: the rule does NOT fire on pure-delegation shims (no direct DB write in the body), so no `@no-change-log` escape hatch was needed.
- `usageCount` consumer check: the 409 shape change is internal to the archive path; the admin UI already consumes the `DEPENDENT_ROWS_EXIST` shape (use-admin-registers.ts:DependentRowsError).

## User Setup Required
None.

## Next Phase Readiness
- AUDIT-01..05 closed. 54-03 adds the per-entity contract tests that prove the change_log writes end-to-end.

---
*Phase: 54-audit-spine-eslint-regex-expansion*
*Completed: 2026-05-28*
