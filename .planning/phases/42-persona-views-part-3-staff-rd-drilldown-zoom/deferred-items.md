# Phase 42 Deferred Items

## Pre-existing test failures (out of 42-04 scope)

`tests/invariants/change-log.coverage.test.ts` (TC-CL-005) — 3 failing
mutating-service spy assertions, all unrelated to Phase 42-04 surface:

- `src/features/actuals/actuals.service.ts :: upsertActuals calls recordChange`
- `src/features/import/actuals-import.service.ts :: commitActualsBatch calls recordChange`
- `src/features/import/actuals-import.service.ts :: rollbackBatch calls recordChange`

Verified pre-existing on `f479953` (Task 1 commit) by stash + re-run. None of
these files were touched by 42-04. Defer to Phase 44 (API hardening + test
contract fill) or a follow-up patch on actuals/import services. Not a Phase 42
regression.
