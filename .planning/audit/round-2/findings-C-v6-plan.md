# Round 2 — Agent C — UI-RESTRUCTURE-PLAN-v2.md conformance audit

**Scope:** UI-RESTRUCTURE-PLAN-v2.md (342 lines, v6.0 source of truth)
**Date:** 2026-04-27
**HEAD:** `d3c3212` (post-fix)

## Executive summary

All four Round 1 P0s are PASS. Side-nav, breadcrumbs, persona-switcher, and the root redirect match plan contracts. Local Vitest sweep on restored components: **14/14 pass** for `side-nav.test.tsx` + `breadcrumbs.test.tsx`. Round 1 P1s are PASS or doc-resolved. Round 1 P2s are PASS or known polish.

## Round 1 verification

### P0s

| Round 1 ID | Status | Evidence |
|---|---|---|
| **CONS-P0-01** Root `/page.tsx` ignores `uiV6Landing` | **PASS** ✓ | `src/app/page.tsx:35-52` reads `getOrgFlags(orgId).uiV6Landing` and 307s to `/home`; else falls through `getRoleLandingPage(orgRole)` |
| **CONS-P0-02** `SECTION_NAV` zero persona entries | **PASS** ✓ | `src/components/layout/side-nav.tsx:83-145` exports `PERSONA_SECTION_NAV`. 5/5 tests pass |
| **CONS-P0-03** Breadcrumbs parser-only | **PASS** ✓ | `src/components/layout/breadcrumbs.tsx:12-66` persona-aware Home, unique keys, `<Link>` non-last segments. 9/9 tests pass |
| **CONS-P0-04 / RV-01** DepartmentPicker | **PASS** ✓ | Re-validation closed: grouped persona-switcher covers the workflow |
| **CONS-P0-05** PM `homeDepartmentId` | **PASS** ✓ | `persona-switcher.tsx:46-53,142-152,324-329,347-352`. `edit-gate.test.ts` 10/10 pass |
| **CONS-P0-06/07/08/09** | **PASS** | (Agent B/D scope) |

### P1s (Agent C scope)

| Round 1 ID | Status |
|---|---|
| **C-P1-1 / CONS-P1-03** flag camelCase doc note | PASS ✓ |
| **C-P1-2** 18 i18n keys unconsumed | PASS ✓ (auto-resolved by P0-2 fix) |
| **C-P1-3 / CONS-P1-04** flag-toggle helpers | PASS ✓ |
| **C-P1-4 / CONS-P1-05** Journey 2D + 5A specs | PASS ✓ |
| **C-P1-5 / CONS-P1-06** PersonaGate hard-codes lineManager | PASS ✓ |
| **C-P1-6** Empty `/team` `/wishes` directories | STILL-DRIFTED (cosmetic) |
| **C-P1-7** D-06 retention not surfaced in plan §0 | STILL-DRIFTED (doc) |

### P2s/P3s

- All P2s PASS or known polish
- C-P3-4 (layouts match plan) → REGRESSED → escalated to P1-100

## NEW findings

### P1-100 — `DEFAULT_LAYOUTS['project-leader:desktop']` diverges from plan §5

`src/features/dashboard/default-layouts.ts:136-143` ships **6 widgets**; plan §5 lines 240-251 specifies **8 widgets** including `project-kpi-cards` at position 0 ("NEW — project-scoped KPIs replaces manager kpi-cards"). The widget does not exist in registry. Phase 53 POLISH-05 moved `resource-conflicts` to `/alerts` — defensible, but plan §5 was written *after* POLISH decisions and still names the post-trim 8-widget shape.

- **Severity:** P1
- **Action:** code-fix (build `project-kpi-cards` + add to layout) **or** doc-fix (update plan §5)

### P1-101 — `members` route never moved out of top-nav per plan K12

Plan §0 row K12 (line 50): "top-nav removes Medlemmar; moves to admin sidebar under `referenceData`". Reality:
- `top-nav.tsx:131-137` still ships `members` as `NAV_ITEMS` entry with `visibleFor: ['admin']`
- `side-nav.tsx:132-145` `PERSONA_SECTION_NAV.admin` does NOT include `/admin/members`

Either K12 was abandoned silently or move is still pending.

- **Severity:** P1
- **Action:** code-fix or doc-fix (decision required)

### P2-102 — `LEGACY_LAYOUTS['project-leader:desktop']` mismatched plan §5

`default-layouts.ts:65-76` ships LEGACY with `kpi-cards` (manager widget). Plan §5 line 242 ships `project-kpi-cards`. LEGACY is the pre-Wave-2 baseline so `kpi-cards` is technically correct for rollback — secondary observation; resolves with P1-100 fix path.

- **Severity:** P2
- **Action:** doc-fix

### P3-103 — Breadcrumb persona-acronym label-map deferred indefinitely

`fix-agent-1-report.md` documents the label-map (`pm → "PM"`, `rd → "R&D"`, `lm → "LM"`) was skipped due to test-contract conflict. No follow-up commit; segments still render lowercased.

- **Severity:** P3
- **Action:** code-fix in separate commit pair (feature + snapshot refresh)

## Regression-resistance check

The Round 1 regression vector — commit `27ac599` rewinding 3 files — is now backstopped by:
- `side-nav.test.tsx` (5 tests)
- `breadcrumbs.test.tsx` (9 tests)
- `persona-switcher.test.tsx` (16) + `persona-switcher.lm-suffix.test.tsx` (3) + `persona.contract.test.tsx` (7)
- `edit-gate.test.ts` (10)

`pnpm vitest run` on restored components: **14/14 pass** in 2.37s. 72/72 sweep from Round 1 corroborated.

## Summary

- **Round 1 P0:** 4/4 PASS
- **Round 1 P1 (Agent C scope):** 5 PASS, 2 STILL-DRIFTED (cosmetic + doc)
- **Round 1 P2:** 4 PASS, 1 STILL-DRIFTED (doc, location-only)
- **Round 1 P3:** 1 REGRESSED → escalated to P1-100
- **NEW:** 2 P1, 1 P2, 1 P3

## Notes for round-2 consolidator

- P1-100 and P1-101 are the only NEW substantive findings; both can be resolved as code-or-doc.
- The `/home` server-redirect approach (vs plan §1.1 "client component in `(app)/page.tsx`") is behaviour-equivalent; recommend doc-fix on plan §1.1 step 1.
