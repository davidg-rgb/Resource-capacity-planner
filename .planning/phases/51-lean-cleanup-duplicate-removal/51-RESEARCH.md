# Phase 51: Lean Cleanup -- Duplicate Removal - Research

**Researched:** 2026-04-20
**Domain:** Next.js route redirects, React widget registry, Drizzle JSONB migration, PDF regression testing
**Confidence:** HIGH

## Summary

Phase 51 eliminates duplicate surfaces and dead widgets identified in WIDGET-INVENTORY.md. The work breaks into 5 distinct technical areas: (1) Next.js `redirects()` configuration for 308 permanent redirects of 3 deprecated routes, (2) default layout trimming in `default-layouts.ts` for 4 layout arrays, (3) a one-shot Drizzle migration to strip dead widget IDs from the `dashboard_layouts` JSONB column before physical file deletion, (4) a defensive fallback in `widget-registry.ts` for unknown widget IDs, and (5) PDF snapshot regression testing for `/api/reports/team-heatmap`. Everything is gated behind a new `uiV6LeanTrim` feature flag.

The codebase is well-structured for this work. The widget registry is a clean Map-based singleton. Default layouts are plain arrays of `WidgetPlacement` objects. The feature flag system already has one v6 flag (`uiV6Landing`) as a pattern to follow. The main risk areas are: (a) the JSONB migration must run before widget file deletion, (b) the `/input` page is simpler than expected (only a flat list, no dual-pane layout to trim -- the sidebar lives in `input/layout.tsx`), and (c) the PDF endpoint uses `@react-pdf/renderer` server-side rendering which is not easily snapshot-testable in vitest alone.

**Primary recommendation:** Sequence work as migration-first (DB), then redirects + layout trim (parallel), then file deletion last. The defensive fallback (LEAN-09) should ship first as a safety net regardless of flag state.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: `next.config.ts` `redirects()` with `permanent: true` (308). Three redirect rules: `/team` -> `/admin/people` (with wildcard), `/projects` -> `/admin/projects` (NOT `/projects/:projectId`), `/wishes` -> `/pm/wishes`. Fix hard-coded `<Link href="/projects">` in `projects/[projectId]/page.tsx`.
- D-02: Migration-first approach. Re-run VERIFY-05 SQL on production, ship one-shot `UPDATE dashboard_layouts` migration, then delete 3 dead widget files and clean `widgets/index.ts`.
- D-03: Delete right-side flat people list from `/input` page. Keep only left sidebar picker.
- D-04: Project-leader layouts: remove `kpi-cards`, `capacity-forecast`, `availability-finder`. Manager layouts: remove full `utilization-heat-map`, replace with summary-card CTA.
- D-05: `widget-registry.ts` returns "Widget ej tillganglig" placeholder card for unknown widget IDs instead of throwing.
- D-06: Snapshot-compare `/api/reports/team-heatmap` PDF output before and after layout trim.
- D-07: Single `uiV6.leanTrim` flag gates all Phase 51 changes. Physical file deletion deferred until flag confirmed stable. Defensive fallback (D-05) is always-on.

