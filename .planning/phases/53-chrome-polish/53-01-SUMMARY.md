---
phase: 53-chrome-polish
plan: 01
subsystem: infrastructure
tags: [flags, i18n, e2e, chrome-polish, wave-0]
dependency-graph:
  requires: []
  provides:
    - uiV6Polish flag across flag.types / flag.service / flag.context
    - v6.polish.* i18n namespace (16 keys, sv + en parity)
    - /help route stub (staff D-03 landing half)
    - setPolishFlag e2e helper (mid-test flip)
    - e2e/_viewport/_diagnostic.spec.ts (POLISH-07 soft gate)
  affects:
    - every Phase 53 downstream plan (02/03/04/05) reads useFlags().uiV6Polish
    - Plan 05 flag-off parity spec reuses setPolishFlag
    - Phase 54 planning consumes diagnostic scrollHeight artifacts
tech-stack:
  added: []
  patterns:
    - "feature-flag plumbing: FLAG_NAMES + FeatureFlags + FLAG_ROUTE_MAP + DEFAULT_FLAGS (mirrors Phase 52 uiV6PerJourney)"
    - "i18n parity via keys.ts catalog + sv.json/en.json deep-equal check"
    - "Playwright soft-gate diagnostic spec (test.info().attach + console.log, no expect())"
key-files:
  created:
    - src/features/flags/__tests__/flag.service.test.ts
    - src/app/(app)/help/page.tsx
    - e2e/_viewport/_diagnostic.spec.ts
    - .planning/phases/53-chrome-polish/deferred-items.md
  modified:
    - src/features/flags/flag.types.ts
    - src/features/flags/flag.service.ts
    - src/features/flags/flag.context.tsx
    - src/messages/sv.json
    - src/messages/en.json
    - src/messages/keys.ts
    - src/app/api/test/seed/route.ts
    - e2e/lib/seed.ts
    - e2e/helpers/flag-toggle.ts
    - src/app/(app)/__tests__/persona-redirect.test.tsx
    - src/app/(app)/line-manager/__tests__/approval-queue-badge.test.tsx
    - src/app/(app)/rd/__tests__/overcommit-routing.test.tsx
    - src/app/(platform)/tenants/[orgId]/page.tsx
    - src/components/persona/__tests__/persona-switcher.lm-suffix.test.tsx
decisions:
  - "Extended existing e2e/helpers/flag-toggle.ts (already present from Phase 52-05) rather than creating a second file — setPolishFlag sits next to enablePerJourney/disablePerJourney for consistency."
  - "Added V6_POLISH_KEYS export to keys.ts — extends the V5_KEYS pattern so downstream plans get a typed flat list of their keys without reinventing the shape."
  - "Diagnostic spec uses page.request (not a raw APIRequestContext) for setPolishFlag so the helper works inside a Page-scoped test without extra plumbing."
metrics:
  completed-date: 2026-04-22
---

# Phase 53 Plan 01: Infrastructure Prerequisites Summary

**One-liner:** Lands the `uiV6Polish` feature flag, `v6.polish.*` i18n namespace (16 keys, sv↔en parity), `/help` stub route, the `setPolishFlag` e2e helper + seed row, and a pure-measurement Playwright viewport diagnostic that captures pre-polish scrollHeight for Phase 54 planning — zero UI consumers touched.

## What Shipped

### Flag plumbing (POLISH-FLAG / D-FLAG)
- `FLAG_NAMES` appends `'uiV6Polish'` (position 9).
- `FeatureFlags` interface gains `uiV6Polish: boolean`.
- `FLAG_ROUTE_MAP` adds `uiV6Polish: []` (behavior flag, no routes).
- Both `DEFAULT_FLAGS` maps (service + context) default `uiV6Polish: false`.
- Plan asked to "extend an existing flag.service test" — no such test file existed in this repo, so one was created (`src/features/flags/__tests__/flag.service.test.ts`). It asserts the full `DEFAULT_FLAGS` map so future flag additions that skip the defaults map get caught.

### i18n namespace
`v6.polish.*` added to both `sv.json` and `en.json` with the 16 keys below.
Registered in `src/messages/keys.ts` under `K.v6.polish`, with a new `V6_POLISH_KEYS` flat-list export.

