# Phase 11: Infrastructure & Feature Flags - Research

**Researched:** 2026-03-28
**Domain:** Feature flag architecture, toast notifications, Next.js 16 App Router integration
**Confidence:** HIGH

## Summary

Phase 11 is foundational infrastructure: a feature flag service (loaded once per request, typed, per-tenant) and a global toast notification system. The existing codebase already has a `feature_flags` DB table with Drizzle schema, a `withTenant().featureFlags()` query helper, and several hand-rolled toast implementations scattered across pages. The work is integrating the Vercel Flags SDK (`flags` package) as the evaluation layer on top of the existing DB table, adding Sonner as the app-wide toast system, and wiring flag awareness into the navigation and routing layers.

The v1.0 codebase currently has NO feature flag evaluation -- the table exists but nothing reads it. Navigation items in `top-nav.tsx` and `side-nav.tsx` are hardcoded arrays with no conditional visibility. Three pages (`users`, `team`, `projects`) have ad-hoc toast implementations using local state and `setTimeout`. There is no tenant detail page at `/platform/tenants/[orgId]` (just a list page and API route) -- one must be built for the platform admin flag toggle UI.

**Primary recommendation:** Build a thin feature flag service (`src/features/flags/`) that reads the existing `feature_flags` table once per request, returns a typed `FeatureFlags` object, and is consumed by both the Flags SDK `decide` functions and a React context for nav/route gating. Replace all hand-rolled toasts with Sonner.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Feature flag service loads all org flags once per request and exposes typed `FeatureFlags` interface | Flags SDK `flag()` with custom `identify` (Clerk org) + `decide` (DB lookup). Existing `featureFlags` table + `withTenant().featureFlags()` provide the data layer. Single query via `getOrgFlags()` cached in request scope. |
| INFRA-02 | Platform admin can toggle feature flags per tenant from tenant detail page | Tenant detail page does not exist yet -- must build `/platform/tenants/[orgId]/page.tsx` with flag toggle UI. API endpoint `PATCH /api/platform/flags/[orgId]` upserts rows in `feature_flags` table. |
| INFRA-03 | Feature-flagged routes/nav items are hidden when flag is disabled for the org | Nav components (`top-nav.tsx`, `side-nav.tsx`) need flag-aware filtering. Route-level middleware or layout guard returns 404/redirect for disabled routes. |
| INFRA-04 | Toast notification system (Sonner) available app-wide for alerts and feedback | Add `<Toaster />` to root layout. Replace 3 existing hand-rolled toast implementations. Export convenience wrappers. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| flags | 4.0.5 | Feature flag evaluation framework | Official Vercel SDK, first-class Next.js integration, server-side evaluation, custom DB provider support |
| sonner | 2.0.7 | Toast notifications | 20M+ weekly downloads, 9KB gzipped, works in server components, clean API, shadcn/ui ecosystem standard |

### Supporting (already installed, no changes)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm | 0.45.1 | DB queries for flag storage | Read/write `feature_flags` table |
| @clerk/nextjs | ^7.0.7 | Auth context for org-scoped flags | `identify` function extracts `organizationId` from Clerk session |
| zod | ^4.3.6 | Validation for flag toggle API | Validate admin flag update payloads |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| flags (Vercel SDK) | Raw DB queries + custom caching | Flags SDK handles precomputation, discovery endpoint, Vercel toolbar integration. Custom solution reinvents caching and has no tooling. |
| flags (Vercel SDK) | LaunchDarkly / Unleash | External service, cost, complexity. We need simple boolean flags per tenant stored in our own DB. |
| Sonner | react-hot-toast | Smaller (5KB) but less actively developed. Sonner has better defaults and broader adoption. |
| Sonner | Keep hand-rolled toasts | Current implementations are inconsistent (3 different patterns), lack stacking, no severity levels, no auto-dismiss configuration. |

**Installation:**
```bash
pnpm add flags@^4.0.5 sonner@^2.0.7
```

