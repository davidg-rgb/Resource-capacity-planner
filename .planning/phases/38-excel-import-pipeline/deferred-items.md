# Phase 38 — Deferred Items

## TC-CL-005 (change-log.coverage invariant) — pre-existing brittleness

**Status:** Pre-existing failure on master before Plan 38-02 (upsertActuals
already failed). Plan 38-02 inherits the failure for two new entries
(commitActualsBatch, rollbackBatch) because they follow the SAME pattern as
upsertActuals (read existing rows → write → recordChange in tx).

**Root cause:** `tests/invariants/change-log.coverage.test.ts` mocks `@/db`
with a minimal stub that only supports `db.insert(...).values(...).returning()`.
Service code that calls `db.select` / `db.transaction` / `db.update` first
throws BEFORE reaching `recordChange`, so the spy never fires. Additionally
the spy is set on the namespace import `* as changeLogService` while services
import `recordChange` directly — ESM bindings break the spy interception.

**Why it wasn't fixed in Plan 38-02:**
- Pre-existing on master (verified by `git stash + checkout 349f5da -- src`).
- Out of scope for Plan 38-02 (test infrastructure, not import-pipeline code).
- Real coverage IS provided: `actuals-import-service.contract.test.ts` and
  `rollback-supersession.contract.test.ts` exercise both new functions
  end-to-end against pglite and assert the change_log row count.

**Suggested fix (separate plan):**
1. Replace the `@/db` stub with a permissive Proxy that resolves any drizzle
   chain to `[]` (also supporting `.transaction(cb) → cb(proxy)`).
2. Switch the spy from a namespace spy to a `vi.mock` of
   `@/features/change-log/change-log.service` exporting a `vi.fn()`
   `recordChange` so the ESM binding picks it up.
3. Confirm upsertActuals + commitActualsBatch + rollbackBatch all pass.

**Affected test entries:**
- `src/features/actuals/actuals.service.ts :: upsertActuals`
- `src/features/import/actuals-import.service.ts :: commitActualsBatch`
- `src/features/import/actuals-import.service.ts :: rollbackBatch`
