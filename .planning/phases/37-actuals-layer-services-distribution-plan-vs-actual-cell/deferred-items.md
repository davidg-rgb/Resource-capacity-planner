# Phase 37 — Deferred Items

## Pre-existing test failure (out of scope for 37-02)

**Test:** `tests/invariants/change-log.coverage.test.ts` — TC-CL-005
**Case:** `src/features/actuals/actuals.service.ts :: upsertActuals calls recordChange`
**Status:** Pre-existing in 37-01 (verified by running on clean tree at commit 0ebc9d0).
**Reason:** The runtime spy invariant cannot detect `recordChange` because the
service imports it from `@/features/change-log/change-log.service` and the
test's spy installation order does not catch the bound reference. The static
ESLint rule `nordic/require-change-log` does enforce this at lint time, and the
contract tests in `src/features/actuals/__tests__/upsert-actuals.contract.test.ts`
verify a row is written to `change_log` end-to-end. Belongs to Phase 35 / 37-01
follow-up, not 37-02.
