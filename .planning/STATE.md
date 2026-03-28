---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Visibility & Insights
current_plan: Not started
status: Defining requirements
stopped_at: Milestone v2.0 started
last_updated: "2026-03-28T00:00:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Nordic Capacity -- Project State

## Current Phase

Not started (defining requirements)

Current Plan: —

## Phase Status

| Phase | Name | Status | Started | Completed |
| ----- | ---- | ------ | ------- | --------- |

## Completed Requirements

(Carried from v1.0 — see MILESTONES.md for full list)

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
- [Phase 10]: Dashboard counts people records as users metric (not Clerk API) for performance
- [Phase 10]: Tenant delete requires typing org name to confirm (destructive action safety)
- [Phase 10]: Login page uses separate layout.tsx to bypass PlatformShell auth check
- [Phase 10]: Impersonation on tenant detail uses user search + pick pattern (not raw user ID input)
- [Phase 10]: Auth separation is architectural (Clerk + platform middleware) — no additional code needed

## Active Context

- Milestone: v2.0 Visibility & Insights
- Previous milestone: v1.0 MVP (shipped 2026-03-27, 60 requirements, 10 phases, 26 plans)

## Last Session

- **Stopped at:** Milestone v2.0 started
- **Timestamp:** 2026-03-28

---

_Last updated: 2026-03-28_
