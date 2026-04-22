---
phase: 53-chrome-polish
plan: 03
subsystem: dashboard-widgets
tags: [polish, widget-registry, dashboard-layouts, migration, wave-1]
dependency-graph:
  requires:
    - 53-01 (uiV6Polish flag + v6.polish.discipline.toggleBar/toggleDonut i18n keys)
    - Phase 51 LEAN-08 (widget-registry defensive fallback for unknown IDs)
  provides:
    - new widget id `discipline-breakdown` in the registry
    - `<DisciplineDonut>` recharts primitive
    - `normalizeProjectStaffing()` helper (exported from discipline-breakdown-widget)
    - one-shot SQL migration `src/db/migrations/20260422_polish_discipline_rename.sql`
  affects:
    - `DEFAULT_LAYOUTS` (3 placements rewritten)
    - every tenant `dashboard_layouts.layout` row that still references the legacy IDs (migration re-points them)
tech-stack:
  added: []
  patterns:
    - "recharts PieChart primitive with empty-state short-circuit (Pitfall 7)"
    - "unified-widget scope inference via `config.projectId` presence"
    - "bar/donut chart-type toggle persisted via `config.chartType` seed + session state"
    - "jsonb_set / jsonb_agg CASE rewrite idiom for widget-id rename inside `dashboard_layouts.layout`"
key-files:
  created:
    - src/components/charts/discipline-donut.tsx
    - src/components/charts/__tests__/discipline-donut.test.tsx
    - src/features/dashboard/widgets/discipline-breakdown-widget.tsx
    - src/features/dashboard/widgets/__tests__/discipline-breakdown-widget.test.tsx
    - src/db/migrations/20260422_polish_discipline_rename.sql
    - src/db/migrations/__tests__/polish-discipline-rename.test.ts
  modified:
    - src/features/dashboard/widgets/index.ts
    - src/features/dashboard/default-layouts.ts
    - src/features/dashboard/__tests__/default-layouts.test.ts
decisions:
  - "Toggle persistence via useState seeded from `config.chartType` (not a round-trip onConfigChange callback) because WidgetProps has no onConfigChange prop and adding one requires layout-mutation infra that is out-of-scope for this plan. Initial value still respects any server-set `config.chartType`, so tenants who set it via API get their default."
  - "normalizeProjectStaffing keys rows by the discipline abbreviation string (`person.discipline`) since ProjectStaffingPerson does not carry a discipline UUID. `disciplineId` and `disciplineName` end up identical — the downstream chart primitives only use the name for labels and hours for sizing, so the dual use is safe."
  - "Migration placed at `src/db/migrations/20260422_polish_discipline_rename.sql` per plan spec — NOT in the drizzle-kit journal (`drizzle/migrations/`). This matches the Phase 51 LEAN-11 one-shot pattern: operator applies manually against the target Neon environment; the migration is not part of the automated `drizzle-kit migrate` path."
  - "Legacy widgets (`discipline-chart`, `discipline-distribution`) remain imported in `src/features/dashboard/widgets/index.ts` per D-06 so `LEGACY_LAYOUTS` (flag-off path) keeps rendering them; the Phase 51 LEAN-08 widget-registry defensive fallback covers any straggler tenant rows the migration does not touch."
metrics:
  completed-date: 2026-04-22
  tasks-completed: 3
  tests-added: 15
  tests-passing: 90 (entire scope: src/components/charts + src/features/dashboard + src/db/migrations)
---

# Phase 53 Plan 03: Unified Discipline Breakdown Widget Summary

**One-liner:** Merges `discipline-chart` (org-wide bar) and `discipline-distribution` (per-project progress bars) into a single `discipline-breakdown` widget with scope inference on `config.projectId`, a bar/donut chart-type toggle, small-N progress-bar fallback, and a one-shot SQL migration that re-points tenant custom `dashboard_layouts.layout` rows from the legacy IDs to the new one.

## What Shipped

### Task 1 — DisciplineDonut chart primitive (commit `e08296c`)

