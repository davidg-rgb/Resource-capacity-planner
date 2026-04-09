---
phase: 44-api-hardening-and-test-contract-fill
plan: 01
subsystem: errors
tags: [api-v5, error-taxonomy, invariants, wave-a]
requires: []
provides:
  - "8 documented AppError codes exported from single barrel"
  - "7 new AppError subclasses (HistoricConfirmRequired, BadHours, ReasonRequired, BatchAlreadyRolledBack, RollbackWindowExpired, DependentRowsExist, UsWeekHeaders)"
  - "TC-INV-ERRTAX static invariant blocking raw Error in v5 routes + services"
affects: []
tech-stack:
  added: []
  patterns: ["barrel module for error codes", "static filesystem-walk invariants"]
key-files:
  created:
    - src/lib/errors/codes.ts
    - tests/invariants/error-taxonomy.static.test.ts
  modified:
    - src/lib/errors.ts
decisions:
  - "AppError base constructor is (message, code, statusCode, details) — subclass constructors adapted; plan example order was swapped, base class untouched per plan constraint"
  - "Subclasses take optional message override (matching existing ProposalNotActiveError pattern) rather than hardcoding message — keeps API consistent"
metrics:
  duration: "~6 min"
  completed: 2026-04-09
  tasks: 3
  commits: 3
---

# Phase 44 Plan 01: AppError Taxonomy Extension Summary

Extended the v5 API error taxonomy with 7 new `AppError` subclasses covering the 8 documented error codes required by API-V5-01, routed through a new single-barrel `src/lib/errors/codes.ts`, and locked it in with a `TC-INV-ERRTAX` static invariant forbidding raw `throw new Error(...)` under `/api/v5/**` and `src/features/**/*.service.ts`.

## What Shipped

- `src/lib/errors/codes.ts` — new barrel exporting 8 `as const` string literals (`HISTORIC_CONFIRM_REQUIRED`, `BAD_HOURS`, `PROPOSAL_NOT_ACTIVE`, `REASON_REQUIRED`, `BATCH_ALREADY_ROLLED_BACK`, `ROLLBACK_WINDOW_EXPIRED`, `DEPENDENT_ROWS_EXIST`, `ERR_US_WEEK_HEADERS`) plus `DocumentedErrorCode` union type.
- `src/lib/errors.ts` — 7 new subclasses appended, each extending `AppError` and passing the matching code constant + documented HTTP status. Flat `toJSON()` wire shape (`{ error, message, details? }`) untouched.
- `tests/invariants/error-taxonomy.static.test.ts` — fs-walk invariant generating a per-file `it()` case; uses `TC-INV-ERRTAX` title token for manifest extraction.

## Commits

| Task | Commit  | Description                                              |
| ---- | ------- | -------------------------------------------------------- |
| 1    | 1bbc14f | feat(44-01): add errors/codes barrel with 8 v5 codes     |
| 2    | a1cefc8 | feat(44-01): add 7 documented AppError subclasses        |
| 3    | d622a6f | test(44-01): add TC-INV-ERRTAX static invariant          |

## Verification

- `pnpm tsc --noEmit` — exits 0 after every task.
- `pnpm test` — 528 tests pass; only pre-existing TC-CL-005 6 failures remain, which are tracked as deferred from Phase 43 and scheduled for repair in Wave D. None of the 6 failures involve code this plan touched.
- New static invariant file runs clean on current codebase (no raw `throw new Error` under v5 routes or feature services).
- grep confirms all 8 codes exported from `src/lib/errors/codes.ts` and 7 new `class ...Error` declarations present in `src/lib/errors.ts`.

## Deviations from Plan

### Constructor signature adaptation (plan note honored)

The plan example code used `super(CODE, 'message', status, details)` signature, but the real `AppError` base is `super(message, code, statusCode, details)`. Per plan instructions ("If the existing `AppError` constructor signature differs, adapt subclass constructors to match — NEVER change the base class."), subclass constructors were adapted to the existing signature. No behavioral change.

Also followed the existing `ProposalNotActiveError` pattern of accepting an optional `message` override (first arg) plus `details` — keeps the new subclasses API-consistent with the one already in production.

Otherwise, plan executed exactly as written.

## Known Stubs

None — this plan is pure types + invariant, no runtime/UI wiring involved.

## Self-Check: PASSED

- FOUND: src/lib/errors/codes.ts
- FOUND: src/lib/errors.ts (modified)
- FOUND: tests/invariants/error-taxonomy.static.test.ts
- FOUND: commit 1bbc14f
- FOUND: commit a1cefc8
- FOUND: commit d622a6f
