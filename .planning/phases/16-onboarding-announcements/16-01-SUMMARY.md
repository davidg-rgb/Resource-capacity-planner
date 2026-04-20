---
phase: 16-onboarding-announcements
plan: 01
subsystem: database, api, onboarding
tags: [drizzle, onboarding, feature-flags, next.js, server-redirect]

requires:
  - phase: 11-infrastructure-feature-flags
    provides: feature flag system with getOrgFlags and onboarding flag definition
provides:
  - onboardingCompletedAt column on organizations table
  - onboarding service (isOrgOnboarded, markOnboarded, getOnboardingStatus)
  - GET /api/onboarding/status endpoint
  - POST /api/onboarding/complete endpoint
  - department and discipline suggestion constants
  - server-side onboarding redirect in (app) layout
affects: [16-02 onboarding wizard UI, 16-03 announcements]

tech-stack:
  added: []
  patterns: [nullable-timestamp-as-boolean-flag, server-side-redirect-gated-by-feature-flag]

key-files:
  created:
    - src/features/onboarding/onboarding.service.ts
    - src/features/onboarding/onboarding.types.ts
    - src/features/onboarding/onboarding.constants.ts
    - src/app/api/onboarding/status/route.ts
    - src/app/api/onboarding/complete/route.ts
  modified:
    - src/db/schema.ts
    - src/app/(app)/layout.tsx

key-decisions:
  - "Nullable timestamp pattern for onboarding: NULL = not onboarded, non-null = onboarded"
  - "Backfilled all existing orgs with NOW() to prevent redirect to wizard"
  - "Redirect gated by both feature flag AND onboarding status for safe rollout"

patterns-established:
  - "Nullable timestamp as boolean flag: check column != null instead of separate boolean"
  - "Server-side redirect in layout gated by feature flag for gradual feature rollout"

requirements-completed: [ONBR-01, ONBR-03, ONBR-04, ONBR-05]

duration: 3min
completed: 2026-03-28
---

# Phase 16 Plan 01: Onboarding Backend Summary

**Onboarding data layer with schema migration, service functions, API routes, suggestion constants, and flag-gated server-side redirect in app layout**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T13:45:03Z
- **Completed:** 2026-03-28T13:47:34Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added onboardingCompletedAt nullable timestamp column to organizations table with backfill for all existing orgs
- Created onboarding service with isOrgOnboarded, markOnboarded, and getOnboardingStatus functions
- Built GET /api/onboarding/status and POST /api/onboarding/complete API routes
- Added department and discipline suggestion constants for the wizard
- Wired server-side redirect in (app) layout gated by onboarding feature flag

## Task Commits

Each task was committed atomically:

1. **Task 1: Add onboardingCompletedAt column, create service, types, constants, and API routes** - `bd7630e` (feat)
2. **Task 2: Add onboarding redirect to (app) layout** - `ded9524` (feat)

## Files Created/Modified
- `src/db/schema.ts` - Added onboardingCompletedAt column to organizations table
- `src/features/onboarding/onboarding.service.ts` - Server-side onboarding check/mark/status functions
- `src/features/onboarding/onboarding.types.ts` - OnboardingStatus interface
- `src/features/onboarding/onboarding.constants.ts` - Department and discipline suggestion arrays
- `src/app/api/onboarding/status/route.ts` - GET endpoint returning onboarding state
- `src/app/api/onboarding/complete/route.ts` - POST endpoint to mark org as onboarded
- `src/app/(app)/layout.tsx` - Server-side redirect for non-onboarded orgs

## Decisions Made
- Used nullable timestamp pattern (NULL = not onboarded) instead of separate boolean column -- simpler and captures when onboarding was completed
- Backfilled all existing organizations with NOW() immediately after schema push to prevent any redirect to wizard
- Redirect is double-gated: requires both onboarding feature flag enabled AND org not yet onboarded

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all data sources are wired and functional.

## Next Phase Readiness
- Onboarding backend is complete and ready for the wizard UI (plan 16-02)
- API routes are functional for wizard to check status and mark completion
- Suggestion constants are available for pre-filling wizard form fields
- Layout redirect is active when onboarding flag is enabled

## Self-Check: PASSED

All 5 created files verified on disk. Both commit hashes (bd7630e, ded9524) confirmed in git log.

---
*Phase: 16-onboarding-announcements*
*Completed: 2026-03-28*
