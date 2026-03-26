---
phase: 05-reference-data-admin
plan: 02
subsystem: frontend
tags: [react, tanstack-query, crud, admin-ui, reference-data, clerk-auth]

requires:
  - phase: 05-reference-data-admin
    plan: 01
    provides: CRUD API routes for disciplines, departments, programs with usage-count responses
  - phase: 03-authentication-app-shell
    provides: Clerk auth, AppShell, side-nav, top-nav layout components
  - phase: 04-person-project-crud
    provides: TanStack Query hook patterns, Team and Projects page patterns

provides:
  - Centralized reference data hooks (use-reference-data.ts) with full CRUD for 3 entities
  - Disciplines admin page with inline CRUD and usage-count delete protection
  - Departments admin page with inline CRUD and usage-count delete protection
  - Programs admin page with inline CRUD and usage-count delete protection
  - Admin navigation section in side-nav and top-nav

affects: [04-person-project-crud, 06-ag-grid, 08-import-wizard]

tech-stack:
  added: []
  patterns:
    - "Admin CRUD page pattern: inline table editing with usage-count delete warnings"
    - "Reference data hooks centralized in single file with cross-entity cache invalidation"
    - "Role gating via useAuth() orgRole check at component level"

key-files:
  created:
    - src/hooks/use-reference-data.ts
    - src/app/(app)/admin/disciplines/page.tsx
    - src/app/(app)/admin/departments/page.tsx
    - src/app/(app)/admin/programs/page.tsx
  modified:
    - src/hooks/use-people.ts
    - src/hooks/use-projects.ts
    - src/components/layout/side-nav.tsx
    - src/components/layout/top-nav.tsx

key-decisions:
  - "Centralized reference data hooks in one file rather than per-entity files for simpler imports"
  - "Re-exported read-only hooks from use-people.ts and use-projects.ts for backward compatibility"
  - "Usage-count check via useDiscipline/useDepartment/useProgram hook triggered on delete click, not pre-loaded"
  - "ShieldCheck icon for Admin nav item to differentiate from existing Settings button"

requirements-completed: [MGMT-03, MGMT-04, MGMT-05]

duration: 5min
completed: 2026-03-26
---

# Phase 5 Plan 2: Admin CRUD Pages & Reference Data Hooks Summary

**Centralized TanStack Query hooks for discipline/department/program CRUD with 3 admin pages featuring inline editing, usage-count delete protection, and role-based access gating**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T16:11:54Z
- **Completed:** 2026-03-26T16:16:32Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Centralized reference data hooks file with 15 exported hooks (5 per entity: list, single, create, update, delete)
- Cross-entity cache invalidation on delete (disciplines/departments invalidate people, programs invalidate projects)
- Backward-compatible re-exports in use-people.ts and use-projects.ts preserving existing import paths
- 3 admin pages with consistent inline CRUD table pattern, role gating via Clerk orgRole
- Usage-count delete protection: fetches individual entity to show assignment count before allowing delete
- Navigation integration: side-nav /admin section with 3 items, top-nav Admin link with ShieldCheck icon

## Task Commits

Each task was committed atomically:

1. **Task 1: Create centralized reference data hooks** - `217372b` (feat)
2. **Task 2: Add admin CRUD pages and wire navigation** - `f8ae01c` (feat)

## Files Created/Modified
- `src/hooks/use-reference-data.ts` - Full CRUD hooks for disciplines, departments, programs with cross-entity cache invalidation
- `src/hooks/use-people.ts` - Removed inline Department/Discipline interfaces and hooks, replaced with re-exports
- `src/hooks/use-projects.ts` - Removed inline Program interface and hook, replaced with re-export
- `src/app/(app)/admin/disciplines/page.tsx` - Admin page: inline add/edit table, usage-count delete warning, role gating
- `src/app/(app)/admin/departments/page.tsx` - Admin page: inline add/edit table, usage-count delete warning, role gating
- `src/app/(app)/admin/programs/page.tsx` - Admin page: inline add/edit with optional description, usage-count delete warning, role gating
- `src/components/layout/side-nav.tsx` - Added /admin section with Disciplines, Departments, Programs links
- `src/components/layout/top-nav.tsx` - Added Admin nav item with ShieldCheck icon

## Decisions Made
- Centralized all reference data hooks in a single `use-reference-data.ts` file rather than splitting per entity -- reduces imports and keeps related hooks together
- Re-exported `useDepartments`/`useDisciplines` from use-people.ts and `usePrograms` from use-projects.ts for backward compatibility with existing Team and Projects pages
- Usage count is fetched on-demand when user clicks the delete button (via `useDiscipline(id)` etc.) rather than pre-loading for all rows
- Used `ShieldCheck` icon for Admin top-nav item to clearly differentiate from the existing Settings icon button

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All reference data CRUD (API + UI) complete for Phase 5
- Admin pages ready for visual verification
- Reference data hooks available for Person Input Form dropdowns (Phase 6+)

## Self-Check: PASSED
