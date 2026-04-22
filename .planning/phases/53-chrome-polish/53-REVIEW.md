---
phase: 53-chrome-polish
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 51
files_reviewed_list:
  - e2e/_invariants/flag-off-parity.spec.ts
  - e2e/_viewport/_diagnostic.spec.ts
  - e2e/_viewport/manager-dashboard-1440x900.spec.ts
  - e2e/_viewport/project-leader-dashboard-1440x900.spec.ts
  - e2e/alerts/polish-tabs.spec.ts
  - e2e/helpers/flag-toggle.ts
  - e2e/lib/seed.ts
  - src/app/(app)/__tests__/persona-redirect.test.tsx
  - src/app/(app)/alerts/__tests__/tabs.test.tsx
  - src/app/(app)/alerts/page.tsx
  - src/app/(app)/dashboard/dashboard-content.tsx
  - src/app/(app)/help/page.tsx
  - src/app/(app)/line-manager/__tests__/approval-queue-badge.test.tsx
  - src/app/(app)/rd/__tests__/overcommit-routing.test.tsx
  - src/app/(platform)/tenants/[orgId]/page.tsx
  - src/app/api/test/seed/route.ts
  - src/app/api/v5/capacity/overcommit/__tests__/count.test.ts
  - src/app/api/v5/capacity/overcommit/count/route.ts
  - src/components/alerts/__tests__/resource-conflicts-panel.test.tsx
  - src/components/alerts/__tests__/strategic-alerts-banner.test.tsx
  - src/components/alerts/resource-conflicts-panel.tsx
  - src/components/alerts/strategic-alerts-banner.tsx
  - src/components/charts/__tests__/discipline-donut.test.tsx
  - src/components/charts/discipline-donut.tsx
  - src/components/layout/__tests__/top-nav.visibleFor.test.tsx
  - src/components/layout/top-nav.tsx
  - src/components/persona/__tests__/notification-bell.test.tsx
  - src/components/persona/__tests__/persona-switcher.lm-suffix.test.tsx
  - src/components/persona/notification-bell.tsx
  - src/db/migrations/20260422_polish_discipline_rename.sql
  - src/db/migrations/20260422_polish_strip_resource_conflicts.sql
  - src/db/migrations/20260422_polish_strip_widgets.sql
  - src/db/migrations/__tests__/polish-discipline-rename.test.ts
  - src/db/migrations/__tests__/polish-strip-resource-conflicts.test.ts
  - src/db/migrations/__tests__/polish-strip-widgets.test.ts
  - src/features/capacity/capacity.service.ts
  - src/features/dashboard/__tests__/default-layouts.test.ts
  - src/features/dashboard/default-layouts.ts
  - src/features/dashboard/widgets/__tests__/discipline-breakdown-widget.test.tsx
  - src/features/dashboard/widgets/discipline-breakdown-widget.tsx
  - src/features/dashboard/widgets/index.ts
  - src/features/dashboard/widgets/resource-conflict-widget.tsx
  - src/features/flags/__tests__/flag.service.test.ts
  - src/features/flags/flag.context.tsx
  - src/features/flags/flag.service.ts
  - src/features/flags/flag.types.ts
  - src/features/personas/persona.context.tsx
  - src/features/proposals/use-rd-overcommit-count.ts
  - src/messages/en.json
  - src/messages/keys.ts
  - src/messages/sv.json
findings:
  critical: 0
  warning: 5
  info: 7
  total: 12
status: issues_found
---

# Phase 53: Code Review Report

**Reviewed:** 2026-04-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 51
**Status:** issues_found

## Summary

Phase 53 (Chrome Polish) is well structured: every behavioral change is gated by `uiV6Polish`, migrations are idempotent with per-tenant scoping, and the new API endpoint (`/api/v5/capacity/overcommit/count`) reuses the established Phase 52 LM-03 pattern (`requireRole('planner')` + service-layer tenant scoping). Test coverage is broad — 26 STRIDE threats have dedicated assertions, and both `DEFAULT_LAYOUTS` / `LEGACY_LAYOUTS` are explicitly tested so the rollback path cannot regress silently.

