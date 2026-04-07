---
phase: 33-foundations-iso-calendar-swedish-holidays
plan: 01
subsystem: foundations
tags: [iso-8601, swedish-holidays, vitest, eslint, time, calendar]

requires:
  - phase: previous
    provides: AppError taxonomy (src/lib/errors.ts), Next.js 15 + TS + flat eslint config
provides:
  - src/lib/time/ module — sole source of truth for ISO week math, Swedish holidays, working-day math, Swedish week display
  - getISOWeek / getISOWeekYear / getISOWeeksInYear / isISO53WeekYear
  - workingDaysInRange / countWorkingDays (Mon–Fri minus Swedish holidays)
  - isSwedishHoliday (defensive) / getSwedishHolidays (loud, year-range checked)
  - formatWeekShort / formatWeekLong / formatWeekRange (Swedish v.14 / vecka 14, 2026)
  - ERR_HOLIDAY_YEAR_OUT_OF_RANGE error code
  - Vitest test runner (first test infrastructure in the repo)
  - Eslint guard rule blocking date-fns week helpers and Date#getDay() outside lib/time/
affects: [phase-34, phase-36, phase-37, phase-38, phase-40, phase-41, phase-42, phase-43]

tech-stack:
  added: [vitest@^2]
  patterns:
    - "src/lib/time/ as the only public week-math entry point (barrel index)"
    - "Tests colocated under __tests__/ next to source"
    - "ISO week year vs calendar year discipline (formatWeekLong uses ISO year)"
    - "UTC fields internally to avoid DST drift"
    - "Asymmetric holiday API: getSwedishHolidays throws, isSwedishHoliday returns false"
    - "Eslint flat-config file-pattern overrides for guard rules"

key-files:
  created:
    - src/lib/time/iso-calendar.ts
    - src/lib/time/swedish-holidays.ts
    - src/lib/time/formatters.ts
    - src/lib/time/index.ts
    - src/lib/time/__tests__/iso-calendar.test.ts
    - src/lib/time/__tests__/swedish-holidays.test.ts
    - src/lib/time/__tests__/formatters.test.ts
    - vitest.config.ts
  modified:
    - src/lib/errors.ts
    - eslint.config.mjs
    - package.json

key-decisions:
  - "Implement ISO week math directly (no date-fns dependency) — ~30 LOC, avoids supply chain bloat"
  - "Hardcode Swedish holidays for 2026–2030 only; throw ERR_HOLIDAY_YEAR_OUT_OF_RANGE outside range (no Computus)"
  - "Asymmetric holiday API: query helper (isSwedishHoliday) is defensive, lookup helper (getSwedishHolidays) is loud"
  - "ValidationError constructor extended to accept an optional code string (back-compat with the legacy {fields} signature)"
  - "Vitest installed without jsdom/UI/testing-library — pure-function tests only, node environment"
  - "Test convention established: __tests__/ colocated next to source"

patterns-established:
  - "lib/time/ barrel — only public entry point for week math; enforced by lint"
  - "ISO week year vs calendar year — formatWeekLong uses getISOWeekYear so 2027-01-01 → 'vecka 53, 2026'"
  - "UTC-only date math inside lib/time/ to neutralize DST"

requirements-completed: [FOUND-V5-01, FOUND-V5-02]

duration: ~25min
completed: 2026-04-07
---

# Phase 33 Plan 01: Foundations — ISO Calendar + Swedish Holidays Summary

**ISO 8601 week math with first-class 53-week year support, hardcoded 2026–2030 Swedish holidays, working-day counting, Swedish display formatters, and an eslint guard making lib/time/ the only allowed source for day-of-week decisions.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-07T14:38:00Z
- **Completed:** 2026-04-07T14:55:00Z
- **Tasks:** 3
- **Files created:** 9 (3 source, 3 tests, barrel, vitest config, summary)
- **Files modified:** 3 (errors.ts, eslint.config.mjs, package.json)

## Accomplishments

