---
phase: 34-foundations-personas-i18n-catalog-historic-edit-helper
plan: 01
subsystem: foundations
tags: [persona, i18n, server-clock, historic-edit]
requires:
  - 33-01 (lib/time foundation, ValidationError code form)
provides:
  - PersonaProvider / usePersona / PersonaSwitcher (FOUND-V5-03)
  - v5 typed message-key catalog + sv/en seeding + eslint JSXText guard (FOUND-V5-05)
  - getServerNowMonthKey(tx) + isHistoricPeriod(monthKey, nowMonthKey) (FOUND-V5-06)
affects:
  - src/app/(app)/layout.tsx (PersonaProvider mount)
  - src/components/layout/top-nav.tsx (PersonaSwitcher mount)
  - vitest config (jsdom + node split, RTL cleanup)
tech-stack:
  added:
    - "@testing-library/react@16"
    - "@testing-library/jest-dom@6"
    - "@testing-library/user-event@14"
    - "jsdom@29"
  patterns:
    - "Persona discriminated union, localStorage 'nc:persona', SSR-safe hydration"
    - "v5 i18n catalog as single source of truth, eslint guard against hardcoded JSXText"
    - "Per-request DB clock cache via tx.__nowMonthKey"
key-files:
  created:
    - src/features/personas/persona.types.ts
    - src/features/personas/persona.routes.ts
    - src/features/personas/persona.context.tsx
    - src/features/personas/__tests__/persona.context.test.tsx
    - src/components/persona/persona-switcher.tsx
    - src/components/persona/__tests__/persona-switcher.test.tsx
    - src/messages/keys.ts
    - src/messages/__tests__/keys.test.ts
    - src/lib/server/get-server-now-month-key.ts
    - src/lib/server/__tests__/get-server-now-month-key.test.ts
    - vitest.setup.ts
  modified:
    - src/lib/time/iso-calendar.ts (+ isHistoricPeriod)
    - src/lib/time/index.ts (re-export)
    - src/lib/time/__tests__/iso-calendar.test.ts (+ TC-PS-005/006)
    - src/messages/sv.json (full v5 namespace)
    - src/messages/en.json (full v5 key parity)
    - src/components/layout/top-nav.tsx (PersonaSwitcher mount)
    - src/app/(app)/layout.tsx (PersonaProvider wrap)
    - eslint.config.mjs (FOUND-V5-05 guard)
    - vitest.config.ts (environmentMatchGlobs + setup)
    - package.json / pnpm-lock.yaml (RTL devDeps)
decisions:
  - "PersonaProvider mounted in src/app/(app)/layout.tsx inside FlagProvider, wrapping PersonCardProvider — keeps it within authenticated app shell only, no leakage into sign-in/onboarding routes."
  - "vitest setupFiles registers @testing-library/react cleanup() afterEach to prevent jsdom DOM leakage between tests."
  - "v5 eslint block placed AFTER the broader src/** block so its no-restricted-syntax (merged getDay + JSXText selectors) overrides the broader getDay-only definition. Verified empirically with a probe file."
  - "PersonaSwitcher uses a plain <select> (no UI library installed) — visual polish ships in Phase 40+."
metrics:
  duration_minutes: 14
  completed_date: 2026-04-07
  tests_added: 18
  tests_total_passing: 34
---

# Phase 34 Plan 01: Foundations — Personas, i18n catalog, historic-edit helper Summary

## One-liner

Three v5.0 foundations land together: a 5-persona React context + header switcher (FOUND-V5-03), a typed `v5.*` i18n key catalog with eslint JSXText guard (FOUND-V5-05), and a per-request cached `getServerNowMonthKey(tx)` + `isHistoricPeriod` clock helper (FOUND-V5-06) — unblocking every Phase 36+ persona screen and mutating service.

## What Shipped

### Task 1 — Persona context + switcher (FOUND-V5-03) — `212ebb4`

- `Persona` discriminated union with 5 kinds (`pm`, `line-manager`, `staff`, `rd`, `admin`) per ARCHITECTURE §6.12.
- `getLandingRoute(persona)` mapping kinds to `/pm`, `/line-manager`, `/staff`, `/rd`, `/admin/change-log`.
- `PersonaProvider` + `usePersona()` hook with localStorage key `nc:persona`, SSR-safe hydration via `useEffect`, default `admin` on empty/corrupt storage.
- `<PersonaSwitcher />` header dropdown using `useTranslations('v5.persona')`. Stub entity IDs (`stub-pm`, `stub-line-manager`, `stub-staff`) marked for replacement in Phase 40+.
- Mounted in `src/app/(app)/layout.tsx` (inside FlagProvider, wrapping PersonCardProvider) and `src/components/layout/top-nav.tsx` (right-side header cluster, next to UserButton).
- Test infra: jsdom + @testing-library/react devDeps; `vitest.config.ts` `environmentMatchGlobs` splits `.tsx` (jsdom) from `.ts` (node); `vitest.setup.ts` registers RTL `cleanup()` afterEach.

