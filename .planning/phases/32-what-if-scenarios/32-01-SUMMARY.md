---
phase: "32"
plan: "01"
name: "What-If Scenario Mode"
subsystem: scenarios
tags: [what-if, scenarios, isolation, feature-flag]
dependency-graph:
  requires: [analytics-service, allocations, feature-flags, auth]
  provides: [scenario-crud, scenario-analytics, scenario-comparison, promote-to-actual]
  affects: [schema, flag-types, flag-context, flag-service, top-nav, platform-admin]
tech-stack:
  added: []
  patterns: [isolated-feature, separate-cache-namespace, separate-api-routes, separate-db-tables]
key-files:
  created:
    - src/features/scenarios/scenario.types.ts
    - src/features/scenarios/scenario.service.ts
    - src/features/scenarios/scenario-analytics.service.ts
    - src/app/api/scenarios/route.ts
    - src/app/api/scenarios/[id]/route.ts
    - src/app/api/scenarios/[id]/allocations/route.ts
    - src/app/api/scenarios/[id]/analytics/dashboard/route.ts
    - src/app/api/scenarios/[id]/analytics/team-heatmap/route.ts
    - src/app/api/scenarios/[id]/analytics/impact/route.ts
    - src/app/api/scenarios/[id]/analytics/comparison/route.ts
    - src/app/api/scenarios/[id]/promote/route.ts
    - src/app/api/scenarios/[id]/temp-entities/route.ts
    - src/hooks/use-scenarios.ts
    - src/hooks/use-scenario-allocations.ts
    - src/hooks/use-scenario-analytics.ts
    - src/hooks/use-scenario-promote.ts
    - src/hooks/use-scenario-grid-autosave.ts
    - src/hooks/use-scenario-temp-entities.ts
    - src/components/scenarios/scenario-banner.tsx
    - src/components/scenarios/scenario-card.tsx
    - src/components/scenarios/create-scenario-modal.tsx
    - src/components/scenarios/impact-bar.tsx
    - src/components/scenarios/promote-modal.tsx
    - src/components/scenarios/exit-scenario-dialog.tsx
    - src/components/scenarios/comparison-view.tsx
    - src/app/(app)/scenarios/page.tsx
    - src/app/(app)/scenarios/[id]/page.tsx
    - src/app/(app)/scenarios/[id]/compare/page.tsx
  modified:
    - src/db/schema.ts
    - src/features/flags/flag.types.ts
    - src/features/flags/flag.context.tsx
    - src/features/flags/flag.service.ts
    - src/app/(platform)/tenants/[orgId]/page.tsx
decisions:
  - "Dedicated route with separate DB tables over overlay approach (codebase audit found 4 isolation risks)"
  - "Row-level selective promotion with two-step confirmation (UX review Q1)"
  - "Private-first sharing model with max 10 per user, 25 per org (UX review Q2)"
  - "Non-dismissible amber banner on all /scenarios/* routes (Salesforce lesson)"
  - "Separate React Query cache namespace ['scenario', id, ...] for zero contamination"
metrics:
  completed: "2026-04-01"
  files-created: 28
  files-modified: 5
  total-files: 33
  insertions: 3488
---

# Phase 32 Plan 01: What-If Scenario Mode Summary

Isolated What-If Scenario feature with 3 new DB tables, 9 API endpoints, 7 React Query hooks, 8 UI components, and 3 pages -- all using separate cache namespaces and API routes for zero contamination with existing code paths.

## What Was Built

### Database (3 new tables)
- **scenarios**: Container table with name, status (draft/active/archived), visibility (private/shared_readonly/shared_collaborative/published), created_by, baseline_snapshot_at
- **scenario_allocations**: Mirrors allocations table but scoped to scenario_id, with isModified/isNew/isRemoved/promotedAt tracking flags and support for temp entities
- **scenario_temp_entities**: Hypothetical people/projects within a scenario (person or project type, with optional department/discipline links)
- All tables have proper indexes, cascade deletes, and Drizzle ORM relations

### Feature Flag
- Added `scenarios` to FLAG_NAMES, FeatureFlags interface, FLAG_ROUTE_MAP (gates /scenarios), default flags (disabled), and platform admin labels

