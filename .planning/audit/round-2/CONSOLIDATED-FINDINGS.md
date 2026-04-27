# Round 2 Consolidated Findings

**Scanned at:** 2026-04-27
**Codebase HEAD:** `d3c3212` (post Round-1 fixes)
**Scanners:** 4 (A, B, C, D)

## Round 1 verification roll-up

**All Round 1 P0 fixes verified PASS (no regressions).** 31 fix commits held.

| Round 1 finding | Status |
|---|---|
| CONS-P0-01 — Root /page.tsx uiV6Landing | PASS ✓ |
| CONS-P0-02 — SECTION_NAV persona-keyed | PASS ✓ |
| CONS-P0-03 — Breadcrumbs persona-aware | PASS ✓ |
| CONS-P0-04 / RV-01 — DepartmentPicker (resolved as persona-switcher) | PASS ✓ |
| CONS-P0-05 — PM homeDepartmentId plumbing | PASS ✓ |
| CONS-P0-06 — pctOfOvercommit → pctOfTotalPlanned | PASS ✓ |
| CONS-P0-07 — /api/dashboard/layout auth+validation | PASS ✓ |
| CONS-P0-08 — Overcommit org_id scoping | PASS ✓ |
| CONS-P0-09 — HistoricConfirmRequiredError canonical | PASS ✓ |
| CONS-P1-01 — Error response shape | **STILL-DRIFTED, ESCALATED** → D-CR-100 P0 |
| CONS-P1-02 — Allocation hours 744 | PASS ✓ |
| CONS-P1-04..11 (P1 code-fixes) | PASS ✓ |
| F-B-02, F-B-08, F-B-12, F-B-14 (P1 v5.0) | PASS ✓ |
| F-A-004, F-A-011 | PASS ✓ |

## NEW findings — Round 2

### P0 (2 items, fix immediately)

#### R2-P0-01 — Error response shape drift, NOW user-visible
**Sources:** D-CR-100 + F-A-100 (cross-agent agreement)
**Locations:** 12 inline returns across 7 files use flat `{ error: 'string' }`. `AppError.toJSON()` returns nested `{ error: { code, ... } }`. Already breaking at `(platform)/tenants/[orgId]/page.tsx:255` (`[object Object]` shown to user).
- `src/app/api/analytics/alerts/route.ts:14`
- `src/app/api/analytics/alerts/count/route.ts:14`
- `src/app/api/reports/team-heatmap/route.tsx:33`
- `src/app/api/import/upload/route.ts:23,28,62`
- `src/app/api/scenarios/route.ts:24,38`
- `src/app/api/scenarios/[id]/route.ts:41,57`
- `src/app/api/platform/tenants/[orgId]/purge/route.ts:21,27`

**Decision:** canonical = nested `AppError.toJSON()` shape. Migrate inline returns to `throw new AppError(...)` + `handleApiError(error)` in catch.
**Fix scope:** code-fix.

#### R2-P0-02 — Build-blocking missing deps
**Source:** D-CR-101
**Locations:** `focus-trap-react` and `@axe-core/playwright` declared in package.json but missing from `node_modules`. 4 `TS2307` source-level errors. `next build` will fail. OvercommitDialog (Phase 52) cannot mount in production.

**Fix:** `pnpm install` + `rm -rf .next`.
**Fix scope:** environmental.

### P1 (10 items)

#### R2-P1-01 — `/rd` overcommit drill button opens useless dialog when flag OFF (D-CR-102)
- **Location:** `src/app/(app)/rd/page.tsx:173-180`
- **Action:** code-fix — disable button when `uiV6PerJourney=false`

#### R2-P1-02 — Hardcoded Swedish strings + brand inconsistency (D-CR-103)
- **Locations:** discipline-donut, discipline-breakdown-widget, side-nav (`Resource Planner`, `Nordic Precision`), top-nav (`Nordic Capacity`)
- **Action:** code-fix — add i18n keys; reconcile brand

#### R2-P1-03 — SideNav footer dead links + no-op "New entry" button (D-CR-104)
- **Location:** `src/components/layout/side-nav.tsx:219-241`
- **Action:** code-fix — wire Help to `/help`, remove or wire Archive + New Entry

