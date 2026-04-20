---
phase: 05-reference-data-admin
plan: 01
subsystem: api
tags: [drizzle, zod, crud, reference-data, tenant-isolation]

requires:
  - phase: 02-database-schema-tenant-isolation
    provides: DB schema for departments, disciplines, programs tables
  - phase: 03-authentication-app-shell
    provides: getTenantId, requireRole auth helpers
  - phase: 04-person-project-crud
    provides: person/project service pattern, withTenant helpers, handleApiError

provides:
  - Discipline CRUD API (GET/POST collection, GET/PATCH/DELETE individual)
  - Department CRUD API (GET/POST collection, GET/PATCH/DELETE individual)
  - Program CRUD API (GET/POST collection, GET/PATCH/DELETE individual)
  - Usage-count delete protection for all 3 entities
  - FK violation (23503) error handler in api-utils.ts
  - withTenant update/delete helpers for departments, disciplines

affects: [05-02-admin-ui, 06-ag-grid, 08-import-wizard]

tech-stack:
  added: []
  patterns:
    - "Reference data service pattern: list/getById/create/update/delete + usageCount"
    - "Usage-count delete protection: check dependents before allowing deletion"
    - "FK violation handler: Postgres 23503 mapped to 409 ConflictError"

key-files:
  created:
    - src/features/disciplines/discipline.service.ts
    - src/features/disciplines/discipline.schema.ts
    - src/features/disciplines/discipline.types.ts
    - src/features/departments/department.service.ts
    - src/features/departments/department.schema.ts
    - src/features/departments/department.types.ts
    - src/features/programs/program.service.ts
    - src/features/programs/program.schema.ts
    - src/features/programs/program.types.ts
    - src/app/api/disciplines/[id]/route.ts
    - src/app/api/departments/[id]/route.ts
    - src/app/api/programs/[id]/route.ts
  modified:
    - src/lib/tenant.ts
    - src/lib/api-utils.ts
    - src/app/api/disciplines/route.ts
    - src/app/api/departments/route.ts
    - src/app/api/programs/route.ts

key-decisions:
  - "Usage count checks at service layer before delete, not at DB constraint level, for clear error messages with counts"
  - "Programs count non-archived projects (ne status archived), disciplines/departments count non-archived people (isNull archivedAt)"

patterns-established:
  - "Reference data CRUD: types + schema + service per entity, usage count query for delete protection"
  - "GET individual returns entity + usageCount for UI delete confirmation"

requirements-completed: [MGMT-03, MGMT-04, MGMT-05]

duration: 3min
completed: 2026-03-26
---

# Phase 5 Plan 1: Reference Data CRUD APIs Summary

**Discipline, department, and program CRUD APIs with Zod validation, tenant isolation, admin role gating, and usage-count delete protection**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T16:05:26Z
- **Completed:** 2026-03-26T16:08:19Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Full CRUD service layer for disciplines, departments, and programs with tenant-scoped queries
- Usage-count delete protection preventing deletion of in-use reference data with clear error messages
- 6 API route files (3 collection GET+POST, 3 individual GET+PATCH+DELETE) with proper role gating
- FK violation error handler (Postgres 23503) returning structured 409 responses
- withTenant helpers extended with update/delete for departments and disciplines

## Task Commits

Each task was committed atomically:

1. **Task 1: Add missing withTenant helpers and FK error handling** - `8dcf0c1` (feat)
2. **Task 2: Create feature modules and API routes for all 3 entities** - `761ca16` (feat)

## Files Created/Modified
- `src/lib/tenant.ts` - Added updateDepartment, updateDiscipline, deleteDepartment, deleteDiscipline, deleteProgram helpers
- `src/lib/api-utils.ts` - Added Postgres 23503 foreign_key_violation handler
- `src/features/disciplines/discipline.types.ts` - DisciplineRow, DisciplineCreate, DisciplineUpdate types
- `src/features/disciplines/discipline.schema.ts` - Zod create/update schemas for disciplines
- `src/features/disciplines/discipline.service.ts` - CRUD + usage count service functions
- `src/features/departments/department.types.ts` - DepartmentRow, DepartmentCreate, DepartmentUpdate types
- `src/features/departments/department.schema.ts` - Zod create/update schemas for departments
- `src/features/departments/department.service.ts` - CRUD + usage count service functions
- `src/features/programs/program.types.ts` - ProgramRow, ProgramCreate, ProgramUpdate types
- `src/features/programs/program.schema.ts` - Zod create/update schemas for programs
- `src/features/programs/program.service.ts` - CRUD + usage count service functions
- `src/app/api/disciplines/route.ts` - GET (list) + POST (create, admin only)
- `src/app/api/disciplines/[id]/route.ts` - GET (with usageCount) + PATCH + DELETE (admin only)
- `src/app/api/departments/route.ts` - GET (list) + POST (create, admin only)
- `src/app/api/departments/[id]/route.ts` - GET (with usageCount) + PATCH + DELETE (admin only)
- `src/app/api/programs/route.ts` - GET (list) + POST (create, admin only)
- `src/app/api/programs/[id]/route.ts` - GET (with usageCount) + PATCH + DELETE (admin only)

## Decisions Made
- Usage count checks performed at service layer before delete (not relying solely on DB FK constraints) to provide user-friendly error messages with exact counts
- Programs usage count checks non-archived projects (ne status 'archived'); disciplines/departments check non-archived people (isNull archivedAt)
- GET individual endpoints return both entity and usageCount to enable UI delete confirmation dialogs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 reference data CRUD APIs ready for admin UI pages (Plan 02)
- Service functions exported and ready for consumption by admin components
- Usage count responses enable delete confirmation UX in admin forms

## Self-Check: PASSED

All 17 files verified present. Both task commits (8dcf0c1, 761ca16) verified in git log. TypeScript and ESLint pass cleanly.

---
*Phase: 05-reference-data-admin*
*Completed: 2026-03-26*
