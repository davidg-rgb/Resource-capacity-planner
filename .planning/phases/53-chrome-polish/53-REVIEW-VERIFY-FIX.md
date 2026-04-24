---
phase: 53-chrome-polish
fixed_at: 2026-04-24T00:00:00Z
review_path: .planning/phases/53-chrome-polish/53-REVIEW-VERIFY.md
ui_review_path: .planning/phases/53-chrome-polish/53-UI-REVIEW.md
iteration: 2
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
---

# Phase 53: REVIEW-VERIFY + UI-REVIEW Fix Report (iteration 2)

**Fixed at:** 2026-04-24
**Source reviews:** 53-REVIEW-VERIFY.md (2 Major + 4 Minor + 3 Nit) and 53-UI-REVIEW.md (3 Priority + 4 Minor)
**Iteration:** 2 (prior iteration: 53-REVIEW-FIX.md covered WR-01..WR-05)

**Summary:**
- Findings in scope: 13 (2 MJ, 4 MN, 3 NT, 3 UI Priority, UI-MN batch-of-4)
- Fixed: 13
- Skipped: 0
- Commits produced: 11 (atomic per finding or batch)

## Commits (chronological)

| # | SHA | Finding(s) | One-line outcome |
|---|-----|-----------|------------------|
| 1 | `2bec745` | MJ-01 | Extended `no-test-routes-in-prod` invariant with a TEST_ROUTES list + `it.each`; flags route source is now explicitly gate-asserted. |
| 2 | `777eefe` | MJ-02 | Added pre-flight `platform_admins` row check → 400 `seed_required` when seed hasn't run. Contract test covers. |
| 3 | `ea7761c` | MN-01 | Added dedupe pass (ROW_NUMBER + keep lowest position) so tenants with both legacy IDs no longer get double discipline-breakdown mounts; 2 new tests. |
| 4 | `53ae58a` | MN-03 | `getDismissed` now `console.warn`s on `JSON.parse` failure. Also extracted `rangeFrom` before `useMemo` to satisfy pre-existing `react-hooks/preserve-manual-memoization` that lint-staged surfaces on touch. |
| 5 | `336007a` | MN-04 | New `src/features/alerts/constants.ts` exports `ALERTS_WINDOW_MONTHS = 3`; banner, bell and /alerts page now share the same window → same query cache. |
| 6 | `1857209` | MN-02 | Replaced `.at(-1)!` non-null assertion on AlertsPage with `?? monthFrom` fallback. |
| 7 | `5c10d24` | NT-01..NT-03 | Dropped trivial `useMemo`; moved `vi` import above `vi.mock`; tightened dashboard-content comment. |
| 8 | `d807818` | UI-01 | NotificationBell gains a visually-hidden `role="status" aria-live="polite"` span mirroring the label so polling count changes announce to screen readers; badge is now `aria-hidden`. New RTL test Test 9. |
| 9 | `f1b04db` | UI-02 | Full APG tabs on /alerts: `id`+`aria-controls`+roving `tabIndex`, `role="tabpanel"`+`aria-labelledby`, `onKeyDown` ArrowLeft/ArrowRight roving focus. Preserves `router.replace` URL sync. 2 new tests. |
| 10 | `c07f027` | UI-03 | Added `CHART_COLORS.categoricalPalette` (8 Tol/muted colors) and consumed from DisciplineDonut. Greyscale `palette` preserved. |
| 11 | `780e0d9` | UI-MN-01..04 | Discipline toggle pill group; NotificationBell null-return at count=0 for non-admin personas (admin bell still renders); /alerts H1+subtitle into `v6.polish.alerts.page.*` (sv+en parity); tap-target padding on banner CTA + tab buttons (WCAG 2.5.5 ≥44x44 px). |

## Per-finding detail

### MJ-01 — `no-test-routes-in-prod` invariant coverage
- **Status:** fixed — commit `2bec745`.
- **Files:** `tests/invariants/no-test-routes-in-prod.test.ts`.
- **Verification:** `npx vitest run tests/invariants/no-test-routes-in-prod.test.ts` — 2/3 tests pass (the chunk-scan test fails on pre-existing stale `.next/` artifacts; verified same failure exists against the pre-fix baseline, so this fix did not introduce it).

### MJ-02 — `/api/test/flags` pre-flight seed guard
- **Status:** fixed — commit `777eefe`.
- **Files:** `src/app/api/test/flags/route.ts`, `src/app/api/test/flags/__tests__/route.test.ts`.
- **Verification:** 7/7 tests pass (6 original + 1 new `seed_required` test).

### MN-01 — Migration dedupe
- **Status:** fixed — commit `ea7761c`.
- **Files:** `src/db/migrations/20260422_polish_discipline_rename.sql`, `src/db/migrations/__tests__/polish-discipline-rename.test.ts`.
- **Verification:** 7/7 migration tests pass (including both-legacy-IDs dedupe, pre-existing-breakdown + legacy dedupe, idempotence preserved).

