# Phase 47: Playwright E2E Infrastructure + TC-E2E Fill — Context

**Status:** Researcher-drafted (no `/gsd:discuss-phase` pass — Phase 46 split already accepted and shipped)
**Date:** 2026-04-09

## Goal

Stand up Playwright as a new test tier, author the 12 `TC-E2E-*` flows canonicalised in `v5.0-ARCHITECTURE.md` §15.13, and remove the `TC-E2E` allowlist block from `tc-allowlist.json` — closing the last open Test Contract gap from Phase 44-12.

## Decisions

1. **Stack: Playwright + `@clerk/testing`, chromium-only, reuse `buildSeed()`.** Exactly as specified in `46-RESEARCH.md` §"Playwright Stack". No alternative stacks considered.

2. **Directory layout: `e2e/` at repo root**, split by persona subdir (`pm/`, `line-manager/`, `staff/`, `rd/`), flat specs (no POM), one spec per canonical TC-E2E ID, test names prefixed with the TC ID so `generate-tc-manifest.ts` picks them up automatically.

3. **Persona switching via `page.addInitScript` setting `localStorage['nc:persona']`.** Three-line fixture. No cookie surgery, no test-only middleware. Persona is documented as a UX shortcut, not a security boundary, so this is correct and minimal.

4. **DB bootstrap: test-only `/api/test/seed` route**, gated by (a) `process.env.NODE_ENV === 'production'` **throw at module import time**, (b) runtime `E2E_SEED_ENABLED === '1'` check, (c) static invariant test asserting the handler is absent from `NODE_ENV=production pnpm build` output, (d) Clerk `proxy.ts` public matcher stays untouched so the route inherits `auth.protect()` as a 4th layer.

5. **Dedicated Postgres database**, not PGlite (cross-process), not the dev DB. Local dev: `nc_e2e` database with `pnpm db:migrate`. CI: `services.postgres: postgres:16` service container.

6. **Seed bundle already suffices for TC-E2E-1C** (rejected proposal Sara/Nordlys/2026-06 is present in `tests/fixtures/seed.ts` lines 308–318). Do NOT extend for 1C.

7. **Seed extension for TC-E2E-2A is conditional** — 60h uniform allocations may or may not produce a visible red/yellow cell depending on heatmap thresholds. Planner budgets a 10-minute threshold inspection at the start of the TC-E2E-2A plan; extend the seed only if all cells render the same color. Extension, if needed, is a 2-line allocation override mirrored in `seed.deterministic.test.ts`.

8. **CI: extend existing `.github/workflows/ci.yml`**, don't create a second workflow. New job `e2e` alongside `quality`. Also add `pnpm test` to the `quality` job (pre-existing gap — unit tests don't run in CI today) as a small separate plan inside Phase 47.

9. **Clerk auth strategy — DEFER to kickoff user decision.** Path 1 (testing tokens via `@clerk/testing` + Clerk dev instance) is strongly preferred; path 2 (storage-state fallback) is viable locally but does not work in CI. **Planner MUST pause at PLAY-05 until the user confirms path.**

10. **Serial execution for MVP** — `fullyParallel: false`, `workers: 1`, truncate-and-reseed per spec in `beforeEach`. Parallelism is explicitly post-MVP.

11. **Remove allowlist and `reasons.TC-E2E` block, regenerate manifest** in the final plan of the phase after all 12 specs are green.

## Claude's Discretion

- Exact naming of the Playwright spec files within each persona subdir — follow 46-RESEARCH's suggested layout unless there's a reason to deviate.
- How per-spec `beforeEach` re-seeding is implemented — POST to `/api/test/seed` with a fresh `buildSeed('e2e')` bundle, or a lighter-weight truncate-only endpoint. Planner picks; preference is "one endpoint, simplest thing."
- Whether to split PLAY-04 into one plan per persona (4 plans) or one plan per TC-E2E flow (12 plans). Preference: one plan per persona subdir (4 plans), keep it readable.
- How the Playwright browser cache is keyed in CI — by Playwright version or by `pnpm-lock.yaml` hash. Either is fine.
- Whether `no-test-routes-in-prod.test.ts` greps the `.next/server/` output, uses a dry `next build` + static analysis, or both. Planner picks the simplest defensible option.
- Whether the dev-DB `nc_e2e` local setup is automated (new `pnpm e2e:init` script) or documented (one-line README). Preference: documented for v1, scriptable for v2.

## Success Criteria

1. `pnpm exec playwright test` green locally (all 12 TC-E2E-* specs) against the `nc_e2e` DB.
2. `.github/workflows/ci.yml` `e2e` job green on the phase PR in GH Actions.
3. `.github/workflows/ci.yml` `quality` job runs `pnpm test` (new step) and is green.
4. `.planning/test-contract/tc-allowlist.json` no longer contains any `TC-E2E-*` entry in the `allowed` list, and the `reasons.TC-E2E` block is deleted.
5. `tests/invariants/tc-id-coverage.test.ts` green (manifest regenerated, no TC-E2E allowlist entries expected).
6. `tests/invariants/no-test-routes-in-prod.test.ts` green — `/api/test/seed` provably absent from production builds.
7. `pnpm typecheck` clean, `pnpm lint` clean, `pnpm build` succeeds.
8. `e2e/README.md` documents: how to set up `nc_e2e` locally, how to run specs, how to add a new spec, which env vars are required.
9. Phase SUMMARY documents which Clerk path was taken (1 or 2) and why.

