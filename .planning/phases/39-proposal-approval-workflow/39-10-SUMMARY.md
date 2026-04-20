---
phase: 39-proposal-approval-workflow
plan: 10
subsystem: proposals
tags: [e2e, integration, pglite, lifecycle]
status: automated-complete-pending-human-verify
requires: [39-02, 39-03, 39-04, 39-05, 39-06, 39-07, 39-08, 39-09]
provides: [proposal-lifecycle-e2e-coverage]
key-files:
  created:
    - src/features/proposals/__tests__/proposal.service.e2e.test.ts
  modified: []
decisions:
  - "PROP-07 dept-move simulated via direct UPDATE on people.department_id (no service method until Phase 43)"
  - "All four lifecycle scenarios fit in a single test file with shared PGlite setup mirroring the approve.test.ts schema"
metrics:
  duration: ~5min
  tests-added: 4
  tests-passing: 4
  completed: 2026-04-08
---

# Phase 39 Plan 39-10: Proposal Lifecycle E2E Summary

End-to-end PGlite integration test stitching all five proposal service methods (createProposal, listProposals, approveProposal, rejectProposal, resubmitProposal) into four lifecycle scenarios. Catches integration regressions across plans 39-02..39-08 at the service layer before manual UI verification.

## What Shipped

- `src/features/proposals/__tests__/proposal.service.e2e.test.ts` — 4 tests, all green:
  1. **Full approve lifecycle** — create wish → appears in dept queue → approve → allocation row created with proposed hours → queue no longer shows row → dual change_log (PROPOSAL_SUBMITTED + PROPOSAL_APPROVED + ALLOCATION_EDITED with `context.via='proposal'`).
  2. **Reject + resubmit** — create → reject with reason → original row stays rejected/unchanged → resubmit with new hours → new proposed row carries `parent_proposal_id` → approve resubmission → allocation reflects new hours.
  3. **PROP-07 dept-move routing** — create wish in dept A → direct UPDATE moves person to dept B → `listProposals({departmentId: B})` returns wish (live JOIN) → dept A queue does not → approve as dept A caller throws ForbiddenError → approve as dept B caller succeeds.
  4. **Sibling supersession** — two siblings for same (person, project, month) → approve first → second marked `superseded` → change_log emits `PROPOSAL_WITHDRAWN` with `context.reason='superseded_by'` and `winnerId`.

## Verification

- `npx vitest run src/features/proposals/__tests__/proposal.service.e2e.test.ts` → 4/4 passed (123ms)
- All acceptance criteria from PLAN.md met:
  - `>= 4` test() blocks
  - `PROP-07`, `superseded_by`, `via: 'proposal'` all present
  - Lifecycle proven end to end at the service layer

## Deviations from Plan

None — automated portion executed exactly as written.

## Status: Automated Done, Human Verification Pending

The PLAN's Task 2 is a `checkpoint:human-verify` requiring a 20-step manual walkthrough of the dev server (/line-manager/approval-queue and /wishes pages, persona switching, ag-grid out-of-department editor, reject modal, resubmit flow). This is intentionally not automated and is handed off to the user via the orchestrator checkpoint.

## Self-Check: PASSED

- [x] `src/features/proposals/__tests__/proposal.service.e2e.test.ts` exists
- [x] Commit `8754674` exists in git log
- [x] All 4 tests pass
