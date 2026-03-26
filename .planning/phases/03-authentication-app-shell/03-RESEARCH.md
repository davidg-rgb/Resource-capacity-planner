# Phase 3: Authentication & App Shell - Research

**Researched:** 2026-03-26
**Domain:** Clerk authentication, Next.js 16 proxy.ts, multi-tenant RBAC, app shell
**Confidence:** HIGH

## Summary

Phase 3 integrates Clerk authentication into the existing Next.js 16 scaffolding, builds the protected app shell (top nav + contextual side nav + main area), implements tenant context middleware (`getTenantId`, `requireRole`), sets up the Clerk webhook handler for org lifecycle sync, and establishes the error taxonomy. The project already has significant groundwork: `proxy.ts` exists as a passthrough, `env.ts` has Clerk vars defined (optional), `withTenant()` is implemented, and the DB schema has the `organizations` table with `clerkOrgId`.

`@clerk/nextjs` v7.0.7 is the current version (verified via npm registry). It provides `clerkMiddleware()` for proxy.ts, `auth()` for server components/route handlers (returns `orgId`, `orgRole`, `userId`), `verifyWebhook()` from `@clerk/nextjs/webhooks` for webhook verification (no separate svix dependency needed), and pre-built `<SignIn />`, `<SignUp />`, `<OrganizationSwitcher />`, `<UserButton />` UI components.

