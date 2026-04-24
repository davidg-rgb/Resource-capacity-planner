---
phase: 53-chrome-polish
reviewed: 2026-04-24T00:00:00Z
depth: standard
review_type: verification-pass
previous_review: .planning/phases/53-chrome-polish/53-REVIEW.md
previous_fix: .planning/phases/53-chrome-polish/53-REVIEW-FIX.md
files_reviewed: 27
files_reviewed_list:
  - src/app/(app)/alerts/page.tsx
  - src/app/(app)/alerts/__tests__/tabs.test.tsx
  - src/app/(app)/dashboard/dashboard-content.tsx
  - src/app/api/test/flags/route.ts
  - src/app/api/test/flags/__tests__/route.test.ts
  - src/components/alerts/resource-conflicts-panel.tsx
  - src/components/alerts/strategic-alerts-banner.tsx
  - src/components/alerts/__tests__/resource-conflicts-panel.test.tsx
  - src/components/alerts/__tests__/strategic-alerts-banner.test.tsx
  - src/components/charts/discipline-donut.tsx
  - src/components/charts/__tests__/discipline-donut.test.tsx
  - src/components/persona/notification-bell.tsx
  - src/db/migrations/20260422_polish_discipline_rename.sql
  - src/db/migrations/20260422_polish_strip_resource_conflicts.sql
  - src/db/migrations/20260422_polish_strip_widgets.sql
  - src/db/migrations/__tests__/polish-discipline-rename.test.ts
  - src/db/migrations/__tests__/polish-strip-resource-conflicts.test.ts
  - src/db/migrations/__tests__/polish-strip-widgets.test.ts
  - src/features/dashboard/default-layouts.ts
  - src/features/dashboard/__tests__/default-layouts.test.ts
  - src/features/dashboard/widgets/index.ts
  - src/features/dashboard/widgets/discipline-breakdown-widget.tsx
  - src/features/dashboard/widgets/__tests__/discipline-breakdown-widget.test.tsx
  - src/features/dashboard/widgets/resource-conflict-widget.tsx
  - src/features/proposals/use-pm-wish-counts.ts
  - src/hooks/use-alerts.ts
  - src/components/persona/notification-bell.tsx
prior_fixes:
  WR-01: confirmed_landed
  WR-02: confirmed_landed
  WR-03: confirmed_landed
  WR-04: confirmed_landed
  WR-05: confirmed_landed
findings:
  blocker: 0
  major: 2
  minor: 4
  nit: 3
  total: 9
status: issues_found
flag_flip_risk: low
---

# Phase 53: Code Review Verification Report

**Reviewed:** 2026-04-24
**Depth:** standard (verification-pass)
**Files Reviewed:** 27 source files in Phase 53 commit range (475d193^..HEAD)
**Status:** issues_found (2 Major, 4 Minor, 3 Nit; 0 Blocker)
**Flag-flip readiness:** LOW risk — findings are watch-strengthening and edge-case hardening, not regressions

## Summary

Second-pass review of Phase 53 (Chrome Polish) on the post-fix state. All five prior findings (WR-01..WR-05) landed cleanly; see the Prior Findings Re-Verification section. No BLOCKER issues surfaced. Two MAJOR issues are raised and both are contract-drift / watch-weakening concerns that would not break the flag-ON flip but should be cleaned up before the next deployment:

- **MJ-01** — The `no-test-routes-in-prod` static invariant (`tests/invariants/no-test-routes-in-prod.test.ts`) still only covers `api/test/seed`. The new WR-01 fix added `api/test/flags` but did NOT extend the invariant to cover it. The comment in `src/app/api/test/flags/route.ts:13` explicitly claims "Throw string matches no-test-routes-in-prod invariant" — which is aspirationally true but not actually enforced. If the flags route ever tree-shakes past the handler-level throw, the invariant would not catch the leak.
- **MJ-02** — The `/api/test/flags` route hard-codes `E2E_PLATFORM_ADMIN_ID` in module scope (line 41), but this ID is seeded by a separate route (`/api/test/seed`). If a test harness calls `/api/test/flags` BEFORE `/api/test/seed`, the upsert's `setByAdminId` FK target will not exist and the insert will throw a foreign-key violation. Playwright's `globalSetup` does seed first, so production E2E is fine; but the isolated contract test in `route.test.ts` only works because the test seeds its own admin row at `beforeAll` — and the comment at line 23 correctly documents this dependency. A local dev running just `/api/test/flags` without prior seed would 500. Not a prod risk but a developer-ergonomics footgun.

