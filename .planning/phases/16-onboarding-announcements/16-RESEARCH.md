# Phase 16: Onboarding & Announcements - Research

**Researched:** 2026-03-28
**Domain:** Multi-step onboarding wizard + platform announcements system
**Confidence:** HIGH

## Summary

Phase 16 builds two independent feature sets on well-established infrastructure: (1) a multi-step onboarding wizard for new tenants that guides them through department/discipline/person setup, and (2) a platform-wide announcement system allowing admins to communicate with tenants via dismissible banners.

Both features have existing schema support. The `system_announcements` table is already in `schema.ts` with title, body, severity enum (info/warning/critical), targetOrgIds array, and date range fields. The `onboarding` feature flag already exists in `flag-definitions.ts`. The onboarding page (`/onboarding/page.tsx`) currently renders only Clerk's `CreateOrganization` component with a redirect to `/input` -- this needs to be replaced with a full wizard. The organizations table does NOT yet have an `onboardingCompletedAt` column, which must be added via migration. driver.js (v1.4.0 current on npm) is NOT yet installed but was pre-selected in STACK.md for guided tours.

**Primary recommendation:** Build the onboarding wizard as a client component with step state managed locally (React state + URL step param), calling existing department/discipline POST APIs. Build announcements as a standard CRUD feature with platform admin API routes + a client-side banner component in the (app) layout. Use localStorage for dismissal tracking of info-level announcements.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ONBR-01 | New tenant sees multi-step onboarding wizard after org creation | Replace current `/onboarding/page.tsx` with wizard; add `onboardingCompletedAt` to organizations table; redirect logic in (app) layout |
| ONBR-02 | Wizard guides through: add departments, add disciplines, create first person or import | Existing POST APIs for departments (`/api/departments`), disciplines (`/api/disciplines`) can be reused directly |
| ONBR-03 | Wizard offers pre-filled suggestions for engineering departments and disciplines | Static suggestion arrays embedded in wizard component; no API needed |
| ONBR-04 | Existing tenants are marked as onboarded and skip the wizard | DB migration: add column + backfill all existing orgs with `NOW()` |
| ONBR-05 | User can skip the wizard and access the app directly | Skip button at every step; sets `onboardingCompletedAt` and navigates to `/input` |
| PLOP-02 | Platform admin can create announcements with title, body, severity, date range | `system_announcements` table exists; build CRUD API routes under `/api/platform/announcements` |
| PLOP-03 | Tenant users see active announcements as dismissible banner in the app | Banner component in (app) layout; fetch active announcements with TanStack Query; dismiss with localStorage |
| PLOP-04 | Critical announcements persist until expiry; info-level can be dismissed | Severity-based dismiss logic: `critical` hides dismiss button, `info`/`warning` allow localStorage dismiss |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 (App Router) | 16.2.1 | Framework | Existing stack |
| Drizzle ORM | 0.45.1 | DB access for announcements CRUD + onboarding column migration | Existing stack |
| TanStack Query 5 | ^5.95.2 | Client-side data fetching for announcements | Existing stack |
| Zod 4 | ^4.3.6 | Validation for announcement create/update schemas | Existing stack |
| Sonner | ^2.0.7 | Toast feedback for wizard steps and announcement actions | Already installed |
| Clerk | ^7.0.7 | Auth context for org creation + user identification | Existing stack |
| Lucide React | ^1.7.0 | Icons in wizard steps and announcement banner | Existing stack |

### New Addition
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| driver.js | ^1.4.0 | Guided product tour for post-onboarding feature highlights | Optional enhancement after wizard completes; NOT required for core ONBR requirements |

**Installation:**
```bash
pnpm add driver.js@^1.4.0
```

