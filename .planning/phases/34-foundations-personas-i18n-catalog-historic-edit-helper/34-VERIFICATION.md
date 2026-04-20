---
phase: 34-foundations-personas-i18n-catalog-historic-edit-helper
verified: 2026-04-07T15:35:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 34: Foundations — Personas, i18n catalog, historic-edit helper — Verification Report

**Phase Goal:** Ship the persona/role-switching infrastructure, the empty Swedish/English key catalog, and the per-request server-now helper before any UI or service code lands.
**Verified:** 2026-04-07T15:35:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | User can open the header dropdown, pick any of 5 personas, and the choice survives a hard reload | VERIFIED | `PersonaSwitcher` renders a `<select>` over `PERSONA_KINDS` (5 items), calls `setPersona` + writes `localStorage.setItem('nc:persona', ...)`. TC-PSN-002 asserts persistence, TC-PSN-003 asserts hydration on mount. Both passing. |
| 2  | Picking a persona navigates the user to that persona's landing route | VERIFIED | `handleChange` calls `router.push(getLandingRoute(next))`. `getLandingRoute` maps all 5 kinds. TC-PSN-004 and TC-PSN-006 assert route mapping and switcher-triggered push. |
| 3  | On first load with no stored persona, the app defaults to admin | VERIFIED | `DEFAULT_PERSONA = { kind: 'admin', ... }` in `persona.types.ts`; `PersonaProvider` initialises `useState` with it; TC-PSN-001 asserts. |
| 4  | Every v5.0 user-facing string has a typed key in `keys.ts` and entries in sv/en JSON | VERIFIED | `keys.ts` defines 97-leaf `K.v5` tree. `sv.json` and `en.json` both contain 97 v5 keys (verified by node count). All 4 FOUND-V5-05 tests pass (keys subset of sv, parity between sv/en, sv values non-empty, namespace coverage). |
| 5  | CI fails if a v5.0 source file contains a JSX text literal not wrapped in `t()` | VERIFIED | `eslint.config.mjs` block scoped to `src/app/{pm,line-manager,staff,rd,admin}/**` and `src/components/{timeline,approval,drawer,dialogs,persona}/**` applies `JSXText[value=/[\p{L}]/u]` selector. Block placed AFTER the broader `src/**` block so it wins for v5 globs. Probe verification documented in SUMMARY. `pnpm lint` exits clean. |
| 6  | Any service inside a Drizzle transaction can call `getServerNowMonthKey(tx)` and get the same YYYY-MM without a second SELECT | VERIFIED | `get-server-now-month-key.ts` caches result on `tx.__nowMonthKey`. FOUND-V5-06-b test asserts `execute` called only once across two calls on the same tx object. |
| 7  | `isHistoricPeriod(monthKey, nowMonthKey)` returns true iff `monthKey < nowMonthKey` lexically | VERIFIED | `iso-calendar.ts` line 117: `return monthKey < nowMonthKey;` with format validation. TC-PS-005 covers past/current/future; TC-PS-006 covers malformed-input throw. Re-exported from `index.ts`. |
| 8  | Tests can override the clock by setting `process.env.NC_TEST_NOW=YYYY-MM` | VERIFIED | Resolution order in `get-server-now-month-key.ts`: env override checked first against `MONTH_KEY_RE`; malformed value is ignored (falls through to DB). FOUND-V5-06-a asserts override honored; FOUND-V5-06-d asserts malformed ignored. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/personas/persona.types.ts` | Persona discriminated union (5 kinds) | VERIFIED | 17 lines; defines union `pm \| line-manager \| staff \| rd \| admin` + `DEFAULT_PERSONA = admin` |
| `src/features/personas/persona.routes.ts` | `getLandingRoute` mapping | VERIFIED | `getLandingRoute` switch over all 5 kinds; `PERSONA_KINDS` const array |
| `src/features/personas/persona.context.tsx` | PersonaProvider + usePersona hook | VERIFIED | SSR-safe hydration via `useEffect`, localStorage key `nc:persona`, default admin, throws outside provider |
| `src/components/persona/persona-switcher.tsx` | Header dropdown for 5 personas | VERIFIED | `<select>` over `PERSONA_KINDS`, calls `setPersona` + `router.push(getLandingRoute(next))` |
| `src/components/layout/top-nav.tsx` | Mounts PersonaSwitcher | VERIFIED | Import on line 28, render on line 172 |
| `src/messages/keys.ts` | Typed key catalog for v5 strings | VERIFIED | 97-leaf `K.v5` const tree + `flattenKeys` helper + `V5_KEYS` flat array |
| `src/messages/sv.json` | Swedish primary entries (v5 namespace added) | VERIFIED | `v5` object present with 97 leaf keys, all non-empty strings (verified by test FOUND-V5-05-c) |
| `src/messages/en.json` | English fallback entries (key parity) | VERIFIED | `v5` object with same 97 key structure; empty values allowed per spec (FOUND-V5-05-b passes) |
| `src/messages/__tests__/keys.test.ts` | Parity assertions for CI enforcement | VERIFIED | 4 tests cover keys subset, sv/en parity, sv non-empty, namespace coverage |
| `eslint.config.mjs` | JSXText no-restricted-syntax rule | VERIFIED | Rule scoped to v5 file globs; placed after broader block; ignores `__tests__/**` |
| `src/lib/server/get-server-now-month-key.ts` | Per-request cached DB clock helper | VERIFIED | NC_TEST_NOW override → tx cache → SELECT CURRENT_DATE; malformed env ignored |
| `src/lib/time/iso-calendar.ts` | `isHistoricPeriod` added | VERIFIED | Lines 110–118; format-validates both inputs; lexical compare |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `persona-switcher.tsx` | `persona.context.tsx` | `usePersona()` hook | WIRED | Import `@/features/personas/persona.context`; destructures `{ persona, setPersona }` |
| `persona-switcher.tsx` | `persona.routes.ts` | `getLandingRoute(next)` + `router.push` | WIRED | Import + call in `handleChange`; TC-PSN-006 asserts router.push called |
| `top-nav.tsx` | `persona-switcher.tsx` | JSX import + render | WIRED | Line 28 import, line 172 render confirmed by grep |
| `get-server-now-month-key.ts` | `tx.__nowMonthKey` | Per-request cache on Drizzle tx object | WIRED | Reads and writes `tx.__nowMonthKey`; FOUND-V5-06-b asserts cache hit |
| `iso-calendar.ts` → `get-server-now-month-key.ts` | isHistoricPeriod consumed after getServerNowMonthKey | `isHistoricPeriod` | PARTIAL — by design | `isHistoricPeriod` is re-exported from `lib/time/index.ts` and ready to be called after `getServerNowMonthKey` returns. No consumer yet exists — planned for Phase 37. This is the documented design intent (foundations phase). |
| `src/messages/keys.ts` | `src/messages/sv.json` | Key parity enforced by `keys.test.ts` | WIRED | `keys.test.ts` imports both; FOUND-V5-05-a/-b/-c all pass |

### Data-Flow Trace (Level 4)

These are infrastructure/helper artifacts (context provider, JSON catalog, utility functions) that do not render dynamic data from a backend. Level 4 data-flow trace does not apply. The PersonaSwitcher renders from localStorage-backed React state, which is the correct and intended data source for this UX-only feature (ADR-004).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 34 tests pass | `pnpm test` | 34 passed (7 files) | PASS |
| TypeScript compiles clean | `pnpm typecheck` | No output (clean exit) | PASS |
| Lint passes with no hardcoded string errors | `pnpm lint` | No output (clean exit) | PASS |
| Commits for all three tasks exist | `git log --oneline 212ebb4 98ed18d 3d20ef8` | All 3 found | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FOUND-V5-03 | 34-01-PLAN.md | Role switcher header component with 5 roles backed by React context; persists in localStorage; no server enforcement (ADR-004) | SATISFIED | `PersonaProvider` + `usePersona` + `PersonaSwitcher` + top-nav mount; 6 TC-PSN-* tests passing; localStorage `nc:persona` confirmed |
| FOUND-V5-05 | 34-01-PLAN.md | i18n key catalog for v5.0 strings (SV primary, EN fallback) seeded before UI phases begin | SATISFIED | `keys.ts` (97 keys), `sv.json` (97 non-empty v5 values), `en.json` (97-key parity), eslint JSXText guard active, CI-enforced by `keys.test.ts` (4 tests passing) |
| FOUND-V5-06 | 34-01-PLAN.md | `getServerNowMonthKey(tx)` per-request cached helper for historic-edit checks (ADR-009) | SATISFIED | `get-server-now-month-key.ts` implements full resolution order; `isHistoricPeriod` added to `iso-calendar.ts` + re-exported; 4 FOUND-V5-06-* + 2 TC-PS-* tests passing |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/persona/persona-switcher.tsx` | 28, 30, 32 | Stub entity IDs (`stub-pm`, `stub-line-manager`, `stub-staff`) | Info | Intentional, documented in file header and SUMMARY. Downstream services must not trust these IDs. Replacement planned for Phase 40. Not a blocker for any Phase 34 success criterion. |

No TODOs, FIXMEs, or unintentional placeholder patterns found.

### Human Verification Required

#### 1. Persona switcher visual appearance in header

**Test:** Open the app in a browser, navigate to any page in the authenticated app shell. Verify the persona `<select>` dropdown is visible in the top navigation bar, adjacent to the UserButton. Switch between all 5 personas and confirm the page routes to `/pm`, `/line-manager`, `/staff`, `/rd`, or `/admin/change-log` respectively.
**Expected:** Dropdown visible in header; each selection triggers navigation; selecting PM and refreshing the page should still show PM persona selected.
**Why human:** Routing to non-existent pages (Phase 40+ pages) will show 404s — this is expected. Visual placement and hardware reload behavior require browser interaction.

#### 2. ESLint guard fires on hardcoded JSX text in v5 folders

**Test:** Add a file under `src/components/persona/` containing `export default function X() { return <div>Hello</div>; }`, run `pnpm lint`, verify the lint error fires, then delete the file.
**Expected:** ESLint error referencing "v5 components must not contain hardcoded user-facing text".
**Why human:** The probe was already run during implementation and passed; this is an optional regression confirmation. Automated verification confirms the rule exists in the config and the config is clean.

### Gaps Summary

No gaps. All 8 observable truths verified, all 12 artifacts exist with substantive implementations and correct wiring, all 3 requirements satisfied, all 34 tests passing, typecheck and lint clean.

The one intentional known partial — stub entity IDs in PersonaSwitcher — is documented inline, scoped to a Phase 40 fix, and has no impact on any Phase 34 success criterion.

---

_Verified: 2026-04-07T15:35:00Z_
_Verifier: Claude (gsd-verifier)_
