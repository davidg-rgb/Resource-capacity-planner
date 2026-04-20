---
phase: 03-authentication-app-shell
verified: 2026-03-26T12:00:00Z
status: human_needed
score: 14/14 automated must-haves verified
re_verification: false
human_verification:
  - test: "Sign up with email/password creates a new Clerk account"
    expected: "User can complete sign-up at /sign-up and is redirected to /onboarding"
    why_human: "Requires live Clerk credentials; can't verify pre-built Clerk SignUp component behavior without running app"
  - test: "Sign-in flow persists session across page refreshes"
    expected: "User stays logged in after hard reload; session is maintained via Clerk cookies"
    why_human: "Session persistence requires browser testing with live Clerk instance"
  - test: "Org creation step during sign-up works (AUTH-03)"
    expected: "After email verification, Clerk prompts user to create an organization (name + slug); completion triggers organization.created webhook"
    why_human: "Requires Clerk Dashboard configured with Organizations enabled and org creation step in sign-up flow. The onboarding page is a post-creation landing page — the actual org creation UI is provided by Clerk's hosted sign-up form, which is only active when configured in the Clerk Dashboard."
  - test: "Webhook fires and creates DB record on org creation"
    expected: "POST /api/webhooks/clerk receives organization.created event, inserts into organizations table, seeds 6 disciplines and 3 departments"
    why_human: "End-to-end webhook delivery requires live Clerk instance and a publicly accessible webhook endpoint (ngrok or deployed app)"
  - test: "Unauthenticated user visiting /input is redirected to /sign-in"
    expected: "Browser redirected to /sign-in with no 401 error page shown"
    why_human: "Route protection by clerkMiddleware requires running Next.js server with valid Clerk env vars"
  - test: "Authenticated user without org membership visiting /input is redirected to /onboarding"
    expected: "AppLayout auth guard triggers redirect('/onboarding') when orgId is null"
    why_human: "Requires a Clerk test account that is not a member of any organization"
  - test: "Non-admin user gets 403 from POST /api/organizations/invite"
    expected: "requireRole('admin') throws ForbiddenError when caller has viewer or planner role; response is JSON { error: 'ERR_FORBIDDEN', message: '...' }"
    why_human: "Requires live Clerk session tokens with role context set via Clerk org membership"
---

# Phase 3: Authentication & App Shell Verification Report