The four Minor findings are contract-tightening candidates (bitmask assertion edge cases, duplicate-widget-id after migration, unvalidated query params, overly broad catch). The three Nit findings are stylistic.

**Flag-flip readiness:** All surfaces consulted (`NotificationBell`, `AlertsPage` tabs, `StrategicAlertsBanner`, `DashboardContent`, `DisciplineBreakdownWidget`, `DEFAULT_LAYOUTS`) correctly gate on `flags.uiV6Polish`, and the flag-off path is still backed by `LEGACY_LAYOUTS` + legacy widget registrations. No surface accesses Polish-only state outside a flag guard. The `/alerts?tab=conflicts` deep-link is correctly forced to the warnings view when the flag is off (see `alerts/page.tsx:112`). Live prod parity was verified on Vercel on 2026-04-22.

## Prior Findings Re-Verification (WR-01..WR-05)

### WR-01: `/api/test/flags` endpoint — LANDED

**Files verified:** `src/app/api/test/flags/route.ts` (90 lines), `src/app/api/test/flags/__tests__/route.test.ts` (148 lines)
**Status:** LANDED — implementation matches the REVIEW.md recommendation (option a).

- Gate 1 (production throw): `src/app/api/test/flags/route.ts:51-55` — matches `/api/test/seed/route.ts` shape.
- Gate 2 (runtime 404): `src/app/api/test/flags/route.ts:57-59` — correctly reuses `E2E_SEED_ENABLED`.
- Body validated with `z.object({ flagName: z.enum(FLAG_NAMES), enabled: z.boolean() })` (line 43-46); `FLAG_NAMES` confirmed present at `src/features/flags/flag.types.ts:1-11`.
- Upsert against `feature_flags_org_flag_uniq` composite index (line 79-86).
- Test coverage: 6 cases (happy path, idempotent flip, gate-2 404, missing-field 400, unknown-enum 400, production-throw).

**Caveat surfaced by fresh-eyes review:** See MJ-01 (invariant not extended) and MJ-02 (seed dependency).

### WR-02: `useAlertCount` gated by `adminEnabled` — LANDED

**Files verified:** `src/hooks/use-alerts.ts:35-54`, `src/components/persona/notification-bell.tsx:68`
**Status:** LANDED cleanly.

