---
phase: 39-proposal-approval-workflow
plan: 03
subsystem: proposals
tags: [proposals, approval, change-log, concurrency, PROP-05, PROP-07]
requires: [39-01, 39-02]
provides: [approveProposal, rejectProposal]
affects: [allocation_proposals, allocations, change_log]
tech-stack:
  added: []
  patterns:
    - "Conditional UPDATE ... WHERE status='proposed' RETURNING as single-point-of-serialization for concurrent approvals"
    - "Dual change_log emission in one tx: entity='proposal' + entity='allocation' with context.via='proposal'"
    - "Sibling supersession in same tx via ne(id, winner.id) on (person, project, month)"
key-files:
  created:
    - src/features/proposals/__tests__/proposal.service.approve.test.ts
    - src/features/proposals/__tests__/proposal.service.concurrency.test.ts
  modified:
    - src/features/proposals/proposal.service.ts
decisions:
  - "Hours rounded with Math.round when writing through to allocations (allocations.hours is integer; proposed_hours is numeric(5,2))"
  - "No expectedUpdatedAt passed to _applyAllocationUpsertsInTx on approve path — approve is authoritative and we already hold the row via the conditional proposal UPDATE"
metrics:
  duration: "~18 minutes"
  completed: "2026-04-08"
---

# Phase 39 Plan 39-03: approveProposal + rejectProposal Summary

One-liner: PROP-05 / PROP-07 approve flow — conditional-UPDATE winner, sibling supersession, in-tx write-through to allocations via `_applyAllocationUpsertsInTx`, and dual PROPOSAL_APPROVED + ALLOCATION_EDITED change_log emission; proven by a TC-PR-013 concurrency test using `Promise.allSettled`.

## What shipped

- `approveProposal(input)` in `src/features/proposals/proposal.service.ts`
  - Step 1: `UPDATE allocation_proposals SET status='approved' ... WHERE id=? AND status='proposed' RETURNING *`. Zero rows → `ProposalNotActiveError`.
  - Step 2: Live re-read `people.department_id` (PROP-07). Mismatch with `callerClaimedDepartmentId` → `ForbiddenError`.
  - Step 3: Supersede sibling proposed rows on same (person, project, month) via `ne(id, winner.id)` and emit `PROPOSAL_WITHDRAWN` change_log rows with `context={reason:'superseded_by', winnerId}`.
  - Step 4: Snapshot prior `allocations.hours` (for change_log previousValue).
  - Step 5: `_applyAllocationUpsertsInTx(tx, orgId, [...])` — shared tx, no nested `db.transaction`.
  - Step 6: `PROPOSAL_APPROVED` change_log row (entity='proposal').
  - Step 7: `ALLOCATION_EDITED` change_log row (entity='allocation', `context.via='proposal'`, `context.proposalId`).
- `rejectProposal(input)`: validates non-empty reason ≤1000 chars, flips proposed→rejected, emits `PROPOSAL_REJECTED` in same tx, enforces PROP-07 live dept check.

## Tests (10 passing)

`proposal.service.approve.test.ts` (9 tests):
- TC-PR-004: approve happy path + write-through
- TC-PR-005: exactly one PROPOSAL_APPROVED row
- TC-PR-006: exactly one ALLOCATION_EDITED row with `context.via='proposal'`
- TC-PR-007: stale dept claim → ForbiddenError (person moved dept)
- TC-PR-008: reject empty reason → REASON_REQUIRED + reject happy path
- TC-PR-009: reject >1000 chars → REASON_TOO_LONG
- TC-PR-010: double approve → ProposalNotActiveError
- TC-PR-012: 3 sibling proposals, middle one approved, other two superseded, final allocation row = winner's hours

`proposal.service.concurrency.test.ts` (1 test):
- TC-PR-013: `Promise.allSettled([approveProposal, approveProposal])` → exactly 1 fulfilled, 1 rejected with `ProposalNotActiveError` (verified via `toBeInstanceOf`).

## Deviations from Plan

None. Plan executed as written. Plan 39-02's pre-existing `resubmitProposal` function was present in the file (not part of this plan's scope) and was left untouched.

## Self-Check: PASSED

- FOUND: src/features/proposals/proposal.service.ts — contains `approveProposal`, `rejectProposal`, `_applyAllocationUpsertsInTx(tx`, `via: 'proposal'`, `PROPOSAL_APPROVED`, `PROPOSAL_REJECTED`
- FOUND: src/features/proposals/__tests__/proposal.service.approve.test.ts (9 tests, TC-PR-004..012)
- FOUND: src/features/proposals/__tests__/proposal.service.concurrency.test.ts (TC-PR-013)
- Vitest: 10/10 passed
- Typecheck: clean
- Commits: 17d2ff2 (service), plus tests commit
