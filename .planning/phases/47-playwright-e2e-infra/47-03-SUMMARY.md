---
phase: 47-playwright-e2e-infra
plan: 03
subsystem: e2e-infra
tags: [playwright, e2e, database, drizzle, safety]
requires:
  - 47-01 (e2e scaffold + playwright.config.ts)
  - 47-02 (NODE_ENV=test proxy bypass)
provides:
  - e2e/lib/db.ts (assertE2EDatabase, migrate, reset)
  - e2e/global-setup.ts (Playwright globalSetup hook)
affects:
  - e2e/README.md (first-time setup docs)
  - .gitignore (.env.test entry)
tech_stack:
  added: []
  patterns:
    - "safety guardrail (DB name regex) before any destructive op"
    - "drizzle-kit push via execSync for idempotent schema bootstrap"
    - "psql via execSync for cross-platform TRUNCATE (neon HTTP driver cannot emit raw identifiers)"
key_files:
  created:
    - e2e/lib/db.ts
    - e2e/global-setup.ts
  modified:
    - e2e/README.md
    - .gitignore
decisions:
  - "Use `pnpm db:push --force` over `pnpm db:migrate` because the project authors schema directly under drizzle/schema and has no numbered migrations folder checked in."
  - "psql (via execSync) for the TRUNCATE step. The neon HTTP driver cannot interpolate bare identifiers, and adding `pg` as a dep solely for E2E was rejected. psql is documented as a prerequisite in e2e/README.md."
  - "Guardrail rejects any DATABASE_URL whose database name does not match /e2e|test/i. Last line of defense against nuking dev/prod."
metrics:
  duration: "~20 min"
  completed: 2026-04-09
  tasks: 3
  files: 4
requirements: [PLAY-03]
---

# Phase 47 Plan 03: nc_e2e Database Bootstrap Summary

One-liner: Drizzle schema push + TRUNCATE-between-runs plumbing with a database-name safety guardrail, wired into Playwright `globalSetup`.

## What Shipped

- **`e2e/lib/db.ts`** — three helpers:
  - `assertE2EDatabase()`: parses `DATABASE_URL`, extracts the database name, throws unless it matches `/e2e|test/i`. Returns the name on success.
  - `migrate()`: asserts, then spawns `pnpm db:push --force` via `execSync` (idempotent).
  - `reset()`: asserts, discovers `public` tables via neon tagged-template (excluding `__drizzle%`), then shells out to `psql` for a single `TRUNCATE ... RESTART IDENTITY CASCADE`. Clear error on psql-missing.
- **`e2e/global-setup.ts`** — loads `.env.test` via `dotenv`, asserts `DATABASE_URL`, logs the DB name, runs `migrate()` then `await reset()`. Throws a friendly error directing the developer to `e2e/README.md` if `DATABASE_URL` is unset.
- **`playwright.config.ts`** — already wired (`globalSetup: './global-setup.ts'`) in 47-01. Verified.
- **`e2e/README.md`** — First-time setup section with `CREATE DATABASE nc_e2e`, the full `.env.test` template (including `CLERK_WEBHOOK_SECRET`, `PLATFORM_ADMIN_SECRET` at full 64+ char length, and `NEXT_PUBLIC_APP_URL`), safety-guardrail section with psql install notes per platform.
- **`.gitignore`** — `.env.test` added.

## DB Client Choice (per plan output requirement)

**Hybrid: neon for table discovery, psql for TRUNCATE.**

- `@neondatabase/serverless` (already a dep) is HTTP-only and works against any `postgres://` URL for *parameterised* queries. Used for the `SELECT tablename FROM pg_tables` discovery.
- The neon HTTP driver cannot interpolate bare identifiers into a TRUNCATE statement, so the TRUNCATE itself is issued via `execSync('psql "$DATABASE_URL" -c "TRUNCATE ..."')`.
- Trade-off: developers need `psql` on PATH (documented in README). The alternative — adding `pg` as a devDependency — was rejected as unnecessary footprint for one E2E code path.

## Deviations from Plan

**Minor — both documented inline in db.ts:**

1. **[Rule 3 — Blocker workaround] Use `pnpm db:push --force` instead of `pnpm db:migrate`.** The plan suggested `db:migrate`, but this project has no committed migrations folder; `drizzle-kit migrate` would no-op or fail. `db:push --force` is idempotent and matches how the dev DB schema is currently maintained.
2. **[Rule 3 — Scope decision] Neon+psql hybrid instead of pure neon.** Plan noted a possible `psql` fallback; it became the primary path for TRUNCATE because of the identifier-interpolation limitation.

No deviations required user approval (Rules 1–3 only).

## Verification

- `pnpm typecheck` — clean.
- `pnpm test` — 712/712 passing (unit suite unaffected).
- Manual run of `pnpm test:e2e` deferred: requires a developer to first `CREATE DATABASE nc_e2e` and populate `.env.test`. The guardrail and error messages have been code-reviewed; end-to-end smoke is a 47-04 concern once `/api/test/seed` exists.

## Known Stubs

None. Per-spec seeding hits `/api/test/seed` which is the explicit responsibility of Plan 47-04, not a stub.

## Commits

- `395e767` feat(47-03): add e2e/lib/db.ts with migrate/reset/safety guardrail
- `bcb0f6e` feat(47-03): add e2e/global-setup.ts wiring migrate + reset
- `100ffe6` docs(47-03): document nc_e2e setup + gitignore .env.test

## Self-Check: PASSED

- e2e/lib/db.ts — FOUND
- e2e/global-setup.ts — FOUND
- e2e/README.md updated — FOUND (`nc_e2e` + `CREATE DATABASE` strings present)
- .gitignore `.env.test` — FOUND
- Commits 395e767, bcb0f6e, 100ffe6 — all present in `git log`
- `pnpm typecheck` clean, `pnpm test` 712/712
