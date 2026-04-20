---
phase: 39-proposal-approval-workflow
verified: 2026-04-08T12:18:00Z
status: passed
score: 6/6 must-haves verified
---

# Phase 39: Proposal / Approval Workflow Verification Report

**Phase Goal:** PM-wish → Line-Manager-approval state machine with routing, audit trail, and resubmit-from-rejected.
**Verified:** 2026-04-08
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Requirements PROP-03..08)

| #  | Truth (Requirement) | Status | Evidence |
| -- | ------------------- | ------ | -------- |
| 1  | PROP-03: PM out-of-dept edits become proposals (proposal-mode cell, Submit wish, edit-gate) | VERIFIED | `edit-gate.ts` resolveEditGate, `proposal-cell.tsx`, `cell-editors/proposal-cell-editor.tsx`, dispatched in `allocation-grid.tsx` via cellEditorSelector; `proposal-cell.test.tsx` 4/4 green; createProposal route POST /api/v5/proposals returns DTO |
| 2  | PROP-04: Line manager approval queue with impact preview + approve/reject | VERIFIED | `/line-manager/approval-queue/page.tsx` mounts `<ApprovalQueue>`; `ui/approval-queue.tsx`, `ui/wish-card.tsx`, `ui/reject-modal.tsx`; impact phrase via GET /api/v5/proposals/[id]/impact; `approval-queue.test.tsx` 3/3 green |
| 3  | PROP-05: Approve writes through to allocations + dual change_log audit | VERIFIED | `approveProposal` in proposal.service.ts:336 — conditional UPDATE winner, calls `_applyAllocationUpsertsInTx` in same tx, emits PROPOSAL_APPROVED + ALLOCATION_EDITED with `context.via='proposal'`; `proposal.service.approve.test.ts` 9/9 + `concurrency.test.ts` 1/1 (TC-PR-013 exactly-one-winner) |
| 4  | PROP-06: PM My Wishes filterable by state with resubmit-from-rejected | VERIFIED | `/wishes/page.tsx` mounts `<MyWishesPanel proposerId={userId}>`; `ui/my-wishes-panel.tsx` (3 tabs); `resubmitProposal` clones with parent_proposal_id; POST /api/v5/proposals/[id]/resubmit; `my-wishes-panel.test.tsx` 5/5 + `resubmit.test.ts` 6/6 |
| 5  | PROP-07: Routing follows live people.department_id at submit + approve | VERIFIED | listProposals JOINs live `people.department_id` (snapshot is audit-only); approveProposal re-reads dept and throws ForbiddenError on mismatch; e2e dept-move scenario in `proposal.service.e2e.test.ts` test 3 green |
| 6  | PROP-08: Line manager in-dept = direct, out-of-dept = proposal | VERIFIED | `resolveEditGate` rules in `edit-gate.ts` with 10 unit tests in `edit-gate.test.ts` covering pm/lm/staff/rd/admin in-dept and out-of-dept |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `src/features/allocations/allocation.service.ts` (`_applyAllocationUpsertsInTx`) | VERIFIED | 369 lines; helper exported and called by both `batchUpsertAllocations` wrapper and `proposal.service.approveProposal` (grep confirms 2 files use it) |
| `src/features/proposals/proposal.service.ts` | VERIFIED | 553 lines; exports createProposal, listProposals, withdrawProposal, resubmitProposal, approveProposal, rejectProposal — all six lifecycle methods present |
| `src/features/proposals/proposal.schema.ts` / `proposal.types.ts` / `edit-gate.ts` | VERIFIED | 38 / 62 / 49 lines; Zod schemas, DTOs, pure decision helper |
| `src/features/proposals/use-proposals.ts` | VERIFIED | 192 lines; hooks for list/create/approve/reject/impact/resubmit/withdraw |
| `src/features/proposals/ui/{proposal-cell,wish-card,reject-modal,approval-queue,my-wishes-panel}.tsx` | VERIFIED | All 5 components present (93/86/76/120/169 lines) |
| `src/components/grid/cell-editors/proposal-cell-editor.tsx` + renderer | VERIFIED | Wired into `allocation-grid.tsx` and `grid-config.ts` via cellEditorSelector |
| `src/app/api/v5/proposals/route.ts` (+ [id]/{approve,reject,resubmit,withdraw,impact}/route.ts) | VERIFIED | All 6 routes exist; each imports the matching service function (grep confirms 5 [id] subroutes + main route call services) |
| `src/app/(app)/line-manager/approval-queue/page.tsx` | VERIFIED | 31 lines; imports and mounts `<ApprovalQueue departmentId={persona.departmentId}>` |
| `src/app/(app)/wishes/page.tsx` | VERIFIED | 30 lines; imports and mounts `<MyWishesPanel proposerId={userId}>` |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| approval-queue page | ApprovalQueue component | named import + JSX mount | WIRED |
| wishes page | MyWishesPanel component | named import + JSX mount | WIRED |
| API approve route | proposal.service.approveProposal | imported, called | WIRED |
| API reject/resubmit/withdraw/list/create routes | corresponding service fns | imported, called | WIRED |
| approveProposal | _applyAllocationUpsertsInTx | same-tx call (no nested transaction) | WIRED |
| approveProposal | recordChange (PROPOSAL_APPROVED + ALLOCATION_EDITED) | dual emission with context.via='proposal' | WIRED (verified by approve.test.ts TC-PR-005/006) |
| AllocationGrid | ProposalCellEditor/Renderer | cellEditorSelector dispatch in grid-config | WIRED |
| ApprovalQueue rows | useProposalImpact → /api/v5/proposals/[id]/impact | per-row react-query | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| All proposal service + API tests pass | `npx vitest run src/features/proposals/__tests__/ src/app/api/v5/proposals/__tests__/` | 10 files / 54 tests passed in 6.6s | PASS |
| TC-PR-013 exactly-one-winner concurrency | included in concurrency.test.ts | 1/1 pass | PASS |
| Full lifecycle e2e (4 scenarios incl. PROP-07 dept-move + supersession) | proposal.service.e2e.test.ts | 4/4 pass | PASS |
| Edit-gate pure decision matrix | edit-gate.test.ts | 10/10 pass | PASS |

