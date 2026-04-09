# Phase 47: Playwright E2E Infrastructure + TC-E2E Fill — Research

**Researched:** 2026-04-09
**Domain:** Playwright E2E test infrastructure
**Confidence:** HIGH
**Base research:** `.planning/phases/46-playwright-e2e-and-widget-polish/46-RESEARCH.md` — heavily reused. This document only fills the 7 verification gaps.

## Summary

Phase 46-RESEARCH already nailed the stack (Playwright + `@clerk/testing` + persona via `localStorage['nc:persona']` + reuse `buildSeed()` via a NODE_ENV-gated `/api/test/seed` route) and the 12 TC-E2E flow inventory. This pass only verifies what 46-RESEARCH flagged as unknown.

**Headline findings:**
- CI exists (`.github/workflows/ci.yml`): ubuntu-latest, Node 22, pnpm via `pnpm/action-setup@v4`, no explicit version pin, no Postgres service. Extension needed, not greenfield.
- Seed **already contains** the rejected-proposal row needed by TC-E2E-1C (Sara/Nordlys/2026-06, 60h, status `rejected`). No seed extension needed for 1C.
- Seed contains 24 months × 60h per person (40 primary + 20 secondary). TC-E2E-2A heatmap determinism is a **rendering assertion**, not a data gap — the over/under cells are a function of capacity thresholds × the seeded allocations, both deterministic. Verify at implementation time that the thresholds produce a visible red and a visible yellow; extend only if they don't.
- No `e2e/` directory. No `src/middleware.ts` (Next 16 uses `src/proxy.ts` — already public-routes `/api/health`, `/api/webhooks`).
- No `CLAUDE.md` in repo root.
- Clerk dev-instance access — **unverified, must ask user at plan kickoff**. Storage-state fallback documented below.
- PGlite already used for unit tests (`@electric-sql/pglite ^0.4.3`). 46-RESEARCH correctly rejected PGlite for E2E because the runner and the dev server are different processes; the seed route writes to the real dev DB instead.

**Primary recommendation:** Adopt 46-RESEARCH §"Playwright Stack" verbatim. Extend the existing `ci.yml` with a second job `e2e` (not a second workflow). Ask the user about Clerk dev credentials before writing `global-setup.ts`.

## User Constraints (from CONTEXT.md)

See `47-CONTEXT.md`. No prior `/gsd:discuss-phase` pass — CONTEXT is researcher-drafted and reflects 46-RESEARCH's split recommendation (accepted by the user — Phase 46 shipped widget fixes, Phase 47 is now scoped to Playwright only).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-01 | Install Playwright + config + `e2e/` dir | 46-RESEARCH §Playwright Stack |
| PLAY-02 | Persona fixture via `page.addInitScript` → `localStorage['nc:persona']` | 46-RESEARCH §Persona Switching |
| PLAY-03 | Test DB bootstrap — `/api/test/seed` (NODE_ENV + env-gated) + `global-setup.ts` | 46-RESEARCH §DB Bootstrap, verified below |
| PLAY-04 | Port 12 TC-E2E-* specs from ARCHITECTURE §15.13 | 46-RESEARCH §TC-E2E Per-Flow Inventory |
| PLAY-05 | Clerk testing tokens via `@clerk/testing` (fallback: storage-state) | §Clerk Access below |
| PLAY-06 | Remove `TC-E2E-*` from `tc-allowlist.json` + delete `reasons.TC-E2E` block; regenerate manifest | trivial edit |
| PLAY-07 | Extend existing `ci.yml` with `e2e` job (ubuntu, chromium-only, postgres service, trace artifacts) | §CI Shape below |
| PLAY-08 | Static invariant test asserting `/api/test/seed` is unreachable in production builds | §Seed Route Security below |

## Gap Verification

### Gap 1: GitHub Actions presence — VERIFIED PRESENT

`.github/workflows/ci.yml` exists. Current shape:

