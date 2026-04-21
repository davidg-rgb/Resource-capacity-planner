---
phase: 52-per-journey-friction-fixes
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 72
files_reviewed_list:
  - e2e/_invariants/flag-off-parity.spec.ts
  - e2e/admin/5b-archive-dependent.spec.ts
  - e2e/helpers/a11y.ts
  - e2e/helpers/click-counter.ts
  - e2e/helpers/flag-toggle.ts
  - e2e/helpers/persona-setup.ts
  - e2e/lib/seed.ts
  - e2e/line-manager/2a-capacity-overview.spec.ts
  - e2e/line-manager/2b-approve-reject.spec.ts
  - e2e/line-manager/2c-direct-edit.spec.ts
  - e2e/playwright.config.ts
  - e2e/pm/1a-monday-checkin.spec.ts
  - e2e/pm/1b-submit-wish.spec.ts
  - e2e/pm/1c-rejected-wish.spec.ts
  - e2e/pm/1d-historic-edit.spec.ts
  - e2e/rd/4a-portfolio-overview.spec.ts
  - e2e/rd/4b-overcommit-drilldown.spec.ts
  - e2e/staff/3a-check-schedule.spec.ts
  - src/app/(app)/__tests__/persona-redirect.test.tsx
  - src/app/(app)/layout.tsx
  - src/app/(app)/line-manager/__tests__/approval-queue-badge.test.tsx
  - src/app/(app)/line-manager/page.tsx
  - src/app/(app)/pm/__tests__/pm-home.test.tsx
  - src/app/(app)/pm/page.tsx
  - src/app/(app)/pm/wishes/page.tsx
  - src/app/(app)/rd/__tests__/overcommit-routing.test.tsx
  - src/app/(app)/rd/__tests__/rd-aggregation.test.ts
  - src/app/(app)/rd/page.tsx
  - src/app/(app)/rd/rd-aggregation.ts
  - src/app/(app)/staff/page.tsx
  - src/app/(platform)/tenants/[orgId]/page.tsx
  - src/app/api/test/seed/route.ts
  - src/app/api/v5/capacity/__tests__/breakdown.contract.test.ts
  - src/app/api/v5/capacity/breakdown/route.ts
  - src/app/api/v5/proposals/queue/__tests__/count.test.ts
  - src/app/api/v5/proposals/queue/count/route.ts
  - src/components/admin/__tests__/admin-archive-toast.test.tsx
  - src/components/dialogs/__tests__/overcommit-dialog.test.tsx
  - src/components/dialogs/overcommit-dialog.tsx
  - src/components/drawer/__tests__/plan-vs-actual-drawer.deeplink.test.tsx
  - src/components/layout/__tests__/side-nav.test.tsx
  - src/components/layout/top-nav.tsx
  - src/components/persona/__tests__/pending-wish-chip.test.tsx
  - src/components/persona/__tests__/persona-switcher.lm-suffix.test.tsx
  - src/components/persona/pending-wish-chip.tsx
  - src/components/persona/persona-switcher.tsx
  - src/components/timeline/PlanVsActualCell.tsx
  - src/components/timeline/__tests__/line-manager-timeline-grid.test.tsx
  - src/components/timeline/__tests__/plan-vs-actual-cell.read-only.test.tsx
  - src/components/timeline/__tests__/pm-timeline-cell.snapshots.test.tsx
  - src/components/timeline/__tests__/pm-timeline-cell.test.tsx
  - src/components/timeline/lm-timeline-cell.tsx
  - src/components/timeline/pm-timeline-cell.tsx
  - src/components/timeline/rd-portfolio-cell.tsx
  - src/components/timeline/staff-timeline-cell.tsx
  - src/components/timeline/timeline-grid.tsx
  - src/components/wishes/__tests__/my-wishes-panel.test.tsx
  - src/features/capacity/capacity.read.ts
  - src/features/capacity/capacity.types.ts
  - src/features/flags/flag.context.tsx
  - src/features/flags/flag.service.ts
  - src/features/flags/flag.types.ts
  - src/features/planning/__tests__/planning.read.test.ts
  - src/features/planning/planning.read.ts
  - src/features/proposals/__tests__/proposal.service.queue-count.test.ts
  - src/features/proposals/__tests__/use-lm-queue-count.test.tsx
  - src/features/proposals/proposal.service.ts
  - src/features/proposals/ui/my-wishes-panel.tsx
  - src/features/proposals/use-lm-queue-count.ts
  - src/features/proposals/use-pm-wish-counts.ts
  - src/lib/testing/__tests__/click-tracker.test.tsx
  - src/lib/testing/click-tracker.tsx
