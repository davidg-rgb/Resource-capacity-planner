---
phase: 03-authentication-app-shell
plan: 02
subsystem: authentication
tags: [clerk, middleware, webhook, organizations, seeding]
dependency_graph:
  requires: [03-01]
  provides: [clerk-middleware, sign-in-page, sign-up-page, onboarding-page, webhook-handler, org-service]
  affects: [proxy.ts, layout.tsx]
tech_stack:
  added: ["@clerk/nextjs (middleware, components, webhooks)"]
  patterns: [clerkMiddleware-route-protection, verifyWebhook-signature, tenant-seeding-on-org-create]
key_files:
  created:
    - src/app/sign-in/[[...sign-in]]/page.tsx
    - src/app/sign-up/[[...sign-up]]/page.tsx
    - src/app/onboarding/page.tsx
    - src/app/api/webhooks/clerk/route.ts
    - src/features/organizations/organization.service.ts
  modified:
    - src/proxy.ts
    - src/app/layout.tsx
decisions:
  - "Default departments: Engineering, Product, Operations (reasonable for Nordic engineering orgs)"
  - "Onboarding page is placeholder -- content to be built in future plan"
  - "Webhook handler uses explicit env.CLERK_WEBHOOK_SECRET to avoid Clerk SDK default env var mismatch"
metrics:
  duration: 109s
  completed: 2026-03-26T11:23:12Z
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 2
---

# Phase 3 Plan 2: Clerk Auth Integration Summary

Clerk authentication middleware with route protection, sign-in/sign-up pages using pre-built components, webhook handler for org lifecycle sync, and organization service seeding 6 engineering disciplines + 3 departments on creation.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Replace proxy.ts with clerkMiddleware and create auth pages | 3b5299c | src/proxy.ts, src/app/layout.tsx, sign-in/sign-up/onboarding pages |
| 2 | Create webhook handler and organization service | 9b975cd | src/app/api/webhooks/clerk/route.ts, src/features/organizations/organization.service.ts |

## What Was Built

### Clerk Middleware (proxy.ts)
Replaced the passthrough proxy with `clerkMiddleware()` that protects all routes except public ones: `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/onboarding`, `/api/health`, `/api/webhooks/(.*)`. Uses `auth.protect()` for non-public routes.

### Root Layout (layout.tsx)
Wrapped existing layout with `<ClerkProvider>` while preserving Inter + Manrope font setup and all existing CSS classes.

### Auth Pages
- `/sign-in` -- Clerk `<SignIn />` component centered on screen
- `/sign-up` -- Clerk `<SignUp />` component centered on screen
- `/onboarding` -- Placeholder page with "Getting Started" heading

### Webhook Handler (route.ts)
POST endpoint at `/api/webhooks/clerk` that:
1. Verifies Clerk webhook signatures using explicit `env.CLERK_WEBHOOK_SECRET`
2. Dispatches `organization.created` events to `createOrganization()`
3. Returns structured error responses for AppError instances
4. Returns 400 for verification failures

### Organization Service
- `createOrganization()` -- checks for duplicate clerkOrgId, inserts org record, calls seedDefaults
- `seedDefaults()` -- seeds 6 disciplines (Software/SW, Mechanical/ME, Electronics/EL, Test/TE, Systems/SY, Hardware/HW) and 3 departments (Engineering, Product, Operations) via withTenant()

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

- `src/app/onboarding/page.tsx` -- Static placeholder with no interactive content. Intentional: onboarding wizard is a post-MVP feature (F-028). This page serves as the redirect target after sign-up.
