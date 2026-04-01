---
phase: 23-dashboard-framework
plan: 01
subsystem: dashboard-framework
tags: [types, registry, db-migration, time-range, dnd-kit]
dependency_graph:
  requires: []
  provides: [WidgetDefinition, WidgetPlacement, WidgetProps, WidgetCategory, DashboardLayoutData, widget-registry, default-layouts, TimeRangeProvider, useTimeRange, useWidgetTimeRange, dashboardLayouts-table]
  affects: [src/db/schema.ts, package.json]
tech_stack:
  added: ["@dnd-kit/core@6.3.1", "@dnd-kit/sortable@10.0.0"]
  patterns: [singleton-registry, context-provider, sentinel-value-null-uniqueness]
key_files:
  created:
    - src/features/dashboard/widget-registry.types.ts
    - src/features/dashboard/widget-registry.ts
    - src/features/dashboard/default-layouts.ts
    - src/features/dashboard/dashboard-time-range.tsx
    - drizzle/migrations/0001_goofy_doctor_doom.sql
  modified:
    - src/db/schema.ts
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Sentinel value '__tenant_default__' for clerk_user_id instead of NULL to enforce uniqueness on tenant defaults"
  - "Module-level Map singleton for widget registry (no class, no React context needed)"
  - "Default 3-month time range from current month, initializable from URL search params"
  - "Default layouts keyed by dashboardId:deviceClass composite string"
metrics:
  duration: ~27 minutes
  completed: 2026-04-01
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 3
---

# Phase 23 Plan 01: Dashboard Framework Foundation Summary

Widget type system, registry singleton, DB migration, and time range context providing the contract layer for all dashboard visualizations.

## What Was Built

### 1. Widget Type System (`widget-registry.types.ts`)
- `WidgetCategory`: union of 4 categories (health-capacity, timelines-planning, breakdowns, alerts-actions)
- `WidgetProps`: standardized props every widget receives (timeRange, config, isEditMode)
- `WidgetDefinition`: full registration interface (id, name, description, category, icon, component, colSpan defaults, supported dashboards, optional feature flag, data hook reference)
- `WidgetPlacement`: positioned widget within a layout (widgetId, position, colSpan, optional config and time range override)
- `DashboardLayoutData`: full persisted layout structure (dashboardId, deviceClass, widgets array, version)

### 2. Widget Registry (`widget-registry.ts`)
- Module-level `Map<string, WidgetDefinition>` singleton
- `registerWidget()`: adds definition, warns on duplicate ID
- `getWidget()`: retrieve by ID
- `getAllWidgets()`: list all registered widgets
- `getWidgetsByDashboard()`: filter by dashboard compatibility
- `getWidgetsByCategory()`: filter by category

### 3. Default Layouts (`default-layouts.ts`)
- Manager desktop: 7 widgets with variable spans (12, 6, 4)
- Manager mobile: same 7 widgets, all full-width (span 12)
- Project leader desktop: 7 widgets (KPI cards, stacked area, availability timeline, capacity forecast, allocation trends, discipline distribution, availability finder)
- Project leader mobile: same 7 widgets, all full-width
- `getDefaultLayout()`: lookup with fallback to manager desktop

### 4. Time Range Context (`dashboard-time-range.tsx`)
- `TimeRangeProvider`: initializes from URL `?from=&to=` params, defaults to 3-month range from current month
- `useTimeRange()`: read global dashboard time range
- `useWidgetTimeRange(override?)`: per-widget override mechanism, falls back to global

### 5. Database Schema (`dashboardLayouts` table)
- JSONB `layout` column storing `WidgetPlacement[]`
- Composite unique index on (organizationId, clerkUserId, dashboardId, deviceClass)
- Sentinel value `'__tenant_default__'` for `clerkUserId` to enforce uniqueness on tenant defaults (PostgreSQL does not enforce uniqueness on NULL)
- Relations wired to organizations
- Migration generated: `drizzle/migrations/0001_goofy_doctor_doom.sql`

### 6. Dependencies
- `@dnd-kit/core@^6.3.1` and `@dnd-kit/sortable@^10.0.0` installed

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compiles with zero errors (`tsc --noEmit`)
- All 4 new files exist with correct exports
- `@dnd-kit/core` and `@dnd-kit/sortable` in package.json dependencies
- `dashboardLayouts` exported from schema.ts with all columns
- Drizzle migration generated successfully
- Unique constraint uses sentinel value approach for NULL safety

## Known Stubs

None - all code is fully functional with no placeholder values.

## Self-Check: PASSED

All created files verified present. All exports confirmed. TypeScript clean. Migration generated.
