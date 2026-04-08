---
phase: 40-persona-views-part-1-pm
plan: 05
subsystem: phase 40 test coverage sweep (Wave 4)
tags: [wave-4, tests, rtl, pglite, e2e, nyquist]
requires:
  - PlanVsActualCell (Phase 37)
  - resolveEditGate (Phase 39)
  - MyWishesPanel / WishCard (Phase 39)
  - createProposal / listProposals (Phase 39)
  - getPmOverview / getPmTimeline (Plan 40-02)
  - PersonaProvider + useQueryClient invalidation (Plan 40-03)
  - HistoricEditDialog + PmTimelineCell + TimelineGrid (Plan 40-04)
provides:
  - TC-UI-001 page-level RTL coverage (PM Home)
  - TC-UI-002 page-level RTL coverage (PM project timeline)
  - UX-V5-03 page-level RTL coverage (/pm/wishes)
  - TC-PS-005 HistoricEditDialog RTL coverage
  - TC-PSN-003 persona invalidateQueries RTL coverage
  - TC-PR-001 PmTimelineCell out-of-dept proposal flow RTL coverage
  - D-22 PGlite happy-path e2e (Anna submits a wish)
affects:
  - Phase 40 nyquist_compliant flag can flip to true in 40-VALIDATION.md
  - Unblocks the Phase 40 verifier gate
tech-stack:
  added: []
  patterns:
    - "RTL page tests mock @clerk/nextjs + persona.context + fetch, then await NextIntlClientProvider-resolved labels"
    - "Heavy cell components (PlanVsActualCell, ProposalCell, HistoricEditDialog, TimelineGrid) stubbed via vi.mock to keep orchestrator tests free of ag-grid / react-query noise"
    - "PGlite e2e mirrors proposal.service.e2e.test.ts harness; adds lead_pm_person_id column + getServerNowMonthKey mock for deterministic historic gating"
key-files:
  created:
    - src/app/(app)/pm/__tests__/pm-home.test.tsx
    - src/app/(app)/pm/__tests__/pm-wishes.test.tsx
    - src/app/(app)/pm/projects/[projectId]/__tests__/pm-timeline.test.tsx
    - src/components/dialogs/__tests__/historic-edit-dialog.test.tsx
    - src/components/timeline/__tests__/pm-timeline-cell.test.tsx
    - src/features/planning/__tests__/pm.e2e.test.ts
    - .planning/phases/40-persona-views-part-1-pm/deferred-items.md
  modified:
    - src/features/personas/__tests__/persona.context.test.tsx
    - src/components/persona/__tests__/persona-switcher.test.tsx
key-decisions:
  - "TC-UI debounce: existing PlanVsActualCell.test.tsx already satisfies the done-criteria (advanceTimersByTime + fires once after 600ms). No new test file needed — documented as 'pre-existing coverage' in Task 1b."
  - "PM timeline page test stubs TimelineGrid with a lightweight DOM that emits pm-cell testids per (person, month) tuple. Asserts 2 × 13 = 26 cells via the 'alternative lighter assertion' branch documented in the plan."
  - "PmTimelineCell test uses shared vi.fn() spy (`proposalSubmitSpy`) threaded through a mocked ProposalCell stub instead of stubbing use-proposals at module level — sidesteps react-query wiring while preserving TC-PR-001 payload-shape assertion."
  - "D-22 e2e: resolveEditGate is called with `currentMonth='2026-05'` so that 2026-06 is unambiguously future. Separate from getServerNowMonthKey mock (which is used by patchAllocation but not by createProposal)."
metrics:
  duration_minutes: 25
  tasks_completed: 3
  files_created: 7
  files_modified: 2
  tests_added: 21
  completed_date: 2026-04-08
requirements:
  - UX-V5-01
  - UX-V5-02
  - UX-V5-03
  - UX-V5-11
  - HIST-01
---

# Phase 40 Plan 05: Wave 4 — Final test coverage sweep Summary

**One-liner:** Wave 4 closes Phase 40's nyquist compliance with 6 new test files (3 page RTL + 2 component RTL + 1 PGlite e2e) covering every roadmap TC-* code + UX-V5-03 + D-22, plus a Rule 1 fix for two Phase 40-03-regressed persona tests.

## What shipped

1. **`src/app/(app)/pm/__tests__/pm-home.test.tsx`** (TC-UI-001) — Mocks `@clerk/nextjs` + `persona.context` + global fetch. Asserts the overview card renders the project link to `/pm/projects/p1`, the `2 väntande önskemål` (pendingWishes) text, and the `/pm/wishes` link. Second spec asserts the empty branch (no `Mina projekt` heading rendered) when `projects: []`.

