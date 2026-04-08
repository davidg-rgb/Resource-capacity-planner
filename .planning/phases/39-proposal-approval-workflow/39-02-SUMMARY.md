---
phase: 39-proposal-approval-workflow
plan: 02
subsystem: proposals
tags: [proposals, edit-gate, change-log, PROP-03, PROP-07, PROP-08]
requires:
  - src/db/schema.ts::allocationProposals
  - src/features/change-log/change-log.service.ts::recordChange
  - src/features/personas/persona.types.ts::Persona
provides:
  - src/features/proposals/proposal.types.ts
  - src/features/proposals/proposal.schema.ts
  - src/features/proposals/edit-gate.ts::resolveEditGate
  - src/features/proposals/proposal.service.ts::{createProposal,listProposals,withdrawProposal}
  - src/lib/errors.ts::ProposalNotActiveError
affects:
  - src/features/personas/persona.types.ts (extended pm variant with optional homeDepartmentId)
tech-stack:
  added: []
  patterns:
    - "Pure decision helpers — no DB/I/O/clock; current month passed in"
    - "PROP-07 live-join routing — snapshot column is audit-only"
key-files:
  created:
    - src/features/proposals/proposal.types.ts
    - src/features/proposals/proposal.schema.ts
    - src/features/proposals/edit-gate.ts
    - src/features/proposals/proposal.service.ts
    - src/features/proposals/__tests__/edit-gate.test.ts
    - src/features/proposals/__tests__/proposal.service.create.test.ts
  modified:
    - src/lib/errors.ts
    - src/features/personas/persona.types.ts
decisions:
  - "resolveEditGate is pure: caller passes currentMonth, no clock access (testability + SSR safety)"
  - "Persona.pm extended with optional homeDepartmentId — Plan 39-01 will populate it from people.departmentId at persona-build time. Until then, pm without homeDepartmentId routes to 'proposal' (safe default)."
  - "listProposals filters on schema.people.departmentId (live), not allocationProposals.targetDepartmentId (snapshot). Snapshot is preserved in DTO under targetDepartmentId for audit only."
metrics:
  duration: ~25min
  completed: 2026-04-08
---

# Phase 39 Plan 02: Proposal feature scaffolding Summary

Stood up `src/features/proposals/` with types, Zod schemas, the pure `resolveEditGate()` decision helper, and the first three service methods (`createProposal`, `listProposals`, `withdrawProposal`) — plus `ProposalNotActiveError` for Wave 2.

## What Shipped

1. **Types + Schemas + Error**
   - `ProposalStatus`, `EditGateDecision`, `CreateProposalInput`, `ListProposalsFilter`, `ProposalDTO`, `WithdrawProposalInput`
   - Zod schemas: `createProposalInputSchema`, `listProposalsFilterSchema`, `withdrawProposalInputSchema`
   - `ProposalNotActiveError` (HTTP 409, code `PROPOSAL_NOT_ACTIVE`)

2. **Pure edit-gate helper** (`resolveEditGate`)
   - Inputs: persona, target person (id + departmentId), month, currentMonth — no I/O
   - 10 unit tests TC-PS-001..010 covering pm/line-manager/staff/rd/admin × current/historic
   - PROP-08 covered: line-manager in own dept → `direct`

3. **proposal.service.ts**
   - `createProposal` reads live `people.department_id` inside the tx, snapshots it into `target_department_id`, inserts the proposal row, and writes a `PROPOSAL_SUBMITTED` change_log row in the same tx
   - `listProposals` JOINs `schema.people` and filters on **live** `people.department_id` for PROP-07 routing — the snapshot column is exposed in the DTO as `targetDepartmentId` (audit) alongside `liveDepartmentId` (routing)
   - `withdrawProposal` flips `proposed → withdrawn` only when the caller equals `requested_by`, with `PROPOSAL_WITHDRAWN` change_log; throws `ForbiddenError` / `ValidationError(INVALID_STATE)` otherwise
   - 7 PGlite contract tests (TC-PR-001..003 + filter test + 3 withdraw paths) all green

## Verification

- `npx vitest run src/features/proposals/__tests__/edit-gate.test.ts` → 10/10 pass
- `npx vitest run src/features/proposals/__tests__/proposal.service.create.test.ts` → 7/7 pass
- `npx tsc --noEmit` → clean
- PROP-07 explicitly verified: test moves the person from DEPT_OLD to DEPT_NEW after the proposal exists; `listProposals({departmentId: DEPT_OLD})` returns empty, `listProposals({departmentId: DEPT_NEW})` returns the row with `targetDepartmentId=DEPT_OLD` and `liveDepartmentId=DEPT_NEW`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Persona.pm lacked homeDepartmentId**
- **Found during:** Task 2
- **Issue:** The plan's `resolveEditGate` body references `persona.homeDepartmentId`, but `Persona` (src/features/personas/persona.types.ts) only declared `personId/displayName` for the `pm` variant. Type would not compile.
- **Fix:** Extended the `pm` variant with optional `homeDepartmentId?: string`. Existing call sites (persona-switcher.tsx and persona context tests) still compile because the field is optional. The gate falls back to `'proposal'` when `homeDepartmentId` is undefined, which is the safe default until Plan 39-01 wires the persona builder to populate it from `people.department_id`.
- **Files modified:** src/features/personas/persona.types.ts
- **Commit:** fee451a

**2. [Rule 1 - Spec drift] Plan truth referenced `people.default_department_id`**
- **Found during:** Task 3
- **Issue:** Plan frontmatter `must_haves.truths` mentions `people.default_department_id`, but `src/db/schema.ts` defines the column as `department_id` (drizzle field `departmentId`). There is no `default_department_id` column.
- **Fix:** Used the actual schema column. PROP-07 live-join is correctly wired against `schema.people.departmentId`.
- **Files modified:** none (used the real column)

### Deferred Issues
None.

## Authentication Gates
None.

## Key Decisions Logged
- Pure helper takes `currentMonth` as input (no clock access — server caller passes from `getServerNowMonthKey()`, client caller passes from `getCurrentMonth()`).
- DTO carries both `targetDepartmentId` (snapshot, audit) and `liveDepartmentId` (live, routing) so callers never have to re-query.

## Known Stubs
None — Plan 39-02 deliberately stops short of approve/reject/resubmit. Those arrive in 39-03/39-04.

## Self-Check: PASSED
- FOUND: src/features/proposals/proposal.types.ts
- FOUND: src/features/proposals/proposal.schema.ts
- FOUND: src/features/proposals/edit-gate.ts
- FOUND: src/features/proposals/proposal.service.ts
- FOUND: src/features/proposals/__tests__/edit-gate.test.ts
- FOUND: src/features/proposals/__tests__/proposal.service.create.test.ts
- FOUND commit: bbf0837 (types/schemas/error)
- FOUND commit: fee451a (edit-gate + tests)
- FOUND commit: c3c1d60 (proposal.service + tests)
