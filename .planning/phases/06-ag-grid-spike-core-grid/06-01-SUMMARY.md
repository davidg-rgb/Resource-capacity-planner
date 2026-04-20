---
phase: 06-ag-grid-spike-core-grid
plan: 01
subsystem: api
tags: [ag-grid, allocations, drizzle, zod, capacity-status, date-utils]

requires:
  - phase: 02-database-schema-tenant-isolation
    provides: allocations table, withTenant pattern, DB connection
  - phase: 03-authentication-app-shell
    provides: getTenantId, requireRole, handleApiError
  - phase: 04-person-project-crud
    provides: person and project service patterns, API route patterns

provides:
  - Allocation service layer (listAllocationsForPerson, batchUpsertAllocations)
  - Allocation API endpoints (GET /api/allocations, POST /api/allocations/batch)
  - Capacity status calculation utilities (calculateStatus, getStatusColor)
  - Date/month generation utilities (generateMonthRange, getCurrentMonth, formatMonthHeader, normalizeMonth)
  - AG Grid dependencies installed (ag-grid-community@35, ag-grid-react@35)

affects: [06-02 grid frontend, 07 grid polish, 08 import wizard]

tech-stack:
  added: [ag-grid-community@35, ag-grid-react@35]
  patterns: [batch-upsert-transaction, zero-hour-delete-semantics, month-normalization]

key-files:
  created:
    - src/features/allocations/allocation.types.ts
    - src/features/allocations/allocation.schema.ts
    - src/features/allocations/allocation.service.ts
    - src/app/api/allocations/route.ts
    - src/app/api/allocations/batch/route.ts
    - src/lib/capacity.ts
    - src/lib/date-utils.ts
  modified:
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Used onConflictDoUpdate with column target array for allocation upserts"
  - "Month normalization: DB stores YYYY-MM-01, API returns YYYY-MM via slice"
  - "Created/updated distinction via createdAt vs updatedAt timestamp comparison"

patterns-established:
  - "Batch upsert pattern: transaction wrapping insert-or-delete per item with conflict resolution"
  - "Zero-hour delete: hours=0 removes allocation row rather than storing zero"
  - "Month normalization: normalizeMonth() slices YYYY-MM-DD to YYYY-MM for grid field keys"

requirements-completed: [INPUT-01, INPUT-02, INPUT-12, INPUT-13]

duration: 2min
completed: 2026-03-26
---

# Phase 6 Plan 1: Allocation Backend Summary

**AG Grid installed, allocation service with transactional batch upsert (ON CONFLICT + zero-hour DELETE), capacity status thresholds, and month-range utilities**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T21:34:31Z
- **Completed:** 2026-03-26T21:36:31Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- AG Grid Community and React packages installed (v35)
- Allocation feature module with types, Zod schemas, and service layer following established patterns
- Batch upsert handles hours=0 as DELETE and hours>0 as INSERT/UPDATE in a single transaction
- Capacity status utilities compute green/amber/red/gray per INPUT-05 thresholds
- Date utilities generate month ranges, format headers, and normalize DB date strings

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AG Grid, create allocation feature module, capacity utils, and date utils** - `a5d7c89` (feat)
2. **Task 2: Create allocation API routes (GET person view, POST batch upsert)** - `f35b1cf` (feat)

## Files Created/Modified
- `package.json` - Added ag-grid-community@35 and ag-grid-react@35
- `src/features/allocations/allocation.types.ts` - AllocationRow, FlatAllocation, GridRow, AllocationUpsert, BatchUpsertResult types
- `src/features/allocations/allocation.schema.ts` - Zod v4 schemas for allocation upsert and batch validation
- `src/features/allocations/allocation.service.ts` - listAllocationsForPerson (JOIN projects), batchUpsertAllocations (transaction)
- `src/app/api/allocations/route.ts` - GET /api/allocations?personId=X endpoint
- `src/app/api/allocations/batch/route.ts` - POST /api/allocations/batch endpoint (planner role required)
- `src/lib/capacity.ts` - calculateStatus and getStatusColor functions
- `src/lib/date-utils.ts` - generateMonthRange, getCurrentMonth, formatMonthHeader, normalizeMonth

## Decisions Made
- Used `onConflictDoUpdate` with column target array (not constraint name string) for the allocation upsert
- Month normalization strategy: DB stores full date YYYY-MM-01, API layer normalizes to YYYY-MM via `normalizeMonth()`
- Distinguished created vs updated rows by comparing createdAt and updatedAt timestamps (within 1 second = created)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Allocation API endpoints ready for Plan 02 grid frontend to consume
- Service layer provides stable contract: listAllocationsForPerson returns FlatAllocation[], batchUpsertAllocations accepts AllocationUpsert[]
- Capacity and date utilities ready for grid column generation and status rendering

## Self-Check: PASSED

- All 7 created files exist on disk
- Commit a5d7c89 (Task 1) verified in git log
- Commit f35b1cf (Task 2) verified in git log

---
*Phase: 06-ag-grid-spike-core-grid*
*Completed: 2026-03-26*
