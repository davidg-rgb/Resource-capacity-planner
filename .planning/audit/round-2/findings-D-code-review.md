---
agent: D-code-reviewer
round: 2
scanned_at: 2026-04-27
codebase_head: d3c3212
---

# Round 2 — Agent D: Code Quality / Bugs / Security audit

**Headline:** All four Round-1 P0 fixes correctly applied; four definite Round-1 P1 code-fixes also verify clean. **One Round-1 deferred P1 (CONS-P1-01 error-shape consistency) remains unfixed and is re-flagged as P0.** Two missing `node_modules` packages cause 4 source-level typecheck errors that block production build.

## Round 1 verification

| Round-1 ID | Subject | Status |
|---|---|---|
| CONS-P0-01 | Root `/page.tsx` `uiV6Landing` flag | **PASS** |
| CONS-P0-02 | Persona-keyed `SECTION_NAV` | **PASS** |
| CONS-P0-03 / D-CR-06 | Breadcrumbs rebuild | **PASS** |
| CONS-P0-05 / D-CR-01 | PM `homeDepartmentId` plumbing | **PASS** |
| CONS-P0-06 / D-CR-02 | `pctOfOvercommit` rename | **PASS** |
| CONS-P0-07 / D-CR-03 | `/api/dashboard/layout` auth + validation | **PASS** |
| CONS-P0-08 / D-CR-04 | Overcommit org-scoping | **PASS** |
| CONS-P0-09 | `HistoricConfirmRequiredError` canonical | **PASS** |
| CONS-P1-07 / D-CR-05 | `useAlertCount` 3-arg mock | **PASS** |
| CONS-P1-08 / D-CR-07 | ResourceConflictsPanel SSR guard | **PASS** |
| CONS-P1-09 / D-CR-08 | OvercommitDialog deep-link encode | **PASS** |
| CONS-P1-10 / D-CR-09 | LmTimelineCell read-only | **PASS** |
| D-CR-11..16 (P2 inline) | Various | **PASS** |
| D-CR-10 | Tenant search stale state | STILL-PRESENT (deferred) |
| D-CR-17..24 (P3) | Various nits | n/a (log-only) |

**Net Round-1 verdict:** No regressions. High-risk fixes (auth-gate, tenant-scoping, math contract) all code-correct with backing tests.

## NEW findings

### D-CR-100 [P0] CONS-P1-01 RE-FLAGGED — error-response shape inconsistency persists

- **Locations:**
  - `src/lib/errors.ts:12-21` — `AppError.toJSON()` returns nested `{ error: { code, message, details? } }`
  - `src/lib/api-utils.ts:11-12,22,27` — `handleApiError` uses nested
  - **Inline returns still flat (12 sites):**
    - `src/app/api/analytics/alerts/route.ts:14`
    - `src/app/api/analytics/alerts/count/route.ts:14`
    - `src/app/api/reports/team-heatmap/route.tsx:33`
    - `src/app/api/import/upload/route.ts:23,28,62`
    - `src/app/api/scenarios/route.ts:24,38`
    - `src/app/api/scenarios/[id]/route.ts:41,57`
    - `src/app/api/platform/tenants/[orgId]/purge/route.ts:21,27`
- **Why P0:** `(platform)/tenants/[orgId]/page.tsx:255` already does `errData.error ?? '...'` — silently shows `[object Object]` for AppError-shaped responses. Bug reachable from production.
- **Fix:** decide canonical shape (recommend nested). Replace each inline return with `throw new AppError(...)` then `handleApiError(error)` in catch.

### D-CR-101 [P0] BUILD-BLOCKING — declared deps missing from node_modules

- **Locations:**
  - `src/components/dialogs/overcommit-dialog.tsx:25` — `import { FocusTrap } from 'focus-trap-react'`
  - `src/components/drawer/Drawer.tsx:17` — same
  - `src/components/drawer/PlanVsActualDrawer.tsx:20` — same
  - `e2e/helpers/a11y.ts:11` — `import ... from '@axe-core/playwright'`
- **Verified:** `package.json` declares both; neither folder exists under `node_modules/`. `tsc --noEmit` produces 4 `TS2307` errors.
- **Why P0:** `next build` will fail. OvercommitDialog (Phase 52) cannot mount in production.
- **Fix:** clean install (`rm -rf node_modules && pnpm install`); `rm -rf .next` for stale validator.

### D-CR-102 [P1] /rd "overcommit drill" button opens a useless dialog when flag OFF

- **Location:** `src/app/(app)/rd/page.tsx:173-180`
- **Issue:** When `uiV6PerJourney=false`, button calls `setOvercommit({ scope: 'department', scopeId: '', ... })`. Dialog has `enabled: open && !!scopeId` so query never fires; renders both "no projects" + "no people" copy with no path forward.
- **Fix:** disable button when flag OFF, or restore Phase 51 placeholder.

