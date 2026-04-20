---
phase: 40-persona-views-part-1-pm
plan: 01
subsystem: allocations / historic-edit gate
tags: [wave-0, backend, allocations, historic-edit, change-log]
requires:
  - getServerNowMonthKey (lib/server)
  - recordChange (change-log.service)
  - AppError hierarchy (lib/errors)
provides:
  - patchAllocation(args) service
  - HistoricEditNotConfirmedError (409)
  - PATCH /api/v5/planning/allocations/[id]
  - ALLOCATION_HISTORIC_EDITED production write path
affects:
  - Unblocks Wave 1-4 UI work (cell orchestrator, historic-edit dialog)
tech-stack:
  added: []
  patterns:
    - "Shared drizzle tx: load → getServerNowMonthKey → update → recordChange (ADR-003)"
    - "Strict '<' comparison on 'YYYY-MM' string monthKeys — cutoff month is NOT historic"
    - "AppError → HTTP via handleApiError (zero custom status mapping in route)"
key-files:
  created:
    - src/features/allocations/allocation.errors.ts
    - src/app/api/v5/planning/allocations/[id]/route.ts
    - src/features/allocations/__tests__/patch-allocation.contract.test.ts
  modified:
    - src/features/allocations/allocation.service.ts
key-decisions:
  - "confirmedHistoric:true placed in change_log.context (not top-level) so the historic row is queryable via context->>'confirmedHistoric'"
  - "Strict monthKey '<' — cutoff (== server-now) month is editable directly"
  - "Hours is integer per schema; PATCH body enforces z.number().int().min(0)"
  - "Route delegates all historic logic to service; handler is ~20 LOC"
metrics:
  duration_minutes: 5
  tasks_completed: 3
  files_created: 3
  files_modified: 1
  tests_added: 4
  completed_date: 2026-04-08
requirements:
  - UX-V5-11
  - HIST-01
---

# Phase 40 Plan 01: patchAllocation + historic-edit gate Summary

**One-liner:** Wave 0 backend gap fill — new `patchAllocation` service + PATCH route + PGlite contract test that prove the `confirmHistoric` round-trip end-to-end and unblock every Wave 1-4 UI test.

## What shipped

1. **`patchAllocation` service branch** (`src/features/allocations/allocation.service.ts`)
   - Loads the target row scoped to `orgId` → throws `NotFoundError` if missing
   - Calls `getServerNowMonthKey(tx)` inside the tx for a consistent clock source
   - Strict `monthKey < nowMonthKey` historic check
   - Throws `HistoricEditNotConfirmedError` (409) when historic and `confirmHistoric !== true`
   - Updates `allocations.hours` and writes `change_log` in the same drizzle tx per ADR-003
   - `action = 'ALLOCATION_HISTORIC_EDITED'` with `context.confirmedHistoric = true` on the historic confirmed path
   - `action = 'ALLOCATION_EDITED'` with `context.via = 'direct'` on the non-historic path

2. **`HistoricEditNotConfirmedError`** (`src/features/allocations/allocation.errors.ts`)
   - Extends `AppError`, code `HISTORIC_EDIT_NOT_CONFIRMED`, status 409
   - `details: { targetMonthKey, nowMonthKey }` serialised via `AppError.toJSON`

3. **PATCH `/api/v5/planning/allocations/[id]`** (`src/app/api/v5/planning/allocations/[id]/route.ts`)
   - Planner+ role via `requireRole('planner')`
   - Zod body `{ hours: int ≥ 0, confirmHistoric?: boolean }`
   - Delegates to `patchAllocation`; `AppError → HTTP` via `handleApiError`
   - Route contains no business logic — all historic-period logic lives in the service

4. **PGlite contract test** (`src/features/allocations/__tests__/patch-allocation.contract.test.ts`) — 4/4 passing:
   - `TC-API-004a` non-historic edit writes `ALLOCATION_EDITED`
   - `TC-API-004b` historic without flag throws + zero mutation + zero change_log
   - `TC-PS-006` historic with flag writes `ALLOCATION_HISTORIC_EDITED` with full row content (`context.confirmedHistoric=true`, `previousValue.hours=20`, `newValue.hours=80`)
   - cutoff: month == server-now is NOT historic (strict `<`)

## Verification

- `pnpm tsc --noEmit` — clean
- `pnpm vitest run src/features/allocations/__tests__/patch-allocation.contract.test.ts` — 4 passed (1.4s)

## Deviations from Plan

None — plan executed exactly as written. The route uses `requireRole('planner')` + `userId` as `actorPersonId`, mirroring the existing `approve/route.ts` pattern in `src/app/api/v5/proposals/[id]/approve/route.ts`.

## Authentication Gates

None.

## Known Stubs

None.

## Commits

- `3c48e3a` feat(40-01): add patchAllocation service with historic-edit gate
- `7d522bd` feat(40-01): add PATCH /api/v5/planning/allocations/[id] route
- `79da8f1` test(40-01): add patchAllocation contract test (TC-API-004 + TC-PS-006)

## Self-Check: PASSED

- FOUND: src/features/allocations/allocation.errors.ts
- FOUND: src/features/allocations/allocation.service.ts (patchAllocation added)
- FOUND: src/app/api/v5/planning/allocations/[id]/route.ts
- FOUND: src/features/allocations/__tests__/patch-allocation.contract.test.ts
- FOUND: commit 3c48e3a
- FOUND: commit 7d522bd
- FOUND: commit 79da8f1
