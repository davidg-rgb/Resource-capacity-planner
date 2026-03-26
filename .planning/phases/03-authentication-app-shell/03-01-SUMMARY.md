---
phase: 03-authentication-app-shell
plan: 01
subsystem: auth
tags: [clerk, error-handling, rbac, typescript, zod]

requires:
  - phase: 02-database-schema-tenant-isolation
    provides: withTenant() query wrapper, env.ts with Clerk vars (optional)
provides:
  - AppError base class with 7 typed subclasses and toJSON() serialization
  - getTenantId() Clerk auth helper extracting orgId from session
  - requireRole() RBAC enforcer with viewer < planner < admin < owner hierarchy
  - Clerk env vars promoted to required validation
  - "@clerk/nextjs and lucide-react installed"
affects: [03-02 proxy-middleware, 03-03 webhook-handler, 03-04 app-shell-layout, 04-person-project-crud]

tech-stack:
  added: ["@clerk/nextjs 7.0.7", "lucide-react 1.7.0"]
  patterns: [error-taxonomy-with-typed-subclasses, clerk-org-role-mapping, hierarchical-rbac]

key-files:
  created: [src/lib/errors.ts, src/lib/auth.ts]
  modified: [src/lib/env.ts, package.json, .env.example]

key-decisions:
  - "Clerk org:* prefixed roles mapped via CLERK_ROLE_MAP lookup table for clean role extraction"
  - "Error hierarchy uses string error codes (ERR_VALIDATION etc.) for API-friendly serialization"

patterns-established:
  - "AppError hierarchy: all app errors extend AppError with code, statusCode, toJSON()"
  - "Clerk auth pattern: async auth() returns { userId, orgId, orgRole } -- always await"
  - "Role hierarchy: numeric comparison via ROLE_HIERARCHY record for >= checks"

requirements-completed: [FOUND-06, AUTH-06, AUTH-08]

duration: 2min
completed: 2026-03-26
---

# Phase 3 Plan 1: Auth Foundation Summary

**AppError taxonomy with 7 typed subclasses, Clerk getTenantId/requireRole helpers with org:* role mapping, and required env var promotion**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T11:15:48Z
- **Completed:** 2026-03-26T11:18:08Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Installed @clerk/nextjs 7.0.7 and lucide-react 1.7.0
- Created full error taxonomy (AppError + ValidationError, AuthError, ForbiddenError, NotFoundError, ConflictError, PayloadTooLargeError, InternalError) with toJSON() serialization
- Created getTenantId() and requireRole() Clerk auth helpers with org:* role prefix mapping
- Promoted 3 Clerk env vars from optional to required in env.ts validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and promote Clerk env vars** - `1cba8ca` (feat)
2. **Task 2: Create error taxonomy and auth helpers** - `aa8bea3` (feat)

## Files Created/Modified
- `src/lib/errors.ts` - AppError base class + 7 typed subclasses with error codes and toJSON()
- `src/lib/auth.ts` - getTenantId() and requireRole() Clerk auth helpers with RBAC
- `src/lib/env.ts` - Promoted CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to required
- `package.json` - Added @clerk/nextjs and lucide-react dependencies
- `.env.example` - Updated Clerk section with REQUIRED markers

## Decisions Made
- Used Clerk org:* prefixed role mapping (org:admin -> admin) via lookup table rather than string manipulation
- Error codes use ERR_ prefix convention (ERR_VALIDATION, ERR_AUTH, etc.) for consistent API serialization
- getTenantId() returns raw Clerk orgId (not DB organization UUID) -- downstream code uses withTenant() to scope queries

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. (Clerk dashboard setup will be needed in later plans when the app shell is wired up.)

## Next Phase Readiness
- Error taxonomy ready for use in proxy middleware (03-02), webhook handler (03-03), and app shell (03-04)
- Auth helpers ready for route protection and layout guards
- TypeScript compilation passes cleanly across entire project

---
*Phase: 03-authentication-app-shell*
*Completed: 2026-03-26*
