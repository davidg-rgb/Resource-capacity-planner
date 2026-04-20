# Phase 51: Lean cleanup — duplicate removal - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate every duplicate surface and dead widget identified in `WIDGET-INVENTORY.md` without regressing any verified journey or PDF export. Everything gated behind `uiV6.leanTrim`.

**In scope:**
- 308 redirects for `/team → /admin/people`, `/projects → /admin/projects`, `/wishes → /pm/wishes` (LEAN-01..03)
- Delete source pages for redirected routes
- Remove `/input` right-side duplicate flat people list (LEAN-04)
- One-shot `dashboard_layouts` migration to strip dead widget IDs before file deletion (LEAN-05)
- Delete 3 dead widget files: `discipline-progress`, `discipline-demand`, `project-impact` (LEAN-06)
- Strip duplicate widgets from project-leader layouts: `kpi-cards`, `capacity-forecast`, `availability-finder` (LEAN-07)
- Strip full `utilization-heat-map` from manager layouts; replace with summary-card CTA (LEAN-08)
- Defensive `widget-registry` fallback for unknown widget IDs (LEAN-09)
- PDF snapshot regression test for `/api/reports/team-heatmap` (LEAN-10)

**Out of scope (scope guard):**
- Per-journey friction fixes (Phase 52)
- Chrome polish, notification bell, `visibleFor` filtering (Phase 53)
- Dashboard quadrant redesign (Phase 54)
- Merging `discipline-chart` + `discipline-distribution` (Phase 53, POLISH wave)
- Deleting `bench-report`, `strategic-alerts`, `resource-conflicts` widgets (Phase 53 scope — these have active layout placements unlike the 3 dead widgets)

</domain>

<decisions>
## Implementation Decisions

### D-01 — Redirect mechanism (LEAN-01..03)
**`next.config.ts` `redirects()` with `permanent: true` (308).** Three redirect rules:
- `/team` → `/admin/people` (with `/team/:path*` wildcard)
- `/projects` → `/admin/projects` (but NOT `/projects/:projectId` — detail page stays)
- `/wishes` → `/pm/wishes`

Query strings are preserved by 308 redirects (e.g., `/pm/wishes?tab=rejected` works through the redirect). Also fix hard-coded `<Link href="/projects">` in `projects/[projectId]/page.tsx` to `/admin/projects`.

**Why:** UI-RESTRUCTURE-PLAN-v2.md §2.1-2.3 specifies server-side 308 redirects for external bookmarks. Client-side redirects alone wouldn't cover direct URL entry or external links.

### D-02 — Widget deletion sequencing (LEAN-05, LEAN-06)
**Migration-first approach.** Sequence:
1. Re-run VERIFY-05 SQL on production Neon branch to get authoritative affected row count
2. Ship one-shot `UPDATE dashboard_layouts` migration stripping dead widget IDs from `layout` jsonb
3. Only then delete the 3 dead widget files and clean `widgets/index.ts`

The 3 dead widgets (`discipline-progress`, `discipline-demand`, `project-impact`) have 0 default layout placements but VERIFY-05 found 1 affected custom `dashboard_layouts` row on dev. The authoritative production count must be verified at kick-off.

**Migration SQL** (from UI-RESTRUCTURE-PLAN-v2.md §2.5):
```sql
UPDATE dashboard_layouts
SET layout = (
  SELECT jsonb_agg(placement)
  FROM jsonb_array_elements(layout) placement
  WHERE placement->>'widgetId' NOT IN ('discipline-progress','discipline-demand','project-impact')
)
WHERE layout::text ~* 'discipline-progress|discipline-demand|project-impact';
```

### D-03 — `/input` duplicate removal (LEAN-04)
**Delete the right-side flat people list from `/input` page.** Keep only the left sidebar picker as the sole navigation to `/input/[personId]`. The main content area shows the empty-state prompt or the planning grid when a person is selected.

**Why:** WIDGET-INVENTORY §3 item #8 — same 19 people rendered twice on the same page, both linking to the same destination.

### D-04 — Layout trimming (LEAN-07, LEAN-08)
**Project-leader layouts:** Remove `kpi-cards`, `capacity-forecast`, `availability-finder` from both `project-leader:desktop` and `project-leader:mobile` in `default-layouts.ts`. These are byte-for-byte duplicates of the manager dashboard.

**Manager layouts:** Remove the full `utilization-heat-map` widget from `manager:desktop` and `manager:mobile`. Replace with a summary-card widget that shows a one-line status (e.g., "3 avdelningar i rött") + CTA linking to `/dashboard/team`.

Layout changes apply to `default-layouts.ts` (tier 4 fallback). Tenant/personal custom layouts are handled by D-02's migration.

### D-05 — Defensive widget-registry fallback (LEAN-09)
**`widget-registry.ts` returns a "Widget ej tillgänglig" placeholder card for unknown widget IDs** instead of throwing. The placeholder shows the widget ID for debugging purposes. This ensures any pre-migration tenant layouts degrade gracefully if they reference deleted widgets.

### D-06 — PDF regression (LEAN-10)
**Snapshot-compare `/api/reports/team-heatmap` PDF output before and after the layout trim.** Capture baseline PDF before any layout changes, then compare after all changes are applied. Regression test committed to the test suite.

