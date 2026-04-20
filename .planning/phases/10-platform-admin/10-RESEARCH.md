# Phase 10: Platform Admin - Research

**Researched:** 2026-03-27
**Domain:** Platform super-admin system with separate auth, tenant management, impersonation, audit logging
**Confidence:** HIGH

## Summary

Phase 10 builds a completely isolated platform admin system alongside the existing Clerk-based tenant auth. The DB schema is already in place (`platformAdmins`, `impersonationSessions`, `platformAuditLog` tables with full relations). The env configuration already defines `PLATFORM_ADMIN_SECRET`, `PLATFORM_ADMIN_TOKEN_EXPIRY`, and `IMPERSONATION_MAX_DURATION_MINUTES`. The implementation requires: (1) a separate JWT auth system using `jose` for token signing/verification and `bcryptjs` for password hashing, (2) a `(platform)` route group with its own layout, (3) Clerk Backend API integration for impersonation via Actor Tokens and user management, and (4) comprehensive audit logging middleware.

The key architectural challenge is auth separation -- platform tokens must never be accepted by tenant routes and vice versa. The existing `proxy.ts` (Clerk middleware) protects tenant routes; platform routes need their own middleware that verifies platform JWT and rejects Clerk tokens. The proxy must be updated to mark `/platform/*` and `/api/platform/*` as public routes (Clerk should not intercept them), while platform middleware independently protects those routes.

**Primary recommendation:** Use `jose` for JWT (edge-compatible, already standard in Next.js ecosystem), `bcryptjs` for password hashing (pure JS, no native deps), Clerk Actor Tokens API for impersonation, and a `logPlatformAction()` utility that wraps every platform API mutation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Separate email/password login using `platform_admins` table (already in schema). NOT Clerk-based.
- D-02: JWT token with `PLATFORM_ADMIN_SECRET` env var for signing. httpOnly cookie named `platform-token`.
- D-03: Platform middleware at `/platform/*` routes verifies platform JWT. Rejects Clerk tokens.
- D-04: Tenant API routes (`/api/*` except `/api/platform/*`) reject platform tokens. Auth separation enforced bidirectionally.
- D-05: Login page at `/platform/login` -- simple email/password form, no Clerk UI.
- D-06: Seed script creates initial platform admin account with hashed password from `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` env vars.
- D-07: Dashboard at `/platform` shows: total orgs count, total users count, recently active orgs (last 7 days), orgs by status (active/suspended/trial). Simple card-based layout.
- D-08: Navigation: sidebar with links to Dashboard, Tenants, Subscriptions, Users, Audit Log.
- D-09: Tenants list at `/platform/tenants` -- table with org name, status, user count, created date, actions.
- D-10: Tenant detail at `/platform/tenants/[orgId]` -- org info, user list, impersonate button, suspend/reactivate/delete actions.
- D-11: Subscription management at `/platform/subscriptions` -- list orgs with plan info, manual override controls (extend trial, set status).
- D-12: "Impersonate" button on tenant detail page opens a new browser tab/window logged in as selected user in that org.
- D-13: Impersonation session stored in `impersonation_sessions` table. Creates a Clerk session token for the target user via Clerk Backend API.
- D-14: Visible banner at top of impersonated session: "Impersonating [user] in [org] -- [End session]" in a distinct warning color.
- D-15: Sessions expire after 1 hour max. Server checks `expiresAt` on every request. "End session" button ends immediately.
- D-16: Every action during impersonation is logged in `platform_audit_log` with the platform admin's identity and impersonation session ID.
- D-17: Audit log viewer at `/platform/audit` -- table with timestamp, admin, action, target, IP address. Filterable by admin, action type, date range.
- D-18: Every platform admin action automatically logged: login, impersonation start/end, tenant create/suspend/delete, subscription changes, user management actions.
- D-19: User management at `/platform/users` -- search users across all orgs. Actions: reset password (via Clerk SDK), force logout (via Clerk SDK).