**Phase Goal:** Users can sign up, log in, create an org, and see the app shell with navigation — all routes are protected.
**Verified:** 2026-03-26
**Status:** human_needed — all automated checks pass; 7 items require live Clerk environment
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | AppError hierarchy exists with 7 subclasses matching ARCHITECTURE.md Section 11.1 | VERIFIED | `src/lib/errors.ts` exports all 7: ValidationError(400), AuthError(401), ForbiddenError(403), NotFoundError(404), ConflictError(409), PayloadTooLargeError(413), InternalError(500) with `toJSON()` |
| 2  | getTenantId() extracts orgId from Clerk auth context and throws on missing session/org | VERIFIED | `src/lib/auth.ts` lines 26-31: awaits `auth()`, throws `AuthError` if no userId, `ForbiddenError` if no orgId |
| 3  | requireRole() enforces viewer < planner < admin < owner hierarchy | VERIFIED | `src/lib/auth.ts` lines 38-54: ROLE_HIERARCHY map (0-3), CLERK_ROLE_MAP for org:* prefixes, level comparison on lines 49-51 |
| 4  | Clerk env vars are required (not optional) in env validation | VERIFIED | `src/lib/env.ts` lines 10-11,30: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` all use `z.string().min(1)` without `.optional()` |
| 5  | @clerk/nextjs and lucide-react are installed | VERIFIED | `package.json`: `"@clerk/nextjs": "^7.0.7"`, `"lucide-react": "^1.7.0"`; both present in `node_modules/` |
| 6  | Unauthenticated user visiting /input is redirected to /sign-in | VERIFIED (automated) | `src/proxy.ts`: `clerkMiddleware` + `createRouteMatcher` protects all non-public routes; `auth.protect()` redirects unauthenticated requests; needs live test (see human verification #5) |
| 7  | User can see Clerk sign-in form at /sign-in | VERIFIED | `src/app/sign-in/[[...sign-in]]/page.tsx` imports and renders `<SignIn />` from `@clerk/nextjs` |
| 8  | User can see Clerk sign-up form at /sign-up | VERIFIED | `src/app/sign-up/[[...sign-up]]/page.tsx` imports and renders `<SignUp />` from `@clerk/nextjs` |
| 9  | Clerk webhook at POST /api/webhooks/clerk processes organization.created events | VERIFIED | `src/app/api/webhooks/clerk/route.ts`: verifies signature with `env.CLERK_WEBHOOK_SECRET`, switches on `organization.created`, calls `createOrganization()` |
| 10 | Organization creation triggers internal DB record + default disciplines/departments | VERIFIED | `src/features/organizations/organization.service.ts`: inserts into `organizations` table, calls `seedDefaults()` which seeds 6 disciplines (SW/ME/EL/TE/SY/HW) and 3 departments via `withTenant()` |
| 11 | Root layout wraps all content in ClerkProvider | VERIFIED | `src/app/layout.tsx` line 3, 29: `import { ClerkProvider } from '@clerk/nextjs'`, children wrapped in `<ClerkProvider>` |
| 12 | App shell renders with top nav, side nav, and main content area | VERIFIED | `src/components/layout/app-shell.tsx`: composes `<TopNav />`, `<SideNav />`, `<main className="ml-64 p-8">` with `max-w-[1440px]` constraint |
| 13 | Top nav shows 5 items: Input, Team, Projects, Data, Dashboard | VERIFIED | `src/components/layout/top-nav.tsx` lines 17-23: `NAV_ITEMS` const with all 5 routes; active state via `pathname.startsWith(item.href)` |
| 14 | Admin can POST to /api/organizations/invite with email and role to invite users | VERIFIED | `src/app/api/organizations/invite/route.ts`: `requireRole('admin')`, `createOrganizationInvitation()`, returns 201 |

**Score:** 14/14 truths verified by static analysis

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/errors.ts` | VERIFIED | 62 lines; AppError base + 7 subclasses + toJSON(); all error codes present |
| `src/lib/auth.ts` | VERIFIED | 55 lines; getTenantId(), requireRole(), Role type, ROLE_HIERARCHY, CLERK_ROLE_MAP |
| `src/lib/env.ts` | VERIFIED | 3 Clerk vars promoted to required; Stripe/Resend remain optional |
| `src/proxy.ts` | VERIFIED | 23 lines; clerkMiddleware default export; 6 public routes; config matcher |
| `src/app/layout.tsx` | VERIFIED | ClerkProvider wraps children; Inter + Manrope fonts preserved |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | VERIFIED | Renders `<SignIn />` from @clerk/nextjs |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | VERIFIED | Renders `<SignUp />` from @clerk/nextjs |
| `src/app/onboarding/page.tsx` | VERIFIED | Post-org-creation landing page ("Getting Started"); intentionally minimal (D-05 scope decision) |
| `src/app/api/webhooks/clerk/route.ts` | VERIFIED | POST export; verifyWebhook with explicit env.CLERK_WEBHOOK_SECRET; organization.created handler |
| `src/features/organizations/organization.service.ts` | VERIFIED | createOrganization() + seedDefaults(); 6 disciplines with abbreviations; 3 departments |
| `src/components/layout/app-shell.tsx` | VERIFIED | Composes TopNav + SideNav + main; ml-64 offset; max-w-[1440px] |
| `src/components/layout/top-nav.tsx` | VERIFIED | 'use client'; 5 nav items; active state with border-b-2; UserButton; Search/Bell/Settings icons |
| `src/components/layout/side-nav.tsx` | VERIFIED | 'use client'; contextual SECTION_NAV per route prefix; w-64; "New Entry" footer button |
| `src/components/layout/breadcrumbs.tsx` | VERIFIED | 'use client'; uppercase tracking-widest; active segment highlighted in text-primary |
| `src/app/(app)/layout.tsx` | VERIFIED | Server component; awaits auth(); redirects to /sign-in and /onboarding; wraps in AppShell |
| `src/app/(app)/input/page.tsx` | VERIFIED | Breadcrumbs + "Person Input" heading + descriptive paragraph |
| `src/app/(app)/team/page.tsx` | VERIFIED | Breadcrumbs + "Team Overview" heading |
| `src/app/(app)/projects/page.tsx` | VERIFIED | Breadcrumbs + "Projects" heading |
| `src/app/(app)/data/page.tsx` | VERIFIED | Breadcrumbs + "Data Management" heading |
| `src/app/(app)/dashboard/page.tsx` | VERIFIED | Breadcrumbs + "Dashboard" heading |
| `src/app/api/organizations/invite/route.ts` | VERIFIED | POST export; requireRole('admin'); clerkClient().organizations.createOrganizationInvitation(); 201 response |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `src/lib/auth.ts` | `src/lib/errors.ts` | `import { AuthError, ForbiddenError }` | WIRED | Line 3: `import { AuthError, ForbiddenError } from './errors'` |
| `src/lib/auth.ts` | `@clerk/nextjs/server` | `import { auth }` | WIRED | Line 1: `import { auth } from '@clerk/nextjs/server'` |
| `src/proxy.ts` | `@clerk/nextjs/server` | `clerkMiddleware() + createRouteMatcher()` | WIRED | Line 1: `import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'` |
| `src/app/api/webhooks/clerk/route.ts` | `src/features/organizations/organization.service.ts` | `createOrganization()` call on organization.created | WIRED | Lines 3, 16: import + call inside switch case |
| `src/features/organizations/organization.service.ts` | `src/lib/tenant.ts` | `withTenant(org.id)` for seeding | WIRED | Line 5: import; line 56: `const tenant = withTenant(orgId)` |
| `src/app/(app)/layout.tsx` | `src/components/layout/app-shell.tsx` | `import { AppShell }` + render | WIRED | Line 3: import; line 18: `<AppShell>{children}</AppShell>` |
| `src/app/(app)/layout.tsx` | `@clerk/nextjs/server` | `auth()` for userId/orgId | WIRED | Line 1: import; line 10: `await auth()` |
| `src/components/layout/top-nav.tsx` | `@clerk/nextjs` | `UserButton` component | WIRED | Line 5: import; line 83: `<UserButton />` |
| `src/app/api/organizations/invite/route.ts` | `src/lib/auth.ts` | `requireRole('admin')` | WIRED | Line 3: import; line 8: `const { orgId, userId } = await requireRole('admin')` |
| `src/app/api/organizations/invite/route.ts` | `@clerk/nextjs/server` | `clerkClient()` for org invitations | WIRED | Line 1: import; line 23-24: `const client = await clerkClient()` |

