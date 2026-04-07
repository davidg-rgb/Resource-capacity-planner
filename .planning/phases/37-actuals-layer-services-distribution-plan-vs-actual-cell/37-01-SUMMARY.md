---
phase: 37-actuals-layer-services-distribution-plan-vs-actual-cell
plan: 01
subsystem: features/actuals
tags: [v5.0, actuals, distribution, change-log, iso-calendar]
requires: [35-01, 36-01]
provides:
  - distribute
  - workDaysInIsoWeek
  - workDaysInMonth
  - upsertActuals
  - aggregateByMonth
  - aggregateByWeek
  - getDailyRows
  - getProjectBurn
  - ACTUAL_UPSERTED change_log action
affects:
  - eslint nordic/require-change-log files glob
  - tests/invariants/mutations.json (now lists upsertActuals)
tech-stack:
  added: []
  patterns:
    - largest-remainder-distribution
    - pglite-contract-test
    - tx-scoped-recordChange
key-files:
  created:
    - src/lib/time/__tests__/distribute.test.ts
    - src/features/actuals/actuals.types.ts
    - src/features/actuals/actuals.schema.ts
    - src/features/actuals/actuals.service.ts
    - src/features/actuals/actuals.read.ts
    - src/features/actuals/__tests__/upsert-actuals.contract.test.ts
    - src/features/actuals/__tests__/aggregation.contract.test.ts
    - drizzle/migrations/0005_motionless_blob.sql
    - drizzle/migrations/meta/0005_snapshot.json
  modified:
    - src/lib/time/iso-calendar.ts
    - src/lib/time/index.ts
    - src/db/schema.ts
    - eslint.config.mjs
    - scripts/generate-mutations-manifest.ts
    - tests/invariants/mutations.json
    - drizzle/migrations/meta/_journal.json
decisions:
  - Largest-remainder distribution implemented in integer cents to guarantee exact-sum at numeric(5,2) precision (ADR-010)
  - Single change_log row per upsertActuals call (not per day) — keeps audit feed readable; per-day detail lives in newValue.rows
  - Week 53 of 2026 produces 3 working days (not 4) because Dec 31 Nyårsafton is a Swedish holiday in lib/time/swedish-holidays.ts
metrics:
  tasks_completed: 3
  tasks_total: 3
  duration_min: ~10
  completed_date: 2026-04-07
requirements_satisfied: [ACT-02, ACT-05]
---

# Phase 37 Plan 01: Actuals service + distribution + read model Summary

Day-grain actuals write side: largest-remainder distribution helpers in `lib/time`, the `upsertActuals` service with tx-scoped change_log wiring and idempotent upserts on `(org, person, project, date)`, plus the read model used by the plan-vs-actual cell. Eslint guard and mutations manifest extended so the new service is enforced.

## What Was Built

- **`lib/time` extensions** (`iso-calendar.ts`):
  - `distribute(N, K)` — pure largest-remainder. Works in integer cents to avoid float drift; sum is exactly `round(N*100)/100`. Throws `BAD_HOURS` / `BAD_DAY_COUNT`.
  - `workDaysInIsoWeek(isoYear, isoWeek)` — Mon–Fri minus Swedish holidays, handles 53-week years.
  - `workDaysInMonth(year, monthIndex)` — Mon–Fri of the calendar month minus holidays.
  - All three re-exported from `@/lib/time` barrel.

- **`actuals.service.upsertActuals`**:
  - Discriminated input on `grain` (day/week/month), validated by `actuals.schema.ts` zod schema.
  - Week/month grain expand to per-day rows via `distribute` + `workDaysIn{IsoWeek,Month}`.
  - Single batched `tx.insert(...).onConflictDoUpdate(...)` keyed on the existing `actuals_org_person_project_date_uniq` constraint — fully idempotent.
  - `recordChange` called inside the same `db.transaction(...)`, exactly once per call. `entity='actual_entry'`, `action='ACTUAL_UPSERTED'`, `previousValue` carries the prior row snapshots, `newValue` carries the written rows, `context` carries `{grain, dates, source, personId, projectId, importBatchId?}`.
  - Throws `NO_WORKING_DAYS` if a week/month has zero working days.

- **`change_log_action` enum**: added `ACTUAL_UPSERTED`. Migration `0005_motionless_blob.sql` is a single `ALTER TYPE` (idempotent and additive).

- **`actuals.read`**:
  - `aggregateByMonth(orgId, {personIds?, projectIds?, monthKeys?})` → SQL `to_char(date, 'YYYY-MM')` group-by; missing combos absent.
  - `aggregateByWeek(orgId, {personIds?, projectIds?})` → `EXTRACT(ISOYEAR/WEEK)`; verified via test that 2026-12-28 buckets into (2026, 53) and 2027-01-04 into (2027, 1).
  - `getDailyRows(orgId, {personId, projectId, monthKey})` → first/last-day `between` filter.
  - `getProjectBurn(orgId, projectId, {from, to})` → planned sum from `allocations` + actual sum from `actual_entries`.

- **Eslint guard + manifest**:
  - `eslint.config.mjs` `nordic/require-change-log` files glob now includes `src/features/actuals/**/*.service.ts`.
  - `scripts/generate-mutations-manifest.ts` `INCLUDE` constant kept in sync.
  - `tests/invariants/mutations.json` regenerated — now lists `{file: src/features/actuals/actuals.service.ts, export: upsertActuals}`.

## Commits