## Non-Goals

- **Cross-browser testing.** Chromium only. Firefox/WebKit deferred to a later phase if a bug ever manifests as browser-specific.
- **Visual regression / pixel-diff assertions.** DOM-level assertions only.
- **Test parallelism** (`workers > 1`). Explicitly post-MVP; documented as a Phase 47 follow-up.
- **Converting unit tests to E2E.** Unit tests stay in Vitest.
- **Rewriting `proxy.ts` or the persona context.** Both are already E2E-friendly.
- **New Clerk features or user provisioning UX.** If a dev instance is needed, the user creates it out-of-band.
- **Performance budgets on E2E runs.** Wall time is whatever Playwright gives us for 12 serial specs. Optimize only if CI wall time exceeds 10 minutes.
- **Additional TC-* tiers.** Only the 12 canonical TC-E2E-* IDs.

## Constraints

- Must not break the existing `quality` CI job — the `e2e` job is additive.
- Must not introduce flakiness: tests that rely on timing use Playwright's auto-waiting, not `page.waitForTimeout`.
- Must not relax `tc-id-coverage` — the new allowlist state must be strictly tighter, never looser.
- Must not point E2E at the dev/prod database under any circumstance. `nc_e2e` or CI service container only.
- Must not ship `/api/test/seed` to production — enforced by build-time throw + invariant test.
- `vitest.config.ts` stays unchanged (confirmed safe — explicit include globs, no `e2e/` collision).
- `src/proxy.ts` public matcher stays unchanged (the test route must remain auth-protected as defense in depth).
- All commits follow `test(47-NN): ...` or `feat(47-NN): ...` convention consistent with Phase 45/46.

## Canonical TC-E2E IDs to Fill (12)

From `v5.0-ARCHITECTURE.md` §15.13 and `.planning/test-contract/tc-canonical.json`:

| ID | Persona | Flow |
|---|---|---|
| TC-E2E-1A | PM (Anna) | Monday check-in — project overview + timeline + drill-down drawer |
| TC-E2E-1B | PM (Anna) | Submit a wish (proposal) — toast confirmation |
| TC-E2E-1C | PM (Anna) | Rejected wish visible in My Wishes panel, resubmit flow |
| TC-E2E-1D | PM (Anna) | Historic edit via HistoricEditDialog — change_log row asserted |
| TC-E2E-2A | Line Manager | Heatmap renders with red + yellow cells (conditional seed extension) |
| TC-E2E-2B-approve | Line Manager | Approve a proposal — status flips to `approved` |
| TC-E2E-2B-reject | Line Manager | Reject a proposal — required reason dialog |
| TC-E2E-2C | Line Manager | Direct edit of an allocation — change_log row asserted |
| TC-E2E-2D | Line Manager | Import a Nordlys fixture Excel — preview + rollback within window |
| TC-E2E-3A | Staff | Read-only schedule — no edit controls present in DOM |
| TC-E2E-4A | R&D Lead | Portfolio grid + groupBy toggle + zoom-to-year |
| TC-E2E-4B | R&D Lead | Drill-down dialog on a red cell |

## Deferred Ideas (OUT OF SCOPE)

- Firefox/WebKit matrix.
- Per-worker schema isolation for parallel E2E.
- Visual regression baseline.
- Percy/Chromatic integration.
- Clerk user provisioning automation.
- Performance budgets on E2E wall time.
- Auto-generating TC-E2E specs from ARCHITECTURE markdown.
- `data-testid` audit / refactor across all widgets — add only the ones the 12 specs need.
- Converting the import fixture into a reusable cross-test factory.
- A `pnpm e2e:init` automation script (nice-to-have, not required for v1).

## Kickoff Questions (resolve before Wave 1 starts)

1. **Clerk dev instance — does one exist, or should we create one, or do we go storage-state fallback locally?** Blocks PLAY-05.
2. **Which local Postgres do you want `nc_e2e` created against** — your existing local PG, a fresh Docker container, or a Neon branch? Affects `e2e/README.md` setup instructions.
3. **Is there an existing `nordlys-import.xlsx` fixture from Phase 44 TC-IMP-*** that can be copied into `e2e/fixtures/`, or should Phase 47 generate one via `scripts/generate-import-template.ts`?

## References

- `47-RESEARCH.md` — gap-filling research, CI shape, seed verification, Clerk paths
- `.planning/phases/46-playwright-e2e-and-widget-polish/46-RESEARCH.md` — primary stack research (reused heavily)
- `.planning/phases/46-playwright-e2e-and-widget-polish/46-CONTEXT.md` — split rationale
- `.planning/v5.0-ARCHITECTURE.md` §15.13 — canonical TC-E2E-* flow definitions
- `.planning/test-contract/tc-allowlist.json` — `reasons.TC-E2E` block to remove
- `.planning/test-contract/tc-canonical.json` — 12 canonical IDs
- `tests/fixtures/seed.ts` — deterministic seed (rejected proposal confirmed at lines 308–318)
- `.github/workflows/ci.yml` — existing CI workflow to extend
- `src/proxy.ts` — Clerk proxy, public route matcher (do not modify)
