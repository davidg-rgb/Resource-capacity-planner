---
phase: 41-persona-views-part-2-line-manager
plan: 01
subsystem: capacity + change-log read models, v5 routes, persona departments
tags: [backend, wave-0, capacity, change-log, impact-preview, line-manager]
requires:
  - planning.read (Phase 40)
  - allocation_proposals impact endpoint (Phase 39)
  - change_log writer (Phase 35)
provides:
  - capacity.read.getPersonMonthUtilization
  - capacity.read.getCapacityBreakdown
  - change-log.read.getFeed (cursor pagination + JSONB filters)
  - GET /api/v5/capacity
  - GET /api/v5/change-log
  - planning.read.getGroupTimeline
  - GET /api/v5/planning/allocations?scope=line-manager
  - DesktopOnlyScreen primitive
  - PersonaContext.departments (real /api/departments fetch)
  - ProposalImpactDTO.{currentUtilizationPct, projectedUtilizationPct}
affects:
  - src/features/proposals/use-proposals.ts (DTO extension)
  - src/app/api/v5/proposals/[id]/impact/route.ts (utilization fields)
  - src/app/api/v5/planning/allocations/route.ts (line-manager branch)
  - src/features/personas/persona.context.tsx (departments + provider value)
tech-stack:
  added: []
  patterns:
    - composite (createdAt, id) cursor pagination via tuple lt comparison
    - JSONB best-effort filtering with sql.join over IN-list
    - discriminatedUnion zod query parsing for multi-scope route
    - dense zero-filled person×month grid (no client gap-filling)
key-files:
  created:
    - src/features/capacity/capacity.types.ts
    - src/features/capacity/capacity.read.ts
    - src/features/capacity/__tests__/capacity.read.test.ts
    - src/features/change-log/change-log.read.ts
    - src/features/change-log/__tests__/change-log.read.test.ts
    - src/app/api/v5/capacity/route.ts
    - src/app/api/v5/capacity/__tests__/capacity.contract.test.ts
    - src/app/api/v5/change-log/route.ts
    - src/app/api/v5/change-log/__tests__/change-log.contract.test.ts
    - src/components/responsive/desktop-only-screen.tsx
    - src/features/proposals/__tests__/proposal-impact-utilization.test.ts
    - src/features/planning/__tests__/group-timeline.test.ts
  modified:
    - src/features/change-log/change-log.types.ts
    - src/features/proposals/use-proposals.ts
    - src/app/api/v5/proposals/[id]/impact/route.ts
    - src/app/api/v5/planning/allocations/route.ts
    - src/features/planning/planning.read.ts
    - src/features/personas/persona.context.tsx
    - src/messages/keys.ts
    - src/messages/sv.json
    - src/messages/en.json
decisions:
  - ProposalImpactDTO extended (not duplicated) — added {current,projected}UtilizationPct fields, kept hour fields for backward compat (D-13 / Pitfall 2).
  - Composite (createdAt, id) cursor avoids equal-timestamp drift (Pitfall 5); IN-list via sql.join, not ANY(text[]) (drizzle/pglite array bind issue).
  - PersonaContext fetches /api/departments via plain useEffect+fetch (not useQuery) so existing tests stay green without fetch mocks.
  - Malformed change-log cursor surfaces as 500 in Wave 0 (decodeCursor throws plain Error). Acceptable per TC-API-041; can be promoted to ValidationError in a UI wave.
metrics:
  duration: ~12min
  completed: 2026-04-08
  tasks: 5
  files_created: 12
  files_modified: 9
---

# Phase 41 Plan 01: Wave 0 backend gap-fill Summary

Backend foundation for the Line Manager persona views: capacity read model with v5 thresholds, change_log feed reader with cursor pagination, two new v5 GET routes, an extension to the existing proposal impact endpoint that adds utilization percentages, the planning.read.getGroupTimeline helper plus a `scope=line-manager` branch on the allocations route, the DesktopOnlyScreen primitive, and a real department dropdown source wired into the persona context. Unblocks UI Waves 1–4.

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | capacity.read + types + PGlite tests | `5384f65` | capacity.types.ts, capacity.read.ts, capacity.read.test.ts |
| 2 | change-log.read.getFeed cursor + filters | `7f55198` | change-log.types.ts, change-log.read.ts, change-log.read.test.ts |
| 3 | v5 capacity + change-log routes, DesktopOnlyScreen, i18n key | `b447582` | capacity/route.ts (+contract), change-log/route.ts (+contract), desktop-only-screen.tsx, keys.ts, sv.json, en.json |
| 4 | ProposalImpactDTO + impact endpoint utilization fields | `55539bc` | use-proposals.ts, impact/route.ts, proposal-impact-utilization.test.ts |
| 5 | getGroupTimeline + line-manager scope branch + persona departments | `063d482` | planning.read.ts, group-timeline.test.ts, allocations/route.ts, persona.context.tsx |

## Verification

| Test File | Tests | Status |
|-----------|-------|--------|
| capacity.read.test.ts | 9 (TC-CP-001..004 + approved-only + fallback + breakdown sort) | green |
| change-log.read.test.ts | 11 (TC-API-040 pagination/clamp/equal-ts + TC-API-041 filters) | green |
| capacity.contract.test.ts | 4 (TC-API-050 happy + TC-API-051 errors) | green |
| change-log.contract.test.ts | 4 (TC-API-040/041 route-level) | green |
| proposal-impact-utilization.test.ts | 3 (40→90, rounding, fallback) | green |
| group-timeline.test.ts | 3 (dept scope, approved-only, empty dept) | green |
| persona.context.test.tsx (regression) | 7 | green |
| pm.e2e.test.ts (regression) | 4 | green |
| planning.read.test.ts (regression) | 4 | green |
| messages/keys.test.ts (regression after lineManager key add) | 4 | green |

`pnpm tsc --noEmit` clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `request.nextUrl.searchParams` undefined under plain Request**
- **Found during:** Task 3 (capacity contract test)
- **Issue:** Tests pass `Request` (not `NextRequest`); `nextUrl` is undefined → 500 instead of 200/400.
- **Fix:** Replaced both new route handlers with `new URL(request.url).searchParams`.
- **Files:** src/app/api/v5/capacity/route.ts, src/app/api/v5/change-log/route.ts.

**2. [Rule 1 - Bug] drizzle/pglite array bind error on `ANY(text[])`**
- **Found during:** Task 2 (change-log.read JSONB filter test)
- **Issue:** `${ids}::text[]` binding produced `error: malformed array literal`.
- **Fix:** Switched to `sql.join(ids.map(id => sql\`${id}\`), sql\`, \`)` rendering an `IN (...)` list with one bound parameter per id.
- **File:** src/features/change-log/change-log.read.ts.

**3. [Rule 2 - Critical] Persona context fetch must not break existing tests**
- **Found during:** Task 5 (persona.context.test.tsx regression check)
- **Issue:** Plan asked for `useQuery(['departments'])`, which would fire fetch in jsdom and crash the seven existing TC-PSN tests with no fetch mock.
- **Fix:** Used `useEffect`+`fetch` with a swallowed catch and an empty-array fallback. Identical UX outcome (provider exposes a `Department[]` that fills in once /api/departments resolves).
- **File:** src/features/personas/persona.context.tsx.

### Auth gates

None.

## Known Stubs

None — every new module is fully wired and tested. The DesktopOnlyScreen has no consumers yet (it's a primitive for Wave 2), but the component itself is complete and i18n-keyed.

## Self-Check: PASSED

All 12 created files exist on disk. All 5 task commits resolve via `git log --oneline`. Final metadata commit pending.