findings:
  critical: 0
  warning: 6
  info: 11
  total: 17
status: issues
---

# Phase 52: Code Review Report

**Reviewed:** 2026-04-21T00:00:00Z
**Depth:** standard
**Files Reviewed:** 72
**Status:** issues_found

## Summary

Phase 52 wires 13 per-journey friction-fix requirements (PM-01..PJ-FLAG) behind a new `uiV6PerJourney` feature flag, plus a fresh Playwright journey harness. The critical surfaces scrutinized against the phase's threat model (T-52-01..T-52-05) are sound:

- **Tenant isolation** in `getQueueCount` / `/api/v5/proposals/queue/count` is correct. `orgId` is resolved server-side via `requireRole('planner')` (Clerk → DB lookup) and cannot be tampered with through query strings. The WHERE clause includes `organizationId = orgId`, and the live-department JOIN to `people` naturally eliminates cross-tenant departments. Integration tests cover the cross-tenant case explicitly (count.test.ts "tenant isolation").
- **Input validation** on the new route uses `z.string().uuid()`; malformed departmentId → 400 ERR_VALIDATION; missing param → 400 ERR_VALIDATION. Covered by count.test.ts behaviors 2 + 3.
- **Feature-flag fallbacks** are present on every v6-gated surface — `/rd` pins `effectiveZoom='month'` when flag off; `PendingWishChip` early-returns on flag off; the LM badge is hidden with `flag && count>0`; historic-edit branches fall through to Phase 51 direct/proposal paths when flag off.
- **Hydration safety** in `/pm` redirect and `PendingWishChip` is protected by `pathname !== '/pm'` guards and explicit `persona.kind === 'pm'` early returns.
- **ISO 53-week math** in `rd-aggregation.ts` correctly defers to the ISO-calendar helpers (`yearKeyForMonth`, `quarterKeyForMonth`) — no `monthKey.slice(0,4)` anywhere. 2026-year unit tests verify a single '2026' bucket.
- **Playwright spec hygiene** is adequate: fullyParallel=false + workers=1 serializes DB state; every journey spec seeds + resets click counter between runs.

Six warnings and eleven info items below identify friction around code duplication, silent test fallbacks, dead code paths, and an unguarded focus surface in the new `OvercommitDialog`. None block the phase but several (WR-01, WR-03, WR-06) are load-bearing for Phase 53 if the flag is rolled out broadly.

## Warnings

### WR-01: OvercommitDialog has no focus trap (unlike PlanVsActualDrawer)

**File:** `src/components/dialogs/overcommit-dialog.tsx:87-178`
**Issue:** The dialog renders `role="dialog" aria-modal="true"` but does NOT wrap content in `focus-trap-react` — Tab key can escape the modal into underlying page controls. `PlanVsActualDrawer` (same phase, same accessibility bar) uses `FocusTrap` per the drawer deeplink test. The a11y gate `checkA11y(page)` in journey 4B will NOT detect this (axe-core does not enforce focus-trap presence on `aria-modal=true`), so the assertion passes silently.
**Fix:**
```tsx
import { FocusTrap } from 'focus-trap-react';
// ...
return (
  <FocusTrap
    active={open}
    focusTrapOptions={{
      initialFocus: false,
      clickOutsideDeactivates: true,
      escapeDeactivates: true,
    }}
  >
    <div role="dialog" aria-modal="true" ...>
      {/* ... */}
    </div>
  </FocusTrap>
);
```

