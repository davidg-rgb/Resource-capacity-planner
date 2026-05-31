# Phase 56 — Change-log enum expansion

**Requirements:** CHLOG-01, CHLOG-02, CHLOG-03
**Depends on:** Phase 54 (audit-spine in place — DONE, verified `321914c`)
**Branching:** none (commits land on `main`)

## Goal

`scenario`, `scenario_allocation`, and `import_session` mutations stop being silently
`@no-change-log` and start emitting `change_log` audit rows like every other entity, enforced
by the same three mechanisms (eslint rule, mutations manifest, runtime invariant).

## Design decisions (confirmed with David 2026-05-31)

1. **Action enum also expands.** `recordChange` validates `action` against `change_log_action`;
   no existing action fits scenarios/imports. Add 6 permanent values:
   `SCENARIO_CREATED`, `SCENARIO_UPDATED`, `SCENARIO_DELETED`, `SCENARIO_ALLOCATIONS_UPSERTED`,
   `IMPORT_SESSION_STAGED`, `IMPORT_SESSION_CANCELLED`.
2. **Granularity = one row per logical operation.** Bulk `upsertScenarioAllocations` writes ONE
   `scenario_allocation` row with `{ created, updated, deleted }` counts in `context` — not one row
   per allocation.
3. **import_session scope = staged + cancelled.** Commit already audits under `import_batch`
   (`ACTUALS_BATCH_COMMITTED`); we do NOT double-log commit. The two currently-unaudited lifecycle
   transitions (staged, cancelled) get rows under entity `import_session`.
4. **ADR-003 compliance.** `createScenario` becomes transactional so the entity inserts + the
   `change_log` write are atomic (currently non-transactional — latent gap).

## Entity → action → actor map

| Service fn (file) | entity | action | actorPersonaId |
|---|---|---|---|
| `createScenario` (scenario.service.ts) | scenario | SCENARIO_CREATED | userId |
| `updateScenario` | scenario | SCENARIO_UPDATED | userId |
| `deleteScenario` | scenario | SCENARIO_DELETED | userId |
| `upsertScenarioAllocations` | scenario_allocation | SCENARIO_ALLOCATIONS_UPSERTED | userId (threaded) |
| `parseAndStageActuals` (actuals-import.service.ts) | import_session | IMPORT_SESSION_STAGED | input.userId |
| `cancelStaged` | import_session | IMPORT_SESSION_CANCELLED | userId (threaded) |

## Plans

### 56-01 — Enum expansion (CHLOG-01) — Wave 1
- `src/db/schema.ts`: add 3 values to `changeLogEntityEnum`, 6 to `changeLogActionEnum`.
- `src/features/change-log/change-log.schema.ts`: mirror if it re-declares the enums.
- Generate migration `0010_change_log_scenario_import_session.sql` via `pnpm db:generate`;
  verify it emits `ALTER TYPE ... ADD VALUE IF NOT EXISTS` per the `0008` precedent. Hand-fix to
  match precedent (idempotent, breakpointed) if drizzle output diverges.
- Update inline `CREATE TYPE change_log_entity/action AS ENUM (...)` fixtures in every test file
  that declares them (change-log, imports, proposals, actuals, register fixtures) so the test
  harness DB accepts the new values.

### 56-02 — Service wiring (CHLOG-02) — Wave 2 (depends 56-01)
- `scenario.service.ts`: wrap `createScenario` in a tx; add `recordChange`/`withChangeLog` to the
  four mutations; remove their `@no-change-log` hatches.
- `actuals-import.service.ts`: add audit to `parseAndStageActuals` (staged) and `cancelStaged`
  (cancelled); thread `userId` into `cancelStaged`; remove the hatch.
- Routes: `scenarios/[id]/allocations/route.ts` PUT → `requireRole('planner')` to obtain userId,
  pass to `upsertScenarioAllocations`; `v5/imports/[sessionId]/route.ts` DELETE → pass userId to
  `cancelStaged`.

### 56-03 — Tests + manifest (CHLOG-02 verify + CHLOG-03) — Wave 3 (depends 56-02)
- Per-entity contract test (scenario, scenario_allocation, import_session) asserting a
  `change_log` row with the correct `entity` + `action`.
- Smoke test: create scenario → upsert allocations → stage import session → cancel it; assert one
  row per operation with the right entity types.
- `pnpm generate:mutations-manifest`; `pnpm check:mutations-manifest` green; new mutations present.

## Success criteria (verbatim from ROADMAP §56)

1. Migration adds the 3 enum values, applied to dev + prod-equivalent branches.
2. Scenario/import mutations that carried `@no-change-log` now write a row with the correct entity
   type — contract test per entity.
3. `check:mutations-manifest` passes after regeneration; manifest lists the new mutations.
4. `change_log` row count increments correctly for the
   create-scenario → add-allocation → stage/cancel-session smoke test.

## Verification

`pnpm typecheck` · `pnpm lint` (eslint + manifest check) · `pnpm test` (vitest) ·
`exec-gates.mjs` at production tier. The pre-existing `imports.api` env-harness failure is
out of scope (Phase 58).

## Out of scope / irreversible step

Applying the migration to the **prod-equivalent** branch DB (`pnpm db:migrate`) is the one
irreversible action (Postgres has no `DROP VALUE`). Flagged for David — committed migration is
ready; dev/test harness validates the enum inline.
