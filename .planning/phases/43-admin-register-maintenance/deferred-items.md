# Phase 43 — Deferred items

## Pre-existing TC-CL-005 runtime invariant failure (out-of-scope for 43-04)

**File:** `tests/invariants/change-log.coverage.test.ts`
**Status at HEAD before 43-04:** already failing 6/6 (confirmed via `git stash` check — no local changes were in scope).

**Failure mode:** The test stubs `@/db` with `{ insert: () => ({ values: () => ({ returning: async () => [{}] }) }) }` and then dynamically imports each mutating service listed in `tests/invariants/mutations.json`. It calls the exported function and expects `recordChange` to have been spied-called at least once. All 6 listed mutations fail:

- `actuals.service.ts :: upsertActuals`
- `admin/register.service.ts :: createRegisterRow`
- `admin/register.service.ts :: updateRegisterRow`
- `admin/register.service.ts :: archiveRegisterRow`
- `import/actuals-import.service.ts :: commitActualsBatch`
- `import/actuals-import.service.ts :: rollbackBatch`

**Root cause (hypothesis, not investigated):** All six listed services wrap their writes in `db.transaction(async (tx) => { ... recordChange(input, tx) })`. The invariant test's db stub does not provide a `transaction` method, so the import/invocation throws a `TypeError: db.transaction is not a function` before `recordChange` is ever reached. The `try/catch` around the invocation swallows this silently, so the spy simply never gets called.

**Why deferred:** This is pre-existing — not introduced by 43-04. Fixing it would require expanding the stub (`db.transaction: (fn) => fn(stubTx)`) or refactoring the invariant to use PGlite, either of which is out-of-scope under Rule 3's "only fix issues directly caused by this plan" clause. Plan 43-04 ships a complementary STATIC check (`src/features/change-log/__tests__/mutations-manifest.test.ts`, 4 tests, all green) that asserts the three register mutations are present in the manifest. The runtime invariant should be repaired in Phase 44 (API hardening) or a dedicated test-infrastructure plan.

**Recommended fix for future plan:** Extend the `@/db` mock in `tests/invariants/change-log.coverage.test.ts` to include a `transaction(fn)` method that calls `fn(stubTx)` and returns the result, so services written against `db.transaction(...)` can be invoked through the invariant runner.