### Claude's Discretion
- Implementation order within phase (migration first is locked, rest flexible)
- Whether summary-card replacing `utilization-heat-map` is a new widget file or inlined
- Test file organization and naming
- Whether to add `uiV6LeanTrim` to `FLAG_ROUTE_MAP`

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEAN-01 | 308 redirect `/team` -> `/admin/people` (with wildcard) | next.config.ts `redirects()` pattern verified; currently empty config object |
| LEAN-02 | 308 redirect `/projects` -> `/admin/projects` (NOT `/projects/:projectId`) | Same mechanism; confirmed `projects/[projectId]/page.tsx:167` has hard-coded `/projects` link |
| LEAN-03 | 308 redirect `/wishes` -> `/pm/wishes` | Same mechanism |
| LEAN-04 | `/input` right-side duplicate people list removed | `input/page.tsx` IS the flat list (37 lines); sidebar lives in `input/layout.tsx` via `<PersonSidebar>` |
| LEAN-05 | One-shot `dashboard_layouts` migration strips dead widget IDs before file deletion | VERIFY-05 confirmed 1 affected row on dev; SQL from UI-RESTRUCTURE-PLAN-v2.md section 2.5 |
| LEAN-06 | Delete 3 dead widget files + clean `widgets/index.ts` | Files confirmed: `discipline-progress-widget.tsx`, `discipline-demand-widget.tsx`, `project-impact-widget.tsx` + chart components |
| LEAN-07 | Strip `kpi-cards`, `capacity-forecast`, `availability-finder` from project-leader layouts | `default-layouts.ts` lines 43-67 contain all 4 PL layout arrays |
| LEAN-08 | Strip `utilization-heat-map` from manager layouts; replace with summary-card CTA | `default-layouts.ts` lines 14-38; manager:desktop position 1, manager:mobile position 1 |
| LEAN-09 | `widget-registry` renders placeholder for unknown IDs | Current code at `dashboard-layout-engine.tsx:253` returns `null` for unknown widgets |
| LEAN-10 | PDF snapshot regression test for `/api/reports/team-heatmap` | Endpoint uses `@react-pdf/renderer`; existing test pattern in `pdf-export/__tests__/` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | `redirects()` in config for 308 redirects | Built-in, no extra dependency [VERIFIED: next.config.ts imports NextConfig] |
| Drizzle ORM | existing | DB migration for JSONB widget stripping | Already used project-wide [VERIFIED: codebase] |
| @react-pdf/renderer | existing | PDF generation in team-heatmap route | Already used [VERIFIED: route.tsx imports] |
| vitest | ^2.1.9 | Unit + integration tests | Already the project test runner [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @playwright/test | ^1.59.1 | E2E regression (redirect behavior) | Optional for redirect verification |

No new dependencies needed for this phase. All work uses existing libraries.

## Architecture Patterns

### Recommended Task Structure
```
Wave 0 (safety net):     LEAN-09 defensive fallback (always-on, no flag gate)
Wave 1 (DB migration):   LEAN-05 one-shot dashboard_layouts migration
Wave 2 (code changes):   LEAN-01..04, LEAN-07..08 (all flag-gated)
Wave 3 (file deletion):  LEAN-06 dead widget files + chart components
Wave 4 (validation):     LEAN-10 PDF regression test
```

### Pattern 1: Next.js Redirects Configuration
**What:** Add `redirects()` async function to `nextConfig` object before the `withNextIntl` wrapper.
**Source:** [VERIFIED: next.config.ts currently has empty `nextConfig` object]
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/team', destination: '/admin/people', permanent: true },
      { source: '/team/:path*', destination: '/admin/people/:path*', permanent: true },
      { source: '/projects', destination: '/admin/projects', permanent: true },
      { source: '/wishes', destination: '/pm/wishes', permanent: true },
    ];
  },
};
```
**Key detail:** `/projects/:projectId` detail pages must NOT redirect. The `/projects` redirect without a wildcard handles this naturally -- Next.js redirects are exact-match unless `:path*` is specified. [VERIFIED: UI-RESTRUCTURE-PLAN-v2.md section 2.1-2.3]

### Pattern 2: Feature Flag Addition
**What:** Add `uiV6LeanTrim` to the existing flag system.
**Source:** [VERIFIED: flag.types.ts currently has `uiV6Landing` as the pattern]
```typescript
// flag.types.ts
export const FLAG_NAMES = [
  'dashboards', 'pdfExport', 'alerts', 'onboarding', 'scenarios',
  'uiV6Landing', 'uiV6LeanTrim',   // <-- add here
] as const;

export interface FeatureFlags {
  // ... existing ...
  uiV6LeanTrim: boolean;  // <-- add here
}

