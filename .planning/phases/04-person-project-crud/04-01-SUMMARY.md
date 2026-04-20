---
phase: 04-person-project-crud
plan: 01
subsystem: api
tags: [tanstack-query, drizzle, crud, zod, person, tenant-scoped]

requires:
  - phase: 02-database-schema-tenant-isolation
    provides: "Drizzle schema with people table, withTenant() query builder"
  - phase: 03-authentication-app-shell
    provides: "getTenantId(), requireRole() auth helpers, error taxonomy"
provides:
  - "Person CRUD API endpoints (GET/POST/PATCH/DELETE /api/people)"
  - "Person service layer with soft-delete pattern"
  - "TanStack Query hooks for people (usePeople, useCreatePerson, useUpdatePerson, useDeletePerson)"
  - "handleApiError shared utility for DRY route error handling"
  - "QueryProvider wrapping app layout"
  - "Working Team page with CRUD UI"
  - "Minimal department/discipline list endpoints for dropdowns"
affects: [04-02-project-crud, 05-reference-data-admin, 06-ag-grid-spike]

tech-stack:
  added: ["@tanstack/react-query"]
  patterns: ["feature module (types/schema/service)", "handleApiError DRY pattern", "soft-delete via archivedAt", "TanStack Query cache invalidation"]

key-files:
  created:
    - src/lib/api-utils.ts
    - src/components/providers/query-provider.tsx
    - src/features/people/person.types.ts
    - src/features/people/person.schema.ts
    - src/features/people/person.service.ts
    - src/app/api/people/route.ts
    - src/app/api/people/[id]/route.ts
    - src/hooks/use-people.ts
    - src/app/(app)/team/page.tsx
    - src/app/api/departments/route.ts
    - src/app/api/disciplines/route.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - src/app/(app)/layout.tsx

key-decisions:
  - "Manual Zod schemas over drizzle-zod (Zod 4 compatibility uncertainty)"
  - "Direct db.select() in listPeople for flexible WHERE composition instead of chaining on withTenant().people()"
  - "Soft-delete uses withTenant().updatePerson to set archivedAt rather than hard delete"

patterns-established:
  - "Feature module: types + schema + service under src/features/{entity}/"
  - "API route pattern: try/catch wrapping handleApiError for consistent error responses"
  - "TanStack Query hooks: queryKey-based cache invalidation on mutations"
  - "Next.js 16 route params: { params: Promise<{ id: string }> } with await"

requirements-completed: [MGMT-01]

duration: 3min
completed: 2026-03-26
---

# Phase 4 Plan 1: Person CRUD Summary

**Person CRUD vertical slice with TanStack Query hooks, tenant-scoped API routes, soft-delete pattern, and working Team page UI**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T13:48:11Z
- **Completed:** 2026-03-26T13:51:40Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Full person CRUD API: GET/POST /api/people, GET/PATCH/DELETE /api/people/:id with tenant scoping and role-based access
- Person service layer with listPeople (filter, search, archived exclusion), getPersonById, createPerson, updatePerson, deletePerson (soft-delete)
- TanStack Query integration: QueryProvider in app layout, hooks with automatic cache invalidation
- Working Team page with create/edit form, delete confirmation, loading/error states, department/discipline dropdown support

## Task Commits

Each task was committed atomically:

1. **Task 1: Install TanStack Query, create shared API utils, person feature module, and API routes** - `ffc595f` (feat)
2. **Task 2: Person TanStack Query hooks and Team page UI with CRUD** - `0015ec0` (feat)

## Files Created/Modified
- `src/lib/api-utils.ts` - handleApiError utility for consistent API error responses
- `src/components/providers/query-provider.tsx` - TanStack Query client provider
- `src/features/people/person.types.ts` - PersonRow, PersonCreate, PersonUpdate, PersonFilter types
- `src/features/people/person.schema.ts` - Zod 4 validation schemas for create/update
- `src/features/people/person.service.ts` - Business logic with tenant-scoped queries
- `src/app/api/people/route.ts` - GET (list) and POST (create) endpoints
- `src/app/api/people/[id]/route.ts` - GET, PATCH, DELETE endpoints with Next.js 16 param handling
- `src/hooks/use-people.ts` - usePeople, useCreatePerson, useUpdatePerson, useDeletePerson, useDepartments, useDisciplines
- `src/app/(app)/team/page.tsx` - Full CRUD UI with table, form, loading/error states
- `src/app/api/departments/route.ts` - Minimal GET endpoint for dropdown data
- `src/app/api/disciplines/route.ts` - Minimal GET endpoint for dropdown data
- `src/app/(app)/layout.tsx` - Added QueryProvider wrapper
- `src/components/layout/app-shell.tsx` - Minimal app shell (worktree deviation)
- `src/components/layout/breadcrumbs.tsx` - Breadcrumb navigation component (worktree deviation)

## Decisions Made
- Used manual Zod 4 schemas instead of drizzle-zod (Zod 4 compatibility not guaranteed)
- Used direct db.select() in listPeople for flexible WHERE composition rather than chaining on withTenant().people() which may overwrite the WHERE clause
- Created minimal app-shell and breadcrumbs components as worktree deviation (phase 3 app shell not available in this parallel worktree)
- Added minimal department/discipline GET endpoints early (planned for Phase 5) to support person form dropdowns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created minimal app shell and breadcrumbs components**
- **Found during:** Task 1 (layout setup)
- **Issue:** Worktree branched from phase 03-01 completion; app shell components from 03-02 not available
- **Fix:** Created minimal app-shell.tsx and breadcrumbs.tsx to unblock layout and team page
- **Files modified:** src/components/layout/app-shell.tsx, src/components/layout/breadcrumbs.tsx
- **Verification:** TypeScript compiles clean
- **Committed in:** ffc595f (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added department/discipline list endpoints**
- **Found during:** Task 2 (Team page UI)
- **Issue:** Person form needs department/discipline dropdowns but no API endpoints exist yet (Phase 5 scope)
- **Fix:** Created minimal read-only GET /api/departments and GET /api/disciplines using withTenant()
- **Files modified:** src/app/api/departments/route.ts, src/app/api/disciplines/route.ts
- **Verification:** TypeScript compiles, hooks reference correct endpoints
- **Committed in:** 0015ec0 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both necessary for correctness. App shell stubs will be superseded when phase 3 merges. Department/discipline endpoints are minimal and aligned with Phase 5 plans.

## Issues Encountered
None beyond the documented deviations.

## Known Stubs
None - all data flows are wired to real API endpoints backed by tenant-scoped database queries.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Person CRUD complete, ready for Project CRUD (04-02)
- handleApiError and feature module pattern established for reuse
- TanStack Query infrastructure ready for all future client-side data needs

## Self-Check: PASSED

- All 11 created files verified present on disk
- Commit ffc595f verified in git log
- Commit 0015ec0 verified in git log
- TypeScript compiles with zero errors

---
*Phase: 04-person-project-crud*
*Completed: 2026-03-26*
