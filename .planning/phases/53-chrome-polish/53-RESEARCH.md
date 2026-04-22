# Phase 53: Chrome polish - Research

**Researched:** 2026-04-22
**Domain:** Persona-scoped chrome (top-nav `Bell`, `NavItemDef.visibleFor`), widget consolidation + deletion, and viewport sizing — all gated behind a single `uiV6.polish` feature flag, verified by Playwright viewport tests.
**Confidence:** HIGH

## Summary

Phase 53 is a **surgical chrome + widget cleanup** phase. It layers three near-orthogonal concerns — (1) persona-scoped notification bell, (2) `NavItemDef.visibleFor` top-nav filtering, (3) widget merge + deletion + layout re-slotting for the 1440×900 viewport budget — on top of the flag/persona/widget-registry infrastructure already shipped in Phases 50–52. Every primitive this phase needs already exists in the codebase: `useFlags()`, `usePersona()`, `useLmQueueCount()`, `usePmWishCounts()`, the `registerWidget()` singleton, `DEFAULT_LAYOUTS`/`LEGACY_LAYOUTS` dual-table rollback pattern in `default-layouts.ts`, the `widget-registry` defensive fallback (Phase 51 / LEAN-08 already shipped), the `ConflictError DEPENDENT_ROWS_EXIST` taxonomy, and the Phase 47 Playwright harness. What is **genuinely new**: a persona-scoped `NotificationBell` component (replacing the Bell-link-wrapped-in-AlertBadge in `top-nav.tsx:155-164`), a `visibleFor?: PersonaKind[]` addition to the `NavItemDef` interface at `top-nav.tsx:33-39`, a `useRdOvercommitCount()` data hook (does not exist — see Open Questions), a merged `discipline-breakdown-widget` with a bar/donut toggle, the migration of `resource-conflicts` into `/alerts` as a tabbed surface, and an inline `StrategicAlertsBanner` on the manager dashboard that replaces the full widget. The viewport constraint (1440×900 no scroll) is the **hardest** requirement — current manager `DEFAULT_LAYOUTS` has 9 widgets totaling an estimated ≥ 2200px of content height; removing `bench-report` + the widget consolidation alone will not close the gap without also re-slotting column spans from 12-wide to 6-wide rows.

A critical finding that sharpens the scope: `discipline-chart` (manager dashboard, `useDisciplineBreakdown`, horizontal bars, org-wide) and `discipline-distribution` (project-leader dashboard, `useProjectStaffing`, progress bars, per-project with `config.projectId`) **consume different data sources** (`/api/analytics/discipline-breakdown` vs `/api/project-staffing/:projectId`). The REQ POLISH-03 "merge into one widget with a chart-type toggle (bar/donut)" cannot be a byte-for-byte merge — it requires a new unified widget that accepts a `scope: 'org' | 'project'` prop (or reads `config.projectId`), delegates to the appropriate hook, and renders either a bar chart (existing `DisciplineChart`) or a donut chart (**does not exist — must be built or swapped from a recharts `<PieChart>`**). This is a planning decision: either (a) accept the REQ as "merge the two widgets into one that chooses bar vs donut by chart-type toggle, scope determined by config", or (b) reinterpret the REQ as "one widget ID, still two data paths, toggle just swaps the chart primitive". Recommendation: **(a)** — unify the widget, gate the data-source choice on the `config.projectId` presence (which is already how `discipline-distribution` works), and add a new `DisciplineDonut` chart component using `recharts` (already in use for `CapacityForecastChart`).

A second critical finding: **`NavItemDef` lives in `top-nav.tsx`**, not in `side-nav.tsx`. The `side-nav.tsx` has its own `NavItemDef` type (different shape — no `flag`, no persona awareness). Phase 50 restructured `side-nav.tsx` to be persona-scoped (per CONTEXT D-02), but Phase 53 POLISH-02 is scoped to `top-nav.tsx:33-39` **only**. The REQ's persona mapping (Staff → Home+Help only, PM → Home+Overview+Projekt, etc.) must be declared on each `NAV_ITEMS` entry as `visibleFor: ['pm','line-manager','rd','admin']` — and Staff's "Home + Help" seems inconsistent with current top-nav items ("Home" is not currently an item; the left Link to `/` is the logo). This needs a REQ-wording clarification vs. a literal interpretation (likely: Staff persona sees NO items in the top-nav — both Home and Help are served by the persona-switcher landing + user-menu help link). See Open Questions Q4.

**Primary recommendation:** Plan Phase 53 as four tight waves in this order: **(W0)** `uiV6.polish` flag addition + update of `sv.json`/`en.json` with new `v6.polish.*` i18n keys + Playwright viewport test scaffold (new `e2e/_viewport/` dir), **(W1)** POLISH-02 `visibleFor` filter + POLISH-01 `NotificationBell` (pure top-nav chrome; independent), **(W2)** POLISH-03 discipline widget merge (adds new widget, keeps old ones registered behind flag for rollback, removes old from `DEFAULT_LAYOUTS` only) + POLISH-04 `bench-report` deletion + POLISH-06 `StrategicAlertsBanner` (dashboard-layout surgery; serialized because all three touch `default-layouts.ts`), **(W3)** POLISH-05 `resource-conflicts` → `/alerts` tabbed surface + viewport gate Playwright spec (`1440×900` test asserts `document.documentElement.scrollHeight <= viewport.height`). Resolve the "merge discipline-chart + discipline-distribution" scope question (Q2) and the "Staff Home+Help" interpretation (Q4) in discuss-phase BEFORE W1 fires.

## User Constraints (from CONTEXT.md)

*No CONTEXT.md exists yet for Phase 53. The constraints below are transcribed from `.planning/REQUIREMENTS.md` §Chrome Polish (lines 76–85), `.planning/ROADMAP.md` §Phase 53 (lines 412–423), the `v6.0 Locked Decisions` block of `.planning/STATE.md`, and the Phase 52 `deferred → Phase 53` references. They will be supplemented by user discussion in `/gsd-discuss-phase 53`.*

### Locked Decisions (inherited from v6.0 milestone)

- **Feature-flag gating mandatory.** Phase 53 must ship behind a single `uiV6.polish` flag following the exact pattern used for `uiV6.landing` (Phase 50), `uiV6.leanTrim` (Phase 51), and `uiV6.perJourney` (Phase 52). Flag-off preserves Phase 52 behavior exactly (STATE.md v6.0 Locked Decisions §1).
- **Widget-registry defensive fallback already shipped** in Phase 51 LEAN-08 — "Widget ej tillgänglig" placeholder for unknown IDs. Phase 53 can safely remove widget files behind the flag without crashing prior custom dashboards.
- **`next.config.ts` `redirects()` is the chosen mechanism** for any route changes (CONTEXT D-01 of Phase 51), but Phase 53 does not ship route changes.
- **Personas are UX shortcuts, not security boundaries** (ADR-004). Staff hiding the bell is a UX choice; backend still returns data if queried.
- **i18n new keys land under `v6.polish.*` / `v5.*.*` namespaces** to avoid collision with existing `nav.*`, `sidebar.*`, `widgets.*` keys. sv.json + en.json parity enforced by `src/messages/__tests__/keys.test.ts`.
- **ISO 8601 + 53-week year** first-class for any date math (inherited from v5.0); 2026 is a 53-week year. No Phase 53 REQ requires date math directly, but viewport-height calculations must not regress `TimelineGrid` for 53-week year mode.

### Claude's Discretion

- Exact structure of the persona→notification-data-source mapping inside `NotificationBell` (switch on `persona.kind` calling the appropriate hook, vs. a strategy table).
- Whether `visibleFor` omits the property (= visible for all) or uses a sentinel (= visible for none).
- Whether the new discipline widget is a new ID (`discipline-breakdown`) or re-uses `discipline-chart` with an expanded scope. Recommendation: new ID, more explicit.
- Whether the new `DisciplineDonut` chart is a new component or extends `DisciplineChart` with a `variant: 'bar' | 'donut'` prop.
- Exact wording of new i18n keys (Swedish/English) — planner can choose from UI convention.
- Test file organization (Playwright viewport specs — new `e2e/_viewport/` dir vs. appending to existing journey specs).
- Whether the `/alerts` tab structure is a Next.js parallel-route `(alerts)` pattern, client-side `<Tabs>`, or a query-param `?tab=conflicts|warnings` approach. Recommendation: query-param for consistency with Phase 52 PM-02 `/pm/wishes?tab=rejected`.
- Whether the inline `StrategicAlertsBanner` fetches its own alert data or reuses `useAlerts()` already on the page.
- Implementation order within Phase 53 (4-wave structure is recommended; waves 1+2 can parallelize if planner prefers).

### Deferred Ideas (OUT OF SCOPE)

