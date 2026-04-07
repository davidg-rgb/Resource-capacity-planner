---
phase: 37-actuals-layer-services-distribution-plan-vs-actual-cell
plan: 02
subsystem: components/timeline + components/drawer
tags: [v5.0, actuals, ui, plan-vs-actual, i18n]
requires: [37-01]
provides:
  - PlanVsActualCell
  - PlanVsActualDrawer
  - usePlanVsActualDrawer
  - PlanVsActualDrawerProvider
  - useActualsCell
  - getCellData (server action)
  - getDailyCellBreakdown (server action)
  - v5.cell.* + v5.drawer.* i18n keys
affects:
  - drizzle/seed.ts (now seeds 15 actual_entries for Anna/Atlas 2026-04)
tech-stack:
  added: []
  patterns:
    - lazy-import-server-action-from-client-hook
    - debounced-cell-edit-via-setTimeout
    - context-store-mirroring-persona-context
key-files:
  created:
    - src/features/actuals/use-actuals-cell.ts
    - src/features/actuals/actuals.cell.actions.ts
    - src/features/actuals/__tests__/use-actuals-cell.test.tsx
    - src/components/timeline/PlanVsActualCell.tsx
    - src/components/timeline/PlanVsActualCell.module.css
    - src/components/timeline/__tests__/PlanVsActualCell.test.tsx
    - src/components/drawer/PlanVsActualDrawer.tsx
    - src/components/drawer/PlanVsActualDrawer.module.css
    - src/components/drawer/usePlanVsActualDrawer.tsx
    - src/components/drawer/__tests__/PlanVsActualDrawer.test.tsx
  modified:
    - src/messages/keys.ts
    - src/messages/sv.json
    - src/messages/en.json
    - drizzle/seed.ts
decisions:
  - Server action (getCellData) chosen over a /api/v5 endpoint to match the v4.0 RSC pattern; client hook lazy-imports it so jsdom test workers don't load DB code
  - Drawer hook implemented as React context (no zustand) to mirror PersonaProvider — no new state-management dep
  - usePlanVsActualDrawer file is .tsx (not .ts as in plan files_modified) because it exports a JSX provider component
  - Existing v5.drawer.* keys (planColumn/dayColumn) preserved alongside new keys (dateColumn/plannedColumn/deltaColumn/close) to avoid breaking earlier v5 work
metrics:
  tasks_completed: 3
  tasks_total: 3
  duration_min: ~12
  completed_date: 2026-04-07
requirements_satisfied: [ACT-03, ACT-04]
---

# Phase 37 Plan 02: Plan vs Actual cell + drawer + seed Summary

Reusable PlanVsActualCell + drill-down PlanVsActualDrawer wired to the 37-01 actuals read model, with v5.cell/v5.drawer i18n keys (sv + en parity), a TanStack Query hook (useActualsCell) returning {planned, actual, delta}, and a seeded demo dataset of 15 actual_entries for Anna/Atlas in 2026-04 so the drawer renders meaningful data on `pnpm db:seed`.

## What Was Built

- **i18n catalog extensions** (`keys.ts` + `sv.json` + `en.json`):
  - New `v5.cell.*` namespace: `planned`, `actual`, `delta`, `noActual`, `overBy`, `underBy`, `onPlan`, `hoursSuffix`.
  - Extended `v5.drawer.*`: added `dateColumn`, `plannedColumn`, `deltaColumn`, `close` and rewrote `title` + `empty` to the spec strings (`"Plan vs utfall — {person}, {project}, {month}"` / `"Inga utfallsrader för denna period."`). Existing keys (`planColumn`, `dayColumn`, `loading`, `error`) preserved.
  - `keys.test.ts` parity test stays green.