**Version verification:** flags 4.0.5 (verified 2026-03-28 via npm), sonner 2.0.7 (verified 2026-03-28 via npm).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── features/flags/
│   ├── flag-definitions.ts    # All flag() declarations (Flags SDK)
│   ├── flag.service.ts        # getOrgFlags(orgId) — single DB query, returns typed object
│   ├── flag.types.ts          # FeatureFlags interface, FlagName union type
│   └── flag.context.tsx       # React context provider for client components (nav gating)
├── app/
│   ├── (app)/layout.tsx       # Add <Toaster />, wrap with FlagProvider
│   ├── .well-known/vercel/flags/route.ts  # Discovery endpoint for Flags Explorer
│   └── api/platform/flags/
│       └── [orgId]/route.ts   # PATCH: toggle flags per tenant
├── components/layout/
│   ├── top-nav.tsx            # Filter NAV_ITEMS by flag state
│   └── side-nav.tsx           # Filter sections by flag state
```

### Pattern 1: Single-Query Flag Loading
**What:** Load ALL flags for the org in ONE query, cache in request scope, pass to all consumers.
**When to use:** Every request that needs flag state (i.e., all app routes).
**Example:**
```typescript
// src/features/flags/flag.service.ts
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { featureFlags } from '@/db/schema';
import type { FeatureFlags, FlagName } from './flag.types';

const DEFAULT_FLAGS: FeatureFlags = {
  dashboards: false,
  pdfExport: false,
  alerts: false,
  onboarding: false,
};

export async function getOrgFlags(organizationId: string): Promise<FeatureFlags> {
  const rows = await db
    .select({ flagName: featureFlags.flagName, enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.organizationId, organizationId));

  const flags = { ...DEFAULT_FLAGS };
  for (const row of rows) {
    if (row.flagName in flags) {
      flags[row.flagName as FlagName] = row.enabled;
    }
  }
  return flags;
}
```

### Pattern 2: Flags SDK Integration with Custom DB Provider
**What:** Use `flag()` from `flags/next` with `identify` reading Clerk org and `decide` reading from DB.
**When to use:** Server Components that need individual flag values.
**Example:**
```typescript
// src/features/flags/flag-definitions.ts
import { flag, dedupe } from 'flags/next';
import { auth } from '@clerk/nextjs/server';
import { getOrgFlags } from './flag.service';

const identify = dedupe(async () => {
  const { orgId } = await auth();
  return orgId ? { orgId } : undefined;
});

export const dashboardsFlag = flag<boolean>({
  key: 'dashboards',
  defaultValue: false,
  identify,
  async decide({ entities }) {
    if (!entities?.orgId) return false;
    const flags = await getOrgFlags(entities.orgId);
    return flags.dashboards;
  },
  description: 'Enable dashboard, charts, and KPI views',
  options: [
    { value: false, label: 'Disabled' },
    { value: true, label: 'Enabled' },
  ],
});
```

### Pattern 3: Flag-Aware Navigation
**What:** Filter nav items based on flag state, passing flags from server to client via context.
**When to use:** TopNav and SideNav components.
**Example:**
```typescript
// In top-nav.tsx — receive flags as prop or from context
const NAV_ITEMS = [
  { label: 'Input', href: '/input', icon: FileInput, flag: null },           // always visible
  { label: 'Team', href: '/team', icon: Users, flag: null },                 // v1 feature
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, flag: 'dashboards' as const },
  // ...
] as const;

// Filter: item.flag === null || flags[item.flag]
const visibleItems = NAV_ITEMS.filter(item => !item.flag || flags[item.flag]);
```

### Pattern 4: Sonner Toast Integration
**What:** Place `<Toaster />` once in root layout, use `toast()` anywhere.
**When to use:** All user feedback (success, error, info).
**Example:**
```typescript
// src/app/(app)/layout.tsx
import { Toaster } from 'sonner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ImpersonationBanner />
      <AppShell>{children}</AppShell>
      <Toaster position="top-right" richColors closeButton />
    </QueryProvider>
  );
}

