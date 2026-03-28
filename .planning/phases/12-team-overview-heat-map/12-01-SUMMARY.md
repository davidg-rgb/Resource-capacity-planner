---
phase: 12-team-overview-heat-map
plan: 01
subsystem: api
tags: [drizzle, cte, generate-series, tanstack-query, analytics, heatmap]

requires:
  - phase: 02-database-schema
    provides: allocations, people, departments tables
  - phase: 03-auth-shell
    provides: getTenantId() auth helper
provides:
  - getTeamHeatMap CTE-based analytics service returning department-grouped utilization
  - HeatMapResponse/HeatMapFilters/DepartmentGroup/HeatMapPerson/HeatMapCell types
  - calculateHeatMapStatus with TEAM-01 thresholds
  - HEAT_MAP_COLORS Tailwind class mapping
  - GET /api/analytics/team-heatmap endpoint
  - useTeamHeatMap TanStack Query hook with 60s staleTime
affects: [12-02, 13-dashboard, 14-alerts, 15-pdf-export]

tech-stack:
  added: []
  patterns: [CTE with generate_series for gapless month grids, department-grouped analytics response]

key-files:
  created:
    - src/features/analytics/analytics.types.ts
    - src/features/analytics/analytics.service.ts
    - src/app/api/analytics/team-heatmap/route.ts
    - src/hooks/use-team-heatmap.ts
  modified:
    - src/lib/capacity.ts

key-decisions:
  - "Single CTE query with generate_series avoids N+1 and Neon cold-start multiplication"
  - "Heat map status thresholds (over/healthy/under/idle) separate from input form thresholds"

patterns-established:
  - "Analytics service pattern: CTE-based SQL -> server-side grouping -> typed response"
  - "Heat map status as separate function from input form status (different thresholds)"

requirements-completed: [TEAM-01, TEAM-03, TEAM-05]

duration: 2min
completed: 2026-03-28
---

# Phase 12 Plan 01: Analytics Data Layer Summary

**CTE-based analytics service with generate_series month grid, TEAM-01 heat map thresholds, API route, and TanStack Query hook**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T12:19:45Z
- **Completed:** 2026-03-28T12:21:46Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Single CTE query returns full person x month utilization matrix in one DB round-trip
- Heat map status function with TEAM-01 thresholds (over >100%, healthy 80-100%, under 50-79%, idle <50%)
- GET /api/analytics/team-heatmap with YYYY-MM validation and department/discipline filter support
- useTeamHeatMap hook with 60s staleTime for analytics caching

## Task Commits

Each task was committed atomically:

1. **Task 1: Create analytics types, heat map status function, and analytics service** - `cc65132` (feat)
2. **Task 2: Create API route and TanStack Query hook** - `44b5cad` (feat)

## Files Created/Modified
- `src/features/analytics/analytics.types.ts` - HeatMapCell, HeatMapPerson, DepartmentGroup, HeatMapResponse, HeatMapFilters types
- `src/features/analytics/analytics.service.ts` - getTeamHeatMap with CTE-based SQL aggregation
- `src/lib/capacity.ts` - Added calculateHeatMapStatus and HEAT_MAP_COLORS (existing functions unchanged)
- `src/app/api/analytics/team-heatmap/route.ts` - GET endpoint with param validation and error handling
- `src/hooks/use-team-heatmap.ts` - TanStack Query hook with filter support and 60s staleTime

## Decisions Made
- Used single CTE query with generate_series to produce gapless month grid, avoiding N+1 queries and Neon cold-start multiplication
- Kept heat map status thresholds (TEAM-01) completely separate from input form thresholds (INPUT-05) to avoid coupling

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data flows are wired to real SQL queries.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Analytics data layer complete, ready for Phase 12-02 (heat map UI component)
- Types and hook exported for direct consumption by the heat map grid component
- Service reusable by Phases 13-15 (dashboard, alerts, PDF export)

## Self-Check: PASSED

All 5 created files verified on disk. Both task commits (cc65132, 44b5cad) found in git log.

---
*Phase: 12-team-overview-heat-map*
*Completed: 2026-03-28*
