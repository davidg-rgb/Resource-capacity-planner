---
phase: 47-playwright-e2e-infra
plan: 09
subsystem: ci
tags: [ci, github-actions, playwright, vitest, postgres]
requires:
  - 47-01 (pnpm test:e2e script)
  - 47-06 / 47-07 / 47-08 (Wave 2 specs live so CI has something to run)
provides:
  - "CI quality job now runs Vitest (closes pre-existing gap)"
  - "CI e2e job runs Playwright against postgres:16 service container"
affects:
  - ".github/workflows/ci.yml"
tech_stack:
  added:
    - "postgres:16 service container (GH Actions)"
    - "actions/cache@v4 for Playwright browser binaries"
    - "actions/upload-artifact@v4 for playwright-report/test-results"
  patterns:
    - "Playwright cache keyed by @playwright/test version only (cross-PR hit rate ~high)"
    - "e2e depends on quality (needs: quality) — saves runner minutes on broken PRs"
key_files:
  created: []
  modified:
    - .github/workflows/ci.yml
decisions:
  - "Kept plan's db:migrate (not db:push) — aligns with drizzle migration workflow and globalSetup idempotency"
  - "Cache key = playwright version only, not package-lock — matches PLAN.md and maximizes cache hit rate across PRs"
  - "Chromium-only in CI for speed (Firefox/WebKit are Phase 47 non-goal)"
  - "Upload artifacts only on failure (if: failure()) to keep green-PR bloat down"
metrics:
  duration: ~3 min
  completed_date: "2026-04-09"
  tasks_completed: 1
  files_modified: 1
---

# Phase 47 Plan 09: CI — Vitest step + Playwright e2e job Summary

Extended `.github/workflows/ci.yml` to run Vitest in the existing `quality` job (closing a pre-existing gap where unit tests never gated merges) and added a brand-new `e2e` job running Playwright chromium against a `postgres:16` service container with browser caching and failure artifacts.

## What Landed

### 1. `quality` job — new `Test (Vitest)` step

- Inserted after `Format check`, before `Build`
- Runs `pnpm test` (Vitest one-shot)
- Uses same dummy env vars as the `Build` step (DATABASE_URL, CLERK_*, PLATFORM_ADMIN_SECRET, etc.) — safe because Vitest uses `@electric-sql/pglite` in-process and Clerk is mocked
- Pre-existing quality steps (lint, typecheck, format:check, build) untouched

### 2. `e2e` job — brand new

- `needs: quality` — only runs if lint/typecheck/test/build all pass
- `services.postgres: postgres:16` with `POSTGRES_DB=nc_e2e` (matches e2e/lib/db.ts safety guardrail that requires 'e2e' or 'test' in DB name)
- Health check: `pg_isready`, 10s interval, 5 retries
- Node 22 + pnpm 10.33.0 via `pnpm/action-setup@v4` + `actions/setup-node@v4` (matches quality job)
- Playwright browser cache (`~/.cache/ms-playwright`) keyed by `@playwright/test` version read at runtime from `node_modules/@playwright/test/package.json`
- Cache-miss path: `pnpm exec playwright install --with-deps chromium` (browser + OS deps)
- Cache-hit path: `pnpm exec playwright install-deps chromium` (OS deps only — binaries already cached)
- `pnpm db:migrate` before Playwright boots the webServer (drizzle-kit migrate is idempotent with globalSetup)
- `pnpm test:e2e` runs the Wave 2 specs
- `actions/upload-artifact@v4` on `if: failure()` uploads `playwright-report/` + `test-results/` (traces, screenshots, videos) with 7-day retention
- Chromium-only (matches `e2e/playwright.config.ts` projects)

### Job-level env (e2e)

```
NODE_ENV=test
E2E_TEST=1
E2E_SEED_ENABLED=1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nc_e2e
CLERK_SECRET_KEY=sk_test_dummy
CLERK_WEBHOOK_SECRET=whsec_dummy
PLATFORM_ADMIN_SECRET=a-dummy-secret-that-is-at-least-sixty-four-characters-long-for-validation-purposes
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dummy
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Verification

- `grep "pnpm test" .github/workflows/ci.yml` → 2 hits (Vitest step + e2e step)
- `grep "postgres:16"` → present
- `grep "services:"` → present
- `grep "pnpm test:e2e"` → present
- YAML parsed successfully via `python -c "import yaml; yaml.safe_load(...)"`
- All plan `<verify><automated>` grep checks pass

## Deviations from Plan

None — plan executed exactly as written. (The orchestrator `<objective>` mentioned `db:push --force` and package-lock cache key; PLAN.md is authoritative per GSD workflow and specifies `db:migrate` + playwright-version cache key. Followed PLAN.md.)

## Known Stubs

None.

## Commits

- `4e39ab6` — ci(47-09): add Vitest step to quality job + new e2e job with postgres:16

## Self-Check: PASSED

- FOUND: .github/workflows/ci.yml (modified)
- FOUND: commit 4e39ab6
- FOUND: .planning/phases/47-playwright-e2e-infra/47-09-SUMMARY.md (this file)
- Plan automated verify command: all grep checks return exit 0