- **Dashboard quadrant redesign** — Phase 54 optional.
- **Counter-proposal flow UI** — still deferred from v5.0.
- **Email/Slack notification channel** — in-app only; notification bell is polling-only.
- **WebSocket push for real-time bell counts** — deferred; 60s polling matches Phase 52 `useLmQueueCount` pattern.
- **Mobile-first dashboard viewport** — Phase 53 success criterion is 1440×900 desktop only; mobile layouts (`manager:mobile`, `project-leader:mobile`) inherit the same widget deletions but are not gated on a separate viewport spec.
- **Replacing the `Bell` icon + `AlertBadge` usage outside the `/alerts` link** — capacity-alert counting stays on `useAlertCount`; persona-scoped bell is an additive layer, not a replacement for the `/alerts` page itself.
- **Removing `capacity-alerts` from `/alerts` page** — the standalone `/alerts` page remains. POLISH-05 moves the **`resource-conflicts` widget** to a tab on that page (not a new route).
- **Deleting discipline-chart or discipline-distribution file immediately** — Phase 51 pattern: keep legacy widget registered behind flag-off, physically delete only post-stable-rollout.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POLISH-01 | Persona-scoped notification bell (PM: rejected wishes; LM: pending approvals; R&D: new overcommits; Staff: hidden) | Data hooks exist: `usePmWishCounts` for PM rejected count, `useLmQueueCount` for LM pending-approval count, `useAlertCount` for admin/general. R&D overcommit count **has no hook today** — `/api/v5/capacity/breakdown` exists (accepts `scope='department'|'person'|'project'` + `scopeId` + `monthKey`, returns `{ projects, people }`), but a **summary count endpoint** is missing. See Open Questions Q1. |
| POLISH-02 | `NavItemDef.visibleFor` top-nav filtering — Staff sees only Home+Help, PM sees Home+Overview+Projekt, etc. | `NavItemDef` at `src/components/layout/top-nav.tsx:33-39`; current filter is `NAV_ITEMS.filter((item) => !item.flag \|\| flags[item.flag])` at line 91. Addition: `&& (!item.visibleFor \|\| item.visibleFor.includes(persona.kind))`. Persona read via `usePersona()` from `@/features/personas/persona.context`. **"Home" and "Help" are NOT current top-nav items** — see Open Questions Q4. |
| POLISH-03 | Merge `discipline-chart` + `discipline-distribution` into one widget with chart-type toggle; delete duplicate file | **Not a merge of identical widgets** — they consume different data sources (`useDisciplineBreakdown` for org-wide vs `useProjectStaffing` for per-project). New `discipline-breakdown-widget` with `scope: 'org' \| 'project'` inferred from `config.projectId` presence + `chartType: 'bar' \| 'donut'` toggle. `DisciplineDonut` chart **must be built** (or swapped from recharts `<PieChart>` since recharts is already used in `CapacityForecastChart`). |
| POLISH-04 | `bench-report` widget deleted — `availability-finder` covers the same data | `bench-report-widget.tsx` at 299 lines exists; placed in `manager:desktop` position 7. Delete file, remove registration from `widgets/index.ts:14`, strip from `DEFAULT_LAYOUTS['manager:desktop']:7` and preserve in `LEGACY_LAYOUTS` for rollback. `availability-finder` remains at position 8 (will slide to 7). Verify tenant custom `dashboard_layouts.layout` rows don't reference `bench-report` via Phase 51-style SQL audit. |
| POLISH-05 | `resource-conflicts` moved to `/alerts` as a tab; removed from all dashboard layouts | `resource-conflicts` widget (645 lines at `src/features/dashboard/widgets/resource-conflict-widget.tsx`) placed in `manager:mobile` position 4, `project-leader:desktop` position 5, `project-leader:mobile` position 2. Moving requires: (a) extract `<ResourceConflictContent>` into a route-agnostic component, (b) mount it under a tab on `src/app/(app)/alerts/page.tsx`, (c) strip from 3 layout entries in `default-layouts.ts`, (d) one-shot migration against `dashboard_layouts.layout` to remove `resource-conflicts` IDs (Phase 51 SQL pattern). |
| POLISH-06 | `strategic-alerts` widget replaced with inline banner linking to `/alerts`; removed from `manager:mobile` layout | `strategic-alerts-widget.tsx` (34 lines) wraps `<StrategicAlerts />` from `src/components/charts/strategic-alerts.tsx`. New `<StrategicAlertsBanner>` = inline component at the top of the manager dashboard (above `<DashboardGrid>`) rendering a single-line summary ("3 kritiska varningar — Se alla →") linking to `/alerts`. Remove from `DEFAULT_LAYOUTS['manager:mobile']:7`. `manager:desktop` legacy layout also has it at position 7 (LEGACY) — REQ wording says "remove from manager:mobile layout" so planner must verify whether desktop keeps or also drops. Recommendation: drop from both. |
| POLISH-07 | Manager + project-leader dashboards fit 1440×900 without scrolling | **Hardest REQ.** Current `DEFAULT_LAYOUTS['manager:desktop']` (post-Phase-51): 9 widgets totaling ~2200px tall (kpi-cards ~140px, heat-map-summary-card ~100px, capacity-gauges ~300px, department-bar-chart ~300px, utilization-sparklines ~300px, discipline-chart ~300px, capacity-forecast ~400px, bench-report ~400px, availability-finder ~400px). Even after removing `bench-report` (POLISH-04) and consolidating `discipline-chart` (POLISH-03), estimated ~1500px remain — still over budget. Gate: Playwright `page.setViewportSize({ width: 1440, height: 900 })` + assert `await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 8)`. |
| POLISH-FLAG | All chrome changes gated behind `uiV6.polish` flag | Add `'uiV6Polish'` to `FLAG_NAMES` in `flag.types.ts:1-10`, `FeatureFlags` interface line 13-22, `FLAG_ROUTE_MAP` line 24-33 (as `[]` — flag does not gate routes, only chrome behavior), `DEFAULT_FLAGS` in `flag.service.ts:10-19`, and `DEFAULT_FLAGS` in `flag.context.tsx:7-16`. |

