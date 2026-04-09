---
phase: 47-playwright-e2e-infra
plan: 02
subsystem: auth/proxy
tags: [clerk, e2e, playwright, proxy, invariant-test]
requires:
  - src/proxy.ts (pre-existing Clerk middleware)
  - ADR-004 (personas as UX shortcuts)
provides:
  - NODE_ENV=test / E2E_TEST=1 short-circuit in src/proxy.ts
  - tests/unit/proxy.e2e-bypass.test.ts source-level invariant
affects:
  - Playwright E2E specs in future plans (47-03+) — can now drive app
    without real Clerk credentials
tech-stack:
  added: []
  patterns:
    - source-level invariant test (readFileSync + regex, no import)
key-files:
  created:
    - tests/unit/proxy.e2e-bypass.test.ts
  modified:
    - src/proxy.ts
decisions:
  - Bypass is surgical — Clerk middleware still wraps the callback (route
    matcher stays consistent), the short-circuit is inside the callback via
    early return before auth.protect()
  - Invariant test reads src/proxy.ts as a string rather than importing,
    because importing triggers Clerk initialization in jsdom
  - Two env triggers (NODE_ENV=test OR E2E_TEST=1) — NODE_ENV=test covers
    vitest + Playwright global-setup path, E2E_TEST=1 covers the manual
    `pnpm dev` smoke path where NODE_ENV stays 'development'
metrics:
  duration: ~8 min
  tasks_completed: 1 of 2 (Task 2 is manual smoke — deferred to user)
  completed: 2026-04-09
---

# Phase 47 Plan 02: E2E Auth Bypass Summary

**One-liner:** Surgical `NODE_ENV=test`/`E2E_TEST=1` short-circuit added to `src/proxy.ts` before `auth.protect()`, locked in place by a source-level Vitest invariant test that regexes the proxy file to prevent silent removal by future refactors.

## What Shipped

### Task 1: E2E bypass + invariant test — COMPLETE

**Commit:** `f827fb5` — `feat(47-02): add E2E bypass to proxy with source invariant test`

**src/proxy.ts** — added 9 lines inside the `clerkMiddleware` callback, before the existing `isPublicRoute` / `auth.protect()` gate:

```ts
// E2E bypass — ADR-004: personas are UX shortcuts, not security boundaries.
// ...
if (process.env.NODE_ENV === 'test' || process.env.E2E_TEST === '1') {
  return;
}
```

The existing `isPublicRoute` matcher and `config.matcher` export are untouched.

**tests/unit/proxy.e2e-bypass.test.ts** — 5 source-level assertions:

1. `NODE_ENV === 'test'` literal present
2. `E2E_TEST === '1'` literal present
3. Bypass substring index < `auth.protect()` substring index (lexical order)
4. Comment references `ADR-004` or `E2E bypass`
5. `isPublicRoute` and `export const config` still present

All 5 tests green. Reads the file via `fs.readFileSync` rather than importing (importing src/proxy.ts in jsdom would trigger Clerk init).

**Verification:**
- `pnpm vitest run tests/unit/proxy.e2e-bypass.test.ts` — 5/5 passed
- `pnpm test` — 712/712 passed (was 707/707 before plan; +5 from the new invariant file)
- `pnpm typecheck` — clean

### Task 2: Manual smoke end-to-end — DEFERRED

Task 2 in the plan is an interactive `pnpm dev` + `curl` smoke with no code output. It requires running two dev servers back-to-back (with and without the E2E envs) and recording curl status codes. Per the plan body, this task is "a human-loop sanity check gating the wave" with no commit. It is deferred to the user / Plan 47-03 kickoff.

**Smoke steps for the user (copy-paste ready):**

```bash
# Terminal 1 — with bypass active
NODE_ENV=test E2E_TEST=1 DATABASE_URL=postgresql://localhost/nc_e2e pnpm dev

# Terminal 2 — expect 200 or 500 (app HTML/error), NOT a 302 to accounts.dev
curl -i http://localhost:3000/
curl -i http://localhost:3000/pm

# Stop, restart without envs
pnpm dev

# Terminal 2 — expect 302 sign-in redirect, proving prod default intact
curl -i http://localhost:3000/pm
```

PASS = first run returns app-level response (200 or 500), second run returns 302 to Clerk sign-in. FAIL = first run still redirects.

Recording the results will happen at the top of Plan 47-03 (it's the last thing before the first Playwright spec runs, so it's the natural gate).

## Deviations from Plan

None — plan executed exactly as written for Task 1. Task 2 is deferred (not a deviation, the plan explicitly labels it as a manual smoke with no code output).

## Known Stubs

None.

## Deferred Issues

- **Task 2 manual smoke** — see above. Blocks nothing in the test suite; blocks confidence gate for Plan 47-03 kickoff.

## Self-Check: PASSED

- `src/proxy.ts` modified — FOUND (bypass at lines 15–23)
- `tests/unit/proxy.e2e-bypass.test.ts` created — FOUND (32 lines, 5 tests)
- Commit `f827fb5` — FOUND (`git log --oneline | grep f827fb5`)
- 5/5 new tests green, 712/712 full suite green, typecheck clean
