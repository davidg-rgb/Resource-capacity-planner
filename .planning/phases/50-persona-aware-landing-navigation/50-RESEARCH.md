# Phase 50: Persona-aware landing & navigation - Research

**Researched:** 2026-04-20
**Domain:** Next.js client-side routing, persona-scoped navigation, i18n, feature flags
**Confidence:** HIGH

## Summary

Phase 50 transforms the app from route-based sidebar navigation to persona-keyed navigation. The existing codebase has all the building blocks: `getLandingRoute(persona)` already maps 5 persona kinds to routes, `usePersona()` provides client-side persona state, and the feature flag infrastructure (`flag.types.ts`, `flag.service.ts`, `flag.context.tsx`) supports adding new flags. The main work is: (1) adding a new `uiV6.landing` flag to the existing flag system, (2) creating a client-side `PersonaRedirect` component at `src/app/(app)/page.tsx`, (3) rewriting `SECTION_NAV` from route-prefix keying to persona-kind keying, (4) adding a "Home" breadcrumb link to the existing `Breadcrumbs` component, (5) collapsing the two-select persona switcher into a single grouped `<select>`, and (6) adding 18 i18n keys.

There is no `src/app/(app)/page.tsx` today -- it must be created. The root `src/app/page.tsx` is a server component doing Clerk `orgRole`-based redirects; it stays unchanged. The `(app)` layout already wraps children with `PersonaProvider` and `FlagProvider`, so the new page can access both via hooks.

**Primary recommendation:** Add `uiV6.landing` to the existing `FeatureFlags` type and `DEFAULT_FLAGS`, then implement the 5 NAV requirements as purely client-side changes gated behind that flag. No schema migration needed -- the `feature_flags` table is already a generic key-value store.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Client-side `PersonaRedirect` in new `src/app/(app)/page.tsx`; existing `src/app/page.tsx` stays for signed-out users
- D-02: Separate persona-keyed entries in `SECTION_NAV`; `getSectionKey` replaced with `SECTION_NAV[persona.kind]`; admin sidebar gains People + Projects + Change-log
- D-03: Single `<select>` with `<optgroup>` per PersonaKind; auto-select when 1 match, disable when 0, persist to localStorage when >1; impersonation requires manual pick
- D-04: Single `uiV6.landing` flag gating all NAV-01..05 changes
- D-05: i18n keys under `sidebar.personaSections.*` per UI-RESTRUCTURE-PLAN-v2.md section 6
- D-06: Breadcrumbs gain "Home" link resolving to `getLandingRoute(persona)`; snapshot tests updated

### Claude's Discretion
- Implementation order of the 5 NAV requirements within the phase
- Whether `PersonaRedirect` is a separate component file or inline in `(app)/page.tsx`
- Breadcrumb component structure (reuse existing pattern or new component)
- Test file organization for the new sidebar sections

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | Root `/` redirects to `getLandingRoute(persona)` via client-side PersonaRedirect in `(app)/page.tsx`; gated behind `uiV6.landing` | Feature flag infrastructure verified (flag.types.ts + flag.service.ts + flag.context.tsx); `getLandingRoute` exists in persona.routes.ts; `(app)/page.tsx` does not exist yet (needs creation); `(app)/layout.tsx` already wraps with PersonaProvider + FlagProvider |
| NAV-02 | `SECTION_NAV` in side-nav.tsx exposes persona-scoped items for all 5 personas | Current SECTION_NAV is route-prefix keyed (7 entries); must be rewritten to persona-kind keyed (5 entries); existing sidebar i18n uses `useTranslations('sidebar')` -- new keys go under `sidebar.personaSections.*` |
| NAV-03 | Breadcrumbs include "Home" link resolving to `getLandingRoute(persona)` | Existing `Breadcrumbs` component (33 lines, breadcrumbs.tsx) is path-based, stateless; needs `usePersona()` integration + a "Home" link prefix; no snapshot tests exist yet (must create) |
| NAV-04 | Persona switcher collapses to single grouped `<select>` with edge-case handling | Current switcher (persona-switcher.tsx, 210 lines) uses two separate selects (kind + person/department); must be restructured to single select with `<optgroup>`; localStorage persistence pattern already established |
| NAV-05 | 18 new `sidebar.personaSections.*` i18n keys in sv.json + en.json | Exact key names and translations specified in UI-RESTRUCTURE-PLAN-v2.md section 6; existing `sidebar.staff` and `sidebar.projects` remain untouched (no collision) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | (existing) | App Router, client/server components | Already in project [VERIFIED: src/app structure] |
| next-intl | (existing) | i18n via `useTranslations` | Already used for all sidebar text [VERIFIED: side-nav.tsx imports] |
| @tanstack/react-query | (existing) | Data fetching for people list in switcher | Already used in persona-switcher.tsx [VERIFIED: codebase] |
| @clerk/nextjs | (existing) | Auth, orgRole for fallback routing | Already used in root page.tsx [VERIFIED: codebase] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^2.1.9 | Unit/component tests | Sidebar section tests, breadcrumb snapshot tests [VERIFIED: package.json] |
| @testing-library/react | (existing) | RTL component testing | Persona switcher tests [VERIFIED: package.json] |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers | Assertion helpers [VERIFIED: package.json] |