Findings are dominated by hygiene issues (Info) with a handful of Warnings where contract drift or hidden skip-in-CI behavior could cause silent passes in the future. No Critical issues were identified.

Key concerns:

1. **Flag-off parity e2e specs silently skip in CI** — `/api/test/flags` endpoint does not exist in the tree, so `setPolishFlag`/`disablePerJourney` always fall through to `test.skip(...)`. The "POLISH-FLAG" and Phase 52 parity suites therefore never actually exercise flag-off assertions in automated runs. The helper already warns via `testInfo.annotations`, but this is easy to miss. Recommend either wiring the route in Phase 54 or downgrading the tests to `.fixme()` with a TODO to make the gap visible in reports. (WR-01)
2. **`NotificationBell` defeats its own T-53-11 DoS mitigation** for non-admin personas — `useAlertCount(...)` is invoked unconditionally and has no `enabled` parameter, so PM/LM/RD users poll `/api/v5/capacity/alerts` continuously even though the returned data is never read. (WR-02)
3. **`parseTab` query-param sanitization is correct but relies on the fact that `conflicts` is the only valid non-default tab** — any future 3-tab design silently truncates to `warnings`, which could hide routing regressions. (WR-03)
4. **`useAuth()` may be unbound** — `NotificationBell` reads `userId` from Clerk but is rendered by the top-nav on every route, including ones that predate the ClerkProvider wrap. Behavior is defensively covered (`pmEnabled` short-circuits when `!userId`), but `usePmWishCounts(userId ?? '', pmEnabled)` would produce fetches against `/api/…?clerkUserId=` if `enabled` logic drifts. (WR-04)
5. **Spec `expect(...).toBeTruthy()` uses `compareDocumentPosition` bitmask incorrectly** — the result of `& DOCUMENT_POSITION_FOLLOWING` is a number (0 or 4); `.toBeTruthy()` coerces 4 to true but would pass silently if the flag changes to a value that still coerces to truthy (e.g., DOCUMENT_POSITION_CONTAINED_BY = 16). Assertion should be `.toBe(Node.DOCUMENT_POSITION_FOLLOWING)` or `> 0`. (WR-05)

Out-of-scope per CONTEXT (not flagged): POLISH-07 viewport specs having zero `expect()` calls, LEGACY_LAYOUTS retaining stripped IDs, physical widget-file retention, pre-existing typecheck/test failures.

## Warnings

### WR-01: Flag-off parity specs silently skip — `/api/test/flags` endpoint never shipped

**File:** `e2e/helpers/flag-toggle.ts:33-47`, `e2e/_invariants/flag-off-parity.spec.ts:38-46`, `e2e/_invariants/flag-off-parity.spec.ts:179-188`
**Issue:** `setFlag()` POSTs to `/api/test/flags`, but that route does not exist in `src/app/api/test/` (only `seed/` is present). Every invocation falls through to the catch block (`404` or `ERR_CONNECTION_REFUSED`), returning `{ applied: false, reason: ... }`. Both the Phase 52 `disablePerJourney` parity suite AND the new Phase 53 `POLISH-FLAG` suite call `test.skip(true, ...)` whenever `applied=false` — so in CI runs today, every "flag-off" assertion never executes. The `testInfo.annotations` warning is the only indicator, and it is easy to miss in a green CI report. This is a silent watch-weakening: the Invariant #2 narrative ("flag-off parity is enforced by CI") is not actually true.
**Fix:** Either (a) add the minimal test-only `/api/test/flags/route.ts` in this phase (same gates as `/api/test/seed/route.ts`: production throw + `E2E_SEED_ENABLED` gate + runtime 404), or (b) convert the parity-skip into a hard failure so the tests fail loud rather than silent:
```ts
// In flag-off-parity.spec.ts beforeEach:
if (!result.applied) {
  throw new Error(`flag-toggle endpoint missing (${result.reason}) — Phase 53 parity cannot be verified`);
}
```
Preferred: option (a). The endpoint is trivial (≤30 lines) and unblocks every subsequent phase that wants per-test flag control.

---

