---
phase: 33-foundations-iso-calendar-swedish-holidays
verified: 2026-04-07T15:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 33: Foundations — ISO Calendar + Swedish Holidays Verification Report

**Phase Goal:** Provide a single, tested ISO 8601 / 53-week calendar utility (with Swedish
holidays 2026–2030) that every other v5.0 module depends on.

**Verified:** 2026-04-07T15:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Any caller can ask "what ISO week is this date?" and get a correct answer for 2026 (53-week year) | VERIFIED | `getISOWeek`, `getISOWeekYear`, `getISOWeeksInYear`, `isISO53WeekYear` all exported from `src/lib/time/index.ts`; TC-CAL-001 and TC-CAL-002 pass |
| 2 | Any caller can ask "is this date a Swedish holiday?" for years 2026–2030 and get the correct answer | VERIFIED | `isSwedishHoliday` exported; TC-CAL-003, TC-CAL-004 pass; 13-holiday coverage test passes for 2026; Easter spot-checks pass for 2027–2030 |
| 3 | Any caller can ask "how many working days between A and B?" excluding Mon–Fri holidays | VERIFIED | `workingDaysInRange` + `countWorkingDays` exported; TC-CAL-005 passes (April 2026 = 20 working days); edge cases for Saturday and Good Friday verified |
| 4 | Any caller can format a date as "v.14" or "vecka 14, 2026" via the central helper | VERIFIED | `formatWeekShort`, `formatWeekLong`, `formatWeekRange` exported; TC-CAL-007 passes; ISO week year boundary (2027-01-01 → "vecka 53, 2026") tested and passes |
| 5 | CI fails if a non-lib/time/ file imports date-fns week helpers or calls .getDay() for day-of-week | VERIFIED | `eslint.config.mjs` contains `no-restricted-imports` (date-fns) and `no-restricted-syntax` (.getDay()) targeting `src/**/*.{ts,tsx}` with `ignores: ['src/lib/time/**']`; TC-CAL-008 empirically verified via probe file during Task 3; grep confirms zero occurrences in codebase |
| 6 | Calling getSwedishHolidays(2031) throws ValidationError with code ERR_HOLIDAY_YEAR_OUT_OF_RANGE | VERIFIED | TC-CAL-006 passes; both 2025 and 2031 throw `ValidationError` with `.code === 'ERR_HOLIDAY_YEAR_OUT_OF_RANGE'`; `ERR_HOLIDAY_YEAR_OUT_OF_RANGE` constant exported from `src/lib/errors.ts` |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/time/iso-calendar.ts` | ISO 8601 week math (getISOWeek, getISOWeekYear, getISOWeeksInYear, isISO53WeekYear, workingDaysInRange, countWorkingDays) | VERIFIED | 92 lines; all 6 functions present and substantive; UTC-based algorithm with DST protection; JSDoc documenting 53-week vs leap-year independence |
| `src/lib/time/swedish-holidays.ts` | Hardcoded 2026–2030 holiday table + isSwedishHoliday + getSwedishHolidays | VERIFIED | 151 lines; EASTER_TABLE for 2026–2030, 8 fixed-date holidays, both query/lookup functions; asymmetric error handling documented |
| `src/lib/time/formatters.ts` | formatWeekShort / formatWeekLong / formatWeekRange Swedish display helpers | VERIFIED | 35 lines; all 3 functions present; `formatWeekLong` uses `getISOWeekYear` (not calendar year — critical for boundary correctness); en-dash used for ranges |
| `src/lib/time/index.ts` | Barrel re-export — the only public entry point | VERIFIED | Exports all 11 functions + `SwedishHoliday` type; matches the `<interfaces>` block from the PLAN exactly; header comment documents UTC date contract and lint enforcement |
| `src/lib/time/__tests__/iso-calendar.test.ts` | TC-CAL-001, TC-CAL-002, TC-CAL-005 coverage | VERIFIED | 4 tests; named TC-CAL-001, TC-CAL-002, TC-CAL-005 + edge cases (same-day Tuesday/Saturday/Good Friday); all pass |
| `src/lib/time/__tests__/swedish-holidays.test.ts` | TC-CAL-003, TC-CAL-004, TC-CAL-006 coverage | VERIFIED | 5 tests; named TC-CAL-003, TC-CAL-004, TC-CAL-006 + 13-holiday coverage + Easter spot-checks 2027–2030 + negative test; all pass |
| `src/lib/time/__tests__/formatters.test.ts` | TC-CAL-007 coverage | VERIFIED | 6 tests; TC-CAL-007 named + ISO year boundary tests + range tests; all pass |
| `eslint.config.mjs` | no-restricted-syntax / no-restricted-imports rule blocking direct date-fns and .getDay() outside lib/time/ | VERIFIED | Rule present at correct position in flat config array; targets `src/**/*.{ts,tsx}` with `ignores: ['src/lib/time/**']`; both `no-restricted-imports` (3 date-fns paths) and `no-restricted-syntax` (.getDay()) configured |
| `vitest.config.ts` | Vitest test runner config | VERIFIED | Present; node environment; `src/**/__tests__/**/*.test.ts` include pattern; `@/` alias resolves to `./src`; `passWithNoTests: true` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/time/iso-calendar.ts` | `src/lib/time/swedish-holidays.ts` | `workingDaysInRange` imports `isSwedishHoliday` | WIRED | Line 21: `import { isSwedishHoliday } from './swedish-holidays'`; used at line 80 inside `workingDaysInRange` |
| `src/lib/time/swedish-holidays.ts` | `src/lib/errors.ts` | throws ValidationError with ERR_HOLIDAY_YEAR_OUT_OF_RANGE | WIRED | Line 18: `import { ValidationError, ERR_HOLIDAY_YEAR_OUT_OF_RANGE } from '@/lib/errors'`; thrown at lines 97–101 in `getSwedishHolidays` |
| `eslint.config.mjs` | `src/lib/time/` | no-restricted-imports override allowing date-fns inside lib/time/ only | WIRED | `ignores: ['src/lib/time/**']` present at line 19; string `lib/time` confirmed in the ignores value |