**Note on driver.js scope:** The ONBR requirements specify a multi-step **wizard** (form-based onboarding), not a **product tour** (highlighting existing UI elements). driver.js is for product tours. The wizard is pure React components calling existing APIs. driver.js could add a "show me around" tour after wizard completion, but this is supplementary, not required by any ONBR requirement. Plan accordingly: wizard first, optional tour second.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom wizard component | react-step-wizard | Our wizard has only 4 steps with custom UI; a library adds dependency for minimal value |
| localStorage dismissals | DB `announcement_dismissals` table | localStorage is simpler, clears on browser change but sufficient for v2.0 |
| driver.js | react-joyride 3.0 | react-joyride v3 just shipped March 2026; too new to trust in production |

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    onboarding/
      page.tsx                          # Multi-step wizard (replace existing)
  features/
    onboarding/
      onboarding.service.ts             # Server: check/mark onboarded, get org setup state
      onboarding.constants.ts           # Pre-filled department/discipline suggestions
      onboarding.types.ts               # Step types, suggestion types
    announcements/
      announcement.service.ts           # Server: CRUD + active announcements query
      announcement.schema.ts            # Zod schemas for create/update
      announcement.types.ts             # Shared types
  components/
    onboarding/
      onboarding-wizard.tsx             # Client: main wizard orchestrator
      step-departments.tsx              # Client: department creation step
      step-disciplines.tsx              # Client: discipline creation step
      step-people.tsx                   # Client: create first person or import
      step-complete.tsx                 # Client: success screen with navigation links
    announcements/
      announcement-banner.tsx           # Client: dismissible banner in (app) layout
  app/
    api/
      onboarding/
        status/route.ts                 # GET: check if org is onboarded
        complete/route.ts               # POST: mark org as onboarded
      platform/
        announcements/
          route.ts                      # GET (list) + POST (create)
          [id]/route.ts                 # GET + PATCH + DELETE
    (platform)/
      announcements/
        page.tsx                        # Platform admin announcement management UI
```

### Pattern 1: Multi-Step Wizard with Local State
**What:** Wizard step state managed in React state (not URL) with a step index and collected data object. Each step validates independently before advancing.
**When to use:** When wizard data is transient (calls APIs per step, not submitted all at once).
**Example:**
```typescript
// Source: project pattern from existing import wizard (step-upload, step-map, step-validate)
type WizardStep = 'departments' | 'disciplines' | 'people' | 'complete';

function OnboardingWizard({ orgId }: { orgId: string }) {
  const [step, setStep] = useState<WizardStep>('departments');

  // Each step calls existing APIs (POST /api/departments, etc.)
  // On complete, call POST /api/onboarding/complete
}
```

### Pattern 2: Announcement Banner with Severity-Based Dismissal
**What:** A fixed-position banner component that fetches active announcements and renders the highest-severity one. Dismissal state stored in localStorage keyed by announcement ID. Critical announcements have no dismiss button.
**When to use:** For system-wide messaging that respects severity levels.
**Example:**
```typescript
function AnnouncementBanner() {
  const { data: announcements } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: () => fetch('/api/announcements/active').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const dismissed = getDismissedIds(); // from localStorage
  const visible = announcements?.filter(
    (a) => a.severity === 'critical' || !dismissed.includes(a.id)
  );
  // Render highest severity first
}
```

### Pattern 3: Onboarding Check in Layout (Server Component)
**What:** The (app) layout checks if the current org has completed onboarding. If not, redirect to `/onboarding`. This runs server-side so no flash of app content.
**When to use:** To gate the entire app behind onboarding completion for new orgs.
**Example:**
```typescript
// In src/app/(app)/layout.tsx (server component)
const org = await getOrganization(orgId);
if (!org.onboardingCompletedAt && flags.onboarding) {
  redirect('/onboarding');
}
```

### Anti-Patterns to Avoid
- **Blocking wizard with no skip:** Every wizard step MUST have a skip/later option. Users who know what they're doing should not be forced through tutorials.
- **Wizard calling bulk API instead of existing endpoints:** Do NOT create a special `/api/onboarding/setup` that creates departments+disciplines+people in one call. Use existing individual endpoints -- less code, already tested.
- **Announcements fetched on every page navigation:** Use TanStack Query with `staleTime: 300_000` (5 min). Announcements change rarely.
- **Announcement banner stacking with impersonation banner:** During impersonation, the impersonation banner already occupies `fixed top-0 z-50`. Announcement banner must sit BELOW it. Check for `actor` context to offset.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Department/discipline creation in wizard | New bulk-create APIs | Existing `POST /api/departments` and `POST /api/disciplines` | Already tested, validated with Zod schemas, tenant-scoped |
| Announcement severity display | Custom notification system | Severity-to-color mapping + Tailwind classes | info=blue, warning=amber, critical=red -- 3 CSS classes, not a library |
| Product tour highlighting | Custom overlay + spotlight | driver.js (if tour is implemented) | Scroll positioning, overlay management, and highlight animation are hard to get right |
| Onboarding state tracking | Cookie-based or localStorage | DB column on organizations table | Must persist across browsers/devices; org-level not user-level |

## Common Pitfalls

### Pitfall 1: Existing Tenants See Onboarding After Deploy
**What goes wrong:** Adding the onboarding redirect in (app) layout without a migration that marks existing orgs as onboarded. All existing tenants get redirected to the wizard.
**Why it happens:** Migration and code deploy happen atomically on Vercel, but the column default may be NULL (not onboarded).
**How to avoid:** The migration MUST both (1) add `onboarding_completed_at` column to organizations AND (2) backfill all existing rows with `NOW()`. Use a single Drizzle migration that does both. Deploy migration before deploying the redirect logic, or use the `onboarding` feature flag to gate the redirect.
**Warning signs:** Existing test tenant suddenly shows wizard instead of their data.

### Pitfall 2: Wizard Step Failure Leaves Partial State
**What goes wrong:** User creates departments in step 1, then step 2 fails (network error). They refresh and see the wizard from step 1 again, but departments already exist. Creating them again hits the unique constraint.
**Why it happens:** Wizard state is in React state (lost on refresh), but API calls persist in DB.
**How to avoid:** On wizard mount, fetch current org state (departments, disciplines, people counts). Pre-fill wizard steps with existing data. If departments already exist, show them as "already added" with option to add more. The wizard should be idempotent.
**Warning signs:** Duplicate name errors during onboarding.

### Pitfall 3: Announcement Banner Z-Index War with Impersonation Banner
**What goes wrong:** Both banners use `fixed top-0 z-50`, overlapping each other. During impersonation, the announcement is invisible behind the impersonation banner.
**Why it happens:** Impersonation banner is at `fixed top-0 z-50` (see `impersonation-banner.tsx` line 109).
**How to avoid:** Announcement banner should be positioned BELOW the impersonation banner. Use `top-[calc(var(--banner-offset,0px))]` or check for impersonation state and add `top-10` when active. Better yet: place the announcement banner inside the layout flow (not fixed) as the first child of `<main>`, not overlaid on the page.
**Warning signs:** Banner invisible during impersonation testing.

### Pitfall 4: Announcements Query Without Date Filtering
**What goes wrong:** The active announcements endpoint returns ALL announcements (including expired and future ones). Client-side filtering handles it, but the query scans the entire table.
**Why it happens:** Developer forgets the `WHERE starts_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW())` clause.
**How to avoid:** The active announcements query MUST filter by date range server-side. The `announcements_schedule_idx` index on `(starts_at, expires_at)` already exists for this.
**Warning signs:** Expired announcements appearing briefly before client filter runs.

### Pitfall 5: driver.js Crashes on Server-Side Render
**What goes wrong:** Importing driver.js in a component that runs on the server throws `ReferenceError: document is not defined`. driver.js manipulates the DOM directly.
**Why it happens:** Next.js App Router server-renders components by default.
**How to avoid:** Use `next/dynamic` with `{ ssr: false }` OR wrap driver.js usage in a `'use client'` component that only initializes in `useEffect`. The driver instance must never be created at module scope.
**Warning signs:** Build-time or hydration errors mentioning `document` or `window`.

## Code Examples

### Onboarding Status Check (Server Service)
```typescript
// src/features/onboarding/onboarding.service.ts
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizations } from '@/db/schema';

