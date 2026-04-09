---
phase: 47-playwright-e2e-infra
plan: 01
subsystem: e2e-infrastructure
tags: [playwright, e2e, test-infra, wave-1, root]
requires: []
provides:
  - "@playwright/test ^1.59.1 devDependency + chromium browser binary"
  - "e2e/playwright.config.ts (chromium-only, serial, webServer /api/health probe)"
  - "e2e/ directory skeleton (pm, line-manager, staff, rd, fixtures, lib)"
  - "e2e/README.md (nc_e2e local setup, env vars, run guide)"
  - "e2e/fixtures/nordlys-import.xlsx (9 rows, row-per-entry schema, TC-E2E-2D)"
  - "scripts/generate-e2e-import-fixture.ts (deterministic regenerator)"
  - "pnpm test:e2e / pnpm test:e2e:ui scripts"
affects:
  - "package.json (devDeps + scripts)"
  - ".gitignore (playwright-report/, test-results/, e2e/.auth/)"
  - ".env.example (E2E_TEST / E2E_SEED_ENABLED stubs)"
tech-stack:
  added: ["@playwright/test@^1.59.1"]
  patterns: ["chromium-only", "serial (workers=1, fullyParallel=false)", "dedicated nc_e2e Postgres DB (not PGlite, not dev DB)"]
key-files:
  created:
    - "e2e/playwright.config.ts"
    - "e2e/README.md"
    - "e2e/fixtures/nordlys-import.xlsx"
    - "scripts/generate-e2e-import-fixture.ts"
    - "e2e/{pm,line-manager,staff,rd,fixtures,lib}/.gitkeep"
  modified:
    - "package.json"
    - ".gitignore"
    - ".env.example"
decisions:
  - "Did NOT stub global-setup.ts — PLAY-03 will create it real. Running `pnpm test:e2e` before PLAY-03 errors on missing global-setup.ts (intentional)."
  - "Did NOT install @clerk/testing — Clerk bypass lands via NODE_ENV=test in proxy (PLAY-02) per kickoff decision."
  - "Skipped `playwright install --with-deps` (Linux-only flag on Windows) — chromium binary installed cleanly without it."
  - "Fixture binary committed alongside the generator so CI has no runtime tsx dependency."
  - "Fixture schema uses existing row-per-entry template layout (person_name, project_name, date, hours) to ensure happy-path import with zero warnings."
requirements: [PLAY-01]
metrics:
  duration: "~15 min"
  tasks: 3
  files_created: 10
  files_modified: 3
  commits: 3
completed: "2026-04-09"
---

# Phase 47 Plan 01: Playwright E2E Infrastructure Bootstrap — Summary

Installed @playwright/test, scaffolded the `e2e/` directory with a chromium-only serial config, wired `pnpm test:e2e`, and committed a deterministic 9-row `nordlys-import.xlsx` fixture for the downstream TC-E2E-2D Line Manager import flow — the Wave 1 root that unblocks every subsequent Phase 47 plan.

## What Shipped

**Task 1 — Install + scripts (bacac44)**
- `pnpm add -D @playwright/test` → `1.59.1`
- `pnpm exec playwright install chromium` (skipped `--with-deps`, Linux-only)
- `pnpm test:e2e` + `pnpm test:e2e:ui` scripts added
- `.gitignore`: `/playwright-report/`, `/test-results/`, `/e2e/.auth/`

**Task 2 — e2e/ scaffold (67f6b8b)**
- `e2e/playwright.config.ts` — chromium-only, `fullyParallel: false`, `workers: 1`, webServer `pnpm dev` on `/api/health` with `NODE_ENV=test E2E_TEST=1 E2E_SEED_ENABLED=1`
- `e2e/README.md` — nc_e2e local setup, env var contract, run/debug/add-spec guide, CI pointer
- `e2e/{pm,line-manager,staff,rd,fixtures,lib}/.gitkeep`
- `.env.example` appended with `E2E_TEST=0`, `E2E_SEED_ENABLED=0`, DB pointer warning

**Task 3 — xlsx fixture (33a5348)**
- `scripts/generate-e2e-import-fixture.ts` — deterministic 9-row generator (Anna Lindqvist / Per Karlsson / Sara Berg × 2026-05/06/07, project Nordlys, hours 80/60/80 · 40/40/40 · 60/60/60)
- `e2e/fixtures/nordlys-import.xlsx` — 9084 bytes, parses cleanly via SheetJS, header row matches existing `template_row_per_entry.xlsx` schema (`person_name, project_name, date, hours`)

## Verification

| Check | Result |
|---|---|
| `pnpm exec playwright --version` | `Version 1.59.1` ✓ |
| `pnpm exec playwright test --config=e2e/playwright.config.ts --list` | Errors on missing `./global-setup.ts` — **intentional**, PLAY-03 will create it |
| `node -e "readFile + sheet_to_json"` on xlsx | 9 rows, first row `{"person_name":"Anna Lindqvist","project_name":"Nordlys","date":"2026-05-01","hours":80}` ✓ |
| `pnpm typecheck` | clean ✓ |
| `pnpm test` (vitest) | **707/707 green** ✓ — no collision with e2e discovery (vitest uses explicit include globs) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] NODE_ENV specified twice in playwright webServer env**
- **Found during:** Task 3 post-verification `pnpm typecheck`
- **Issue:** Plan's config snippet placed `NODE_ENV: 'test'` before `...process.env`, triggering TS2783 "'NODE_ENV' is specified more than once"
- **Fix:** Reordered to spread `process.env` first, then override `NODE_ENV`/`E2E_TEST`/`E2E_SEED_ENABLED` — semantically correct (test overrides always win) and typecheck-clean
- **File:** `e2e/playwright.config.ts`
- **Commit:** 33a5348 (bundled with Task 3 since it blocked the final typecheck gate)

### Scope Clarifications (not deviations)

- **`global-setup.ts` intentionally absent.** Plan explicitly instructs NOT to stub it. PLAY-03 is the next Wave 1 plan and will land it real. Documented in `e2e/README.md`.
- **`--with-deps` flag skipped on chromium install.** It's a Linux-only flag; on Windows the browser binary installs cleanly without it. CI (ubuntu) can re-add it in PLAY-07.

## Open Items / Downstream Hooks

- **PLAY-03 (next Wave 1 plan)** must create `e2e/global-setup.ts` — without it `pnpm test:e2e` currently errors on config load. This is the planned state at the end of 47-01.
- **TC-E2E-2D (future Wave, line-manager import spec)** will consume `e2e/fixtures/nordlys-import.xlsx`. Fixture schema verified to match the existing import parser happy path.
- **CI `e2e` job (PLAY-07)** not yet wired — Phase 47 plan 47-14 scope.

## Commits

| Hash | Task | Message |
|---|---|---|
| bacac44 | 1 | `chore(47-01): install @playwright/test + add e2e scripts` |
| 67f6b8b | 2 | `feat(47-01): scaffold e2e/ directory + playwright.config.ts` |
| 33a5348 | 3 | `feat(47-01): add nordlys-import.xlsx fixture + generator script` |

## Self-Check: PASSED

- `e2e/playwright.config.ts` — FOUND
- `e2e/README.md` — FOUND
- `e2e/fixtures/nordlys-import.xlsx` — FOUND (9084 bytes, 9 data rows)
- `scripts/generate-e2e-import-fixture.ts` — FOUND
- `bacac44` — FOUND
- `67f6b8b` — FOUND
- `33a5348` — FOUND
- `pnpm typecheck` clean
- `pnpm test` 707/707 green
