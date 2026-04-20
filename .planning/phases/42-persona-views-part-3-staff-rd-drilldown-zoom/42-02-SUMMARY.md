---
phase: 42-persona-views-part-3-staff-rd-drilldown-zoom
plan: 02
subsystem: staff-my-schedule
tags: [staff, persona-views, read-model, drawer-wiring, wave-1, parallel-with-42-03]
requires:
  - src/features/planning/planning.read.ts (getPmTimeline / getGroupTimeline patterns)
  - src/features/capacity/capacity.read.ts#getPersonMonthUtilization (D-06 reuse)
  - src/components/drawer/PlanVsActualDrawer.tsx + usePlanVsActualDrawer.tsx (Phase 37 + 42-01 widening)
  - src/components/timeline/PlanVsActualCell.tsx (read-only mode)
  - src/features/personas/persona-route-guard.tsx#PersonaGate (Phase 41)
provides:
  - getStaffSchedule({orgId, personId, monthRange}) read-model helper
  - GET /api/v5/planning/allocations?scope=staff branch
  - StaffTimelineCell read-only wrapper
  - /staff page with PersonaGate + summary strip + drawer wired in 'daily' mode
  - v5.staff.* i18n keys (sv + en + keys.ts)
  - TC-PSN staff scope, TC-API-001 scope=staff, TC-E2E-3A green
affects:
  - Phase 42 Wave 3 R&D portfolio (same scope-branch + drawer wiring pattern)
  - Phase 42 Wave 4 TC-UI shared drawer test (staff is one of four call sites)
tech-stack:
  added: []
  patterns:
    - Approved-only read invariant (D-05) — pending allocation_proposals never inflate planned totals
    - Drawer mounted per-page via local PlanVsActualDrawerProvider (no global mount yet)
    - Read-only cell gating via absent onCellEdit prop (PlanVsActualCell renders <button> instead of <input>)
key-files:
  created:
    - src/features/planning/__tests__/getStaffSchedule.test.ts
    - src/app/api/v5/planning/allocations/__tests__/scope.contract.test.ts
    - src/features/personas/__tests__/persona.scope.test.ts
    - src/components/timeline/staff-timeline-cell.tsx
    - src/app/(app)/staff/page.tsx
    - src/app/(app)/staff/__tests__/staff-schedule.test.tsx
    - src/features/planning/__tests__/staff.e2e.test.ts
  modified:
    - src/features/planning/planning.read.ts (added getStaffSchedule + StaffScheduleResult)
    - src/app/api/v5/planning/allocations/route.ts (added scope=staff branch)
    - src/messages/sv.json (v5.staff.*)
    - src/messages/en.json (v5.staff.*)
    - src/messages/keys.ts (v5.staff.*)
decisions:
  - "TC-PSN staff scope tested at PersonaGate level (assertPersonaOrRedirect), not at API 403, per ADR-004 (personas are UX shortcuts, not security boundaries). Plan said 'pm forbidden 403' — followed ADR-004 instead."
  - "Staff page renders a plain HTML table rather than ag-grid TimelineGrid, because TimelineGrid is tightly bound to PmTimelineView shape. A read-only projects × months table is sufficient for UX-V5-07 and avoids a wholesale TimelineGrid refactor."
  - "PlanVsActualDrawerProvider mounted locally on /staff page (not in app shell) so Wave 1 stays self-contained. Wave 4 may hoist it to a shared layout if R&D + PM + LM all need it simultaneously."
metrics:
  duration: ~30 min
  tasks: 2
  files: 11
  completed: 2026-04-08
requirements: [UX-V5-07, UX-V5-09]
---

# Phase 42 Plan 02: Staff "My Schedule" Summary

Shipped the smallest persona surface — read-only `/staff` page with projects × months grid, monthly summary strip (planned/actual/utilization%), drawer wired via the existing `PlanVsActualDrawer` in `'daily'` mode — to de-risk the PersonaGate + drawer-reuse + read-model + scope-branch pattern before R&D Wave 3 builds on the same scaffolding.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | getStaffSchedule + scope=staff API + tests | 5e3a29f | planning.read.ts, getStaffSchedule.test.ts, allocations/route.ts, scope.contract.test.ts, persona.scope.test.ts |
| 2 | /staff page + StaffTimelineCell + drawer wiring + RTL + e2e + i18n | f5d061c | staff/page.tsx, staff-timeline-cell.tsx, staff-schedule.test.tsx, staff.e2e.test.ts, sv.json, en.json, keys.ts |

Note: `staff/page.tsx` and message files were physically committed as part of `00634f7` (parallel 42-03 zoom-mount commit) because the parallel agent edited the same file to mount `<ZoomControls>` between when I wrote it and when I staged. Behavior is unchanged; the TODO comment about 42-03 mounting zoom resolved itself in that commit.

## Verification

