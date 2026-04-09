---
phase: 44
plan: "05"
subsystem: test-invariants
tags: [tenancy, runtime, invariants, api-v5, security]
requires:
  - tests/invariants/tenant-isolation.static.test.ts (44-03)
  - src/app/api/v5/**/route.ts (existing)
  - PGlite pattern from src/app/api/v5/proposals/__tests__/routes.test.ts
provides:
  - TC-API-TENANT-001..011 runtime cross-tenant 404 prober
  - tests/invariants/mutating-routes.json manifest (consumed by Wave C tc-manifest generator)
  - Tenant hardening of approveProposal / rejectProposal (pre-flight existence check)
  - Tenant hardening of createRegisterRow FK validation (person/project cross-org FK refs)
affects:
  - Any future mutating /api/v5/* route must be added to mutating-routes.json
  - Existing TC-API-011/012/014 proposal routes tests (regression-verified green)
  - Register admin contract tests (regression-verified green)
tech-stack:
  added: []
  patterns:
    - Parameterized runtime invariant test over JSON manifest
    - Pre-flight tenant-scoped SELECT before conditional UPDATE (approve/reject)
    - FK tenant-ownership validation inside transaction (register create)
key-files:
  created:
    - tests/invariants/mutating-routes.json
    - tests/invariants/tenant-isolation.runtime.test.ts
    - .planning/phases/44-api-hardening-and-test-contract-fill/44-05-SUMMARY.md
  modified:
    - src/features/proposals/proposal.service.ts (approveProposal + rejectProposal tenant pre-flight)
    - src/features/admin/register.service.ts (createRegisterRow FK tenant validation)
decisions:
  - Manifest excludes src/app/api/v5/imports/parse/route.ts — it creates a fresh import_session with no pre-existing target row, so cross-tenant semantics are not meaningful there (covered by existing imports.api.test.ts). Remaining 11 mutating handlers are included, hitting the plan's ≥ 11 floor exactly.
  - Plan's proposed routes (planning/allocations POST, planning/allocations/[id] DELETE) do not exist in the v5 codebase — only PATCH is exported on allocations/[id] and GET on allocations/. Manifest reflects actual handler exports.
  - Rule 2 deviations (existence-leak via 409 on proposal state transitions; cross-tenant FK poisoning in createRegisterRow) fixed inline rather than deferred — these are security-relevant spec deviations and the fixes are additive (no behavioral changes for single-tenant flows).
metrics:
  duration: ~8min
  completed: 2026-04-09
  tasks: 2
  files: 5
---

# Phase 44 Plan 05: Runtime cross-tenant 404 prober Summary

Parameterized Vitest runtime invariant over `tests/invariants/mutating-routes.json`. For each of the 11 mutating `/api/v5/*` handlers it seeds an ORG_B-owned target row in PGlite, resolves auth to ORG_A via `vi.mock('@/lib/auth')`, invokes the dynamically imported handler with the ORG_B id in params/body, and asserts status === 404. Runtime complement to the static audit from 44-03. Together they close API-V5-02 per CONTEXT decision §4.

## What Shipped

- **`tests/invariants/mutating-routes.json`** — 11-entry manifest. Fields per entry: `routeFile`, `method`, `requiresRow`, `rowFixture`, `sampleBody`, `pathParams`. Placeholders `orgB:*` are resolved to concrete UUIDs by the test.
- **`tests/invariants/tenant-isolation.runtime.test.ts`** — 332-line parameterized prober. Reuses the PGlite + `vi.mock('@/db')` + `vi.mock('@/lib/auth')` pattern from `src/app/api/v5/proposals/__tests__/routes.test.ts`; no new helper files. Generates 11 `it("TC-API-TENANT-NNN …")` blocks so the Wave C TC-ID manifest generator will pick them up.
- **Tenant hardening in `proposal.service.ts`** — `approveProposal` and `rejectProposal` now do a pre-flight tenant-scoped `SELECT` on `allocation_proposals` before their conditional `UPDATE … WHERE orgId=X AND id=Y AND status='proposed'`. A cross-tenant caller now gets `404 NotFoundError` instead of `409 PROPOSAL_NOT_ACTIVE` (which leaked the "row exists but in wrong state" distinction from "row does not exist in this tenant").
- **FK tenant validation in `register.service.ts`** — `createRegisterRow` now verifies that person.{disciplineId,departmentId} and project.{programId,leadPmPersonId} belong to `input.orgId` before insert. Without this a caller in orgA could create a person referencing orgB's department/discipline — the row itself would live in orgA (not a direct cross-tenant write), but it would encode a cross-tenant link, defeating row-level isolation. Unknown-in-this-tenant FK targets now throw `NotFoundError` (404) so existence is not leaked.

## Routes Covered (11)

| #   | Route                                                     | Method | Result |
| --- | --------------------------------------------------------- | ------ | ------ |
| 001 | proposals/route.ts                                        | POST   | 404    |
| 002 | proposals/[id]/approve/route.ts                           | POST   | 404    |
| 003 | proposals/[id]/reject/route.ts                            | POST   | 404    |
| 004 | proposals/[id]/resubmit/route.ts                          | POST   | 404    |
| 005 | proposals/[id]/withdraw/route.ts                          | POST   | 404    |
| 006 | imports/[sessionId]/commit/route.ts                       | POST   | 404    |
| 007 | imports/batches/[batchId]/rollback/route.ts               | POST   | 404    |
| 008 | planning/allocations/[id]/route.ts                        | PATCH  | 404    |
| 009 | admin/registers/[entity]/route.ts (entity=person)         | POST   | 404    |
| 010 | admin/registers/[entity]/[id]/route.ts (entity=person)    | PATCH  | 404    |
| 011 | admin/registers/[entity]/[id]/route.ts (entity=person)    | DELETE | 404    |

## Verification

```
pnpm vitest run tests/invariants/tenant-isolation.runtime.test.ts
  → 11 passed (11)

pnpm vitest run \
  tests/invariants/tenant-isolation.static.test.ts \
  tests/invariants/tenant-isolation.runtime.test.ts \
  src/features/proposals/__tests__ \
  src/app/api/v5/imports/__tests__ \
  src/app/api/v5/admin/registers/[entity]/__tests__/contract.test.ts \
  src/features/admin/__tests__/register.integration.test.ts \
  src/app/api/v5/proposals/__tests__/routes.test.ts
  → 87 passed (87) / 0 failed
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Security] Existence leak via 409 on proposal state transitions**

- **Found during:** Task 2 first test run (TC-API-TENANT-002, 003)
- **Issue:** `approveProposal` / `rejectProposal` did a single conditional UPDATE with `WHERE orgId=X AND id=Y AND status='proposed'`. Cross-tenant calls missed this WHERE and returned `409 PROPOSAL_NOT_ACTIVE`, leaking the semantic difference between "row exists but in wrong state" and "row does not exist in this tenant". CONTEXT decision §4 requires 404 to avoid leaking existence.
- **Fix:** Added a pre-flight tenant-scoped SELECT in the same transaction. Row not found under `(orgId, id)` → `NotFoundError` (404). Row found but wrong state → `ProposalNotActiveError` (409). Preserves TC-API-014 (double-approve of a legit proposal still returns 409).
- **Files modified:** `src/features/proposals/proposal.service.ts`
- **Commit:** `5d72347`

**2. [Rule 2 — Security] Cross-tenant FK poisoning in register create**

- **Found during:** Task 2 first test run (TC-API-TENANT-009, originally 500, then 201)
- **Issue:** `createRegisterRow` inserted the row with `organization_id = input.orgId` but did not validate that `disciplineId` / `departmentId` (for person) or `programId` / `leadPmPersonId` (for project) belonged to the same org. A caller in orgA could create an orgA-owned person referencing orgB's department/discipline — the row lives in orgA but encodes a cross-tenant link, defeating row-level isolation.
- **Fix:** Added per-entity FK validation inside the transaction before the insert. Unknown-in-this-tenant FK throws `NotFoundError` (404).
- **Files modified:** `src/features/admin/register.service.ts`
- **Commit:** `5d72347`

**3. [Rule 3 — Blocking] Plan referenced nonexistent routes**

- **Found during:** Task 1 manifest drafting
- **Issue:** Plan body said to include `planning/allocations POST` and `planning/allocations/[id] DELETE`. Neither handler is exported in the v5 codebase — only `GET` on `allocations/` and only `PATCH` on `allocations/[id]`.
- **Fix:** Manifest includes `allocations/[id] PATCH` only; other 10 slots filled from the real v5 route inventory. Total is exactly 11 (the plan's floor).
- **Files modified:** `tests/invariants/mutating-routes.json`
- **Commit:** `784d005`

**4. [Rule 3 — Blocking] `imports/parse` excluded from manifest**

- **Found during:** Task 1 manifest drafting
- **Issue:** Plan listed `imports/parse POST` but it creates a *fresh* `import_session` with no pre-existing target row — cross-tenant semantics are not meaningful there (there is nothing in orgB to target). Including it would force an artificial test that doesn't reflect the invariant.
- **Fix:** Documented in the manifest `$comment` and SUMMARY. Tenant isolation of `imports/parse` is covered by the cross-tenant assertion in `src/app/api/v5/imports/__tests__/imports.api.test.ts` which already runs green.
- **Commit:** `784d005`

### Out-of-scope observations (not fixed)

- **TC-CL-005 stub gap (6 failing sub-tests in `tests/invariants/change-log.coverage.test.ts`)** — unchanged from 44-03's observation. Pre-diagnosed, scheduled for Wave D TC-CL-005 harness repair plan. Not touched.

## Commits

- `784d005` chore(44-05): add mutating-routes.json manifest (11 v5 routes)
- `5d72347` fix(44-05): tenant-isolation hardening — 404 not 409/201 on cross-tenant
- `aeb8065` test(44-05): add TC-API-TENANT runtime cross-tenant 404 prober

## Self-Check: PASSED

- FOUND: tests/invariants/mutating-routes.json
- FOUND: tests/invariants/tenant-isolation.runtime.test.ts
- FOUND: src/features/proposals/proposal.service.ts (modified)
- FOUND: src/features/admin/register.service.ts (modified)
- FOUND: 784d005
- FOUND: 5d72347
- FOUND: aeb8065
