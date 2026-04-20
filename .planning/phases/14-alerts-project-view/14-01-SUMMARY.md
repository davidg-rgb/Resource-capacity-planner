---
phase: 14-alerts-project-view
plan: 01
subsystem: analytics, ui
tags: [tanstack-query, drizzle, sql-cte, alerts, capacity, lucide-react]

requires:
  - phase: 13-dashboard-charts
    provides: analytics service patterns, dashboard KPI CTE queries
  - phase: 11-infrastructure-feature-flags
    provides: feature flag system (getOrgFlags, useFlags, FlagGuard)
provides:
  - CapacityAlert and ProjectStaffing types
  - getCapacityAlerts, getAlertCount, getProjectStaffing service functions
  - GET /api/analytics/alerts, /api/analytics/alerts/count, /api/analytics/project-staffing endpoints
  - useAlerts, useAlertCount, useProjectStaffing TanStack Query hooks
  - AlertBadge component with count overlay
  - AlertList component with severity grouping and person links
  - /alerts page with full alert list
  - TopNav bell button with alert badge and Alerts nav item
affects: [14-02-project-view, future alert enhancements]

tech-stack:
  added: []
  patterns: [flag-gated API routes, alert count badge with short staleTime for freshness, cache invalidation on allocation save]

key-files:
  created:
    - src/app/api/analytics/alerts/route.ts
    - src/app/api/analytics/alerts/count/route.ts
    - src/app/api/analytics/project-staffing/route.ts
    - src/hooks/use-alerts.ts
    - src/hooks/use-project-staffing.ts
    - src/components/alerts/alert-badge.tsx
    - src/components/alerts/alert-list.tsx
    - src/app/(app)/alerts/page.tsx
  modified:
    - src/features/analytics/analytics.types.ts
    - src/features/analytics/analytics.service.ts
    - src/hooks/use-grid-autosave.ts
    - src/components/layout/top-nav.tsx

key-decisions:
  - "Alert count badge uses 30s staleTime with refetchOnWindowFocus for near-real-time badge updates"
  - "Grid autosave invalidates both alerts and alert-count caches so badge updates after allocation edits"
  - "Project staffing endpoint not flag-gated since it serves Plan 02 project view which has no separate flag"

patterns-established:
  - "Flag-gated API routes: check getOrgFlags before processing, return 403 if disabled"
  - "Alert cache invalidation pattern: invalidate ['alerts'] and ['alert-count'] prefix keys on allocation changes"

requirements-completed: [ALRT-01, ALRT-02, ALRT-03, ALRT-04]

duration: 3min
completed: 2026-03-28
---

# Phase 14 Plan 01: Alerts & Project View Backend + Alerts UI Summary

**Capacity alerts system with overloaded/underutilized severity grouping, badge overlay in TopNav, flag-gated API routes, and full project staffing backend for Plan 02**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T13:03:53Z
- **Completed:** 2026-03-28T13:07:26Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Built complete alerts backend: types, 3 service functions (getCapacityAlerts, getAlertCount, getProjectStaffing), 3 API routes with flag gating
- Created AlertBadge with live count overlay and AlertList with severity-grouped person links to /input/{personId}
- Wired alert badge into TopNav bell button and added Alerts nav item, both gated by alerts feature flag
- Grid autosave now invalidates alert caches so counts refresh after allocation edits

## Task Commits

Each task was committed atomically:

1. **Task 1: Add alert and project staffing types, service, API routes, and hooks** - `f4991e2` (feat)
2. **Task 2: Build alert badge, alert list, and alerts page** - `dd7102d` (feat)
3. **Task 3: Wire AlertBadge into TopNav and add Alerts nav item** - `2ac3c00` (feat)

## Files Created/Modified
- `src/features/analytics/analytics.types.ts` - Added CapacityAlert, AlertSeverity, ProjectStaffingPerson, ProjectStaffingResponse types
- `src/features/analytics/analytics.service.ts` - Added getCapacityAlerts, getAlertCount, getProjectStaffing functions
- `src/app/api/analytics/alerts/route.ts` - GET endpoint for capacity alerts (flag-gated)
- `src/app/api/analytics/alerts/count/route.ts` - GET endpoint for alert count (flag-gated)
- `src/app/api/analytics/project-staffing/route.ts` - GET endpoint for project staffing data
- `src/hooks/use-alerts.ts` - useAlerts and useAlertCount TanStack Query hooks
- `src/hooks/use-project-staffing.ts` - useProjectStaffing TanStack Query hook
- `src/components/alerts/alert-badge.tsx` - AlertBadge count overlay component
- `src/components/alerts/alert-list.tsx` - AlertList with severity grouping and person links
- `src/app/(app)/alerts/page.tsx` - Alerts page at /alerts route
- `src/hooks/use-grid-autosave.ts` - Added alert cache invalidation on allocation save
- `src/components/layout/top-nav.tsx` - AlertBadge in bell button, Alerts nav item

## Decisions Made
- Alert count badge uses 30s staleTime (vs 60s for full alerts) with refetchOnWindowFocus for near-real-time updates
- Grid autosave invalidates both 'alerts' and 'alert-count' query key prefixes across all three invalidation paths (clean save, error rollback, conflict resolution)
- Project staffing API has no flag gate since it will be consumed by Plan 02's project view which shares the alerts flag route mapping

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components are wired to live data sources.

## Next Phase Readiness
- All backend infrastructure for Plan 02 (Project View) is ready: ProjectStaffingResponse types, getProjectStaffing service, /api/analytics/project-staffing endpoint, useProjectStaffing hook
- Alerts feature fully functional when alerts flag is enabled for a tenant

## Self-Check: PASSED

- All 12 files verified present
- Commits f4991e2, dd7102d, 2ac3c00 verified in git log

---
*Phase: 14-alerts-project-view*
*Completed: 2026-03-28*