**Primary recommendation:** Use Clerk's built-in components and helpers exclusively. The `verifyWebhook()` helper replaces manual svix verification. Custom roles (org:owner, org:admin, org:planner, org:viewer) must be created in the Clerk Dashboard to map to the four-tier role hierarchy.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Use Clerk's pre-built sign-up/sign-in UI components via `@clerk/nextjs` -- not custom forms (ADR-005)
- D-02: Clerk Organizations map 1:1 to tenants. Each Clerk org = one `organizations` DB row
- D-03: Sign-up flow: email/password -> create org (name, slug) -> redirect to `/onboarding`
- D-04: Sign-in redirects to `/input` (per env config `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`)
- D-05: Sign-up redirects to `/onboarding` (per env config `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`)
- D-06: Clerk sign-in page at `/sign-in/[[...sign-in]]/page.tsx`, sign-up at `/sign-up/[[...sign-up]]/page.tsx`
- D-07: Clerk webhook at `POST /api/webhooks/clerk` handles org and user lifecycle events
- D-08: Webhook verification via svix (Clerk's signing library) using `CLERK_WEBHOOK_SECRET`
- D-09: On `organization.created` event: create internal `organizations` DB record with default disciplines and departments
- D-10: Default disciplines: Software, Mechanical, Electronics, Test, Systems, Hardware
- D-11: Default departments: Claude's discretion (reasonable defaults for engineering orgs)
- D-12: Next.js 16 uses `proxy.ts` (not `middleware.ts`). Current proxy.ts is a passthrough -- Phase 3 adds Clerk auth
- D-13: All `/app/*` routes (inside `(app)/` route group) require authentication -- redirect to `/sign-in` if unauthenticated
- D-14: Public routes: `/`, `/sign-in`, `/sign-up`, `/api/health`, `/api/webhooks/clerk`
- D-15: Platform routes (`/platform/*`) are NOT part of this phase (Phase 10)
- D-16: `getTenantId(request)` extracts org ID from Clerk auth context
- D-17: `requireRole(request, minimumRole)` checks Clerk organizationMembership for role level
- D-18: Role hierarchy: `viewer < planner < admin < owner` -- `requireRole("admin")` allows admin AND owner
- D-19: Error cases: no session -> AuthError (401), no org membership -> ForbiddenError (403), insufficient role -> ForbiddenError (403)
- D-20: Existing `withTenant()` in `src/lib/tenant.ts` handles DB queries -- `getTenantId` provides the orgId
- D-21: Four roles: Org Owner, Admin, Planner/Line Manager, Viewer
- D-22-D-25: Role permission definitions per ARCHITECTURE.md
- D-26: Role enforcement is per-API-route (server enforces), UI hides elements based on role
- D-27: App shell lives in `src/app/(app)/layout.tsx`
- D-28: Shell structure: top nav + contextual side nav + main area
- D-29: Top nav items: Input, Team, Projects, Data, Dashboard
- D-30: Side nav is contextual (changes based on active top nav section) and data-driven
- D-31: Components: `src/components/layout/top-nav.tsx`, `side-nav.tsx`, `app-shell.tsx`, `breadcrumbs.tsx`
- D-32: Root layout wraps with ClerkProvider -- fonts already set up
- D-33: Base AppError class with subclasses: ValidationError (400), AuthError (401), ForbiddenError (403), NotFoundError (404), ConflictError (409), PayloadTooLargeError (413), InternalError (500)
- D-34: Each error has: message, code (e.g. "ERR_VALIDATION"), statusCode, optional details
- D-35: Structured JSON error response: `{ error: string, message: string, details?: object }`
- D-36: `src/lib/auth.ts` -- Clerk auth helpers and middleware integration
- D-37: User invitation via Clerk organization invite API -- Admin role required

### Claude's Discretion
- Default departments to seed on org creation (D-11)
- Exact side nav items per section (matching ARCHITECTURE.md navigation)
- Onboarding page content (just the route -- full wizard is post-MVP)
- Breadcrumb implementation details
- Toast/notification patterns for auth events

### Deferred Ideas (OUT OF SCOPE)
- Full onboarding wizard (F-028) -- Post-MVP/Phase 2+
- SSO/SAML (F-023) -- Phase 3 enterprise feature (Clerk paid feature)
- Google OAuth social login -- Available via Clerk but not required for MVP
- Platform admin auth (Phase 10 -- completely separate system)
- Department-level scoping for Planner/Line Manager role (F-022) -- Phase 3 enterprise

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email/password via Clerk | Clerk `<SignUp />` component at catch-all route `/sign-up/[[...sign-up]]/page.tsx`. Pre-built UI per D-01. |
| AUTH-02 | User can log in and stay logged in across sessions via Clerk | Clerk `<SignIn />` component + `clerkMiddleware()` in proxy.ts handles session persistence automatically. |
| AUTH-03 | User can create a new organization during sign-up | Clerk Organizations enabled + `<OrganizationSwitcher />` or post-signup org creation flow. Clerk `allowPersonalAccounts: false` forces org membership. |
| AUTH-04 | Clerk webhook creates internal org record with default disciplines/departments | `verifyWebhook()` from `@clerk/nextjs/webhooks` handles `organization.created` event. Seeds via `organizationService.createOrganization()` and `seedDefaults()`. |
| AUTH-05 | All protected routes redirect to sign-in when unauthenticated | `clerkMiddleware()` with `createRouteMatcher` in proxy.ts. Public routes exempted per D-14. |
| AUTH-06 | Tenant context middleware -- getTenantId(), requireRole() | `auth()` from `@clerk/nextjs/server` returns `orgId` and `orgRole`. Custom helpers in `src/lib/auth.ts` wrap these. |
| AUTH-07 | Admin can invite users to the organization via Clerk | Clerk Backend API `clerkClient().organizations.createOrganizationInvitation()`. Requires admin role check. |
| AUTH-08 | Role-based access: Org Owner, Admin, Planner/Line Manager, Viewer | Custom Clerk roles: `org:owner`, `org:admin`, `org:planner`, `org:viewer`. Up to 10 custom roles supported per Clerk instance. |
| FOUND-06 | Error taxonomy -- AppError hierarchy | TypeScript class hierarchy in `src/lib/errors.ts`. Base `AppError` extends `Error` with `code`, `statusCode`, `details`. |
| FOUND-08 | App shell -- top nav + contextual side nav + main area | Route group `(app)/layout.tsx` with `AppShell` component composing `TopNav`, `SideNav`, and main content area. |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@clerk/nextjs` | 7.0.7 | Authentication, organizations, RBAC, pre-built UI | Already decided (ADR-005). v7 is current, supports Next.js 16 proxy.ts natively |
| `next` | 16.2.1 | Framework (already installed) | Project foundation |
| `react` | 19.2.4 | UI framework (already installed) | Project foundation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | latest | Icons for navigation (Input, Team, Projects, Data, Dashboard icons) | App shell nav items need icons |

### Not Needed (Bundled or Unnecessary)

| Library | Why Not Needed |
|---------|---------------|
| `svix` | `verifyWebhook()` from `@clerk/nextjs/webhooks` handles webhook verification internally -- no separate svix dependency required |
| Any CSS-in-JS | Tailwind CSS 4 already configured |
| Auth state management | Clerk handles all auth state, session persistence, token refresh |

**Installation:**

```bash
pnpm add @clerk/nextjs lucide-react
```

**IMPORTANT: Env var naming change.** The CONTEXT.md/ARCHITECTURE.md reference `CLERK_WEBHOOK_SECRET`, but Clerk's current SDK (`verifyWebhook()`) expects `CLERK_WEBHOOK_SIGNING_SECRET` by default. Two options:
1. Rename env var to `CLERK_WEBHOOK_SIGNING_SECRET` (matches Clerk SDK default)
2. Keep `CLERK_WEBHOOK_SECRET` and pass it explicitly to `verifyWebhook(req, { signingSecret: env.CLERK_WEBHOOK_SECRET })`

**Recommendation:** Option 2 -- keep the existing env var name from ARCHITECTURE.md and pass it explicitly. Less disruption, matches project documentation.

## Architecture Patterns

### Recommended Project Structure (Phase 3 additions)

```
src/
├── app/
│   ├── layout.tsx                          # MODIFY: wrap with <ClerkProvider>
│   ├── page.tsx                            # Existing: landing page (public)
│   ├── sign-in/[[...sign-in]]/
│   │   └── page.tsx                        # NEW: Clerk <SignIn /> component
│   ├── sign-up/[[...sign-up]]/
│   │   └── page.tsx                        # NEW: Clerk <SignUp /> component
│   ├── onboarding/
│   │   └── page.tsx                        # NEW: placeholder onboarding route
│   ├── (app)/
│   │   ├── layout.tsx                      # NEW: app shell (TopNav + SideNav + main)
│   │   ├── input/
│   │   │   └── page.tsx                    # NEW: placeholder (Phase 6 implements)
│   │   ├── team/
│   │   │   └── page.tsx                    # NEW: placeholder (Phase 2+)
│   │   ├── projects/
│   │   │   └── page.tsx                    # NEW: placeholder (Phase 4 implements)
│   │   ├── data/
│   │   │   └── page.tsx                    # NEW: placeholder (Phase 8 implements)
│   │   └── dashboard/
│   │       └── page.tsx                    # NEW: placeholder (Phase 2+)
│   └── api/
│       └── webhooks/
│           └── clerk/
│               └── route.ts                # NEW: Clerk webhook handler
├── components/
│   └── layout/
│       ├── app-shell.tsx                   # NEW: combines TopNav + SideNav + main
│       ├── top-nav.tsx                     # NEW: primary navigation bar
│       ├── side-nav.tsx                    # NEW: contextual sidebar
│       └── breadcrumbs.tsx                 # NEW: breadcrumb component
├── features/
│   └── organizations/
│       ├── organization.service.ts         # NEW: createOrganization, seedDefaults
│       └── organization.queries.ts         # NEW: DB queries for organizations
├── lib/
│   ├── auth.ts                             # NEW: getTenantId(), requireRole()
│   ├── errors.ts                           # NEW: AppError hierarchy
│   ├── env.ts                              # MODIFY: make Clerk vars required
│   └── tenant.ts                           # EXISTING: withTenant() (no changes)
└── proxy.ts                                # MODIFY: add clerkMiddleware()
```

### Pattern 1: proxy.ts with Clerk Auth

**What:** Replace the passthrough proxy with `clerkMiddleware()` using `createRouteMatcher` for public routes.
**When to use:** Every request flows through proxy.ts.

```typescript
// src/proxy.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/webhooks/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

**Source:** [Clerk clerkMiddleware docs](https://clerk.com/docs/reference/nextjs/clerk-middleware)

### Pattern 2: Auth Helpers (getTenantId / requireRole)

**What:** Thin wrappers around Clerk's `auth()` that extract orgId and check roles, throwing AppError subclasses on failure.
**When to use:** Every API route handler.

```typescript
// src/lib/auth.ts
import { auth } from '@clerk/nextjs/server';
import { AuthError, ForbiddenError } from './errors';

type Role = 'viewer' | 'planner' | 'admin' | 'owner';

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  planner: 1,
  admin: 2,
  owner: 3,
};

// Map Clerk's org role keys to our role names
const CLERK_ROLE_MAP: Record<string, Role> = {
  'org:viewer': 'viewer',
  'org:planner': 'planner',
  'org:admin': 'admin',
  'org:owner': 'owner',
};

export async function getTenantId(): Promise<string> {
  const { userId, orgId } = await auth();
  if (!userId) throw new AuthError('Not authenticated');
  if (!orgId) throw new ForbiddenError('No organization membership');
  return orgId;
}

export async function requireRole(minimumRole: Role): Promise<{
  orgId: string;
  userId: string;
  role: Role;
}> {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) throw new AuthError('Not authenticated');
  if (!orgId) throw new ForbiddenError('No organization membership');

  const role = CLERK_ROLE_MAP[orgRole ?? ''];
  if (!role) throw new ForbiddenError('Unknown role');
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minimumRole]) {
    throw new ForbiddenError(`${minimumRole} role required for this action`);
  }

  return { orgId, userId, role };
}
```

**Source:** [Clerk auth() reference](https://clerk.com/docs/reference/nextjs/app-router/auth), [Auth object](https://clerk.com/docs/references/nextjs/auth-object)

### Pattern 3: Webhook Handler

**What:** Verify Clerk webhook with `verifyWebhook()`, handle `organization.created` event to sync internal DB.

```typescript
// src/app/api/webhooks/clerk/route.ts
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    if (evt.type === 'organization.created') {
      const { id, name, slug } = evt.data;
      // Call organizationService.createOrganization(...)
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Webhook verification failed', { status: 400 });
  }
}
```

**Note:** `verifyWebhook()` reads `CLERK_WEBHOOK_SIGNING_SECRET` env var by default. Since our env uses `CLERK_WEBHOOK_SECRET`, pass it explicitly via the options parameter.

**Source:** [Clerk webhook syncing guide](https://clerk.com/docs/guides/development/webhooks/syncing)

### Pattern 4: Error Taxonomy

**What:** Base `AppError` class with typed subclasses following ARCHITECTURE.md Section 11.1 spec exactly.

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: { fields: Array<{ field: string; message: string }> }) {
    super(message, 'ERR_VALIDATION', 400, details);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 'ERR_AUTH', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'ERR_FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, 'ERR_NOT_FOUND', 404, { resource, id });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERR_CONFLICT', 409, details);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large') {
    super(message, 'ERR_PAYLOAD_TOO_LARGE', 413);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 'ERR_INTERNAL', 500);
  }
}
```

### Pattern 5: ClerkProvider in Root Layout

**What:** Wrap the entire app with `<ClerkProvider>` in the root layout. Clerk components (`<UserButton>`, `<OrganizationSwitcher>`) work anywhere inside.

```typescript
// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable} font-body antialiased`}>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
```

### Anti-Patterns to Avoid

- **Do NOT use `authMiddleware()`**: This is the deprecated v4 API. Use `clerkMiddleware()` (v5+/v7).
- **Do NOT create custom sign-in/sign-up forms**: D-01 explicitly requires Clerk's pre-built components.
- **Do NOT check roles client-side only**: D-26 mandates server-side enforcement via `requireRole()`. UI may hide elements but server must reject unauthorized requests.
- **Do NOT use `middleware.ts` filename**: Next.js 16 uses `proxy.ts`. The file already exists.
- **Do NOT install `svix` as separate dependency**: `verifyWebhook()` from `@clerk/nextjs/webhooks` bundles verification internally.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sign-in/sign-up UI | Custom auth forms | `<SignIn />`, `<SignUp />` from `@clerk/nextjs` | Session management, CSRF, rate limiting, password policies all handled |
| Session persistence | Cookie/JWT management | Clerk SDK (automatic) | Cross-tab, cross-device, token refresh handled automatically |
| Webhook verification | Manual HMAC-SHA256 | `verifyWebhook()` from `@clerk/nextjs/webhooks` | Timing-safe comparison, replay protection, header extraction |
| Organization switcher | Custom org dropdown | `<OrganizationSwitcher />` from `@clerk/nextjs` | Handles create, switch, invite flows |
| User profile button | Custom avatar/menu | `<UserButton />` from `@clerk/nextjs` | Sign-out, profile management, org switching |
| Route protection | Custom auth checks in every page | `clerkMiddleware()` in proxy.ts | Centralized, runs before page code, handles redirects |

## Common Pitfalls

### Pitfall 1: proxy.ts Export Signature

**What goes wrong:** Using `export function proxy()` (the current passthrough pattern) instead of `export default clerkMiddleware()`.
**Why it happens:** The existing proxy.ts uses a named export `proxy`. Clerk requires a default export.
**How to avoid:** Replace the entire proxy.ts content. The `export const config` matcher can stay the same.
**Warning signs:** "auth() was called but Clerk can't detect usage of clerkMiddleware()" error message.

### Pitfall 2: Webhook Env Var Mismatch

**What goes wrong:** `verifyWebhook()` silently fails because it looks for `CLERK_WEBHOOK_SIGNING_SECRET` but the project defines `CLERK_WEBHOOK_SECRET`.
**Why it happens:** Clerk changed the recommended env var name. ARCHITECTURE.md uses the older name.
**How to avoid:** Either rename to `CLERK_WEBHOOK_SIGNING_SECRET` in env.ts and .env, OR pass the secret explicitly: `verifyWebhook(req, { signingSecret: env.CLERK_WEBHOOK_SECRET })`.
**Warning signs:** 400 errors on all webhook calls with "Error verifying webhook" in logs.

### Pitfall 3: Clerk orgRole Format

**What goes wrong:** Comparing `orgRole === 'admin'` instead of `orgRole === 'org:admin'`.
**Why it happens:** Clerk prefixes all roles with `org:`. The auth() object returns `orgRole` as `'org:admin'`, not `'admin'`.
**How to avoid:** Use a mapping constant `CLERK_ROLE_MAP` that translates `org:*` to internal role names.
**Warning signs:** `requireRole()` always throws ForbiddenError even for correct roles.

### Pitfall 4: Missing Organization Membership Requirement

**What goes wrong:** Users can sign in but have no active organization, causing `orgId` to be `undefined`.
**Why it happens:** Clerk allows users without organization membership by default.
**How to avoid:** Enable "Organization membership required" in Clerk Dashboard settings. Also, `getTenantId()` must explicitly check for `orgId` and throw ForbiddenError if missing.
**Warning signs:** `getTenantId()` returns undefined, queries fail with null constraint violations.

### Pitfall 5: Custom Clerk Roles Not Created

**What goes wrong:** `orgRole` returns only `org:admin` or `org:member` (Clerk defaults) instead of the custom four-tier hierarchy.
**Why it happens:** Custom roles (`org:owner`, `org:planner`, `org:viewer`) must be created in the Clerk Dashboard manually before they can be used.
**How to avoid:** Document the Clerk Dashboard setup as a prerequisite task. Create roles: `org:owner`, `org:admin`, `org:planner`, `org:viewer`. Clerk supports up to 10 custom roles per instance.
**Warning signs:** `has({ role: 'org:planner' })` always returns false.

### Pitfall 6: Route Group (app) Not Protecting Routes

**What goes wrong:** Route group `(app)` is just a folder convention -- it does NOT enforce auth by itself.
**Why it happens:** Developers assume the parenthesized folder name provides auth gating.
**How to avoid:** Auth protection comes from `clerkMiddleware()` in proxy.ts matching the route patterns. The `(app)/layout.tsx` provides the shell UI but auth is enforced at the proxy level.
**Warning signs:** Unauthenticated users see the app shell (but with empty Clerk data).

## Code Examples

### Clerk Sign-In Page (catch-all route)

```typescript
// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
```

### Clerk Sign-Up Page (catch-all route)

```typescript
// src/app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
```

### App Shell Layout

```typescript
// src/app/(app)/layout.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();

  // Extra safety -- proxy.ts should already redirect
  if (!userId) redirect('/sign-in');

  // If no org selected, redirect to onboarding
  if (!orgId) redirect('/onboarding');

  return <AppShell>{children}</AppShell>;
}
```

### Organization Service (webhook target)

```typescript
// src/features/organizations/organization.service.ts
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ConflictError, ValidationError } from '@/lib/errors';
import { withTenant } from '@/lib/tenant';

