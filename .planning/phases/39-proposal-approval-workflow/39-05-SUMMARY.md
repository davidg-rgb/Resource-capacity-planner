---
phase: 39-proposal-approval-workflow
plan: 05
subsystem: api/v5/proposals
tags: [api, proposals, approval-workflow, v5]
requirements: [PROP-04, PROP-05, PROP-06, PROP-07]
requires: [39-02, 39-03, 39-04]
provides:
  - "POST /api/v5/proposals"
  - "GET  /api/v5/proposals"
  - "POST /api/v5/proposals/[id]/approve"
  - "POST /api/v5/proposals/[id]/reject"
  - "POST /api/v5/proposals/[id]/resubmit"
  - "POST /api/v5/proposals/[id]/withdraw"
  - "GET  /api/v5/proposals/[id]/impact"
affects: [UI Plan 39-08 approval queue, UI Plan 39-07 My Wishes]
tech_stack:
  added: []
  patterns:
    - "Thin route → service wrapper (mirrors v5 imports commit route)"
    - "Zod body/query parse + handleApiError envelope"
    - "requireRole('planner') gate + body.departmentId validated live in service"
key_files:
  created:
    - src/app/api/v5/proposals/route.ts
    - src/app/api/v5/proposals/[id]/approve/route.ts
    - src/app/api/v5/proposals/[id]/reject/route.ts
    - src/app/api/v5/proposals/[id]/resubmit/route.ts
    - src/app/api/v5/proposals/[id]/withdraw/route.ts
    - src/app/api/v5/proposals/[id]/impact/route.ts
    - src/app/api/v5/proposals/__tests__/routes.test.ts
  modified: []
decisions:
  - "Auth gate is requireRole('planner') everywhere; Clerk has no lineManager role. Approve/reject require body.departmentId which the service validates against live people.department_id. Server proves 'planner+ AND claim matches live target dept', not 'is THE line manager of dept X'. Documented in each route's JSDoc per orchestrator directive."
  - "List route does not re-authorize departmentId — client supplies persona.departmentId; tenant isolation via orgId is sufficient per ADR-004 (personas are UX-only)."
  - "Impact route is read-only: one aggregate SUM on allocations for (person, month), one row lookup for (person, project, month) existing; before/after math done in the handler. No change_log."
metrics:
  duration: "~15 min"
  completed: "2026-04-08"
  tasks_completed: 3
  files_created: 7
  commits: 2
---

# Phase 39 Plan 39-05: Proposals API Routes Summary

Six thin route handlers under `/api/v5/proposals/*` wire the existing proposal.service functions (createProposal, listProposals, approveProposal, rejectProposal, resubmitProposal, withdrawProposal) into the Next.js App Router, plus a read-only `[id]/impact` endpoint for the approval queue preview numbers.

## What was built

| Route                              | Method | Service                                      |
| ---------------------------------- | ------ | -------------------------------------------- |
| `/api/v5/proposals`                | POST   | `createProposal` (201 + ProposalDTO)         |
| `/api/v5/proposals`                | GET    | `listProposals` (live-dept join, PROP-07)    |
| `/api/v5/proposals/[id]/approve`   | POST   | `approveProposal` with callerClaimedDept      |
| `/api/v5/proposals/[id]/reject`    | POST   | `rejectProposal` with reason guard           |
| `/api/v5/proposals/[id]/resubmit`  | POST   | `resubmitProposal` (proposer-only)           |
| `/api/v5/proposals/[id]/withdraw`  | POST   | `withdrawProposal` (proposer-only)           |
| `/api/v5/proposals/[id]/impact`    | GET    | inline read: sumAll - existingTriple + hours |

Every handler follows the verbatim v5 template: `requireRole('planner')` → Zod parse → service call → `NextResponse.json` → `handleApiError(error)`.

## Authorization trade-off (documented in each route JSDoc)

Clerk's role hierarchy is viewer < planner < admin < owner — there is no `lineManager` role. The v5.0 approach:

1. `requireRole('planner')` gates every proposal route (read and write)
2. approve/reject additionally require `body.departmentId` (uuid)
3. `approveProposal` / `rejectProposal` re-read the target person's LIVE `people.department_id` inside the transaction and throw `ForbiddenError` on mismatch

Conclusion: the server proves "caller has planner+ role AND the proposal's live target dept matches the body claim". It does NOT prove "caller IS THE line manager of dept X". Accepted per ADR-004 (personas are UX-only).

## Impact endpoint shape

```json
{
  "personMonthPlannedBefore": 40,
  "personMonthPlannedAfter": 90,
  "proposedHours": 50,
  "personName": "Anna Tester",
  "month": "2026-06"
}
```

The UI assembles the canonical sentence "Anna's June utilization 40% → 90%" client-side (REQUIREMENTS line 45) in Plan 39-08.

## Tests (TC-API-010..014) — all passing

| TC         | Scenario                                                  | Status |
| ---------- | --------------------------------------------------------- | ------ |
| TC-API-010 | POST create → 201 ProposalDTO + list route sees it        | PASS   |
| TC-API-011 | POST approve matching dept → 200 + allocation row         | PASS   |
| TC-API-012 | POST approve stale dept → 403 `ERR_FORBIDDEN` envelope    | PASS   |
| TC-API-013 | POST reject empty reason → 400 `ERR_VALIDATION` envelope  | PASS   |
| TC-API-014 | POST double approve → 409 `PROPOSAL_NOT_ACTIVE` envelope  | PASS   |

Harness mirrors `src/app/api/v5/imports/__tests__/imports.api.test.ts`: PGlite + drizzle, `vi.mock('@/db')`, `vi.mock('@/lib/auth')` with a mutable `fakeAuth`, route handlers invoked directly (no HTTP layer).

## Deviations from Plan

None — plan executed exactly as written. Only minor adjustment: the impact route uses `_request` (underscore prefix) to silence the unused-param lint rule for the GET handler that takes no request body.

## Self-Check: PASSED

- src/app/api/v5/proposals/route.ts — FOUND
- src/app/api/v5/proposals/[id]/approve/route.ts — FOUND
- src/app/api/v5/proposals/[id]/reject/route.ts — FOUND
- src/app/api/v5/proposals/[id]/resubmit/route.ts — FOUND
- src/app/api/v5/proposals/[id]/withdraw/route.ts — FOUND
- src/app/api/v5/proposals/[id]/impact/route.ts — FOUND
- src/app/api/v5/proposals/__tests__/routes.test.ts — FOUND
- Commit 2e37dd5 (routes) — FOUND
- Commit 2f81c50 (tests) — FOUND
- Typecheck: PASS
- 5/5 tests PASS