- **`getCellData` + `getDailyCellBreakdown` server actions** (`src/features/actuals/actuals.cell.actions.ts`):
  - `getCellData(orgId, personId, projectId, monthKey)` joins the v4 allocations slice (sum where `month = '${monthKey}-01'`) with `actual_entries` (sum filtered via `to_char(date, 'YYYY-MM') = monthKey`). Returns `{planned: number, actual: number | null}` — `actual` is `null` when zero rows exist (vs `0` when rows sum to zero).
  - `getDailyCellBreakdown(orgId, args)` wraps `getDailyRows` from 37-01 + computes per-day planned via `distribute(monthlyPlanned, workDaysInMonth(year, monthIndex).length)` and zips by ISO date. Pure derivation, no new schema. Lazy-imports `@/lib/time` to keep it server-only.

- **`useActualsCell` hook** (`src/features/actuals/use-actuals-cell.ts`):
  - Single TanStack Query keyed `['actuals-cell', orgId, personId, projectId, monthKey]`.
  - Default fetcher dynamically `import()`s the server action so jsdom/test environments don't blow up on the missing `DATABASE_URL`. Tests inject a `fetcher` prop.
  - Returns `{planned, actual, delta, isLoading, error}`. `delta = actual - planned` rounded to 2 dp, or `null` when actual is `null`.

- **`PlanVsActualCell` component** (`src/components/timeline/`):
  - Props: `{planned, actual, delta, personId, projectId, monthKey, editable?, onCellEdit?, onCellClick?}`.
  - State machine on `data-state`: `under` (actual<planned, green), `over` (red), `on-plan` (|delta|<0.005, blue), `no-actual` (actual===null, grey/muted).
  - Editable mode: `<input type="number" step="0.5">` initialized to `planned`, fires `onCellEdit` after a 600ms `setTimeout` debounce (no new dep), with cleanup on unmount.
  - Read-only mode: root is a `<button>` for keyboard accessibility, fires `onCellClick({personId, projectId, monthKey})` on click.
  - All strings via `useTranslations('v5.cell')` + `tabular-nums`. CSS module uses CSS custom properties so dark mode / Stitch tokens stay overridable.
  - Tests: 7/7 — under/over/on-plan/no-actual cases, sv-locale label assertion, read-only click context, debounced edit (TC-UI-002).

- **`usePlanVsActualDrawer` + `PlanVsActualDrawerProvider`** (`src/components/drawer/usePlanVsActualDrawer.tsx`):
  - React context store mirroring PersonaProvider (no new state dep).
  - `{open(ctx), close(), isOpen, context}` where `context` carries `{personId, projectId, monthKey, personName, projectName, monthLabel}`.

- **`PlanVsActualDrawer` component** (`src/components/drawer/`):
  - Reads `context` from the hook (or `contextOverride` prop for headless control).
  - Right-side fixed panel with backdrop (no new modal lib). Closes on Esc keydown listener, Close button, or backdrop click.
  - TanStack Query keyed `['drawer-daily', orgId, personId, projectId, monthKey]`. Default fetcher lazy-imports `getDailyCellBreakdown`. Tests inject a fetcher.
  - Renders 4-col table: Date | Planned | Actual | Delta with `tabular-nums` and 2 dp.
  - Empty state via `t('empty')`. Title via `t('title', {person, project, month})`.
  - Tests: 5/5 — 5-row render, empty state, Close button flips `isOpen=false`, sv title interpolation, Esc close.

- **`drizzle/seed.ts` extension**:
  - Inserts 15 `actual_entries` rows for Anna/Atlas across the working days of 2026-04 (hours mostly 6.5–8.5 with non-trivial variance from the 80h plan).
  - `.onConflictDoNothing({target: [orgId, personId, projectId, date]})` keeps it idempotent against the existing `actuals_org_person_project_date_uniq` constraint.
  - Wrapped in `try/catch` so a v4.0-only DB without `actual_entries` still completes the seed cleanly.

## Commits

