---
phase: "29"
plan: "01"
name: "Timeline + Program + Comparison Widgets"
subsystem: dashboard-visualizations
tags: [widget, gantt, program-rollup, period-comparison, v4]
dependency_graph:
  requires: [use-availability-timeline, use-program-rollup, use-period-comparison, widget-registry, analytics-types]
  provides: [availability-timeline-widget, program-rollup-widget, period-comparison-widget]
  affects: [widgets/index.ts, default-layouts.ts]
tech_stack:
  added: []
  patterns: [custom-html-table-gantt, svg-donut-gauge, delta-signal-table]
key_files:
  created:
    - src/features/dashboard/widgets/availability-timeline-widget.tsx
    - src/features/dashboard/widgets/program-rollup-widget.tsx
    - src/features/dashboard/widgets/period-comparison-widget.tsx
  modified:
    - src/features/dashboard/widgets/index.ts
decisions:
  - "V2 uses custom HTML table with absolutely-positioned divs for allocation bars (same as heat-map-table pattern)"
  - "V10 staffing gauge rendered as inline SVG donut (no external chart lib needed)"
  - "V10 program selector uses config.programId rather than local state (no program list endpoint yet)"
  - "V11 defaults to quarter-over-quarter comparison with preset buttons for quick switching"
  - "All 3 widgets support both manager and project-leader dashboards"
metrics:
  duration: "7m 32s"
  completed: "2026-04-01"
  tasks_completed: 4
  tasks_total: 4
  files_created: 3
  files_modified: 1
---

# Phase 29 Plan 01: Timeline + Program + Comparison Widgets Summary

**One-liner:** Three advanced dashboard widgets -- Gantt-style availability timeline, program portfolio roll-up with SVG gauge, and period comparison with delta signals

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | V2 Resource Availability Timeline | 9f10f4e | availability-timeline-widget.tsx |
| 2 | V10 Program Portfolio Roll-up | 9f10f4e | program-rollup-widget.tsx |
| 3 | V11 Period-over-Period Comparison | 9f10f4e | period-comparison-widget.tsx |
| 4 | Widget Registry Integration | 9f10f4e | widgets/index.ts |

## Implementation Details

### V2: Resource Availability Timeline (availability-timeline-widget.tsx)
- Custom HTML table with sticky left column (person names), horizontal month columns
- Department collapsible groups with chevron toggle (same pattern as heat-map-table.tsx)
- Allocation bars: colored divs per project within cells, stacked proportionally when multiple projects
- Overload indicator: red percentage badge when utilization > 100%
- Available cells: dashed border placeholder showing target hours
- "Show available only" checkbox filter
- Legend bar: Allocated / Available / Overloaded with summary insight
- Person names link to `/input/{personId}`

### V10: Program Portfolio Roll-up (program-rollup-widget.tsx)
- 3 KPI cards: project count, people assigned, peak monthly hours
- SVG donut staffing completeness gauge (green >= 80%, amber >= 50%, red < 50%)
- Discipline coverage: horizontal progress bars with gap FTE alerts
- Monthly load: horizontal bars with peak month highlighted
- Project list: name links to `/projects/{id}`, headcount, monthly hours, status badge
- Gap alert callout with AlertTriangle icon

### V11: Period-over-Period Comparison (period-comparison-widget.tsx)
- Preset buttons: "Month vs Month" and "Quarter vs Quarter"
- Key metrics table: metric name, period A value, period B value, delta, signal icon
- Signal icons: green TrendingUp (improving), red TrendingDown (worsening), gray Minus (neutral)
- Department shifts table sorted by absolute delta descending with arrow indicators
- Notable changes bullet list from API
- Smart value formatting: % for utilization metrics, h suffix for hours, locale number formatting

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused variable lint errors**
- **Found during:** Task 4 (commit attempt)
- **Issue:** `timeRange` destructured but unused in PeriodComparison (uses own state); `setSelectedProgram` unused in ProgramRollup
- **Fix:** Changed to `_props: WidgetProps` pattern; replaced useState with const for programId
- **Files modified:** period-comparison-widget.tsx, program-rollup-widget.tsx
- **Commit:** 9f10f4e

## Known Stubs

None -- all widgets are fully wired to their data hooks and render complete UI from API responses.

## Self-Check: PASSED

- All 3 widget files exist on disk
- Commit 9f10f4e verified in git log
- TypeScript compilation clean (0 errors)
