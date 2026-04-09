# Nordic Capacity — E2E Tests (Playwright)

This directory holds Playwright specs for the 12 canonical `TC-E2E-*` flows from
`v5.0-ARCHITECTURE.md` §15.13. Infrastructure landed in Phase 47.

## Layout

```
e2e/
├── playwright.config.ts    # chromium-only, serial, webServer probes /api/health
├── global-setup.ts         # (lands in Phase 47 plan 47-03 / PLAY-03)
├── fixtures/               # static fixtures (xlsx, persona harness, db seed helper)
│   └── nordlys-import.xlsx
├── lib/                    # shared helpers (persona, auth, seed API)
├── pm/                     # TC-E2E-1* specs (Anna)
├── line-manager/           # TC-E2E-2* specs
├── staff/                  # TC-E2E-3* specs
└── rd/                     # TC-E2E-4* specs
```

Specs are named `TC-E2E-<id>: <short description>` inside `test(...)` so
`scripts/generate-tc-manifest.ts` picks them up automatically.

## First-time local setup

1. **Create the `nc_e2e` database** on your local Postgres instance (or a
   Docker `postgres:16` container, or a Neon dev branch). **Never point E2E
   at your dev or prod database.**
   ```sql
   CREATE DATABASE nc_e2e;
   ```
2. **Create `.env.test`** at repo root (gitignored) with:
   ```
   NODE_ENV=test
   E2E_TEST=1
   E2E_SEED_ENABLED=1
   DATABASE_URL=postgresql://<user>:<pass>@localhost:5432/nc_e2e
   CLERK_SECRET_KEY=sk_test_dummy
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dummy
   CLERK_WEBHOOK_SECRET=whsec_dummy
   PLATFORM_ADMIN_SECRET=a-dummy-secret-that-is-at-least-sixty-four-characters-long-for-validation
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   Clerk dummy keys are fine — `src/proxy.ts` bypasses Clerk when
   `NODE_ENV=test` (added in PLAY-02).
3. **Run `pnpm test:e2e`** — `global-setup.ts` will push the drizzle schema
   into `nc_e2e` automatically on first run (and truncate between runs).

## Safety guardrail

`e2e/lib/db.ts` refuses to run against any `DATABASE_URL` whose database
name does not contain `e2e` or `test`. This is an absolute last line of
defense against accidentally nuking the dev or prod DB. **NEVER override
it.** If you see `[e2e/db] Refusing to run E2E against database '...'`,
fix your `.env.test` — don't work around the check.

The guardrail also requires `psql` on `PATH` for the TRUNCATE step. On
Windows it ships with the Postgres installer; on macOS use `brew install
libpq && brew link --force libpq`; on Linux it's in the `postgresql-client`
package.

## Running

| Task                | Command                                                            |
| ------------------- | ------------------------------------------------------------------ |
| All specs           | `pnpm test:e2e`                                                    |
| Single spec         | `pnpm exec playwright test e2e/pm/submit-wish.spec.ts`             |
| Interactive UI mode | `pnpm test:e2e:ui`                                                 |
| Headed (debug)      | `pnpm exec playwright test --headed --workers=1`                   |
| Trace viewer        | `pnpm exec playwright show-trace test-results/.../trace.zip`       |

## Adding a Spec

1. Place the file in the correct persona subdir (`pm/`, `line-manager/`, `staff/`, `rd/`).
2. Name the `test(...)` block `TC-E2E-<id>: <description>` — the canonical TC-IDs
   are listed in `.planning/test-contract/tc-canonical.json`.
3. Re-seed in `beforeEach` via the `/api/test/seed` helper from `e2e/lib/`.
4. Run `pnpm exec playwright test <your-spec>` before committing.

## CI

GitHub Actions `e2e` job (Phase 47 plan 47-14, PLAY-07) runs this suite against a
`postgres:16` service container, chromium-only, with trace + screenshot artifacts
uploaded on failure.

## Notes

- `fullyParallel: false` + `workers: 1` — strictly serial for MVP. Parallelism is
  explicitly post-MVP (Phase 47 non-goal).
- `globalSetup: ./global-setup.ts` — lands in plan 47-03 (PLAY-03). Runs
  `migrate()` + `reset()` from `e2e/lib/db.ts` before the webServer boots.
- `webServer` launches `pnpm dev` with `NODE_ENV=test E2E_TEST=1 E2E_SEED_ENABLED=1`
  and probes `/api/health` (already public in `src/proxy.ts`).
