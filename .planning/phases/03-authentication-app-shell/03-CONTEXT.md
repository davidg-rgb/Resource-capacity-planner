# Phase 3: Authentication & App Shell - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Source:** Extracted from ARCHITECTURE.md and resource-planner-scope.md (user directive)

<domain>
## Phase Boundary

Users can sign up, log in, create an organization, invite team members, and see the protected app shell with navigation. All `/app/*` routes are protected. Role-based access is enforced on API routes. Error taxonomy is implemented.

This phase delivers: Clerk integration (sign-up, sign-in, org creation, webhooks), tenant context middleware (`getTenantId`, `requireRole`), app shell (top nav + side nav + main area), error taxonomy, and route protection.

NOT in this phase: Person/Project CRUD (Phase 4), reference data admin (Phase 5), AG Grid (Phase 6), platform admin (Phase 10).

</domain>

<decisions>
## Implementation Decisions

### Clerk Integration
- **D-01:** Use Clerk's pre-built sign-up/sign-in UI components via `@clerk/nextjs` — not custom forms (ADR-005)
- **D-02:** Clerk Organizations map 1:1 to tenants. Each Clerk org = one `organizations` DB row
- **D-03:** Sign-up flow: email/password → create org (name, slug) → redirect to `/onboarding`
- **D-04:** Sign-in redirects to `/input` (last-visited person input form — per env config `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`)
- **D-05:** Sign-up redirects to `/onboarding` (per env config `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`)
- **D-06:** Clerk sign-in page at `/sign-in/[[...sign-in]]/page.tsx`, sign-up at `/sign-up/[[...sign-up]]/page.tsx` (catch-all routes per Clerk convention)