| Group | Keys |
|-------|------|
| `bell.*` | pmRejectedLabel, lmPendingLabel, rdOvercommitsLabel, adminAlertsLabel |
| `help.*` | title, body, externalDocs |
| `alerts.tabs.*` | warnings, conflicts |
| `banner.*` | title, cta |
| `discipline.*` | toggleBar, toggleDonut |
| `nav.*` | home, help, helpDesc |

Parity test `src/messages/__tests__/keys.test.ts` still passes (4/4 — it only enforces `v5.*` parity today; adding `v6.*` does not regress it).

### `/help` route
`src/app/(app)/help/page.tsx` — `'use client'` component, `useTranslations('v6.polish.help')`, renders title + body + external-docs link (`target="_blank"` + `rel="noreferrer"` per T-53-01 mitigation). Wraps automatically with `TopNav`/`AppShell`/`NextIntlClientProvider` via the `(app)` layout.

### Seed + helpers
- `src/app/api/test/seed/route.ts` — the `featureFlags.values({...})` call now takes an array of two rows (`uiV6PerJourney` + `uiV6Polish`), both seeded ON for the E2E tenant.
- `e2e/helpers/flag-toggle.ts` — appended `setPolishFlag(request, enabled)` alongside the existing `enablePerJourney` / `disablePerJourney` convenience wrappers.
- `e2e/lib/seed.ts` — doc comment updated to note the Phase 53 addition.

### Diagnostic viewport spec (POLISH-07, D-04/D-05)
`e2e/_viewport/_diagnostic.spec.ts` — two soft-gate tests:
1. manager dashboard (`/dashboard` as admin persona, 1440×900, `uiV6Polish` OFF)
2. project-leader dashboard (`/dashboard/projects` as pm persona, 1440×900, `uiV6Polish` OFF)

