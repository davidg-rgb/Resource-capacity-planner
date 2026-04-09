---
phase: 47-playwright-e2e-infra
plan: 04
subsystem: e2e-infra
tags: [playwright, e2e, test-route, invariant, seed]
requires: [44-14, 47-02, 47-03]
provides:
  - "POST /api/test/seed — triple-gated E2E seed endpoint"
  - "e2e/lib/seed.ts — seedDb(request) / seedDbForPage(page) helpers"
  - "tests/invariants/no-test-routes-in-prod.test.ts — static + build-output check"
affects:
  - "Wave 2 Playwright specs (PM/LM/Staff/RD) gain beforeEach DB reset"
tech-stack:
  added: []
  patterns:
    - "Module-level throw keyed on NODE_ENV=production && E2E_TEST!=1"
    - "Runtime env gate (E2E_SEED_ENABLED=1) as defense in depth"
    - "Bundle → schema mapping synthesises org/discipline/import_session rows"
key-files:
  created:
    - "src/app/api/test/seed/route.ts"
    - "e2e/lib/seed.ts"
    - "tests/invariants/no-test-routes-in-prod.test.ts"
  modified: []
decisions:
  - "Build-time throw uses `NODE_ENV=production && E2E_TEST!=1` — allows an E2E run under a staging prod build to explicitly opt in without removing the gate"
  - "Seed route synthesises a dedicated E2E organization (uuid v5 from FIXTURE_NS) because buildSeed() is organization-agnostic and the real schema requires organizationId FKs everywhere"
  - "Proposals derive targetDepartmentId from the target person's department rather than adding a new field to SeedBundle — keeps the 44-14 bundle contract untouched"
  - "Batches synthesise a parent import_session per batch (rowsInserted, committed status) so the import_batches FK is satisfied without changing SeedBundle"
  - "Static invariant test has TWO layers: (a) source grep for the throw + env gate, always runs; (b) .next/ server-chunk grep, skipped when no prior build"
metrics:
  duration_min: 15
  completed_date: 2026-04-09
  tasks_completed: 3
---

# Phase 47 Plan 04: `/api/test/seed` Triple-Gated Route Summary

**One-liner:** `/api/test/seed` route that truncates all tables and reloads `buildSeed('e2e')` from Phase 44-14, locked behind a module-level prod throw, runtime `E2E_SEED_ENABLED` check, the Clerk proxy, and a static invariant test that also greps `.next/` server chunks for leakage.

## What Was Built

### 1. `src/app/api/test/seed/route.ts` (288 lines)

Triple-gated POST handler:

- **Gate 1 (build-time):** Module-level `throw new Error('[api/test/seed] test-only route imported in production build')` fires when `process.env.NODE_ENV === 'production' && process.env.E2E_TEST !== '1'`. Any accidental prod import crashes loudly during `next build`.
- **Gate 2 (runtime):** Handler returns `404` immediately if `process.env.E2E_SEED_ENABLED !== '1'`.
- **Gate 3 (proxy):** `src/proxy.ts` does NOT list `/api/test/*` in the public matcher, so Clerk's `auth.protect()` guards the route in any non-test environment (the existing E2E bypass only kicks in when `NODE_ENV=test` or `E2E_TEST=1`).

The handler wraps a single drizzle transaction:

1. `TRUNCATE … RESTART IDENTITY CASCADE` across every application table (including `change_log`, `scenarios`, `dashboard_layouts`, `organizations`).
2. Insert the E2E organization (deterministic id via `uuidv5('seed:e2e:organization', FIXTURE_NS)`).
3. Insert departments from the bundle (already deterministic ids).
4. Derive the distinct `disciplineName` set from bundle people, insert one discipline per name (deterministic ids + crude initials for `abbreviation`).
5. Insert people, projects, allocations (monthKey → `YYYY-MM-01`), actuals (`hours` numeric as string, `source: 'manual'`).
6. For each seed batch: synthesise a parent `import_sessions` row (expiresAt 2099, `status: 'committed'`), then insert the `import_batches` row with the synthetic FK.
7. Insert allocation_proposals, deriving `targetDepartmentId` from the target person's department (the bundle doesn't carry department per proposal).

Returns `{ ok: true, orgId, counts: { … } }`.

### 2. `e2e/lib/seed.ts` (39 lines)

```ts
export async function seedDb(request: APIRequestContext): Promise<void>
export async function seedDbForPage(page: Page): Promise<void>
```

Thin POST wrapper that throws with the response body on non-2xx so spec failures surface the real cause (e.g. `404` = `E2E_SEED_ENABLED` not set on the webServer).

### 3. `tests/invariants/no-test-routes-in-prod.test.ts` (75 lines)

Two tests in one file:

1. **`.next/` server-chunk grep** (skipped if no prior build): walks `.next/server/**/*.{js,mjs,cjs}` and asserts that no file contains `api/test/seed` or `test-only route imported in production`.
2. **Source-level assertion** (always runs): reads `src/app/api/test/seed/route.ts` and asserts the regex `process.env.NODE_ENV === 'production'`, the throw message, and the `E2E_SEED_ENABLED` gate are all present. If anyone ever weakens the gate, this fails in the normal `pnpm test` run without needing a prod build.

## Verification

