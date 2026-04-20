---
phase: "27"
plan: "01"
subsystem: dashboard-widgets
tags: [v8-bench-report, v12-discipline-demand, widget-registry, analytics]
dependency_graph:
  requires: [use-bench-report, use-discipline-demand, widget-registry, analytics-types]
  provides: [bench-report-widget, discipline-demand-widget]
  affects: [widget-index, manager-dashboard]
tech_stack:
  added: []
  patterns: [inline-bar-charts, status-color-heatmap, sustained-deficit-detection]
key_files:
  created:
    - src/features/dashboard/widgets/bench-report-widget.tsx
    - src/features/dashboard/widgets/discipline-demand-widget.tsx
  modified:
    - src/features/dashboard/widgets/index.ts
decisions:
  - "Used Tailwind amber-100/500/700 for 'tight' status since no warning design token exists"
  - "V8 bench threshold hardcoded to 80% (matching spec F9 default)"
  - "V12 hires indicator shows inline AlertTriangle + 'Hire' label next to discipline abbreviation"
metrics:
  duration: "7 minutes"
  completed: "2026-04-01"
---

# Phase 27 Plan 01: Bench Report + Discipline Demand Heatmap Summary

V8 bench report with KPI cards, dept/discipline breakdown tables with inline bars, top-5 available people, trend indicator, and insight callout; V12 discipline demand heatmap with month x discipline grid, status-colored cells (surplus/balanced/tight/deficit), and sustained-deficit hiring indicators.

## What Was Built

### V8: Bench Report Widget (`bench-report-widget.tsx`)
- Three summary KPI cards: total bench hours, FTE equivalent, people below threshold
- Trend comparison vs previous period with directional arrow and percentage
- Department breakdown table with inline horizontal bar charts (Tailwind width percentages)
- Discipline breakdown table with same layout
- Top 5 available people list (expandable to show all) with name, discipline, department, utilization %, free hours/month
- Insight callout section with auto-generated suggestion from API
- Full loading skeleton, error state, and empty state handling
- Registered as `bench-report` in widget registry (category: health-capacity, dashboards: manager)

### V12: Discipline Demand Heatmap Widget (`discipline-demand-widget.tsx`)
- Color legend for four status levels (surplus=green, balanced=blue, tight=amber, deficit=red)
- Month x discipline grid table with sub-rows for demand, supply, and gap values
- Status-colored cells with dot indicators and gap hours
- Sustained deficit detection: AlertTriangle + "Hire" badge next to discipline abbreviation when 3+ consecutive deficit months
- Summary callout with combined peak deficit hours and FTE hiring need
- Loading skeleton, error state, and empty state handling
- Registered as `discipline-demand` in widget registry (category: timelines-planning, dashboards: manager)

### Widget Index Update
- Both widgets imported in `widgets/index.ts` for automatic registration on app load

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| All tasks | `328eb2c` | V8 bench report + V12 discipline demand heatmap widgets + registry + plan |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced nonexistent warning color tokens with Tailwind amber**
- **Found during:** Task 2 (V12 widget)
- **Issue:** Used `bg-warning-container` and `text-warning` which do not exist in the project's design token system
- **Fix:** Replaced with `bg-amber-100`, `text-amber-700`, `bg-amber-500` from Tailwind's default palette
- **Files modified:** `src/features/dashboard/widgets/discipline-demand-widget.tsx`
- **Commit:** `328eb2c`

## Known Stubs

None -- both widgets consume real API data hooks and render all spec-required sections.

## Decisions Made

1. **Amber for tight status:** No `warning` design token exists in the project. Used Tailwind's built-in amber palette (`amber-100`, `amber-500`, `amber-700`) for the "tight" demand status, which provides appropriate visual distinction between balanced (blue) and deficit (red).
2. **80% bench threshold:** Hardcoded to match spec F9 default. The widget could be extended to accept a configurable threshold via widget config in the future.
3. **Hiring indicator placement:** Displayed inline next to the discipline abbreviation in the heatmap grid rather than as a separate row, keeping the table compact.