2. **`src/app/(app)/pm/projects/[projectId]/__tests__/pm-timeline.test.tsx`** (TC-UI-002) — Mocks `useParams`, `persona.context`, `TimelineGrid` (lightweight DOM stub emitting `pm-cell` testids), and fetch. Seeds a 2-person × 13-month `PmTimelineView` and asserts 26 `pm-cell` elements with correct `data-person` attributes.

3. **`src/app/(app)/pm/__tests__/pm-wishes.test.tsx`** (UX-V5-03 — B1 gap closure) — Mocks `@clerk/nextjs` + `persona.context` + fetch. Asserts `MyWishesPanel` mounts (via `data-testid="my-wishes-panel"`), three tabs exist with sv labels `Föreslagna/Godkända/Avvisade`, and the rejected-tab wish card exposes a resubmit button matching `/redigera.*skicka igen/i`. Fetch URL carries `proposerId=clerk-anna`.

4. **`src/components/dialogs/__tests__/historic-edit-dialog.test.tsx`** (TC-PS-005) — Seven specs: `role="dialog"` + `aria-modal="true"` check, target-month body text, `open=false` returns null, Enter fires `onConfirm`, Escape fires `onCancel`, Cancel/Confirm button clicks route to the correct handler.

5. **`src/components/timeline/__tests__/pm-timeline-cell.test.tsx`** (TC-PR-001) — Mocks `persona.context` (PM, dept-A), `PlanVsActualCell` (stub `trigger-edit` button firing `onCellEdit(60)`), `ProposalCell` (stub exposing a `Submit wish` button wired to a shared `proposalSubmitSpy`), and `HistoricEditDialog` (null stub). Asserts out-of-dept edit (target dept-B) opens the proposal popover, clicking Submit calls `proposalSubmitSpy` with `{projectId, personId, month, proposedHours: 60, note: ''}`, and `onAllocationPatch` is never fired (the direct PATCH path stays silent).

6. **`src/features/planning/__tests__/pm.e2e.test.ts`** (D-22) — PGlite harness mirroring `proposal.service.e2e.test.ts` (tables + types) plus `planning.read.test.ts` schema (`lead_pm_person_id`, `actual_entries`). Four ordered tests: `getPmOverview` returns Alpha for Anna → `getPmTimeline` returns Sara row + 2026-06 cell with 40h planned → `resolveEditGate` returns `'proposal'` (Anna dept-A, Sara dept-B, month 2026-06 future) → `createProposal({60h})` + `listProposals({proposerId: clerk_anna})` + `getPmTimeline` re-query shows `cells[...].pendingProposal.proposedHours === 60`.

7. **`src/features/personas/__tests__/persona.context.test.tsx`** (extended) — All cases wrapped in a new `QueryClientProvider` (Rule 1 fix). New TC-PSN-003 spec spies on `queryClient.invalidateQueries` and asserts `pm-home` is one of the invalidated keys after `setPersona({kind:'pm',...})`.

8. **`src/components/persona/__tests__/persona-switcher.test.tsx`** (extended) — Same Rule 1 QueryClientProvider wrap; stubs `/api/people` fetch with a single-person response so TC-PSN-006 can build a real `pm` Persona with a valid `personId` and fire `router.push('/pm')`.

## Verification

- `pnpm vitest run src/app/\(app\)/pm/__tests__ src/app/\(app\)/pm/projects` — **5 tests passed** (pm-home 2, pm-timeline 1, pm-wishes 2).
- `pnpm vitest run src/components/timeline src/components/dialogs src/features/personas` — **22 tests passed** (PlanVsActualCell 7, pm-timeline-cell 1, historic-edit-dialog 7, persona.context 7).
- `pnpm vitest run src/features/planning/__tests__/pm.e2e.test.ts` — **4 tests passed** (D-22 ordered blocks).
- `pnpm vitest run src/components/persona/__tests__/persona-switcher.test.tsx` — **2 tests passed** (Rule 1 regression fixed).
- `pnpm vitest run` full suite — **231/234 passed**. The 3 remaining failures are pre-existing `TC-CL-005 change-log.coverage` assertions against `actuals.service.ts` and `actuals-import.service.ts` — unrelated to Phase 40 and logged to `deferred-items.md` for Phase 44 (API hardening fill).

### Grep done-criteria receipts

- `pending wishes` / `pendingWishes` in `pm-home.test.tsx` → hit (comment and text assertion).
- `columnheader` or `pm-cell` in `pm-timeline.test.tsx` → hit (`pm-cell` × 3).
- `proposed` / `approved` / `rejected` / `resubmit` / `MyWishesPanel` in `pm-wishes.test.tsx` → hits across all five.
- `advanceTimersByTime` in `PlanVsActualCell.test.tsx` → hit (pre-existing debounce spec).
- `role="dialog"` / `aria-modal` in `historic-edit-dialog.test.tsx` → hits.
- `invalidateQueries` in `persona.context.test.tsx` → hit.
- `mutateAsync` in `pm-timeline-cell.test.tsx` → 4 hits.
- `D-22 Anna submits a wish` / `p-sara` / `2026-06` / `pendingProposal` in `pm.e2e.test.ts` → hits on all.