| Task | Hash    | Message                                                                          |
| ---- | ------- | -------------------------------------------------------------------------------- |
| 1    | cc83053 | feat(37-01): add distribute + workDaysInIsoWeek + workDaysInMonth helpers        |
| 2    | 5b2173f | feat(37-01): add upsertActuals service with change_log wiring (ACT-02)           |
| 3    | a82c674 | feat(37-01): add actuals.read aggregation + extend require-change-log glob       |

## Verification

- `pnpm test src/lib/time/__tests__/distribute.test.ts` — 12/12 pass (TC-CAL-023..025)
- `pnpm test src/features/actuals/` — 12/12 pass (TC-AC-001..006 + TC-AR-001..004 + change_log shape + reconcile invariant)
- `pnpm test src/features/change-log/__tests__/require-change-log.rule.test.ts` — 8/8 pass
- `pnpm typecheck` — green
- `pnpm lint` — green (after manifest commit; mutations.json clean diff)
- `pnpm build` — green
- `pnpm generate:mutations-manifest` — deterministic, byte-identical on second run

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Plan asserted week 53 of 2026 has 4 working days; actual is 3**
- **Found during:** Task 1 (`distribute.test.ts` failed on the week-53 assertion)
- **Issue:** Plan body said "week 53 of 2026 spans Dec 28–31 (Jan 1 2027 excluded)". But `lib/time/swedish-holidays.ts` lists Dec 31 (Nyårsafton) as a fixed Swedish holiday, so working days for ISO 2026-W53 are Mon Dec 28, Tue Dec 29, Wed Dec 30 — three rows, not four.
- **Fix:** Adjusted the test assertion + the corresponding upsertActuals contract test (TC-AC-005) to expect 3 rows summing to 32.00 instead of 4 rows summing to 32.00. The distribution still preserves the input total exactly. Holiday data is the source of truth.
- **Files:** `src/lib/time/__tests__/distribute.test.ts`, `src/features/actuals/__tests__/upsert-actuals.contract.test.ts`
- **Commits:** cc83053 (test), 5b2173f (contract)

### Not Done

- The plan suggested `recordChange` import from `'./change-log.service'` via a feature-local barrel. Our implementation imports from `@/features/change-log/change-log.service` directly (cross-feature) — matches the existing allocations service pattern. No new barrel was created. Equivalent in behaviour.

## Known Stubs

None. All exported functions are wired to real DB queries; no placeholder data; no TODO/FIXME; no UI component to stub.

## Hand-off Note for 37-02 (Plan vs Actual UI cell)

Import paths and signatures the UI plan should consume:

```ts
// Write side
import { upsertActuals } from '@/features/actuals/actuals.service';
import type { UpsertActualsInput, UpsertActualsResult } from '@/features/actuals/actuals.types';

// Discriminated input — pick the grain that matches the cell's edit mode:
//   { grain: 'day',   date: 'YYYY-MM-DD', hours: number, ... }
//   { grain: 'week',  isoYear, isoWeek,   totalHours,    ... }
//   { grain: 'month', monthKey: 'YYYY-MM', totalHours,   ... }
// Always pass orgId, personId, projectId, source ('manual' | 'import'),
// actorPersonaId, and optionally importBatchId.

// Read side
import {
  aggregateByMonth,
  aggregateByWeek,
  getDailyRows,
  getProjectBurn,
} from '@/features/actuals/actuals.read';

// aggregateByMonth(orgId, { personIds?, projectIds?, monthKeys? })
//   -> Array<{ personId, projectId, monthKey: 'YYYY-MM', hours: number }>
// aggregateByWeek(orgId, { personIds?, projectIds? })
//   -> Array<{ personId, projectId, isoYear, isoWeek, hours }>
// getDailyRows(orgId, { personId, projectId, monthKey })
//   -> Array<{ id, date, hours, source }>
// getProjectBurn(orgId, projectId, { from, to })
//   -> { plannedHours, actualHours }
```

Notes for the UI plan:
- `upsertActuals` is fully idempotent — the cell can fire a save on every blur without dedupe logic.
- `aggregateByMonth` returns an absent row (not zero) for missing combos. The cell should treat missing as 0.
- 53-week years: use `getISOWeeksInYear(2026) === 53` to know whether to render a W53 column.
- Distribution is deterministic: re-running with the same input produces the same per-day rows, so optimistic UI is safe.

## Self-Check: PASSED

- [x] `src/lib/time/iso-calendar.ts` — modified
- [x] `src/lib/time/index.ts` — modified
- [x] `src/lib/time/__tests__/distribute.test.ts` — exists, 12/12 pass
- [x] `src/features/actuals/actuals.types.ts` — exists
- [x] `src/features/actuals/actuals.schema.ts` — exists
- [x] `src/features/actuals/actuals.service.ts` — exists, exports upsertActuals
- [x] `src/features/actuals/actuals.read.ts` — exists, exports aggregateByMonth, aggregateByWeek, getDailyRows, getProjectBurn
- [x] `src/features/actuals/__tests__/upsert-actuals.contract.test.ts` — exists, 7/7 pass
- [x] `src/features/actuals/__tests__/aggregation.contract.test.ts` — exists, 5/5 pass
- [x] `eslint.config.mjs` — actuals glob added
- [x] `scripts/generate-mutations-manifest.ts` — INCLUDE extended
- [x] `tests/invariants/mutations.json` — lists upsertActuals
- [x] `drizzle/migrations/0005_motionless_blob.sql` — exists (ACTUAL_UPSERTED enum value)
- [x] Commits cc83053, 5b2173f, a82c674 all present in `git log`