### WR-02: `flag-off-parity.spec.ts` silently bypasses flag toggle

**File:** `e2e/_invariants/flag-off-parity.spec.ts:29-31` + `e2e/helpers/flag-toggle.ts:32-47`
**Issue:** `disablePerJourney(request)` posts to `/api/test/flags` which "may not yet be wired" per the helper's own docstring. On failure the helper returns `{ applied: false, reason: ... }` without throwing — the parity tests then run against the seed baseline (flag ON) while claiming to assert flag-OFF behavior. The 5 persona landing tests become trivially satisfiable (`body.toBeVisible`); the chip/badge absence assertions in the subsequent tests will FAIL if the toggle silently no-oped, which would surface — but nothing annotates `testInfo` when `applied === false`, so CI output misrepresents "flag off passed" when the flag was never off.
**Fix:**
```ts
test.beforeEach(async ({ request }, testInfo) => {
  const result = await disablePerJourney(request);
  if (!result.applied) {
    testInfo.annotations.push({
      type: 'warning',
      description: `flag-off setup did not apply: ${result.reason}`,
    });
    test.skip(true, `flag-off unavailable: ${result.reason}`);
  }
});
```

### WR-03: `RdPortfolioCell` state logic duplicates `PlanVsActualCell#computeState`

**File:** `src/components/timeline/rd-portfolio-cell.tsx:21-29` vs `src/components/timeline/PlanVsActualCell.tsx:58-67`
**Issue:** `computeRdState` duplicates the plan/actual thresholding logic verbatim (10% ratio, -20% under, etc.). If the thresholds change in `PlanVsActualCell` (the source of truth for all cell rendering), `RdPortfolioCell` silently diverges and the red-cell → OvercommitDialog routing will use the OLD thresholds while the cell color shows the NEW. No tests guard this invariant.
**Fix:** Export `computeState` from `PlanVsActualCell.tsx` and have `rd-portfolio-cell.tsx` import + reuse it:
```ts
// PlanVsActualCell.tsx
export function computeState(planned: number, actual: number | null): CellState { ... }

// rd-portfolio-cell.tsx
import { computeState } from './PlanVsActualCell';
const state = computeState(plannedHours, actualHours);
```

### WR-04: `capacity.read.ts#getOvercommitBreakdown` dead code block

**File:** `src/features/capacity/capacity.read.ts:375-380`
**Issue:**
```ts
const peoplePlanned = new Map<string, number>();
for (const r of projectRows) {
  // projectRows contains personId implicitly via the join result? No — we
  // need a separate people-planned query since the project projection drops
  // personId. Accumulate via a dedicated query.
}
```
The `for` loop has no body — only a comment explaining why. This creates confusion during future refactors (reader wonders "is an accumulation missing?"). The actual accumulation happens at lines 395-397 via `personRows`. Remove the dead loop.
**Fix:**
```ts
const peoplePlanned = new Map<string, number>();
// personId isn't projected by the projectRows query above (we only select
// projectId + projectName + hours). Run a dedicated person-level aggregation:
const personRows = await db.select({...}).from(...).where(...);
for (const r of personRows) {
  peoplePlanned.set(r.personId, (peoplePlanned.get(r.personId) ?? 0) + Number(r.hours));
}
```

### WR-05: `persona-switcher.tsx` silent persona-change abort on unloaded people list

**File:** `src/components/persona/persona-switcher.tsx:99-109`
**Issue:** When user changes the persona kind before `fetchPeople()` resolves, `defaultPersonId = preservedPersonId ?? people[0]?.id ?? null`. For `pm` / `staff` kinds `buildPersona` returns `null` when `personId === null`, and `handleKindChange` silently `return`s. The `<select>` DOM already reflects the new kind (browser applied the value change), but the React state hasn't updated — the dropdown shows the user's intent but `persona.kind` is still the old value. Subsequent renders of switches that read `persona.kind` will disagree with the visible `<select>`. Users see "I selected PM but nothing happened."
**Fix:**
```ts
function handleKindChange(e: ChangeEvent<HTMLSelectElement>) {
  const nextKind = e.target.value as PersonaKind;
  const label = t(`kind.${nextKind}`);
  const preservedPersonId = currentPersonId(persona);
  const defaultPersonId = preservedPersonId ?? people[0]?.id ?? null;
  const next = buildPersona(nextKind, label, defaultPersonId);
  if (!next) {
    // Restore the select to the old value so UI doesn't lie.
    e.target.value = persona.kind;
    toast.info(t('awaitingPeople'));
    return;
  }
  setPersona(next);
  router.push(getLandingRoute(next));
}
```