// flag.service.ts DEFAULT_FLAGS
const DEFAULT_FLAGS: FeatureFlags = {
  // ... existing ...
  uiV6LeanTrim: false,  // <-- defaults OFF
};
```
**Note:** The flag name uses camelCase `uiV6LeanTrim` in code (matching `uiV6Landing`), though CONTEXT.md refers to `uiV6.leanTrim` with dot notation. The dot notation is the conceptual name; the actual TypeScript identifier must be a valid JS identifier. [VERIFIED: existing `uiV6Landing` flag in flag.types.ts]

### Pattern 3: Widget Registry Defensive Fallback
**What:** Modify `getWidget()` usage sites to render placeholder instead of returning `null`/skipping.
**Current behavior:** `dashboard-layout-engine.tsx:252-253` does `const def = getWidget(placement.widgetId); if (!def) return null;` -- silently drops unknown widgets.
**Target behavior:** Return a placeholder card showing "Widget ej tillganglig" with the widget ID for debugging.
**Implementation approach:** Either (a) modify `getWidget()` to return a fallback `WidgetDefinition` with a placeholder component, or (b) modify the rendering sites in `dashboard-layout-engine.tsx` and `export-pdf-modal.tsx` to render a fallback component when `def` is undefined. Option (b) is cleaner because it keeps the registry pure. [VERIFIED: 4 call sites in dashboard-layout-engine.tsx, 1 in export-pdf-modal.tsx]

### Pattern 4: Input Page Refactoring
**What:** The `/input` page currently renders a flat people list. The sidebar is in `input/layout.tsx`.
**Current state:** `input/page.tsx` is a simple 37-line component that renders `<ul>` of people links. The `input/layout.tsx` wraps children with `<PersonSidebar>` on the left. When visiting `/input` (no person selected), the right pane shows the flat list from `page.tsx`.
**Target:** Replace the flat list in `page.tsx` with an empty-state prompt ("Valj en person...") since the sidebar already provides the same navigation. [VERIFIED: input/page.tsx and input/layout.tsx source code]

### Pattern 5: Default Layout Modification
**What:** Modify `DEFAULT_LAYOUTS` in `default-layouts.ts` to trim duplicate widgets.
**Current state:** 4 layout arrays with widget placements as `WidgetPlacement[]`. [VERIFIED: default-layouts.ts]
**Changes needed:**
- `project-leader:desktop`: Remove `kpi-cards` (pos 0), `capacity-forecast` (pos 3), `availability-finder` (pos 8). Reindex positions.
- `project-leader:mobile`: Remove `kpi-cards` (pos 0), `capacity-forecast` (pos 3), `availability-finder` (pos 5). Reindex positions.
- `manager:desktop`: Remove `utilization-heat-map` (pos 1). Add `heat-map-summary-card` at pos 1. Reindex.
- `manager:mobile`: Remove `utilization-heat-map` (pos 1). Add `heat-map-summary-card` at pos 1. Reindex.

### Anti-Patterns to Avoid
- **Deleting files before migration:** Widget files must stay on disk until the DB migration has stripped their IDs from all `dashboard_layouts` rows AND the flag is confirmed stable.
- **Conditional redirects in next.config.ts:** Next.js `redirects()` runs at build time (or startup), not per-request. You cannot read feature flags inside `redirects()`. The rollback for redirects is reverting the config change, not toggling a flag.
- **Modifying `getWidget()` return type:** Keep it returning `WidgetDefinition | undefined` for type safety. Add the fallback at the rendering layer, not the registry layer.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route redirects | Client-side redirect components | `next.config.ts redirects()` | 308 redirects work for external bookmarks, crawlers, direct URL entry |
| JSONB array manipulation | Manual JS loop over rows | PostgreSQL `jsonb_array_elements` + `jsonb_agg` | Single SQL statement, atomic, handles edge cases |
| PDF comparison | Pixel-diff library | Structural comparison (byte-size range check + rendered element count) | `@react-pdf/renderer` output is deterministic for same input; size comparison catches regressions |

## Common Pitfalls

### Pitfall 1: Migration Must Precede File Deletion
**What goes wrong:** Deleting widget files before cleaning `dashboard_layouts` causes runtime errors for any tenant whose custom layout references the deleted widget.
**Why it happens:** The `widgets/index.ts` side-effect imports are the registration mechanism. If the import is gone, `getWidget('discipline-progress')` returns `undefined`, and without the defensive fallback, the widget silently disappears (current behavior returns `null`).
**How to avoid:** Ship LEAN-09 (defensive fallback) first as always-on. Then ship LEAN-05 (migration). Then delete files (LEAN-06).
**Warning signs:** Any `dashboard_layouts` row still containing deleted widget IDs after migration.

### Pitfall 2: `/projects/:projectId` Must Not Redirect
**What goes wrong:** Adding a wildcard redirect for `/projects/:path*` would break the project detail page.
**Why it happens:** The CONTEXT.md specifically calls this out -- `/projects` (list) redirects, but `/projects/:projectId` (detail) stays.
**How to avoid:** Use exact-match `/projects` redirect without `:path*` wildcard. Next.js redirects are exact by default.
**Warning signs:** Clicking "View" on a project row redirects to `/admin/projects/[id]` which does not exist.

### Pitfall 3: `next.config.ts` Redirects Are Build-Time
**What goes wrong:** Trying to gate redirects behind a runtime feature flag.
**Why it happens:** `redirects()` is evaluated at build/startup time, not per-request.
**How to avoid:** Accept that redirects are always-on once deployed. The rollback for redirects is a code revert, not a flag toggle. The old page files stay on disk (per D-07) so they would still render if the redirect config is reverted.
**Warning signs:** Attempting to import flag service inside `next.config.ts`.

### Pitfall 4: Summary-Card Widget Registration
**What goes wrong:** Adding `heat-map-summary-card` to `default-layouts.ts` without registering it in the widget registry.
**Why it happens:** The layout references widget IDs; the registry provides the component. If the widget is in the layout but not registered, the defensive fallback kicks in and shows "Widget ej tillganglig" instead.
**How to avoid:** Create and register the new `heat-map-summary-card` widget before modifying the layout.
**Warning signs:** Summary card position shows placeholder text on the manager dashboard.

### Pitfall 5: JSONB Migration Edge Case -- Empty Layout After Stripping
**What goes wrong:** If a `dashboard_layouts` row contains ONLY dead widget IDs, `jsonb_agg` returns `null` (not `[]`).
**Why it happens:** PostgreSQL `jsonb_agg` on zero rows returns `null`.
**How to avoid:** Use `COALESCE(jsonb_agg(...), '[]'::jsonb)` in the migration SQL.
**Warning signs:** `layout` column becomes `null` for a row, causing runtime errors when iterating widgets.

### Pitfall 6: Hard-Coded Link in Project Detail Page
**What goes wrong:** After redirecting `/projects` to `/admin/projects`, the "Back to Projects" link in `projects/[projectId]/page.tsx:167` still points to `/projects`, causing a redirect loop or unexpected navigation.
**How to avoid:** Update `href="/projects"` to `href="/admin/projects"` as part of LEAN-02.
**Warning signs:** Clicking "Back to Projects" from a project detail page loops through a redirect.

## Code Examples

### Next.js Redirects Configuration
```typescript
// Source: [VERIFIED: next.config.ts current state + Next.js redirects API]
import './src/lib/env.ts';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/team', destination: '/admin/people', permanent: true },
      { source: '/team/:path*', destination: '/admin/people/:path*', permanent: true },
      { source: '/projects', destination: '/admin/projects', permanent: true },
      { source: '/wishes', destination: '/pm/wishes', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
```

### Widget Registry Fallback Placeholder
```typescript
// Source: [VERIFIED: dashboard-layout-engine.tsx:252-253 current pattern]
// In dashboard-layout-engine.tsx, replace:
//   const def = getWidget(placement.widgetId);
//   if (!def) return null;
// With:
const def = getWidget(placement.widgetId);
if (!def) {
  return (
    <div
      key={placement.widgetId}
      className={`col-span-${placement.colSpan} rounded-lg border border-dashed border-outline-variant bg-surface-container p-4 text-center`}
    >
      <p className="text-on-surface-variant text-sm">Widget ej tillganglig</p>
      <p className="text-on-surface-variant/60 mt-1 text-xs">{placement.widgetId}</p>
    </div>
  );
}
```

### JSONB Migration SQL
```sql
-- Source: [VERIFIED: UI-RESTRUCTURE-PLAN-v2.md section 2.5, adapted with COALESCE]
UPDATE dashboard_layouts
SET layout = COALESCE(
  (
    SELECT jsonb_agg(placement)
    FROM jsonb_array_elements(layout) placement
    WHERE placement->>'widgetId' NOT IN (
      'discipline-progress', 'discipline-demand', 'project-impact'
    )
  ),
  '[]'::jsonb
)
WHERE layout::text ~* 'discipline-progress|discipline-demand|project-impact';
```

### Feature Flag Gate Pattern
```typescript
// Source: [VERIFIED: flag.types.ts + flag.service.ts existing pattern]
// In a server component or API route:
const flags = await getOrgFlags(orgId);
if (flags.uiV6LeanTrim) {
  // Use trimmed layouts
} else {
  // Use original layouts
}

// In a client component (via context or props):
const { uiV6LeanTrim } = useFlags();
```

### Input Page Empty State (replacing flat list)
```typescript
// Source: [VERIFIED: input/page.tsx current 37-line component]
export default function InputPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-on-surface-variant text-sm">
          Valj en person i listan till vanster for att visa allokeringen.
        </p>
      </div>
    </div>
  );
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^2.1.9 + @playwright/test ^1.59.1 |
| Config file | `vitest.config.ts` (unit), `e2e/playwright.config.ts` (E2E) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEAN-01 | `/team` redirects to `/admin/people` with 308 | integration | `npx vitest run src/features/redirects/__tests__/redirects.test.ts` | Wave 0 |
| LEAN-02 | `/projects` redirects (not `/projects/:id`) | integration | same file | Wave 0 |
| LEAN-03 | `/wishes` redirects to `/pm/wishes` | integration | same file | Wave 0 |
| LEAN-04 | `/input` shows empty-state, not duplicate list | unit | `npx vitest run src/app/(app)/input/__tests__/input-page.test.tsx` | Wave 0 |
| LEAN-05 | Migration strips dead widget IDs from JSONB | unit | `npx vitest run drizzle/__tests__/lean-trim-migration.test.ts` | Wave 0 |
| LEAN-06 | Dead widget imports removed from `widgets/index.ts` | unit | `npx vitest run src/features/dashboard/__tests__/widget-cleanup.test.ts` | Wave 0 |
| LEAN-07 | PL layouts lack `kpi-cards`, `capacity-forecast`, `availability-finder` | unit | `npx vitest run src/features/dashboard/__tests__/default-layouts.test.ts` | Wave 0 |
| LEAN-08 | Manager layouts lack `utilization-heat-map`, have `heat-map-summary-card` | unit | same file | Wave 0 |
| LEAN-09 | Unknown widget ID renders placeholder, not null | unit | `npx vitest run src/features/dashboard/__tests__/widget-fallback.test.ts` | Wave 0 |
| LEAN-10 | PDF output does not regress after layout trim | integration | `npx vitest run src/features/dashboard/pdf-export/__tests__/team-heatmap-regression.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npx playwright test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/features/dashboard/__tests__/default-layouts.test.ts` -- covers LEAN-07, LEAN-08
- [ ] `src/features/dashboard/__tests__/widget-fallback.test.ts` -- covers LEAN-09
- [ ] `src/features/dashboard/pdf-export/__tests__/team-heatmap-regression.test.ts` -- covers LEAN-10

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A -- no auth changes |
| V3 Session Management | no | N/A |
| V4 Access Control | no | Redirects do not bypass existing Clerk auth |
| V5 Input Validation | yes | Migration SQL uses parameterized widget ID list (hardcoded, not user input) |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via wildcard | Spoofing | `/team/:path*` redirects only to `/admin/people/:path*` -- destination is hardcoded, not user-controlled [VERIFIED: Next.js redirects API] |
| SQL injection in migration | Tampering | Widget IDs are hardcoded string literals in the SQL, not user input [VERIFIED: migration SQL in CONTEXT.md] |

