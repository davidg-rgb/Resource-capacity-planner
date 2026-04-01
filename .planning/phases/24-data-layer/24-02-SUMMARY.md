---
phase: 24-data-layer
plan: 02
subsystem: analytics
tags: [api, analytics, person-utilization, availability, bench, conflicts]
dependency_graph:
  requires: [24-01]
  provides: [availability-timeline-api, availability-search-api, bench-report-api, conflicts-api]
  affects: [dashboard-visualizations, resource-management-ui]
tech_stack:
  added: []
  patterns: [CTE-queries, generate_series, window-functions, react-query-hooks]
key_files:
  created:
    - src/app/api/analytics/availability-timeline/route.ts
    - src/app/api/analytics/availability/route.ts
    - src/app/api/analytics/bench-report/route.ts
    - src/app/api/analytics/conflicts/route.ts
    - src/hooks/use-availability-timeline.ts
    - src/hooks/use-availability.ts
    - src/hooks/use-bench-report.ts
    - src/hooks/use-conflicts.ts
  modified:
    - src/features/analytics/analytics.service.ts
decisions:
  - Sorting and filtering done in TypeScript after SQL fetch for simplicity and consistency with existing patterns
  - Bench report uses single query with two period CTEs (current + previous) joined via person_id
  - Conflicts uses SQL window function (SUM OVER PARTITION) to compute month totals inline with project breakdown
  - Project color assignment uses global Map for consistency across all people in availability-timeline
metrics:
  completed: "2026-04-01"
  tasks: 3
  files_created: 8
  files_modified: 1
---

# Phase 24 Plan 02: Person-Level Utilization Endpoints Summary

4 person-centric analytics endpoints with CTE+generate_series queries, per-project breakdown, bench trending, and conflict resolution suggestions.

## What Was Built

### Service Functions (analytics.service.ts)

1. **getAvailabilityTimeline** -- Per-person per-month allocation grouped by department with per-project breakdown and color coding. Supports departmentId, disciplineId, and availableOnly filters. Consistent project-to-color mapping via CHART_PALETTE.

2. **getAvailabilitySearch** -- Ranked list of available people with dynamic sorting (available hours desc, utilization asc, name asc). Supports minHours threshold filter. Returns totalAvailable and avgUtilization per person.

3. **getBenchReport** -- People below utilization threshold (default 80%) with FTE equivalents. Single query with two period CTEs computes current vs previous period bench hours. Groups by department and discipline. Top 10 most available people. Auto-generated insight when bench increases >10%.

4. **getConflicts** -- Over-allocated people (>100% target) with per-project breakdown per month. Suggests resolution by reducing largest project allocation. Supports multi-month forward scanning (1-12 months).

### API Routes

| Endpoint | Params | Notes |
|----------|--------|-------|
| GET /api/analytics/availability-timeline | from, to, departmentId?, disciplineId?, availableOnly? | validateMonthRange |
| GET /api/analytics/availability | from, to, disciplineId?, departmentId?, minHours?, sort? | sort validated against whitelist |
| GET /api/analytics/bench-report | from, to, threshold? | threshold clamped 0-100, default 80 |
| GET /api/analytics/conflicts | month?, months? | month validated via regex, months clamped 1-12 |

### React Query Hooks

| Hook | File | Key Features |
|------|------|-------------|
| useAvailabilityTimeline | src/hooks/use-availability-timeline.ts | Filters in queryKey, URLSearchParams builder |
| useAvailabilitySearch | src/hooks/use-availability.ts | All filter params in queryKey |
| useBenchReport | src/hooks/use-bench-report.ts | Optional threshold in queryKey |
| useConflicts | src/hooks/use-conflicts.ts | enabled: !!month guard |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **TypeScript-side filtering over SQL WHERE**: For minHours and availableOnly filters, fetching all people then filtering in TypeScript keeps SQL queries simpler and consistent with existing patterns.

2. **Window function for conflicts**: Used `SUM() OVER (PARTITION BY person_id, month)` to get month totals alongside per-project rows in a single query pass, then filtered in TypeScript.

3. **Global project color map**: Availability timeline assigns colors from CHART_PALETTE using a Map keyed by project_id, ensuring the same project gets the same color across all people.

4. **Previous period calculation**: Bench report computes previous period as N months immediately before the requested range, using the same month count for equal comparison.

## Commits

| Hash | Message |
|------|---------|
| 03c2463 | feat(24-02): person-level utilization endpoints (Group B) |

## Known Stubs

None -- all endpoints return fully computed data from database queries.

## Self-Check: PASSED
