---
phase: 23-dashboard-framework
plan: 02
subsystem: dashboard-layout-engine
tags: [layout-engine, dnd-kit, edit-mode, layout-api, 4-tier-resolution]
dependency_graph:
  requires: [widget-registry, default-layouts, dashboardLayouts-table, TimeRangeProvider]
  provides: [DashboardGrid, EditModeToggle, SortableWidget, WidgetDrawer, useDashboardLayout, useSaveLayout, layout-api-get, layout-api-put, layout-api-default-put]
  affects: [src/features/dashboard/, src/app/api/dashboard/layout/]
tech_stack:
  added: []
  patterns: [useSyncExternalStore-for-media-query, optimistic-mutation, 4-tier-layout-resolution, sentinel-user-id]
key_files:
  created:
    - src/app/api/dashboard/layout/route.ts
    - src/app/api/dashboard/layout/default/route.ts
    - src/features/dashboard/use-dashboard-layout.ts
    - src/features/dashboard/dashboard-layout-engine.tsx
    - src/features/dashboard/dashboard-edit-mode.tsx
  modified: []
decisions:
  - Used useSyncExternalStore instead of useState+useEffect for device class detection to satisfy react-hooks/set-state-in-effect lint rule
  - Inlined CSS transform logic instead of adding @dnd-kit/utilities dependency
  - Used array.join for className merging since project has no cn/clsx utility
metrics:
  duration: ~23 minutes
  completed: 2026-04-01
---

# Phase 23 Plan 02: Layout Engine + Edit Mode + Layout API Summary

CSS Grid layout engine with dnd-kit drag-and-drop, full edit mode UX (toggle/drawer/resize/remove), 3 API endpoints, and 4-tier layout resolution hook using useSyncExternalStore for device detection.

## What Was Built

### Layout API (3 endpoints)

**GET /api/dashboard/layout** - 4-tier resolution cascade:
1. Personal layout (exact user + dashboard + device)
2. Cloned from opposite device class (same user)
3. Tenant default (sentinel `__tenant_default__` user)
4. Built-in persona default from `default-layouts.ts`

Filters out widgets no longer in registry (stale widget protection).

**PUT /api/dashboard/layout** - Upserts personal layout with Drizzle `onConflictDoUpdate` on the 4-column unique index.

**PUT /api/dashboard/layout/default** - Admin-only (requireRole('admin')) tenant default upsert.

### useDashboardLayout Hook

- Device class detection via `useSyncExternalStore` subscribing to `matchMedia('(max-width: 768px)')` - SSR-safe with 'desktop' server snapshot
- TanStack Query with 5-minute staleTime
- Returns `{ layout, source, deviceClass, isLoading, isError }`

### useSaveLayout Mutation

- Optimistic update: immediately updates query cache, rolls back on error
- Toast notification on failure (Swedish: "Kunde inte spara layout")
- Invalidates layout query on settle

### DashboardGrid Component

- 12-column CSS Grid (`grid grid-cols-12 gap-6`)
- DndContext with closestCenter collision detection and PointerSensor (8px activation distance)
- SortableContext with `strategy={() => null}` (critical for variable-span grid items)
- DragOverlay rendering the dragged widget at reduced opacity
- Local `widgets` state synced from server, mutations update both local + server

### Edit Mode UX

- **EditModeToggle**: Pencil icon / "Klar" text, highlighted ring when active
- **WidgetDrawer**: Fixed slide-in panel (z-50), grouped by category, shows "Tillagd" badge for already-placed widgets
- **ResizeHandle**: Click cycles colSpan through 4 -> 6 -> 12 (respecting minColSpan)
- **RemoveButton**: X icon, removes from layout and saves
- **MemoizedWidgetContent**: `React.memo` wrapper prevents widget re-renders on edit toggle

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 record() requires two arguments**
- Found during: Task 1
- Issue: `z.record(z.unknown())` fails in Zod v4 which requires explicit key type
- Fix: Changed to `z.record(z.string(), z.unknown())`
- Files: route.ts, default/route.ts
- Commit: 3579ee5

**2. [Rule 1 - Bug] react-hooks/set-state-in-effect lint error**
- Found during: Task 1
- Issue: Calling `setDeviceClass()` directly inside useEffect body violates ESLint rule
- Fix: Replaced useState+useEffect with `useSyncExternalStore` for media query subscription
- Files: use-dashboard-layout.ts
- Commit: 3579ee5

**3. [Rule 3 - Blocking] @dnd-kit/utilities not installed**
- Found during: Task 2
- Issue: `CSS.Transform.toString()` imported from `@dnd-kit/utilities` which isn't a project dependency
- Fix: Inlined transform string generation with `translate3d()` format
- Files: dashboard-edit-mode.tsx
- Commit: 6d045be

**4. [Rule 3 - Blocking] No cn/clsx utility in project**
- Found during: Task 2
- Issue: `@/lib/utils` with `cn()` doesn't exist in this codebase
- Fix: Used `[...classes].join(' ')` pattern for conditional className merging
- Files: dashboard-edit-mode.tsx
- Commit: 6d045be

## Commits

| Hash | Message |
|------|---------|
| 3579ee5 | feat(23-02): layout API endpoints and useDashboardLayout hook |
| 6d045be | feat(23-02): layout engine component and edit mode UX |

## Known Stubs

None - all components are fully wired to the layout API and widget registry. Widget rendering depends on actual widget components being registered (Plan 23-03+), but the layout engine itself has no stubs.
