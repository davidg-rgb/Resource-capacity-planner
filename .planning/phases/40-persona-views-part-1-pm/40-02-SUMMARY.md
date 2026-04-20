---
phase: 40-persona-views-part-1-pm
plan: 02
subsystem: planning read-model + PM API surface
tags: [wave-1, backend, planning, pm, read-model]
requires:
  - getProjectBurn / aggregateByMonth (features/actuals/actuals.read)
  - listProposals (features/proposals/proposal.service)
  - requireRole (lib/auth)
  - generateMonthRange / getCurrentMonth / normalizeMonth (lib/date-utils)
provides:
  - getPmOverview(args) → PmOverviewResult
  - getPmTimeline(args) → PmTimelineView
  - GET /api/v5/planning/pm-home
  - GET /api/v5/planning/allocations?scope=pm
affects:
  - Unblocks Wave 2 PM Home + PM project timeline pages
tech-stack:
  added: []
  patterns:
    - "planning.read.ts is the first concrete file in src/features/planning (ARCHITECTURE §327)"
    - "Month-key maps (`${personId}::${monthKey}`) merge planned/actual/proposal into CellView"
    - "Thin route handlers — zero inline DB access in route files"
key-files:
  created:
    - src/features/planning/planning.read.ts
    - src/features/planning/__tests__/planning.read.test.ts
    - src/app/api/v5/planning/pm-home/route.ts
    - src/app/api/v5/planning/allocations/route.ts
  modified: []
key-decisions:
  - "pm-home accepts personId as a query param (persona is a UX scope per ADR-004; no clerk→person mapping exists yet)"
  - "projects.code does not exist in schema — PmOverviewCard.project.code is always null for now"
  - "monthRange { from, to } is expanded via a local expandMonthRange helper that wraps generateMonthRange(start, count)"
  - "getProjectBurn is fed a date-range derived from the month range (first-of-month .. last-of-month)"
  - "aggregateByMonth is called with { projectIds, monthKeys } to keep the actuals merge dense-but-pruned"
metrics:
  duration_minutes: 6
  tasks_completed: 2
  files_created: 4
  files_modified: 0
  tests_added: 4
  completed_date: 2026-04-08
requirements:
  - UX-V5-02
---

# Phase 40 Plan 02: planning.read + PM API surface Summary

**One-liner:** Wave 1 delivers the first `src/features/planning/planning.read.ts` file (`getPmOverview` + `getPmTimeline`) plus two thin GET routes that give the upcoming PM Home and project timeline pages a typed, tenant-scoped data source.

## What shipped

1. **`src/features/planning/planning.read.ts`** — new feature folder, pure read helpers composing existing infrastructure:
   - `getPmOverview({ orgId, leadPmPersonId, monthRange })` — loads projects owned by the PM (`projects.lead_pm_person_id`), parallel-fetches `getProjectBurn` + pending `listProposals({ status: 'proposed' })`, returns `{ projects: PmOverviewCard[], defaultProjectId }`. `deltaHours = actual - planned`.
   - `getPmTimeline({ orgId, projectId, monthRange })` — tenant-verifies the project, expands the month range, queries allocations + proposed allocation_proposals + `aggregateByMonth` actuals, and merges them via `${personId}::${monthKey}` maps into a dense `CellView[]` of `people × monthRange`.
   - Throws `NotFoundError` when the project is missing or crosses the org boundary.

2. **PGlite integration test** (`src/features/planning/__tests__/planning.read.test.ts`) — 4/4 passing:
   - `getPmOverview` returns 2 cards for Anna (with burn 40/30 + 1 pending wish on Atlas) and filters out projects owned by a different PM.
   - `getPmOverview` returns `{ projects: [], defaultProjectId: null }` for a PM with zero projects.
   - `getPmTimeline` returns a 13-entry `monthRange` (`2026-05`..`2027-05`), merges planned 40h + actual 30h in the `(Sara, 2026-06)` cell, and surfaces a `pendingProposal` for the same person at `2026-07`.
   - `getPmTimeline` throws for a project in a different org.

3. **`GET /api/v5/planning/pm-home`** (`src/app/api/v5/planning/pm-home/route.ts`) — `requireRole('planner')`; zod query `{ personId: uuid, startMonth?, endMonth? }`; defaults to a 13-month window (`current - 1 .. current + 11`); delegates to `getPmOverview`; `handleApiError` maps errors. Zero business logic in the handler.

4. **`GET /api/v5/planning/allocations`** (`src/app/api/v5/planning/allocations/route.ts`) — `requireRole('planner')`; zod query `{ scope: 'pm', projectId: uuid, startMonth, endMonth }`; delegates to `getPmTimeline`; NotFoundError → 404 via `handleApiError`. Zero business logic in the handler.

## Verification

- `pnpm vitest run src/features/planning/__tests__/planning.read.test.ts` — 4 passed (65 ms)
- `pnpm tsc --noEmit` — clean (zero output)

## Deviations from Plan

**[Rule 3 - Blocking] `/pm-home` accepts `personId` as a query param.**
- **Found during:** Task 2 (reading `requireRole` signature).
- **Issue:** Plan text said "derive `orgId` + `personId` (the authenticated PM's personId)" but `requireRole` returns `{ orgId, userId, role }` — there is no clerk→`people.id` mapping in the codebase, and personas are explicitly UX scopes per ADR-004, not security boundaries.
- **Fix:** Added `personId: uuid()` to the zod query schema; the persona switcher on the client supplies it. Keeps the route a pure data fetch and defers any auth-subject-to-person mapping to a later phase.
- **Files modified:** `src/app/api/v5/planning/pm-home/route.ts`
- **Commit:** `7f22d67`

**[Rule 3 - Blocking] `projects.code` is not a real column.**
- **Found during:** Task 1 (schema read).
- **Issue:** Plan's `PmOverviewCard` interface expects `project.code: string | null`, but `src/db/schema.ts` projects table has no `code` column in v5.0.
- **Fix:** `getPmOverview` always returns `code: null`. The type contract is preserved so Wave 2 UI can treat it as nullable today and a future phase can populate it when the schema grows a code field.
- **Files modified:** `src/features/planning/planning.read.ts`
- **Commit:** `8ecf8ca`

## Authentication Gates

None.

## Known Stubs

- `PmOverviewCard.project.code` is hard-coded to `null` (documented deviation — no schema column to source it from).

## Commits

- `8ecf8ca` feat(40-02): add planning.read with getPmOverview + getPmTimeline
- `7f22d67` feat(40-02): add GET pm-home and GET planning/allocations routes

## Self-Check: PASSED

- FOUND: src/features/planning/planning.read.ts
- FOUND: src/features/planning/__tests__/planning.read.test.ts
- FOUND: src/app/api/v5/planning/pm-home/route.ts
- FOUND: src/app/api/v5/planning/allocations/route.ts
- FOUND: commit 8ecf8ca
- FOUND: commit 7f22d67