Each test awaits `networkidle` + `document.fonts.ready` (Pitfall #4), captures `{ scrollHeight, clientHeight, overflow }`, attaches as JSON via `test.info().attach(...)`, and console-logs. **No `expect(` anywhere** (verified by `grep -c "expect(" … → 0`).

Project-leader dashboard route path confirmed: `src/app/(app)/dashboard/projects/page.tsx` exists in the current tree — matches RESEARCH assumption, no deviation from the plan.

## Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | 4 errors — all pre-existing (see `deferred-items.md`); 0 new errors caused by this plan |
| `vitest run src/features/flags` | 1/1 pass (new `flag.service.test.ts`) |
| `vitest run src/messages/__tests__/keys.test.ts` | 4/4 pass (parity enforced on v5) |
| `vitest run src/features/flags src/messages` | 5/5 pass |
| `playwright --list e2e/_viewport/_diagnostic.spec.ts` | 2 tests listed (discovery confirmed) |
| JSON validity of sv.json / en.json | both parse clean |
| `grep -c '"polish"' sv.json` / `en.json` | 1 / 1 |
| `grep -c "v6.polish" keys.ts` | 4 |
| `grep -c "expect(" _diagnostic.spec.ts` | 0 |

The plan's overall-verification item `pnpm test:e2e --list` fails at `e2e/helpers/a11y.ts` (`Cannot find module '@axe-core/playwright'`) — confirmed via a stash-and-list that this failure exists on the clean base commit `7e0baec` BEFORE this plan's changes. Scoping the list to the new spec shows it discovers correctly. Documented in `deferred-items.md`.

## Deviations from Plan

### Rule 3 — Auto-fixed blocking issues

**1. [Rule 3 - Blocking] Missing `flag.service.test.ts` — created instead of extended**
- **Found during:** Task 1
- **Issue:** Plan said "extend existing test… grep for an existing test that names `uiV6PerJourney: false`" and "do NOT create a new test file." No such file existed (`src/features/flags/__tests__/` directory itself did not exist; no flag-service defaults test anywhere).
- **Fix:** Created `src/features/flags/__tests__/flag.service.test.ts` with a single `describe` block that exercises `getOrgFlags` against a mocked empty-rows result and asserts the full `DEFAULT_FLAGS` map (including the new `uiV6Polish: false`).
- **Files modified:** `src/features/flags/__tests__/flag.service.test.ts` (new)
- **Commit:** `0648e46`

**2. [Rule 3 - Blocking] Five consumer files had `FeatureFlags` literal maps missing `uiV6Polish`**
- **Found during:** Task 1 typecheck
- **Issue:** Adding `uiV6Polish: boolean` to the `FeatureFlags` interface broke 5 files that construct a `FeatureFlags`-typed object literal (4 tests + `src/app/(platform)/tenants/[orgId]/page.tsx` with a `FlagName → string` label map).
- **Fix:** Appended `uiV6Polish: false` (or `'v6 Chrome Polish'` in the label map) to each. No behavioral change — all five were already complete for every other flag.
- **Files modified:**
  - `src/app/(app)/__tests__/persona-redirect.test.tsx`
  - `src/app/(app)/line-manager/__tests__/approval-queue-badge.test.tsx`
  - `src/app/(app)/rd/__tests__/overcommit-routing.test.tsx`
  - `src/app/(platform)/tenants/[orgId]/page.tsx`
  - `src/components/persona/__tests__/persona-switcher.lm-suffix.test.tsx`
- **Commit:** `0648e46`

**3. [Rule 3 - Blocking] `e2e/helpers/flag-toggle.ts` already existed (from Phase 52-05)**
- **Found during:** Task 3
- **Issue:** Plan Task 3 said "Create `e2e/helpers/flag-toggle.ts`". The file already existed with `setFlag` / `enablePerJourney` / `disablePerJourney` exports from Phase 52-05.
- **Fix:** Extended the existing file with a `setPolishFlag(requestOrPage, enabled)` convenience wrapper that calls the same `setFlag` primitive. Preserves Phase 52-05 work; adds exactly what Phase 53 needs.
- **Files modified:** `e2e/helpers/flag-toggle.ts`
- **Commit:** `f531916`

### Scope-boundary discoveries (deferred, not fixed)

See `.planning/phases/53-chrome-polish/deferred-items.md` — four pre-existing `Cannot find module` errors (`@axe-core/playwright`, `focus-trap-react` ×3) that break `pnpm test:e2e --list` and `pnpm typecheck` on the clean base. Not caused by this plan.

## Authentication Gates

None encountered.

## Known Stubs

`/help` page renders a stub title + body + one external docs link. This is INTENTIONAL per D-03 — the plan's done-criteria accepts a "stub acceptable this phase" and the SUMMARY consumer expects real content to land later. The page is gated only by the `(app)` layout auth check; not behind `uiV6Polish` today (future nav additions in Plan 02 Task 3 will expose the link conditionally).

## Threat Flags

None — no new trust-boundary-crossing surface introduced beyond what the threat model already dispositioned (T-53-01 … T-53-05).

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | `0648e46` | feat(53-01): add uiV6Polish feature flag + consumer type-fixes |
| 2 | `ac94ee9` | feat(53-01): add v6.polish.* i18n namespace (sv + en parity + keys catalog) |
| 3 | `f531916` | feat(53-01): help stub + E2E polish flag seed + diagnostic viewport spec |

## Diagnostic scrollHeight baseline

The diagnostic spec was not executed in this worktree (no dev server, no `pnpm test:e2e` run) — it is designed to run in CI or locally as a one-shot. Acceptance only requires discovery + shape (grep checks all pass). The actual numbers will be captured by the first CI run that executes `pnpm test:e2e` on this branch and attached to its HTML report as `manager-1440x900-polishOff.json` + `project-leader-1440x900-polishOff.json`. Phase 54 planning should pull those artifacts.

## Project-leader dashboard route path

Plan assumed `/dashboard/projects`. Verified present: `src/app/(app)/dashboard/projects/page.tsx` exists in the current tree (confirmed via `ls src/app/(app)/dashboard/`). No deviation.

## Self-Check: PASSED

**Files:**
- FOUND: `src/features/flags/__tests__/flag.service.test.ts`
- FOUND: `src/app/(app)/help/page.tsx`
- FOUND: `e2e/_viewport/_diagnostic.spec.ts`
- FOUND: `.planning/phases/53-chrome-polish/deferred-items.md`
- FOUND: modified flag types/service/context, sv/en/keys, seed, flag-toggle, 5 consumer literals

**Commits:**
- FOUND: `0648e46`
- FOUND: `ac94ee9`
- FOUND: `f531916`