### Webhook Sync
- **D-07:** Clerk webhook at `POST /api/webhooks/clerk` handles org and user lifecycle events
- **D-08:** Webhook verification via svix (Clerk's signing library) using `CLERK_WEBHOOK_SECRET`
- **D-09:** On `organization.created` event: create internal `organizations` DB record with default disciplines and departments
- **D-10:** Default disciplines to seed on org creation: Software, Mechanical, Electronics, Test, Systems, Hardware (engineering-native taxonomy per scope doc)
- **D-11:** Default departments: left to Claude's discretion (reasonable defaults for engineering orgs)

### Route Protection & Middleware
- **D-12:** Next.js 16 uses `proxy.ts` (not `middleware.ts`). Current proxy.ts is a passthrough — Phase 3 adds Clerk auth
- **D-13:** All `/app/*` routes (inside `(app)/` route group) require authentication — redirect to `/sign-in` if unauthenticated
- **D-14:** Public routes: `/`, `/sign-in`, `/sign-up`, `/api/health`, `/api/webhooks/clerk`
- **D-15:** Platform routes (`/platform/*`) are NOT part of this phase (Phase 10)

### Tenant Context Middleware
- **D-16:** `getTenantId(request)` extracts org ID from Clerk auth context — used by every API route for data isolation
- **D-17:** `requireRole(request, minimumRole)` checks Clerk organizationMembership for role level
- **D-18:** Role hierarchy: `viewer < planner < admin < owner` — `requireRole("admin")` allows admin AND owner
- **D-19:** Error cases: no session → AuthError (401), no org membership → ForbiddenError (403), insufficient role → ForbiddenError (403)
- **D-20:** Existing `withTenant()` in `src/lib/tenant.ts` handles DB queries — `getTenantId` provides the orgId that feeds into `withTenant()`

### Role-Based Access
- **D-21:** Four roles: Org Owner, Admin, Planner/Line Manager, Viewer (per ARCHITECTURE.md Section 2.2)
- **D-22:** Org Owner: full admin + billing + subscription management
- **D-23:** Admin: manage reference data, handle imports, invite users
- **D-24:** Planner/Line Manager: edit allocations for their people, view all data
- **D-25:** Viewer: read-only access to all views, can export data
- **D-26:** Role enforcement is per-API-route (not per-UI-component) — UI hides elements based on role, but server enforces

### App Shell
- **D-27:** App shell lives in `src/app/(app)/layout.tsx` — route group for authenticated pages
- **D-28:** Shell structure: top nav + contextual side nav + main area (per FOUND-08)
- **D-29:** Top nav items: Input, Team, Projects, Data, Dashboard (per ARCHITECTURE.md A7)
- **D-30:** Side nav is contextual (changes based on active top nav section) and data-driven
- **D-31:** Components: `src/components/layout/top-nav.tsx`, `side-nav.tsx`, `app-shell.tsx`, `breadcrumbs.tsx`
- **D-32:** Root layout (`src/app/layout.tsx`) wraps with ClerkProvider — fonts already set up (Manrope + Inter)

### Error Taxonomy
- **D-33:** Base `AppError` class in `src/lib/errors.ts` with subclasses: ValidationError (400), AuthError (401), ForbiddenError (403), NotFoundError (404), ConflictError (409), PayloadTooLargeError (413), InternalError (500)
- **D-34:** Each error has: message (human-readable), code (machine-readable like "ERR_VALIDATION"), statusCode, optional details
- **D-35:** Structured JSON error response format: `{ error: string, message: string, details?: object }`

### Auth Helpers
- **D-36:** `src/lib/auth.ts` — Clerk auth helpers and middleware integration
- **D-37:** User invitation via Clerk organization invite API — Admin role required

### Claude's Discretion
- Default departments to seed on org creation (D-11)
- Exact side nav items per section (as long as they match the navigation described in ARCHITECTURE.md)
- onboarding page content (Phase 3 just needs the route — full onboarding wizard is Phase 2+/post-MVP)
- Breadcrumb implementation details
- Toast/notification patterns for auth events

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `ARCHITECTURE.md` §2.2 — User roles & journeys (role definitions, permissions table)
- `ARCHITECTURE.md` §3 (ADR-005) — Clerk for Authentication decision and rationale
- `ARCHITECTURE.md` §5 — Project structure (file paths for all auth-related files)
- `ARCHITECTURE.md` §6.16 — Tenant Context module (`getTenantId`, `requireRole` signatures)
- `ARCHITECTURE.md` §6.17 — Auth Middleware specification
- `ARCHITECTURE.md` §8 — Interface contracts (API endpoints, webhook spec at `POST /api/webhooks/clerk`)
- `ARCHITECTURE.md` §11.1 — Error taxonomy (full AppError hierarchy with codes and examples)
- `ARCHITECTURE.md` §11.2 — Environment variables (Clerk env vars)
- `ARCHITECTURE.md` §14 (Phase 1A) — Implementation roadmap definition of done

### Requirements
- `resource-planner-scope.md` — Original requirements document

### Existing Code
- `src/proxy.ts` — Current passthrough proxy, marked "Clerk auth added in Phase 3"
- `src/app/layout.tsx` — Root layout (needs ClerkProvider wrapping)
- `src/lib/env.ts` — Env validation (Clerk vars already defined as optional — make required)
- `src/lib/tenant.ts` — Existing `withTenant()` wrapper (integration point for getTenantId)
- `src/db/schema.ts` — All 13 table definitions (organizations table has `clerk_org_id` column)

### Prototypes
- `creative-direction/06-management-dashboard.html` — Dashboard shell reference
- `creative-direction/08-person-input-sidebar.html` — Side nav reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/tenant.ts` — `withTenant(orgId)` already provides tenant-scoped DB queries. `getTenantId` will feed orgId into this.
- `src/lib/env.ts` — t3-oss env validation with Clerk vars pre-defined (optional). Phase 3 makes `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` required.
- `src/app/layout.tsx` — Root layout with Manrope + Inter fonts already configured. Needs ClerkProvider wrapper.
- `src/db/schema.ts` — organizations table has `clerkOrgId` field ready for webhook sync.

### Established Patterns
- Environment validation via `@t3-oss/env-nextjs` with Zod schemas
- proxy.ts exports named `proxy` function (Next.js 16 pattern, not `middleware`)
- Single schema.ts file for all tables
- Feature-based organization: `src/features/{feature}/` for services, queries, types

### Integration Points
- `src/proxy.ts` — Must integrate Clerk auth middleware here
- `src/app/layout.tsx` — Must wrap with `<ClerkProvider>`
- `src/app/(app)/layout.tsx` — New file: authenticated app shell layout
- `src/app/api/webhooks/clerk/route.ts` — New: Clerk webhook handler
- `src/lib/tenant.ts` — Existing file gets `getTenantId` and `requireRole` added alongside existing `withTenant`

</code_context>

<specifics>
## Specific Ideas

- Navigation items per ARCHITECTURE.md A7: Input, Team, Projects, Data, Dashboard
- Journey 4 (New Organization Onboarding): Sign up → create org → invited to add team members → upload Excel → see data
- Side nav is data-driven (add entries to items array per extensibility guide)
- Clerk catch-all route pattern: `sign-in/[[...sign-in]]/page.tsx`

</specifics>

<deferred>
## Deferred Ideas

- Full onboarding wizard (F-028) — Post-MVP/Phase 2+
- SSO/SAML (F-023) — Phase 3 enterprise feature (Clerk paid feature)
- Google OAuth social login — Available via Clerk but not required for MVP
- Platform admin auth (Phase 10 — completely separate system)
- Department-level scoping for Planner/Line Manager role (F-022) — Phase 3 enterprise

</deferred>

---

*Phase: 03-authentication-app-shell*
*Context gathered: 2026-03-26 via ARCHITECTURE.md extraction*