### D-CR-103 [P1] Hardcoded Swedish strings inside i18n-claimed components

- **Locations:**
  - `src/components/charts/discipline-donut.tsx:32` — `Ingen data`
  - `src/features/dashboard/widgets/discipline-breakdown-widget.tsx:119,143`
  - `src/components/layout/side-nav.tsx:176-178` — `Resource Planner`, `Nordic Precision`
  - `src/components/layout/top-nav.tsx:209` — `Nordic Capacity`
- **Issue:** Brand inconsistency: top-nav says "Nordic Capacity", side-nav says "Resource Planner / Nordic Precision".
- **Fix:** add keys to `messages/{sv,en}.json`; replace literals; reconcile brand.

### D-CR-104 [P1] SideNav footer has dead links and no-op "New entry" button

- **Location:** `src/components/layout/side-nav.tsx:219-241`
- **Issue:** "New Entry" button has no onClick. Help and Archive use `href="#"` (Next treats as same-page anchor; clicks scroll to top + dirty history). Help is a real route at `/help`.
- **Fix:** Help → `href="/help"`. Archive → remove or wire. New Entry → remove or wire.

### D-CR-105 [P1] Top-nav search input is non-functional

- **Locations:** `src/components/layout/top-nav.tsx:236-243` (desktop), `:289-302` (mobile)
- **Issue:** Two `<input type="text">` with placeholder, no value, no onChange, no form. Looks interactive; doesn't work.
- **Fix:** remove until search is implemented, or wire to `/search?q=`.

### D-CR-106 [P2] `next.config.ts` redirect asymmetry — `/projects/:path*` not redirected

- **Location:** `next.config.ts:14-17`
- **Issue:** `/team` + `/team/:path*` both redirect; `/projects` redirects but `/projects/:path*` does NOT (because `[projectId]` is a real route).
- **Fix:** add explicit `/projects/:path*` rule or document the asymmetry.

### D-CR-107 [P2] `/api/people` GET has no role check

- **Location:** `src/app/api/people/route.ts:8-31`
- **Issue:** GET only calls `getTenantId()`. Any user with org membership (even viewer) can enumerate all people including `departmentId`/`disciplineId`. POST tightened to admin (RV-02) but GET not.
- **Fix:** wrap GET in `requireRole('viewer')`.

### D-CR-108 [P2] `usePmWishCounts` defensive empty-string guard could mask bugs

- **Location:** `src/features/proposals/use-pm-wish-counts.ts:29`
- **Fix:** `console.warn` if `enabled && !clerkUserId`.

### D-CR-109 [P2] `OvercommitDialog` `scope: 'project'` reachable in types but never rendered

- **Location:** `src/components/dialogs/overcommit-dialog.tsx:32-34`
- **Fix:** narrow scope type to `'department'` only.

### D-CR-110 [P2] `breadcrumbs.tsx` segment label leaks raw URL hyphens

- **Location:** `src/components/layout/breadcrumbs.tsx:55,58`
- **Issue:** `/rd` becomes "Rd" not "R&D"; `/line-manager` becomes "Line manager".
- **Fix:** add `LABEL_MAP` keyed by segment.

### D-CR-111 [P2] Mobile menu drawer has no Escape/close affordance

- **Location:** `src/components/layout/top-nav.tsx:280-334`
- **Fix:** Escape key handler. Consider shared `useFocusTrap` hook.

### D-CR-112 [P3] `home/page.tsx` useEffect dep shape (carry-over)
### D-CR-113 [P3] Stale `.next/types/validator.ts` references — environmental
### D-CR-114 [P3] `RdPortfolioCell` testid uniqueness (carry-over)
### D-CR-115 [P3] Three count hooks lack `staleTime` (carry-over)

## Summary

| Severity | Count |
|---|---|
| P0 | 2 (D-CR-100, D-CR-101) |
| P1 | 4 (D-CR-102..105) |
| P2 | 6 (D-CR-106..111) |
| P3 | 4 (D-CR-112..115) |
| **Total NEW** | **16** |

**Recommended order:**
1. D-CR-101 — `rm -rf node_modules && pnpm install && rm -rf .next`. Trivial; unblocks build.
2. D-CR-100 — error-shape reconciliation. Mechanical (~12 sites).
3. D-CR-102..105 — UX honesty + brand consistency.
4. D-CR-106..111 — incremental.
5. D-CR-112..115 — log only.

No Round-1 fix regressed. No new cross-tenant leak, SQL injection, or auth bypass surfaced.