| Task | Hash    | Message                                                              |
| ---- | ------- | -------------------------------------------------------------------- |
| 1    | 4e56414 | feat(37-02): add useActualsCell hook + v5.cell/drawer i18n keys      |
| 2    | 0ebc9d0 | feat(37-02): add PlanVsActualCell component (ACT-03, TC-UI-001/002)  |
| 3    | 89081ef | feat(37-02): add PlanVsActualDrawer + hook + seed (ACT-04)           |

## Verification

- `pnpm test src/messages/` — 4/4 pass (key parity)
- `pnpm test src/features/actuals/__tests__/use-actuals-cell.test.tsx` — 3/3 pass
- `pnpm test src/components/timeline/__tests__/PlanVsActualCell.test.tsx` — 7/7 pass (incl. TC-UI-001, TC-UI-002, TC-UI-003)
- `pnpm test src/components/drawer/__tests__/PlanVsActualDrawer.test.tsx` — 5/5 pass
- `pnpm typecheck` — green
- `pnpm lint` — green (no JSX text literals in cell or drawer; mutations manifest clean)
- `pnpm build` — green
- Full `pnpm test` — 93/94 (one pre-existing failure documented in `deferred-items.md`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `usePlanVsActualDrawer` is .tsx, not .ts**
- **Found during:** Task 3
- **Issue:** The plan's `files_modified` lists `usePlanVsActualDrawer.ts`, but the file exports a JSX provider component, which TypeScript will not parse from a `.ts` file.
- **Fix:** Created the file as `.tsx`. SUMMARY records this in key-files.created.

**2. [Rule 1 — Bug] `workDaysInMonth` returns ISO date strings, not Date objects**
- **Found during:** Task 3 typecheck
- **Issue:** First implementation called `.getUTCFullYear()` etc on the return values, but `workDaysInMonth(year, monthIndex)` actually returns `string[]` (ISO dates). TypeScript caught it.
- **Fix:** Use the strings directly when keying the per-day plan map.
- **Files:** `src/features/actuals/actuals.cell.actions.ts`
- **Commit:** 89081ef

**3. [Rule 3 — Blocking] Hook imports server action from a module that imports `db`**
- **Found during:** Task 1 hook test (jsdom)
- **Issue:** Importing `getCellData` at the top of `use-actuals-cell.ts` pulled `@/db` into the test bundle, which crashed because `process.env.DATABASE_URL` is unset in jsdom.
- **Fix:** Default fetcher uses dynamic `await import('./actuals.cell.actions')` so the DB module is only loaded when the hook actually runs (i.e. on the server, or in tests when the user opts in). Tests inject a synthetic `fetcher` prop and never load the action module. Same pattern applied to `PlanVsActualDrawer`'s default fetcher.
- **Commits:** 4e56414, 89081ef

### Decisions Differing from Plan

- **i18n key superset, not replacement.** The plan's spec rewrote `v5.drawer.*` from scratch; the existing catalog (from FOUND-V5-05) already contained `planColumn`, `actualColumn`, `dayColumn`, `loading`, `error`. I kept those AND added the new keys (`dateColumn`, `plannedColumn`, `deltaColumn`, `close`) plus rewrote `title`/`empty` to the new spec strings. This preserves Phase 34's contract while delivering 37-02's wording.
- **No `/dev/cell-preview` smoke page** — left as the plan said it was optional; automated tests are the binding verification.

### Not Done

- Task 2 plan referenced TC-UI-003 as "wired even though out of scope" — implemented in code (read-only `onCellClick` path) and covered by the same test as TC-UI-001.

## Deferred Issues

Pre-existing failure inherited from 37-01 — see `deferred-items.md` in the phase directory:
- `tests/invariants/change-log.coverage.test.ts` — TC-CL-005 spy can't see `recordChange` because of the bound-import order. The static eslint rule + the contract test in `upsert-actuals.contract.test.ts` already cover this assertion end-to-end. Not introduced by 37-02; verified on the clean tree before this plan started.

## Known Stubs

None. All values flow from real DB queries (server actions) or injected test fetchers; no placeholder strings; no TODOs; no UI rendering hardcoded empty arrays.

## Hand-off Note for Phases 40 / 41 / 42 (Persona Screens)

Persona timelines should import the cell + drawer verbatim:

```ts
// Cell — drop into any timeline grid cell
import { PlanVsActualCell } from '@/components/timeline/PlanVsActualCell';
import type { PlanVsActualCellProps } from '@/components/timeline/PlanVsActualCell';

// Hook — feed planned/actual/delta into the cell from a server action
import { useActualsCell } from '@/features/actuals/use-actuals-cell';

// Drawer — mount once near the persona screen root, control via the hook
import { PlanVsActualDrawer } from '@/components/drawer/PlanVsActualDrawer';
import {
  PlanVsActualDrawerProvider,
  usePlanVsActualDrawer,
} from '@/components/drawer/usePlanVsActualDrawer';
```

Wire pattern:

```tsx
// 1. Wrap your persona screen root in the provider:
<PlanVsActualDrawerProvider>
  <YourPersonaTimeline />
  <PlanVsActualDrawer orgId={orgId} />
</PlanVsActualDrawerProvider>

// 2. In each cell:
function TimelineCell({ orgId, personId, projectId, monthKey, personName, projectName, monthLabel }) {
  const { planned, actual, delta } = useActualsCell({ orgId, personId, projectId, monthKey });
  const { open } = usePlanVsActualDrawer();
  return (
    <PlanVsActualCell
      planned={planned}
      actual={actual}
      delta={delta}
      personId={personId}
      projectId={projectId}
      monthKey={monthKey}
      onCellClick={(ctx) => open({ ...ctx, personName, projectName, monthLabel })}
      // For Line Manager / PM editable timelines, also pass:
      // onCellEdit={(next) => upsertAllocation({ personId, projectId, monthKey, hours: next })}
    />
  );
}
```

Notes:
- `useActualsCell` returns `actual: null` (not 0) when no actuals exist — the cell renders the `noActual` em-dash for that case.
- The drawer needs `personName`, `projectName`, and `monthLabel` in the open() context for the title interpolation. These are display strings the persona screen already has from its main query.
- The drawer's per-day "planned" is derived (largest-remainder distribution from `lib/time`), not stored — no migration needed.
- Editable mode is opt-in per cell. PM/Staff timelines should leave `onCellEdit` undefined for read-only behaviour; Line Manager gets the editable variant.

## Self-Check: PASSED

- [x] `src/features/actuals/use-actuals-cell.ts` — exists
- [x] `src/features/actuals/actuals.cell.actions.ts` — exists, exports `getCellData` + `getDailyCellBreakdown`
- [x] `src/features/actuals/__tests__/use-actuals-cell.test.tsx` — exists, 3/3 pass
- [x] `src/components/timeline/PlanVsActualCell.tsx` — exists, exports `PlanVsActualCell` + `PlanVsActualCellProps`
- [x] `src/components/timeline/PlanVsActualCell.module.css` — exists
- [x] `src/components/timeline/__tests__/PlanVsActualCell.test.tsx` — exists, 7/7 pass
- [x] `src/components/drawer/PlanVsActualDrawer.tsx` — exists
- [x] `src/components/drawer/PlanVsActualDrawer.module.css` — exists
- [x] `src/components/drawer/usePlanVsActualDrawer.tsx` — exists, exports provider + hook
- [x] `src/components/drawer/__tests__/PlanVsActualDrawer.test.tsx` — exists, 5/5 pass
- [x] `src/messages/keys.ts` — modified, `v5.cell.*` + extended `v5.drawer.*`
- [x] `src/messages/sv.json` — modified, parity green
- [x] `src/messages/en.json` — modified, parity green
- [x] `drizzle/seed.ts` — modified, idempotent `actual_entries` block
- [x] Commits 4e56414, 0ebc9d0, 89081ef present in `git log`