### D-07 — Feature flag rollback (all LEAN-* requirements)
**Single `uiV6.leanTrim` flag gates all Phase 51 changes.** Rollback strategy:
- Redirects in `next.config.ts`: conditionally included based on flag (or reverted by removing the redirect rules)
- Layout changes in `default-layouts.ts`: flag-gated — when OFF, original layouts are preserved
- Physical file deletion of dead widget source files: deferred until flag is confirmed stable in production. Until then, files stay on disk but are de-registered from `widgets/index.ts` when flag is ON
- The defensive fallback (D-05) is always-on — it's a safety net regardless of flag state

**Why:** Per UI-RESTRUCTURE-PLAN-v2.md §4 kill-switch: "deleted pages restore via retained code paths until Wave ends; Wave 2 files physically deleted only at the end of rollout, not at flag-ON."

### Claude's Discretion
- Implementation order of tasks within the phase (migration first is locked, but ordering of redirects vs layout trim vs input cleanup is flexible)
- Whether the summary-card widget replacing `utilization-heat-map` is a new widget file or inlined
- Test file organization and naming
- Whether to add the `uiV6.leanTrim` flag to `FLAG_ROUTE_MAP` (likely not needed since routes are redirected, not gated)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Widget Inventory & Lean Plan
- `.planning/ui-reviews/WIDGET-INVENTORY.md` — Widget usage matrix, duplicate severity rankings, lean consolidation plan
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §2 (Wave 2) — Redirect code, migration SQL, PDF regression spec, defensive fallback spec
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §4 — Feature flag definitions and rollback protocol
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §5 — Final dashboard layout placements (manager + project-leader)

### Pre-flight Verification
- `.planning/pre-flight-report.md` §VERIFY-05 — Custom-dashboard audit SQL, 1 affected row on dev branch, migration-before-delete mandate

### Existing Code (widget system)
- `src/features/dashboard/widget-registry.ts` — Map-based singleton with `registerWidget()`, `getWidget()`
- `src/features/dashboard/widgets/index.ts` — Central side-effect imports for all 20 widget modules
- `src/features/dashboard/default-layouts.ts` — 4 layout definitions (manager/PL × desktop/mobile)
- `src/features/dashboard/widget-registry.types.ts` — `WidgetDefinition`, `WidgetPlacement` types

### Dead widget files (to be deleted)
- `src/features/dashboard/widgets/discipline-progress-widget.tsx`
- `src/features/dashboard/widgets/discipline-demand-widget.tsx`
- `src/features/dashboard/widgets/project-impact-widget.tsx`
- `src/components/charts/discipline-progress.tsx` (chart component)
- `src/components/charts/project-impact.tsx` (chart component)

### Redirect targets (pages to delete after redirect is in place)
- `src/app/(app)/team/page.tsx` — People CRUD (duplicate of `/admin/people`)
- `src/app/(app)/projects/page.tsx` — Projects CRUD (duplicate of `/admin/projects`)
- `src/app/(app)/wishes/page.tsx` — My Wishes (duplicate of `/pm/wishes`)

### Input page (duplicate list removal)
- `src/app/(app)/input/page.tsx` — Contains the dual people-list layout
- `src/app/(app)/input/layout.tsx` — Shared layout wrapper

### Feature flags
- `src/features/flags/flag.types.ts` — Current flag definitions (needs `uiV6LeanTrim` added)
- `src/features/flags/flag.service.ts` — Flag fetching and route gating

### PDF export
- `src/app/api/reports/team-heatmap/route.tsx` — PDF generation endpoint

### Config
- `next.config.ts` — Currently has no redirects; needs `redirects()` function added

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `widget-registry.ts` singleton pattern — `getWidget(id)` returns `WidgetDefinition | undefined`; the fallback (D-05) hooks into this
- `default-layouts.ts` layout structure — straightforward `WidgetPlacement[]` arrays, easy to trim
- `uiV6Landing` flag in `flag.types.ts` — pattern to follow for adding `uiV6LeanTrim`
- `@react-pdf/renderer` in team-heatmap route — existing PDF pipeline to snapshot-test

### Established Patterns
- Widget registration via side-effect imports in `widgets/index.ts` — de-registering means removing the import line
- Feature flags are org-scoped booleans fetched via `flag.service.ts` — new flags need to be added to `FLAG_NAMES` array and `FeatureFlags` interface
- `next.config.ts` uses `withNextIntl` wrapper — `redirects()` goes inside `nextConfig` object before the wrapper

### Integration Points
- `next.config.ts` — Add `redirects()` function to the config object
- `flag.types.ts` — Add `uiV6LeanTrim` to `FLAG_NAMES` and `FeatureFlags`
- `widgets/index.ts` — Remove 3 import lines for dead widgets (flag-gated)
- `default-layouts.ts` — Modify 4 layout arrays (flag-gated)
- `widget-registry.ts` — Add fallback rendering for unknown IDs
- `input/page.tsx` — Remove right-side flat list component

</code_context>

<specifics>
## Specific Ideas

- The VERIFY-05 production SQL must be re-run at Phase 51 kick-off to get authoritative row count (dev had 1 row for tenant `0b200821-c78c-4717-9099-696c8520d2d3`, manager dashboard)
- The summary-card replacing `utilization-heat-map` should show department health status with a CTA to `/dashboard/team` — exact copy follows from WIDGET-INVENTORY §3 item #4: "3 departments red → View heat map"
- Hard-coded `<Link href="/projects">` in `projects/[projectId]/page.tsx:167` needs updating to `/admin/projects`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 51-lean-cleanup-duplicate-removal*
*Context gathered: 2026-04-20*