### Service Layer (2 new files)
- **scenario.service.ts**: Full CRUD (list, create, get, update, delete), allocation upsert with modify/new/remove tracking, promote-to-actual with archived-person blocking and row-level selection, temp entity management, enforced limits (10 per user, 25 per org)
- **scenario-analytics.service.ts**: Mirrors analytics.service.ts queries but reads from scenario_allocations -- provides dashboard KPIs, team heat map, impact comparison (actual vs scenario delta), and side-by-side comparison data

### API Routes (9 new route files)
All under `/api/scenarios/`:
- `GET/POST /api/scenarios` -- list and create
- `GET/PATCH/DELETE /api/scenarios/:id` -- CRUD
- `GET/PUT /api/scenarios/:id/allocations` -- scenario allocations
- `GET /api/scenarios/:id/analytics/dashboard` -- scenario KPIs
- `GET /api/scenarios/:id/analytics/team-heatmap` -- scenario heat map
- `GET /api/scenarios/:id/analytics/impact` -- actual vs scenario delta
- `GET /api/scenarios/:id/analytics/comparison` -- side-by-side data
- `POST /api/scenarios/:id/promote` -- admin-gated promote-to-actual
- `GET/POST/DELETE /api/scenarios/:id/temp-entities` -- hypothetical entities

### Client Hooks (7 new files)
All use `['scenario', scenarioId, ...]` query key prefix -- NEVER share keys with actual data:
- **use-scenarios.ts**: List, get, create, update, delete mutations
- **use-scenario-allocations.ts**: Typed allocation rows with JOINed fields
- **use-scenario-analytics.ts**: Dashboard KPIs, team heat map, impact, comparison
- **use-scenario-promote.ts**: Promote mutation (invalidates BOTH scenario and actual caches)
- **use-scenario-grid-autosave.ts**: Debounced grid autosave for scenario allocations
- **use-scenario-temp-entities.ts**: CRUD for hypothetical people/projects

### UI Components (8 new files)
- **scenario-banner.tsx**: Non-dismissible amber banner with scenario name, reassurance text, compare/save/exit buttons
- **scenario-card.tsx**: Card for scenario list with status badge, visibility label, modification count
- **create-scenario-modal.tsx**: Modal with name input, base selection (actual or existing scenario)
- **impact-bar.tsx**: 4-metric comparison bar (utilization, overloaded, bench hours, new conflicts)
- **promote-modal.tsx**: Two-step flow -- step 1: checkbox selection, step 2: review + confirmation friction
- **exit-scenario-dialog.tsx**: Three-option dialog (save+exit, discard, continue editing)
- **comparison-view.tsx**: Side-by-side table with actual (left, read-only) vs scenario (right) with delta column

### Pages (3 new pages)
- **/scenarios**: List page with scenario cards, empty state, create button
- **/scenarios/[id]**: Editor page with amber banner, impact bar, allocation table with hatched-stripe backgrounds for modified rows, promote button
- **/scenarios/[id]/compare**: Side-by-side comparison view

### Navigation
- Added "Scenarier"/"Scenarios" nav item to top-nav (FlaskConical icon, flag-gated behind 'scenarios')
- Added scenarios section to side-nav
- Added i18n translations for both Swedish and English

## Isolation Guarantees

| Aspect | Isolation Method |
|--------|-----------------|
| DB tables | Separate: scenarios, scenario_allocations, scenario_temp_entities |
| API routes | Separate: /api/scenarios/* (never touches /api/allocations or /api/analytics) |
| React Query keys | Separate: ['scenario', id, ...] prefix (never shares with actual data keys) |
| Service functions | Separate: scenario.service.ts + scenario-analytics.service.ts (new files) |
| Grid autosave | Separate: use-scenario-grid-autosave.ts writes to PUT /api/scenarios/:id/allocations |
| Cache invalidation | Promote is the ONE cross-boundary operation -- invalidates both namespaces |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all data flows are wired from DB through API to UI. The feature is flag-gated (disabled by default) so users will not see it until explicitly enabled per-org.

## Commits

| Hash | Message |
|------|---------|
| 05e85f6 | feat(32-01): What-If Scenario mode with full isolation |