## Files to Delete (confirmed exist)

| File | Type | Dependency Check |
|------|------|-----------------|
| `src/features/dashboard/widgets/discipline-progress-widget.tsx` | Dead widget | 0 layout placements [VERIFIED: WIDGET-INVENTORY.md] |
| `src/features/dashboard/widgets/discipline-demand-widget.tsx` | Dead widget | 0 layout placements [VERIFIED: WIDGET-INVENTORY.md] |
| `src/features/dashboard/widgets/project-impact-widget.tsx` | Dead widget | 0 layout placements [VERIFIED: WIDGET-INVENTORY.md] |
| `src/components/charts/discipline-progress.tsx` | Chart component | Only imported by dead widget above [VERIFIED: Glob] |
| `src/components/charts/project-impact.tsx` | Chart component | Only imported by dead widget above [VERIFIED: Glob] |
| `src/app/(app)/team/page.tsx` | Duplicate route page | Redirected by LEAN-01 [VERIFIED: source code] |
| `src/app/(app)/projects/page.tsx` | Duplicate route page | Redirected by LEAN-02 (but `/projects/[projectId]` stays) [VERIFIED: source code] |
| `src/app/(app)/wishes/page.tsx` | Duplicate route page | Redirected by LEAN-03 [VERIFIED: source code] |