### Task 2 — i18n key catalog + eslint guard (FOUND-V5-05) — `98ed18d`

- `src/messages/keys.ts`: typed `K` const + `flattenKeys()` helper + `V5_KEYS` flat list (~110 keys) covering ARCHITECTURE §6.13–§6.18, §11.1, §11.4.
- Floor namespaces seeded: `persona`, `timeline.historic`, `timeline.cell`, `approval`, `drawer`, `screens` (13 quartets: pmHome, pmTimeline, myWishes, lineMgrHeatmap, lineMgrTimeline, approvalQueue, importWizard, staffSchedule, rdPortfolio, drillDown, historicDialog, changeLogFeed, adminRegisters), `errors` (16 codes), `common.toast`.
- `sv.json`: complete Swedish translations including the canonical historic-dialog body wording from §6.15 (`"Du redigerar historisk planering för {monthLabel}. Detta påverkar tidigare rapporter. Fortsätt?"`).
- `en.json`: full key parity, persona + common.toast filled in English, all other v5 values empty placeholders (allowed per FOUND-V5-05-c).
- `eslint.config.mjs`: new flat-config block scoped to `src/app/{pm,line-manager,staff,rd,admin}/**` and `src/components/{timeline,approval,drawer,dialogs,persona}/**`, blocking `JSXText[value=/[\p{L}]/u]`. Block placed AFTER the broader `src/**` block so the merged `no-restricted-syntax` (getDay + JSXText) wins for v5 file globs.
- Probe verification: created `src/components/persona/__lint-probe.tsx` containing `<div>Hardcoded</div>`, ran `pnpm lint`, observed the rule fired with the documented message, deleted the probe, re-ran lint clean.

### Task 3 — getServerNowMonthKey + isHistoricPeriod (FOUND-V5-06) — `3d20ef8`

- `isHistoricPeriod(monthKey, nowMonthKey)` added to `src/lib/time/iso-calendar.ts` and re-exported from the barrel. Validates both inputs against `/^\d{4}-(0[1-9]|1[0-2])$/`, throws `ValidationError` with code `INVALID_DATE` on malformed. Lexical `<` compare; current month is NOT historic.
- `src/lib/server/get-server-now-month-key.ts`: per-request cached helper. Resolution order: validated `NC_TEST_NOW` env → `tx.__nowMonthKey` cache → Drizzle `sql\`SELECT to_char(CURRENT_DATE, 'YYYY-MM')\`` query, then cache and return. **Malformed `NC_TEST_NOW` is IGNORED** rather than returned, to prevent silent historic-check poisoning.
- Structural `TxLike` type avoids coupling to Drizzle's transaction internals.
- Test mock strategy: `vi.mock('drizzle-orm', ...)` stubs `sql` to a plain template-literal-to-`__sql`-string function so FOUND-V5-06-c can assert the query text contains `CURRENT_DATE` and `YYYY-MM`.

## TC Coverage Map

| ID | Assertion | File | Status |
|----|-----------|------|--------|
| TC-PSN-001 | Default persona admin on empty localStorage | `persona.context.test.tsx` | PASS |
| TC-PSN-002 | setPersona persists to `nc:persona` | `persona.context.test.tsx` | PASS |
| TC-PSN-003 | Hydrates from localStorage on mount | `persona.context.test.tsx` | PASS |
| TC-PSN-004 | getLandingRoute mapping (5 kinds) | `persona.context.test.tsx` | PASS |
| TC-PSN-005 | Dropdown lists all 5 persona kinds | `persona-switcher.test.tsx` | PASS |
| TC-PSN-006 | Select calls setPersona + router.push | `persona-switcher.test.tsx` | PASS |
| (extra) | usePersona throws outside provider | `persona.context.test.tsx` | PASS |
| (extra) | corrupt localStorage falls back + clears | `persona.context.test.tsx` | PASS |
| FOUND-V5-05-a | keys.ts keys exist in sv.json | `keys.test.ts` | PASS |
| FOUND-V5-05-b | sv.json / en.json v5 key set parity | `keys.test.ts` | PASS |
| FOUND-V5-05-c | sv.json v5 values non-empty | `keys.test.ts` | PASS |
| FOUND-V5-05-d | ARCHITECTURE namespace coverage | `keys.test.ts` | PASS |
| TC-PS-005 | isHistoricPeriod past/current/future | `iso-calendar.test.ts` | PASS |
| TC-PS-006 | isHistoricPeriod malformed throws | `iso-calendar.test.ts` | PASS |
| FOUND-V5-06-a | NC_TEST_NOW override honored | `get-server-now-month-key.test.ts` | PASS |
| FOUND-V5-06-b | tx.__nowMonthKey cache hit skips SELECT | `get-server-now-month-key.test.ts` | PASS |
| FOUND-V5-06-c | SELECT contains CURRENT_DATE + YYYY-MM | `get-server-now-month-key.test.ts` | PASS |
| FOUND-V5-06-d | Malformed NC_TEST_NOW ignored | `get-server-now-month-key.test.ts` | PASS |