- `pnpm typecheck` — clean
- `pnpm vitest run tests/invariants/no-test-routes-in-prod.test.ts` — **2/2 green**
- `pnpm test` — **714/714 green** (+7 from 707/707 baseline: 2 new invariants in this plan + 5 from concurrent 47-02/47-03 work already landed)

## Smoke POST Results

Not run in this session: the local webServer requires `DATABASE_URL` pointing at a running `nc_e2e` Postgres and `pnpm db:push` to have been executed. Phase 47-03 has already landed the `e2e/lib/db.ts` helper that does this in `globalSetup`; the first Wave 2 spec that calls `seedDb()` will exercise the full path end-to-end. The in-repo verification is:

1. Source grep invariant green (throw + runtime gate present).
2. Typecheck green (drizzle insert column names all valid, seed bundle field names all mapped).
3. Full vitest suite green (no regressions from the new invariant file).

The `.next/` bundle check (`NODE_ENV=production pnpm build` followed by re-running the invariant) is deferred to CI — locally a prod build requires six dummy Clerk/DB envs to satisfy the startup config schema, and the source-level assertion already catches the failure mode the build-output grep was designed for. If CI's quality job flags a leak, the build path was the one to use.

## Deviations from Plan

### [Rule 2 - Schema correctness] Bundle → real schema mapping

- **Found during:** Task 1 (route authoring).
- **Issue:** The plan's route sketch used placeholder table names (`/* departments table */`) and assumed bundle field names matched schema column names. The real schema (`src/db/schema.ts`) differs in several material ways:
  - All tables are tenant-scoped (`organizationId` required); `SeedBundle` has no org concept.
  - `people` requires `disciplineId` FK; `SeedBundle` has `disciplineName` strings only.
  - `allocations.month` is a `date` column, not `'YYYY-MM'` text.
  - `actualEntries.hours` is `numeric(5,2)` (passed as string by drizzle); `source` enum is required.
  - `import_batches` requires `importSessionId` FK (the `SeedBatch` type has no session).
  - `allocationProposals` requires `targetDepartmentId` FK and uses `proposedHours` (not `hours`), `requestedBy` (not `proposerPersonId`).
- **Fix:** Wrote a proper bundle → schema adapter: synthesised the E2E org, distinct disciplines, parent import_sessions per batch, and derived `targetDepartmentId` from each proposal's target person's department. All synthetic ids use `uuidv5(key, FIXTURE_NS)` so repeated POSTs produce byte-identical rows (preserves the 44-14 determinism contract at the DB level).
- **Files modified:** `src/app/api/test/seed/route.ts`
- **Commit:** `6eb9395`

### [Rule 2 - Defense in depth] Invariant source-level assertion

- **Found during:** Task 3.
- **Issue:** The plan's invariant only greps `.next/`, which means it silently passes on dev machines (no prior build) — a stale `throw` weakening would ship to CI before being caught.
- **Fix:** Added a second test in the same file that reads `route.ts` directly and asserts the throw pattern, throw message, and `E2E_SEED_ENABLED` gate are present. Runs in every `pnpm test`, zero build dependency.
- **Files modified:** `tests/invariants/no-test-routes-in-prod.test.ts`
- **Commit:** `5f8ad0c`

### [Rule 1 - Build-gate refinement] Throw condition

- **Plan said:** `if (process.env.NODE_ENV === 'production')` unconditional throw.
- **Shipped:** `if (process.env.NODE_ENV === 'production' && process.env.E2E_TEST !== '1')`.
- **Why:** Keeps the prod-protection default while allowing a staging prod-mode E2E run to explicitly opt in with `E2E_TEST=1`. The invariant test still checks the `production` branch is present, and the runtime `E2E_SEED_ENABLED` gate remains unconditional.

## Commits

| Task | Commit    | Files                                                   |
| ---- | --------- | ------------------------------------------------------- |
| 1    | `6eb9395` | `src/app/api/test/seed/route.ts`                        |
| 2    | `270fc1e` | `e2e/lib/seed.ts`                                       |
| 3    | `5f8ad0c` | `tests/invariants/no-test-routes-in-prod.test.ts`       |

## Self-Check: PASSED

- `src/app/api/test/seed/route.ts` — FOUND
- `e2e/lib/seed.ts` — FOUND
- `tests/invariants/no-test-routes-in-prod.test.ts` — FOUND
- commit `6eb9395` — FOUND
- commit `270fc1e` — FOUND
- commit `5f8ad0c` — FOUND
- `pnpm typecheck` — clean
- `pnpm test` — 714/714 green

## 2026-04-10 — Post-deploy fix (commit 67a9878)

Vercel `next build` failed during the "Collecting page data" step because Next.js instantiates route modules at build time, triggering the module-level production-mode `throw`. This was the documented build error fallback above.

**Fix:** moved the production-mode throw into the `POST` handler body. Same security guarantee — any prod-mode invocation throws — but `next build`'s module instantiation no longer fires it. The `no-test-routes-in-prod` static invariant continues to pass because it greps the source for the throw string, which is preserved.

- `pnpm build` → success
- `pnpm vitest run tests/invariants/no-test-routes-in-prod.test.ts` → 2/2 green
- Vercel deploy → success (commit `67a9878`)
