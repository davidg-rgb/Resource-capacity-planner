---
phase: 11-infrastructure-feature-flags
plan: 02
subsystem: infra
tags: [feature-flags, platform-admin, route-guard, nav-filtering, zod, upsert]

requires:
  - phase: 11-infrastructure-feature-flags
    provides: FeatureFlags types, FlagProvider context, useFlags hook, getOrgFlags service
provides:
  - PATCH /api/platform/flags/[orgId] toggle endpoint with Zod validation and upsert
  - GET /api/platform/flags/[orgId] flag listing endpoint
  - Feature Flags toggle UI on tenant detail page
  - Flag-aware nav filtering in TopNav via useFlags()
  - FlagGuard client component for route-level access control
affects: [12-team-overview, 13-dashboard-charts, 14-alerts-project-view, 15-pdf-export, 16-onboarding-announcements]

tech-stack:
  added: []
  patterns: [flag-gated-nav-items, client-side-route-guard, upsert-on-conflict]

key-files:
  created:
    - src/app/api/platform/flags/[orgId]/route.ts
    - src/features/flags/flag-guard.tsx
  modified:
    - src/app/(platform)/tenants/[orgId]/page.tsx
    - src/components/layout/top-nav.tsx
    - src/app/(app)/layout.tsx

key-decisions:
  - "Used useEffect + router.replace for FlagGuard redirect instead of render-time redirect() to avoid React hydration issues"
  - "Added optional flag property to NavItem interface for incremental flag gating of nav items"

patterns-established:
  - "Nav flag gating: add flag?: FlagName to NavItem, filter with visibleItems = NAV_ITEMS.filter(item => !item.flag || flags[item.flag])"
  - "Route flag gating: FlagGuard checks FLAG_ROUTE_MAP against pathname and redirects to /input if disabled"

requirements-completed: [INFRA-02, INFRA-03]

duration: 3min
completed: 2026-03-28
---

# Phase 11 Plan 02: Flag Toggle API, Admin UI & Route Guards Summary

**Platform admin flag toggle API with upsert, tenant detail toggle UI, flag-filtered navigation, and client-side route guards redirecting disabled features to /input**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T11:57:32Z
- **Completed:** 2026-03-28T12:00:10Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Built GET/PATCH API for per-tenant feature flag toggling with Zod validation and Drizzle upsert (onConflictDoUpdate)
- Added Feature Flags card to tenant detail page with toggle buttons, human-readable labels, and Sonner toast feedback
- Wired flag-aware nav filtering into TopNav: Dashboard item hidden when dashboards flag is disabled
- Created FlagGuard client component that redirects users away from disabled flagged routes (/dashboard, /alerts) to /input

## Task Commits

Each task was committed atomically:

1. **Task 1: Create flag toggle API endpoint and add flag toggle UI to tenant detail page** - `888528c` (feat)
2. **Task 2: Wire flag-aware nav filtering and route-level guards** - `de800be` (feat)

## Files Created/Modified
- `src/app/api/platform/flags/[orgId]/route.ts` - GET and PATCH endpoints for flag toggling with Zod validation
- `src/features/flags/flag-guard.tsx` - Client component checking FLAG_ROUTE_MAP and redirecting disabled routes
- `src/app/(platform)/tenants/[orgId]/page.tsx` - Feature Flags card with toggle buttons and toast feedback
- `src/components/layout/top-nav.tsx` - Flag-aware nav filtering with NavItem.flag property
- `src/app/(app)/layout.tsx` - FlagGuard wrapping AppShell children

## Decisions Made
- Used useEffect + router.replace for FlagGuard redirect instead of render-time redirect() to avoid React hydration issues in client components
- Added optional flag property to NavItem interface so only flagged items are filtered; unflagged items always visible

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functionality is fully wired.

## Next Phase Readiness
- Feature flag system is complete end-to-end: types, service, context, API, admin UI, nav filtering, and route guards
- Future phases can gate new features by adding entries to FLAG_NAMES, FLAG_ROUTE_MAP, and NavItem.flag properties
- Phase 12 (Team Overview) can be gated behind a new flag if desired

## Self-Check: PASSED

All 5 files verified present. Both task commits (888528c, de800be) verified in git log.

---
*Phase: 11-infrastructure-feature-flags*
*Completed: 2026-03-28*
