---
phase: "30"
plan: "01"
name: "Integration & Wiring"
subsystem: dashboard
tags: [widget-registry, cross-linking, project-leader, mobile-layouts, widget-drawer]
dependency_graph:
  requires: [phase-23, phase-25, phase-26, phase-27, phase-28, phase-29]
  provides: [complete-widget-registry, project-leader-route, cross-linking-events, mobile-defaults]
  affects: [dashboard-layout-engine, default-layouts, widget-drawer, navigation]
tech_stack:
  added: []
  patterns: [event-bus-cross-linking, subscription-hook-pattern, widget-wrappers]
key_files:
  created:
    - src/features/dashboard/dashboard-cross-links.tsx
    - src/features/dashboard/widgets/allocation-trends-widget.tsx
    - src/features/dashboard/widgets/discipline-distribution-widget.tsx
    - src/app/(app)/dashboard/projects/page.tsx
    - src/app/(app)/dashboard/projects/project-dashboard-content.tsx
  modified:
    - src/features/dashboard/dashboard-edit-mode.tsx
    - src/features/dashboard/dashboard-layout-engine.tsx
    - src/features/dashboard/default-layouts.ts
    - src/features/dashboard/widgets/index.ts
    - src/features/dashboard/widgets/capacity-forecast-widget.tsx
    - src/features/dashboard/widgets/availability-finder-widget.tsx
    - src/components/layout/side-nav.tsx
    - src/components/layout/top-nav.tsx
    - src/messages/sv.json
    - src/messages/en.json
decisions:
  - Event bus pattern for cross-linking (subscribe/emit) instead of shared state to comply with strict ESLint rules (no setState in effects, no ref access during render)
  - allocation-trends and discipline-distribution wrapped as dashboard widgets using useProjectStaffing hook
  - Manager desktop default layout expanded from 7 to 15 widgets including all v4 visualizations
  - Mobile layouts use essential subset (8 widgets manager, 7 widgets project-leader) all at colSpan 12
metrics:
  duration: ~30min
  completed: "2026-04-01"
  tasks_completed: 5
  tasks_total: 5
  files_created: 5
  files_modified: 10
---

# Phase 30 Plan 01: Integration & Wiring Summary

All 20 dashboard widgets wired into registry with cross-linking event bus, project leader route, mobile layouts, and searchable widget drawer.

## What Was Done

### Task 1: Widget Registration and Default Layout Fixes
- Verified all 18 existing widgets registered via side-effect imports in `widgets/index.ts`
- Created 2 new wrapper widgets for existing project-view components:
  - `allocation-trends-widget.tsx` wraps `AllocationTrendsChart` with `useProjectStaffing` hook
  - `discipline-distribution-widget.tsx` wraps `DisciplineDistribution` with `useProjectStaffing` hook
- Fixed widget ID mismatch: `stacked-area-chart` in default layouts changed to `capacity-distribution` (the actual registered ID)
- Expanded manager desktop default from 7 to 15 widgets: added capacity-forecast, capacity-gauges, utilization-sparklines, resource-conflicts, bench-report, discipline-demand, period-comparison, availability-finder
- Expanded project-leader desktop default to include program-rollup, resource-conflicts, period-comparison

### Task 2: Mobile Layout Defaults
- Manager mobile: 8 essential widgets (kpi-cards, heatmap, forecast, gauges, conflicts, dept-bar, disc-chart, alerts) all at colSpan 12
- Project-leader mobile: 7 essential widgets (kpi-cards, distribution, timeline, forecast, conflicts, finder, program-rollup) all at colSpan 12

### Task 3: Cross-Linking Actions
- Created `CrossLinkProvider` with event bus pattern using `subscribe/emit` architecture
- `useCrossLinkSubscription` hook allows widgets to subscribe to specific action types
- Capacity forecast: clicking a deficit month emits `open-finder` event with month payload, scrolls to availability finder widget with highlight flash
- Availability finder: subscribes to `open-finder` events, applies discipline pre-fill from payload
- `registerWidgetRef` on SortableWidget enables scroll-to-widget behavior
- Person 360 overlay (usePersonCard) already wired in timeline and conflict widgets from previous phases

### Task 4: Project Leader Dashboard Route
- New route at `/dashboard/projects` with `DashboardGrid dashboardId="project-leader"`
- Project selector dropdown at top (all active projects, "All Projects" default)
- Uses `TimeRangeProvider` and widget registry side-effect imports
- Added to side-nav (`/dashboard` section) with `folder_open` icon
- Added to top-nav with `FolderKanban` icon, behind `dashboards` feature flag
- Active detection handles `/dashboard/projects` prefix correctly (won't match `/dashboard`)
- i18n keys added for both sv and en: `projectDashboard`, `projectDashboardDesc`

### Task 5: Widget Drawer Search Enhancement
- Added search input at top of WidgetDrawer with clear button
- Filters widgets by name or description (case-insensitive)
- Maintains category grouping in filtered results with fixed display order
- Shows "Inga widgets matchar" empty state when search has no results
- Extracted `WidgetDrawerItem` component for cleaner rendering

## Decisions Made

1. **Event bus over shared state for cross-linking**: ESLint rules prohibit setState in effects and ref access during render. Used subscribe/emit pattern with `useCrossLinkSubscription` hook instead. Cleaner API, no timing issues.
2. **Wrapper widgets for project-view components**: Rather than modifying existing `AllocationTrendsChart` and `DisciplineDistribution`, created thin widget wrappers that handle data fetching via `useProjectStaffing`.
3. **Mobile layout = essential subset at full width**: Rather than shrinking all widgets, selected 7-8 most important per persona. Users can add more through edit mode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Default layout widget ID `stacked-area-chart` did not match any registered widget**
- **Found during:** Task 1
- **Issue:** project-leader default layout referenced `stacked-area-chart` but the widget is registered as `capacity-distribution`
- **Fix:** Updated all references in default-layouts.ts
- **Commit:** e58197a

**2. [Rule 3 - Blocking] ESLint strict rules prevented setState-in-effect and ref-access-during-render patterns**
- **Found during:** Task 3 (commit attempt)
- **Issue:** `react-hooks/set-state-in-effect` and `react-hooks/refs` rules blocked initial cross-linking implementation
- **Fix:** Refactored from shared-state pattern to event-bus subscribe/emit pattern using `useCrossLinkSubscription`
- **Commit:** e58197a

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| All | e58197a | feat(30-01): integration & wiring |

## Self-Check: PASSED