- `on`: push to main, PR to main
- single job `quality`: `ubuntu-latest`, Node **22** (`actions/setup-node@v4`), pnpm via `pnpm/action-setup@v4` (no version pin — resolves from `packageManager` in `package.json` = `pnpm@10.33.0`)
- steps: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` (with dummy env vars for Clerk/DB/PLATFORM_ADMIN_SECRET)
- no `pnpm test` step currently — Vitest suite does not run in CI today. Flag this as a pre-existing gap; not Phase 47's job to fix, but the new `e2e` job will be the first actual test runner in CI.
- no Postgres service

**Recommendation:** Add a second job `e2e` (don't touch `quality`). Copy the setup chain, add `services.postgres: postgres:16`, add `pnpm exec playwright install --with-deps chromium` with cache on `~/.cache/ms-playwright` keyed by the resolved Playwright version, add `pnpm exec playwright test`, upload `playwright-report/` + `test-results/` as artifacts on failure. Use the same dummy Clerk keys if the user does not have a dev instance (storage-state fallback then fails in CI — see Clerk gap).

**Also recommend adding a `pnpm test` step to the `quality` job** — the E2E job will be the ONLY test runner in CI otherwise, and unit tests should gate merges before E2E runs. One-liner, HIGH value. Include as a separate small plan.

### Gap 2: Clerk dev instance — UNVERIFIED, MUST ASK USER

No way to verify from source. `.env.example` not inspected in this pass but the CI dummy keys (`sk_test_dummy`, `pk_test_dummy`) suggest the team does NOT rely on a real Clerk dev instance for `pnpm build` and there may or may not be one for runtime.

**Two paths forward, both viable:**

1. **(preferred) Clerk testing tokens via `@clerk/testing`.** Requires a Clerk dev instance with real `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. One E2E bot user provisioned once. `global-setup.ts` calls `clerkSetup()`, signs in, saves storage state. Survives Clerk upgrades.

2. **Storage-state fallback (no Clerk dev needed).** Requires a local sign-in flow once, persist `storageState.json` to `e2e/.auth/`, reuse across specs. Gitignore the auth file. Drifts when Clerk rotates cookies — refresh manually when it breaks. **Does NOT work in CI** without a live Clerk instance because a fresh container has no persisted state; CI would need the testing-tokens path or a committed encrypted storage-state.

**Decision needed at plan kickoff:** Does the user have (or want to create) a Clerk dev instance? If yes → path 1. If no → path 2 locally, E2E job runs `continue-on-error` in CI until path 1 is set up.

### Gap 3: Seed completeness for TC-E2E-1C and 2A — VERIFIED

Read `tests/fixtures/seed.ts` end-to-end.

**TC-E2E-1C (rejected proposal for PM My Wishes panel):** ✅ **already present.** Line 308–318:

```ts
{
  id: uuidv5('seed:proposal:sara:nordlys:2026-06:rejected', namespace),
  proposerPersonId: personIdBySlug.get('anna')!,  // Anna is PM, matches TC-E2E-1C actor
  targetPersonId: personIdBySlug.get('sara')!,
  projectId: projectIdBySlug.get('nordlys')!,
  monthKey: '2026-06',
  hours: 60,
  status: 'rejected',
  reason: 'Sara has another commitment — can offer 40h max.',
},
```

Anna is the proposer, which matches the PM persona in TC-E2E-1C. No extension needed. The spec asserts "see a rejected row in My Wishes" — this row satisfies it.

**TC-E2E-2A (heatmap with deterministic red + yellow cells):** ⚠️ **data is deterministic, coloring must be re-verified at impl time.**

Allocations are `40h primary + 20h secondary = 60h/month for every person for every month 2026-01..2027-12`. That's 60h across all 24 months for all 6 people — **uniform**. Whether a heatmap cell is red/yellow depends on the capacity threshold logic (not inspected in this pass) applied to this 60h number.

**Three scenarios:**

