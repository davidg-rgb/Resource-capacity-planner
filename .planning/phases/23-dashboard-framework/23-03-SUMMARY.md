---
phase: 23-dashboard-framework
plan: "03"
subsystem: dashboard/person-card
tags: [person-360, overlay, api, analytics, react-context]
dependency_graph:
  requires: []
  provides: [PersonCardProvider, usePersonCard, usePersonSummary, person-summary-endpoint]
  affects: [app-layout, analytics-service, analytics-types]
tech_stack:
  added: []
  patterns: [react-context-provider, createPortal, slide-out-panel, tanstack-query-hook]
key_files:
  created:
    - src/features/dashboard/person-card/person-card-provider.tsx
    - src/features/dashboard/person-card/person-card-overlay.tsx
    - src/features/dashboard/person-card/use-person-card.ts
    - src/app/api/analytics/person-summary/route.ts
  modified:
    - src/features/analytics/analytics.service.ts
    - src/features/analytics/analytics.types.ts
    - src/app/(app)/layout.tsx
decisions:
  - "email field returns null since people table has no email column; interface still includes it for future compatibility"
  - "Capacity threshold: >=80% = fully-allocated, >100% = overloaded, <80% = available"
  - "PersonCardProvider placed inside FlagProvider but outside AppShell, so person card works from anywhere in (app) routes"
  - "z-index: backdrop z-59, panel z-60 (above widget drawer z-50, below modals z-70)"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-01"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 3
---

# Phase 23 Plan 03: V7 Person 360 Card Summary

Person 360 slide-out overlay with global context provider, person summary REST endpoint, and TanStack Query data hook -- any component can now call `usePersonCard().openPersonCard(id)`.

## Completed Tasks

| Task | Name | Commit | Key Files |
| ---- | ---- | ------ | --------- |
| 1 | Person summary API endpoint + data hook | `2f131b5` | analytics.service.ts, person-summary/route.ts, use-person-card.ts |
| 2 | PersonCardProvider + overlay + app shell wiring | `3ef9cc9` | person-card-provider.tsx, person-card-overlay.tsx, layout.tsx |

## What Was Built

### Person Summary Endpoint (`GET /api/analytics/person-summary?personId=xxx`)
- Tenant-scoped query via `getTenantId()`
- Returns person info (name, department, discipline), current month utilization %, capacity status, active allocations with project names, FTE equivalent
- 400 for missing personId, 404 for person not found, standard error handling via `handleApiError`
- New `getPersonSummary()` function added to `analytics.service.ts` (3 SQL queries: person info, allocations, current utilization)

### usePersonSummary Hook
- TanStack Query hook with `['person-summary', personId]` cache key
- `enabled: !!personId` (disabled when panel closed)
- 2-minute stale time to avoid redundant fetches when toggling

### PersonCardProvider (Global Context)
- Provides `openPersonCard(id)` and `closePersonCard()` to entire app
- Uses `React.createPortal` to render overlay on `document.body`
- Wraps app content in layout.tsx inside `FlagProvider > PersonCardProvider > ...`

### PersonCardOverlay (Slide-out Panel)
- 360px fixed panel from right edge, z-60
- Slide-in animation with CSS transform/transition (300ms)
- Close triggers: Escape key, backdrop click, X button
- Content: name with status badge (green/amber/red), department, discipline tags, utilization bar, allocation cards with percentage bars and date ranges
- Loading skeleton, error state with retry button
- Material Design 3 tokens (bg-surface, text-on-surface, etc.)

## Decisions Made

1. **Email field = null**: The `people` table has no `email` column. The response interface includes `email: string | null` for forward compatibility, always returning null for now.
2. **Capacity thresholds**: `<80% = available`, `>=80% = fully-allocated`, `>100% = overloaded`. These are business rules matching the existing capacity calculation patterns.
3. **Provider placement**: Inside FlagProvider (needs client context) but wrapping all app content including AppShell, banners, and Toaster.
4. **Z-index strategy**: Backdrop z-59, panel z-60. Research doc specifies above widget drawer (z-50), below modals (z-70).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] People table has no email column**
- **Found during:** Task 1
- **Issue:** Plan specifies returning `email` from person data, but `people` table has no email column
- **Fix:** Return `email: null` always, keep interface field for future compatibility
- **Files modified:** `src/features/analytics/analytics.service.ts`

## Known Stubs

None -- all data flows are wired to real database queries. The `email: null` return is intentional (documented above) not a stub.

## Verification

- `pnpm tsc --noEmit` passes with zero errors
- `usePersonCard` is importable from any component within `(app)` route group
- PersonCardProvider wraps entire app content in layout.tsx

## Self-Check: PASSED

- All 4 created files exist on disk
- Both commit hashes (2f131b5, 3ef9cc9) found in git log
