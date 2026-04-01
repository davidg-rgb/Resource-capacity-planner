---
phase: "25"
plan: "01"
name: "Gauges + Sparklines"
subsystem: "dashboard-visualizations"
tags: [recharts, widget, gauge, sparkline, visualization]
key-files:
  created:
    - src/components/charts/capacity-gauges.tsx
    - src/components/charts/utilization-sparklines.tsx
    - src/features/dashboard/widgets/capacity-gauges-widget.tsx
    - src/features/dashboard/widgets/utilization-sparklines-widget.tsx
  modified:
    - src/features/dashboard/widgets/index.ts
decisions:
  - "Used Recharts PieChart (270-degree arc) for gauges instead of RadialBarChart — simpler API, cleaner visual"
  - "Used custom SVG path for sparklines instead of Recharts LineChart — lightweight (no chart overhead for 80x24px)"
  - "Both widgets consume useUtilizationTrends hook — gauges use department groupBy, sparklines support toggle"
metrics:
  completed: "2026-04-01"
  tasks: 4
  files-created: 4
  files-modified: 1
---

# Phase 25 Plan 01: Gauges + Sparklines Summary

V6 radial capacity gauges and V4 sparkline trend table using Recharts PieChart + custom SVG paths, registered as dashboard widgets.

## What Was Built

### V6: Department Capacity Gauges (`capacity-gauges.tsx`)
- **Radial gauge**: 270-degree arc using Recharts `<PieChart>` + `<Pie>` with startAngle/endAngle
- **Color coding**: Green (<85%), amber (85-100%), red (>100%) utilization
- **Center label**: Bold percentage inside donut, tabular-nums font
- **Department info**: Name, headcount, overload warning icon
- **Trend indicator**: Arrow + signed percentage change with contextual coloring
- **Navigation**: Click gauge to navigate to `/dashboard/team?dept={id}`
- **Layout**: Flex-wrap grid (responsive without breakpoint classes)
- **Performance**: `React.memo` on both SingleGauge and CapacityGauges

### V4: Utilization Trend Sparklines (`utilization-sparklines.tsx`)
- **Custom SVG sparkline**: 80x24px `<path>` element, no Recharts dependency
- **Table layout**: Department/person name, sparkline, current %, direction arrow
- **View toggle**: Radio buttons switching between departments and top-10 people
- **Color coding**: Same green/amber/red thresholds as gauges
- **Direction arrows**: Unicode arrows with contextual coloring (red if trending toward overload)
- **Overload badge**: AlertTriangle icon on rows > 100% utilization
- **Navigation**: Click row to navigate (departments to team view, people to input page)
- **Accessibility**: Keyboard navigation (Enter/Space), role="link", aria-labels on SVGs

### Widget Wrappers
- `capacity-gauges-widget.tsx`: Maps `useUtilizationTrends('department')` to GaugeData array
- `utilization-sparklines-widget.tsx`: Manages department/person toggle state internally
- Both follow existing widget pattern: loading spinner, error message, empty state

### Registry Integration
- Both registered as `health-capacity` category on `manager` dashboard
- Added to `widgets/index.ts` barrel for side-effect import
- Gauges: `defaultColSpan: 6`, `minColSpan: 4`
- Sparklines: `defaultColSpan: 6`, `minColSpan: 4`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Both components are fully wired to the `useUtilizationTrends` hook from Phase 24. Data flows end-to-end assuming the API endpoint exists.

## Commits

| Hash | Message |
|------|---------|
| 89af9f6 | feat(25-01): V6 capacity gauges and V4 utilization sparklines |
