---
phase: 44-api-hardening-and-test-contract-fill
plan: 04
subsystem: errors
tags: [api-v5, error-wire-format, invariants, wave-b, tc-inv-errwire]
requires:
  - "44-01 (AppError subclasses + src/lib/errors/codes.ts barrel)"
  - "44-02 (v5 route sweep to AppError hierarchy)"
provides:
  - "tests/invariants/error-wire-format.test.ts — 9 passing invariants asserting flat wire shape + status for all 8 documented error codes"
  - "TC-INV-ERRWIRE-001..008 TC-ID namespace for Wave C manifest generator"
affects: []
tech-stack:
  added: []
  patterns: ["parameterized vitest invariant over AppError subclasses"]
key-files:
  created:
    - tests/invariants/error-wire-format.test.ts
  modified: []
decisions:
  - "Used TC-INV-ERRWIRE-* namespace instead of plan's TC-NEG-* — TC-NEG-* is already claimed by §15.14/§15.21 as negative-space non-goal assertions (e.g. TC-NEG-003 'no task_id column', TC-NEG-008 'no counter-propose endpoint'). Reusing TC-NEG for error wire format would collide with the Wave C §15 manifest diff."
  - "Asserted exact top-level key set { error, message, details } to lock wire shape — blocks future drift toward envelopes or code/error duplication."
requirements: [API-V5-01, TEST-V5-01]
metrics:
  duration: "~4 min"
  completed: 2026-04-09
  tasks: 1
  commits: 1
---

# Phase 44 Plan 04: Error Wire Format Invariant Summary

Added `tests/invariants/error-wire-format.test.ts` which, for each of the 8 documented v5 error codes, throws the matching `AppError` subclass through `handleApiError()` and asserts both the HTTP status and the flat `{ error, message, details? }` JSON wire shape. This locks in Wave A (44-01 taxonomy extension + 44-02 route sweep) at the strength required by API-V5-01.

## What Shipped

- `tests/invariants/error-wire-format.test.ts` — 9 passing tests:
  - 1 meta-case asserting all 8 documented codes are covered by the table.
  - 8 parameterized cases (`TC-INV-ERRWIRE-001..008`), one per code:
    - `HISTORIC_CONFIRM_REQUIRED` → 409
    - `BAD_HOURS` → 400
    - `PROPOSAL_NOT_ACTIVE` → 409
    - `REASON_REQUIRED` → 400
    - `BATCH_ALREADY_ROLLED_BACK` → 409
    - `ROLLBACK_WINDOW_EXPIRED` → 409
    - `DEPENDENT_ROWS_EXIST` → 409
    - `ERR_US_WEEK_HEADERS` → 400
  - Each case asserts: `res.status`, `body.error === CODE`, `body.message` non-empty string, `body.details` present, and exact top-level key set `['details', 'error', 'message']`.
- All constants imported from `@/lib/errors/codes` — zero magic strings.

## Commits

| Task | Commit  | Description                                                      |
| ---- | ------- | ---------------------------------------------------------------- |
| 1    | 2cf8a13 | test(44-04): add error wire format invariant for 8 documented codes |

## Verification

- `pnpm vitest run tests/invariants/error-wire-format.test.ts` → 9/9 pass, 1s.
- Full `pnpm test`: same 6 pre-existing TC-CL-005 failures as before this plan (Wave D target). No new failures.

## Deviations from Plan

### [Rule 3 — Blocking issue] TC-ID namespace collision: used `TC-INV-ERRWIRE-*` instead of `TC-NEG-*`

- **Found during:** Task 1, grepping `TC-NEG-[0-9]+` out of `.planning/v5.0-ARCHITECTURE.md`.
- **Issue:** The plan assumed `TC-NEG-*` IDs in §15 describe error wire format tests. They do not. All 14 existing `TC-NEG-001..014` tokens in ARCHITECTURE.md §15.14 / §15.21 are NEGATIVE-SPACE / non-goal assertions such as:
  - `TC-NEG-003` "No `task_id` column on actual_entries or allocation_proposals in v5.0"
  - `TC-NEG-006` "No email or external notification code paths"
  - `TC-NEG-008` "No counter-propose endpoint in v5.0"
  - `TC-NEG-011..012` "Eslint-enforced — no direct date-fns / db.update outside allowlisted files"
  These assert features that intentionally do NOT exist. They have nothing to do with `handleApiError()` wire format.
- **Fix:** Used a parallel `TC-INV-ERRWIRE-*` namespace, matching the `TC-INV-ERRTAX` pattern already established by 44-01's static taxonomy invariant. The 8 documented codes get 8 numbered TC-INV-ERRWIRE IDs (001..008). Wave C's manifest generator will pick them up as `TC-INV-*` invariants alongside `TC-INV-ERRTAX`.
- **Why this preserves plan intent:** The plan's must_haves are still satisfied:
  1. "For each of the 8 documented error codes, there exists at least one passing test asserting the HTTP status and the `code` field on the wire" → YES, 8 tests.
  2. "Wire shape is flat: `{ error, message, details? }`" → YES, asserted via exact key-set check.
  3. "Tests import the code constants from `src/lib/errors/codes.ts` — no magic strings" → YES.
  The only change is the TC-ID token at the front of each test title, and the plan's listed pattern regex (`HISTORIC_CONFIRM_REQUIRED|BAD_HOURS|...`) still matches every test title.
- **Impact on Wave C (44-06):** Wave C needs to extract both `TC-NEG-*` (from §15 non-goal assertions, coverage by existing static tests) and `TC-INV-*` (from new invariant files). `TC-INV-ERRWIRE-*` fits naturally in the latter bucket.
- **Files modified:** `tests/invariants/error-wire-format.test.ts` (new file).
- **Commit:** 2cf8a13.

### Minor — constructor arity

- The plan's example code used `new HistoricConfirmRequiredError({ date: '2025-12-31' })`, but the real constructor signature shipped in 44-01 is `(message?: string, details?: Record<string, unknown>)` — matching the established `ProposalNotActiveError` pattern. All subclass calls were adjusted to pass `undefined` for the message override and the details object as the second arg. No behavioral change; plan acknowledged this signature style in its own RESEARCH.

## Known Stubs

None — pure test file, no runtime or UI wiring.

## Self-Check: PASSED

- FOUND: tests/invariants/error-wire-format.test.ts
- FOUND: commit 2cf8a13
- VERIFIED: `pnpm vitest run tests/invariants/error-wire-format.test.ts` → 9 passed
- VERIFIED: 8 distinct `TC-INV-ERRWIRE-NNN` tokens in test titles, 1 per documented code
- VERIFIED: imports from `@/lib/errors/codes` (no magic strings)