// Usage in any client component:
import { toast } from 'sonner';
toast.success('Person saved');
toast.error('Failed to update allocation');
toast.info('Import complete: 42 records processed');
```

### Anti-Patterns to Avoid
- **Flag checks scattered in components:** Do NOT add `if (flagEnabled('dashboards'))` inline in 20 places. Gate at the ROUTE and NAV level only. Either the route exists or it returns 404.
- **Multiple flag queries per request:** Do NOT call `getOrgFlags()` multiple times. Call once in layout, pass down via context.
- **String-based flag names in component code:** Do NOT use `flags['dashboards']`. Use the typed `FeatureFlags` interface so TypeScript catches typos.
- **Hand-rolled toast state:** Do NOT add new `useState`-based toast patterns. Use `toast()` from Sonner everywhere.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Feature flag evaluation | Custom if/else with DB queries per component | `flags` SDK with `flag()` declarations | Handles caching, precomputation, discovery, Vercel toolbar integration |
| Toast notifications | `useState` + `setTimeout` + fixed-position div | Sonner `toast()` | Stacking, auto-dismiss, severity levels, animations, accessibility (aria-live) |
| Flag caching | Custom in-memory cache or Redis | `dedupe()` from flags SDK + React `cache()` | Request-scoped deduplication is built into the SDK |
| Nav item filtering | Separate nav config per flag combination | Single nav array with `flag` property, filter at render | 2^4 = 16 combinations is unmanageable as separate configs |

**Key insight:** The existing `feature_flags` table + `withTenant().featureFlags()` provides the data layer. The Flags SDK provides the evaluation/caching layer. Sonner replaces 3 inconsistent toast implementations with 1 line of code each.

## Common Pitfalls

### Pitfall 1: Multiple DB Queries Per Request for Flags
**What goes wrong:** Each `flag()` declaration's `decide` function independently queries the DB. With 4 flags, that is 4 queries per request.
**Why it happens:** The Flags SDK calls each flag's `decide` function independently. Without caching, each `decide` hits the DB.
**How to avoid:** Use `React.cache()` (or `dedupe()` from the SDK) to wrap `getOrgFlags()` so it executes once per request regardless of how many flags call it. The `identify` function should also use `dedupe()` to avoid multiple Clerk `auth()` calls.
**Warning signs:** Network tab shows multiple `/neon` queries on page load. Dashboard loads slowly.

### Pitfall 2: Flags Controlling Nav But Not Routes
**What goes wrong:** Nav item is hidden but the route still works. Users can type `/dashboard` in the URL and access the flagged feature.
**Why it happens:** Developer only hides the nav link, forgets to guard the actual route/page.
**How to avoid:** Implement flag checks at TWO levels: (1) nav filtering hides the link, (2) layout or page-level guard redirects to `/input` or returns 404 if flag is disabled. Use a shared `requireFlag(flagName)` utility.
**Warning signs:** Direct URL access works for features that should be gated.

### Pitfall 3: Platform Admin Flag Toggle Without Upsert
**What goes wrong:** Admin clicks "Enable dashboards" for a tenant. The code does `INSERT INTO feature_flags`. It fails with unique constraint violation because a row already exists (from a previous toggle).
**Why it happens:** The `feature_flags` table has `unique('feature_flags_org_flag_uniq').on(t.organizationId, t.flagName)`. First toggle inserts, second toggle must update.
**How to avoid:** Use Drizzle's `onConflictDoUpdate` (upsert) pattern for flag toggles. Always upsert, never plain insert.
**Warning signs:** 500 errors on second flag toggle attempt.

### Pitfall 4: Sonner Toaster Not Matching Design System
**What goes wrong:** Sonner's default styling clashes with the Nordic Precision design tokens. Toasts look out of place.
**Why it happens:** Sonner has opinionated default colors that don't match custom design systems.
**How to avoid:** Use Sonner's `theme`, `toastOptions`, and CSS custom properties to align with the project's Tailwind design tokens. The `richColors` prop provides good defaults but can be overridden.
**Warning signs:** Toasts look visually disconnected from the rest of the UI.

### Pitfall 5: Flag State Stale After Admin Toggle
**What goes wrong:** Platform admin toggles a flag for a tenant. The tenant's active session still sees the old flag state because flags are cached.
**Why it happens:** TanStack Query or server-side caching serves stale flag values.
**How to avoid:** Flags are loaded server-side per request (no client-side caching of flag state). Each page navigation re-evaluates flags. This is acceptable because flag changes are rare admin actions, not real-time operations. Do NOT cache flags in TanStack Query with long staleTime on the client -- let server components evaluate fresh each request.
**Warning signs:** User must hard-refresh to see newly enabled features.

## Code Examples

### Typed Feature Flags Interface
```typescript
// src/features/flags/flag.types.ts
export const FLAG_NAMES = ['dashboards', 'pdfExport', 'alerts', 'onboarding'] as const;
export type FlagName = (typeof FLAG_NAMES)[number];