- `src/lib/time/` module with 11 named exports — the v5.0 single source of truth for week/holiday/working-day math
- 16 unit tests covering all 7 in-test TC-CAL-* assertions plus edge cases (boundary, leap-vs-53-week, ISO-year boundary, defensive vs loud APIs)
- Vitest installed and wired with `@/` alias resolution (first test runner in this repo)
- Eslint guard rule empirically verified via probe file (TC-CAL-008 PASS)
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` all green

## Task Commits

1. **Task 1: Audit + add Vitest** — `1dffbf5` (chore)
2. **Task 2: Implement lib/time + tests (TDD)** — `29d6f85` (feat) — single combined commit (RED→GREEN→docs in one task per plan)
3. **Task 3: Eslint enforcement rule + TC-CAL-008 probe** — `3f46087` (feat)

_Note: Plan task 2 was committed as one feat commit rather than separate test/feat commits — the test files and implementation are tightly coupled and the plan's `<done>` criteria evaluate them together. RED was verified locally before GREEN was written._

## Files Created/Modified

- `src/lib/time/iso-calendar.ts` — ISO week math + working-day helpers (UTC-based)
- `src/lib/time/swedish-holidays.ts` — Hardcoded 2026–2030 holiday table + query/lookup helpers
- `src/lib/time/formatters.ts` — Swedish display helpers (`v.14`, `vecka 14, 2026`, ranges)
- `src/lib/time/index.ts` — Barrel re-export (only public entry point)
- `src/lib/time/__tests__/iso-calendar.test.ts` — TC-CAL-001/002/005 + edges
- `src/lib/time/__tests__/swedish-holidays.test.ts` — TC-CAL-003/004/006 + 13-holiday coverage + Easter spot-check 2027–2030
- `src/lib/time/__tests__/formatters.test.ts` — TC-CAL-007 + ISO week year boundary tests
- `vitest.config.ts` — Node env, `@/` alias, `passWithNoTests: true`
- `src/lib/errors.ts` — Added `ERR_HOLIDAY_YEAR_OUT_OF_RANGE` constant + extended `ValidationError` constructor
- `eslint.config.mjs` — Added `no-restricted-imports` (date-fns) + `no-restricted-syntax` (`.getDay()`) for `src/**` excluding `src/lib/time/**`
- `package.json` — `vitest@^2` devDep, `test` + `test:watch` scripts

## Decisions Made

- **No date-fns dependency.** ISO week math is ~30 LOC standard algorithm. Skipping the dependency avoids supply chain bloat for one helper. Verified algorithm against TC-CAL-001 (2026=53), TC-CAL-002 (2026-12-31 = W53/2026, 2027-01-04 = W1/2027), and 2024 (leap but 52-week).
- **Hardcoded holidays only.** Computus is error-prone; the client horizon is 2026–2030. Out-of-range = explicit failure.
- **Asymmetric API** (`getSwedishHolidays` throws / `isSwedishHoliday` returns false): query helpers should be safe to call defensively; lookup helpers should fail loudly.
- **ValidationError constructor extension** (see Deviations).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended `ValidationError` constructor to accept a custom error code**

- **Found during:** Task 2 (implementing `getSwedishHolidays` throw path)
- **Issue:** The plan instructed "REUSE existing `ValidationError` — do NOT create a new subclass. Just throw with `code: ERR_HOLIDAY_YEAR_OUT_OF_RANGE`." But the existing `ValidationError` constructor signature is `(message, details?: { fields })` and hardcodes `code = 'ERR_VALIDATION'` — there was no way to set a custom code without either subclassing or extending the constructor.
- **Fix:** Extended `ValidationError` constructor to accept either the legacy `{fields}` shape OR a code string + optional details (back-compat preserved). When a string is passed as the second argument, it's treated as the error code.
- **Files modified:** `src/lib/errors.ts`
- **Verification:** TC-CAL-006 test asserts `e.code === 'ERR_HOLIDAY_YEAR_OUT_OF_RANGE'` — passes. `pnpm typecheck` passes (no existing callers broken — `withTenant`, validation flows continue to work via the legacy form).
- **Committed in:** `29d6f85` (Task 2 commit)

**2. [Rule 3 - Blocking] Added `passWithNoTests: true` and `@/` alias to vitest.config.ts**

- **Found during:** Task 1 verification + Task 2 GREEN run
- **Issue:** (a) Plan task 1 verify expected `pnpm test` to exit 0 with no test files, but vitest 2.x exits 1 by default. (b) Tests import `@/lib/errors` but vitest doesn't read tsconfig paths automatically.
- **Fix:** Added `passWithNoTests: true` to vitest config + wired `@` → `./src` resolve alias using `fileURLToPath`.
- **Files modified:** `vitest.config.ts`
- **Verification:** Task 1 verify command passes; Task 2 tests resolve `@/lib/errors` cleanly.
- **Committed in:** `1dffbf5` (Task 1) and `29d6f85` (Task 2 — alias addition)

**3. [Rule 3 - Blocking] Replaced lint-probe shell-redirect with Write tool**

- **Found during:** Task 3 verify
- **Issue:** Plan's `<automated>` verify uses `echo … > file` which on Windows shell created a tiny mismatch; replaced with the Write tool to create the probe.
- **Fix:** Used Write tool for the probe file; ran `pnpm lint`; observed the expected `no-restricted-syntax` error on the probe; deleted the probe; re-ran `pnpm lint` clean.
- **Verification:** TC-CAL-008 PASS empirically observed.
- **Committed in:** N/A (probe file was deleted before commit; only `eslint.config.mjs` committed in `3f46087`)

**4. [Rule 1 - Bug fix] `formatWeekLong` test for 2026-12-31**

- The plan said `formatWeekLong(2026-12-31)` should return `'vecka 53, 2026'`. With ISO week year, 2026-12-31 IS in week 53 of 2026 (Thursday of that ISO week is Dec 31 itself), so the test passes as-stated. No fix — just calling out that the plan's example was correct and exercises both the 53-week year and the ISO year semantics.

---

**Total deviations:** 3 auto-fixed (all Rule 3 — blocking)
**Impact on plan:** No scope creep. All adjustments necessary to make the plan's stated tests/verifications pass on this exact codebase. Public API in `src/lib/time/index.ts` matches the `<interfaces>` block exactly.

## Issues Encountered

- Vitest 2.x exits non-zero on "no test files found" by default — fixed via `passWithNoTests: true` (deviation #2).
- `@/` alias not auto-resolved by vitest — fixed via explicit alias in `vitest.config.ts` (deviation #2).

## TC-CAL Coverage Result

| ID | Status | Test File / Mechanism |
|----|--------|----------------------|
| TC-CAL-001 | PASS | `iso-calendar.test.ts` (extra coverage: 2024 leap=52, 2032=53, 2037=53) |
| TC-CAL-002 | PASS | `iso-calendar.test.ts` (Dec 31 + Jan 1/3/4 boundary) |
| TC-CAL-003 | PASS | `swedish-holidays.test.ts` |
| TC-CAL-004 | PASS | `swedish-holidays.test.ts` |
| TC-CAL-005 | PASS | `iso-calendar.test.ts` (April 2026 = 20 working days, edges asserted) |
| TC-CAL-006 | PASS | `swedish-holidays.test.ts` (2025 + 2031 both throw) |
| TC-CAL-007 | PASS | `formatters.test.ts` |
| TC-CAL-008 | PASS (empirical) | Probe file in Task 3; `no-restricted-syntax` fired on `.getDay()` |

**16 tests total, 16 pass.**

## Lint / Build Verification

- `pnpm lint` — clean across full repo
- `pnpm typecheck` — clean
- `pnpm test` — 3 files, 16 tests, all pass
- `pnpm build` — Next.js production build clean
- Grep `date-fns` in src/ — empty
- Grep `\.getDay\(\)` in src/ — empty (excluding `src/lib/time/`)

## date-utils.ts Audit Notes (Task 1)

`src/lib/date-utils.ts` (65 lines) exports:
- `generateMonthRange(startMonth, count)` — YYYY-MM string range generator
- `getCurrentMonth()` — current YYYY-MM string
- `formatMonthHeader(month)` — "2026-03" → "Mar 2026" for grid columns
- `normalizeMonth(dateString)` — slice to YYYY-MM

**Verdict:** Pure month-string helpers for the existing monthly allocation grid. **No overlap** with `lib/time/` (no week math, no holiday checks, no Swedish week formatting). Left untouched. v5.0 day-grain actuals will eventually replace some of this, but that's Phase 36/37, not 33.

## Confirmation: No `date-fns` Added

Verified in `package.json` after Task 1: `date-fns` is NOT in dependencies or devDependencies. Only `vitest@^2` was added (devDep).

## Next Phase Readiness

- Phase 34 (personas, i18n, historic-edit helper) can import freely from `@/lib/time` — historic-edit guardrail's "current month" math will use `getISOWeekYear` + `getCurrentMonth`.
- Phase 36 (schema migrations) — no dependency.
- Phase 37 (actuals distribution, ADR-010 largest-remainder) — `workingDaysInRange` is its primary input.
- Phase 38 (Excel import) — `getISOWeek` for week-header validation.
- Phase 40–42 (timeline rendering) — `getISOWeeksInYear` for 53-week column layouts in 2026.

No blockers.

## Self-Check: PASSED

- `src/lib/time/iso-calendar.ts` FOUND
- `src/lib/time/swedish-holidays.ts` FOUND
- `src/lib/time/formatters.ts` FOUND
- `src/lib/time/index.ts` FOUND
- `src/lib/time/__tests__/iso-calendar.test.ts` FOUND
- `src/lib/time/__tests__/swedish-holidays.test.ts` FOUND
- `src/lib/time/__tests__/formatters.test.ts` FOUND
- `vitest.config.ts` FOUND
- Commit `1dffbf5` FOUND (Task 1)
- Commit `29d6f85` FOUND (Task 2)
- Commit `3f46087` FOUND (Task 3)

---
*Phase: 33-foundations-iso-calendar-swedish-holidays*
*Completed: 2026-04-07*