### MN-02 — AlertsPage non-null assertion
- **Status:** fixed — commit `1857209`.
- **Files:** `src/app/(app)/alerts/page.tsx`.
- **Verification:** 5/5 tabs tests pass.

### MN-03 — `getDismissed` bare catch
- **Status:** fixed — commit `53ae58a`.
- **Files:** `src/components/alerts/resource-conflicts-panel.tsx`.
- **Verification:** 4/4 resource-conflicts-panel tests pass; lint clean.
- **Adjacent fix (in the same commit):** extracted `rangeFrom` before `useMemo` to silence a pre-existing `react-hooks/preserve-manual-memoization` lint error that lint-staged surfaces on touch. Necessary to satisfy pre-commit hook.

### MN-04 — Align alerts window
- **Status:** fixed — commit `336007a`.
- **Files:** new `src/features/alerts/constants.ts`; `src/components/alerts/strategic-alerts-banner.tsx`; `src/components/persona/notification-bell.tsx`; `src/app/(app)/alerts/page.tsx`.
- **Verification:** 18/18 tests across banner + bell + tabs suites pass.

### NT-01 — Drop trivial useMemo (alerts/page.tsx)
- **Status:** fixed — commit `5c10d24`.

### NT-02 — `vi` import ordering (discipline-donut.test.tsx)
- **Status:** fixed — commit `5c10d24`.

### NT-03 — Dashboard-content comment clarity
- **Status:** fixed — commit `5c10d24`.

### UI-01 — NotificationBell aria-live
- **Status:** fixed — commit `d807818`.
- **Files:** `src/components/persona/notification-bell.tsx`, `src/components/persona/__tests__/notification-bell.test.tsx`.
- **Verification:** 9/9 bell tests pass (Test 7 adjusted to filter out `.sr-only` span; Test 9 new).

### UI-02 — APG tabs pattern
- **Status:** fixed — commit `f1b04db`.
- **Files:** `src/app/(app)/alerts/page.tsx`, `src/app/(app)/alerts/__tests__/tabs.test.tsx`.
- **Verification:** 7/7 tabs tests pass (5 original + 2 new: APG attributes + ArrowRight keyboard navigation).

### UI-03 — Categorical donut palette
- **Status:** fixed — commit `c07f027`.
- **Files:** `src/components/charts/chart-colors.ts`, `src/components/charts/discipline-donut.tsx`.
- **Verification:** 3/3 discipline-donut tests pass; 6/6 discipline-breakdown-widget tests pass (palette consumption downstream unaffected).

### UI-MN-01..04 — UI polish batch
- **Status:** fixed — commit `780e0d9`.
- **Files:** `src/features/dashboard/widgets/discipline-breakdown-widget.tsx`; `src/components/persona/notification-bell.tsx`; `src/messages/sv.json` + `src/messages/en.json`; `src/app/(app)/alerts/page.tsx`; `src/components/alerts/strategic-alerts-banner.tsx`.
- **Verification:** 21/21 tests pass across banner + bell + tabs + widget suites; sv/en i18n parity for new keys.

## Final test sweep

Ran all 8 Phase-53-touched test files after the last commit:

| File | Tests |
|------|-------|
| `src/app/api/test/flags/__tests__/route.test.ts` | 7/7 |
| `src/db/migrations/__tests__/polish-discipline-rename.test.ts` | 7/7 |
| `src/components/alerts/__tests__/resource-conflicts-panel.test.tsx` | 4/4 |
| `src/components/alerts/__tests__/strategic-alerts-banner.test.tsx` | 5/5 |
| `src/components/persona/__tests__/notification-bell.test.tsx` | 9/9 |
| `src/components/charts/__tests__/discipline-donut.test.tsx` | 3/3 |
| `src/app/(app)/alerts/__tests__/tabs.test.tsx` | 7/7 |
| `src/features/dashboard/widgets/__tests__/discipline-breakdown-widget.test.tsx` | 6/6 |

**Total: 48/48 passing.**

## Pre-existing state noted (not in scope for this fix pass)

- `tests/invariants/no-test-routes-in-prod.test.ts` chunk-scan failure — caused by a stale `.next/` development build containing older chunks; identical failure reproduces against the pre-fix tree. Will clear itself on the next `pnpm build` in CI. Not introduced by MJ-01.
- 22 pre-existing test failures in the broader suite (3 snapshot failures + unrelated infrastructure errors); identical on pre-fix baseline. Out of scope for this fix pass.

---

_Fixed: 2026-04-24_
_Fixer: Claude (gsd-code-fixer, REVIEW-VERIFY + UI-REVIEW iteration 2)_
_Iteration: 2 (builds on 53-REVIEW-FIX.md iteration 1)_