- `src/components/charts/discipline-donut.tsx` — recharts `PieChart` with `innerRadius="50%"`, `outerRadius="80%"`, `paddingAngle={2}`; height matches `DisciplineChart` (300) so toggling bar ↔ donut does not reflow the widget.
- Empty-state short-circuit (**Pitfall 7** fix): when `data` is empty, the component returns a muted italic "Ingen data" placeholder and never mounts `<ResponsiveContainer>` / `<PieChart>`. Recharts 3.x warns + mis-renders on empty data.
- Default palette = `CHART_COLORS.palette` (8-color Nordic Precision palette); palette cycles via modulo when `data.length > palette.length`.
- Reuses `DisciplineBreakdown` row type from `@/features/analytics/analytics.types` (no new type introduced).
- Recharts version confirmed: `recharts ^3.8.1` already in `package.json`; no install needed.
- 3 vitest tests (empty-state guard, ResponsiveContainer rendering, palette-prop acceptance).

### Task 2 — DisciplineBreakdownWidget (commit `35fb73f`)

- `src/features/dashboard/widgets/discipline-breakdown-widget.tsx` with scope inference:
  - `config.projectId` absent → **org scope**: `useDisciplineBreakdown` → `DisciplineBreakdown[]` passed directly to `<DisciplineChart>` (bar) or `<DisciplineDonut>`.
  - `config.projectId` present → **project scope**: `useProjectStaffing(projectId)` → `normalizeProjectStaffing(data)` → per-discipline aggregated rows.
  - Default chart type per D-07: `'bar'` for org, `'donut'` for project.
  - D-02 small-N fallback: project scope + `rows.length > 0 && rows.length < 3` → renders existing `<DisciplineDistribution>` progress-bar component (avoids a misleading 2-slice donut).
