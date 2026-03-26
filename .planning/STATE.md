---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 2
status: Executing Phase 05
stopped_at: Completed 05-02-PLAN.md
last_updated: "2026-03-26T16:16:32Z"
progress:
  total_phases: 10
  completed_phases: 4
  total_plans: 11
  completed_plans: 11
---

# Nordic Capacity -- Project State

## Current Phase

Phase 5 -- Reference Data Admin (complete)

Current Plan: 2 of 2

## Phase Status

| Phase | Name                                  | Status      | Started    | Completed |
| ----- | ------------------------------------- | ----------- | ---------- | --------- |
| 1     | Project Scaffolding & Dev Environment | complete    | 2026-03-26 | 2026-03-26 |
| 2     | Database Schema & Tenant Isolation    | complete    | 2026-03-26 | 2026-03-26 |
| 3     | Authentication & App Shell            | in progress | 2026-03-26 | --        |
| 4     | Person & Project CRUD                 | not started | --         | --        |
| 5     | Reference Data Admin                  | complete    | 2026-03-26 | 2026-03-26 |
| 6     | AG Grid Spike & Core Grid             | not started | --         | --        |
| 7     | Grid Polish & Navigation              | not started | --         | --        |
| 8     | Import Wizard                         | not started | --         | --        |
| 9     | Flat Table View & Export              | not started | --         | --        |
| 10    | Platform Admin                        | not started | --         | --        |

## Completed Requirements

- FOUND-03: Next.js 16 project setup with App Router, TypeScript, Tailwind CSS 4
- FOUND-09: Environment configuration -- all env vars documented and validated at startup
- FOUND-02: withTenant() ORM query wrapper enforcing tenant isolation on every database query
- FOUND-05: Database migrations and development seed data on Neon PostgreSQL
- FOUND-07: Health check endpoint returning 200 with DB connection status
- FOUND-06: Error taxonomy with typed subclasses matching ARCHITECTURE.md
- AUTH-06: getTenantId() and requireRole() Clerk auth helpers
- AUTH-08: Clerk env vars promoted to required validation
- AUTH-01: Sign up with email/password via Clerk (sign-up page)
- AUTH-02: Log in and stay logged in via Clerk (sign-in page)
- AUTH-03: Create organization during sign-up (webhook + org service)
- AUTH-04: Clerk webhook creates internal org record with default disciplines/departments
- AUTH-05: Protected routes redirect to sign-in via clerkMiddleware
- AUTH-07: Admin can invite team members via Clerk organization invitation API

## Decisions

- Used ESLint defineConfig/globalIgnores API instead of FlatCompat (circular reference with eslint-config-next 16)
- Kept TypeScript 5.9.3 from create-next-app instead of pinning to 5.7 (both 5.x, stable)
- Used `eslint .` instead of `next lint` (path with & character causes failure)
- proxy.ts exports named `proxy` function per Next.js 16 API (not `middleware`)
- Used process.env.DATABASE_URL directly in db/index.ts for CLI/seed script compatibility
- Single schema.ts file for all 13 tables per research recommendation
- date('month', { mode: 'string' }) for allocations to avoid JS timezone issues
- withTenant() returns chainable query builders (not middleware) for full Drizzle API flexibility
- Seed script uses own drizzle client (drizzle-orm/neon-http) outside Next.js context
- Clerk org:* prefixed roles mapped via CLERK_ROLE_MAP lookup table
- Error codes use ERR_ prefix convention for consistent API serialization
- Default departments seeded on org creation: Engineering, Product, Operations
- Webhook handler uses explicit env.CLERK_WEBHOOK_SECRET (not Clerk SDK default env var)
- [Phase 03]: Role validation allows org:viewer, org:planner, org:admin (cannot invite as org:owner -- only Clerk Dashboard can set owner)
- [Phase 05]: Usage count checks at service layer before delete for clear error messages with counts
- [Phase 05]: Centralized reference data hooks in single file with backward-compatible re-exports
- [Phase 05]: Usage count fetched on-demand when delete clicked, not pre-loaded for all rows

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
| ----- | ---- | -------- | ----- | ----- |
| 01    | 01   | 11min    | 2     | 21    |
| 02    | 01   | 4min     | 2     | 6     |
| 02    | 02   | 2min     | 2     | 4     |
| 03    | 01   | 2min     | 2     | 5     |
| 03    | 02   | 2min     | 2     | 7     |
| 03    | 03   | 2min     | 2     | 11    |
| 03    | 04   | 2min     | 1     | 1     |
| 05    | 01   | 3min     | 2     | 17    |
| 05    | 02   | 5min     | 2     | 8     |

## Active Context

- Milestone: MVP (v1)
- Total requirements: 60
- Total phases: 10
- Critical path: Phase 1 -> 2 -> 3 -> 4 -> 6 -> 7
- Parallelizable: Phase 4 || 5, Phase 7 || 8 || 9, Phase 10 || 4-9

## Last Session

- **Stopped at:** Completed 05-02-PLAN.md
- **Timestamp:** 2026-03-26T16:16:32Z

---

_Last updated: 2026-03-26_