**No new dependencies required.** All work uses existing libraries.

## Architecture Patterns

### Relevant File Structure
```
src/
  app/
    page.tsx                          # Server-side root redirect (KEEP unchanged)
    (app)/
      page.tsx                        # NEW: PersonaRedirect client component (NAV-01)
      layout.tsx                      # Already wraps with PersonaProvider + FlagProvider
  components/
    layout/
      side-nav.tsx                    # REWRITE: SECTION_NAV from route-prefix to persona-kind keys
      breadcrumbs.tsx                 # MODIFY: add "Home" link prefix
    persona/
      persona-switcher.tsx            # SIGNIFICANT REFACTOR: two-select -> grouped select
  features/
    flags/
      flag.types.ts                   # MODIFY: add 'uiV6.landing' to FLAG_NAMES + FeatureFlags
      flag.service.ts                 # MODIFY: add uiV6.landing to DEFAULT_FLAGS (default false)
      flag.context.tsx                # MODIFY: add uiV6.landing to DEFAULT_FLAGS
    personas/
      persona.routes.ts               # READ ONLY: getLandingRoute already exists
      persona.types.ts                # READ ONLY: Persona union type
      persona.context.tsx             # READ ONLY: usePersona hook
  messages/
    sv.json                           # ADD 18 keys under sidebar.personaSections.*
    en.json                           # ADD 18 keys under sidebar.personaSections.*
```

### Pattern 1: Feature Flag Extension
**What:** Add `uiV6.landing` to the existing flag system -- no schema migration needed.
**How:** The `feature_flags` table stores `flag_name varchar(100)` per org. Just add `'uiV6.landing'` to the `FLAG_NAMES` array in `flag.types.ts`, add it to the `FeatureFlags` interface with `boolean`, and add it (defaulting `false`) to `DEFAULT_FLAGS` in both `flag.service.ts` and `flag.context.tsx`. The `FLAG_ROUTE_MAP` does NOT need a mapping because the flag gates behavior (redirect logic), not route access. [VERIFIED: flag.types.ts, flag.service.ts, flag.context.tsx]

```typescript
// flag.types.ts — add to existing
export const FLAG_NAMES = ['dashboards', 'pdfExport', 'alerts', 'onboarding', 'scenarios', 'uiV6.landing'] as const;

export interface FeatureFlags {
  dashboards: boolean;
  pdfExport: boolean;
  alerts: boolean;
  onboarding: boolean;
  scenarios: boolean;
  'uiV6.landing': boolean;  // Note: dot in key requires bracket access
}
```

**Important:** The flag name `uiV6.landing` contains a dot. TypeScript interface keys with dots require bracket access (`flags['uiV6.landing']`). The existing `FLAG_ROUTE_MAP` pattern uses `flagName as FlagName` for access which handles this. However, the dot may cause issues with the `if (row.flagName in flags)` check in `flag.service.ts` -- verify this works. [ASSUMED]

**Alternative:** Use `uiV6Landing` (camelCase without dot) to avoid bracket access. This is Claude's discretion.