All 10 key links: WIRED.

---

## Data-Flow Trace (Level 4)

The section pages (input, team, projects, data, dashboard) are intentionally static placeholders for Phase 3 — they render no dynamic data and are not hollow. Dynamic data rendering is deferred to Phases 4-6 per CONTEXT.md scope boundaries.

The organization service (`createOrganization`) writes real DB records via Drizzle ORM (`db.insert(schema.organizations).values(...).returning()`) and reads via `db.select().from(schema.organizations).where(...)`. Data flow through the webhook handler is real — not hardcoded.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `organization.service.ts` | `org` (inserted record) | `db.insert(schema.organizations)` with `.returning()` | Yes — DB insert + return | FLOWING |
| `organization.service.ts` | `existing` (dedup check) | `db.select().from(schema.organizations).where(eq(...))` | Yes — DB query | FLOWING |
| Section pages (5x) | None — static content | N/A (Phase 3 scope: placeholders) | N/A | N/A — intentionally static |

---

## Behavioral Spot-Checks

TypeScript compilation: `pnpm tsc --noEmit` — **PASS** (exit code 0, no errors)

Runtime behavioral checks require a live server with Clerk credentials and are routed to human verification.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles cleanly | `npx tsc --noEmit` | Exit 0, no output | PASS |
| @clerk/nextjs in node_modules | `test -d node_modules/@clerk/nextjs` | Present | PASS |
| lucide-react in node_modules | `test -d node_modules/lucide-react` | Present | PASS |
| Route protection (live) | Requires running server | N/A | SKIP — human needed |
| Sign-up/sign-in flow | Requires Clerk credentials | N/A | SKIP — human needed |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FOUND-06 | 03-01 | Error taxonomy — AppError hierarchy with 7 subclasses | SATISFIED | `src/lib/errors.ts`: 7 subclasses match ARCHITECTURE.md Section 11.1. Note: REQUIREMENTS.md text says "RateLimitError" but ARCHITECTURE.md Section 11.1 (canonical) defines "PayloadTooLargeError" — implementation follows ARCHITECTURE.md correctly. |
| AUTH-06 | 03-01 | getTenantId(), requireRole() on every API route | SATISFIED | Both helpers implemented in `src/lib/auth.ts`; requireRole used in invite route; getTenantId available for Phase 4+ routes |
| AUTH-08 | 03-01 | Role-based access: Owner, Admin, Planner/Line Manager, Viewer | SATISFIED | ROLE_HIERARCHY and CLERK_ROLE_MAP in `src/lib/auth.ts`; requireRole enforces minimum level |
| AUTH-01 | 03-02 | User can sign up with email/password via Clerk | NEEDS HUMAN | `<SignUp />` component exists at `/sign-up/[[...sign-up]]/page.tsx`; live test required |
| AUTH-02 | 03-02, 03-04 | User can log in and stay logged in across sessions | NEEDS HUMAN | `<SignIn />` component exists; ClerkProvider in root layout; session persistence requires browser test |
| AUTH-03 | 03-02 | User can create a new organization during sign-up | NEEDS HUMAN | Sign-up redirects to `/onboarding` (NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL). Org creation is handled by Clerk's built-in org creation step (D-03), which requires Clerk Dashboard configuration. No custom org creation form implemented — this is intentional per D-01. |
| AUTH-04 | 03-02 | Clerk webhook creates internal org record with default disciplines/departments | SATISFIED (automated) + NEEDS HUMAN (end-to-end) | Webhook handler + org service verified by code inspection; end-to-end delivery requires live Clerk instance |
| AUTH-05 | 03-02 | All protected routes redirect to sign-in when unauthenticated | SATISFIED (code) + NEEDS HUMAN (live) | `src/proxy.ts` clerkMiddleware with isPublicRoute matcher; `src/app/(app)/layout.tsx` extra guard; live test required |
| FOUND-08 | 03-03 | App shell — top nav + contextual side nav + main area | SATISFIED | All 4 shell components verified; (app) layout wires AppShell; 5 section pages exist |
| AUTH-07 | 03-04 | Admin can invite users to the organization via Clerk | SATISFIED (code) + NEEDS HUMAN (live) | `POST /api/organizations/invite` with requireRole('admin') + clerkClient().organizations.createOrganizationInvitation(); live test required for 403 enforcement |

