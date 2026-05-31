# Phase 56 — Change-log enum expansion — SUMMARY

**Status:** COMPLETE (2026-05-31) · **Requirements:** CHLOG-01, CHLOG-02, CHLOG-03
**Tier:** production · all gates green (regression via documented override; dependency_audit 0/0/0/0)

## What shipped

`scenario`, `scenario_allocation`, and `import_session` mutations are now on the universal
`change_log` audit spine — the last three `@no-change-log` escape hatches are gone.

### CHLOG-01 — enum expansion (`migration 0010`)
- `src/db/schema.ts`: `change_log_entity` += `scenario`, `scenario_allocation`, `import_session`;
  `change_log_action` += `SCENARIO_CREATED/UPDATED/DELETED`, `SCENARIO_ALLOCATIONS_UPSERTED`,
  `IMPORT_SESSION_STAGED/CANCELLED`.
- `drizzle/migrations/0010_change_log_scenario_import_session.sql` — hand-written idempotent
  `ALTER TYPE ... ADD VALUE IF NOT EXISTS` (× 9), breakpointed, mirroring the `0008` precedent.
  Journaled as idx 9.
- **Why hand-written:** `drizzle-kit generate` diffs against the frozen `0006` snapshot (the repo
  stopped maintaining snapshots after `0006`; `0007`/`0008`/`0009_lean` are all raw-SQL). It
  therefore tried to replay all drift since `0006`, including a non-idempotent `ADD VALUE 'program'`
  (already live) and `archived_at` columns/indexes that already exist — which would error on a real
  DB. The hand-written idempotent migration is the safe, precedent-consistent path.

### CHLOG-02 — service wiring
| Function | entity | action |
|---|---|---|
| `createScenario` (now tx-wrapped for ADR-003) | scenario | SCENARIO_CREATED |
| `updateScenario` | scenario | SCENARIO_UPDATED (before/after) |
| `deleteScenario` | scenario | SCENARIO_DELETED |
| `upsertScenarioAllocations` (+`userId` param) | scenario_allocation | SCENARIO_ALLOCATIONS_UPSERTED (one row/op; `created`/`updated`/`total` in context) |
| `parseAndStageActuals` | import_session | IMPORT_SESSION_STAGED |
| `cancelStaged` (+`userId` param) | import_session | IMPORT_SESSION_CANCELLED |

Routes threaded for the actor: scenarios allocations `PUT` upgraded `getTenantId()` →
`requireRole('planner')`; imports `[sessionId]` `DELETE` passes `userId`. Commit stays audited
under `import_batch` (`ACTUALS_BATCH_COMMITTED`) — **no double-logging at commit** (confirmed
design decision).

### CHLOG-03 — manifest
`tests/invariants/mutations.json` regenerated → **no diff**: these six functions were always
listed as mutations (the manifest inventories mutating functions, not their compliance). Phase 56
moved them from `@no-change-log`-exempt to genuinely compliant; the eslint `require-change-log`
rule now passes for each. `pnpm check:mutations-manifest` green.

## Tests
- New `src/features/change-log/__tests__/phase-56-enum-expansion.contract.test.ts` — per-entity
  contract tests (scenario, scenario_allocation, import_session) + a full smoke flow asserting one
  row per entity with the correct action. 6 tests.
- Updated three import tests whose `change_log` totals now include the staging row — scoped their
  assertions to the relevant action/entity rather than the raw count (preserving the original
  "exactly one aggregate commit row" intent).
- **Suite: 1101 passed** (was 1095; +6). Only `imports.api.test.ts` fails — the pre-existing
  env-harness suite (Phase 58 / QUAL-04..06), verified identical to baseline; regression override
  recorded in `56-GATES.md`.

## Verification
`pnpm typecheck` ✓ · `pnpm lint` (eslint + `check:mutations-manifest`) ✓ · `pnpm test` 1101/1101 ✓ ·
`exec-gates` production tier ✓.

## Outstanding — irreversible step (David)
The committed migration `0010` is **not yet applied to the prod-equivalent branch DB**. Applying
it (`pnpm db:migrate`) is the one irreversible action — Postgres has no `DROP VALUE`, so the six
action + three entity values are permanent once added. The test harness validates the enum inline,
so all tests pass without applying it. Apply to dev + prod-equivalent branches per success
criterion 1 when ready.

## Follow-up (carried from Phase 55)
`vitest.config.ts` still uses deprecated `environmentMatchGlobs` (removed in vitest 4) — migrate to
`test.projects` before any vitest 4 bump. (Logged again here; surfaced as a deprecation warning on
every test run.)