- `useAlertCount` now takes `enabled: boolean = true` third arg; default preserves legacy `AlertBadge` callers (confirmed via grep — `AlertBadge` is not in this diff's scope, but the default-true signature guarantees parity).
- `NotificationBell` passes `adminEnabled` at line 68. PM/LM/RD personas no longer fetch `/api/analytics/alerts/count`. The `void adminEnabled` marker the fix report promised to remove is gone.
- T-53-11 DoS mitigation is now actually enforced.

### WR-03: `ALERTS_TABS` constant + derived type — LANDED

**Files verified:** `src/app/(app)/alerts/page.tsx:32-45`
**Status:** LANDED.

- `ALERTS_TABS = ['warnings', 'conflicts'] as const` (line 36).
- `type AlertsTab = (typeof ALERTS_TABS)[number]` (line 37).
- `parseTab` uses membership check (line 42). Unknown values correctly fall through to `warnings`.
- Note: `setTab` call sites at lines 83 + 96 are typed by the `next: AlertsTab` parameter; adding a tab to the tuple would immediately surface a type error at any `setTab('other-value')` call, as intended.

### WR-04: `usePmWishCounts` empty-string guard — LANDED

**Files verified:** `src/features/proposals/use-pm-wish-counts.ts:29-44`
**Status:** LANDED (additive, strictly defensive).

- `effectiveEnabled = enabled && clerkUserId.length > 0` (line 29) — guards the hook at its own boundary regardless of caller logic.
- `useQuery`'s `enabled` consumes `effectiveEnabled` (line 43), not the caller's `enabled`.
- Call site in `notification-bell.tsx:57` unchanged (`usePmWishCounts(userId ?? '', pmEnabled)`) — now doubly-safe.

### WR-05: `compareDocumentPosition` bitmask assertion — LANDED

**Files verified:** `src/components/alerts/__tests__/strategic-alerts-banner.test.tsx:201-205`
**Status:** LANDED.

- `expect(... & DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING)` (line 204-205) now exact-matches the bit, not just truthy. A stray `DOCUMENT_POSITION_CONTAINED_BY` (16) in the bitmask would now fail instead of silently passing.

---

## Major

### MJ-01: `no-test-routes-in-prod` invariant does not cover `/api/test/flags`

**File:** `tests/invariants/no-test-routes-in-prod.test.ts:37-81`, cross-reference `src/app/api/test/flags/route.ts:13,50`
**Issue:** The static invariant test hard-codes two markers:
```ts
const ROUTE_PATH_MARKER = 'api/test/seed';
const THROW_MESSAGE_MARKER = 'test-only route imported in production';
```
`THROW_MESSAGE_MARKER` is shared — the flags route uses `'[api/test/flags] test-only route imported in production build'`, which contains the shared substring, so the bundle-scan check would catch a flags-route leak via that marker. BUT the second test (`'has the module-level NODE_ENV=production throw in source'`) only reads `src/app/api/test/seed/route.ts` and never asserts the flags route preserves its throw. If someone weakens the gate in `src/app/api/test/flags/route.ts:51-55`, no test breaks.

The comment at `src/app/api/test/flags/route.ts:13` is therefore overstated: "Throw string matches no-test-routes-in-prod invariant" — it does for the bundle-leak check, but the source-level invariant is unenforced for this file.
**Fix:** Extend the invariant test to cover the flags route:
```ts
// In no-test-routes-in-prod.test.ts, add:
it('has the module-level NODE_ENV=production throw in flags route source', () => {
  const src = readFileSync('src/app/api/test/flags/route.ts', 'utf8');
  expect(src).toMatch(/process\.env\.NODE_ENV\s*===\s*['"]production['"]/);
  expect(src).toContain('test-only route imported in production build');
  expect(src).toMatch(/E2E_SEED_ENABLED/);
});
```
Optionally, refactor the markers into a `TEST_ROUTES` list and iterate — future test-only routes added in Phase 54+ will then be covered automatically.

**Why Major, not Critical:** The bundle-scan check DOES cover the flags route via the shared throw-message marker, so a real production leak would still fail the invariant in CI. But the source-level assertion is the cheaper, more reliable gate — and it's the one the code comment claims is enforced.

---

### MJ-02: `/api/test/flags` route FK-depends on `/api/test/seed` having run first

**File:** `src/app/api/test/flags/route.ts:38-41,71-86`
**Issue:** The route upserts a `featureFlags` row whose `setByAdminId` FK targets `E2E_PLATFORM_ADMIN_ID`:
```ts
const E2E_PLATFORM_ADMIN_ID = uuidv5('seed:e2e:platform_admin', FIXTURE_NS);
// ...
await db.insert(featureFlags).values({
  organizationId: E2E_ORG_ID,
  flagName: body.flagName,
  enabled: body.enabled,
  setByAdminId: E2E_PLATFORM_ADMIN_ID,  // <-- FK to platform_admins.id
})
```
That platform_admins row is only inserted by `/api/test/seed/route.ts:262-267` (inside the truncate-then-insert transaction). If a developer or a future CI step invokes `/api/test/flags` without first hitting `/api/test/seed`, the INSERT violates the FK and returns a 500 with no useful hint.

The comment at line 22-24 correctly documents the dependency, but it's a runtime-ordering constraint that's easy to miss. Playwright's `globalSetup` calls seed first, so production E2E is fine; the contract test in `route.test.ts:32-65` only passes because it seeds its own admin row in `beforeAll`.
**Fix:** Two options, either acceptable:
1. **Minimal** — return a pre-flight 409 when the platform_admins row doesn't exist, with a message pointing to `/api/test/seed`:
```ts
// Before the insert:
const adminExists = await db
  .select({ id: platformAdmins.id })
  .from(platformAdmins)
  .where(eq(platformAdmins.id, E2E_PLATFORM_ADMIN_ID))
  .limit(1);
if (adminExists.length === 0) {
  return NextResponse.json(
    { error: 'seed_required', detail: 'POST /api/test/seed must run before /api/test/flags' },
    { status: 409 },
  );
}
```
2. **Belt-and-braces** — upsert the organization + platform_admin rows at the top of the handler if missing (same UUIDs, same content). This makes the route idempotent on its own. Higher coupling but zero ordering concerns.

Option 1 is less invasive; option 2 is what `/api/test/seed` does for the org row anyway (truncate-then-insert). Pick based on how much you trust the Playwright ordering to stay correct as the test surface grows.

**Why Major, not Minor:** Any non-Playwright caller (manual curl, a new CI job, a developer using the route standalone) hits a confusing 500. The fix is small but nontrivial enough that it warrants a dedicated follow-up.

---

## Minor

### MN-01: `polish_discipline_rename.sql` migration produces duplicate widget IDs when both legacy IDs are present

**File:** `src/db/migrations/20260422_polish_discipline_rename.sql:16-27`, test `src/db/migrations/__tests__/polish-discipline-rename.test.ts:109-124`
**Issue:** The test at line 109 explicitly asserts this as "acceptable": when a layout contains both `discipline-chart` AND `discipline-distribution`, the migration produces two `discipline-breakdown` placements at different positions. The test comment calls this "documented as acceptable."

Downstream risk: the widget registry's render loop iterates `layout.map((placement) => ...)` and a duplicate widget-id means the widget mounts twice with different `position` + `colSpan`. For `DisciplineBreakdownWidget` specifically, both instances share the same `useDisciplineBreakdown` cache key, so the extra fetch is free — but the UI renders two identical charts. Not a regression (no user has both IDs today — the legacy `DEFAULT_LAYOUTS` never placed both in one layout), but a tenant who hand-customized their layout could trigger this.
**Fix:** Add a dedupe pass after the rename, either in SQL or in a follow-up migration:
```sql
-- After the rename, dedupe by widgetId+position, keeping the lowest position:
UPDATE dashboard_layouts
SET layout = (
  SELECT jsonb_agg(DISTINCT ON (placement->>'widgetId') placement)
  FROM jsonb_array_elements(layout) placement
)
WHERE layout::text ~ 'discipline-breakdown';
```
Or prefer a JS-side dedupe in the widget-registry render loop (safer — catches any future duplicate source).

### MN-02: `AlertsPage` does not validate `monthFrom`/`monthTo` before passing to `useAlerts`

**File:** `src/app/(app)/alerts/page.tsx:56-57`
**Issue:**
```ts
const monthFrom = getCurrentMonth();
const monthTo = generateMonthRange(monthFrom, 3).at(-1)!;
```
The non-null assertion (`!`) relies on `generateMonthRange(start, 3)` always returning at least 3 elements. Reading `src/lib/date-utils.ts:26-40`: for count >= 1 the function produces `count` months — so `at(-1)` is never `undefined` for count=3. But if a future refactor changes the signature (e.g. `count` becomes optional) or someone accidentally calls with 0, the non-null crashes the whole page. Defensive fallback is trivial and matches the pattern used in `strategic-alerts-banner.tsx:26` (`?? monthFrom`).
**Fix:**
```ts
const monthTo = generateMonthRange(monthFrom, 3).at(-1) ?? monthFrom;
```
Consistent with the banner's defensive style. Negligible behavior change.

### MN-03: `resource-conflicts-panel.tsx` `getDismissed` localStorage read on every `useState` init — SSR is safe but the error path silently swallows parse failures

**File:** `src/components/alerts/resource-conflicts-panel.tsx:46-53`
**Issue:**
```ts
function getDismissed(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}
```
The file correctly uses `'use client'`, so `localStorage` is available. But the bare `catch` swallows `JSON.parse` failures silently — if a user ever has a corrupted `nordic-capacity-dismissed-conflicts` value (e.g. from an older schema, browser extension interference, or manual edit), they get a fresh empty set with no signal. The dismissed-state is meant to survive across sessions; silent reset defeats the UX contract.
**Fix:** Log once to `console.warn` so corrupted state is at least surfaced in the browser console:
```ts
function getDismissed(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (err) {
    console.warn('[resource-conflicts-panel] corrupt dismissed-conflicts state; resetting', err);
    return new Set();
  }
}
```
Bonus: validate that `JSON.parse` returned an array of strings (a prior v5 schema stored objects). Cheap:
```ts
const parsed = JSON.parse(stored);
if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === 'string')) {
  console.warn('[resource-conflicts-panel] unexpected shape; resetting');
  return new Set();
}
return new Set(parsed);
```

### MN-04: `StrategicAlertsBanner` uses 3-month window while `NotificationBell` uses 4-month — two different query caches for "the same alerts"

**File:** `src/components/alerts/strategic-alerts-banner.tsx:25-27`, `src/components/persona/notification-bell.tsx:48-50`
**Issue:** Same as the original IN-07 — it was Info in REVIEW.md and deliberately skipped per `fix_scope=critical_warning`. Flagging again because the fresh-eyes pass reveals the secondary cost:
- Banner: `useAlerts(monthFrom, generateMonthRange(monthFrom, 3).at(-1))` → queryKey `['alerts', from, to-3mo]`
- Bell (admin branch): `useAlertCount(monthFrom, generateMonthRange(monthFrom, 4)[3])` → queryKey `['alert-count', from, to-4mo]`
- AlertsPage (warnings tab): `useAlerts(monthFrom, generateMonthRange(monthFrom, 3).at(-1))` → queryKey `['alerts', from, to-3mo]` — matches banner, shares cache.

So on a manager dashboard: banner fires one `/api/analytics/alerts` request (3-month window), bell fires a separate `/api/analytics/alerts/count` request (4-month window), and /alerts page fires another `/api/analytics/alerts` request (3-month window — shares cache with banner). The window mismatch means the alert-count shown in the bell is for a LARGER window than the banner+/alerts-page — which could cause user confusion ("the bell says 7 alerts but the page shows 5").
**Fix:** Align both surfaces on the same window. Pick 4 months (the bell's) or 3 (the banner+page's) — whichever matches the intended UX. If the intent is "same 4-month window as TopNav AlertBadge" (per the comments on both), then the banner + AlertsPage are wrong; update both to `generateMonthRange(monthFrom, 4).at(-1) ?? monthFrom`.

Alternatively extract a shared helper `getAlertsWindow()` in `src/lib/date-utils.ts` and call it from all three sites.

---

## Nit

### NT-01: `alerts/page.tsx` `useMemo` wraps a pure static helper call

**File:** `src/app/(app)/alerts/page.tsx:60`
**Issue:**
```ts
const conflictsTimeRange = useMemo(() => defaultConflictsTimeRange(), []);
```
`defaultConflictsTimeRange()` is a pure function that takes no inputs and is called once per mount (the deps array is `[]`). `useMemo` with `[]` is equivalent to computing once at mount — but `defaultConflictsTimeRange()` computes from `getCurrentMonth()` which derives from `new Date()`, so the memoized value is frozen at first render. If the user leaves the tab open past midnight on the last day of a month, the memoized range is stale. Low-impact (alerts refresh every 30s via `staleTime`, not the date range), but the `useMemo` gives false confidence that the computation is expensive. It isn't.
**Fix:** Drop the memo:
```ts
const conflictsTimeRange = defaultConflictsTimeRange();
```
Or, if you want midnight-rollover-safety, compute it inside `ResourceConflictsPanel` instead.

### NT-02: `discipline-donut.test.tsx` imports `vi` after using it

**File:** `src/components/charts/__tests__/discipline-donut.test.tsx:13-23`
**Issue:**
```ts
vi.mock('recharts', async () => {
  // ...
});

import { vi } from 'vitest';
```
The `vi.mock` call is hoisted by Vitest's plugin, so this works at runtime, but the source order (mock above import) is confusing to readers and fails some IDEs' dead-code detection. The other test files in this diff (e.g. `strategic-alerts-banner.test.tsx:14`) put the `vi` import at the top.
**Fix:** Move the `import { vi } from 'vitest';` line above the `vi.mock(...)` call. No runtime change.

### NT-03: `dashboard-content.tsx` inline comment references "Plan 04 POLISH-06" but the banner is mounted in Plan 05's work

**File:** `src/app/(app)/dashboard/dashboard-content.tsx:12`
**Issue:** The comment claims `// v6.0 Phase 53 Plan 04 POLISH-06: render inline strategic-alerts banner...`. `StrategicAlertsBanner` is defined in Plan 04 per `53-04-SUMMARY.md`, but the DashboardContent mount was wired in Plan 04 as well — so the comment is correct. However, the banner's props (`timeRange` in `ResourceConflictsPanel`) come from Plan 05's extraction. The comment is fine; just noting the cross-plan coupling for future readers.
**Fix:** None required. If touched, expand the comment to:
```
// v6.0 Phase 53 Plan 04 POLISH-06: banner mount (component from Plan 04;
// extraction pattern from Plan 05's ResourceConflictsPanel).
```

---

## Flag-flip Risk Assessment (`uiV6Polish` ON in prod)

Scanned every surface consulted by the flag:

| Surface | Flag-OFF fallback | Verified in tests |
| ------- | ------------------ | ----------------- |
| `NotificationBell` mount | `top-nav.tsx` legacy Bell/AlertBadge link | `top-nav.visibleFor.test.tsx` |
| `top-nav.tsx` `visibleFor` filter | Filter bypassed, all nav items visible | `top-nav.visibleFor.test.tsx` |
| `AlertsPage` tab UI | Tabs hidden, warnings view only | `alerts/__tests__/tabs.test.tsx` Test "flag off" |
| `AlertsPage` tab=conflicts deep-link | Forced to warnings regardless of query param | `alerts/__tests__/tabs.test.tsx` Test "flag off" |
| `DashboardContent` banner | Banner not mounted | `strategic-alerts-banner.test.tsx` Test 4 |
| `DEFAULT_LAYOUTS` widgets | `LEGACY_LAYOUTS` via `getDefaultLayout(useLegacy=true)` | `default-layouts.test.ts` |
| `DisciplineBreakdownWidget` registration | Legacy widgets still registered | `widgets/index.ts:4-24` (verified all legacy imports retained) |

No surface mutates state based on the flag (flag-driven UI is pure). The three SQL migrations are gated by operator-applied (Phase 51 LEAN-11), so flipping the flag does NOT re-run them — rollback is a UI change only.

**Risk rating:** LOW. The findings above are hardening, not regression vectors.

---

_Reviewed: 2026-04-24_
_Reviewer: Claude (gsd-code-reviewer, verification-pass)_
_Depth: standard (27 files, single-file + cross-ref reads)_
_Prior review: .planning/phases/53-chrome-polish/53-REVIEW.md (12 findings; 5 fixed, 7 Info skipped)_
_Prior fix report: .planning/phases/53-chrome-polish/53-REVIEW-FIX.md (5/5 Warning fixed)_