**Per D-07:** Physical deletion of dead widget files deferred until flag confirmed stable. Page files also kept until flag is stable. During flag-ON, imports are removed from `widgets/index.ts` (widget de-registration) and pages are shadowed by the redirect config.

## Files to Modify (confirmed)

| File | Change | Req |
|------|--------|-----|
| `next.config.ts` | Add `redirects()` function | LEAN-01..03 |
| `src/features/flags/flag.types.ts` | Add `uiV6LeanTrim` to FLAG_NAMES, FeatureFlags | All |
| `src/features/flags/flag.service.ts` | Add `uiV6LeanTrim: false` to DEFAULT_FLAGS | All |
| `src/features/dashboard/widgets/index.ts` | Remove 3 dead widget imports (flag-gated) | LEAN-06 |
| `src/features/dashboard/default-layouts.ts` | Trim PL layouts (LEAN-07), trim manager layouts (LEAN-08), add summary-card | LEAN-07..08 |
| `src/features/dashboard/dashboard-layout-engine.tsx` | Render placeholder for unknown widget IDs | LEAN-09 |
| `src/features/dashboard/pdf-export/export-pdf-modal.tsx` | Handle unknown widget IDs gracefully | LEAN-09 |
| `src/app/(app)/input/page.tsx` | Replace flat list with empty-state prompt | LEAN-04 |
| `src/app/(app)/projects/[projectId]/page.tsx` | Fix `href="/projects"` -> `href="/admin/projects"` at line 167 | LEAN-02 |