### WR-06: `2b-approve-reject.spec.ts` passes silently when badge absent

**File:** `e2e/line-manager/2b-approve-reject.spec.ts:33-43`
**Issue:** The only click-count assertion is inside an `if (badgeCount > 0)` branch. When the badge is not rendered (flag off, count=0, or a regression that breaks visibility), the test annotates "todo" and passes without asserting anything meaningful. Seed baseline has 2 pending proposals for Per's department, so the badge should ALWAYS be visible in this spec's fixture — a missing badge is therefore a real regression, not an expected "pre-wiring" state. This test will silent-pass on any badge breakage.
**Fix:**
```ts
const badge = page.locator('[data-testid="lm-approval-queue-badge"]');
await expect(badge).toBeVisible({ timeout: 5000 });  // hard assert, not conditional
await resetClickCount(page);
await badge.click();
await expect(page).toHaveURL(/\/line-manager\/approval-queue/);
expect(await getClickCount(page)).toBeLessThanOrEqual(1);
```

## Info

### IN-01: `click-tracker.tsx` env check lives inside useEffect

**File:** `src/lib/testing/click-tracker.tsx:32-33`
**Issue:** `process.env.NEXT_PUBLIC_E2E_CLICK_TRACKING !== 'true'` is checked inside `useEffect` rather than at module scope. In prod bundles Next.js inlines the env var as a constant, so the effect still runs once per mount and early-returns. Claim of "zero-overhead provider" in the comment is technically inaccurate — React still installs + runs the effect.
**Fix:** Hoist to module constant:
```ts
const TRACKING_ENABLED = process.env.NEXT_PUBLIC_E2E_CLICK_TRACKING === 'true';

export function ClickTrackerProvider({ children }) {
  useEffect(() => {
    if (!TRACKING_ENABLED) return;
    // ...
  }, []);
  return <>{children}</>;
}
```
With Next.js bundler, when `TRACKING_ENABLED === false` at build time, the entire effect body dead-codes.

### IN-02: `rd/page.tsx` deep-link effect dep includes full `drawer` object

**File:** `src/app/(app)/rd/page.tsx:123`
**Issue:** `useEffect(..., [searchParams, drawer])` re-runs every time any drawer state field changes. `drawer.isOpen` guard prevents re-opens, so there's no infinite loop, but the effect re-evaluates `searchParams.get(...)` four times on every drawer transition. Narrow the dep to `[searchParams, drawer.isOpen, drawer.open]`.

### IN-03: `overcommit-dialog.tsx` ESC listener re-attached every render

**File:** `src/components/dialogs/overcommit-dialog.tsx:73-80` + `src/app/(app)/rd/page.tsx:248`
**Issue:** The ESC useEffect depends on `[open, onClose]`. The /rd page passes `onClose={() => setOvercommit(null)}` as an inline arrow — `onClose` identity changes every parent render, causing the listener to be removed + re-added on every render while the dialog is open. Cosmetic perf issue only.
**Fix:** `const handleClose = useCallback(() => setOvercommit(null), []);` on the page, pass `handleClose` to the dialog.

### IN-04: `overcommit-dialog.tsx` `pctOfOvercommit` is actually % of total planned, not % of overcommit

