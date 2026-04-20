---
phase: 13-dashboard-charts
plan: 01
subsystem: api
tags: [analytics, sql-cte, tanstack-query, recharts, dashboard, kpi]

# Dependency graph
requires:
  - phase: 12-team-overview-heat-map
    provides: analytics service pattern (CTE queries, generate_series), analytics types, team-heatmap API route pattern
provides:
  - getDashboardKPIs service function (headcount, utilization %, overloaded/underutilized counts)
  - getDepartmentUtilization service function (per-department utilization %)
  - getDisciplineBreakdown service function (hours by discipline)
  - Three API routes at /api/analytics/dashboard, /departments, /disciplines
  - Three TanStack Query hooks (useDashboardKPIs, useDepartmentUtilization, useDisciplineBreakdown)
  - CHART_COLORS and CHART_FONT constants for chart rendering
affects: [13-02-dashboard-ui, 14-alerts-project-view, 15-pdf-export]

# Tech tracking
tech-stack:
  added: []
  patterns: [CTE-based SQL aggregation with generate_series for gapless month grids, division-by-zero guards in SQL CASE expressions]

key-files:
  created:
    - src/components/charts/chart-colors.ts
    - src/app/api/analytics/dashboard/route.ts
    - src/app/api/analytics/departments/route.ts
    - src/app/api/analytics/disciplines/route.ts
    - src/hooks/use-dashboard.ts
  modified:
    - src/features/analytics/analytics.types.ts
    - src/features/analytics/analytics.service.ts

key-decisions:
  - "Used COUNT FILTER for overloaded/underutilized instead of subqueries for single-pass aggregation"
  - "Division-by-zero guard returns 0 utilization when target hours is 0"
  - "People with no discipline excluded via INNER JOIN in discipline breakdown"

patterns-established:
  - "Dashboard analytics CTE pattern: month_series -> active_people -> aggregation with division-by-zero guards"
  - "Chart color constants derived from globals.css design tokens with semantic capacity colors"

requirements-completed: [DASH-01, DASH-02, DASH-03, CHRT-01, CHRT-02, CHRT-03]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 13 Plan 01: Dashboard Data Layer Summary

**CTE-based dashboard analytics with KPI, department utilization, and discipline breakdown endpoints plus chart color constants**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T12:41:10Z
- **Completed:** 2026-03-28T12:43:18Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Three CTE-based SQL aggregation functions computing KPIs, department utilization, and discipline breakdown
- Three authenticated API routes serving dashboard analytics data with YYYY-MM validation
- Three TanStack Query hooks with 60s staleTime for client-side consumption
- Chart color constants derived from Nordic Precision design tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend analytics types and service with dashboard aggregation functions** - `a73b729` (feat)
2. **Task 2: Create API routes and TanStack Query hooks for all three dashboard endpoints** - `70af843` (feat)

## Files Created/Modified
- `src/features/analytics/analytics.types.ts` - Added DashboardKPIs, DepartmentUtilization, DisciplineBreakdown interfaces
- `src/features/analytics/analytics.service.ts` - Added getDashboardKPIs, getDepartmentUtilization, getDisciplineBreakdown CTE functions
- `src/components/charts/chart-colors.ts` - CHART_COLORS and CHART_FONT constants from Nordic Precision tokens
- `src/app/api/analytics/dashboard/route.ts` - GET endpoint for KPI data
- `src/app/api/analytics/departments/route.ts` - GET endpoint for department utilization
- `src/app/api/analytics/disciplines/route.ts` - GET endpoint for discipline breakdown
- `src/hooks/use-dashboard.ts` - useDashboardKPIs, useDepartmentUtilization, useDisciplineBreakdown hooks

## Decisions Made
- Used COUNT FILTER for overloaded/underutilized counts instead of subqueries for single-pass aggregation efficiency
- Division-by-zero guard returns 0 utilization when target hours is 0 (handles edge case of people with 0 target)
- People with no discipline excluded via INNER JOIN in discipline breakdown (matches plan specification)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All data layer infrastructure ready for Plan 02 to render dashboard UI
- Service functions, API routes, hooks, and chart colors all in place
- Existing getTeamHeatMap and useTeamHeatMap preserved unchanged

---
*Phase: 13-dashboard-charts*
*Completed: 2026-03-28*