a. If 60h triggers a warning color for all cells → spec can assert "any heatmap cell has the warning fill" — trivial, no seed change needed.
b. If 60h is green for all cells → the heatmap has no red/yellow to assert, **seed extension required**: bump Erik's March allocation to over-capacity, drop Sara's June below threshold (ARCHITECTURE §15.13's stated example).
c. If thresholds produce a mixed pattern naturally → use whichever cells are already red/yellow.

**Action:** The TC-E2E-2A plan includes a 10-minute debug task — dev-run the LineManager heatmap view under the seeded DB, screenshot, identify the cells. If seed extension is needed, it's a 2-line addition to the allocations loop (special-case Erik:2026-03 = 200, Sara:2026-06 = 10) that must be mirrored in `seed.deterministic.test.ts`.

**Not blocking Phase 47 start.** Worst case: one extra mini-plan for the seed extension.

### Gap 4: Test DB strategy — VERIFIED, use real Postgres

PGlite is in-process — cannot be shared between the Next dev server and the Playwright runner. 46-RESEARCH was correct to reject it.

**Recommendation: dedicated Postgres database, not the dev DB.** Three options:

a. **(CI)** `services.postgres: postgres:16` GH Actions service container. Ephemeral, free, runs drizzle migrations in a setup step.
b. **(local dev)** Separate local Postgres DB named `nc_e2e`. Developer runs `pnpm db:migrate` against it once, sets `DATABASE_URL=postgresql://.../nc_e2e` in `.env.test`. Never points at the dev/prod DB.
c. **(local dev alt)** Neon branch `e2e` forked off dev. Slower (network), free.

Choose (a) for CI and (b) for local. Document in `e2e/README.md`.

**Seeding model:** Truncate-and-reload via `/api/test/seed` in `global-setup.ts` (once per full suite run). Per-spec re-seed via `beforeEach` (same endpoint) — serial worker, `fullyParallel: false`. Parallelism is a post-MVP optimization.

### Gap 5: `/api/test/seed` route security — CLARIFIED

**Requirement:** The route must be IMPOSSIBLE to hit in production builds, not merely "returns 404 if env is wrong."

**Defense in depth:**

1. **Build-time exclusion via `process.env.NODE_ENV` check at module top-level** — `if (process.env.NODE_ENV === 'production') { throw new Error('test-only route') }` at import time. Tree-shaking + runtime guarantee.
2. **Runtime env gate** — also require `E2E_SEED_ENABLED === '1'` (not set in production).
3. **Static invariant test** (`tests/invariants/no-test-routes-in-prod.test.ts`) — greps the built `.next/` output for `api/test/seed` after a `NODE_ENV=production pnpm build` in CI. Fails the build if the handler survives.
4. **Clerk `isPublicRoute` stays untouched** — by default the route is `auth.protect()`'d because `/api/test/*` is not in the public matcher, so even if the route survived bundling it would require Clerk auth. Good. Do not add it to the public matcher.

PLAY-08 covers (3). (1) and (2) are code-level, part of PLAY-03.

### Gap 6: `e2e/` directory — VERIFIED ABSENT

No `e2e/` at repo root. Greenfield creation.

### Gap 7: Vitest config exclusions — VERIFIED SAFE

`vitest.config.ts` uses **explicit include globs** (`src/**/__tests__/...`, `tests/invariants/...`, `tests/fixtures/...`, `tests/perf/...`, `tests/unit/...`) — NOT an implicit "find everything." Adding an `e2e/` directory at root does not need a Vitest exclusion; it is simply not in the include list. Zero changes to `vitest.config.ts` needed.

**Caveat:** `e2e/*.spec.ts` files will not be picked up by Vitest (correct — they are Playwright specs). Playwright's `testDir: './e2e'` + default `**/*.spec.ts` pattern owns them cleanly. No glob collision.

## Project Constraints (from CLAUDE.md)

**No `CLAUDE.md` exists at repo root.** No project-level directives to enforce beyond normal conventions (lint + typecheck + format green, commits follow `type(phase-NN): ...` convention, `/gsd:verify-work` before phase close).

## Runtime State Inventory

N/A — greenfield test tier, no renames, no migrations, no stored state.

- Stored data: None — reuses existing deterministic seed.
- Live service config: None.
- OS-registered state: None.
- Secrets/env vars: **new** — `E2E_SEED_ENABLED=1` (test-only), `.env.test` entries for `DATABASE_URL` (pointing at `nc_e2e`), `CLERK_SECRET_KEY`/`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (dev instance, if path 1). Add to `.env.example` with commented stub.
- Build artifacts: Playwright browser cache at `~/.cache/ms-playwright` on dev machines and CI cache. No action needed beyond CI cache key.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js 22 | CI + dev | ✓ | 22 (CI pin) | — |
| pnpm | install | ✓ | 10.33.0 (package.json) | — |
| Postgres 16 | E2E DB | ✓ (dev has Neon/local per existing setup) | — | Create `nc_e2e` DB locally; CI uses service container |
| Next dev server on :3000 | Playwright `webServer` | ✓ | 16.2.1 | — |
| GitHub Actions | CI runner | ✓ | `ci.yml` exists (extend, don't create) | — |
| `@playwright/test` | all E2E work | ✗ | — | must install |
| `@clerk/testing` | Clerk bypass (path 1) | ✗ | — | Storage-state (path 2) |
| Clerk dev instance | testing-tokens path | **unknown — ask user** | — | Storage-state locally; `continue-on-error` in CI until resolved |
| `nordlys-import.xlsx` fixture | TC-E2E-2D | need to locate | — | Verify if Phase 44 TC-IMP-* tests shipped a fixture; else generate one |

**Missing, blocking verification:** Clerk dev-instance access (path 1 vs path 2). Resolve at plan kickoff.
**Missing with fallback:** Everything else.

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework (unit) | Vitest 2.1.9 (existing, unchanged) |
| Framework (E2E) | `@playwright/test` — install latest stable at plan time (`npm view @playwright/test version`) |
| Config file | `e2e/playwright.config.ts` (new) |
| Quick run (single spec) | `pnpm exec playwright test e2e/pm/submit-wish.spec.ts` |
| Full E2E | `pnpm exec playwright test` |
| Full suite (unit + E2E) | `pnpm test && pnpm exec playwright test` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Command | File Exists? |
|---|---|---|---|---|
| PLAY-01 | Playwright config discoverable, chromium installed | smoke | `pnpm exec playwright test --list` shows 12 tests | ❌ Wave 0 |
| PLAY-02 | Persona fixture sets localStorage before nav | E2E (single) | `pnpm exec playwright test e2e/pm/monday-checkin.spec.ts` | ❌ Wave 0 |
| PLAY-03 | `/api/test/seed` loads bundle in <3s | smoke | manual `curl` + row-count check; also asserted in `global-setup.ts` | ❌ Wave 0 |
| PLAY-04 | 12 TC-E2E-* flows pass | E2E | `pnpm exec playwright test` | ❌ Wave 0 (one spec per flow) |
| PLAY-05 | Clerk sign-in succeeds in `global-setup.ts` | smoke | `pnpm exec playwright test` greens without auth errors | ❌ Wave 0 |
| PLAY-06 | TC-E2E entries removed from allowlist; manifest clean | invariant | `pnpm vitest run tests/invariants/tc-id-coverage.test.ts` | ✓ existing |
| PLAY-07 | CI `e2e` job green on PR | CI | GH Actions run | ❌ Wave 0 |
| PLAY-08 | `/api/test/seed` absent from production bundle | invariant | `pnpm vitest run tests/invariants/no-test-routes-in-prod.test.ts` | ❌ Wave 0 |

### Sampling Rate

- Per task commit: `pnpm exec playwright test <single affected spec>` + `pnpm test` (unit).
- Per wave merge: `pnpm exec playwright test` (full chromium) + full Vitest.
- Phase gate: full suite green + `tc-id-coverage` green without TC-E2E allowlist entries + CI `e2e` job green on the phase PR + `no-test-routes-in-prod` green.

### Wave 0 Gaps

- [ ] `e2e/` directory + `playwright.config.ts`
- [ ] `e2e/fixtures/persona.ts`, `seed-db.ts`, `test-base.ts`
- [ ] `e2e/global-setup.ts` (Clerk sign-in decision + seed load)
- [ ] `src/app/api/test/seed/route.ts` (NODE_ENV-gated at import time + env-gated at request time)
- [ ] `tests/invariants/no-test-routes-in-prod.test.ts`
- [ ] `.env.example` + `.env.test` entries for `E2E_SEED_ENABLED`, E2E `DATABASE_URL`, Clerk keys
- [ ] `e2e/fixtures/nordlys-import.xlsx` — locate existing Phase 44 TC-IMP fixture or generate one
- [ ] Optional: `buildSeed()` extension for TC-E2E-2A heatmap colors (conditional, decide at impl time)
- [ ] Extend `.github/workflows/ci.yml` — new `e2e` job + add `pnpm test` to `quality` job
- [ ] Remove TC-E2E block from `.planning/test-contract/tc-allowlist.json`; regenerate manifest

## Open Questions

1. **Clerk dev instance?** Blocking at plan kickoff. User must answer before PLAY-05 is plannable.
2. **Heatmap thresholds on uniform 60h allocations — red, yellow, or green?** Determines whether TC-E2E-2A needs a seed extension. 10-minute dev-console check during PLAY-04 spec authoring.
3. **Does a `nordlys-import.xlsx` fixture from Phase 44 TC-IMP-* exist and is it reusable for TC-E2E-2D?** If not, generate one via `scripts/generate-import-template.ts` in a sub-plan.

## Sources

### Primary (HIGH confidence — source-verified in this pass)
- `.github/workflows/ci.yml` — CI shape, Node 22, pnpm action-setup v4
- `tests/fixtures/seed.ts` — rejected proposal row confirmed at lines 308–318, uniform 60h/month allocations
- `vitest.config.ts` — explicit include globs, no `e2e/` collision
- `src/proxy.ts` — Next 16 proxy (not middleware), `/api/health` public
- `package.json` — pnpm 10.33.0, Vitest 2.1.9, no Playwright
- `.planning/test-contract/tc-allowlist.json` — 12 TC-E2E IDs confirmed in both `allowed` list and `reasons.TC-E2E` block
- `.planning/test-contract/tc-canonical.json` — 12 TC-E2E IDs in canonical set

### Reused (HIGH confidence — by reference, not re-researched)
- `.planning/phases/46-playwright-e2e-and-widget-polish/46-RESEARCH.md` — Playwright stack, persona harness, Clerk strategy, TC-E2E per-flow inventory, code examples

### Secondary (MEDIUM — verify at install)
- Latest `@playwright/test` version — run `npm view @playwright/test version` at plan time
- Latest `@clerk/testing` version — run `npm view @clerk/testing version` at plan time

## Metadata

**Confidence breakdown:**
- Gap verifications (1–7): HIGH — source-verified
- Clerk dev-instance path: MEDIUM — depends on user answer
- Heatmap seed extension need: MEDIUM — depends on threshold inspection
- Overall plan readiness: HIGH — 46-RESEARCH covered the unknowns, this pass resolved the rest

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days)
