---
phase: 09-flat-table-view-export
plan: 01
subsystem: api
tags: [drizzle, sheetjs, xlsx, csv, pagination, export]

requires:
  - phase: 02-database-schema-tenant-isolation
    provides: Drizzle schema with allocations, people, departments, projects, programs tables
  - phase: 08-import-wizard
    provides: SheetJS pattern for workbook generation (import.templates.ts)
provides:
  - GET /api/allocations/flat -- paginated flat table data with multi-column filtering
  - GET /api/allocations/export -- Excel/CSV file download endpoint
  - listAllocationsFlat, countAllocationsFlat, exportAllocationsFlat service functions
  - FlatTableRow, FlatTableFilters, FlatTableResponse types
affects: [09-02-flat-table-ui]

tech-stack:
  added: []
  patterns: [shared-condition-builder-for-list-and-count, buffer-to-uint8array-for-nextresponse]

key-files:
  created:
    - src/app/api/allocations/flat/route.ts
    - src/app/api/allocations/export/route.ts
  modified:
    - src/features/allocations/allocation.types.ts
    - src/features/allocations/allocation.service.ts

key-decisions:
  - "Buffer.from() wrapped in Uint8Array for NextResponse compatibility with Node Buffer"
  - "Shared buildFlatConditions helper ensures count query always matches data query filters"

patterns-established:
  - "Shared condition builder: extract filter conditions into a function reused by both list and count queries"
  - "Export via SheetJS: fetch all rows with high pageSize, build workbook, return Buffer"

requirements-completed: [IMPEX-11, IMPEX-12]

duration: 3min
completed: 2026-03-27
---

# Phase 9 Plan 1: Flat Table Backend Summary

**Paginated flat allocation API with 4-table JOINs, multi-column filtering, and Excel/CSV export via SheetJS**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T11:37:15Z
- **Completed:** 2026-03-27T11:40:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Three new service functions: listAllocationsFlat (paginated + filtered), countAllocationsFlat (matching joins), exportAllocationsFlat (xlsx/csv buffer)
- Two new API routes with tenant isolation: /api/allocations/flat and /api/allocations/export
- Three new types: FlatTableRow, FlatTableFilters, FlatTableResponse
- All existing allocation service functions preserved unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add flat table types and service functions** - `142784e` (feat)
2. **Task 2: Create flat table and export API routes** - `679ab3c` (feat)

## Files Created/Modified
- `src/features/allocations/allocation.types.ts` - Added FlatTableRow, FlatTableFilters, FlatTableResponse types
- `src/features/allocations/allocation.service.ts` - Added listAllocationsFlat, countAllocationsFlat, exportAllocationsFlat + shared helpers
- `src/app/api/allocations/flat/route.ts` - GET handler for paginated flat table data with filtering
- `src/app/api/allocations/export/route.ts` - GET handler for Excel/CSV file download

## Decisions Made
- Used Uint8Array wrapper around Buffer for NextResponse body (Node Buffer not directly assignable to BodyInit in strict TS)
- Shared `buildFlatConditions` helper ensures count query always uses same joins and filters as data query (prevents count/data mismatch)
- Page size restricted to [25, 50, 100] with default 50 for predictable performance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Buffer type incompatibility with NextResponse**
- **Found during:** Task 2 (export route)
- **Issue:** TypeScript error -- Buffer not assignable to BodyInit for NextResponse constructor
- **Fix:** Wrapped Buffer in `new Uint8Array(buffer)` which is a valid BodyInit type
- **Files modified:** src/app/api/allocations/export/route.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 679ab3c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type compatibility fix. No scope creep.

## Issues Encountered
- Build (`pnpm build`) fails due to missing Clerk env vars in worktree -- not related to this plan's changes. TypeScript compilation passes cleanly.

## Known Stubs
None -- all service functions are fully implemented with real Drizzle queries.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both API routes ready for Plan 02 (flat table UI) to consume
- Service functions tested via TypeScript compilation with full type safety
- Export supports both xlsx and csv formats

---
*Phase: 09-flat-table-view-export*
*Completed: 2026-03-27*