### Pattern 2: Client-Side PersonaRedirect
**What:** New `src/app/(app)/page.tsx` that reads persona from context and feature flag, then `router.replace()` to the landing route.
**When:** Signed-in user hits root `/` and gets through the `(app)` layout (which means they're authenticated).
**How:** The `(app)/layout.tsx` already provides `PersonaProvider` and `FlagProvider`. A 'use client' page component reads both hooks, checks `flags['uiV6.landing']`, and either redirects to `getLandingRoute(persona)` or falls through to the old behavior.

```typescript
// src/app/(app)/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePersona } from '@/features/personas/persona.context';
import { useFlags } from '@/features/flags/flag.context';
import { getLandingRoute } from '@/features/personas/persona.routes';

export default function PersonaRedirect() {
  const { persona } = usePersona();
  const flags = useFlags();
  const router = useRouter();

  useEffect(() => {
    if (flags['uiV6.landing']) {
      router.replace(getLandingRoute(persona));
    } else {
      // Fallback: orgRole-based redirect handled by server-side src/app/page.tsx
      // If we reach here, the user somehow got to (app)/page without a redirect
      router.replace('/dashboard');
    }
  }, [persona, flags, router]);

  return null; // Brief flash acceptable per ADR-004
}
```

**Routing flow when flag is ON:**
1. User hits `/` -> Next.js serves `src/app/page.tsx` (server component)
2. Server component does Clerk auth check -> if signed in, falls through to `(app)` layout
3. `(app)/layout.tsx` wraps with providers -> renders `(app)/page.tsx` (client component)
4. Client component reads persona -> `router.replace(getLandingRoute(persona))`

**CRITICAL CONCERN:** The current `src/app/page.tsx` calls `redirect()` unconditionally to `/dashboard` or `/dashboard/team`. This means `src/app/(app)/page.tsx` would NEVER be reached because the server redirect fires first. The solution: when `uiV6.landing` is on, the server-side `page.tsx` must redirect to a path that resolves to `(app)/page.tsx`. [VERIFIED: src/app/page.tsx always redirects]

**Resolution options:**
1. Modify `src/app/page.tsx` to check the flag server-side and redirect to a neutral path like `/(app)/landing` when flag is on -- but flag check requires DB query + orgId
2. The `src/app/page.tsx` already redirects to `/dashboard` which goes through `(app)` layout. The persona redirect could live on the dashboard page instead -- but that changes dashboard behavior
3. **Best approach:** Check `uiV6.landing` flag in `src/app/page.tsx` (server-side, `getOrgFlags(orgId)` is already available) and redirect to a new `/persona-landing` route that hosts the client redirect. OR simply redirect to `/` within the `(app)` group by having `(app)/page.tsx` exist and the server `page.tsx` not interfere when the flag is on.

**Actually:** In Next.js App Router, `src/app/page.tsx` and `src/app/(app)/page.tsx` both compete for the `/` route. The route group `(app)` does NOT change the URL -- `src/app/(app)/page.tsx` ALSO resolves to `/`. This means there would be a conflict. [VERIFIED: Next.js App Router route groups documentation]

**Correct approach:** Modify `src/app/page.tsx` to check the flag and, when on, redirect to a dedicated client page (e.g., `/home`) OR integrate the persona redirect into the existing server page by loading persona from localStorage (not possible server-side) OR make the persona redirect happen in the layout/shell level instead of a page.

**Recommended resolution:** Keep `src/app/page.tsx` as the sole handler for `/`. Add flag check server-side: when `uiV6.landing` is true, redirect to `/home` (a new route under `(app)`). The `/home` route hosts the `PersonaRedirect` client component. When the flag is off, existing behavior is preserved. This avoids the route conflict.

**Wait -- re-reading CONTEXT D-01:** "PersonaRedirect component in a new `src/app/(app)/page.tsx`". The user explicitly decided on this path. But as analyzed above, `(app)/page.tsx` resolves to `/` which conflicts with `src/app/page.tsx`. In Next.js, the more specific route wins -- `src/app/page.tsx` (direct) takes precedence over `src/app/(app)/page.tsx` (route group). So the (app) page would never be hit for `/`.

**The planner must address this routing conflict.** Two viable solutions:
1. Move the `PersonaRedirect` to a different route (e.g., `src/app/(app)/home/page.tsx` at `/home`) and redirect there from the server page when the flag is on
2. Convert `src/app/page.tsx` itself to conditionally call `getOrgFlags` and when `uiV6.landing` is on, render a client component that does the persona redirect (hybrid server/client approach)

### Pattern 3: Persona-Keyed SECTION_NAV
**What:** Replace the route-prefix-keyed `SECTION_NAV` with persona-kind-keyed entries.
**Current state:** 7 entries keyed by route prefix (`/input`, `/team`, `/projects`, `/data`, `/dashboard`, `/scenarios`, `/admin`). [VERIFIED: side-nav.tsx]

**New structure:**
```typescript
const PERSONA_SECTION_NAV: Record<PersonaKind, NavSectionDef[]> = {
  pm: [
    {
      headingKey: 'personaSections.pm',
      items: [
        { labelKey: 'personaSections.pmHome', href: '/pm', icon: 'home' },
        { labelKey: 'personaSections.pmProjects', href: '/pm/projects', icon: 'folder_open' },  // or /pm for project list
        { labelKey: 'personaSections.pmWishes', href: '/pm/wishes', icon: 'star' },
      ],
    },
  ],
  'line-manager': [
    {
      headingKey: 'personaSections.lineManager',
      items: [
        { labelKey: 'personaSections.lmOverview', href: '/line-manager', icon: 'dashboard' },
        { labelKey: 'personaSections.lmTimeline', href: '/line-manager/timeline', icon: 'calendar_month' },
        { labelKey: 'personaSections.lmApprovalQueue', href: '/line-manager/approval-queue', icon: 'task_alt' },
        { labelKey: 'personaSections.lmImportActuals', href: '/line-manager/import-actuals', icon: 'upload_file' },
      ],
    },
  ],
  staff: [
    {
      headingKey: 'personaSections.staff',
      items: [
        { labelKey: 'personaSections.staffSchedule', href: '/staff', icon: 'event_note' },
      ],
    },
  ],
  rd: [
    {
      headingKey: 'personaSections.rd',
      items: [
        { labelKey: 'personaSections.rdPortfolio', href: '/rd', icon: 'analytics' },
        { labelKey: 'personaSections.rdAlerts', href: '/alerts', icon: 'warning' },
      ],
    },
  ],
  admin: [
    {
      headingKey: 'personaSections.adminMain',
      items: [
        { labelKey: 'personaSections.changeLog', href: '/admin', icon: 'history' },
        { labelKey: 'personaSections.adminPeople', href: '/admin/people', icon: 'group' },
        { labelKey: 'personaSections.adminProjects', href: '/admin/projects', icon: 'flag' },
        { labelKey: 'referenceData', href: '/admin/disciplines', icon: 'category' },  // existing key
        { labelKey: 'departments', href: '/admin/departments', icon: 'corporate_fare' },
        { labelKey: 'programs', href: '/admin/programs', icon: 'flag' },
      ],
    },
  ],
};
```

**Key concern:** The `SideNav` currently determines which section to show based on pathname (`getSectionKey`). With persona-keyed nav, it needs `usePersona()` instead. The `SideNav` is already a client component (`'use client'`), so adding `usePersona()` is straightforward. [VERIFIED: side-nav.tsx is 'use client']

**Dual-mode requirement:** When `uiV6.landing` is OFF, the old route-based behavior must be preserved. The `SideNav` should check the flag and use either the old `SECTION_NAV` or the new `PERSONA_SECTION_NAV`. [VERIFIED: CONTEXT D-04]

### Pattern 4: Grouped Persona Switcher
**What:** Collapse the current two-select approach into a single `<select>` with `<optgroup>` per persona kind.
**Current:** Kind select + conditional person/department select (persona-switcher.tsx, 210 lines). [VERIFIED: codebase]

**New structure:**
```tsx
<select value={compositeValue} onChange={handleChange}>
  <optgroup label={t('kind.pm')}>
    {/* PM people options or disabled placeholder */}
    {pmPeople.map(p => <option key={p.id} value={`pm:${p.id}`}>{p.firstName} {p.lastName}</option>)}
  </optgroup>
  <optgroup label={t('kind.line-manager')}>
    {departments.map(d => <option key={d.id} value={`line-manager:${d.id}`}>{d.name}</option>)}
  </optgroup>
  <optgroup label={t('kind.staff')}>
    {staffPeople.map(p => <option key={p.id} value={`staff:${p.id}`}>{p.firstName} {p.lastName}</option>)}
  </optgroup>
  <optgroup label={t('kind.rd')}>
    <option value="rd:">R&D Manager</option>
  </optgroup>
  <optgroup label={t('kind.admin')}>
    <option value="admin:">Admin</option>
  </optgroup>
</select>
```

**Composite value pattern:** Encode `kind:entityId` as the select value. Parse on change to build the correct `Persona` object. This allows a single select to handle both kind and entity selection.

**Edge cases per D-03:**
- 0 person matches for a kind: Disable the optgroup's options or show a disabled placeholder
- 1 person match: Auto-select (pre-selected in the dropdown)
- >1 matches: Show all; persist last selection to localStorage
- Impersonation (admin as PM): No auto-select, require manual pick

**Note on `<optgroup>` disabled:** HTML `<optgroup>` does not support a `disabled` attribute that grays out the group. Individual `<option disabled>` elements work. For kinds with 0 matches, add a single `<option disabled>` saying "No matches" inside the optgroup. [VERIFIED: HTML spec]

**Actually, `<optgroup disabled>` IS valid HTML** and disables all options within. This is the correct approach for 0-match kinds. [VERIFIED: MDN `<optgroup>` documentation -- the `disabled` attribute is supported]

### Anti-Patterns to Avoid
- **Route conflict between `src/app/page.tsx` and `src/app/(app)/page.tsx`:** Both resolve to `/` -- the non-grouped page takes precedence. Must route through a different path or modify the server page.
- **Server-side persona access:** Persona is client-only state (localStorage). Never try to read it server-side.
- **Breaking old behavior without flag check:** Every change must be behind `useFlags()['uiV6.landing']` check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Feature flags | Custom flag mechanism | Existing `flag.types.ts` + `flag.service.ts` + DB table | Infrastructure already exists, just needs new flag name |
| Persona routing | Custom route-to-persona mapping | `getLandingRoute(persona)` in persona.routes.ts | Already maps all 5 kinds correctly |
| i18n | Manual string management | next-intl `useTranslations('sidebar')` | Project standard, already used in side-nav.tsx |
| Persona state | New state management | `usePersona()` hook from persona.context.tsx | Provides persona, setPersona, departments; localStorage-persisted |

## Common Pitfalls

### Pitfall 1: Route Group Page Conflict
**What goes wrong:** Creating `src/app/(app)/page.tsx` to handle `/` but it never renders because `src/app/page.tsx` (the non-grouped route) takes precedence in Next.js App Router.
**Why it happens:** Route groups `(app)` don't create URL segments. Both files resolve to `/`. Next.js serves the non-grouped page.
**How to avoid:** Either (a) modify `src/app/page.tsx` to conditionally redirect to a persona landing route when the flag is on, or (b) place the PersonaRedirect at a different URL like `/home`.
**Warning signs:** The persona redirect never fires; users always land on the old dashboard.

### Pitfall 2: Flag Name with Dot
**What goes wrong:** `uiV6.landing` as a TypeScript property key requires bracket access, inconsistent with the existing dot-access pattern for other flags.
**Why it happens:** Other flags use simple camelCase names (`dashboards`, `pdfExport`).
**How to avoid:** Either consistently use bracket access everywhere, or rename to `uiV6Landing` (camelCase). The CONTEXT.md says "uiV6.landing" but this is a naming convention, not a hard constraint.
**Warning signs:** TypeScript errors or runtime `undefined` when accessing `flags.uiV6.landing` (tries to access `flags.uiV6` then `.landing`).

### Pitfall 3: Breadcrumb Hydration Mismatch
**What goes wrong:** Adding a persona-aware "Home" link to the `Breadcrumbs` component causes SSR/CSR mismatch because persona is only available after client hydration.
**Why it happens:** `usePersona()` returns `DEFAULT_PERSONA` (admin) on server render, then hydrates from localStorage. If the "Home" link uses `getLandingRoute(persona)`, it will briefly show `/admin` then switch.
**How to avoid:** Accept the brief flash (per ADR-004) or suppress the Home link until hydration completes. The existing project accepts SSR/CSR flash for persona UI.
**Warning signs:** React hydration warnings in console.

### Pitfall 4: Dual-Mode SideNav Complexity
**What goes wrong:** Maintaining both old (route-based) and new (persona-based) SECTION_NAV behind a flag check creates spaghetti code.
**Why it happens:** The flag guard means both code paths must coexist.
**How to avoid:** Clean separation: keep old `SECTION_NAV` as-is for flag-off; add new `PERSONA_SECTION_NAV` for flag-on. Single `if/else` at the top of `SideNav` selects which map to use. Don't try to merge them.
**Warning signs:** Nested conditionals inside the nav rendering.

### Pitfall 5: Persona Switcher Regression
**What goes wrong:** Collapsing to a single select breaks the department-picker persistence that Phase 49 just shipped (UNBREAK-01/02).
**Why it happens:** The department picker logic (auto-select, localStorage persistence) is tightly coupled to the current two-select structure.
**How to avoid:** The composite value pattern (`kind:entityId`) must handle department IDs the same way the current `lmDeptId` state does. Port the auto-select and localStorage logic into the new single-select handler.
**Warning signs:** LM persona loses department selection on refresh; `/line-manager` shows "select a department" again.

## Code Examples

### Existing Route Map (persona.routes.ts) [VERIFIED: codebase]
```typescript
export function getLandingRoute(p: Persona): string {
  switch (p.kind) {
    case 'pm':        return '/pm';
    case 'line-manager': return '/line-manager';
    case 'staff':     return '/staff';
    case 'rd':        return '/rd';
    case 'admin':     return '/admin';
  }
}
```

### Existing Persona Type (persona.types.ts) [VERIFIED: codebase]
```typescript
export type Persona =
  | { kind: 'pm'; personId: string; displayName: string; homeDepartmentId?: string }
  | { kind: 'line-manager'; departmentId: string; displayName: string }
  | { kind: 'staff'; personId: string; displayName: string }
  | { kind: 'rd'; displayName: string }
  | { kind: 'admin'; displayName: string };
```

### i18n Keys to Add (from UI-RESTRUCTURE-PLAN-v2.md section 6) [VERIFIED: planning doc]
```json
{
  "sidebar": {
    "personaSections": {
      "pm": "Projektledare",
      "pmHome": "Hem",
      "pmProjects": "Mina projekt",
      "pmWishes": "Mina onskemaal",
      "lineManager": "Linjechef",
      "lmOverview": "Oversikt",
      "lmTimeline": "Gruppschema",
      "lmApprovalQueue": "Godkannandeko",
      "lmImportActuals": "Importera utfall",
      "staff": "Medarbetare",
      "staffSchedule": "Mitt schema",
      "rd": "FoU",
      "rdPortfolio": "Portfolj",
      "rdAlerts": "Varningar",
      "adminMain": "Administration",
      "changeLog": "Andringslogg",
      "adminPeople": "Personer",
      "adminProjects": "Projekt"
    }
  }
}
```
Note: Actual Swedish characters (a-ring, a-umlaut, o-umlaut) from the plan doc must be used. Shown here without diacritics due to encoding constraints.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `uiV6.landing` with a dot in the flag name works with the existing `if (row.flagName in flags)` DB-to-object mapping in flag.service.ts | Architecture Patterns (Pattern 1) | Flag silently ignored; fallback behavior always used. LOW risk -- easy to verify and fix by using camelCase instead. |
| A2 | `<optgroup disabled>` grays out all child options in all target browsers | Architecture Patterns (Pattern 4) | Broken UX for 0-match persona kinds. LOW risk -- fallback is individual `<option disabled>`. |
| A3 | Next.js App Router non-grouped `page.tsx` takes precedence over `(app)/page.tsx` for the same URL `/` | Common Pitfalls (Pitfall 1) | If wrong (grouped wins), the server page breaks for signed-out users. HIGH impact but easily testable. |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + @testing-library/react |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test -- --run src/components/layout/__tests__` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | PersonaRedirect fires router.replace to persona landing when flag on | unit (RTL) | `pnpm test -- --run src/app/(app)/__tests__/persona-redirect.test.tsx` | No -- Wave 0 |
| NAV-01 | Fallback when flag off or no persona | unit (RTL) | same file | No -- Wave 0 |
| NAV-02 | PERSONA_SECTION_NAV has correct items per kind | unit | `pnpm test -- --run src/components/layout/__tests__/side-nav.test.tsx` | No -- Wave 0 |
| NAV-03 | Breadcrumb renders "Home" with persona landing href | unit (RTL) | `pnpm test -- --run src/components/layout/__tests__/breadcrumbs.test.tsx` | No -- Wave 0 |
| NAV-04 | Grouped select renders optgroups, handles 0/1/>1 | unit (RTL) | `pnpm test -- --run src/components/persona/__tests__/persona-switcher.test.tsx` | No -- Wave 0 |
| NAV-05 | 18 i18n keys exist in both sv.json and en.json | unit | `pnpm test -- --run tests/unit/i18n-persona-sections.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- --run` (targeted test file)
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `src/components/layout/__tests__/side-nav.test.tsx` -- covers NAV-02
- [ ] `src/components/layout/__tests__/breadcrumbs.test.tsx` -- covers NAV-03
- [ ] `src/components/persona/__tests__/persona-switcher.test.tsx` -- covers NAV-04
- [ ] `src/app/(app)/__tests__/persona-redirect.test.tsx` -- covers NAV-01 (or wherever the redirect ends up)
- [ ] `tests/unit/i18n-persona-sections.test.ts` -- covers NAV-05
- [ ] Shared test fixtures: mock PersonaProvider + FlagProvider wrappers

## Open Questions (RESOLVED)

1. **Route conflict for PersonaRedirect** -- RESOLVED in Plan 50-01
   - What we know: `src/app/page.tsx` and `src/app/(app)/page.tsx` both resolve to `/`. The non-grouped page wins.
   - Resolution: Server `page.tsx` checks `uiV6Landing` flag and redirects to `/home` when enabled. The PersonaRedirect lives at `src/app/(app)/home/page.tsx` (not `(app)/page.tsx`), avoiding the route conflict entirely.

2. **Flag naming convention (dot vs camelCase)** -- RESOLVED in Plan 50-01
   - What we know: CONTEXT.md and STATE.md both reference `uiV6.landing` with a dot. Existing flags use camelCase without dots.
   - Resolution: Using `uiV6Landing` (camelCase) in code for consistency with existing flags (`dashboards`, `pdfExport`, etc.). Avoids bracket-access issues and aligns with `if (row.flagName in flags)` pattern in flag.service.ts.

3. **Persona routes for sidebar items** -- RESOLVED in Plan 50-02
   - What we know: PM has `/pm`, `/pm/projects/[id]`, `/pm/wishes`. No separate `/pm/projects` list route exists.
   - Resolution: Using existing routes only. PM "My Projects" sidebar item links to `/pm` (the home page which IS the project list). No new routes created.

## Sources

### Primary (HIGH confidence)
- `src/components/layout/side-nav.tsx` -- current SECTION_NAV structure, 167 lines [VERIFIED: codebase]
- `src/features/personas/persona.routes.ts` -- getLandingRoute implementation [VERIFIED: codebase]
- `src/features/personas/persona.types.ts` -- Persona union type [VERIFIED: codebase]
- `src/features/personas/persona.context.tsx` -- usePersona hook, department fetch [VERIFIED: codebase]
- `src/components/persona/persona-switcher.tsx` -- current two-select switcher, 210 lines [VERIFIED: codebase]
- `src/components/layout/breadcrumbs.tsx` -- current breadcrumb implementation, 33 lines [VERIFIED: codebase]
- `src/features/flags/flag.types.ts` -- FLAG_NAMES, FeatureFlags interface [VERIFIED: codebase]
- `src/features/flags/flag.service.ts` -- getOrgFlags server-side flag loading [VERIFIED: codebase]
- `src/features/flags/flag.context.tsx` -- FlagProvider + useFlags client hook [VERIFIED: codebase]
- `src/app/page.tsx` -- server-side root redirect [VERIFIED: codebase]
- `src/app/(app)/layout.tsx` -- app shell with PersonaProvider + FlagProvider [VERIFIED: codebase]
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` section 6 -- exact i18n key list [VERIFIED: planning doc]

### Secondary (MEDIUM confidence)
- Next.js App Router route group behavior (non-grouped takes precedence) [CITED: Next.js docs]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new deps
- Architecture: HIGH -- patterns derived from reading actual source code; all open questions resolved
- Pitfalls: HIGH -- identified from concrete code analysis (route conflict, flag naming, hydration)

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable -- internal project, no external API changes)