### WR-02: `NotificationBell` polls `/api/v5/capacity/alerts` for every non-admin persona

**File:** `src/components/persona/notification-bell.tsx:63-69`
**Issue:** The header comment (lines 20-24) claims T-53-11 DoS is mitigated by "only ONE hook actually polls per user at a time." The three hooks with `enabled` gates (`usePmWishCounts`, `useLmQueueCount`, `useRdOvercommitCount`) honor that contract, but `useAlertCount(monthFrom, monthTo)` has no `enabled` parameter, so it fires on every mount regardless of persona. For PM, LM, and RD users the fetched data is discarded (it's only read inside the admin `else` branch), meaning every persona hammers `/api/v5/capacity/alerts` — which is the exact mitigation the comment disclaims. For a tenant of 100 users, one view of the bell costs 100 unnecessary requests; the `refetchInterval` baked into `useAlertCount` makes this ongoing.
**Fix:** Either add an `enabled` parameter to `useAlertCount` (mirror `useRdOvercommitCount`) and pass `adminEnabled`, or move the call behind an early return so only admins instantiate the hook:
```ts
// Move the admin-only hook usage behind the persona branch:
function NotificationBellInner({ persona, uiV6Polish, userId }: ...) {
  if (persona.kind === 'admin') return <AdminBell />;
  if (persona.kind === 'pm')    return <PmBell userId={userId} />;
  // etc.
}
```
Or — simpler — extend `useAlertCount` signature:
```ts
// src/hooks/use-alerts.ts
export function useAlertCount(from: string, to: string, enabled = true) {
  return useQuery({ ..., enabled });
}
// notification-bell.tsx
const { data: alertCount } = useAlertCount(monthFrom, monthTo, adminEnabled);
```
The comment at lines 63-67 acknowledges the issue ("Hooks must be invoked unconditionally") but the claim "the fetch itself is cheap + caches per window" does not hold across many tenants — the fetch is tenant-scoped and the query key does not include `adminEnabled`, so cache sharing across personas does not reduce calls.

---

### WR-03: Unknown `?tab=` values silently coerce to `warnings` without signal

**File:** `src/app/(app)/alerts/page.tsx:34-38`
**Issue:** `parseTab()` narrows to the allowlist `'conflicts' | 'warnings'` (good — T-53-21 guard is correct). But any future third tab added to `AlertsTab` that isn't "conflicts" will be silently demoted to "warnings" at runtime. Combined with the fact that the tab button's `onClick` calls `router.replace()` with the new value BEFORE React has re-read the search params, a typo in the `setTab` call site (e.g., `setTab('conflict' as AlertsTab)`) will ship a broken deep-link without any test failure.
**Fix:** Keep the allowlist but make it a single source of truth — extract to a constant and derive the type:
```ts
const ALERTS_TABS = ['warnings', 'conflicts'] as const;
type AlertsTab = typeof ALERTS_TABS[number];

function parseTab(raw: string | null): AlertsTab {
  return (ALERTS_TABS as readonly string[]).includes(raw ?? '')
    ? (raw as AlertsTab)
    : 'warnings';
}
```
This keeps the T-53-21 guard intact while making any future tab addition a one-line change that the type checker enforces across `setTab` call sites.

---

### WR-04: `NotificationBell` depends on Clerk being mounted — defensive default masks ProviderError

**File:** `src/components/persona/notification-bell.tsx:45,57`
**Issue:** `const { userId } = useAuth()` throws if the component is rendered outside a `<ClerkProvider>`. The subsequent `usePmWishCounts(userId ?? '', pmEnabled)` defends against `null`/`undefined` userId with `?? ''`, but an empty-string `clerkUserId` may hit the backend query parameter and return a tenant-leak if the API route doesn't enforce non-empty. This is upstream of Phase 53, but the Phase 53 flag exposes the surface: under `uiV6Polish=true`, the bell is always mounted for every persona. If `usePmWishCounts` internally uses the empty string as a query param and the route falls back to "query all users" behavior, this is a tenant-isolation concern.
**Fix:** Verify `usePmWishCounts` rejects empty-string inputs (either by disabling the fetch or adding input validation in the route handler). If not, either make the `pmEnabled` condition also require `userId` to be a non-empty string (already partially done — `!!userId` — but only for `pmEnabled`, not as a pre-condition for the hook call site):
```ts
const pmEnabled = uiV6Polish && persona.kind === 'pm' && !!userId;
// Safer: never call with empty string, even when disabled
const { data: pm } = usePmWishCounts(userId || 'disabled', pmEnabled);
```
A sentinel like `'disabled'` makes accidental mis-enables visible in logs. Low priority — the existing `enabled` check already prevents the fetch — but worth hardening since Phase 53 is the first time the bell mounts for all personas.

---

### WR-05: `compareDocumentPosition` bitmask assertion is loose

**File:** `src/components/alerts/__tests__/strategic-alerts-banner.test.tsx:199-201`
**Issue:**
```ts
expect(
  bannerEl!.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
).toBeTruthy();
```
The bitwise `&` returns `0` or `4` (Node.DOCUMENT_POSITION_FOLLOWING = 4). `.toBeTruthy()` passes when the value is truthy — but it would also pass if the bitmask accidentally captured other bits (e.g., if `compareDocumentPosition` returned `DOCUMENT_POSITION_CONTAINED_BY | DOCUMENT_POSITION_FOLLOWING = 20`, which would still evaluate truthy but would mean the relationship is different). The intent is clearly "banner comes before grid in document order," but the assertion doesn't match the intent as strictly as possible.
**Fix:**
```ts
expect(
  bannerEl!.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
// Or the crisper:
expect(bannerEl!.compareDocumentPosition(grid)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
```
Minor severity — current test passes correctly today — but tightens the contract against future jsdom changes.

---

## Info

### IN-01: `e2e/_invariants/flag-off-parity.spec.ts` mixes two invariant suites in one file

**File:** `e2e/_invariants/flag-off-parity.spec.ts:32-253`
**Issue:** The file contains two `test.describe` blocks (Phase 52 `Invariant #2` and Phase 53 `POLISH-FLAG`) with different `beforeEach`/`afterEach` semantics (`disablePerJourney` vs `setPolishFlag(false)`). Mixing flag scopes in one spec file means a failure in one invariant makes it harder to attribute which phase regressed. The "afterEach restores seed state" contract is also duplicated — a single file-scoped `afterEach` would be safer.
**Fix:** Split into `e2e/_invariants/flag-off-parity-v52.spec.ts` and `e2e/_invariants/flag-off-parity-v53.spec.ts`. Keeps attribution clean when CI reports a failure.

---

### IN-02: Commented-out `expect(hrefs).toContain('/alerts');` duplicated

**File:** `src/components/layout/__tests__/top-nav.visibleFor.test.tsx:159,163`
**Issue:** Test 1 asserts `expect(hrefs).toContain('/alerts');` twice (lines 159 and 163) — the second occurrence has an inline comment explaining the flag-off reasoning but is functionally a dead repeat.
**Fix:** Remove line 163 or combine the comment with line 159:
```ts
// Flag-off parity: alerts has visibleFor=['line-manager','rd','admin']
// but with uiV6Polish=false, visibleFor is a no-op, so staff sees /alerts too.
expect(hrefs).toContain('/alerts');
```

---

### IN-03: `void M1; void M3;` in test file is a code smell

**File:** `src/app/api/v5/capacity/overcommit/__tests__/count.test.ts:79-81`
**Issue:** `const [, M1, M2, M3] = generateMonthRange(CURRENT, 4);` destructures 4 months, but only M2 is used. The two `void` statements suppress the unused-var lint, which is the correct escape hatch but clutters the file. Cleaner to only destructure what's needed.
**Fix:**
```ts
const months = generateMonthRange(CURRENT, 4);
const M2 = months[2];
```
Or if ESLint's `no-unused-vars` is the only reason for `void`:
```ts
const [/* CURRENT */, /* M1 */, M2 /* M3 */] = generateMonthRange(CURRENT, 4);
```

---

### IN-04: `DisciplineDonut` palette cycling test asserts render but not palette application

**File:** `src/components/charts/__tests__/discipline-donut.test.tsx:49-62`
**Issue:** Test name says "cycles through palette when data.length > colors.length" but the assertion only checks that `ResponsiveContainer` renders. The actual palette-cycling logic (`palette[i % palette.length]`) is never exercised. A regression that hard-codes the first color for all cells would not fail this test.
**Fix:** Assert on cell fill colors via the `data-testid="discipline-donut-cell-N"` attributes the production code emits:
```ts
const { container } = render(<DisciplineDonut data={manyRows} colors={palette} />);
const cells = container.querySelectorAll('[data-testid^="discipline-donut-cell-"]');
// The Cell component in recharts applies fill via style or attr; verify at least
// one cell has '#111111' and one has '#222222' to confirm cycling.
```
Alternatively, unit-test the palette-cycling helper in isolation if it's extractable.

---

### IN-05: `flag-toggle.ts` `setFlag` discriminator uses fragile heuristic

**File:** `e2e/helpers/flag-toggle.ts:26-31`
**Issue:**
```ts
const request: APIRequestContext =
  'request' in requestOrPage && typeof (requestOrPage as Page).request === 'object'
    ? ((requestOrPage as Page).request as APIRequestContext)
    : (requestOrPage as APIRequestContext);
```
This runtime discriminator ("does it have a `.request` property?") is fragile because `APIRequestContext` in some Playwright versions has a `.request` method used internally. A cleaner split is two explicit overloads:
```ts
export function setFlag(ctx: APIRequestContext, args: ...): Promise<...>;
export function setFlag(page: Page, args: ...): Promise<...>;
```
**Fix:** Split into two exported helpers (`setFlagViaRequest` / `setFlagViaPage`) or use TypeScript overload signatures — the overload approach keeps the call sites unchanged.

---

### IN-06: `tests/__tests__/tabs.test.tsx` — `router.replace` argument assertion is brittle

**File:** `src/app/(app)/alerts/__tests__/tabs.test.tsx:145-148`
**Issue:**
```ts
fireEvent.click(screen.getByTestId('alerts-tab-conflicts'));
expect(replaceMock).toHaveBeenCalledTimes(1);
expect(replaceMock.mock.calls[0][0]).toBe('/alerts?tab=conflicts');
```
This asserts exact equality on the URL string. If the implementation ever preserves other query params (e.g., filters, scroll position), the replace call becomes `/alerts?filter=foo&tab=conflicts` and this test breaks without indicating the actual regression. The production code already uses `URLSearchParams.set()` so preservation is the intent — the test should match that semantics:
```ts
const calledWith = replaceMock.mock.calls[0][0];
const url = new URL(calledWith, 'http://localhost');
expect(url.pathname).toBe('/alerts');
expect(url.searchParams.get('tab')).toBe('conflicts');
```

---

### IN-07: `StrategicAlertsBanner` computes `monthTo` slightly differently than `NotificationBell`

**File:** `src/components/alerts/strategic-alerts-banner.tsx:25-26`, `src/components/persona/notification-bell.tsx:48-50`
**Issue:** Two call sites ask for "current month + 3 months":
- Banner: `generateMonthRange(monthFrom, 3).at(-1) ?? monthFrom` → 3 months total, last element
- Bell: `generateMonthRange(monthFrom, 4)` → 4 months total, last element

Both claim to match "the same 4-month window used by TopNav AlertBadge" (see banner.tsx:20 and notification-bell.tsx:49). The banner passes `3` but the bell passes `4`. If `generateMonthRange(from, n)` produces `n` months, these emit different windows — the banner covers 3 months, the bell covers 4. This may be intentional (banner uses a shorter lookahead) but the comments are misaligned.
**Fix:** Audit both to match the documented intent. If both should be 4 months, update the banner:
```ts
// banner:
const monthTo = generateMonthRange(monthFrom, 4).at(-1) ?? monthFrom;
```
If the banner intentionally uses 3, update the comment to explicitly state "shorter 3-month window" so the next reader doesn't think the code drifted.

---

_Reviewed: 2026-04-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