## Files to Create

| File | Purpose | Req |
|------|---------|-----|
| `src/features/dashboard/widgets/heat-map-summary-card-widget.tsx` | New widget: summary CTA replacing full `utilization-heat-map` | LEAN-08 |
| `drizzle/migrations/0009_lean_trim_dead_widgets.sql` | One-shot migration stripping dead widget IDs from dashboard_layouts | LEAN-05 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Migration file should be numbered `0009_` (next after `0008_change_log_entity_program.sql`) | Files to Create | Wrong number causes migration ordering issues; verify at implementation time |
| A2 | The `heat-map-summary-card` widget ID does not collide with any existing widget | Files to Create | Would overwrite existing registration; confirmed no widget with this ID exists in `widgets/index.ts` [VERIFIED] |
| A3 | The redirect config in `next.config.ts` is evaluated at startup, not dynamically | Pitfall 3 | If Next.js 15 changed this behavior, flag-gating redirects might be possible; but this is standard Next.js behavior [ASSUMED] |
| A4 | `@react-pdf/renderer` `renderToStream` produces deterministic output for same input data | Validation Architecture | If non-deterministic, PDF regression test must use structural comparison (element count, approximate byte size) rather than byte-exact comparison |

## Open Questions

1. **Production `dashboard_layouts` row count**
   - What we know: Dev Neon branch has 1 affected row (VERIFY-05)
   - What's unclear: Production may have more or fewer affected rows
   - Recommendation: Re-run VERIFY-05 SQL on production at phase kick-off (per CONTEXT.md D-02)

2. **Summary-card widget: new file vs inline**
   - What we know: D-04 specifies replacing `utilization-heat-map` with a summary-card CTA
   - What's unclear: Whether to create a full widget file or inline the component
   - Recommendation: Create a new widget file (`heat-map-summary-card-widget.tsx`) following the existing widget pattern for consistency. This keeps the registry clean and the widget reusable.

3. **Flag-gating the Next.js redirects**
   - What we know: `redirects()` runs at build/startup time, not per-request
   - What's unclear: Whether there's a clean way to conditionally include redirects
   - Recommendation: Accept redirects are always-on once deployed. The old page files stay on disk as the rollback mechanism (revert the config change to restore old routes). This is acceptable because the old pages are duplicates -- they never had unique content.

## Sources

### Primary (HIGH confidence)
- `src/features/dashboard/widget-registry.ts` -- Map-based singleton, `getWidget()` returns `undefined` for unknown IDs
- `src/features/dashboard/widgets/index.ts` -- 20 side-effect imports, 3 dead widgets confirmed
- `src/features/dashboard/default-layouts.ts` -- 4 layout arrays with exact widget placements
- `src/features/flags/flag.types.ts` -- `uiV6Landing` flag pattern confirmed
- `src/features/dashboard/dashboard-layout-engine.tsx` -- 4 `getWidget()` call sites, line 253 is primary render site
- `next.config.ts` -- Currently empty config, `withNextIntl` wrapper
- `.planning/ui-reviews/WIDGET-INVENTORY.md` -- Full widget audit
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` -- Wave 2 specifications
- `.planning/pre-flight-report.md` -- VERIFY-05 confirmed 1 affected row

### Secondary (MEDIUM confidence)
- Next.js `redirects()` API behavior (permanent: true = 308) [ASSUMED based on training data, standard Next.js behavior]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all existing libraries, no new deps
- Architecture: HIGH -- all source files read and verified
- Pitfalls: HIGH -- based on verified code paths and documented decisions
- Validation: MEDIUM -- PDF regression test approach needs validation at implementation time

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable domain, no fast-moving dependencies)
