---
phase: 51-lean-cleanup-duplicate-removal
plan: 02
subsystem: dashboard, widgets, migrations
tags: [widget-trim, jsonb-migration, layout-cleanup, feature-flag]
dependency_graph:
  requires: [uiV6LeanTrim-flag, widget-fallback]
  provides: [dead-widget-migration, heat-map-summary-card, trimmed-layouts, legacy-rollback]
  affects: [dashboard-layouts, widget-registry, api-dashboard-layout]
tech_stack:
  added: []
  patterns: [dual-layout-export, useLegacy-flag-threading]
key_files:
  created:
    - drizzle/migrations/0009_lean_trim_dead_widgets.sql
    - src/features/dashboard/widgets/heat-map-summary-card-widget.tsx
    - src/features/dashboard/__tests__/default-layouts.test.ts
  modified:
    - src/features/dashboard/widgets/index.ts
    - src/features/dashboard/default-layouts.ts
    - src/app/api/dashboard/layout/route.ts
decisions:
  - "Dead widget imports removed unconditionally (not flag-gated) since side-effect imports cannot be conditionally loaded; Plan 01 fallback handles graceful degradation"
  - "getDefaultLayout uses useLegacy param instead of reading flags internally (pure function, server-side caller threads flag)"
  - "Production VERIFY-05 re-audit: 0 affected rows — migration still ships as idempotent safety net"
metrics:
  duration: ~5min
  completed: "2026-04-20"
  tasks: 2/2
  files_modified: 3
  files_created: 3
  tests_added: 19
---

# Phase 51 Plan 02: Dashboard Layout Trim + Dead Widget Migration Summary

**JSONB migration stripping 3 dead widget IDs, heat-map-summary-card CTA widget, trimmed default layouts for manager and project-leader with LEGACY_LAYOUTS rollback**

## Task Results

### Task 1: Production DB re-audit + dashboard_layouts JSONB migration + heat-map-summary-card widget
- Production VERIFY-05 re-audit: 0 affected rows (migration is idempotent safety net)
- Created `drizzle/migrations/0009_lean_trim_dead_widgets.sql` — strips discipline-progress, discipline-demand, project-impact from tenant custom layouts with COALESCE null-safety
- Created `heat-map-summary-card-widget.tsx` — summary CTA widget with link to /dashboard/team, registered for manager dashboards
- Removed 3 dead widget imports from `widgets/index.ts`, added heat-map-summary-card import
- All 782 tests pass
- **Commit:** 27ac599

### Task 2: Trim default layouts + wire getDefaultLayout callers + layout tests
- `DEFAULT_LAYOUTS`: manager dashboards swap utilization-heat-map for heat-map-summary-card; project-leader dashboards remove kpi-cards, capacity-forecast, availability-finder
- `LEGACY_LAYOUTS` export preserves original layouts for flag-off rollback
- `getDefaultLayout(dashboardId, deviceClass, useLegacy?)` accepts optional useLegacy param
- `/api/dashboard/layout` route wired with `getOrgFlags()` to pass `!flags.uiV6LeanTrim` as useLegacy
- 19 new tests covering trimmed state, legacy rollback, position sequencing, and flag-gating
- **Commit:** 8a54318

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - heat-map-summary-card renders real CTA link; dataHook is declared but widget's purpose is navigation, not data display.

## Self-Check: PASSED

- drizzle/migrations/0009_lean_trim_dead_widgets.sql exists
- src/features/dashboard/widgets/heat-map-summary-card-widget.tsx exists
- src/features/dashboard/__tests__/default-layouts.test.ts exists
- Commits 27ac599 and 8a54318 found in git log
- widgets/index.ts contains heat-map-summary-card, does not contain discipline-progress/demand/project-impact
- default-layouts.ts contains heat-map-summary-card in DEFAULT_LAYOUTS, utilization-heat-map only in LEGACY_LAYOUTS