**File:** `src/features/capacity/capacity.read.ts:351` + `src/components/dialogs/overcommit-dialog.tsx:124`
**Issue:** The field name `pctOfOvercommit` is assigned `plannedHours / totalPlanned` — that's "project's share of department's total planned," NOT "project's share of the overbook amount (planned - capacity)." Example: dept has 120 planned / 100 capacity (overcommit = 20); project contributing 60h gets `pctOfOvercommit = 60/120 = 0.5` (rendered "50%"), but that project is contributing 0% of the 20-hour overcommit (or 100%, or any ratio — you can't attribute an overcommit to a single project without a prioritization model). Users may interpret "50% of överbokningen" as "this project is half the overcommit." Consider renaming to `pctOfTotalPlanned` or making the i18n label unambiguous ("bidrar 50% av planerade timmar" vs. "bidrar 50% av överbokningen").

### IN-05: `rd/page.tsx` type cast `personaId as string`

**File:** `src/app/(app)/pm/page.tsx:52`
**Issue:** `queryFn: () => fetchPmHome(personaId as string)` — reachable only when `enabled: !!personaId`, but the cast bypasses TypeScript's narrowing. Safer:
```ts
queryFn: () => {
  if (!personaId) throw new Error('personaId required');
  return fetchPmHome(personaId);
},
```

### IN-06: `pm/page.tsx` transient un-redirect edge

**File:** `src/app/(app)/pm/page.tsx:60-65`
**Issue:** When PM gains a second project (TanStack Query refetch), `data.defaultProjectId` becomes `null`. The effect's condition fails → no re-navigation. User stays on `/pm/projects/<oldId>` while the URL bar reflects pre-refetch state. Harmless but worth a test.

### IN-07: `seed/route.ts` throws Error instead of returning 500/403

**File:** `src/app/api/test/seed/route.ts:83-87`
**Issue:** The prod-mode gate `throw new Error('[api/test/seed] test-only route imported in production build')` produces a 500 with the sentinel string. A 404/403 NextResponse would be less information-leaking. That said, the static invariant test (`tests/invariants/no-test-routes-in-prod.test.ts`) asserts the throw string is present in source, so changing this requires coordinated update. Noted for future consideration.

### IN-08: `flag-off-parity.spec.ts` narrowing heuristic in `flag-toggle.ts`

**File:** `e2e/helpers/flag-toggle.ts:28-30`
**Issue:** `'request' in requestOrPage && typeof (requestOrPage as Page).request === 'object'` relies on Playwright's internal shape (Page exposes a `request` APIRequestContext instance property). If Playwright renames or restructures this the narrowing silently falls through to the APIRequestContext branch. Low risk; Playwright API is stable.

### IN-09: `proposal.service.ts` repeated `tx as unknown as Parameters<...>[1]` casts

**File:** `src/features/proposals/proposal.service.ts:121, 210, 286, 381, 533, 593, 614, 696`
**Issue:** Eight `as unknown as` double-casts to satisfy `recordChange`'s tx parameter type. This is pre-Phase 52 technical debt but the new `getQueueCount` function (which does not mutate, so no tx) is notably clean. Worth a future refactor to make `recordChange` accept a TxLike union so the cast disappears.

### IN-10: `use-pm-wish-counts.ts` client-side filtering at scale

**File:** `src/features/proposals/use-pm-wish-counts.ts:25-33`
**Issue:** Fetches `proposals?proposerId=<userId>&status=proposed,rejected` and counts client-side. For a PM with hundreds of historical rejected proposals this returns the full list every 60s. Pitfall #10 in 52-RESEARCH acknowledges this as "acceptable for v6.0 volumes" — noted. When the LM-03 pattern (dedicated count endpoint) is followed, PM-02 should too.

### IN-11: `persona-switcher.tsx` hook-call for non-LM personas

**File:** `src/components/persona/persona-switcher.tsx:91-96`
**Issue:** `useLmQueueCount` is invoked unconditionally (rules of hooks), with `enabled` gating the fetch. Correct behavior. But there's no unit test asserting "non-LM persona does not fetch" — the `persona-switcher.lm-suffix.test.tsx` suite only covers `LM_PERSONA` scenarios. Add a test where `persona.kind === 'pm'` and assert `fetchMock` was not called.

---

_Reviewed: 2026-04-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