- `pnpm vitest run src/features/planning/__tests__/getStaffSchedule.test.ts src/app/api/v5/planning/allocations/__tests__/scope.contract.test.ts src/features/personas/__tests__/persona.scope.test.ts src/app/(app)/staff/__tests__/staff-schedule.test.tsx src/features/planning/__tests__/staff.e2e.test.ts src/messages/__tests__/keys.test.ts` → 18/18 green
- `pnpm tsc --noEmit` → clean
- TC-PSN staff scope: 5 cases (staff/admin/rd allowed; pm/line-manager forbidden) → green
- TC-API-001 scope=staff: shape contract + 400-on-missing-personId → green
- TC-E2E-3A: Sara happy path with approved-only invariant + dense grid + summary → green
- TC-UI read-only gating (RTL): 0 `<input>` elements inside `staff-grid`; all 3 cells render as `<button>` (PlanVsActualCell read-only branch) → green

## Deviations from Plan

### [Discretion] TC-PSN staff scope assertion target

- **Found during:** Task 1 design
- **Issue:** Plan said "pm persona forbidden (403)" at the API level. ADR-004 explicitly states personas are UX shortcuts, NOT security boundaries — the API only checks org membership via `requireRole('planner')`. Adding a 403 path keyed on persona kind would contradict the architecture.
- **Decision:** Test the persona-scope rule at the `assertPersonaOrRedirect` decision function (used by `<PersonaGate>` on `/staff`). Five cases asserted: staff/admin/rd allowed, pm/line-manager forbidden. Same semantic guarantee, faithful to ADR-004.
- **Files:** src/features/personas/__tests__/persona.scope.test.ts
- **Commit:** 5e3a29f

### [Rule 3 — Blocking simplification] Staff page renders a plain table, not ag-grid TimelineGrid

- **Found during:** Task 2 implementation
- **Issue:** Plan said "Render `<TimelineGrid rows={projects} cellComponent={StaffTimelineCell}>`". The existing `TimelineGrid` (Phase 40) is tightly bound to `PmTimelineView` (people rows × months columns) and consumes a `view: PmTimelineView` prop directly. Reshaping it to accept arbitrary row/cell-component props would be a substantial cross-phase refactor outside the 42-02 surface.
- **Fix:** Built the staff schedule as a plain semantic HTML table (`<table data-testid="staff-grid">`) that maps projects → rows and `monthRange` → columns, mounting `StaffTimelineCell` per cell. PlanVsActualCell still does all the read-only rendering, drawer wiring, and `data-testid` instrumentation.
- **Files:** src/app/(app)/staff/page.tsx (StaffScheduleTable inner component)
- **Commit:** included in 00634f7 (parallel) / f5d061c

### [Coordination] Parallel 42-03 mounted ZoomControls in /staff page

- **Found during:** Task 2 commit
- **Issue:** Plan instructed me to leave a `TODO(42-03)` for zoom mounting. The parallel 42-03 agent edited my page.tsx between Write and git-add, replacing the TODO with the actual `<ZoomControls value={zoom} onChange={setZoom} />` mount + `useZoom()` hook. They also committed `staff/page.tsx` + i18n files in `00634f7`.
- **Resolution:** No conflict — their edit is consistent with the plan's intent ("zoom controls surface on /staff"). Adapted the RTL test to mock `next/navigation` so `useZoom()` doesn't crash. Kept their changes.
- **Test mock added:** `next/navigation` stub in staff-schedule.test.tsx

## Known Stubs

None. The drawer is wired end-to-end. The "daily" mode invariant (set by 42-01) is satisfied because Staff cell clicks always pass a non-null `personId` (`persona.kind === 'staff' ? persona.personId : ''`). Non-staff personas hit the PersonaGate hint card and never reach the click handler.

## Self-Check: PASSED

- src/features/planning/planning.read.ts: FOUND (getStaffSchedule + StaffScheduleResult exported)
- src/app/api/v5/planning/allocations/route.ts: FOUND (scope=staff branch)
- src/components/timeline/staff-timeline-cell.tsx: FOUND
- src/app/(app)/staff/page.tsx: FOUND (PersonaGate + drawer + ZoomControls mounted)
- src/features/planning/__tests__/getStaffSchedule.test.ts: FOUND
- src/features/planning/__tests__/staff.e2e.test.ts: FOUND
- src/app/(app)/staff/__tests__/staff-schedule.test.tsx: FOUND
- src/app/api/v5/planning/allocations/__tests__/scope.contract.test.ts: FOUND
- src/features/personas/__tests__/persona.scope.test.ts: FOUND
- src/messages/sv.json: contains v5.staff.*
- src/messages/en.json: contains v5.staff.*
- src/messages/keys.ts: contains v5.staff.*
- Commits 5e3a29f, f5d061c: present in `git log`
- All 18 vitest cases green; tsc clean