export async function isOrgOnboarded(orgId: string): Promise<boolean> {
  const [org] = await db
    .select({ onboardingCompletedAt: organizations.onboardingCompletedAt })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return !!org?.onboardingCompletedAt;
}

export async function markOnboarded(orgId: string): Promise<void> {
  await db
    .update(organizations)
    .set({ onboardingCompletedAt: new Date() })
    .where(eq(organizations.id, orgId));
}
```

### Pre-filled Suggestions (Constants)
```typescript
// src/features/onboarding/onboarding.constants.ts
export const DEPARTMENT_SUGGESTIONS = [
  'Software Engineering',
  'Hardware Engineering',
  'Test & Verification',
  'Systems Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
] as const;

export const DISCIPLINE_SUGGESTIONS = [
  { name: 'Software', abbreviation: 'SW' },
  { name: 'Hardware', abbreviation: 'HW' },
  { name: 'Mechanical', abbreviation: 'ME' },
  { name: 'Electrical', abbreviation: 'EE' },
  { name: 'Test', abbreviation: 'TE' },
  { name: 'Systems', abbreviation: 'SYS' },
] as const;
```

### Active Announcements Query (Server Service)
```typescript
// src/features/announcements/announcement.service.ts
import { and, or, lte, gte, isNull, sql, eq, arrayContains } from 'drizzle-orm';
import { db } from '@/db';
import { systemAnnouncements } from '@/db/schema';

