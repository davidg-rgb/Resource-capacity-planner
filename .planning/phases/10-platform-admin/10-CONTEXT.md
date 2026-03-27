# Phase 10: Platform Admin - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning
**Source:** Auto-selected recommended defaults

<domain>
## Phase Boundary

Platform super-admin can manage all tenants, impersonate users, and view audit logs — completely isolated from the Clerk-based tenant auth system. Separate JWT login at `/platform`, own layout, own middleware.

NOT in this phase: Tenant-facing features (done in Phases 1-9), Stripe billing integration (post-MVP), feature flags (post-MVP), announcements (post-MVP), system health monitoring (post-MVP).

</domain>

<decisions>
## Implementation Decisions

### Platform Auth (PLAT-01, PLAT-10, PLAT-11)
- **D-01:** Separate email/password login using `platform_admins` table (already in schema). NOT Clerk-based.
- **D-02:** JWT token with `PLATFORM_ADMIN_SECRET` env var for signing. httpOnly cookie named `platform-token`.
- **D-03:** Platform middleware at `/platform/*` routes verifies platform JWT. Rejects Clerk tokens.
- **D-04:** Tenant API routes (`/api/*` except `/api/platform/*`) reject platform tokens. Auth separation enforced bidirectionally.
- **D-05:** Login page at `/platform/login` — simple email/password form, no Clerk UI.
- **D-06:** Seed script creates initial platform admin account with hashed password from `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` env vars.

### Platform Dashboard (PLAT-02)
- **D-07:** Dashboard at `/platform` shows: total orgs count, total users count, recently active orgs (last 7 days), orgs by status (active/suspended/trial). Simple card-based layout.
- **D-08:** Navigation: sidebar with links to Dashboard, Tenants, Subscriptions, Users, Audit Log.

### Tenant Management (PLAT-06, PLAT-07)
- **D-09:** Tenants list at `/platform/tenants` — table with org name, status, user count, created date, actions.
- **D-10:** Tenant detail at `/platform/tenants/[orgId]` — org info, user list, impersonate button, suspend/reactivate/delete actions.
- **D-11:** Subscription management at `/platform/subscriptions` — list orgs with plan info, manual override controls (extend trial, set status).

### Impersonation (PLAT-03, PLAT-04, PLAT-05)
- **D-12:** "Impersonate" button on tenant detail page opens a new browser tab/window logged in as selected user in that org.
- **D-13:** Impersonation session stored in `impersonation_sessions` table (already in schema). Creates a Clerk session token for the target user via Clerk Backend API.
- **D-14:** Visible banner at top of impersonated session: "Impersonating [user] in [org] — [End session]" in a distinct warning color.
- **D-15:** Sessions expire after 1 hour max. Server checks `expiresAt` on every request. "End session" button ends immediately.
- **D-16:** Every action during impersonation is logged in `platform_audit_log` with the platform admin's identity and impersonation session ID.

### Audit Log (PLAT-08)
- **D-17:** Audit log viewer at `/platform/audit` — table with timestamp, admin, action, target, IP address. Filterable by admin, action type, date range.
- **D-18:** Every platform admin action automatically logged: login, impersonation start/end, tenant create/suspend/delete, subscription changes, user management actions.

### Cross-Tenant User Management (PLAT-09)
- **D-19:** User management at `/platform/users` — search users across all orgs. Actions: reset password (via Clerk SDK), force logout (via Clerk SDK).

### Claude's Discretion
- Platform admin shell layout details and styling
- Dashboard card designs and metric calculations
- Audit log pagination and search UX
- Impersonation banner exact styling
- JWT token expiry duration (recommend 24h for platform token)
- Password hashing algorithm (recommend bcrypt)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Platform admin specification
- `ARCHITECTURE.md` §F-029 — Platform admin dashboard
- `ARCHITECTURE.md` §F-030 — Tenant impersonation with audit trail
- `ARCHITECTURE.md` §F-031 — Tenant management (create/suspend/reactivate/delete)
- `ARCHITECTURE.md` §F-032 — Manual subscription management
- `ARCHITECTURE.md` §F-036 — Platform audit log
- `ARCHITECTURE.md` §F-037 — Cross-tenant user management
- `ARCHITECTURE.md` lines 97-101 — Platform Admin role definition and auth mechanism
- `ARCHITECTURE.md` lines 103-119 — Journey 5 & 6 (platform admin workflows)
- `ARCHITECTURE.md` lines 402-419 — File structure for platform routes

### Requirements
- `.planning/REQUIREMENTS.md` §PLAT — PLAT-01 through PLAT-11

### Existing code (DB schema)
- `src/db/schema.ts` lines 239-301 — `platformAdmins`, `impersonationSessions`, `platformAuditLog` tables already defined
- `src/db/schema.ts` lines 318-342 — `orgSubscriptions`, `featureFlags` tables
- `src/db/schema.ts` lines 447-497 — Platform table relations
- `src/lib/auth.ts` — Clerk auth utilities (for understanding tenant auth separation)
- `src/lib/errors.ts` — Error taxonomy (reuse for platform errors)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- DB schema already has all platform tables: `platformAdmins`, `impersonationSessions`, `platformAuditLog`, `orgSubscriptions`, `featureFlags` with full relations.
- `src/lib/errors.ts` — AppError hierarchy can be extended for platform-specific errors (PlatformAuthError).
- `src/lib/auth.ts` — Clerk auth pattern shows how tenant auth works (platform must be separate).
- `src/components/layout/` — App shell pattern (top nav, side nav) can be adapted for platform layout.

### Established Patterns
- Feature modules: `src/features/{domain}/` — platform needs `src/features/platform/` module.
- API routes: `src/app/api/` — platform API at `src/app/api/platform/`.
- Layout groups: `src/app/(app)/` for tenant — platform uses `src/app/(platform)/`.

### Integration Points
- Clerk Backend API — needed for impersonation (create session token for target user) and user management (reset password, force logout).
- `organizations` table — platform dashboard queries org counts/status.
- Environment variables — new: `PLATFORM_ADMIN_SECRET`, `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`.

</code_context>

<specifics>
## Specific Ideas

No specific external references — standard platform admin patterns apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-platform-admin*
*Context gathered: 2026-03-27*
