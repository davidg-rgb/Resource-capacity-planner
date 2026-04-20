---
phase: 47-playwright-e2e-infra
plan: 05
subsystem: e2e-infra
tags: [playwright, e2e, personas, fixtures, wave1-complete]
requires: ["47-02", "47-04"]
provides:
  - "personaAs(page, kind) helper (sets nc:persona localStorage before navigation)"
  - "Extended Playwright `test` base with seedFirst auto-fixture"
  - "gotoAs() / waitForPersonaReady() navigation helpers"
affects:
  - "All Wave 2 TC-E2E specs (import this test base instead of @playwright/test)"
tech_stack:
  added: []
  patterns:
    - "Playwright fixture with { auto: true } for implicit setup"
    - "page.addInitScript for pre-hydration localStorage injection"
key_files:
  created:
    - e2e/fixtures/persona.ts
    - e2e/fixtures/test-base.ts
    - e2e/lib/navigation.ts
  modified: []
decisions:
  - "PersonaKind duplicated locally in e2e/fixtures/persona.ts rather than imported from src/features/personas/persona.types.ts — keeps e2e tsconfig free of React/runtime deps. Drift risk mitigated by typecheck + inline comment."
  - "seedFirst fixture is { auto: true } — trades ~200-500ms on read-only specs for eliminating forgot-beforeEach cross-test pollution bugs."
  - "gotoAs soft-waits on `{persona}-home-root` test id (catch-and-continue) — specs that need strong guarantees add their own explicit waits; root test ids get added by the Wave 2 plan that authors the first spec per persona."
metrics:
  duration_minutes: 5
  tasks_completed: 2
  completed_date: "2026-04-09"
---

# Phase 47 Plan 05: Playwright Persona Harness + Test Base Summary

Persona switching harness + auto-seeding extended `test` base — every Wave 2 TC-E2E spec now imports from `e2e/fixtures/test-base` and writes zero boilerplate.

## What Shipped

### e2e/fixtures/persona.ts

- `PersonaKind` type mirroring `src/features/personas/persona.types.ts` (admin | pm | line-manager | staff | rd).
- `PERSONA_STORAGE_KEY = 'nc:persona'` — verified against `persona.context.tsx` and `persona.types.ts`.
- `personaAs(page, kind, extras?)` injects `{ kind, ...extras }` into `localStorage['nc:persona']` via `page.addInitScript`, so the value lands before the app hydrates on the next `page.goto()`.

### e2e/fixtures/test-base.ts

- Extends `@playwright/test` with a `seedFirst` fixture `{ auto: true }` that calls `seedDb(request)` (from 47-04) before every test body.
- Re-exports `expect`, `personaAs`, and `PersonaKind` so a spec needs a single import line.

### e2e/lib/navigation.ts

- `gotoAs(page, kind, path)` — wraps personaAs + goto + soft wait on `{persona}-home-root` test id.
- `waitForPersonaReady(page, kind, timeout)` — best-effort wait that never throws; returns boolean for diagnostics.
- Guards against the hydration race (46-RESEARCH §Pitfall 2) where the persona provider reads localStorage in useEffect.

## Verification

- `pnpm typecheck` — clean.
- `pnpm test` — **714/714 green** (107 files).
- `pnpm lint` — pre-existing errors in `tests/invariants/tenant-isolation.runtime.test.ts` and `tests/unit/db/schema.contract.test.ts`; **none** in files touched by this plan. Out of scope per execution rules (logged to deferred items below).

## Deviations from Plan

None — plan executed exactly as written. One minor enhancement:

- Extracted `PERSONA_STORAGE_KEY` to a named export and passed it into `addInitScript` as a parameter (vs hardcoded string). Cleaner, single source of truth for the key, still matches the app. Does not change behavior.

## Deferred Issues

- Pre-existing `pnpm lint` errors in `tests/invariants/tenant-isolation.runtime.test.ts` (Function-type) and `tests/unit/db/schema.contract.test.ts` (require-imports). Unrelated to Playwright infra — not touched by this plan. Recommend a dedicated lint-cleanup task or rolling fix during Phase 44 follow-ups.

## Wave 1 Complete

With 47-05 landed, Phase 47 Wave 1 is done:

- 47-01 Playwright installed + config
- 47-02 Clerk/proxy bypass
- 47-03 DB bootstrap (globalSetup migrate + reset)
- 47-04 Test-only `/api/test/seed` + `seedDb()` client
- 47-05 Persona harness + extended test base **(this plan)**

Wave 2 (47-06, 47-07, 47-08) can now run in parallel — each authoring TC-E2E specs against the harness shipped here.

## Spec Author Quickstart

```ts
import { test, expect, personaAs } from '../fixtures/test-base';

test('TC-E2E-1A: Anna Monday check-in', async ({ page }) => {
  await personaAs(page, 'pm');
  await page.goto('/');
  await expect(page.getByText('Nordlys')).toBeVisible();
});
```

Clerk bypassed (47-02), DB seeded before this test body (47-04 + 47-05 auto-fixture), persona injected pre-hydration (47-05). Zero boilerplate.

## Commits

- `a9126dc` feat(47-05): add personaAs helper + gotoAs navigation helpers
- `6e737cb` feat(47-05): add extended test base with auto-seedFirst fixture

## Self-Check: PASSED

- FOUND: e2e/fixtures/persona.ts
- FOUND: e2e/fixtures/test-base.ts
- FOUND: e2e/lib/navigation.ts
- FOUND commit: a9126dc
- FOUND commit: 6e737cb
- pnpm typecheck: clean
- pnpm test: 714/714 green