export async function getActiveAnnouncements(orgId?: string) {
  const now = new Date();

  const rows = await db
    .select()
    .from(systemAnnouncements)
    .where(
      and(
        lte(systemAnnouncements.startsAt, now),
        or(
          isNull(systemAnnouncements.expiresAt),
          gte(systemAnnouncements.expiresAt, now),
        ),
        // Either no target orgs (global) or this org is targeted
        or(
          isNull(systemAnnouncements.targetOrgIds),
          orgId ? sql`${systemAnnouncements.targetOrgIds} @> ARRAY[${orgId}]::uuid[]` : sql`true`,
        ),
      ),
    )
    .orderBy(systemAnnouncements.severity); // critical first

  return rows;
}
```

### Announcement Dismissal (Client Helper)
```typescript
// src/components/announcements/use-dismissed-announcements.ts
const STORAGE_KEY = 'dismissed_announcements';

export function getDismissedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function dismissAnnouncement(id: string): void {
  const ids = getDismissedIds();
  if (!ids.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id]));
  }
}
```

### Drizzle Migration: Add onboardingCompletedAt
```sql
-- Add onboarding_completed_at column to organizations
ALTER TABLE organizations ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

-- Backfill all existing orgs as already onboarded
UPDATE organizations SET onboarding_completed_at = NOW() WHERE onboarding_completed_at IS NULL;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal wizard blocking app | Inline wizard with skip option | 2024+ SaaS best practice | Non-blocking UX, higher completion rates |
| Server-rendered announcement pages | Client-fetched banners with staleTime | TanStack Query pattern | Announcements don't block page load |
| react-joyride for tours | driver.js | 2025 (React 19 broke joyride) | Framework-agnostic, no React version coupling |

## Open Questions

1. **Onboarding flag vs automatic detection**
   - What we know: The `onboarding` feature flag exists and gates the wizard. The onboardingCompletedAt column will track completion.
   - What's unclear: Should the wizard show ONLY when the flag is enabled, or should it show for all new orgs regardless of flag? If flag-gated, new orgs with flag=off never see onboarding.
   - Recommendation: Use both -- redirect to wizard only when (a) flag is enabled AND (b) org is not onboarded. For orgs with flag disabled, they use the current bare experience (Clerk org creation -> redirect to /input).

2. **Announcement targeting granularity**
   - What we know: The `targetOrgIds` column is a UUID array. NULL means "all orgs".
   - What's unclear: Should there be a UI for selecting specific target orgs, or is the MVP "all orgs" only?
   - Recommendation: For PLOP-02, include an optional multi-select for target orgs in the admin UI. The schema supports it; the query supports it. Small additional effort.

3. **Wizard demo data option**
   - What we know: FEATURES.md mentions "Optional: load demo data to show what a populated workspace looks like" in the onboarding workflow.
   - What's unclear: This is not in the ONBR requirements.
   - Recommendation: Defer demo data to a later phase. It is out of scope for ONBR-01 through ONBR-05.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| driver.js | Optional product tour | Not installed | 1.4.0 (npm) | Skip tour feature; wizard works without it |
| Drizzle Kit (migrations) | ONBR-04 schema change | Available | Part of devDependencies | -- |
| Existing dept/discipline APIs | ONBR-02 wizard steps | Available | v1.0 | -- |

**Missing dependencies with no fallback:** None -- all core requirements use existing stack.

**Missing dependencies with fallback:**
- driver.js: Not installed. Install with `pnpm add driver.js@^1.4.0` if product tour is scoped in. Wizard itself needs no new dependencies.

## Sources

### Primary (HIGH confidence)
- Project source code: `src/db/schema.ts` (systemAnnouncements table, organizations table, featureFlags table)
- Project source code: `src/features/flags/flag-definitions.ts` (onboarding flag exists)
- Project source code: `src/app/onboarding/page.tsx` (current bare onboarding)
- Project source code: `src/app/(app)/layout.tsx` (where onboarding redirect + announcement banner go)
- Project source code: `src/app/api/departments/route.ts`, `src/app/api/disciplines/route.ts` (existing CRUD APIs)
- Project source code: `src/components/platform/impersonation-banner.tsx` (z-index conflict reference)

### Secondary (MEDIUM confidence)
- npm registry: driver.js v1.4.0 (verified current)
- [Next.js Lazy Loading Guide](https://nextjs.org/docs/app/guides/lazy-loading) - dynamic import with `{ ssr: false }`

### Tertiary (LOW confidence)
- SaaS onboarding best practices from FEATURES.md research sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all existing libraries, only driver.js is new and optional
- Architecture: HIGH - follows established project patterns (feature folders, API routes, TanStack Query)
- Pitfalls: HIGH - verified against actual codebase (impersonation banner z-index, unique constraints, SSR issues)

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable domain, no rapidly changing dependencies)