### Claude's Discretion
- Platform admin shell layout details and styling
- Dashboard card designs and metric calculations
- Audit log pagination and search UX
- Impersonation banner exact styling
- JWT token expiry duration (recommend 24h for platform token)
- Password hashing algorithm (recommend bcrypt)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAT-01 | Platform admin auth -- separate email/password login with own JWT | jose for JWT, bcryptjs for password hashing, httpOnly cookie, platform middleware |
| PLAT-02 | Platform admin dashboard showing all organizations with health metrics | Direct Drizzle queries on organizations table, count aggregations |
| PLAT-03 | Tenant impersonation -- log in as any user in any org with visible banner | Clerk Actor Tokens API (`POST /v1/actor_tokens`), `useAuth().actor` for detection |
| PLAT-04 | Every impersonation action logged in platform audit log | `logPlatformAction()` utility with impersonation_session_id column |
| PLAT-05 | Impersonation sessions expire after 1 hour max | `expiresAt` check in middleware, `IMPERSONATION_MAX_DURATION_MINUTES` env var |
| PLAT-06 | Tenant management -- create, suspend, reactivate, delete organizations | Direct DB updates on organizations table fields (subscriptionStatus, suspendedAt, suspendedReason) |
| PLAT-07 | Manual subscription management -- extend trials, override status | Update organizations.trialEndsAt, organizations.subscriptionStatus |
| PLAT-08 | Platform audit log -- every admin action with who/what/when/IP | platformAuditLog table with ipAddress from request headers |
| PLAT-09 | Cross-tenant user management -- reset passwords, force logout via Clerk SDK | `clerkClient.users.updateUser()` for password, `clerkClient.sessions.revokeSession()` for logout |
| PLAT-10 | Auth separation verified -- no tenant endpoint accessible with platform token and vice versa | Proxy config update + platform middleware + bidirectional verification tests |
| PLAT-11 | Seed script creates initial platform admin account | Extend existing drizzle/seed.ts with bcryptjs hashed password from env vars |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jose | 6.2.2 | JWT sign/verify for platform tokens | Edge-compatible, zero deps, Web Crypto API, recommended by Next.js docs |
| bcryptjs | 3.0.3 | Password hashing for platform admins | Pure JS (no native deps), works in all Node.js contexts, cost factor 12 is standard |
| @clerk/nextjs | 7.0.7 (existing) | Actor Tokens API for impersonation, user management SDK | Already installed, has Backend API client |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.3.6 (existing) | Validate login form, API request bodies | All platform API input validation |
| drizzle-orm | 0.45.1 (existing) | Database queries for platform tables | All platform data access |
| @tanstack/react-query | 5.95.2 (existing) | Client-side data fetching for platform UI | Dashboard, tenant list, audit log |
| lucide-react | 1.7.0 (existing) | Icons for platform sidebar and UI | Navigation, action buttons, status indicators |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jose | jsonwebtoken | jsonwebtoken is not edge-compatible; jose works everywhere |
| bcryptjs | bcrypt (native) | native bcrypt requires compilation, fails in edge runtime; bcryptjs is pure JS |
| bcryptjs | argon2 | argon2 has better security properties but requires native bindings; bcryptjs is sufficient for admin accounts |

**Installation:**
```bash
pnpm add jose bcryptjs
pnpm add -D @types/bcryptjs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (platform)/                    # Platform route group (separate from tenant)
      layout.tsx                   # Platform shell with sidebar
      login/page.tsx               # Platform login form
      page.tsx                     # Platform dashboard
      tenants/
        page.tsx                   # Tenant list
        [orgId]/page.tsx           # Tenant detail
      subscriptions/page.tsx       # Subscription management
      users/page.tsx               # Cross-tenant user search
      audit/page.tsx               # Audit log viewer
    api/
      platform/
        auth/
          login/route.ts           # POST: verify credentials, issue JWT
          logout/route.ts          # POST: clear cookie
          me/route.ts              # GET: current admin info
        tenants/
          route.ts                 # GET: list, POST: create
          [orgId]/
            route.ts               # GET: detail, PATCH: update, DELETE: delete
            suspend/route.ts       # POST: suspend
            reactivate/route.ts    # POST: reactivate
            users/route.ts         # GET: list org users via Clerk
        subscriptions/
          [orgId]/route.ts         # PATCH: update subscription
        users/
          route.ts                 # GET: search across orgs
          [userId]/
            reset-password/route.ts  # POST: reset via Clerk
            force-logout/route.ts    # POST: revoke sessions via Clerk
        impersonation/
          route.ts                 # POST: start session, GET: list active
          [sessionId]/
            end/route.ts           # POST: end session
        audit/route.ts             # GET: query audit log
  features/
    platform/
      platform-auth.service.ts     # Login, JWT sign/verify, password hash
      platform-auth.schema.ts      # Zod schemas for login
      platform-tenant.service.ts   # Tenant CRUD operations
      platform-user.service.ts     # Cross-tenant user operations via Clerk
      platform-impersonation.service.ts  # Impersonation session management
      platform-audit.service.ts    # Audit log read/write
      platform-dashboard.service.ts  # Dashboard aggregation queries
  lib/
    platform-auth.ts               # requirePlatformAdmin() middleware helper
    platform-audit.ts              # logPlatformAction() utility
  components/
    platform/
      platform-shell.tsx           # Admin layout with sidebar
      platform-sidebar.tsx         # Navigation sidebar
      impersonation-banner.tsx     # Warning banner for impersonated sessions
```

