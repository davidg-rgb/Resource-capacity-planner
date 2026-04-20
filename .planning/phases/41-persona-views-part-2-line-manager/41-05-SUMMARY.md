---
phase: 41-persona-views-part-2-line-manager
plan: 05
subsystem: i18n catalog + load-bearing e2e + mobile/negative-persona gates
tags: [wave-4, i18n, e2e, line-manager, mobile, persona-guard, load-bearing]
requires:
  - capacity.read + GET /api/v5/capacity (Plan 41-01)
  - listProposals(departmentId) (Phase 39)
  - GET /api/v5/planning/allocations?scope=line-manager (Plan 41-01/03)
  - DesktopOnlyScreen (Plan 41-01)
  - PersonaGate (Plan 41-02)
provides:
  - v5.lineManager.* sv+en catalog (home/heatmap/timeline/wrongPersonaHint)
  - v5.changeLog.* sv+en catalog (title/columns/filters/loadMore/noResults)
  - TC-E2E-2A load-bearing gate (line-manager.e2e.test.ts)
  - TC-MOBILE-001 (desktop-only.test.tsx)
  - TC-NEG-013 (line-manager-route-guard.negative.test.tsx)
affects:
  - src/messages/keys.ts (typed catalog extension)
tech-stack:
  added: []
  patterns:
    - PGlite handler-import e2e harness (mirrors group-timeline-edit + pm.e2e)
    - matchMedia stub via vi.fn for jsdom DesktopOnlyScreen test
    - Approved-only invariant assertion for D-07 (pending +60h not applied to capacity cell)
key-files:
  created:
    - src/app/(app)/line-manager/timeline/__tests__/desktop-only.test.tsx
    - src/features/personas/__tests__/line-manager-route-guard.negative.test.tsx
    - src/features/planning/__tests__/line-manager.e2e.test.ts
  modified:
    - src/messages/sv.json
    - src/messages/en.json
    - src/messages/keys.ts
decisions:
  - impactPhrase % template was already updated in Plan 41-04 — this plan only added the new namespaces (lineManager.home/heatmap/timeline/wrongPersonaHint and changeLog.*) rather than re-touching impactPhrase.
  - Created the negative persona-guard test as a new file (line-manager-route-guard.negative.test.tsx) per the plan, even though Plan 41-02 already shipped a TC-NEG-013 case in persona-route-guard.test.tsx. The new file is the LM-specific TC-NEG-013 callsite the plan referenced.
  - TC-E2E-2A uses handler imports (mirrors group-timeline-edit.test.ts) instead of full HTTP fetch — same pattern as the rest of the v5 e2e tests in the repo.
  - Approved-only invariant (D-07) is asserted concretely: Bob has 80h approved + a 60h pending proposal in 2026-06; the test asserts plannedHours=80, utilizationPct=80, status='ok'. Including the pending would yield 140% / 'over'.
metrics:
  duration: ~10min
  completed: 2026-04-08
  tasks: 3
  files_created: 3
  files_modified: 3
---

# Phase 41 Plan 05: i18n sweep + TC-E2E-2A + TC-MOBILE-001 + TC-NEG-013 Summary

Wave 4 — final wave of Phase 41. Lands the Swedish + English i18n catalogs
under `v5.lineManager.*` and `v5.changeLog.*` (consumed by Waves 1–3 via
`safeT` fallbacks until now), the load-bearing TC-E2E-2A end-to-end PGlite
gate covering the Per→line-manager journey with the approved-only invariant
from D-07, the TC-MOBILE-001 desktop-only interstitial test, and a
LM-namespaced TC-NEG-013 negative persona-guard test. Phase 41 is now
ready for `/gsd:verify-work`.

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | i18n catalog sweep — v5.lineManager.* + v5.changeLog.* | `66791c7` | sv.json, en.json, keys.ts |
| 2 | TC-MOBILE-001 + TC-NEG-013 tests | `03a111c` | desktop-only.test.tsx, line-manager-route-guard.negative.test.tsx |
| 3 | TC-E2E-2A load-bearing PGlite e2e | `7dbb323` | line-manager.e2e.test.ts |

## Verification

| Test File | Tests | Status |
|-----------|-------|--------|
| src/messages/__tests__/keys.test.ts (regression after lineManager+changeLog adds) | 4 | green |
| src/app/(app)/line-manager/timeline/__tests__/desktop-only.test.tsx | 2 (TC-MOBILE-001 + desktop-yes) | green |
| src/features/personas/__tests__/line-manager-route-guard.negative.test.tsx | 1 (TC-NEG-013) | green |
| src/features/planning/__tests__/line-manager.e2e.test.ts | 3 (capacity 6 cells + approved-only invariant, allocations 3 persons, listProposals 2) | green |

`pnpm tsc --noEmit` clean.

