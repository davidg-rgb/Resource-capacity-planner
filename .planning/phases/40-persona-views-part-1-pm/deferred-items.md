# Phase 40 — Deferred Items

Found during Plan 40-05 full vitest run (Wave 4 test coverage sweep). These
failures are NOT caused by Phase 40 changes and are out of scope per the
executor's scope-boundary rule (fix only what the current plan's changes
directly break).

## TC-CL-005 — actuals services missing recordChange coverage

**Test file:** `tests/invariants/change-log.coverage.test.ts`
**Date logged:** 2026-04-08

Three assertions in the universal change-log coverage invariant fail:

1. `src/features/actuals/actuals.service.ts :: upsertActuals calls recordChange`
2. `src/features/import/actuals-import.service.ts :: commitActualsBatch calls recordChange`
3. `src/features/import/actuals-import.service.ts :: rollbackBatch calls recordChange`

The invariant mechanically spies on `recordChange` and asserts each listed
mutating service invokes it at least once. Failures indicate either:

- The services never wrote to `change_log` (regression / missed Phase 35
  wiring), OR
- The invariant's discovery list is outdated vs. the current service surface.

Neither `actuals.service.ts` nor `actuals-import.service.ts` were touched in
Phase 40; these failures are pre-existing and predate Plan 40-05. Phase 44
(API hardening + test contract fill, per ROADMAP.md) is the natural home for
this fix — universal change_log coverage is a v5.0 launch gate that phase
already owns.

**Recommended action:** Open a Phase 44 sub-task "wire recordChange into
actuals + actuals-import mutation paths" with cross-refs to ADR-003
(every mutation writes change_log in same tx) and TC-CL-005.
