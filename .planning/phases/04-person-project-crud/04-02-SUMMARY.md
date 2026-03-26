---
phase: 04-person-project-crud
plan: 02
subsystem: api
tags: [tanstack-query, drizzle, crud, zod, project, tenant-scoped]

requires:
  - phase: 02-database-schema-tenant-isolation
    provides: "Drizzle schema with projects table, withTenant() query builder"
  - phase: 03-authentication-app-shell
    provides: "getTenantId(), requireRole() auth helpers, error taxonomy"
  - plan: 04-01
    provides: "handleApiError, QueryProvider, feature module pattern"
provides:
  - "Project CRUD API endpoints (GET/POST/PATCH/DELETE /api/projects)"
  - "Project service layer with archive pattern (not hard-delete)"
  - "TanStack Query hooks for projects (useProjects, useCreateProject, useUpdateProject, useArchiveProject)"
  - "Minimal programs list endpoint for dropdown"
  - "Working Projects page with CRUD UI"
affects: [05-reference-data-admin, 06-ag-grid-spike]

tech-stack:
  added: ["@tanstack/react-query"]
  patterns: ["feature module (types/schema/service)", "archive via status+archivedAt", "TanStack Query cache invalidation", "status badges"]

key-files:
  created:
    - src/features/projects/project.types.ts
    - src/features/projects/project.schema.ts
    - src/features/projects/project.service.ts
    - src/app/api/projects/route.ts
    - src/app/api/projects/[id]/route.ts
    - src/hooks/use-projects.ts
    - src/app/(app)/projects/page.tsx
    - src/app/api/programs/route.ts
    - src/lib/api-utils.ts
    - src/components/providers/query-provider.tsx
    - src/components/layout/app-shell.tsx
    - src/components/layout/breadcrumbs.tsx
    - src/app/(app)/layout.tsx
  modified:
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Manual Zod schemas over drizzle-zod (Zod 4 compatibility uncertainty, same as Plan 01)"
  - "Direct db.select() in listProjects for flexible WHERE composition with ne() archived filter"
  - "Archive pattern: updateProject sets status='archived' and archivedAt (DELETE route archives, not hard-deletes)"
  - "Status badges with Tailwind utility classes (green=active, blue=planned)"

patterns-established:
  - "Project feature module: types + schema + service under src/features/projects/"
  - "Archive vs hard-delete: projects use status enum + archivedAt, excluded from default list via ne()"
  - "Program dropdown: minimal read-only GET /api/programs for form selects"

requirements-completed: [MGMT-02]

duration: 3min
completed: 2026-03-26
---

# Phase 4 Plan 2: Project CRUD Summary

**Project CRUD vertical slice with tenant-scoped API routes, archive pattern, TanStack Query hooks, and working Projects page UI with create/edit/archive**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T13:57:04Z
- **Completed:** 2026-03-26T14:00:13Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Full project CRUD API: GET/POST /api/projects, GET/PATCH/DELETE /api/projects/:id with tenant scoping and role-based access
- Project service layer with listProjects (filter by programId, status, search, archived exclusion via ne()), getProjectById, createProject, updateProject, archiveProject
- TanStack Query hooks with automatic cache invalidation on mutations
- Working Projects page with create/edit form, archive confirmation dialog, colored status badges, program dropdown
- Minimal GET /api/programs endpoint for populating program dropdown in project form

## Task Commits

Each task was committed atomically:

1. **Task 1: Project feature module (types, schema, service) and API routes** - `922bff6` (feat)
2. **Task 2: Project TanStack Query hooks and Projects page UI with CRUD** - `e707928` (feat)

## Files Created/Modified
- `src/features/projects/project.types.ts` - ProjectRow, ProjectCreate, ProjectUpdate, ProjectFilter types
- `src/features/projects/project.schema.ts` - Zod 4 validation schemas for create/update
- `src/features/projects/project.service.ts` - Business logic with tenant-scoped queries and archive pattern
- `src/app/api/projects/route.ts` - GET (list) and POST (create) endpoints
- `src/app/api/projects/[id]/route.ts` - GET, PATCH, DELETE endpoints with Next.js 16 param handling
- `src/hooks/use-projects.ts` - useProjects, useCreateProject, useUpdateProject, useArchiveProject, usePrograms
- `src/app/(app)/projects/page.tsx` - Full CRUD UI with table, form, status badges, archive confirmation
- `src/app/api/programs/route.ts` - Minimal GET endpoint for program dropdown data
- `src/lib/api-utils.ts` - handleApiError utility (worktree deviation)
- `src/components/providers/query-provider.tsx` - TanStack Query client provider (worktree deviation)
- `src/components/layout/app-shell.tsx` - Minimal app shell (worktree deviation)
- `src/components/layout/breadcrumbs.tsx` - Breadcrumb navigation component (worktree deviation)
- `src/app/(app)/layout.tsx` - App layout with QueryProvider wrapper (worktree deviation)
- `package.json` - Added @tanstack/react-query
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Used manual Zod 4 schemas instead of drizzle-zod (Zod 4 compatibility not guaranteed, consistent with Plan 01)
- Used direct db.select() in listProjects for flexible WHERE composition with ne() to exclude archived
- Archive pattern: DELETE route calls archiveProject which sets status='archived' and archivedAt (not hard-delete)
- Status badges use Tailwind utility classes: green for active, blue for planned

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created shared infrastructure from Plan 01**
- **Found during:** Task 1 (setup)
- **Issue:** Worktree branched before Plan 01 completed; handleApiError, QueryProvider, app shell, breadcrumbs, app layout not available
- **Fix:** Created all shared infrastructure files following exact same patterns as Plan 01
- **Files created:** src/lib/api-utils.ts, src/components/providers/query-provider.tsx, src/components/layout/app-shell.tsx, src/components/layout/breadcrumbs.tsx, src/app/(app)/layout.tsx
- **Verification:** TypeScript compiles clean
- **Committed in:** 922bff6 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added TanStack Query dependency**
- **Found during:** Task 1 (setup)
- **Issue:** @tanstack/react-query not installed in this worktree (installed by Plan 01 in separate worktree)
- **Fix:** Installed @tanstack/react-query via pnpm
- **Files modified:** package.json, pnpm-lock.yaml
- **Committed in:** 922bff6 (Task 1 commit)

**3. [Rule 2 - Missing Critical] Added programs list endpoint**
- **Found during:** Task 2 (Projects page UI)
- **Issue:** Project form needs program dropdown but no API endpoint exists
- **Fix:** Created minimal read-only GET /api/programs using withTenant()
- **Files created:** src/app/api/programs/route.ts
- **Committed in:** e707928 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 missing critical)
**Impact on plan:** All necessary for correctness. Shared infrastructure will be superseded when Plan 01 merges. Programs endpoint is minimal and aligned with Phase 5 plans.

## Issues Encountered
None beyond the documented deviations.

## Known Stubs
None - all data flows are wired to real API endpoints backed by tenant-scoped database queries.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Project CRUD complete, ready for Reference Data Admin (Phase 5)
- Archive pattern established for reuse by other entities
- Feature module pattern consistent across people and projects

## Self-Check: PASSED

- All 13 created files verified present on disk
- Commit 922bff6 verified in git log
- Commit e707928 verified in git log
- TypeScript compiles with zero errors

---
*Phase: 04-person-project-crud*
*Completed: 2026-03-26*
