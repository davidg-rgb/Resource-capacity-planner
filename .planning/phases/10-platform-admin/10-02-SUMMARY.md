---
phase: 10-platform-admin
plan: 02
subsystem: platform-dashboard-tenants
tags: [platform-admin, dashboard, tenant-management, subscription-management, admin-ui]

requires:
  - phase: 10-platform-admin
    plan: 01
    provides: requirePlatformAdmin, logPlatformAction, handleApiError, platform auth routes
  - phase: 02-database-schema-tenant-isolation
    provides: organizations, people tables in schema

provides:
  - Platform admin shell with sidebar navigation at /platform/*
  - Dashboard page with org metrics and recently active list
  - Tenant list/detail pages with suspend/reactivate/delete actions
  - Subscription management page with inline edit
  - Dashboard metrics service (getDashboardMetrics)
  - Tenant CRUD service (listTenants, getTenantDetail, suspendTenant, reactivateTenant, deleteTenant, updateSubscription)
  - API routes for dashboard, tenants, subscriptions

affects: [10-03 impersonation, 10-04 audit-log-and-users]

tech-stack:
  added: []
  patterns: [client-side-fetch-pattern, status-badge-colors, inline-edit-table, confirm-dialog-with-type-to-delete]

key-files:
  created:
    - src/components/platform/platform-sidebar.tsx
    - src/components/platform/platform-shell.tsx
    - src/app/(platform)/layout.tsx
    - src/app/(platform)/login/layout.tsx
    - src/app/(platform)/login/page.tsx
    - src/app/(platform)/page.tsx
    - src/app/(platform)/tenants/page.tsx
    - src/app/(platform)/tenants/[orgId]/page.tsx
    - src/app/(platform)/subscriptions/page.tsx
    - src/features/platform/platform-dashboard.service.ts
    - src/features/platform/platform-tenant.service.ts
    - src/features/platform/platform-tenant.schema.ts
    - src/app/api/platform/dashboard/route.ts
    - src/app/api/platform/tenants/route.ts
    - src/app/api/platform/tenants/[orgId]/route.ts
    - src/app/api/platform/tenants/[orgId]/suspend/route.ts
    - src/app/api/platform/tenants/[orgId]/reactivate/route.ts
    - src/app/api/platform/subscriptions/[orgId]/route.ts
    - src/lib/platform-auth.ts
    - src/lib/platform-audit.ts
    - src/lib/api-utils.ts
  modified: []

key-decisions:
  - "Dashboard counts people records as 'users' metric (not Clerk API calls) for performance"
  - "Tenant detail delete requires typing org name to confirm (destructive action safety)"
  - "Subscriptions page reuses /api/platform/tenants endpoint rather than separate endpoint"
  - "Login page uses separate layout.tsx to bypass PlatformShell auth check"
  - "Created platform-auth/audit/api-utils as 10-01 deps for parallel execution compatibility"

requirements-completed: [PLAT-02, PLAT-06, PLAT-07]

duration: 5min
completed: 2026-03-27
---

# Phase 10 Plan 02: Platform Dashboard & Tenant Management Summary

Platform admin shell with sidebar navigation, dashboard metrics, tenant list/detail with suspend/reactivate/delete, and subscription management with inline editing.

## What Was Built

### Task 1: Platform Shell, Services, and API Routes
- **platform-sidebar.tsx**: Client component with 5 nav links (Dashboard, Tenants, Subscriptions, Users, Audit Log) using lucide-react icons, active state highlighting, admin info display, logout button
- **platform-shell.tsx**: Auth-checking wrapper that fetches `/api/platform/auth/me` on mount, redirects to login on 401, provides sidebar + main content layout
- **layout.tsx**: Platform route group layout wrapping children in PlatformShell
- **login/layout.tsx**: Override layout for login page that renders WITHOUT PlatformShell (centered container only)
- **login/page.tsx**: Email/password form posting to `/api/platform/auth/login`, error display, redirect on success
- **platform-dashboard.service.ts**: `getDashboardMetrics()` aggregating total orgs, total people, orgs by status, recently active (7 days)
- **platform-tenant.service.ts**: `listTenants()`, `getTenantDetail()`, `suspendTenant()`, `reactivateTenant()`, `deleteTenant()`, `updateSubscription()` with NotFoundError handling
- **platform-tenant.schema.ts**: Zod schemas for suspend reason and subscription update validation
- **API routes**: 6 endpoints all gated by `requirePlatformAdmin()`, mutations audit-logged via `logPlatformAction()`

### Task 2: Dashboard and Management Pages
- **Dashboard page** (`/platform`): 4 metric cards (Total Orgs, Total Users, Active, Trial), recently active orgs table with status badges, skeleton loading states
- **Tenants list** (`/platform/tenants`): Table with name, status badge, user count, created date, view link
- **Tenant detail** (`/platform/tenants/[orgId]`): Org info card (slug, Clerk ID, people count, trial end, credit balance, notes), action buttons (Suspend with reason dialog, Reactivate, Delete with type-name confirmation, Impersonate disabled placeholder)
- **Subscriptions** (`/platform/subscriptions`): Table with inline edit mode per row - status dropdown, trial end date picker, notes textarea, save/cancel controls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created platform-auth.ts, platform-audit.ts, api-utils.ts**
- **Found during:** Task 1 setup
- **Issue:** Plan 10-01 outputs don't exist in this worktree (parallel execution). These files are required dependencies for all API routes.
- **Fix:** Created all three files matching the interfaces documented in 10-01-SUMMARY.md: `signPlatformToken()`, `requirePlatformAdmin()` (JWT from cookie), `logPlatformAction()` (audit with IP/UA), `handleApiError()` (AppError/ZodError mapping)
- **Files created:** src/lib/platform-auth.ts, src/lib/platform-audit.ts, src/lib/api-utils.ts
- **Commit:** 4c9115c

**2. [Rule 1 - Bug] Fixed ZodError.errors to ZodError.issues**
- **Found during:** Task 1 TypeScript check
- **Issue:** Zod 3.x uses `.issues` property, not `.errors`
- **Fix:** Changed `error.errors.map()` to `error.issues.map()` in api-utils.ts
- **Files modified:** src/lib/api-utils.ts
- **Commit:** 4c9115c

## Verification Results

- TypeScript compiles with zero errors after both tasks
- Platform sidebar has all 5 nav links with correct icons (LayoutDashboard, Building2, CreditCard, Users, FileText)
- All API routes call `requirePlatformAdmin()` for auth
- All mutation API routes call `logPlatformAction()` for audit
- Tenant service exports all 6 functions (listTenants, getTenantDetail, suspendTenant, reactivateTenant, deleteTenant, updateSubscription)
- Dashboard service exports getDashboardMetrics
- Platform route group layout exists at src/app/(platform)/layout.tsx
- Login page exists at src/app/(platform)/login/page.tsx

## Known Stubs

- **Impersonate button** on tenant detail page is disabled with "Coming in next plan" - intentional, will be implemented in plan 10-03
- **Users page** (`/platform/users`) - navigation link exists in sidebar but page not created in this plan - covered by plan 10-04
- **Audit Log page** (`/platform/audit`) - navigation link exists in sidebar but page not created - covered by plan 10-04

## Commits

| Task | Commit  | Description                                                    |
| ---- | ------- | -------------------------------------------------------------- |
| 1    | 4c9115c | Platform shell, dashboard/tenant/subscription services and APIs |
| 2    | 0670f40 | Dashboard, tenant list/detail, and subscription management pages |

## Self-Check: PASSED

All 21 created files verified on disk. Both commit hashes (4c9115c, 0670f40) confirmed in git log.
