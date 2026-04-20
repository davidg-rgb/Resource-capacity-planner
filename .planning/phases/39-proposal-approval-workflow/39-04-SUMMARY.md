---
phase: 39-proposal-approval-workflow
plan: 04
subsystem: proposals
tags: [backend, proposals, resubmit, change-log]
requires:
  - 39-02 (createProposal, types, schemas, recordChange)
provides:
  - resubmitProposal(ResubmitProposalInput): ProposalDTO
affects:
  - future: 39-09 "My Wishes" panel will call resubmitProposal
tech-stack:
  added: []
  patterns:
    - "Clone-on-resubmit: original rejected row stays immutable; new row carries parent_proposal_id"
    - "Live department re-snapshot on resubmit (PROP-07)"
key-files:
  created:
    - src/features/proposals/__tests__/proposal.service.resubmit.test.ts
  modified:
    - src/features/proposals/proposal.service.ts
decisions:
  - "Forward-declared 39-03 imports (`ne`, `_applyAllocationUpsertsInTx`, `ProposalNotActiveError`) suppressed with targeted eslint-disable comments instead of deletion, to avoid breaking the parallel wave-2 plan 39-03."
metrics:
  duration: ~10min
  tasks: 1
  files: 2
  tests_added: 6
  completed: 2026-04-08
requirements: [PROP-06]
---

# Phase 39 Plan 04: Resubmit Proposal Summary

Implemented `resubmitProposal` on top of the 39-02 proposal service — clones a rejected `allocation_proposals` row into a brand-new `'proposed'` row with `parent_proposal_id` set, re-snapshots `target_department_id` from live `people.department_id`, and emits a `PROPOSAL_SUBMITTED` change_log entry carrying `context.resubmittedFrom` for audit-chain linkage.

## What Changed

- **`src/features/proposals/proposal.service.ts`** — added `ResubmitProposalInput` interface and `resubmitProposal()` exported function. Runs inside a single `db.transaction` so the new row and its change_log entry are atomic. Guards:
  - Parent row must exist in same org → `NotFoundError('Proposal', id)`
  - Parent status must be `'rejected'` → `ValidationError('INVALID_STATE')`
  - Caller must match `parent.requested_by` → `ForbiddenError`
- **`src/features/proposals/__tests__/proposal.service.resubmit.test.ts`** — 6 PGlite contract tests covering TC-PR-011a..e plus a PROP-07 live-department re-snapshot case.

## Tests

All 6 tests green (`npx vitest run src/features/proposals/__tests__/proposal.service.resubmit.test.ts`):

- TC-PR-011a: happy path — rejected parent cloned, original untouched, new row has `status='proposed'` and `parent_proposal_id=parent.id`
- TC-PR-011b: resubmit with `proposedHours`/`note` edits carried through
- TC-PR-011c: resubmit on still-`proposed` parent → `INVALID_STATE`
- TC-PR-011d: resubmit by a different user → `ERR_FORBIDDEN`
- TC-PR-011e: change_log row has `action='PROPOSAL_SUBMITTED'` and `context.resubmittedFrom === parent.id`
- PROP-07: person department change between reject and resubmit → new row's `targetDepartmentId` and `liveDepartmentId` both reflect the new department

Typecheck (`npx tsc --noEmit`): clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing unused imports from 39-02 scaffolding blocked lint-gate husky hook**

- **Found during:** final commit
- **Issue:** `proposal.service.ts` already imported `ne`, `_applyAllocationUpsertsInTx`, and `ProposalNotActiveError` from the 39-02 scaffolding commit `86f78eb` as forward-declarations for the parallel wave-2 plan 39-03 (approve/reject). ESLint `@typescript-eslint/no-unused-vars` now treats them as errors and the husky `pre-commit` script blocked the commit.
- **Fix:** Added targeted `eslint-disable-next-line` comments so the imports remain in place for 39-03 to pick up without clashing with the parallel plan's executor. Not deleted, to avoid racing against the 39-03 executor.
- **Files modified:** `src/features/proposals/proposal.service.ts`
- **Commit:** `321cdaa`

## Commits

- `321cdaa` feat(39-04): implement resubmitProposal with parent chain

## Self-Check: PASSED

- FOUND: src/features/proposals/proposal.service.ts (contains `resubmitProposal`, `parentProposalId: parent.id`, `resubmittedFrom`)
- FOUND: src/features/proposals/__tests__/proposal.service.resubmit.test.ts
- FOUND: commit 321cdaa
- Tests: 6/6 passing
- Typecheck: clean
