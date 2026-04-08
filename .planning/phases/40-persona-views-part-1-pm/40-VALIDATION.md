---
phase: 40
slug: persona-views-part-1-pm
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 40 — Validation Strategy

> Per-phase validation contract. See `40-RESEARCH.md` § "Validation Architecture" for the full test plan.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react + PGlite |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm vitest run --changed` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~90 seconds full suite |

---

## Sampling Rate

- **After every task commit:** Quick run on changed files
- **After every plan wave:** Full suite
- **Before `/gsd:verify-work`:** Full suite green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

Populated by the planner per-plan from the Validation Architecture table in `40-RESEARCH.md`. Every plan's tasks must map to one of:

| Test Code | Type | Location | Covers |
|-----------|------|----------|--------|
| TC-API-004 | PGlite contract | `src/features/allocations/__tests__/patch-allocation.contract.test.ts` | confirmHistoric plumbing + ALLOCATION_EDITED write + 409 rejection |
| TC-PS-006 | PGlite contract | `src/features/allocations/__tests__/patch-allocation.contract.test.ts` (combined with TC-API-004) | ALLOCATION_HISTORIC_EDITED row content (context.confirmedHistoric, before/after hours) |
| TC-PS-005 | vitest component | `src/components/dialogs/__tests__/historic-edit-dialog.test.tsx` | historic dialog confirm path |
| TC-PR-001 | PGlite integration | reuse `src/features/proposals/__tests__/proposal.service.create.test.ts` + new UI round-trip test | wish submit round-trip |
| TC-UI-001 | RTL | `src/app/(app)/pm/__tests__/pm-home.test.tsx` | PM Home overview card render |
| TC-UI-002 | RTL | `src/app/(app)/pm/projects/[projectId]/__tests__/pm-timeline.test.tsx` | PM project timeline grid render |
| TC-UI debounce | RTL + fake timers | `src/components/timeline/__tests__/PlanVsActualCell.test.tsx` | 600ms debounce direct-edit path |
| TC-PSN-003 | RTL | `src/features/personas/__tests__/persona.context.test.tsx` | PM persona lands on /pm after switch |
| UX-V5-03 My Wishes | RTL | `src/app/(app)/pm/__tests__/pm-wishes.test.tsx` | /pm/wishes mounts MyWishesPanel with proposed/approved/rejected tabs + resubmit affordance on rejected cards |

---

## Wave 0 Requirements

Wave 0 (as recommended by 40-RESEARCH.md) MUST land before any UI work so UI tests have a live backend:

- [ ] `src/app/api/v5/planning/allocations/[id]/route.ts` — `PATCH` handler (new)
- [ ] `src/features/allocations/allocation.service.ts` — `patchAllocation({ id, hours, confirmHistoric })` branch that calls `getServerNowMonthKey`, evaluates `isHistoricPeriod`, rejects on `!confirmHistoric`, writes `ALLOCATION_HISTORIC_EDITED` when confirmed
- [ ] `src/features/allocations/__tests__/patch-allocation.contract.test.ts` — PGlite contract test covering TC-API-004 + TC-PS-006 combined (direct write path + historic row-content assertions in a single file)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Persona switch does NOT trigger a full browser reload | UX-V5-01 | Requires real browser for `document` identity check | DevTools: open /pm, store `window.__probe = {}`, switch persona, assert `window.__probe` still defined |
| Swedish historic-edit dialog copy renders correctly with month interpolation | UX-V5-11 | Visual copy review | Open a historic month cell, confirm dialog shows `"Du redigerar historisk planering för <mars 2026>. …"` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (TC-API-004 + TC-PS-006 combined, TC-PS-005)
- [ ] No watch-mode flags in commands
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