### Pattern 1: Platform Auth Middleware
**What:** A `requirePlatformAdmin()` helper that reads the `platform-token` httpOnly cookie, verifies the JWT with `jose`, and returns the admin identity. Used in all `/api/platform/*` route handlers.
**When to use:** Every platform API route except `/api/platform/auth/login`.
**Example:**
```typescript
// src/lib/platform-auth.ts
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { AuthError } from './errors';
import { env } from './env';

const PLATFORM_COOKIE = 'platform-token';

function getSecret() {
  return new TextEncoder().encode(env.PLATFORM_ADMIN_SECRET);
}

export interface PlatformAdmin {
  adminId: string;
  email: string;
  name: string;
}

export async function signPlatformToken(payload: PlatformAdmin): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.PLATFORM_ADMIN_TOKEN_EXPIRY) // e.g. '8h'
    .setIssuer('nordic-capacity-platform')
    .sign(getSecret());
}

export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_COOKIE)?.value;
  if (!token) throw new AuthError('Platform authentication required');

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: 'nordic-capacity-platform',
    });
    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    throw new AuthError('Invalid or expired platform token');
  }
}
```

### Pattern 2: Audit Logging Utility
**What:** A `logPlatformAction()` function that inserts into `platformAuditLog` with admin ID, action, target, IP, and optional impersonation session ID.
**When to use:** Called in every platform API mutation handler.
**Example:**
```typescript
// src/lib/platform-audit.ts
import { db } from '@/db';
import { platformAuditLog } from '@/db/schema';
import { headers } from 'next/headers';

interface AuditEntry {
  adminId: string;
  action: string;
  targetOrgId?: string;
  targetUserId?: string;
  impersonationSessionId?: string;
  details?: Record<string, unknown>;
}

export async function logPlatformAction(entry: AuditEntry) {
  const headerStore = await headers();
  const ipAddress = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headerStore.get('x-real-ip')
    || 'unknown';
  const userAgent = headerStore.get('user-agent') || 'unknown';

  await db.insert(platformAuditLog).values({
    ...entry,
    ipAddress,
    userAgent,
  });
}
```

### Pattern 3: Auth Separation in Proxy
**What:** Update `src/proxy.ts` to mark platform routes as public (Clerk should not intercept them). Platform routes handle their own auth.
**When to use:** Required for PLAT-10 bidirectional auth separation.
**Example:**
```typescript
// src/proxy.ts - updated
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/onboarding',
  '/api/health',
  '/api/webhooks/(.*)',
  '/platform(.*)',         // Platform routes bypass Clerk
  '/api/platform(.*)',     // Platform API routes bypass Clerk
]);
```

### Pattern 4: Impersonation via Clerk Actor Tokens
**What:** Create a Clerk Actor Token for the target user, get the redirect URL, open it in a new tab. The session carries an `actor` claim that the frontend detects to show the impersonation banner.
**When to use:** PLAT-03 impersonation flow.
**Example:**
```typescript
// In platform-impersonation.service.ts
import { clerkClient } from '@clerk/nextjs/server';

export async function startImpersonation(
  adminId: string,
  targetUserId: string,
  targetOrgId: string
) {
  // Create Clerk Actor Token
  const client = await clerkClient();
  const actorToken = await client.actorTokens.createActorToken({
    userId: targetUserId,
    actor: { sub: `platform-admin:${adminId}` },
    expiresInSeconds: 3600, // 1 hour max
  });

  // Store impersonation session in our DB
  // ... insert into impersonationSessions table

  return { url: actorToken.url };
}
```

