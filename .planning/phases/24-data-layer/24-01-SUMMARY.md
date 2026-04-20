---
phase: 24-data-layer
plan: 01
subsystem: analytics-api
tags: [types, api, endpoints, react-query, supply-demand]
dependency_graph:
  requires: []
  provides: [CapacityForecastResponse, CapacityDistributionResponse, DisciplineDemandResponse, useCapacityForecast, useCapacityDistribution, useDisciplineDemand]
  affects: [analytics.types.ts, analytics.service.ts]
tech_stack:
  added: []
  patterns: [CTE-generate_series, top-N-plus-other, sustained-deficit-detection]
key_files:
  created:
    - src/app/api/analytics/capacity-forecast/route.ts
    - src/app/api/analytics/capacity-distribution/route.ts
    - src/app/api/analytics/discipline-demand/route.ts
    - src/hooks/use-capacity-forecast.ts
    - src/hooks/use-capacity-distribution.ts
    - src/hooks/use-discipline-demand.ts
  modified:
    - src/features/analytics/analytics.types.ts
    - src/features/analytics/analytics.service.ts
decisions:
  - Renamed spec PersonSummaryResponse to PersonDetailResponse to avoid collision with existing Phase 23 PersonSummaryResponse
metrics:
  duration_seconds: 1381
  completed: "2026-04-01T12:00:00Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 2
---

# Phase 24 Plan 01: Types + Supply vs Demand Endpoints Summary

11 v4 response type interfaces and 3 Group A supply-vs-demand endpoints with CTE-based SQL, top-N bucketing, and sustained deficit detection

## What Was Built

### Task 1: 11 v4 Response Type Interfaces
Added all 11 TypeScript response interfaces to `analytics.types.ts`:
1. `CapacityForecastResponse` -- supply/demand/gap per month
2. `AvailabilityTimelineResponse` -- per-person per-month per-project breakdown
3. `AvailabilitySearchResponse` -- ranked available people
4. `UtilizationTrendsResponse` -- 6-month entity utilization history
5. `CapacityDistributionResponse` -- stacked hours by grouping dimension
6. `PersonDetailResponse` -- person 360 deep dive (renamed from spec's PersonSummaryResponse)
7. `BenchReportResponse` -- bench/idle capacity report
8. `ConflictsResponse` -- over-allocated people with resolution suggestions
9. `ProgramRollupResponse` -- program-level aggregation
10. `PeriodComparisonResponse` -- two-period delta analysis
11. `DisciplineDemandResponse` -- per-discipline supply vs demand

### Task 2: 3 Service Functions + 3 API Routes
- `getCapacityForecast` -- month_series + active_people + supply/demand CTEs, classifies months as surplus/balanced/deficit using 5% threshold
- `getCapacityDistribution` -- dynamic grouping (project/department/discipline), top-N + "other" bucket, CHART_PALETTE color assignment, auto-insight when single group > 50%
- `getDisciplineDemand` -- per-discipline grid via CROSS JOIN, 4-level status classification (surplus/balanced/tight/deficit), 3+ consecutive month sustained deficit detection

All 3 routes follow the established pattern: getTenantId -> validateMonthRange -> service call -> NextResponse.json, with handleApiError catch.

### Task 3: 3 React Query Hooks
- `useCapacityForecast(monthFrom, monthTo, filters?)` -- queryKey includes optional projectId/departmentId filters
- `useCapacityDistribution(monthFrom, monthTo, groupBy, limit?)` -- queryKey includes groupBy dimension and limit
- `useDisciplineDemand(monthFrom, monthTo, filters?)` -- queryKey includes optional departmentId

All hooks use `staleTime: 60_000` and typed `UseQueryResult<T>` returns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renamed PersonSummaryResponse to PersonDetailResponse**
- **Found during:** Task 1
- **Issue:** Phase 23 already added a `PersonSummaryResponse` interface with a different shape (basic person card). The spec's v4 interface with the same name would cause a naming collision.
- **Fix:** Named the v4 detailed version `PersonDetailResponse` to avoid breaking existing Phase 23 code.
- **Files modified:** src/features/analytics/analytics.types.ts
- **Impact:** Future plans referencing the spec's `PersonSummaryResponse` should use `PersonDetailResponse` instead.

## Decisions Made

1. **PersonDetailResponse naming** -- Chose to rename rather than replace the existing PersonSummaryResponse, since it is actively used by the Phase 23 person-summary endpoint and service function.

## Commits

| Hash | Message |
|------|---------|
| a06848a | feat(24-01): types + supply vs demand endpoints (Group A) |

## Known Stubs

None -- all interfaces are fully typed, all service functions contain complete SQL queries and transformation logic, all hooks are wired to the correct endpoints.
