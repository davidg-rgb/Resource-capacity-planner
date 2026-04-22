---
phase: 53-chrome-polish
fixed_at: 2026-04-22T00:00:00Z
review_path: .planning/phases/53-chrome-polish/53-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 53: Code Review Fix Report

**Fixed at:** 2026-04-22T00:00:00Z
**Source review:** .planning/phases/53-chrome-polish/53-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (all Warning; 0 Critical; 7 Info intentionally skipped per `fix_scope=critical_warning`)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: Flag-off parity specs silently skip — `/api/test/flags` endpoint never shipped

**Files modified:** `src/app/api/test/flags/route.ts` (new), `src/app/api/test/flags/__tests__/route.test.ts` (new)
**Commit:** c7d0d7d
**Applied fix:** Added the minimal test-only `/api/test/flags` POST route that `e2e/helpers/flag-toggle.ts` has been targeting all along. Mirrors the gates of `/api/test/seed/route.ts` exactly:
- Gate 1: production throw keyed on `NODE_ENV === 'production' && E2E_TEST !== '1'`. Throw string contains the "test-only route imported in production build" marker so the `no-test-routes-in-prod` static invariant can be extended later if desired.
- Gate 2: runtime 404 when `E2E_SEED_ENABLED !== '1'` (reuses the seed env flag rather than introducing a new switch).
- Gate 3: proxy matcher (unchanged) continues to require Clerk auth outside test mode.

Body is validated with `z.object({ flagName: z.enum(FLAG_NAMES), enabled: z.boolean() })`, and the row is upserted against the `feature_flags_org_flag_uniq` index using the deterministic `E2E_ORG_ID` + `E2E_PLATFORM_ADMIN_ID` IDs computed inside `/api/test/seed`. The helper's protocol (`{ flagName, enabled }`, `204 No Content` on success) is preserved exactly.

Contract test covers: happy-path upsert, idempotent flip via `onConflictDoUpdate`, 404 when gate 2 closed, 400 on invalid body (missing field + unknown enum value), and Gate 1 production throw. Env stubbing uses `vi.stubEnv` since `NODE_ENV` is readonly-typed in TS 5.x.

> **Knock-on effect:** Phase 52 Invariant #2 (`disablePerJourney`) and Phase 53 POLISH-FLAG (`setPolishFlag(false)`) e2e suites will now execute their bodies in CI rather than falling through to `test.skip(...)`. If those suites surface new failures in the next verifier run, it is because they were never exercising flag-off before — not because Phase 53 regressed.

### WR-02: `NotificationBell` polls `/api/v5/capacity/alerts` for every non-admin persona

**Files modified:** `src/hooks/use-alerts.ts`, `src/components/persona/notification-bell.tsx`
**Commit:** b66142d
**Applied fix:** Added optional `enabled: boolean = true` parameter to `useAlertCount` (default preserves the existing `AlertBadge` call-site behaviour). `NotificationBell` now passes `adminEnabled` as the third argument, so PM/LM/RD/staff personas skip the fetch entirely. Removed the `void adminEnabled` marker and its commentary explaining why the hook was called unconditionally. T-53-11 DoS mitigation the header comment claims is now actually enforced.

### WR-03: Unknown `?tab=` values silently coerce to `warnings` without signal

**Files modified:** `src/app/(app)/alerts/page.tsx`
**Commit:** c57f7d7
**Applied fix:** Extracted `ALERTS_TABS = ['warnings', 'conflicts'] as const` and derived `type AlertsTab = (typeof ALERTS_TABS)[number]`. `parseTab` now checks membership via `(ALERTS_TABS as readonly string[]).includes(raw ?? '')`, so a future tab addition is a single-line constant change that TypeScript propagates to every `setTab(...)` call site. The T-53-21 allowlist narrowing is preserved.

> Note: the REVIEW.md fix block suggested ordering `['conflicts', 'strategic', 'history']` as an example, but the current implementation only supports `'warnings' | 'conflicts'`. Kept the actual tab set; the point of the fix is the type derivation pattern, not adding new tabs.

### WR-04: `NotificationBell` depends on Clerk being mounted — defensive default masks ProviderError

**Files modified:** `src/features/proposals/use-pm-wish-counts.ts`
**Commit:** 337a922
**Applied fix:** Added a hook-boundary guard: `const effectiveEnabled = enabled && clerkUserId.length > 0;` and passed `effectiveEnabled` to `useQuery`. Now even if a caller passes empty-string `clerkUserId` with `enabled=true` (e.g. the `NotificationBell` fallback `userId ?? ''` during Clerk initialisation drift), the query is skipped. This hardens the hook contract regardless of what the call site does.

> Scope note: REVIEW.md also mentioned tightening `pmEnabled = persona.kind === 'pm' && !!userId` at the call site. That condition was already `uiV6Polish && persona.kind === 'pm' && !!userId` (confirmed by re-read). The hook-boundary guard is additive and strictly defensive, so left the call site alone.

### WR-05: `compareDocumentPosition` bitmask assertion is loose

**Files modified:** `src/components/alerts/__tests__/strategic-alerts-banner.test.tsx`
**Commit:** 434a256
**Applied fix:** Changed `expect(... & DOCUMENT_POSITION_FOLLOWING).toBeTruthy()` to `expect(... & DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING)`. Now the test fails if `compareDocumentPosition` ever returns a bitmask that contains other bits alongside `DOCUMENT_POSITION_FOLLOWING` — a regression that would still evaluate truthy under the old assertion.

## Skipped Issues

None — all in-scope findings were fixed.

## Verification Performed

For each fix:
- **Tier 1:** Re-read modified file section; confirmed edit text present and surrounding code intact.
- **Tier 2:** Ran `npx tsc --noEmit` across the whole project; all source files touched by this fix session (`src/app/api/test/flags/*`, `src/hooks/use-alerts.ts`, `src/components/persona/notification-bell.tsx`, `src/app/(app)/alerts/page.tsx`, `src/features/proposals/use-pm-wish-counts.ts`, `src/components/alerts/__tests__/strategic-alerts-banner.test.tsx`) produced **zero type errors**. Pre-existing unrelated errors (`focus-trap-react` missing types in `overcommit-dialog.tsx`, `Drawer.tsx`, `PlanVsActualDrawer.tsx`) are not new to this session and were present in the baseline.

Did not run full test suite between fixes (per GSD reviewer-fixer contract — that is the verifier phase's job). The verifier should re-run Phase 52 and Phase 53 e2e suites now that `/api/test/flags` exists; WR-01 specifically unlocks parity assertions that were silently skipping.

## Commits Produced (chronological)

1. `c7d0d7d` — feat(53-fix): WR-01 add /api/test/flags route for flag-off parity
2. `b66142d` — feat(53-fix): WR-02 gate useAlertCount in NotificationBell for admin only
3. `c57f7d7` — feat(53-fix): WR-03 derive AlertsTab type from allowlist constant
4. `337a922` — feat(53-fix): WR-04 guard usePmWishCounts against empty clerkUserId
5. `434a256` — test(53-fix): WR-05 tighten compareDocumentPosition assertion

---

_Fixed: 2026-04-22T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