### Pattern 5: Impersonation Banner Detection
**What:** A client component that checks `useAuth().actor` -- if present, renders a warning banner.
**When to use:** In the tenant app layout, always rendered but only visible during impersonation.
**Example:**
```typescript
// src/components/platform/impersonation-banner.tsx
'use client';
import { useAuth } from '@clerk/nextjs';

export function ImpersonationBanner() {
  const { actor } = useAuth();
  if (!actor) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black px-4 py-2 text-center font-semibold">
      Impersonating user -- Actions are being logged
      <button
        className="ml-4 underline font-bold"
        onClick={() => {/* sign out to end impersonation */}}
      >
        End session
      </button>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Sharing JWT secrets between platform and tenant auth:** Platform uses `PLATFORM_ADMIN_SECRET`; tenant uses Clerk. Never cross them.
- **Using Clerk middleware for platform routes:** Platform auth is independent. Clerk middleware must skip `/platform/*`.
- **Logging after response:** Audit logging must happen before the response is sent, inside the try block, to ensure it is recorded even if response fails.
- **Client-side auth checks only:** Always verify the platform JWT server-side in every API route. Client-side checks are for UX only.
- **Storing raw impersonation tokens:** The schema has `tokenHash` -- always hash the token before storing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Custom crypto implementation | `jose` (SignJWT, jwtVerify) | Cryptographic operations have subtle pitfalls; jose handles algorithm validation, expiry checks, claim verification |
| Password hashing | Custom hash with crypto.createHash | `bcryptjs` with cost factor 12 | bcrypt has built-in salt generation, timing-safe comparison, adaptive cost factor |
| Session token for impersonation | Custom session mechanism | Clerk Actor Tokens API | Clerk already manages user sessions; Actor Tokens integrate natively with their auth system |
| User password reset | Direct DB password update | Clerk SDK `updateUser()` | Clerk manages user credentials; direct DB access is not possible for Clerk-managed users |
| Force logout | Custom session invalidation | Clerk SDK `revokeSession()` | Clerk manages sessions; you cannot invalidate them without their API |

**Key insight:** The platform auth system is custom (JWT + bcryptjs) because it must be isolated from Clerk. But user-facing operations (impersonation, password reset, force logout) must go through Clerk because Clerk owns those user sessions and credentials.

## Common Pitfalls

### Pitfall 1: Clerk Middleware Intercepting Platform Routes
**What goes wrong:** Clerk middleware in `proxy.ts` tries to protect `/platform/*` routes, causing auth failures because platform routes don't use Clerk tokens.
**Why it happens:** The `isPublicRoute` matcher doesn't include platform paths.
**How to avoid:** Add `/platform(.*)` and `/api/platform(.*)` to the `isPublicRoute` matcher in `proxy.ts`.
**Warning signs:** 401 errors on platform routes, Clerk redirect loops.

### Pitfall 2: Cookie Not Setting Cross-Origin
**What goes wrong:** httpOnly cookie `platform-token` is not sent on subsequent requests.
**Why it happens:** Missing `path`, `sameSite`, or `secure` attributes on the cookie.
**How to avoid:** Set cookie with `path: '/'`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`, `httpOnly: true`.
**Warning signs:** Login succeeds but immediate redirect back to login page.

### Pitfall 3: IP Address Extraction Fails
**What goes wrong:** Audit log always records 'unknown' for IP address.
**Why it happens:** Different proxies/hosts use different headers for client IP. Vercel uses `x-forwarded-for`, others use `x-real-ip`.
**How to avoid:** Check `x-forwarded-for` first (take first value before comma), then `x-real-ip`, then fallback.
**Warning signs:** All audit entries show same IP or 'unknown'.

### Pitfall 4: Impersonation Session Not Expiring
**What goes wrong:** Impersonation continues beyond 1 hour because only the Clerk Actor Token expires, not the platform-side record.
**Why it happens:** The Actor Token has its own expiry, but the `impersonation_sessions` record needs separate enforcement.
**How to avoid:** Set `expiresAt` in the DB record. Optionally check in tenant-side middleware if an active impersonation session exists and has expired. The Clerk Actor Token's `expiresInSeconds` should match `IMPERSONATION_MAX_DURATION_MINUTES`.
**Warning signs:** Impersonation banner visible after expected expiry.

### Pitfall 5: PLATFORM_ADMIN_SECRET Too Short
**What goes wrong:** JWT signing fails or is insecure.
**Why it happens:** HS256 requires at minimum a 256-bit (32-byte) key. The env schema already enforces `min(64)` chars which is good.
**How to avoid:** Generate with `openssl rand -base64 64` or `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`.
**Warning signs:** jose throws "key too short" error.

### Pitfall 6: Seed Script Env Vars Not in Validation
**What goes wrong:** Seed script needs `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` but they are not in env.ts.
**Why it happens:** Seed script runs outside Next.js context with dotenv, but if we add them to env.ts they become required at startup.
**How to avoid:** Do NOT add seed-only env vars to env.ts (would break app startup). Read them directly with `process.env` in the seed script, with validation at script start.
**Warning signs:** App fails to start because PLATFORM_ADMIN_EMAIL is not set.

### Pitfall 7: Clerk Actor Token `sub` Mismatch
**What goes wrong:** The `actor.sub` in the Clerk session doesn't match what you expect, making impersonation detection unreliable.
**Why it happens:** Using arbitrary strings for `actor.sub` instead of a consistent pattern.
**How to avoid:** Use a consistent format: `platform-admin:{adminId}`. Document this convention.
**Warning signs:** Impersonation banner doesn't show, or audit log can't trace back to admin.

## Code Examples

### Platform Login API Route
```typescript
// src/app/api/platform/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { platformAdmins } from '@/db/schema';
import { signPlatformToken } from '@/lib/platform-auth';
import { logPlatformAction } from '@/lib/platform-audit';
import { handleApiError } from '@/lib/api-utils';
import { AuthError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const [admin] = await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.email, email))
      .limit(1);

    if (!admin || !admin.isActive) throw new AuthError('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new AuthError('Invalid credentials');

    const token = await signPlatformToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
    });

    // Update last login
    await db
      .update(platformAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(platformAdmins.id, admin.id));

    await logPlatformAction({
      adminId: admin.id,
      action: 'admin.login',
    });

    const response = NextResponse.json({ admin: { id: admin.id, email: admin.email, name: admin.name } });
    response.cookies.set('platform-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Seed Script Extension
```typescript
// Addition to drizzle/seed.ts
import bcrypt from 'bcryptjs';

// Platform admin seeding (uses process.env directly, not env.ts)
const adminEmail = process.env.PLATFORM_ADMIN_EMAIL;
const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD;

if (adminEmail && adminPassword) {
  const existingAdmin = await db
    .select()
    .from(schema.platformAdmins)
    .where(eq(schema.platformAdmins.email, adminEmail))
    .limit(1);

  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.insert(schema.platformAdmins).values({
      email: adminEmail,
      passwordHash,
      name: 'Platform Admin',
    });
    console.log('Created platform admin account.');
  }
}
```

### Dashboard Aggregation Query
```typescript
// src/features/platform/platform-dashboard.service.ts
import { db } from '@/db';
import { organizations, people } from '@/db/schema';
import { count, eq, gte, sql } from 'drizzle-orm';

export async function getDashboardMetrics() {
  const [orgCount] = await db.select({ count: count() }).from(organizations);

  const [userCount] = await db.select({ count: count() }).from(people);

  const statusCounts = await db
    .select({
      status: organizations.subscriptionStatus,
      count: count(),
    })
    .from(organizations)
    .groupBy(organizations.subscriptionStatus);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentlyActive = await db
    .select()
    .from(organizations)
    .where(gte(organizations.updatedAt, sevenDaysAgo))
    .orderBy(organizations.updatedAt)
    .limit(10);

  return {
    totalOrgs: orgCount.count,
    totalUsers: userCount.count,
    orgsByStatus: Object.fromEntries(statusCounts.map(s => [s.status, s.count])),
    recentlyActive,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsonwebtoken for JWT | jose for JWT | 2023+ | jose is edge-compatible, zero deps, Web Crypto API standard |
| bcrypt (native) | bcryptjs (pure JS) | Ongoing | Eliminates native compilation issues, works in all JS runtimes |
| Custom impersonation | Clerk Actor Tokens | Clerk v5+ | Built-in impersonation with actor claims in session tokens |

## Open Questions

1. **Clerk user count per org**
   - What we know: Clerk SDK has `getOrganizationMembershipList()` to list members per org
   - What's unclear: Whether there is an efficient batch count endpoint or if we need to query per-org
   - Recommendation: Use Clerk SDK `getOrganizationMembershipList({ organizationId, limit: 1 })` to get totalCount from pagination metadata. Cache counts in dashboard.

2. **Impersonation "End session" mechanism**
   - What we know: Clerk Actor Tokens create sessions with `actor` claim. Signing out ends the session.
   - What's unclear: Whether `signOut()` from Clerk client is sufficient or if the Actor Token needs explicit revocation
   - Recommendation: Use Clerk `signOut()` on the client side, plus mark the `impersonation_sessions.endedAt` via an API call. Optionally revoke the Actor Token via `POST /v1/actor_tokens/{id}/revoke`.

3. **Platform layout rendering with Clerk provider**
   - What we know: Root layout likely wraps with `ClerkProvider`. Platform routes don't need Clerk UI components.
   - What's unclear: Whether `ClerkProvider` causes issues for platform-only routes
   - Recommendation: ClerkProvider in root layout is harmless -- it just provides context. Platform pages simply don't use Clerk hooks. No conflict.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| jose | JWT signing | Needs install | 6.2.2 (npm) | -- |
| bcryptjs | Password hashing | Needs install | 3.0.3 (npm) | -- |
| @clerk/nextjs | Impersonation, user mgmt | Installed | 7.0.7 | -- |
| drizzle-orm | DB access | Installed | 0.45.1 | -- |
| Node.js | Runtime | Available | -- | -- |

**Missing dependencies with no fallback:**
- `jose` and `bcryptjs` must be installed (2 new packages)

**Missing dependencies with fallback:**
- None

## Sources

### Primary (HIGH confidence)
- `src/db/schema.ts` lines 239-304 -- platform tables already defined with correct structure
- `src/lib/env.ts` -- PLATFORM_ADMIN_SECRET, PLATFORM_ADMIN_TOKEN_EXPIRY, IMPERSONATION_MAX_DURATION_MINUTES already configured
- `src/proxy.ts` -- current Clerk middleware implementation (needs platform exclusion)
- `src/lib/auth.ts` -- tenant auth pattern (platform auth must be separate)
- `src/lib/errors.ts` -- AppError hierarchy (reuse for platform errors)
- `src/lib/api-utils.ts` -- handleApiError pattern (reuse for platform routes)
- [Clerk User Impersonation docs](https://clerk.com/docs/guides/users/impersonation) -- Actor Tokens API
- [Clerk Actor Tokens API reference](https://clerk.com/docs/reference/backend-api/tag/Actor-Tokens)
- [jose npm](https://www.npmjs.com/package/jose) -- JWT library documentation

### Secondary (MEDIUM confidence)
- [Clerk revokeSession docs](https://clerk.com/docs/reference/backend/sessions/revoke-session) -- force logout mechanism
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) -- JWT + cookie pattern
- [Next.js Edge Runtime limitations](https://nextjs.org/docs/pages/api-reference/edge) -- bcrypt incompatibility

### Tertiary (LOW confidence)
- Dashboard "recently active" metric uses `updatedAt` on organizations table -- may need a more precise activity signal (e.g., last allocation write). LOW confidence this is the right metric.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- jose and bcryptjs are well-established, verified versions against npm registry
- Architecture: HIGH -- follows existing project patterns (route groups, features/, lib/), schema already exists
- Pitfalls: HIGH -- well-known issues with Clerk middleware + custom auth coexistence, cookie handling, IP extraction
- Impersonation: MEDIUM -- Clerk Actor Tokens API is documented but exact integration with existing proxy.ts needs careful testing

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable domain, libraries are mature)