<findings>

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` does not exist at the project root. No root-level coding-convention rules applied from CLAUDE.md. Project conventions are inherited from:

- `.planning/STATE.md` — v5.0 + v6.0 Locked Decisions
- Prior phase CONTEXT.md files (48–52)
- Existing codebase patterns (feature-flag shape, registerWidget singleton, i18n namespace discipline, Playwright harness)

## Standard Stack (VERIFIED — already in use)

All versions confirmed against `package.json` + pnpm lockfile.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.1 | App Router; `NotificationBell` is client component | Shipped; all pages use it `[VERIFIED: package.json]` |
| `react` | 19.2.4 | `useMemo` for visibleFor-filtered NAV_ITEMS | Shipped `[VERIFIED: package.json]` |
| `@tanstack/react-query` | ^5.95.2 | `useQuery` with `refetchInterval: 60_000` for persona-bell counts | Already used by `useLmQueueCount` / `usePmWishCounts` (Phase 52 D-06) `[VERIFIED: package.json]` |
| `next-intl` | ^4.8.3 | All user-facing strings — new keys go under `v6.polish.*` | Hard eslint rule; no literal JSX text allowed `[VERIFIED: package.json + src/messages/__tests__/keys.test.ts]` |
| `@clerk/nextjs` | ^7.0.7 | `useAuth()` for user-scoped hooks; tenant-scoping on queries | Already auth layer `[VERIFIED: package.json]` |
| `drizzle-orm` | ^0.45.1 | If R&D overcommit count endpoint is new (Q1 resolves YES), add a service fn with drizzle | Every `*.service.ts` uses it `[VERIFIED: package.json]` |
| `zod` | ^4.3.6 | Query param schema validation for any new route | Inherited convention `[VERIFIED: src/app/api/v5/proposals/queue/count/route.ts]` |
| `lucide-react` | ^1.7.0 | `Bell` icon for `NotificationBell` | Already imported in `top-nav.tsx:9` `[VERIFIED: top-nav.tsx]` |
| `recharts` | (version via package.json) | `DisciplineDonut` primitive if built with PieChart | Already used in `CapacityForecastChart`; no new dependency `[ASSUMED: recharts in package.json — planner should confirm]` |
| `@playwright/test` | ^1.59.1 | Viewport gate spec for POLISH-07 | Phase 47 harness `[VERIFIED: e2e/playwright.config.ts]` |
| `vitest` | ^2.1.9 | Unit tests for `visibleFor` filter + `NotificationBell` render logic | Shipped harness `[VERIFIED: package.json]` |

### No new dependencies required

All of Phase 53 is additive wiring, component composition, and layout edits against existing libraries. No `pnpm install` step needed. `[VERIFIED: review of package.json + inspection of existing primitives]`

## REQ-by-REQ technical approach (with file:line anchors)

### POLISH-01 — Persona-scoped notification bell

**Current state:**
- `src/components/layout/top-nav.tsx:155-164` renders a `<Link href="/alerts">` wrapping a `<Bell size={18}>` and `<AlertBadge />`. The badge reads `useAlertCount(monthFrom, monthTo)` (capacity alerts — overloaded/underutilized people). Shown unconditionally when `flags.alerts` is on.
- `src/components/alerts/alert-badge.tsx` is 24 lines — reads `useAlertCount`, returns `null` if count is 0.
- Persona data is available via `usePersona()` (`src/features/personas/persona.context.tsx:134`).
- Persona-scoped data hooks already exist: `usePmWishCounts(clerkUserId, enabled)` at `src/features/proposals/use-pm-wish-counts.ts`, `useLmQueueCount(departmentId, enabled)` at `src/features/proposals/use-lm-queue-count.ts`.

**Changes required:**
1. Create `src/components/persona/notification-bell.tsx` (new component, ~80 lines). Reads `usePersona()` + `useFlags()` + `useAuth()`. Based on `persona.kind`, selects the appropriate count hook:
   - `pm` → `usePmWishCounts` filtered to `rejected > 0` (clicking navigates to `/pm/wishes?tab=rejected`)
   - `line-manager` → `useLmQueueCount` filtered to `pending` count (clicking navigates to `/line-manager/approval-queue`)
   - `rd` → `useRdOvercommitCount()` — **does not exist** — see Open Questions Q1
   - `staff` → returns `null` (bell hidden)
   - `admin` → fall back to existing `useAlertCount` + link to `/alerts`
2. Replace the existing `<Link href="/alerts" aria-label={tc('capacityAlerts')}><Bell /><AlertBadge /></Link>` block at `top-nav.tsx:155-164` with a conditional render: when `flags.uiV6Polish` is ON, render `<NotificationBell />`; else render the existing bell unchanged.
3. Add `data-testid="notification-bell"` + persona-scoped aria-label (via `useTranslations('v6.polish.bell')`) with 4 new i18n keys:
   - `v6.polish.bell.pmRejectedLabel` (e.g., "Avvisade önskemål: {count}")
   - `v6.polish.bell.lmPendingLabel`
   - `v6.polish.bell.rdOvercommitsLabel`
   - `v6.polish.bell.adminAlertsLabel` (re-use existing `common.capacityAlerts` wording)

**Anti-patterns to avoid:**
- Do **NOT** call all 3–4 hooks unconditionally and then choose output — enable them via the `enabled` flag gated by `persona.kind`. TanStack Query has `enabled: false` for this exact pattern (already how `usePmWishCounts` works per its signature `usePmWishCounts(clerkUserId, enabled)`).

**Test plan:**
- Unit (Vitest RTL): Mount `<NotificationBell />` with each of 5 personas; assert correct hook is called (mock all 4 hooks) + correct aria-label + href.
- Playwright viewport spec (POLISH-07) implicitly asserts rendering on desktop.
- E2E persona spec: per-persona, seed a count > 0, navigate to persona landing, assert bell is visible with correct count AND clicking navigates to the mapped target.

### POLISH-02 — `NavItemDef.visibleFor` top-nav filtering

**Current state:**
- `src/components/layout/top-nav.tsx:33-39` defines:
  ```ts
  interface NavItemDef {
    labelKey: string;
    descKey: string;
    href: string;
    icon: LucideIcon;
    flag?: FlagName;
  }
  ```
- `NAV_ITEMS` array at line 41-83 lists 11 items: teamLoad, planHours, projects, overview, projectDashboard, scenarios, warnings, staff, export, admin, members.
- Filter at line 91: `NAV_ITEMS.filter((item) => !item.flag || flags[item.flag])`.
- `side-nav.tsx` has its own `NavItemDef` at line 7 — **DIFFERENT SHAPE** (no `flag`, no persona awareness). Phase 50 already restructured `SECTION_NAV` to be persona-scoped, but `side-nav.tsx` file still shows the OLD route-based `SECTION_NAV` structure (lines 22-73). This is suspicious — either Phase 50's persona-aware side-nav ships behind `uiV6Landing` via a parallel code path the grep did not surface, or the side-nav refactor was confined to a different file. **Planner must verify before touching side-nav**; Phase 53 POLISH-02 scope is explicitly `top-nav.tsx:32-38` per REQ wording.

**Changes required:**
1. Extend the `NavItemDef` interface at `top-nav.tsx:33-39` with:
   ```ts
   visibleFor?: PersonaKind[];  // undefined = visible for all personas
   ```
   Import: `import type { PersonaKind } from '@/features/personas/persona.types';`
2. Annotate each `NAV_ITEMS` entry with `visibleFor`. Locked mapping from REQ + ROADMAP §Phase 53 success-criterion 2:
   - **Staff:** Home + Help only (= NO items from NAV_ITEMS currently; see Q4)
   - **PM:** Home + Overview + Projekt (= `overview` + `projects` + possibly `projectDashboard`)
   - **Line Manager:** appropriate subset (REQ says "other personas get appropriate subsets" — planner must define)
   - **R&D Manager:** appropriate subset
   - **Admin:** full set (admin sees everything)
3. Import `usePersona` in `top-nav.tsx`, extend the filter at line 91:
   ```ts
   const { persona } = usePersona();
   const visibleItems = NAV_ITEMS.filter((item) =>
     (!item.flag || flags[item.flag]) &&
     (!item.visibleFor || item.visibleFor.includes(persona.kind))
   );
   ```
4. Gate the entire persona-aware filter behind `flags.uiV6Polish` — when flag is OFF, the legacy `flag`-only filter applies (flag-off parity preserved).

**Test plan:**
- Unit: mount `<TopNav>` with each of 5 personas × `uiV6Polish={true|false}`, assert correct items visible.
- Playwright per-persona landing: assert `getByRole('navigation')` contains only expected items.

### POLISH-03 — Merge `discipline-chart` + `discipline-distribution`

**Current state:**
- `src/features/dashboard/widgets/discipline-chart-widget.tsx` (66 lines): wraps `<DisciplineChart data>` from `@/components/charts/discipline-chart`; data source `useDisciplineBreakdown(timeRange.from, timeRange.to)` — **org-wide** aggregate; `supportedDashboards: ['manager']`.
- `src/features/dashboard/widgets/discipline-distribution-widget.tsx` (70 lines): wraps `<DisciplineDistribution people months>` from `@/components/project-view/discipline-distribution`; data source `useProjectStaffing(projectId, timeRange.from, timeRange.to)` — **per-project** aggregate; requires `config.projectId` (shows `selectProject` empty state otherwise); `supportedDashboards: ['project-leader', 'manager']`.
- Both placed in `DEFAULT_LAYOUTS` — `discipline-chart` at `manager:desktop:5` and `manager:mobile:6`; `discipline-distribution` at `project-leader:desktop:3` (was position 5 pre-Phase-51 trim).
- No donut chart primitive exists. `recharts` is already in use (`CapacityForecastChart` uses `AreaChart`).

**Changes required:**
1. Create `src/components/charts/discipline-donut.tsx` — `<DisciplineDonut data>` wrapping `recharts` `<PieChart><Pie innerRadius="50%" outerRadius="80%"/></PieChart>`.
2. Create `src/features/dashboard/widgets/discipline-breakdown-widget.tsx` — unified widget:
   - ID: `discipline-breakdown` (new) — keep `discipline-chart` and `discipline-distribution` IDs registered for 1 wave for safe rollback.
   - Scope inference: `const scope = config?.projectId ? 'project' : 'org';` — matches existing `discipline-distribution` contract.
   - Data: org scope calls `useDisciplineBreakdown`; project scope calls `useProjectStaffing(config.projectId)` and transforms its `{people, months}` into the `DisciplineBreakdownRow[]` shape that both charts can consume. **This normalization is the load-bearing work** — see Open Questions Q2.
   - Chart type: `const [chartType, setChartType] = useState<'bar'|'donut'>('bar');` with a `<button>` toggle group above the chart.
   - `supportedDashboards: ['manager', 'project-leader']`.
3. Update `DEFAULT_LAYOUTS`: replace `'discipline-chart'` at `manager:desktop:5` + `manager:mobile:6` with `'discipline-breakdown'`; replace `'discipline-distribution'` at `project-leader:desktop:3` with `'discipline-breakdown'`. Preserve `LEGACY_LAYOUTS` for rollback.
4. Remove `'./discipline-chart-widget'` + `'./discipline-distribution-widget'` from `src/features/dashboard/widgets/index.ts:9,20` — but **only after** confirming tenant custom `dashboard_layouts.layout` rows do not reference the old IDs (Phase 51 LEAN-11 pattern: one-shot SQL migration).
5. Physical deletion of the two old widget files deferred until post-rollout per Phase 51 D-07 pattern; in Phase 53 just de-register from `widgets/index.ts`.

**Migration SQL** (mirrors Phase 51 LEAN-11 pattern):
```sql
-- Re-point old widget IDs to the new unified widget
UPDATE dashboard_layouts
SET layout = (
  SELECT jsonb_agg(
    CASE
      WHEN placement->>'widgetId' IN ('discipline-chart','discipline-distribution')
        THEN jsonb_set(placement, '{widgetId}', '"discipline-breakdown"')
      ELSE placement
    END
  )
  FROM jsonb_array_elements(layout) placement
)
WHERE layout::text ~* 'discipline-chart|discipline-distribution';
```

**Test plan:**
- Unit: render `<DisciplineBreakdownWidget>` with `config.projectId` present/absent — assert correct hook is called, correct chart type.
- Vitest snapshot: bar vs donut rendering.
- Integration: manager dashboard renders bar by default; project-leader dashboard with a project selected renders bar by default; toggle flips to donut.

### POLISH-04 — Delete `bench-report`

**Current state:**
- `bench-report-widget.tsx` (299 lines) at `src/features/dashboard/widgets/bench-report-widget.tsx`.
- `supportedDashboards: ['manager']`; `requiredFeatureFlag: 'dashboards'`.
- Placed at `DEFAULT_LAYOUTS['manager:desktop']:7` and `LEGACY_LAYOUTS['manager:desktop']:7`.
- `availability-finder` (adjacent widget, position 8) provides the same "who is available" data with a different visualization.

**Changes required:**
1. De-register from `src/features/dashboard/widgets/index.ts:14` (remove the `import './bench-report-widget';` line — gated behind `uiV6Polish` somehow? See implementation note below).
2. Remove from `DEFAULT_LAYOUTS['manager:desktop']` — slide `availability-finder` from position 8 → 7.
3. Preserve in `LEGACY_LAYOUTS['manager:desktop']:7` for rollback (no edit needed).
4. One-shot SQL migration to strip `bench-report` from any tenant custom `dashboard_layouts.layout` (Phase 51 LEAN-11 pattern):
   ```sql
   UPDATE dashboard_layouts
   SET layout = (
     SELECT jsonb_agg(placement)
     FROM jsonb_array_elements(layout) placement
     WHERE placement->>'widgetId' NOT IN ('bench-report')
   )
   WHERE layout::text ~* 'bench-report';
   ```
5. Delete `bench-report-widget.tsx` file + its test fixtures + the `useBenchReport` hook at `src/hooks/use-bench-report.ts` (**verify no other caller**) — deferred until post-rollout.

**Implementation note on "de-register behind a flag":** the `widgets/index.ts` file is a pure side-effect import module — it cannot read feature flags. The correct pattern (from Phase 51 CONTEXT D-07) is: **keep the import**, but gate the **layout placement** removal. When `uiV6Polish` is ON, `DEFAULT_LAYOUTS` excludes `bench-report`; when OFF, `LEGACY_LAYOUTS` (which still has it) is used. The `widget-registry.ts` fallback (Phase 51 LEAN-08) handles the cross-case.

### POLISH-05 — Move `resource-conflicts` to `/alerts` as a tab

**Current state:**
- `resource-conflict-widget.tsx` (645 lines) — substantial widget with its own redistribute modal, dismissed-conflicts localStorage, 3 mutations. ID `resource-conflicts`; `supportedDashboards: ['manager', 'project-leader']`.
- Placements: `manager:mobile:4`, `project-leader:desktop:5`, `project-leader:mobile:2` (per Phase 51 `DEFAULT_LAYOUTS`). Also `manager:desktop` in `LEGACY_LAYOUTS`.
- `src/app/(app)/alerts/page.tsx` is 42 lines, no tab structure — just renders `<AlertList alerts={data} />` from `useAlerts`.

**Changes required:**
1. **Extract the widget body** into a route-agnostic component — `src/components/alerts/resource-conflicts-panel.tsx` — sharing the same hooks + modal.
2. **Refactor `/alerts/page.tsx`** to a tabbed surface. Recommend query-param pattern (`?tab=conflicts|warnings`) mirroring Phase 52 PM-02 `/pm/wishes?tab=rejected`:
   - Default tab: `warnings` (current `<AlertList>` content — overloaded/underutilized people).
   - New tab: `conflicts` (new `<ResourceConflictsPanel>`).
   - Tab state via `useSearchParams()` + `router.replace()`; persists in URL for deep-link.
   - New i18n keys: `v6.polish.alerts.tabs.warnings`, `v6.polish.alerts.tabs.conflicts`.
3. **Refactor `resource-conflict-widget.tsx`** to a thin wrapper around the extracted panel (or de-register entirely when `uiV6Polish` is ON). Flag-off preserves the widget on dashboards.
4. **Strip from DEFAULT_LAYOUTS**: remove from `manager:mobile:4`, `project-leader:desktop:5`, `project-leader:mobile:2`.
5. **One-shot migration** to strip `resource-conflicts` from tenant custom layouts (Phase 51 SQL pattern).
6. **Keep `LEGACY_LAYOUTS` unchanged** for rollback.

**Test plan:**
- Playwright: navigate to `/alerts?tab=conflicts` — asserts `<ResourceConflictsPanel>` renders; navigate to `/alerts` — defaults to `warnings` tab.
- Unit: `<AlertsPage>` with each tab param → correct panel rendered.
- Unit: `<ResourceConflictsPanel>` preserves all redistribute modal + dismissed behavior from the widget version.

### POLISH-06 — Replace `strategic-alerts` with inline banner

**Current state:**
- `strategic-alerts-widget.tsx` (34 lines) thinly wraps `<StrategicAlerts />` from `src/components/charts/strategic-alerts.tsx` (exists, verified via `ls src/components/charts/`).
- Placed in `DEFAULT_LAYOUTS['manager:mobile']:7` and `LEGACY_LAYOUTS['manager:desktop']:?` (position not confirmed — planner must read; also appears in `LEGACY_LAYOUTS['manager:mobile']:7`).
- REQ POLISH-06 says "replace with an inline banner linking to `/alerts`; removed from `manager:mobile` layout". Wording is specific to `manager:mobile`.

**Changes required:**
1. Create `src/components/alerts/strategic-alerts-banner.tsx` — a one-line alert-summary banner with CTA to `/alerts?tab=warnings` (or `/alerts` if tabs not used). Data source: reuse `useAlerts(monthFrom, monthTo)` or a compact `useStrategicAlertsSummary()` — recommend the former to avoid a new endpoint.
2. Mount the banner in `src/app/(app)/dashboard/dashboard-content.tsx` ABOVE the `<DashboardGrid dashboardId="manager" />` — visible only when `flags.uiV6Polish` is ON and `alerts.length > 0`.
3. Strip `strategic-alerts` from `DEFAULT_LAYOUTS['manager:mobile']:7` (only mobile per REQ).
4. Keep in `LEGACY_LAYOUTS['manager:mobile']:7` for rollback.
5. Physical widget file deletion + `widgets/index.ts` de-registration deferred until post-rollout.

**Test plan:**
- Unit: `<StrategicAlertsBanner>` with empty alerts → renders nothing; with 3 alerts → renders banner + CTA.
- Playwright: manager dashboard at mobile viewport — banner visible above grid; `strategic-alerts` widget not in grid.

### POLISH-07 — Manager + project-leader dashboards fit 1440×900

**Current state (post-Phase-51 trim):**
- `DEFAULT_LAYOUTS['manager:desktop']` (9 widgets): `kpi-cards` (~140px) + `heat-map-summary-card` (~100px) + `capacity-gauges` (6-wide, row height ~300px) + `department-bar-chart` (6-wide, same row) + `utilization-sparklines` (6-wide, ~300px) + `discipline-chart` (6-wide, same row) + `capacity-forecast` (12-wide, ~400px) + `bench-report` (12-wide, ~400px) + `availability-finder` (12-wide, ~400px). Total stack: 140 + 100 + 300 + 300 + 400 + 400 + 400 ≈ **~2040px** vertical content (ignoring gaps). Header + `Breadcrumbs` + h1 + mt-6 ≈ ~180px. Total page height ≈ **~2220px** ≫ 900px.
- `DEFAULT_LAYOUTS['project-leader:desktop']` (7 widgets post-Phase-51): `capacity-distribution` (12-wide ~300px) + `availability-timeline` (12-wide ~350px) + `allocation-trends`+`discipline-distribution` (6-wide row ~300px) + `program-rollup` (12-wide ~300px) + `resource-conflicts` (12-wide ~400px) + `period-comparison` (12-wide ~300px). ≈ **~1950px**.

**Changes required:**
Removal of `bench-report` (POLISH-04) + `resource-conflicts` (POLISH-05) + merging `discipline-chart` into `discipline-breakdown` does NOT achieve 900px budget. The planner must make **aggressive scope-and-layout decisions**:

Options (planner chooses in discuss-phase):
1. **Re-slot 12-wide widgets to 6-wide** to stack side-by-side: e.g., `capacity-forecast` + `availability-finder` in one row → saves ~400px.
2. **Hide secondary widgets "below the fold" intentionally**: reinterpret "fit without scroll" as "primary 4 widgets visible; widgets 5+ require scroll". **This contradicts REQ wording** — planner should flag to user.
3. **Collapse all 6-wide widgets into 4-wide (3-across rows)**: saves ~20% per row.
4. **Defer non-critical widgets to a "more" disclosure** via `<details>` or a secondary tab.
5. **Reduce widget internal heights** via design-system pass (scrollable internal content, terser headers).

**Locked technical approach:**
- Playwright viewport gate in new `e2e/_viewport/manager-dashboard-1440x900.spec.ts` + `e2e/_viewport/project-leader-dashboard-1440x900.spec.ts`:
  ```ts
  test('manager dashboard fits 1440x900', async ({ page, context }) => {
    await context.addCookies([{ name: 'ui_flag_polish', value: 'on', url: 'http://localhost:3000' }]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await personaAs(page, 'admin');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight + 8); // 8px slack for rounding
  });
  ```
- Flag-off parity: when `uiV6Polish=false`, viewport may overflow (legacy layouts preserved) — spec must skip or assert OPPOSITE behavior.

**Open question — REQ wording ambiguity:**
"Fit within 1440×900 without scrolling" — is the intent "no vertical scroll on the page" OR "viewport shows at least the primary widgets without scroll"? The latter interpretation aligns with Phase 54 (optional) quadrant redesign; the former is nearly impossible with the current widget inventory. **See Open Questions Q5.**

### POLISH-FLAG — `uiV6Polish` flag

**Changes required** (follow Phase 52 D-15 / Phase 51 CONTEXT D-07 pattern exactly):
1. `src/features/flags/flag.types.ts`:
   - Add `'uiV6Polish'` to `FLAG_NAMES` array (line 1-10).
   - Add `uiV6Polish: boolean` to `FeatureFlags` interface (line 13-22).
   - Add `uiV6Polish: []` to `FLAG_ROUTE_MAP` (line 24-33).
2. `src/features/flags/flag.service.ts`: Add `uiV6Polish: false` to `DEFAULT_FLAGS` (line 10-19).
3. `src/features/flags/flag.context.tsx`: Add `uiV6Polish: false` to `DEFAULT_FLAGS` (line 7-16).
4. Every POLISH-01..07 code path reads `useFlags().uiV6Polish` and falls through to legacy behavior when off.

## Architecture Patterns

### Recommended Project Structure for Phase 53

```
src/
├── components/
│   ├── alerts/
│   │   ├── alert-badge.tsx            (EXISTS — not touched)
│   │   ├── alert-list.tsx             (EXISTS — not touched)
│   │   ├── resource-conflicts-panel.tsx  (NEW — POLISH-05)
│   │   └── strategic-alerts-banner.tsx   (NEW — POLISH-06)
│   ├── charts/
│   │   ├── discipline-chart.tsx       (EXISTS — reused as bar variant)
│   │   └── discipline-donut.tsx       (NEW — POLISH-03 via recharts PieChart)
│   ├── layout/
│   │   └── top-nav.tsx                (EDIT — POLISH-02 visibleFor + POLISH-01 bell wiring)
│   └── persona/
│       └── notification-bell.tsx      (NEW — POLISH-01)
├── features/
│   ├── dashboard/
│   │   ├── default-layouts.ts         (EDIT — POLISH-03/04/05/06 layout diff)
│   │   └── widgets/
│   │       ├── discipline-breakdown-widget.tsx  (NEW — POLISH-03)
│   │       └── index.ts               (EDIT — de-register 4 widgets behind flag semantics)
│   └── flags/
│       ├── flag.types.ts              (EDIT — add uiV6Polish)
│       ├── flag.service.ts            (EDIT — default false)
│       └── flag.context.tsx           (EDIT — default false)
├── app/(app)/
│   ├── alerts/
│   │   └── page.tsx                   (EDIT — tabbed surface, POLISH-05)
│   └── dashboard/
│       └── dashboard-content.tsx      (EDIT — mount StrategicAlertsBanner, POLISH-06)
├── messages/
│   ├── sv.json                        (EDIT — add v6.polish.* keys)
│   └── en.json                        (EDIT — parity)
└── db/
    └── migrations/                    (NEW — one-shot widget-ID re-point + strip)

