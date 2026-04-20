---
phase: "26"
plan: "26-01"
subsystem: dashboard-visualizations
tags: [recharts, charts, forecast, stacked-area, widgets]
dependency_graph:
  requires: [24-01, 23-04]
  provides: [capacity-forecast-widget, capacity-distribution-widget]
  affects: [widget-registry, dashboard-layouts]
tech_stack:
  added: []
  patterns: [range-area-gap-shading, group-by-toggle, interactive-legend-toggle]
key_files:
  created:
    - src/components/charts/capacity-forecast-chart.tsx
    - src/components/charts/stacked-area-chart.tsx
    - src/features/dashboard/widgets/capacity-forecast-widget.tsx
    - src/features/dashboard/widgets/capacity-distribution-widget.tsx
  modified:
    - src/features/dashboard/widgets/index.ts
decisions:
  - Range-type Area elements with [min,max] tuples for gap shading (Recharts 3.x compatible)
  - eslint-disable for Recharts onClick handler typing (CategoricalChartFunc generic)
  - Swedish month abbreviations in axis labels (Maj, Okt)
  - MAX_GROUPS=8 for stacked area (top 7 + Other bucket)
metrics:
  duration: ~8 min
  completed: "2026-04-01"
---

# Phase 26 Plan 01: Forecast + Stacked Area Charts Summary

**V1 Capacity Forecast (demand/supply lines with range-based gap shading) + V5 Stacked Area (hours by group with interactive legend and supply overlay)**

## What Was Built

### V1: Capacity Forecast Line Chart (`capacity-forecast-chart.tsx`)

ComposedChart implementation with:
- **Supply line** (green, solid) and **Demand line** (primary blue, solid) with dots
- **Gap shading** using range-type Area elements with `[min, max]` tuples -- green fill at 20% opacity for surplus months, red fill at 20% opacity for deficit months
- **Hiring trigger** as a dashed ReferenceLine with label (configurable threshold)
- **Custom tooltip** showing supply/demand values, gap amount and percentage, color-coded by gap type
- **Summary bar** below chart counting surplus, balanced (+/-5%), and deficit months
- **Deficit click handler** for opening Availability Finder pre-filtered to that month
- ResponsiveContainer at 320px height

### V5: Stacked Area Chart (`stacked-area-chart.tsx`)

AreaChart implementation with:
- **Stacked areas** per group (project/department/discipline) using `stackId="capacity"`
- **Supply overlay** as dashed line showing total target hours
- **Interactive legend** -- click legend items to toggle series visibility via `hiddenKeys` state
- **"Other" bucket** -- when > 8 groups, remainder aggregated into single gray area
- **Group-by toggle** UI with Project/Department/Discipline buttons
- **Custom tooltip** with per-group hours + percentage breakdown and total
- **Insight callout** text rendered below chart when provided by API
- ResponsiveContainer at 340px height

### Widget Wrappers

Both follow the established widget pattern (React.memo, Loader2 spinner, error/empty states):
- `capacity-forecast-widget.tsx` -- registered as `capacity-forecast`, category `health-capacity`, defaultColSpan 12, supports manager + project-leader dashboards
- `capacity-distribution-widget.tsx` -- registered as `capacity-distribution`, category `breakdowns`, defaultColSpan 12, supports project-leader + manager dashboards, includes group-by toggle state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Recharts 3.x type incompatibilities**
- **Found during:** Task 1 (initial implementation)
- **Issue:** `baseLine` prop on `<Area>` does not accept `number[]` in Recharts 3.x; `onClick` on `ComposedChart` expects `CategoricalChartFunc` not a custom handler type; `Legend.onClick` expects `LegendPayload` parameter
- **Fix:** Replaced baseLine approach with range-type `[min, max]` tuple data for gap shading; used `any` cast with eslint-disable for onClick handlers
- **Files modified:** capacity-forecast-chart.tsx, stacked-area-chart.tsx
- **Commit:** 328eb2c

## Decisions Made

1. **Range tuples for gap shading** -- Instead of `baseLine` (deprecated/incompatible in Recharts 3.x), each data point carries `surplusRange: [demand, supply]` and `deficitRange: [supply, demand]` tuples. When no gap exists, range collapses to zero-height `[x, x]`.
2. **Any-typed Recharts handlers** -- Recharts 3.x onClick types are overly restrictive for payload access patterns. Used `eslint-disable` with `any` cast rather than fighting the generics.
3. **Swedish month names** -- Consistent with locale (Maj, Okt instead of May, Oct).
4. **MAX_GROUPS = 8** -- Spec says "> 8 projects, show top 7 + Other". Implemented as limit=8 passed to API hook.

## Known Stubs

None. Both components are fully wired to their data hooks (`useCapacityForecast`, `useCapacityDistribution`) and will render real data when the API endpoints are hit.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1-3 | V1 + V5 charts, widget wrappers, registration | 328eb2c |