- **`normalizeProjectStaffing(data)`** helper aggregates `hours = Σ person.months[*]` keyed by `person.discipline`, filters `totalHours > 0`, returns rows sorted desc. `disciplineId` = `disciplineName` = the discipline abbreviation string because `ProjectStaffingPerson` does not expose a discipline UUID (ARCHITECTURE.md §16). Missing/empty `discipline` → `'unassigned'` bucket. Exported for unit testing.
- **Toggle UI:** two `role="tab"` buttons wired to `setChartType`. `aria-selected` reflects active tab, underline styling matches existing Nordic Precision emphasis pattern. `aria-label` uses the `v6.polish.discipline.toggleBar` / `toggleDonut` strings shipped in Wave 0.
- **Registration:** id `discipline-breakdown`, category `'breakdowns'` (valid `WidgetCategory` — plan's `'staffing-insights'` is not a valid union member in this codebase), `supportedDashboards: ['manager', 'project-leader']`, `defaultColSpan: 6`, `minColSpan: 6`, `dataHook: 'useDisciplineBreakdown'`, icon `PieChart` from lucide-react.
- **`widgets/index.ts`:** appended `import './discipline-breakdown-widget';` with comment. Legacy imports (`./discipline-chart-widget`, `./discipline-distribution-widget`) preserved per D-06.
- 6 vitest tests: org-default bar, project-default donut, toggle bar↔donut, small-N fallback, 5-discipline donut default, normalizeProjectStaffing correctness (Pitfall 5 guard — single discipline split across two people sums correctly).

#### Hook-invocation trade-off (documented)

`useDisciplineBreakdown` in this codebase has no `enabled` option (`@/hooks/use-dashboard.ts`). React rules of hooks forbid conditional calls, so the widget always calls both hooks. `useProjectStaffing` is already internally gated by `!!projectId`, so its fetch skips in org mode. `useDisciplineBreakdown` does fire an extra org-wide fetch in project mode — cheap (cached by TanStack, `staleTime: 60_000`), but a future optimization could add an `enabled` option to skip it entirely. Not fixed here to keep the hook-module blast radius zero.

### Task 3 — Default-layouts swap + migration (commit `b27c373`)

#### default-layouts.ts diff (3 changed lines)

```
'manager:desktop'[5]:        widgetId: 'discipline-chart'        → 'discipline-breakdown'
'manager:mobile'[6]:         widgetId: 'discipline-chart'        → 'discipline-breakdown'
'project-leader:desktop'[3]: widgetId: 'discipline-distribution' → 'discipline-breakdown'
```

Position + `colSpan` unchanged on all 3 placements. Top-of-file comment documents POLISH-03 / D-02 / D-07. **`LEGACY_LAYOUTS` untouched** — flag-off path still references the legacy IDs (verified by a new "no LEGACY_LAYOUTS slot references discipline-breakdown" test).

#### Migration SQL (verbatim from RESEARCH §POLISH-03)

Path: `src/db/migrations/20260422_polish_discipline_rename.sql`. Rewrites via `jsonb_agg` + `jsonb_set` inside a `CASE` so placements with other widget IDs pass through unchanged. WHERE clause `layout::text ~* 'discipline-chart|discipline-distribution'` short-circuits untouched rows — idempotency + zero-work on already-migrated tenants.

**Not wired into the drizzle-kit journal.** Operator applies this once manually against Neon (Phase 51 LEAN-11 precedent). `drizzle/migrations/` is schema-migration territory; this is a data rewrite.

**Dev Neon affected-row count:** not executed in this worktree (no DB access during the plan). Operator should run the pre/post count:

```sql
SELECT COUNT(*) FROM dashboard_layouts
WHERE layout::text ~* 'discipline-chart|discipline-distribution';
-- Apply migration
-- Re-run — expected: 0
```

#### Migration tests (6, all green against PGlite)

1. `discipline-chart` rewrite + row without legacy IDs untouched (T-53-14 scope isolation).
2. `discipline-distribution` rewrite.
3. Row with BOTH legacy IDs — both rewritten (documented duplicate in result array as acceptable).
4. **Idempotency** — second application produces byte-identical layout.
5. Placement metadata preservation (`position`, `colSpan`, `config` object survive the rewrite).
6. Empty `layout: []` row — no error, untouched (WHERE short-circuits).

## Verification

| Check | Result |
|-------|--------|
| `pnpm vitest run src/components/charts/__tests__/discipline-donut.test.tsx` | 3/3 pass |
| `pnpm vitest run src/features/dashboard/widgets/__tests__/discipline-breakdown-widget.test.tsx` | 6/6 pass |
| `pnpm vitest run src/features/dashboard/__tests__/default-layouts.test.ts` | 28/28 pass (5 new POLISH-03 asserts + existing 23 trim/legacy/getDefaultLayout) |
| `pnpm vitest run src/db/migrations/__tests__/polish-discipline-rename.test.ts` | 6/6 pass |
| `pnpm vitest run src/components/charts src/features/dashboard src/db/migrations` | 90/90 pass across 9 test files |
| `tsc --noEmit` | 4 pre-existing errors (focus-trap-react ×3, @axe-core/playwright ×1 — see Phase 53-01 `deferred-items.md`); 0 new errors from this plan |
| `grep -c "'discipline-breakdown'" src/features/dashboard/default-layouts.ts` | 3 (acceptance criterion met exactly) |

## Deviations from Plan

### Rule 3 — Auto-fixed blocking issues

**1. [Rule 3 — Blocking] `WidgetCategory` union does not include `'staffing-insights'`.**

- **Found during:** Task 2 widget registration.
- **Issue:** Plan's interface sketch specified `category: 'staffing-insights'`, but `WidgetCategory` in `src/features/dashboard/widget-registry.types.ts` is `'health-capacity' | 'timelines-planning' | 'breakdowns' | 'alerts-actions'`. Using `'staffing-insights'` would fail typecheck.
- **Fix:** Used `category: 'breakdowns'` — the same category the two legacy widgets use (`discipline-chart-widget`, `discipline-distribution-widget`). Faithfully represents what the widget shows.
- **Commit:** `35fb73f`

**2. [Rule 3 — Blocking] `WidgetProps` has no `onConfigChange` callback.**

- **Found during:** Task 2 toggle implementation.
- **Issue:** Plan's widget skeleton called `onConfigChange?.({...config, chartType: next})`, but `WidgetProps = { timeRange, config, isEditMode }` in this codebase — no `onConfigChange` prop exists on any widget, and adding one requires layout-mutation infrastructure (calling `patchDashboardLayout` on blur + re-fetching) that is out-of-scope for this plan.
- **Fix:** Toggle uses local `useState` seeded from `config.chartType`. Initial value respects any server-set config; within a session the user's click toggles the chart. Cross-session persistence is deferred to a future plan that extends the widget-config contract. Documented in the `decisions` frontmatter.
- **Commit:** `35fb73f`

**3. [Rule 3 — Blocking] Import paths differ from the plan's pseudocode.**

- **Found during:** Task 2 implementation.
- **Issue:** Plan referenced `@/features/analytics/use-discipline-breakdown` and `@/features/projects/use-project-staffing`. Actual paths in this codebase are `@/hooks/use-dashboard` (which exports `useDisciplineBreakdown`) and `@/hooks/use-project-staffing`.
- **Fix:** Imported from the actual paths. The existing widgets (`discipline-chart-widget.tsx`, `discipline-distribution-widget.tsx`) use the same paths, so the unified widget stays consistent with the repo pattern.
- **Commit:** `35fb73f`

### Scope-boundary (not fixed)

- Four pre-existing typecheck errors (`focus-trap-react` ×3, `@axe-core/playwright` ×1) already tracked in `.planning/phases/53-chrome-polish/deferred-items.md` from Phase 53-01. Not touched.

## Authentication Gates

None encountered.

## Known Stubs

None. All three widget code paths (org bar, org donut, project donut/bar, project small-N fallback) render real data from the existing analytics + project-staffing endpoints.

## Threat Flags

None — no new trust-boundary-crossing surface beyond what the plan's `<threat_model>` dispositioned (T-53-12 / T-53-13 / T-53-14 / T-53-15). The migration's WHERE clause + `jsonb_agg` pattern implements the T-53-12 idempotency mitigation (test 4 asserts it) and T-53-14 tenant isolation (test 1 asserts rows without legacy IDs stay untouched, and the `UPDATE` rewrites `widgetId` strings in place so `organization_id` is preserved).

## Deferred Items

- Cross-session persistence of `chartType` toggle → requires extending `WidgetProps` with `onConfigChange` + a layout-mutation hook. Out-of-scope for this plan; initial chart type still honored from `config.chartType`.
- Adding an `enabled` option to `useDisciplineBreakdown` to skip the org fetch in project mode → minor perf optimization, not correctness; cached anyway.
- Physical deletion of `discipline-chart-widget.tsx` + `discipline-distribution-widget.tsx` → deferred per D-06 to a post-rollout cleanup phase (after the flag has been stable for ≥1 release).
- Production migration execution → operator task; migration is shipped but not applied.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | `e08296c` | feat(53-03): add DisciplineDonut recharts primitive + empty-state guard |
| 2 | `35fb73f` | feat(53-03): unified discipline-breakdown widget + scope inference + chart toggle |
| 3 | `b27c373` | feat(53-03): swap DEFAULT_LAYOUTS to discipline-breakdown + ship rename migration |

## Self-Check: PASSED

**Files:**
- FOUND: `src/components/charts/discipline-donut.tsx`
- FOUND: `src/components/charts/__tests__/discipline-donut.test.tsx`
- FOUND: `src/features/dashboard/widgets/discipline-breakdown-widget.tsx`
- FOUND: `src/features/dashboard/widgets/__tests__/discipline-breakdown-widget.test.tsx`
- FOUND: `src/db/migrations/20260422_polish_discipline_rename.sql`
- FOUND: `src/db/migrations/__tests__/polish-discipline-rename.test.ts`
- FOUND: modified `src/features/dashboard/widgets/index.ts` (new `discipline-breakdown-widget` import), `src/features/dashboard/default-layouts.ts` (3 placements rewritten + header comment), `src/features/dashboard/__tests__/default-layouts.test.ts` (9 new assertions)

**Commits:**
- FOUND: `e08296c`
- FOUND: `35fb73f`
- FOUND: `b27c373`

**Tests:**
- 3 donut + 6 widget + 5 new layout + 6 migration = 20 new tests; total 90 tests across the three plan directories all pass.