---

## Anti-Patterns Found

No anti-patterns detected. Scanned all 21 phase-modified files for:
- TODO/FIXME/XXX/HACK/PLACEHOLDER markers: none found
- Empty return stubs (return null / return {}): none in logic paths
- Unhandled fetch responses: not applicable (server components/actions)
- Hardcoded empty data arrays in rendering paths: none (section pages are intentionally static per scope)

The section placeholder pages (`input`, `team`, `projects`, `data`, `dashboard`) render static headings with no data. This is correct for Phase 3 — they are scaffolding for Phases 4-6. They are not classified as stubs because they fulfill their stated purpose (route structure + shell rendering) and are explicitly scoped as placeholders in CONTEXT.md.

One note: `src/app/onboarding/page.tsx` says "Your organization is ready" but does not include a Clerk `<CreateOrganization />` component. Per D-03 and D-05 in CONTEXT.md, org creation happens in the Clerk sign-up flow (not on this page), and the onboarding page content is left to Claude's discretion as a post-creation landing. This is architecturally correct.

---

## Human Verification Required

### 1. Sign-Up Flow End-to-End

**Test:** Visit `/sign-up`, complete email/password registration, verify you are prompted to create an organization (name + slug), complete org creation, and confirm redirect to `/onboarding`.
**Expected:** Clerk SignUp component renders, org creation step appears (requires Clerk Dashboard with Organizations enabled), user lands on `/onboarding` showing "Getting Started" text.
**Why human:** Requires live Clerk credentials and Clerk Dashboard configuration (Organizations feature must be enabled; org creation step must be in sign-up flow).