export interface FeatureFlags {
  dashboards: boolean;
  pdfExport: boolean;
  alerts: boolean;
  onboarding: boolean;
}

// Maps flag names to the v2 routes they gate
export const FLAG_ROUTE_MAP: Record<FlagName, string[]> = {
  dashboards: ['/dashboard'],
  pdfExport: [],          // gated by UI button, not route
  alerts: ['/alerts'],
  onboarding: [],         // gated by onboarding logic, not route
};
```

### Flag Context for Client Components
```typescript
// src/features/flags/flag.context.tsx
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { FeatureFlags } from './flag.types';

const FlagContext = createContext<FeatureFlags>({
  dashboards: false,
  pdfExport: false,
  alerts: false,
  onboarding: false,
});

export function FlagProvider({ flags, children }: { flags: FeatureFlags; children: ReactNode }) {
  return <FlagContext.Provider value={flags}>{children}</FlagContext.Provider>;
}

export function useFlags(): FeatureFlags {
  return useContext(FlagContext);
}
```

### Platform Admin Flag Toggle API
```typescript
// src/app/api/platform/flags/[orgId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { featureFlags } from '@/db/schema';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { FLAG_NAMES, type FlagName } from '@/features/flags/flag.types';
import { z } from 'zod/v4';

const toggleSchema = z.object({
  flagName: z.enum(FLAG_NAMES),
  enabled: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const admin = await requirePlatformAdmin();
  const { orgId } = await params;
  const body = toggleSchema.parse(await request.json());

  await db
    .insert(featureFlags)
    .values({
      organizationId: orgId,
      flagName: body.flagName,
      enabled: body.enabled,
      setByAdminId: admin.adminId,
    })
    .onConflictDoUpdate({
      target: [featureFlags.organizationId, featureFlags.flagName],
      set: {
        enabled: body.enabled,
        setByAdminId: admin.adminId,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ success: true });
}
```

### Replacing Hand-Rolled Toast (Before/After)
```typescript
// BEFORE (src/app/(platform)/users/page.tsx pattern):
const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
const showToast = useCallback((type: 'success' | 'error', message: string) => {
  setToast({ type, message });
  setTimeout(() => setToast(null), 4000);
}, []);
// + 10 lines of fixed-position JSX for rendering

// AFTER:
import { toast } from 'sonner';
toast.success('Password reset successfully');
toast.error('Failed to search users');
// Zero state, zero JSX, zero setTimeout
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/flags` package | `flags` package (renamed) | Flags SDK v4 (2025) | Import from `flags/next` not `@vercel/flags/next` |
| react-hot-toast | Sonner | 2024-2025 | Sonner became the default in shadcn/ui and Next.js templates |
| Component-level flag checks | Route-level flag gating | Best practice | Reduces code path complexity from 2^N to N |

**Deprecated/outdated:**
- `@vercel/flags`: Renamed to `flags` in v4. The old package name still works but is deprecated.

## Existing Codebase Inventory

Items that already exist and will be leveraged or modified:

| Item | Location | Status | Action |
|------|----------|--------|--------|
| `feature_flags` table | `src/db/schema.ts:307-329` | Schema exists, table migrated | Use as-is for flag storage |
| `featureFlagsRelations` | `src/db/schema.ts:481-490` | Relations defined | Use as-is |
| `withTenant().featureFlags()` | `src/lib/tenant.ts:52-53` | Query helper exists | Can use for service layer |
| Hand-rolled toast (users) | `src/app/(platform)/users/page.tsx:30-36, 122-131` | useState + setTimeout + div | Replace with Sonner |
| Hand-rolled toast (team) | `src/app/(app)/team/page.tsx:60-62, 167-170` | successMsg state + div | Replace with Sonner |
| Hand-rolled toast (projects) | `src/app/(app)/projects/page.tsx:74-76, 180-182` | successMsg state + div | Replace with Sonner |
| TopNav NAV_ITEMS | `src/components/layout/top-nav.tsx:21-29` | Hardcoded array | Add `flag` property, filter by flags |
| SideNav SECTION_NAV | `src/components/layout/side-nav.tsx:17-68` | Hardcoded sections | Add flag awareness |
| App layout | `src/app/(app)/layout.tsx` | Wraps QueryProvider + AppShell | Add `<Toaster />` and FlagProvider |
| Tenant list page | `src/app/(platform)/tenants/page.tsx` | List with "View" links to `/platform/tenants/[id]` | Target page for detail view does not exist |
| Tenant detail API | `src/app/api/platform/tenants/[orgId]/route.ts` | GET returns tenant detail | Exists, can be extended |
| Platform admin auth | `src/lib/platform-auth.ts` (referenced) | `requirePlatformAdmin()` | Use for flag toggle API |

## Open Questions

1. **Tenant detail page scope**
   - What we know: The tenants list page links to `/platform/tenants/${tenant.id}` but no page component exists at that path. The API route exists.
   - What's unclear: Should the tenant detail page be a full page built in this phase, or just the flag toggle section? Other phases may need tenant detail for other purposes (subscription management, data operations).
   - Recommendation: Build a minimal tenant detail page with: tenant info header + feature flags toggle section. Later phases can add more sections (data export, subscription, etc.).

2. **Flag evaluation in middleware vs layout**
   - What we know: Flags SDK evaluates server-side. The app uses Clerk middleware already.
   - What's unclear: Whether to add flag-based route guards in Next.js middleware (before render) or in the `(app)/layout.tsx` (during render).
   - Recommendation: Use layout-level guards, not middleware. Middleware runs on every request including static assets. Layout-level is sufficient since flags gate entire route groups, and the layout already has auth context.

3. **Drizzle `onConflictDoUpdate` with composite unique constraint**
   - What we know: The `feature_flags` table has `unique('feature_flags_org_flag_uniq').on(t.organizationId, t.flagName)`.
   - What's unclear: Whether Drizzle's `onConflictDoUpdate` works with named composite unique constraints in the target specification.
   - Recommendation: Test during implementation. The target should be the column array `[featureFlags.organizationId, featureFlags.flagName]`. If Drizzle doesn't support composite targets, use `onConflictDoNothing` + separate update, or raw SQL.

## Sources

### Primary (HIGH confidence)
- [Flags SDK API Reference](https://flags-sdk.dev/api-reference/next) - `flag()`, `dedupe()`, `identify`, `decide` API
- [Vercel Flags SDK Reference](https://vercel.com/docs/flags/flags-sdk-reference) - Configuration and provider patterns
- [Sonner documentation](https://sonner.emilkowal.ski/getting-started) - Setup with Next.js App Router
- npm registry - flags 4.0.5, sonner 2.0.7 (verified 2026-03-28)

### Secondary (MEDIUM confidence)
- [Vercel Flags as Code blog post](https://vercel.com/blog/flags-as-code-in-next-js) - Architecture rationale
- [This Dot Labs: Introduction to Vercel Flags SDK](https://www.thisdot.co/blog/introduction-to-vercels-flags-sdk) - Integration patterns

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Both libraries verified on npm, well-documented, existing schema supports the architecture
- Architecture: HIGH - Flags SDK API verified against official docs, patterns align with existing codebase structure
- Pitfalls: HIGH - Drawn from PITFALLS.md analysis + codebase audit showing existing hand-rolled patterns

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable libraries, no fast-moving changes expected)
