---
phase: 24-data-layer
plan: "03"
subsystem: analytics
tags: [api, sql, react-query, trends, entity, comparison]
dependency_graph:
  requires: [24-01]
  provides: [utilization-trends, person-detail, program-rollup, period-comparison]
  affects: [phase-25, phase-26, phase-27, phase-28, phase-29]
tech_stack:
  added: []
  patterns: [conditional-sql-template, fixed-window-trends, two-period-cte, discipline-coverage-matrix]
key_files:
  created:
    - src/app/api/analytics/utilization-trends/route.ts
    - src/app/api/analytics/program-rollup/route.ts
    - src/app/api/analytics/period-comparison/route.ts
    - src/hooks/use-utilization-trends.ts
    - src/hooks/use-person-summary.ts
    - src/hooks/use-program-rollup.ts
    - src/hooks/use-period-comparison.ts
  modified:
    - src/features/analytics/analytics.service.ts
    - src/app/api/analytics/person-summary/route.ts
decisions:
  - Named V7 function getPersonDetail to avoid collision with existing Phase 23 getPersonSummary
  - Updated person-summary route with detail=true param for backward compatibility
  - Used offsetMonth helper for month arithmetic instead of date-fns
metrics:
  duration: 18m
  completed: 2026-04-01
---

# Phase 24 Plan 03: Trends + Entity Endpoints (Group C+D) Summary

4 service functions, 4 API routes, 4 React Query hooks completing the full v4.0 data layer with utilization trends, person 360 detail, program rollup, and period comparison.

## What Was Built

### Service Functions (analytics.service.ts)

1. **getUtilizationTrends** -- Fixed 6-month window, groups by department (with headcount) or person (top N by avg utilization). Returns per-entity monthly utilization %, change direction (up/down/stable at +/-2% threshold), and overload flag.

2. **getPersonDetail** -- Full V7 Person 360 Card data. Three data regions: (a) person info with discipline/department, (b) 6-month trend with per-project breakdown for current month, (c) 3-month forward availability. Status classification: empty/healthy/warning/overloaded.

3. **getProgramRollup** -- Program-level aggregation with discipline coverage matrix. Computes staffingCompleteness (% disciplines with >= 80% coverage), gapFte per discipline, monthly load across program projects, and auto-generated gapAlert for critical coverage gaps (<50%).

4. **getPeriodComparison** -- Two-period delta analysis using FULL OUTER JOIN for department coverage. Computes 5 metrics (Average Utilization, Headcount, Total Allocated Hours, Overloaded People, Bench Hours) with improving/worsening/neutral signals. Auto-generates notable changes for >10% deltas.

### API Routes

| Route | Method | Key Params |
|-------|--------|------------|
| `/api/analytics/utilization-trends` | GET | groupBy (department/person), limit |
| `/api/analytics/person-summary` | GET | personId, detail=true for V7 |
| `/api/analytics/program-rollup` | GET | from, to, programId? |
| `/api/analytics/period-comparison` | GET | fromA, toA, fromB, toB |

### React Query Hooks

| Hook | Return Type | Enabled Guard |
|------|------------|---------------|
| useUtilizationTrends | UtilizationTrendsResponse | always |
| usePersonSummary | PersonDetailResponse | !!personId |
| useProgramRollup | ProgramRollupResponse | always |
| usePeriodComparison | PeriodComparisonResponse | all 4 params truthy |

## Decisions Made

1. **getPersonDetail vs getPersonSummary**: Phase 23 already created getPersonSummary returning basic PersonSummaryResponse. Named the V7 function getPersonDetail returning PersonDetailResponse. Updated the person-summary route to dispatch based on `detail=true` query param, preserving backward compatibility.

2. **offsetMonth helper**: Created a small utility function for month arithmetic instead of importing date-fns, keeping the module dependency-free.

3. **Period comparison approach**: Used two separate CTEs (period_a, period_b) with FULL OUTER JOIN rather than conditional aggregation, for clearer SQL and correct handling of departments that exist in only one period.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Backward compatibility for person-summary route**
- **Found during:** Task 1
- **Issue:** Plan said to implement getPersonSummary but Phase 23 already created a function with that name
- **Fix:** Created getPersonDetail for V7 data, updated route with detail=true dispatch
- **Files modified:** analytics.service.ts, person-summary/route.ts
- **Commit:** 86a5871

**2. [Rule 1 - Bug] Unused variable in getProgramRollup**
- **Found during:** Task 2 (pre-commit lint)
- **Issue:** `allPeople` Set was declared but never used
- **Fix:** Removed the unused variable
- **Files modified:** analytics.service.ts
- **Commit:** 86a5871

## Commits

| Hash | Message |
|------|---------|
| 86a5871 | feat(24-03): trends + entity endpoints (Group C+D) |

## Verification

- TypeScript compiles without errors for all plan files
- 4 new service functions exported from analytics.service.ts (19 total)
- 4 route.ts files each export GET function
- 4 hook files each export named hook with correct typing
- All hooks have staleTime: 60_000 and appropriate enabled guards

## Known Stubs

None -- all endpoints return fully computed data from SQL queries.