const DEFAULT_DISCIPLINES = [
  'Software', 'Mechanical', 'Electronics', 'Test', 'Systems', 'Hardware',
];

const DEFAULT_DEPARTMENTS = ['Engineering', 'General'];

export async function createOrganization(data: {
  clerkOrgId: string;
  name: string;
  slug: string;
}) {
  // Check for duplicate slug
  const existing = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, data.slug))
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('Organization slug already taken', {
      conflictType: 'duplicate',
      field: 'slug',
      value: data.slug,
    });
  }

  const [org] = await db
    .insert(schema.organizations)
    .values({
      clerkOrgId: data.clerkOrgId,
      name: data.name,
      slug: data.slug,
    })
    .returning();

  await seedDefaults(org.id);
  return org;
}

export async function seedDefaults(orgId: string) {
  const tenant = withTenant(orgId);

  // Seed default disciplines
  await Promise.all(
    DEFAULT_DISCIPLINES.map((name) => tenant.insertDiscipline({ name })),
  );

  // Seed default departments
  await Promise.all(
    DEFAULT_DEPARTMENTS.map((name) => tenant.insertDepartment({ name })),
  );
}
```

### API Route with Error Handling

```typescript
// Example pattern for any API route
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { AppError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireRole('viewer');
    // ... business logic using withTenant(orgId)
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: 'ERR_INTERNAL', message: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `authMiddleware()` | `clerkMiddleware()` | Clerk v5 (2024) | New API, different import, more flexible |
| `middleware.ts` | `proxy.ts` | Next.js 16 (2025) | Filename change only, same code pattern |
| `svix` + `Webhook` class for verification | `verifyWebhook()` from `@clerk/nextjs/webhooks` | Clerk v6.23+ (2025) | No separate dependency, simpler API |
| `CLERK_WEBHOOK_SECRET` | `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk 2025 | Default env var name changed, old name works with explicit passing |
| `auth()` returning sync object | `auth()` returning `Promise` (async) | Clerk v6+ (2024) | Must `await auth()` in all server code |

**Deprecated/outdated:**
- `authMiddleware()`: Replaced by `clerkMiddleware()`. Do not use.
- `@clerk/nextjs/server` `currentUser()`: Still works but `auth()` is preferred for performance.
- Manual svix verification: `verifyWebhook()` is the recommended approach for `@clerk/nextjs` users.

## Open Questions

1. **Clerk Dashboard Setup**
   - What we know: Custom roles (org:owner, org:admin, org:planner, org:viewer) must be created manually in the Clerk Dashboard.
   - What's unclear: Whether the implementer already has Clerk Dashboard access and API keys configured.
   - Recommendation: First task should document the Clerk Dashboard setup as a prerequisite with step-by-step instructions. Include `.env.local` template.

2. **Webhook Testing in Development**
   - What we know: Clerk webhooks require a publicly accessible URL. In development, you need a tunnel (ngrok, Clerk CLI, or similar).
   - What's unclear: Whether the developer has ngrok or another tunnel tool available.
   - Recommendation: Use Clerk Dashboard's "Send test webhook" feature for initial development. Document ngrok setup as optional enhancement.

3. **Organization Creation Flow Timing**
   - What we know: D-03 says sign-up -> create org -> redirect to `/onboarding`. Clerk's `organization.created` webhook fires after org creation.
   - What's unclear: Whether org creation happens during sign-up (Clerk handles it) or after sign-up on the onboarding page (app handles it).
   - Recommendation: Use Clerk's built-in org creation during sign-up flow (enable "Create organization" in sign-up). The webhook then syncs to DB. Onboarding page can show confirmation and next steps.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | Assumed (Next.js works) | -- | -- |
| pnpm | Package install | Assumed (package.json specifies) | 10.33.0 | -- |
| Clerk account + API keys | AUTH-01 through AUTH-08 | Unknown | -- | Cannot proceed without keys -- blocking |
| Neon PostgreSQL | AUTH-04 (webhook writes) | Available (Phase 2 completed) | 17 | -- |
| ngrok or tunnel | Webhook testing locally | Optional | -- | Use Clerk Dashboard test webhooks |

**Missing dependencies with no fallback:**
- Clerk account with API keys (`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`) -- must be provisioned before implementation begins

**Missing dependencies with fallback:**
- Local webhook tunnel (ngrok) -- can use Clerk Dashboard test webhooks for initial development

## Sources

### Primary (HIGH confidence)
- [Clerk clerkMiddleware() reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) - proxy.ts setup, createRouteMatcher, auth.protect()
- [Clerk auth() reference](https://clerk.com/docs/reference/nextjs/app-router/auth) - server-side auth access
- [Clerk Auth object reference](https://clerk.com/docs/references/nextjs/auth-object) - full property list (orgId, orgRole, orgSlug, orgPermissions, etc.)
- [Clerk webhook syncing guide](https://clerk.com/docs/guides/development/webhooks/syncing) - verifyWebhook() usage
- [Clerk Organizations getting started](https://clerk.com/docs/nextjs/guides/organizations/getting-started) - org setup, OrganizationSwitcher
- [Clerk roles and permissions](https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions) - custom roles, org:admin default, up to 10 custom roles
- [Clerk verifyWebhook() reference](https://clerk.com/docs/reference/backend/verify-webhook) - function signature, CLERK_WEBHOOK_SIGNING_SECRET
- npm registry: `@clerk/nextjs` 7.0.7 (verified 2026-03-26)
- npm registry: `svix` 1.89.0 (verified but NOT needed -- bundled in Clerk)

### Secondary (MEDIUM confidence)
- [Next.js 16 proxy.ts rename explanation](https://www.buildwithmatija.com/blog/nextjs16-middleware-change) - why middleware.ts became proxy.ts
- [Clerk environment variables reference](https://clerk.com/docs/guides/development/clerk-environment-variables) - env var naming conventions

### Tertiary (LOW confidence)
- None -- all critical claims verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Clerk v7.0.7 verified, API patterns confirmed from official docs
- Architecture: HIGH - proxy.ts, auth(), verifyWebhook() patterns all documented officially
- Pitfalls: HIGH - orgRole format, env var naming, middleware export pattern all verified
- App shell: MEDIUM - component structure follows ARCHITECTURE.md spec, no external verification needed (internal design)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (Clerk SDK is stable, 30-day window appropriate)