### 2. Sign-In and Session Persistence

**Test:** Sign in at `/sign-in`, navigate to `/input`, hard-reload the browser, close and reopen the tab.
**Expected:** User remains authenticated across all scenarios; Clerk maintains session via cookies.
**Why human:** Browser session state cannot be verified by static analysis.

### 3. Org Creation Triggers Webhook (AUTH-03 + AUTH-04)

**Test:** Complete the sign-up + org creation flow. Check the database for a new row in `organizations` table with 6 discipline rows and 3 department rows seeded.
**Expected:** `organizations` table has new record; `disciplines` table has Software/Mechanical/Electronics/Test/Systems/Hardware for that org; `departments` has Engineering/Product/Operations.
**Why human:** Requires running app + Clerk webhook delivery (needs public URL or ngrok tunnel).

### 4. Route Protection (AUTH-05)

**Test:** Open an incognito window and visit `/input`, `/team`, `/projects` directly.
**Expected:** Each redirects to `/sign-in` immediately with no content flash.
**Why human:** Requires running Next.js server with valid CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variables.

### 5. Auth Guard for No-Org User

**Test:** Create a Clerk account that has no org membership, sign in, and visit `/input`.
**Expected:** `AppLayout` auth guard detects `orgId === null` and redirects to `/onboarding`.
**Why human:** Requires a specific Clerk test account state (authenticated but org-less).

### 6. Invite Endpoint Role Enforcement (AUTH-07)

**Test:** As a user with `org:viewer` role, POST to `/api/organizations/invite` with `{ emailAddress: "test@example.com" }`.
**Expected:** 403 response with `{ error: "ERR_FORBIDDEN", message: "admin role required for this action" }`.
**Then:** As a user with `org:admin` role, same request.
**Expected:** 201 response with invitation object.
**Why human:** Requires live Clerk session tokens with org role context.

### 7. App Shell Active State Navigation

**Test:** Sign in with an org-member account. Click each of the 5 top nav items (Input, Team, Projects, Data, Dashboard).
**Expected:** Clicked item shows primary color text and 2px bottom border; side nav updates contextual items for each section.
**Why human:** CSS active state and client-side routing require a browser.

---

## Gaps Summary

No functional gaps found. All 14 observable truths are verified by code inspection:
- Foundation modules (errors.ts, auth.ts, env.ts) are complete and correctly wired
- Clerk integration (proxy.ts, layout.tsx, sign-in/sign-up pages) is structurally correct
- Webhook handler and organization service have real DB operations (not stubs)
- App shell (all 4 components + (app) layout + 5 section pages) is fully assembled
- Invite endpoint enforces role-based access control

The 7 human verification items are all runtime/integration checks that cannot be verified without a live Clerk environment. They do not indicate implementation gaps — they are verification gaps due to environment constraints.

One minor discrepancy noted: REQUIREMENTS.md text for FOUND-06 lists `RateLimitError` while ARCHITECTURE.md Section 11.1 (the canonical spec) defines `PayloadTooLargeError`. The implementation correctly follows ARCHITECTURE.md. This is a stale description in REQUIREMENTS.md — not a code issue.

---

_Verified: 2026-03-26_
_Verifier: Claude (gsd-verifier)_