## Deviations from Plan

**[Rule 1 — Bug] `persona.context.test.tsx` was silently broken after Plan 40-03.**

- **Found during:** Task 1b kickoff, running `pnpm vitest run src/features/personas` before writing any new assertions.
- **Issue:** Plan 40-03 wired `useQueryClient()` into `PersonaProvider` (D-20), but did not update the existing `persona.context.test.tsx` to wrap in `QueryClientProvider`. 4 of 6 specs were failing with `No QueryClient set, use QueryClientProvider to set one`.
- **Fix:** Added a `Wrap` helper + `QueryClientProvider` around every render. All 6 pre-existing specs pass again, plus the new TC-PSN-003 spec.
- **Files modified:** `src/features/personas/__tests__/persona.context.test.tsx`
- **Commit:** `2d7d0c1`

**[Rule 1 — Bug] `persona-switcher.test.tsx` broken by the same root cause.**

- **Found during:** Final full-suite rerun after Task 1b.
- **Issue:** Same QueryClientProvider missing. Additionally, Plan 40-03 replaced the placeholder persona IDs with a real `/api/people`-backed person picker — TC-PSN-006 was firing `selectOptions(select, 'pm')` but `handleKindChange` short-circuits to `return` unless `people.length > 0`, so `router.push` was never called.
- **Fix:** Wrapped in `QueryClientProvider`; stubbed `fetch` for `/api/people` with a single-person response; updated the selector to target the first combobox explicitly (there are now two on the 'pm' branch).
- **Files modified:** `src/components/persona/__tests__/persona-switcher.test.tsx`
- **Commit:** `f866e0a`

**[Plan-interpretation] TC-UI debounce is already covered; no new file.**

- **Found during:** Task 1b read-first pass.
- **Issue:** Plan Task 1b lists `PlanVsActualCell.test.tsx` as a file to create / extend for the debounce assertion, but the file already contains a `describe('TC-UI-002: 600ms debounced edit')` block with `vi.useFakeTimers()` + `advanceTimersByTime(599)` then `(1)` then a single-call assertion on `onCellEdit(42)`. All done-criteria greps already hit.
- **Fix:** Left the file untouched; documented the pre-existing coverage in the Task 1b commit message and this summary. No code change — this is a plan-interpretation note, not a deviation of intent.

## Authentication Gates

None. All work is test code; no runtime auth flows touched.

## Known Stubs

None introduced by this plan. The RTL tests use `vi.mock` stubs for `@clerk/nextjs`, `persona.context`, `TimelineGrid`, `PlanVsActualCell`, `ProposalCell`, and `HistoricEditDialog`, but these are test-local stubs — production code is unchanged.

## Deferred Issues

Three pre-existing `tests/invariants/change-log.coverage.test.ts` failures (upsertActuals, commitActualsBatch, rollbackBatch missing `recordChange` calls) are documented in `deferred-items.md` and belong to Phase 44 scope, not Plan 40-05.

## Commits

- `470dd2b` test(40-05): add page-level RTL tests — TC-UI-001, TC-UI-002, UX-V5-03
- `2d7d0c1` test(40-05): component/context RTL tests — TC-PSN-003, TC-PS-005, TC-PR-001
- `f866e0a` test(40-05): D-22 PGlite e2e happy path + persona-switcher QC wrap

## Self-Check: PASSED

- FOUND: src/app/(app)/pm/__tests__/pm-home.test.tsx
- FOUND: src/app/(app)/pm/__tests__/pm-wishes.test.tsx
- FOUND: src/app/(app)/pm/projects/[projectId]/__tests__/pm-timeline.test.tsx
- FOUND: src/components/dialogs/__tests__/historic-edit-dialog.test.tsx
- FOUND: src/components/timeline/__tests__/pm-timeline-cell.test.tsx
- FOUND: src/features/planning/__tests__/pm.e2e.test.ts
- FOUND: src/features/personas/__tests__/persona.context.test.tsx (TC-PSN-003 added)
- FOUND: src/components/persona/__tests__/persona-switcher.test.tsx (QC wrap added)
- FOUND: .planning/phases/40-persona-views-part-1-pm/deferred-items.md
- FOUND: commit 470dd2b
- FOUND: commit 2d7d0c1
- FOUND: commit f866e0a
