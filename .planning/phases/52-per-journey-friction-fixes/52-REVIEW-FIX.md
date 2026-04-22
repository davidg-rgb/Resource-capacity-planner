---
phase: 52-per-journey-friction-fixes
fixed_at: 2026-04-22T00:00:00Z
review_path: .planning/phases/52-per-journey-friction-fixes/52-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 52: Code Review Fix Report

**Fixed at:** 2026-04-22T00:00:00Z
**Source review:** .planning/phases/52-per-journey-friction-fixes/52-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (critical: 0, warning: 6; info: 11 out-of-scope)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: OvercommitDialog has no focus trap (unlike PlanVsActualDrawer)

**Files modified:** `src/components/dialogs/overcommit-dialog.tsx`
**Commit:** 047d749
**Applied fix:** Imported `FocusTrap` from `focus-trap-react` (already a project dep, used by `Drawer.tsx`) and wrapped the dialog's backdrop+panel in `<FocusTrap>`. Options mirror the Drawer pattern: `allowOutsideClick: true` + `clickOutsideDeactivates: false` preserves the backdrop-click close behavior; `escapeDeactivates: false` leaves the existing useEffect ESC handler as the single source of ESC dismissal; `fallbackFocus` points at the Close button so the trap always has a valid initial target. Tab key can no longer escape into underlying page controls.

### WR-02: `flag-off-parity.spec.ts` silently bypasses flag toggle

**Files modified:** `e2e/_invariants/flag-off-parity.spec.ts`
**Commit:** a907bc3
**Applied fix:** Captured the `disablePerJourney()` result in `beforeEach`. When `applied === false` (endpoint absent / threw), push a `type: 'warning'` annotation to `testInfo` and call `test.skip(true, ...)` with the failure reason. CI output now reflects "skipped — flag-off unavailable" instead of falsely reporting "flag-off passed" when the flag was never actually off.

### WR-03: `RdPortfolioCell` state logic duplicates `PlanVsActualCell#computeState`

**Files modified:** `src/components/timeline/PlanVsActualCell.tsx`, `src/components/timeline/rd-portfolio-cell.tsx`
**Commit:** 94f3dc4
**Applied fix:** Exported `computeState` and the `CellState` type from `PlanVsActualCell.tsx`. Deleted the duplicated `computeRdState` function in `rd-portfolio-cell.tsx`; replaced the call site with `computeState(plannedHours, actualHours)` and aliased `RdPortfolioCellState = CellState`. Both cells now share a single source of truth for plan/actual thresholds — threshold changes propagate to the /rd red-cell → OvercommitDialog routing automatically.

### WR-04: `capacity.read.ts#getOvercommitBreakdown` dead code block

**Files modified:** `src/features/capacity/capacity.read.ts`
**Commit:** 7115bac
**Applied fix:** Removed the empty `for (const r of projectRows) { /* comment-only body */ }` loop. Lifted the explanatory comment to a block comment above the `peoplePlanned` Map declaration so the rationale for the separate `personRows` query is preserved without leaving an empty iterator that would confuse future refactors.

### WR-05: `persona-switcher.tsx` silent persona-change abort on unloaded people list

**Files modified:** `src/components/persona/persona-switcher.tsx`
**Commit:** 0277d4c
**Applied fix:** In `handleKindChange`, when `buildPersona(...)` returns null (PM/Staff selected before `fetchPeople()` resolves), restore `e.target.value = persona.kind` before the early return. The `<select>` DOM no longer lies about the active persona kind while React state still holds the old value. Did NOT add a toast — adding a new i18n key would require parity updates across sv.json/en.json/keys.ts and triggers the `keys.test.ts` invariant; the DOM-restore alone fixes the reported lying-UI symptom without widening the diff.

### WR-06: `2b-approve-reject.spec.ts` passes silently when badge absent

**Files modified:** `e2e/line-manager/2b-approve-reject.spec.ts`
**Commit:** 3560f56
**Applied fix:** Replaced the `if (badgeCount > 0) { ... } else { todo annotation }` branch with an unconditional `await expect(badge).toBeVisible({ timeout: 5000 })`. Seed baseline has 2 pending proposals in Per's department so the badge must always render — any regression (flag-wiring break, LM-03 endpoint breakage, count hook misfire) now surfaces as a failed test instead of a silent pass.

---

_Fixed: 2026-04-22T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
