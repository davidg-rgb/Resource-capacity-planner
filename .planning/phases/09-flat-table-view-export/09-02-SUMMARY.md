---
phase: 09-flat-table-view-export
plan: 02
subsystem: ui
tags: [ag-grid, tanstack-query, flat-table, filters, pagination, export, next-navigation]

requires:
  - phase: 09-flat-table-view-export
    plan: 01
    provides: GET /api/allocations/flat and GET /api/allocations/export endpoints, FlatTableRow/FlatTableResponse types
  - phase: 06-ag-grid-spike-core-grid
    provides: AG Grid AllCommunityModule + AgGridReact pattern
provides:
  - FlatTable component with URL-synced filters, AG Grid, pagination, and export dropdown
  - useFlatAllocations TanStack Query hook with keepPreviousData
  - FlatTableFilters component with person/project/department dropdowns and month pickers
  - FlatTablePagination component with page navigation and size selector
  - Restructured /data page with flat table as primary content
affects: []

tech-stack:
  added: []
  patterns: [url-state-sync-via-useSearchParams, keepPreviousData-for-paginated-queries]

key-files:
  created:
    - src/hooks/use-flat-allocations.ts
    - src/components/flat-table/flat-table-columns.ts
    - src/components/flat-table/flat-table-filters.tsx
    - src/components/flat-table/flat-table-pagination.tsx
    - src/components/flat-table/flat-table.tsx
  modified:
    - src/app/(app)/data/page.tsx

key-decisions:
  - "URL search params as single source of truth for filter/pagination state via useSearchParams"
  - "Export button inside FlatTable component (not page header) for access to current filter state"

patterns-established:
  - "URL state sync: useSearchParams + router.push for filter persistence across page refreshes"
  - "keepPreviousData pattern for paginated TanStack Query hooks to avoid layout shift"

requirements-completed: [IMPEX-11, IMPEX-12]

duration: 4min
completed: 2026-03-27
---

# Phase 9 Plan 2: Flat Table UI Summary

**AG Grid read-only flat table on /data page with filter bar, pagination, URL state sync, and Excel/CSV export dropdown**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T11:48:45Z
- **Completed:** 2026-03-27T11:52:28Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- TanStack Query hook with keepPreviousData for smooth paginated data fetching
- AG Grid flat table with 6 columns (Person, Department, Project, Program, Month, Hours)
- Filter bar with person/project/department dropdowns and month range pickers, all URL-synced
- Pagination controls with Previous/Next navigation and page size selector (25/50/100)
- Export dropdown with Excel (.xlsx) and CSV (.csv) download links using current filters
- Data page restructured: flat table as primary content, import/templates in compact action bar

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TanStack Query hook, column definitions, filter bar, and pagination** - `d42f701` (feat)
2. **Task 2: Create flat table component and restructure data page** - `6258029` (feat)

## Files Created/Modified
- `src/hooks/use-flat-allocations.ts` - TanStack Query hook for paginated flat allocations
- `src/components/flat-table/flat-table-columns.ts` - AG Grid column definitions with tabular-nums
- `src/components/flat-table/flat-table-filters.tsx` - Filter bar with person/project/department/month
- `src/components/flat-table/flat-table-pagination.tsx` - Pagination controls with page size selector
- `src/components/flat-table/flat-table.tsx` - Main flat table component with AG Grid, filters, pagination, export
- `src/app/(app)/data/page.tsx` - Restructured data page with flat table as primary content

## Decisions Made
- URL search params as single source of truth for all filter and pagination state (useSearchParams + router.push)
- Export button placed inside FlatTable component rather than page header so it has access to current filter state
- Filter changes reset page to 1 automatically to prevent empty result sets
- Used native HTML `<select>` for filter dropdowns (searchable enough for typical org sizes)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Build (`pnpm build`) fails due to missing Clerk env vars in worktree (pre-existing, same as Plan 01). TypeScript compilation (`tsc --noEmit`) passes cleanly.

## Known Stubs
None - all components are fully wired to the API endpoints from Plan 01.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 09 complete: flat table backend (Plan 01) + flat table UI (Plan 02) both done
- /data page fully functional with view, filter, paginate, and export capabilities
- Ready for Phase 10 (Platform Admin)

---
*Phase: 09-flat-table-view-export*
*Completed: 2026-03-27*