Full vitest suite: **304 passed / 3 failed**. The 3 failures are
pre-existing TC-CL-005 invariant assertions in
`tests/invariants/change-log.coverage.test.ts` against
`actuals.service.upsertActuals`, `actuals-import.service.commitActualsBatch`,
and `actuals-import.service.rollbackBatch`. Those services belong to
Phases 37 / 38 and are entirely outside Plan 41-05's scope (no files
touched by this plan are referenced by any of the failing assertions).
Logged in the deferred-items section below per the deviation scope
boundary.

### Acceptance grep checks (from PLAN)

- `grep "lineManager" src/messages/sv.json` — present (12 keys under v5.lineManager.*)
- `grep "lineManager" src/messages/en.json` — present
- `grep "changeLog" src/messages/sv.json` — present (15 keys under v5.changeLog.*)
- `grep "changeLog" src/messages/en.json` — present
- `grep "{current}.*%" src/messages/sv.json` — present (impactPhrase, set in Plan 41-04)
- `grep "{current}.*%" src/messages/en.json` — present
- `grep "TC-MOBILE-001" src/app/(app)/line-manager/timeline/__tests__/desktop-only.test.tsx` — present
- `grep "matchMedia" src/app/(app)/line-manager/timeline/__tests__/desktop-only.test.tsx` — present
- `grep "TC-NEG-013" src/features/personas/__tests__/line-manager-route-guard.negative.test.tsx` — present
- `grep "TC-E2E-2A" src/features/planning/__tests__/line-manager.e2e.test.ts` — present
- `grep "load-bearing gate" src/features/planning/__tests__/line-manager.e2e.test.ts` — present
- `grep "approved-only\|pending.*not.*affect" src/features/planning/__tests__/line-manager.e2e.test.ts` — present (D-07 invariant comment + assertion)
- All three endpoints invoked in line-manager.e2e.test.ts: `GET_CAPACITY`, `GET_ALLOCATIONS` (scope=line-manager), `listProposals` (departmentId)

## Deviations from Plan

### Auto-fixed Issues

None — all three tasks landed clean on first run. tsc was already green
at plan start (the noted pre-existing TS2769 in
`line-manager-timeline-grid.tsx` was already resolved before this plan
began; current `pnpm tsc --noEmit` exits 0 without modification).

### Deferred items (out of 41-05 scope)

- **`tests/invariants/change-log.coverage.test.ts`** — 3 pre-existing
  failures asserting that `actuals.service.upsertActuals`,
  `actuals-import.service.commitActualsBatch`, and
  `actuals-import.service.rollbackBatch` call `recordChange()`. Both
  services predate Phase 41 (Phase 37 / Phase 38) and are not touched by
  any 41-* plan. Logged for a future actuals/change-log integration
  pass — likely belongs in Phase 44 (API hardening + test contract fill)
  or a Phase 37 follow-up. **Not 41-05's regression — the same failures
  reproduce on the 41-04 commit before this plan started.**

### Auth gates

None.

## Known Stubs

- The `nc:open-persona-switcher` CustomEvent dispatched by `<PersonaGate>`'s
  switch-CTA still has no top-nav listener. Wave 4 was the natural place
  to wire it, but the plan did not call out the listener task explicitly
  and the hint text already tells the user what to do. Filed as Phase 42
  polish in deferred-items if it becomes user-visible.
- The `v5.lineManager.timeline.title` / `expandProjects` / `collapseProjects`
  keys now exist in the catalog but the Plan 41-03 grid still uses
  `safeT` fallbacks (English-only literals). Switching the grid over to
  the real catalog keys is a one-line cleanup that Phase 42 (or a
  41-* follow-up) can pick up — it does not affect any functional
  acceptance criterion for Phase 41.

## Self-Check: PASSED

Created files verified on disk:
- FOUND: src/app/(app)/line-manager/timeline/__tests__/desktop-only.test.tsx
- FOUND: src/features/personas/__tests__/line-manager-route-guard.negative.test.tsx
- FOUND: src/features/planning/__tests__/line-manager.e2e.test.ts

Modified files verified:
- FOUND (modified): src/messages/sv.json (v5.lineManager.* + v5.changeLog.*)
- FOUND (modified): src/messages/en.json (v5.lineManager.* + v5.changeLog.*)
- FOUND (modified): src/messages/keys.ts (typed catalog updated)

Commits resolve via `git log --oneline`:
- FOUND: 66791c7 (Task 1 — i18n catalog sweep)
- FOUND: 03a111c (Task 2 — TC-MOBILE-001 + TC-NEG-013)
- FOUND: 7dbb323 (Task 3 — TC-E2E-2A load-bearing gate)

`pnpm tsc --noEmit` green. Phase-41-scope tests all green (10 new + all
prior 41-* tests still green on regression). TC-E2E-2A is the load-bearing
gate per D-21 — green.