e2e/
├── _viewport/                         (NEW — POLISH-07)
│   ├── manager-dashboard-1440x900.spec.ts
│   └── project-leader-dashboard-1440x900.spec.ts
└── _invariants/
    └── flag-off-parity.spec.ts        (EDIT — extend with uiV6Polish parity checks)
```

### Pattern 1: Persona-scoped data-hook selection

**What:** Conditional `useQuery` activation based on persona discriminator.
**When to use:** POLISH-01 `NotificationBell` data-source selection.
**Example** (from Phase 52 `pending-wish-chip.tsx:25-32` — verified pattern):
```tsx
// Source: src/components/persona/pending-wish-chip.tsx (Phase 52)
const { uiV6Polish } = useFlags();
const { persona } = usePersona();
const { userId } = useAuth();

const pmEnabled = uiV6Polish && persona.kind === 'pm' && !!userId;
const lmEnabled = uiV6Polish && persona.kind === 'line-manager';
// ...
const { data: pmCounts } = usePmWishCounts(userId ?? '', pmEnabled);
const { data: lmCount } = useLmQueueCount(persona.kind === 'line-manager' ? persona.departmentId : null, lmEnabled);
// React Query skips the fetch when enabled=false — zero request overhead.
```

### Pattern 2: Flag-gated layout-table swap (Phase 51 D-07 pattern)

**What:** Dual `DEFAULT_LAYOUTS` + `LEGACY_LAYOUTS` tables; `getDefaultLayout(id, device, useLegacy)` where `useLegacy = !flags.uiV6Polish`.
**When to use:** Every POLISH-03/04/05/06 layout diff.
**Example:**
```ts
// Source: src/features/dashboard/default-layouts.ts (Phase 51, verified)
export function getDefaultLayout(dashboardId: string, deviceClass: string, useLegacy?: boolean): WidgetPlacement[] {
  const key = `${dashboardId}:${deviceClass}`;
  const source = useLegacy ? LEGACY_LAYOUTS : DEFAULT_LAYOUTS;
  return source[key] ?? source['manager:desktop'];
}
```
Phase 53 extends `LEGACY_LAYOUTS` (already has pre-Phase-51 snapshots) with the **current post-Phase-51 state**, and `DEFAULT_LAYOUTS` becomes the post-Phase-53 trimmed state.

### Pattern 3: Query-param tab state

**What:** `useSearchParams() + router.replace()` for tab state; shareable deep-link URLs.
**When to use:** POLISH-05 `/alerts?tab=conflicts|warnings`.
**Example:** Phase 52 PM-02 `/pm/wishes?tab=rejected|proposed` (verified at `src/components/persona/pending-wish-chip.tsx:41`).

### Anti-Patterns to Avoid

- **Calling all persona-bell hooks unconditionally.** Uses `enabled: false` in TanStack Query instead.
- **Deleting widget files before de-registration rollout.** Phase 51 locked pattern: de-register from `widgets/index.ts` behind flag semantics first; physical deletion is post-rollout.
- **Editing `side-nav.tsx` in Phase 53.** POLISH-02 scope is explicitly `top-nav.tsx:32-38`. `side-nav` has its own persona handling (Phase 50).
- **Hard-coding tenant-migration SQL without re-running the VERIFY-05 audit query.** Phase 51 established that dev Neon had 1 affected row; production count may differ. Run the audit at Phase 53 kick-off.
- **Hand-rolling a viewport-overflow detector.** Use Playwright `page.evaluate(() => document.documentElement.scrollHeight)` — battle-tested.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pie/donut chart | Raw SVG `<path>` with trig | `recharts` `<PieChart><Pie innerRadius outerRadius>` | Already in project (`CapacityForecastChart`); handles edge cases (0 values, tooltip, legend, animation). `[VERIFIED: src/components/charts/capacity-forecast-chart.tsx]` |
| Tabbed page | `useState` + manual conditional render | `useSearchParams + router.replace` (query-param tab state) | Deep-linkable, refresh-proof, consistent with Phase 52 PM-02 pattern. |
| Persona-scoped query activation | `if (persona.kind === 'pm') { ... }` wrapping `useQuery` (conditional hooks — breaks rules of hooks) | TanStack Query `enabled: persona.kind === 'pm'` option | Library supports this exact use case; no hook-rule violations. |
| Viewport overflow detection | `window.addEventListener('resize', ...)` + custom logic | `page.setViewportSize` + `page.evaluate` in Playwright | Matches Phase 47 E2E patterns; no new primitive. |
| Feature-flag wiring | A new context provider | Extend existing `flag.types.ts` + `flag.service.ts` + `flag.context.tsx` trio | Pattern locked since Phase 11; repeated in Phases 50, 51, 52 without variance. |
| Tenant-layout migration | N+1 client-side fetch+update | One-shot SQL `UPDATE dashboard_layouts SET layout = jsonb_agg(...)` | Phase 51 LEAN-11 pattern; runs in one transaction. |
| `DependentRowsError` dependent-list rendering | New toast library | Existing `sonner` + Phase 52 ADMIN-01 `<DependentRowsToastContent>` | Already shipped — nothing in Phase 53 requires new error UI. |

**Key insight:** Phase 53 is almost entirely composition of existing primitives. The **only new primitive** is the donut chart (recharts wrapper, ~40 lines) and the `DisciplineBreakdownWidget` (normalization adapter over existing hooks).

## Common Pitfalls

### Pitfall 1: Widget deletion crashes unprotected custom layouts

**What goes wrong:** Tenant opens dashboard; their saved `dashboard_layouts.layout` still references `bench-report` or `strategic-alerts` — the widget ID resolver returns `undefined` — React crashes with "Cannot read properties of undefined (reading 'component')".
**Why it happens:** `widget-registry.getWidget(id)` returns `undefined` for removed IDs; if the consumer doesn't null-check, error cascades.
**How to avoid:** Phase 51 LEAN-08 already shipped a defensive "Widget ej tillgänglig" fallback — verify it still fires in Phase 53 integration tests. Additionally run the one-shot migration BEFORE removing from `DEFAULT_LAYOUTS`.
**Warning signs:** Console error in E2E; flag-off parity spec fails on tenant-custom layouts.

### Pitfall 2: `useSearchParams` in Server Components breaks build

**What goes wrong:** Adding `useSearchParams` to `src/app/(app)/alerts/page.tsx` without `'use client'` directive → Next.js 16 App Router build error.
**Why it happens:** `useSearchParams` is a client-only hook; `alerts/page.tsx` is currently a client component (`'use client'` at line 1), but planner must preserve this.
**How to avoid:** Keep `'use client'` at the top; tabs live in a client subtree. If a server wrapper is desired, extract tab logic into a child client component.
**Warning signs:** Build-time "useSearchParams cannot be used in Server Component" error.

### Pitfall 3: `visibleFor` array order mismatch breaks flag-off parity

**What goes wrong:** Adding `visibleFor: ['pm','admin']` to a nav item; when flag is OFF, the `visibleFor` property is ignored — but the compiler change (interface extension) is flag-independent, so T2'd to have TypeScript allow the extra field in `NAV_ITEMS`.
**Why it happens:** Optional field, but array ordering / absence must be consistent across flag states.
**How to avoid:** Treat `visibleFor` as additive-only — when flag is OFF, skip the `visibleFor` check in the filter (exactly the recommended filter predicate above). Unit test both flag states.
**Warning signs:** Staff persona sees items in flag-OFF mode (expected) but ALSO in flag-ON mode (bug).

### Pitfall 4: 1440×900 Playwright viewport spec flakes on font loading

**What goes wrong:** Viewport spec asserts `scrollHeight <= 900`; passes locally; flakes in CI because web fonts haven't loaded and text wraps differently.
**Why it happens:** Tailwind `font-body` / `font-headline` load via `next/font` — can delay layout stabilization.
**How to avoid:** Use `page.waitForLoadState('networkidle')` + `await document.fonts.ready` inside `page.evaluate`. Add 8px slack to the assertion threshold.
**Warning signs:** Intermittent CI failures on viewport specs; local passes.

### Pitfall 5: `discipline-distribution` normalization produces wrong totals

**What goes wrong:** New `discipline-breakdown-widget` in project-scope: attempts to normalize `{people, months}` from `useProjectStaffing` into the org-wide `DisciplineBreakdownRow[]` shape; mis-aggregates when a person has multiple disciplines or fractional hours.
**Why it happens:** The two data sources have different aggregation semantics (org-wide total hours per discipline vs per-project person-month allocations).
**How to avoid:** Snapshot the old `discipline-distribution` widget's rendered output on a fixture project; snapshot the new unified widget's rendered output for the same fixture; assert identical tabular values. If normalization can't be made equivalent, reinterpret POLISH-03 as "one widget ID, two code paths, chart-type toggle per code path".
**Warning signs:** Visual snapshot diff on project-leader dashboard post-merge.

### Pitfall 6: Bell persona change without re-render

**What goes wrong:** User switches persona via `PersonaSwitcher`; the `NotificationBell` count stays stale until page refresh.
**Why it happens:** TanStack Query cache is persona-agnostic by default; hooks keyed by `['lm-queue-count', deptId]` don't invalidate when persona switches.
**How to avoid:** Rely on `PersonaProvider.setPersona` which already invalidates `PERSONA_SCOPED_QUERY_KEYS` (verified `persona.context.tsx:25-32`). Confirm `pm-wish-counts` and `lm-queue-count` keys are in that list — `lm-queue-count` currently is NOT. **Add it.**
**Warning signs:** Manual persona toggle leaves old count visible.

### Pitfall 7: Donut chart with 0 data breaks recharts

**What goes wrong:** Empty discipline data → recharts `<Pie data={[]}>` → console warning or blank render.
**Why it happens:** recharts needs at least one data point.
**How to avoid:** Explicit empty-state rendering at the widget level (same `{t('empty')}` pattern used by both legacy widgets). Unit test zero-data case.
**Warning signs:** Console warning "The length of props.data should be greater than 0".

## Code Examples

### Persona-scoped bell with data-hook selection
```tsx
// Pattern verified from src/components/persona/pending-wish-chip.tsx (Phase 52)
'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';