### Requirements Coverage

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| PROP-03 | SATISFIED | Truth #1 — proposal-cell + edit-gate + create route + tests |
| PROP-04 | SATISFIED | Truth #2 — approval-queue page/component + impact route + tests |
| PROP-05 | SATISFIED | Truth #3 — approveProposal write-through + dual change_log + concurrency winner |
| PROP-06 | SATISFIED | Truth #4 — MyWishesPanel + resubmitProposal cloning + tests |
| PROP-07 | SATISFIED | Truth #5 — live JOIN routing + e2e dept-move test |
| PROP-08 | SATISFIED | Truth #6 — resolveEditGate matrix + tests |

### Anti-Patterns Found

None blocking. Spot-checks on service files show no TODO/FIXME/placeholder/empty-handler patterns flowing to user-visible output. Plan 39-07 noted a deliberate inline English month table that was replaced in Plan 39-09 i18n sweep (resolved).

### Human Verification Required

Plan 39-10 documented a 20-step manual walkthrough (persona switching, ag-grid out-of-department editor, reject modal, resubmit flow on running dev server). Per the verify_phase block, the user has already approved this human checkpoint, so no outstanding human items remain.

### Gaps Summary

None. All six PROP requirements are satisfied with substantive implementations, end-to-end wiring from UI pages → React-Query hooks → API routes → service functions → DB writes + change_log audit, and a green automated test suite of 54 tests including the load-bearing TC-PR-013 concurrency proof and a 4-scenario lifecycle e2e covering PROP-07 dept-move and sibling supersession.

---

_Verified: 2026-04-08T12:18:00Z_
_Verifier: Claude (gsd-verifier)_