#### R2-P1-04 — Top-nav search input non-functional (D-CR-105)
- **Locations:** `top-nav.tsx:236-243, 289-302`
- **Action:** code-fix — remove until implemented (or wire to `/search?q=`)

#### R2-P1-05 — `Project.leadPmPersonId` not in v1.0 doc (F-A-101)
- **Action:** doc-fix (bulk modernization)

#### R2-P1-06 — Doc still labels HISTORIC_CONFIRM_REQUIRED as 400 (F-B-100)
- **Action:** doc-fix v5.0-ARCHITECTURE.md §11.1, §8.1, §15.10

#### R2-P1-07 — Capacity GET response shape mismatch in doc (F-B-102)
- **Action:** doc-fix v5.0-ARCHITECTURE.md §8.1 line 1496

#### R2-P1-08 — `DEFAULT_LAYOUTS['project-leader:desktop']` 6 widgets vs plan §5's 8 (P1-100)
- **Decision:** doc-fix — `project-kpi-cards` was never built; plan §5 is aspirational. Annotate as deferred (similar to Phase 54 QUAD-* pattern).
- **Action:** doc-fix UI-RESTRUCTURE-PLAN-v2.md §5

#### R2-P1-09 — `members` route still in top-nav per plan K12 (P1-101)
- **Decision:** code-fix — K12 was a clear directive: "top-nav removes Medlemmar; moves to admin sidebar"
- **Action:** code-fix — remove from top-nav, add to admin sidebar `PERSONA_SECTION_NAV.admin`

#### R2-P1-10 — Allocation `hours` column lacks DB-level CHECK constraint (F-A-105)
- **Action:** code-fix — add CHECK migration. Pairs with R1 F-A-011 fix for end-to-end contract.

### P2 (~17 items, fix cheap ones inline)

Auto-fix during Round 2:
- D-CR-110 (breadcrumbs LABEL_MAP for `pm/lm/rd` acronyms — was deferred from Round 1)
- D-CR-107 (`/api/people` GET role check)
- D-CR-109 (narrow OvercommitDialog scope to 'department')
- D-CR-111 (mobile menu Escape handler)

Defer to doc-modernization pass:
- F-B-101, F-B-103, F-B-105, F-B-107, F-B-108, F-B-109, F-B-113 (v5.0 doc drift)
- F-A-102, F-A-103, F-A-105, F-A-106, F-A-108, F-A-109 (v1.0 doc drift)

Defer:
- D-CR-106 (next.config redirect asymmetry — log only, intentional)
- D-CR-108 (usePmWishCounts warn — minor)
- P2-102 (LEGACY_LAYOUTS layout doc — resolves with R2-P1-08)
- C-P1-6 (empty `/team` `/wishes` directories — cosmetic)

### P3 (~13 items, log only)

All items unchanged from Round 1 carry-overs. None block.

## Recommended Round 2 execution order

1. **Fix Agent 1** (Round 2 P0s + UX P1s + cheap P2s):
   - R2-P0-02 (install deps) — first, unblocks everything
   - R2-P0-01 (error shape — 12 sites)
   - R2-P1-01..04 (UX honesty: /rd dialog, brand strings, dead links, search input)
   - R2-P1-09 (K12 members route — code-fix)
   - R2-P1-10 (DB CHECK constraint)
   - Cheap P2s: D-CR-107, 109, 110, 111

2. **Fix Agent 2** (Doc modernization — single bulk pass):
   - **ARCHITECTURE.md (v1.0)** — add v1.0-baseline header pointing at v5.0/v6.0 archives + patch 14 stale entries (F-A-001/002/003/006/007/008/009/013/014/017/018/019/020/021/022/101/102/103/106/107/108/109)
   - **v5.0-ARCHITECTURE.md** — single coordinated pass clearing F-B-100, 101, 102, 103, 105, 107, 108, 109, 110, 111, 112, 113, 114, 115
   - **UI-RESTRUCTURE-PLAN-v2.md** §5 — annotate `project-kpi-cards` deferred (R2-P1-08)