import { useFlags } from '@/features/flags/flag.context';
import { usePersona } from '@/features/personas/persona.context';
import { usePmWishCounts } from '@/features/proposals/use-pm-wish-counts';
import { useLmQueueCount } from '@/features/proposals/use-lm-queue-count';
import { useAlertCount } from '@/hooks/use-alerts';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';

export function NotificationBell() {
  const { uiV6Polish, alerts: alertsFlag } = useFlags();
  const { persona } = usePersona();
  const { userId } = useAuth();
  const t = useTranslations('v6.polish.bell');

  const monthFrom = getCurrentMonth();
  const monthTo = generateMonthRange(monthFrom, 3).at(-1)!;

  const pmEnabled = uiV6Polish && persona.kind === 'pm' && !!userId;
  const lmEnabled = uiV6Polish && persona.kind === 'line-manager';
  const adminEnabled = uiV6Polish && (persona.kind === 'admin' || persona.kind === 'rd');

  const { data: pm } = usePmWishCounts(userId ?? '', pmEnabled);
  const { data: lm } = useLmQueueCount(persona.kind === 'line-manager' ? persona.departmentId : null, lmEnabled);
  const { data: alertCount } = useAlertCount(monthFrom, monthTo);

  if (!uiV6Polish) return null;                // legacy Bell renders in top-nav.tsx when OFF
  if (persona.kind === 'staff') return null;   // POLISH-01: Staff hides bell

  let count = 0;
  let href = '/alerts';
  let label = t('adminAlertsLabel', { count: 0 });

  if (persona.kind === 'pm') {
    count = pm?.rejected ?? 0;
    href = '/pm/wishes?tab=rejected';
    label = t('pmRejectedLabel', { count });
  } else if (persona.kind === 'line-manager') {
    count = lm?.count ?? 0;
    href = '/line-manager/approval-queue';
    label = t('lmPendingLabel', { count });
  } else if (persona.kind === 'rd') {
    // Q1 — awaiting data source; fall back to adminEnabled behavior for now
    count = alertCount ?? 0;
    href = '/alerts';
    label = t('rdOvercommitsLabel', { count });
  } else {
    count = alertCount ?? 0;
  }

  return (
    <Link href={href} aria-label={label} data-testid="notification-bell"
          className="text-on-surface-variant hover:bg-surface-container-low relative rounded-full p-2">
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
```

### `visibleFor` filter in top-nav
```tsx
// Source: extension of src/components/layout/top-nav.tsx:33-39, 91
import type { PersonaKind } from '@/features/personas/persona.types';
import { usePersona } from '@/features/personas/persona.context';

interface NavItemDef {
  labelKey: string;
  descKey: string;
  href: string;
  icon: LucideIcon;
  flag?: FlagName;
  visibleFor?: PersonaKind[];  // v6 Polish
}

// Inside TopNav():
const { persona } = usePersona();
const flags = useFlags();
const visibleItems = NAV_ITEMS.filter((item) => {
  if (item.flag && !flags[item.flag]) return false;
  // visibleFor only enforced when uiV6Polish is ON; flag-off parity preserved
  if (flags.uiV6Polish && item.visibleFor && !item.visibleFor.includes(persona.kind)) return false;
  return true;
});
```

### Playwright viewport gate
```ts
// e2e/_viewport/manager-dashboard-1440x900.spec.ts
import { test, expect, personaAs } from '../fixtures/test-base';

test.describe('POLISH-07 — manager dashboard viewport', () => {
  test('manager dashboard fits 1440x900 with uiV6Polish ON', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await personaAs(page, 'admin');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    const { scrollHeight, clientHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 8); // 8px slack
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bell link unconditional on `/alerts` | Persona-scoped `NotificationBell` with 3–4 data sources | Phase 53 | Staff stops seeing irrelevant counts; PM/LM see actionable signals. |
| Two `discipline-*` widgets with different data | One `discipline-breakdown` widget with scope inference + chart-type toggle | Phase 53 | Reduces dashboard clutter; unifies discipline UX. |
| `bench-report` widget separate from `availability-finder` | Single `availability-finder` surface | Phase 53 | Removes 400px of vertical space; REQ POLISH-04 says they cover same data. |
| `resource-conflicts` on dashboard | `resource-conflicts` on `/alerts?tab=conflicts` | Phase 53 | Moves operational-action data to its workflow-appropriate page. |
| `strategic-alerts` as full widget | Inline banner with CTA | Phase 53 | ~400px saved; still surfaces critical-alert signal. |
| Top-nav visible for all personas | `visibleFor` filtering | Phase 53 | Staff persona stops seeing Admin + Scenarios + Projects entries. |

**Deprecated/outdated:**
- `bench-report-widget.tsx` — file stays on disk behind flag-off; physical deletion post-rollout.
- `strategic-alerts-widget.tsx` — ditto.
- `discipline-chart-widget.tsx` + `discipline-distribution-widget.tsx` — ditto; re-pointed by one-shot migration.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `recharts` is already in `package.json` | Standard Stack, POLISH-03 | LOW — planner can confirm with `pnpm list recharts`. If absent, either install (5 KB gzipped) or use a Canvas primitive. |
| A2 | R&D overcommit count has no dedicated endpoint today | POLISH-01 / Pitfall 6 | MEDIUM — if an endpoint exists under `/api/v5/capacity/overcommits`, planner should wire it and skip building one. |
| A3 | Current `manager:desktop` layout produces ~2220px page height | POLISH-07 | MEDIUM — my estimate is based on reading widget source; actual measurement requires a browser. Recommend the planner run the Playwright spec in "diagnostic mode" at W0 to capture the real starting height before deciding re-slot strategy. |
| A4 | `side-nav.tsx`'s unchanged SECTION_NAV means Phase 50's persona-aware side-nav ships behind a flag in a parallel code path | Architecture Patterns | MEDIUM — if Phase 50 work is genuinely stalled, Phase 53 POLISH-02 (top-nav only) is still unblocked, but planner should verify before assuming side-nav is "done". |
| A5 | The `useLmQueueCount` query key is NOT in `PERSONA_SCOPED_QUERY_KEYS` | Pitfall 6 | LOW — fix is trivial (one-line addition to `persona.context.tsx:25-32`). |
| A6 | POLISH-06 should drop `strategic-alerts` from BOTH desktop and mobile (not just mobile per strict REQ reading) | POLISH-06 | MEDIUM — REQ says "removed from manager:mobile layout"; if user insists on mobile-only removal, banner only renders on mobile which is unusual UX. Planner must clarify in discuss-phase. |
| A7 | 1440×900 is a hard technical constraint, not a "most widgets visible" soft goal | POLISH-07 | HIGH — if the intent is soft, the spec can be lighter; if hard, aggressive re-slotting or dashboard-quadrant redesign (Phase 54) may be unavoidable. |
| A8 | Donut chart is acceptable for org-wide discipline data | POLISH-03 | LOW — donut is a known viz; user may prefer pie or stacked-bar. Planner confirms in discuss-phase. |
| A9 | "Home" and "Help" in REQ POLISH-02 refer to persona landing + a help link that does NOT currently exist in top-nav | POLISH-02 / Q4 | HIGH — if they refer to items not yet implemented, Phase 53 scope expands to add them. |
| A10 | Notification bell for admin persona falls through to capacity alert count (no persona-specific concept) | POLISH-01 | LOW — REQ only specifies PM/LM/R&D/Staff; admin behavior is undefined. |

## Open Questions

1. **Q1 — R&D overcommit count data source.**
   - **What we know:** `/api/v5/capacity/breakdown` exists (used by `OvercommitDialog` in Phase 52); returns `{ projects, people }`.
   - **What's unclear:** Is there a lightweight count endpoint for "number of new overcommits this month" scoped to R&D persona? If not, we'd call `/api/v5/capacity/breakdown` with `scope='department' | 'org-wide'` and sum. That's heavier than a dedicated `/count` endpoint.
   - **Recommendation:** Planner to add `/api/v5/capacity/overcommits/count?scope=rd` — service fn + unit test (mirrors Phase 52 LM-03 pattern). OR reuse existing `useAlertCount` scoped differently (cheaper but less precise). User confirms in discuss-phase.

2. **Q2 — `discipline-distribution` → `discipline-chart` data normalization.**
   - **What we know:** Two different data shapes: org-wide (hours per discipline) vs per-project (people × months × discipline hours).
   - **What's unclear:** Can they be unified behind one widget rendering the same chart? If the per-project version needs "people detail", a donut can't render that — we'd need to fall back to progress bars (current `DisciplineDistribution` component behavior).
   - **Recommendation:** Merge = **one widget ID, two code paths**. Chart-type toggle only applies in org scope. Project scope renders progress bars unconditionally (matches current `DisciplineDistribution` UX). User confirms.

3. **Q3 — Viewport test: real rendered height vs. hand-measured.**
   - **What we know:** My ~2200px estimate for `manager:desktop` is derived from source reading.
   - **What's unclear:** The actual browser-rendered height at 1440 width.
   - **Recommendation:** Planner runs a diagnostic Playwright spec (part of Wave 0) that measures `scrollHeight` on each dashboard with `uiV6Polish=OFF` and `uiV6Polish=ON` (midway through Phase 53) to gate whether the widget trim alone achieves 900px or additional re-slotting is needed.

4. **Q4 — "Staff sees only Home + Help" interpretation.**
   - **What we know:** No "Home" or "Help" item exists in current `top-nav.tsx` `NAV_ITEMS`. The logo text is a link to `/` and there's no Help link in top-nav (there IS one in `side-nav.tsx:154`).
   - **What's unclear:** Is the REQ's mental model "Staff persona sees only the logo (Home) + a Help affordance (to be added)" — i.e., ZERO items in the center nav?
   - **Recommendation:** Interpret as **Staff → empty `visibleFor` (no center-nav items)**; verify "Home" = logo link (unchanged) and "Help" = user-menu entry or new top-nav item. Confirm in discuss-phase.

5. **Q5 — POLISH-07 "fit 1440×900" hard or soft.**
   - **What we know:** REQ says "fit within 1440×900 viewport without scrolling, verified by Playwright viewport test".
   - **What's unclear:** Whether "fit" means zero scroll or "primary widgets visible above the fold".
   - **Recommendation:** Default to strict interpretation (zero scroll); if infeasible without drastic re-slotting, escalate to the Phase 54 quadrant redesign. User confirms priority.

6. **Q6 — Widget physical deletion in Phase 53 vs later.**
   - **What we know:** Phase 51 D-07 pattern is "de-register from `widgets/index.ts` behind flag semantics; physical deletion post-stable-rollout".
   - **What's unclear:** Whether Phase 53 closes with physical deletions or defers them (matching Phase 51 precedent).
   - **Recommendation:** Defer physical deletion to a post-v6.0 cleanup phase (same as Phase 51). Confirm.

7. **Q7 — `DisciplineBreakdownWidget` default chart type.**
   - **What we know:** REQ says "chart-type toggle (bar/donut)"; no default specified.
   - **What's unclear:** Which to default to.
   - **Recommendation:** Default `'bar'` for org scope (matches current `discipline-chart` behavior; no visual regression when migration runs). User confirms.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Everything | ✓ | v24.12.0 | — |
| pnpm | Install / test / build | ✓ | 10.33.0 | — |
| Next.js | App Router | ✓ | 16.2.1 | — |
| React | Components | ✓ | 19.2.4 | — |
| `@tanstack/react-query` | Data hooks | ✓ | ^5.95.2 | — |
| `@playwright/test` | Viewport specs | ✓ | ^1.59.1 | — |
| `recharts` | `DisciplineDonut` primitive | ✓ (assumed — used by `CapacityForecastChart`) | (in package.json) | Canvas-based donut or plain `<svg>` circular progress |
| `next-intl` | i18n | ✓ | ^4.8.3 | — |
| `sonner` | Toast (not used in Phase 53) | ✓ | ^2.0.7 | — |
| `drizzle-orm` | If Q1 resolves NEW endpoint | ✓ | ^0.45.1 | — |
| Supabase / Neon dev branch | Tenant custom-layout SQL audit + migration | ✓ (assumed — used in Phase 51) | — | If offline, defer migration to pre-deploy checklist |
| `@axe-core/playwright` | A11y zero-violation claim (Phase 52 precedent — **NOT installed**) | ✗ | — | Defer a11y gate to a post-phase or install as devDependency in W0 |

**Missing dependencies with no fallback:** None blocking.
**Missing dependencies with fallback:** `@axe-core/playwright` — Phase 52 research flagged it missing; if UI-RESTRUCTURE-PLAN §7 requires a11y gate per wave, planner must install it in W0.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.1.9 (unit + integration), Playwright ^1.59.1 (E2E + viewport) |
| Config file | `vitest.config.ts` (root), `e2e/playwright.config.ts` |
| Quick run command | `pnpm test` (Vitest; ~10s) or `pnpm test -- <path>` for single-file |
| Full suite command | `pnpm test && pnpm test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| POLISH-01 | `NotificationBell` renders per-persona count + link | unit (Vitest RTL) | `pnpm test -- src/components/persona/__tests__/notification-bell.test.tsx` | ❌ Wave 0 |
| POLISH-01 | Staff persona hides bell | unit | same file | ❌ Wave 0 |
| POLISH-01 | E2E: PM with rejected wish, bell shows count, click → `/pm/wishes?tab=rejected` | Playwright | `pnpm test:e2e -- e2e/pm/polish-bell.spec.ts` | ❌ Wave 1 |
| POLISH-02 | `visibleFor` filters NAV_ITEMS per persona | unit | `pnpm test -- src/components/layout/__tests__/top-nav.visibleFor.test.tsx` | ❌ Wave 0 |
| POLISH-02 | Flag-off preserves legacy filter | unit | same file | ❌ Wave 0 |
| POLISH-02 | E2E: Staff persona sees empty center-nav; PM sees Home+Overview+Projekt | Playwright | `pnpm test:e2e -- e2e/_invariants/persona-top-nav.spec.ts` | ❌ Wave 1 |
| POLISH-03 | `DisciplineBreakdownWidget` renders bar (default) | unit (Vitest snapshot) | `pnpm test -- src/features/dashboard/widgets/__tests__/discipline-breakdown-widget.test.tsx` | ❌ Wave 0 |
| POLISH-03 | Toggle flips to donut | unit | same file | ❌ Wave 0 |
| POLISH-03 | Project scope renders progress bars (equivalence with legacy `DisciplineDistribution`) | unit snapshot | same file | ❌ Wave 0 |
| POLISH-03 | SQL migration re-points old widget IDs | integration (PGlite) | `pnpm test -- src/db/migrations/__tests__/polish-discipline-rename.test.ts` | ❌ Wave 2 |
| POLISH-04 | `bench-report` absent from `DEFAULT_LAYOUTS['manager:desktop']` when `uiV6Polish=ON` | unit | `pnpm test -- src/features/dashboard/__tests__/default-layouts.test.ts` | ⚠️ exists; extend |
| POLISH-04 | Legacy layout unchanged | unit | same file | ⚠️ exists; extend |
| POLISH-04 | One-shot migration strips `bench-report` from tenant layouts | integration (PGlite) | `pnpm test -- src/db/migrations/__tests__/polish-strip-bench.test.ts` | ❌ Wave 2 |
| POLISH-05 | `/alerts?tab=conflicts` renders `<ResourceConflictsPanel>` | unit (Vitest RTL) | `pnpm test -- src/app/(app)/alerts/__tests__/tabs.test.tsx` | ❌ Wave 2 |
| POLISH-05 | `/alerts` defaults to `warnings` tab | unit | same file | ❌ Wave 2 |
| POLISH-05 | `<ResourceConflictsPanel>` preserves redistribute modal + dismissed state | unit | `pnpm test -- src/components/alerts/__tests__/resource-conflicts-panel.test.tsx` | ❌ Wave 2 |
| POLISH-05 | `resource-conflicts` stripped from 3 layouts | unit | extends `default-layouts.test.ts` | ⚠️ extend |
| POLISH-05 | E2E: navigate to `/alerts?tab=conflicts`, see overcommitted people | Playwright | `pnpm test:e2e -- e2e/alerts/polish-tabs.spec.ts` | ❌ Wave 3 |
| POLISH-06 | `<StrategicAlertsBanner>` renders when alerts > 0 | unit | `pnpm test -- src/components/alerts/__tests__/strategic-alerts-banner.test.tsx` | ❌ Wave 0 |
| POLISH-06 | Banner links to `/alerts` | unit | same file | ❌ Wave 0 |
| POLISH-06 | `strategic-alerts` stripped from `manager:mobile` | unit | extends `default-layouts.test.ts` | ⚠️ extend |
| POLISH-07 | Manager dashboard fits 1440×900 with `uiV6Polish=ON` | Playwright viewport | `pnpm test:e2e -- e2e/_viewport/manager-dashboard-1440x900.spec.ts` | ❌ Wave 3 |
| POLISH-07 | Project-leader dashboard fits 1440×900 with `uiV6Polish=ON` | Playwright viewport | `pnpm test:e2e -- e2e/_viewport/project-leader-dashboard-1440x900.spec.ts` | ❌ Wave 3 |
| POLISH-FLAG | `uiV6Polish` default false in service + context | unit | `pnpm test -- src/features/flags/__tests__/flag.service.test.ts` | ⚠️ extend |
| POLISH-FLAG | Flag-off parity: every POLISH-* behavior reverts | Playwright | extend `e2e/_invariants/flag-off-parity.spec.ts` | ⚠️ extend |
| POLISH-FLAG | i18n parity: every new `v6.polish.*` key in sv.json has EN counterpart | unit | `pnpm test -- src/messages/__tests__/keys.test.ts` | ⚠️ existing; will pass once keys added |

### Sampling Rate
- **Per task commit:** `pnpm test -- <specific-path>` on affected files (< 10s).
- **Per wave merge:** `pnpm test && pnpm test:e2e -- <wave-relevant specs>` (~2–5 min).
- **Phase gate:** Full `pnpm test && pnpm test:e2e` green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/components/persona/__tests__/notification-bell.test.tsx` — covers POLISH-01 unit tests (5 personas + flag-off)
- [ ] `src/components/layout/__tests__/top-nav.visibleFor.test.tsx` — covers POLISH-02 unit tests
- [ ] `src/features/dashboard/widgets/__tests__/discipline-breakdown-widget.test.tsx` — covers POLISH-03 unit + snapshot
- [ ] `src/components/alerts/__tests__/strategic-alerts-banner.test.tsx` — covers POLISH-06 unit
- [ ] Install `@axe-core/playwright` if a11y gate required (Phase 52 precedent): `pnpm add -D @axe-core/playwright`
- [ ] Extend `src/features/dashboard/__tests__/default-layouts.test.ts` with POLISH-04/05/06 assertions
- [ ] Extend `e2e/_invariants/flag-off-parity.spec.ts` with POLISH-* flag-off assertions
- [ ] Extend `src/features/flags/__tests__/flag.service.test.ts` with `uiV6Polish: false` default assertion
- [ ] Create `e2e/_viewport/` directory scaffold for POLISH-07 specs
- [ ] Add i18n keys `v6.polish.*` to both `src/messages/sv.json` and `src/messages/en.json`; `src/messages/keys.ts` catalog updated

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no (no new auth surface) | Clerk + `requireRole` (unchanged) |
| V3 Session Management | no | Clerk session (unchanged) |
| V4 Access Control | partial | Persona is UX shortcut (ADR-004); all data queries remain tenant-scoped via `withTenant()` + `requireRole`. `NotificationBell` must use `useAuth()` for PM clerkUserId (never trust client-side persona-inferred user identity). |
| V5 Input Validation | partial | Any new route (Q1 — R&D overcommit count) uses Zod query-param validation (pattern verified at `src/app/api/v5/proposals/queue/count/route.ts`). |
| V6 Cryptography | no | None |

### Known Threat Patterns for Next.js App Router + Clerk + Drizzle

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant leak via client-sourced persona | I (Information Disclosure) | Backend never trusts `persona.kind`; all `/api/v5/*` routes enforce tenant via `withTenant()`. |
| Server Component reading client-only hook (`useSearchParams`) | D (Denial — build failure) | Keep `'use client'` on pages using search params (POLISH-05). |
| Missing `requireRole` on new count endpoint | E (Elevation) | If Q1 resolves to build a new endpoint, mirror Phase 52 LM-03 exactly: `requireRole('planner')` + `withTenant()` + Zod `z.string().uuid()` on `?scopeId=`. |
| XSS via i18n interpolation | Tampering | `next-intl` escapes interpolated values by default; new `v6.polish.*` keys are safe. |
| JSONB tenant-layout migration runs cross-tenant | I | Migration scoped by `WHERE layout::text ~* '...'` filter is row-safe since `jsonb_agg` preserves per-row filter; still run via admin migration tooling, not in-app API. |

## Sources

### Primary (HIGH confidence)
- `.planning/REQUIREMENTS.md` §Chrome Polish lines 76–85 — REQ definitions
- `.planning/ROADMAP.md` §Phase 53 lines 412–423 — goals + success criteria
- `.planning/STATE.md` §v6.0 Locked Decisions — flag-gating mandate
- `.planning/phases/52-per-journey-friction-fixes/52-CONTEXT.md` — flag pattern D-15, Playwright patterns D-13/D-14, toast/dialog primitives
- `.planning/phases/51-lean-cleanup-duplicate-removal/51-CONTEXT.md` — widget deletion D-02 pattern, migration SQL, dual-layout rollback
- `.planning/phases/50-persona-aware-landing-navigation/50-CONTEXT.md` — persona awareness patterns, flag infra
- `src/components/layout/top-nav.tsx` — `NavItemDef` definition + NAV_ITEMS + filter call site
- `src/components/persona/pending-wish-chip.tsx` — verified pattern for persona-scoped client chrome
- `src/features/flags/{flag.types.ts, flag.service.ts, flag.context.tsx}` — flag-addition template
- `src/features/dashboard/default-layouts.ts` — DEFAULT_LAYOUTS + LEGACY_LAYOUTS + `getDefaultLayout(useLegacy)` rollback shape
- `src/features/dashboard/widgets/index.ts` — widget registration side-effects
- `src/features/dashboard/widgets/discipline-chart-widget.tsx` + `discipline-distribution-widget.tsx` — POLISH-03 merge candidates
- `src/features/dashboard/widgets/bench-report-widget.tsx` (299 LOC), `resource-conflict-widget.tsx` (645 LOC), `strategic-alerts-widget.tsx` (34 LOC) — POLISH-04/05/06 targets
- `src/db/schema.ts:443-470` — `dashboard_layouts` table shape
- `src/app/(app)/alerts/page.tsx` — tabbed-surface base (POLISH-05)
- `src/app/(app)/dashboard/{page.tsx, dashboard-content.tsx, projects/page.tsx}` — dashboard mount points
- `src/components/alerts/alert-badge.tsx` — current Bell overlay
- `src/features/personas/persona.{types,context,routes}.ts` — PersonaKind + usePersona + PERSONA_SCOPED_QUERY_KEYS
- `src/features/proposals/{use-pm-wish-counts.ts, use-lm-queue-count.ts}` — bell count hooks (Phase 52)
- `src/hooks/use-alerts.ts` — useAlerts + useAlertCount
- `e2e/playwright.config.ts` — test env vars, webServer config
- `e2e/pm/1a-monday-checkin.spec.ts` — Playwright journey pattern (pattern for viewport spec)
- `src/messages/__tests__/keys.test.ts` — i18n parity enforcement

### Secondary (MEDIUM confidence)
- `package.json` — via inspection: next 16.2.1, react 19.2.4, @tanstack/react-query ^5.95.2, @playwright/test ^1.59.1, vitest ^2.1.9, lucide-react ^1.7.0, next-intl ^4.8.3, drizzle-orm ^0.45.1, zod ^4.3.6, sonner ^2.0.7, @clerk/nextjs ^7.0.7 — versions locked by pnpm lockfile
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §Wave 4 — referenced for rollback + a11y policy (not read in full this pass; planner to consult if a11y gate is enforced)
- `.planning/ui-reviews/WIDGET-INVENTORY.md` — referenced but not re-read; source of widget duplication claims

### Tertiary (LOW confidence)
- Height estimates for individual widgets (`bench-report` ~400px etc.) are reading-based, not measurement-based. See Q3 / A3 — planner must measure with a diagnostic Playwright run.
- Assumption that recharts is in package.json (A1) — not directly verified; `CapacityForecastChart` uses charting imports that look like recharts but could be a different lib. Planner: `grep -rn "from 'recharts'" src/components/charts/`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library version verified in package.json; all patterns have Phase 52 precedent
- Architecture: HIGH — Phase 51/52 CONTEXT + code inspection give explicit file:line anchors for every REQ
- Pitfalls: MEDIUM — Pitfalls 1–3, 5, 6 are verified from code; 4 and 7 are standard Playwright/recharts lore
- Viewport work (POLISH-07): MEDIUM-LOW — height estimates are derived from source reading, not browser measurement (Q3/A3); final design may require an iteration after a diagnostic run
- R&D bell data source (POLISH-01 for `rd` persona): LOW-MEDIUM — A2/Q1 unresolved; may require a new endpoint
- Staff Home+Help interpretation (POLISH-02): LOW — Q4/A9 unresolved, needs user clarification

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — code is stable; primary risk is v6.0 milestone completing and codebase shifting)
