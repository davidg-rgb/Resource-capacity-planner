# Round 3 Agent C — v6.0 plan verification

**Scope:** UI-RESTRUCTURE-PLAN-v2.md
**HEAD:** `09da8fc`
**Date:** 2026-04-27

## Round 2 fix verification

| Item | Status |
|---|---|
| **P1-100** project-kpi-cards deferral annotation in plan §5 | **PASS** ✓ |
| **P1-101** K12 members route (top-nav → admin sidebar) | **PASS** ✓ |

Evidence for P1-101: top-nav.tsx removes `members` from `NAV_ITEMS`; side-nav.tsx adds to `PERSONA_SECTION_NAV.admin`; Test 6 updated; sv.json + en.json add `sidebar.personaSections.adminMembers`.

## Round 1 regression sentinels

`pnpm vitest run` against post-R2 HEAD:
- `side-nav.test.tsx` — **5/5 pass**
- `breadcrumbs.test.tsx` — **9/9 pass**
- `persona-switcher.test.tsx` — **16/16 pass**

**Total: 30/30 pass.** No regression of Round 1 P0 fixes.

## Pre-existing test failures (test-debt, validated)

All three reproduce on HEAD `09da8fc`. None introduced by R2 K12 fix.

| Test file | Failures | Root cause | Round |
|---|---:|---|---|
| `top-nav.visibleFor.test.tsx` | **6/7** | Tests 3-7 expect `/projects` href; R1 C-P2-1 changed to `/admin/projects`. Tests 6+7 also expect `/team` instead of `/admin/people`. | R1 (C-P2-1) |
| `lean-trim-integration.test.ts` | 1 | Test asserts ≥4 `permanent: true`; only 1 (`/wishes`) — R1 D-CR-16 changed `/team`+`/projects` to 307 | R1 (D-CR-16) |
| `change-log.coverage.test.ts` | 1 (`TC-CL-005`) | `archiveRegisterRow` throws because DB stub returns wrong shape — register-stub bug | Pre-existing |

**Severity:** P1 test-debt. R3 should fix.

## New findings (R3)

### C-R3-P1-1 — Plan §2 still asserts `permanent: true` (308) — contradicts shipped code
`UI-RESTRUCTURE-PLAN-v2.md:118-120` shows redirect block with `permanent: true` for `/team`, `/team/:path*`, `/projects`. Code ships `permanent: false` (307) per R1 D-CR-16. Plan §2 line 126 narrative *"Permanent (308) redirects preserve the request method and query string"* no longer matches shipped behaviour.
- **Severity:** P1 (doc/planning premise drift)
- **Action:** doc-fix — annotate §2 with R3 deferral note (similar to R2 P1-08 pattern). Pairs with `lean-trim-integration.test.ts` failure.

### C-R3-P2-2 — Plan §6 i18n key inventory undercounts by 1 (now 19, table lists 18)
`UI-RESTRUCTURE-PLAN-v2.md:301` says "Total 18 new keys." But K12 fix added `sidebar.personaSections.adminMembers` to both locales — actual ship count is **19**.
- **Severity:** P2
- **Action:** doc-fix — append row + bump count 18 → 19

### C-R3-P3-3 — side-nav admin section mixes flat + namespaced i18n keys
`PERSONA_SECTION_NAV.admin` uses both `personaSections.*` and flat `sidebar.*` keys (`referenceData`, `departments`, `programs`). Both resolve correctly via `useTranslations('sidebar')`, but plan §6 K3 directive suggests new contract should be wholly namespaced.
- **Severity:** P3 (consistency)
- **Action:** code-fix or doc-fix (note flat-namespace reuse is intentional)

### C-R3-P3-4 — Empty stub dirs `src/app/(app)/team/` + `src/app/(app)/wishes/` still ship
Round 1 C-P1-6 flagged; STILL-DRIFTED across both rounds. Both directories empty. Cosmetic only.
- **Severity:** P3
- **Action:** code-fix — `git rm -r` both dirs

## Summary

- **Round 2 fixes:** **2/2 PASS**
- **Regression sentinels:** **30/30 pass**
- **Pre-existing test debt validated:** 6 top-nav + 1 lean-trim + 1 change-log
- **New R3 findings:** 1 P1, 1 P2, 2 P3
- **No NEW substantive code drift introduced by R2.** K12 fix well-scoped.
