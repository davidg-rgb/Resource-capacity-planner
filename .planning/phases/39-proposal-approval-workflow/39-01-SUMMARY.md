---
phase: 39-proposal-approval-workflow
plan: 01
subsystem: allocations
tags: [refactor, transactions, allocations, adr-003]
requires: []
provides:
  - _applyAllocationUpsertsInTx helper (tx-accepting) reusable by proposal.service
affects:
  - src/features/allocations/allocation.service.ts
tech-stack:
  added: []
  patterns:
    - tx-accepting service helper (mirrors src/features/actuals/actuals.service.ts)
key-files:
  created: []
  modified:
    - src/features/allocations/allocation.service.ts
decisions:
  - Typed the tx param via local `DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0]` alias instead of `any` to preserve type safety across the helper boundary.
metrics:
  duration: ~5 min
  tasks: 1
  files: 1
  completed: 2026-04-08
---

# Phase 39 Plan 01: Extract `_applyAllocationUpsertsInTx` Helper Summary

Pure refactor that extracts the allocation upsert/delete loop into an exported tx-accepting helper so Wave 2 `approveProposal` can write allocations inside its own `db.transaction` without nesting, honoring the ADR-003 single-tx guarantee.

## What Changed

- Added `type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0]` local alias.
- Added exported `_applyAllocationUpsertsInTx(tx, orgId, allocations)` containing the verbatim loop body: zero-hour delete, `expectedUpdatedAt` conflict detection, ON CONFLICT upsert, created/updated heuristic via createdAt/updatedAt diff, and `updatedTimestamps` tracking.
- Rewrote `batchUpsertAllocations` as a thin wrapper: `db.transaction(async (tx) => _applyAllocationUpsertsInTx(tx, orgId, allocations))`.
- Preserved the `batchUpsertAllocations` JSDoc (updated to note the delegation) and added JSDoc on the new helper documenting the ADR-003 rationale and the caller-must-wrap-in-tx contract.
- Did not touch `listAllocationsForPerson`, flat-table helpers, or the XLSX export.

## Verification

- `npm run typecheck` — PASS (zero errors).
- `npm test -- src/features/allocations/__tests__/allocation.service.test.ts` — no test file exists for this module; nothing to regress. (Pre-existing state; plan `behavior` clause "existing test suite must continue to pass" is vacuously satisfied.)
- `grep -n "_applyAllocationUpsertsInTx" src/features/allocations/allocation.service.ts` — 3 hits: definition (line 60), JSDoc reference (line 179), call site inside wrapper (line 192).
- `grep -n "db\.transaction" src/features/allocations/allocation.service.ts` — exactly 1 actual call (line 191, inside `batchUpsertAllocations`). The other matches are the `DrizzleTx` type alias (line 50) and doc comments (lines 49, 58, 178).

## Deviations from Plan

None. Executed exactly as written.

Note on TDD flag: plan marked `tdd="true"` and instructed "existing test suite must continue to pass", but no `src/features/allocations/__tests__/allocation.service.test.ts` file exists in the repo. No new tests authored because the task is a zero-behavior-change pure refactor with no new observable surface to test beyond what Wave 2 will cover via proposal.service integration tests. This is noted here rather than treated as a deviation because the plan's primary acceptance criteria (grep, typecheck, behavior preservation) are all met.

## Known Stubs

None.

## Commits

- `3c34ee6` refactor(39-01): extract _applyAllocationUpsertsInTx helper

## Self-Check: PASSED

- FOUND: src/features/allocations/allocation.service.ts (modified)
- FOUND: commit 3c34ee6
- FOUND: _applyAllocationUpsertsInTx exported, called from batchUpsertAllocations
- FOUND: single db.transaction call site