**Phase 33 regression:** TC-CAL-001..008 + Phase 33 holiday/formatter tests still PASS (16 baseline tests preserved; total now 34).

## Verification Results

- `pnpm test`: **34 passed** (7 files)
- `pnpm typecheck`: clean
- `pnpm lint`: clean
- `pnpm build`: clean (Next.js 16 SSR compatibility verified)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] React-hooks `set-state-in-effect` lint error in PersonaProvider**
- **Found during:** Task 1 commit (pre-commit hook)
- **Issue:** `setPersonaState(parsed)` inside `useEffect` triggered the new react-hooks rule.
- **Fix:** Added a single-line `// eslint-disable-next-line react-hooks/set-state-in-effect -- hydration from localStorage` with rationale; this is the canonical SSR-hydration pattern and the rule's exception case.
- **Files:** `src/features/personas/persona.context.tsx`
- **Commit:** `212ebb4`

**2. [Rule 1 - Bug] Eslint v5 block ordering**
- **Found during:** Task 2 probe verification
- **Issue:** Initially placed the v5 `no-restricted-syntax` block BEFORE the broader `src/**` block. In ESLint flat config, later rule definitions for the same rule name override earlier ones for matching files, so the broader block's getDay-only `no-restricted-syntax` was clobbering the v5 JSXText selector. Probe failed to trip.
- **Fix:** Moved the v5 block AFTER the broader `src/**` block AND merged the getDay selector into the v5 block's selector array, so v5 files get BOTH rules and the wider rule continues to apply elsewhere.
- **Files:** `eslint.config.mjs`
- **Commit:** `98ed18d`

**3. [Rule 1 - Bug] Vitest test isolation (jsdom DOM leakage)**
- **Found during:** Task 1 first test run (3 failures from "multiple elements found")
- **Issue:** RTL doesn't auto-cleanup with vitest unless explicitly wired.
- **Fix:** Added `cleanup()` afterEach in `vitest.setup.ts`.
- **Commit:** `212ebb4`

**4. [Rule 1 - Bug] Typecheck failures in test mock typing**
- **Found during:** Task 3 typecheck
- **Issue:** `vi.fn(async () => ...)` infers an empty parameter tuple, breaking `mock.calls[0][0]` indexing under strict TS. Also a `as { __sql }` cast tripped no-unsafe-conversion.
- **Fix:** Replaced the spy with a plain typed async function that captures calls into a `unknown[]` array.
- **Files:** `src/lib/server/__tests__/get-server-now-month-key.test.ts`
- **Commit:** `3d20ef8`

No architectural deviations (Rule 4) were needed.

## Provider Mount Decision

**Chosen:** `src/app/(app)/layout.tsx` — inside `FlagProvider`, wrapping `PersonCardProvider`. **Rationale:** keeps PersonaProvider scoped to the authenticated app shell (after onboarding redirect), avoiding leakage into sign-in / sign-up / onboarding routes that don't need it. Root `src/app/layout.tsx` was rejected because it mounts globally (including auth pages) and lacks the `NextIntlClientProvider` that the switcher's `useTranslations('v5.persona')` depends on.

## Pre-Phase-37 `new Date()` Baseline

`grep -rE "new Date\(\)" src/features/` returned **45 occurrences across 23 files** (allocations, analytics, scenarios, dashboard widgets, platform services, PDF export). None are used for historic-edit checks today (Phase 34 ships no service code). Phases 37–39 must replace any new `Date()`-based historic checks with `getServerNowMonthKey(tx)` per ARCHITECTURE §6.3 — this baseline is the regression detector.

## Dependencies (Runtime)

**Zero new runtime deps.** Only devDependencies added:
- `@testing-library/react@16.3.2`
- `@testing-library/jest-dom@6.9.1`
- `@testing-library/user-event@14.6.1`
- `jsdom@29.0.2`

## Known Stubs

PersonaSwitcher creates placeholder entity IDs (`stub-pm`, `stub-line-manager`, `stub-staff`) when a kind is selected. **Reason:** Real entity pickers ship in Phase 40+ (PM persona views). **Resolved by:** Phase 40 will replace the switcher's stub-id construction with a real entity selector and add a downstream guard (`personId !== 'stub-*'`) before any API call. Documented inline in `persona-switcher.tsx`.

## Self-Check: PASSED

- Files exist: persona.types.ts, persona.routes.ts, persona.context.tsx, persona-switcher.tsx, keys.ts, get-server-now-month-key.ts, all test files (verified via Read/Write success)
- Commits exist: `212ebb4`, `98ed18d`, `3d20ef8` (verified via `git log --oneline`)
- Tests: 34 passing (Phase 33's 16 + 18 new)
- Build/lint/typecheck all clean