---

### Data-Flow Trace (Level 4)

Not applicable. This phase delivers pure utility functions and test infrastructure — no components rendering dynamic data from a backend. All outputs are return values from pure functions, verified directly by unit tests.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 16 unit tests pass | `npx vitest run` | 3 test files, 16 tests, 0 failures | PASS |
| No date-fns imports anywhere in src/ | `grep -r "from ['\"]date-fns"` src/ | No matches | PASS |
| No .getDay() calls outside lib/time/ | `grep -rE ".getDay()"` src/ (all files) | No matches | PASS |
| TypeScript compiles cleanly | `npx tsc --noEmit` | No output (exit 0) | PASS |
| Commits documented in SUMMARY exist | `git log --oneline 1dffbf5 29d6f85 3f46087` | All 3 commits found | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FOUND-V5-01 | 33-01-PLAN.md | `lib/time/iso-calendar.ts` provides ISO 8601 week math (Monday start, getISOWeek, getISOWeekYear, getISOWeeksInYear) and 53-week year detection; no other module may import date-fns week APIs or rely on native Date locale defaults — verified by TC-CAL-* | SATISFIED | All three functions delivered and exported; eslint guard verified empirically (TC-CAL-008); TC-CAL-001 and TC-CAL-002 pass; zero date-fns imports in codebase |
| FOUND-V5-02 | 33-01-PLAN.md | Swedish holidays for 2026–2030 hardcoded; `isSwedishHoliday(date)` and `workingDaysInRange(start, end)` helpers exposed | SATISFIED | `isSwedishHoliday` and `workingDaysInRange` (plus `countWorkingDays`) exported; 13 holidays verified for 2026; Easter spot-checks for 2027–2030 pass; TC-CAL-003, TC-CAL-004, TC-CAL-006 pass |

Both requirements are marked `[x]` complete in `.planning/REQUIREMENTS.md` and the phase-to-requirement mapping table at lines 122–123 confirms Phase 33 owns both.

**Note on ROADMAP success criteria divergence.** The ROADMAP success criteria (SC-1) reference additional exports (`isoWeek`, `weeksInIsoYear`, `rangeWeeks`, `workDaysInIsoWeek`, `parseIsoDate`, `isHistoricPeriod`, etc.) and TC-CAL-001..021. These correspond to functions specified in ARCHITECTURE.md §6.1 that were NOT in the Phase 33 PLAN or CONTEXT.md scope. The PLAN + CONTEXT explicitly scoped Phase 33 to the helper set listed in `<interfaces>`, and the CONTEXT.md marks functions like `rangeWeeks`, `workDaysInMonth`, `isHistoricPeriod` as belonging to downstream phases (Phase 34 for `isHistoricPeriod`, Phase 37 for `workDaysInMonth`). TC-CAL-009 through TC-CAL-021 test those missing functions. These are not gaps in Phase 33 — they are deferred to the phases that introduce the features requiring them. FOUND-V5-01 and FOUND-V5-02 as written in REQUIREMENTS.md are fully satisfied by what was delivered.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODOs, FIXMEs, empty implementations, placeholder returns, or hardcoded empty data found in the delivered files. The `ValidationError` constructor extension (deviation #1 from SUMMARY) is a legitimate backwards-compatible enhancement, not a stub.

---

### Human Verification Required

None. All aspects of this phase are verifiable programmatically:

- Pure functions with deterministic outputs
- Unit tests confirm all TC-CAL-* assertions numerically
- Eslint rule verified via probe file (empirical but scriptable)
- No UI, no network, no browser behavior involved

---

### Gaps Summary

No gaps. All 6 must-have truths are verified, all 9 artifacts exist and are substantive, all 3 key links are wired, both requirement IDs (FOUND-V5-01, FOUND-V5-02) are satisfied, 16 unit tests pass, typecheck is clean, and zero forbidden patterns exist in the codebase.

The only noteworthy finding is that TC-CAL-009 through TC-CAL-021 (testing `rangeWeeks`, `workDaysInIsoWeek`, `parseIsoDate`, `isHistoricPeriod`, etc.) are not covered by this phase. This is intentional per the PLAN and CONTEXT scope boundary — those functions belong to the phases that consume them.

---

_Verified: 2026-04-07T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
