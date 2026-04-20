---
phase: 44-api-hardening-and-test-contract-fill
plan: 12
subsystem: test-contract / e2e
tags: [test-contract, tc-e2e, playwright, deferral, allowlist]
requires:
  - 44-06 (TEST-V5-01 foundation: extractor, manifest, invariant gate)
provides:
  - TC-ID extractor now recognizes multi-segment alphanumeric IDs (TC-E2E-1A, TC-E2E-2B-approve)
  - Structured deferral record for TC-E2E-* group with follow-up phase pointer
affects:
  - scripts/extract-tc-ids-from-architecture.ts (regex widened)
  - .planning/test-contract/tc-canonical.json (+12 TC-E2E entries)
  - .planning/test-contract/tc-allowlist.json (+12 TC-E2E entries + reasons block)
  - .planning/test-contract/tc-manifest.json (regenerated)
tech-stack:
  added: []
  patterns:
    - "Allowlist reasons block: per-group { status, decidedIn, rationale, followUp }"
key-files:
  created: []
  modified:
    - scripts/extract-tc-ids-from-architecture.ts
    - .planning/test-contract/tc-canonical.json
    - .planning/test-contract/tc-allowlist.json
    - .planning/test-contract/tc-manifest.json
    - .planning/phases/44-api-hardening-and-test-contract-fill/deferred-items.md
decisions:
  - "Option A: defer Playwright E2E infrastructure to a dedicated follow-up phase (tentatively Phase 46) rather than bolt it into Phase 44"
  - "TC-E2E-* group moved to allowlist with a structured rationale, so the TEST-V5-01 coverage gate stays green without pretending the flows are covered"
metrics:
  duration: ~10min
  completedDate: 2026-04-09
---

# Phase 44 Plan 12: TC-E2E Gap — Deferred to Dedicated Playwright Phase

Wave-4 plan 44-12 was scoped to fill the TC-E2E-* gap (~12 browser-driven
flows from ARCHITECTURE §15.13) using Playwright. Investigation at the
checkpoint revealed two blockers that made in-phase execution the wrong
call, and the orchestrator selected **Option A**: defer the Playwright
tier to a dedicated follow-up phase and allow-list the 12 IDs with a
structured rationale.

## What actually landed

1. **Extractor regex fix** — `scripts/extract-tc-ids-from-architecture.ts`
   previously only matched `TC-XXX-\d+[a-z]?`, which silently dropped
   every TC-E2E-* token in §15.13. Widened to
   `TC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+[A-Za-z]*(?:-[a-z]+)*` so all 12
   canonical IDs (incl. `TC-E2E-1A`, `TC-E2E-2B-approve`,
   `TC-E2E-2B-reject`) are extracted. Pre-existing TC-NEG / TC-UI-EMPTY /
   etc. grammar is preserved — re-run of the extractor yields 285 canonical
   IDs, up from 273, delta = +12 TC-E2E-*.

2. **Canonical list regenerated** — `tc-canonical.json` now contains the
   12 TC-E2E IDs listed in §15.13.

3. **Allowlist extended** — `tc-allowlist.json` gains the 12 TC-E2E IDs
   in both `stillMissing` and `groups.TC-E2E`, plus a new `reasons.TC-E2E`
   block recording status, decision, rationale, and follow-up phase
   pointer. The invariant gate (`tc-id-coverage.test.ts`) treats
   allowlisted entries as acceptable, so the gate stays green.

4. **Manifest regenerated** — `tc-manifest.json` rewritten via
   `scripts/generate-tc-manifest.ts`: 278 entries present from real test
   titles. Delta from previous: unchanged (no new E2E tests written).

5. **Deferred-items log updated** — `deferred-items.md` gains a dedicated
   entry for the Playwright phase follow-up.

## What explicitly did NOT land

- No `@playwright/test` install.
- No `e2e/` directory or spec files.
- No CI runner config for Playwright.
- No persistent PGlite/dev-DB bootstrap harness.
- No browser automation of persona switching.

These are the exact items moved into the follow-up phase.

## Deviations from Plan

### Rule 4 (architectural) — Playwright infrastructure deferred

**Found during:** Pre-execution checkpoint (plan 44-12 kickoff).

**Issue:** The plan assumed Wave-C foundation 44-06 had already stood up
Playwright. It had not. Standing up the Playwright tier requires:
installing `@playwright/test`, a playwright config, a CI job (Windows +
Linux matrix), a persistent test-DB bootstrap path distinct from the
Vitest PGlite fixture, a persona-switch harness that drives the dev auth
cookie, and baseline smoke tests for each of the four personas. That is
a multi-day effort with its own review surface, orthogonal to Phase 44's
stated goal ("API hardening and test contract fill"). Bolting it into
plan 44-12 would either blow scope or produce a flaky half-baked E2E
tier.

**Decision:** Option A selected by orchestrator — defer to a dedicated
follow-up phase (tentatively Phase 46) and allow-list the 12 TC-E2E-*
IDs with a structured `reasons` block so the TEST-V5-01 gate stays
accurate about coverage.

**Mitigating coverage:** The underlying flows are not untested — they
are covered at the service layer by the TC-PR-* (proposals), TC-IMP-*
(import/rollback), TC-CL-* (change-log), and TC-REG-* (regression) test
groups that landed earlier in this phase. What the TC-E2E tier adds on
top is specifically browser-level integration (URL routing, persona
cookie, DOM assertions, toast/drawer UX) — i.e. the things a service
test legitimately cannot assert.

**Also fixed opportunistically (Rule 1 — bug):** The canonical ID
extractor silently dropped the entire TC-E2E-* group because its regex
didn't allow uppercase letters in the numeric suffix. This was a latent
bug in 44-06 — without this fix, TC-E2E coverage couldn't even be
tracked by the invariant gate, let alone allow-listed.

**Files modified:** scripts/extract-tc-ids-from-architecture.ts,
tc-canonical.json, tc-allowlist.json, tc-manifest.json, deferred-items.md.

**Commits:**
- `ab7b5f4` — fix(44-12): extend TC-ID extractor regex for TC-E2E multi-segment IDs
- `66fcf54` — chore(44-12): allowlist TC-E2E-* (12 IDs) — defer Playwright infra

## Verification

- `pnpm tsx scripts/extract-tc-ids-from-architecture.ts` → 285 canonical
  IDs (was 273). All 12 expected TC-E2E-* IDs present.
- `pnpm tsx scripts/generate-tc-manifest.ts` → 278 manifest entries.
- `pnpm vitest run tests/invariants/tc-id-coverage.test.ts` → 3/3 passing
  (TC-INV-COVERAGE-001/002/003). Allowlist entries are accepted by the
  gate by design.

## Follow-up Phase (suggested: Phase 46)

**Name (tentative):** Playwright E2E Infrastructure + TC-E2E Fill

**Scope:**
1. Install `@playwright/test`, add `playwright.config.ts` with the four
   personas as projects.
2. Stand up a persistent dev-DB bootstrap (or reuse existing PGlite
   fixture via HTTP) that survives across tests within a single spec
   file but resets between files.
3. Build a persona-switch helper that sets the dev auth cookie without
   going through a real login UI.
4. Port the 12 TC-E2E flows from ARCHITECTURE §15.13 into
   `e2e/**/*.spec.ts`, one `test('TC-E2E-XXX ...')` per canonical ID.
5. Wire CI runner (Windows + Linux).
6. On landing: remove the `TC-E2E` entries from `stillMissing` and
   `groups.TC-E2E` in `tc-allowlist.json`, and delete the
   `reasons.TC-E2E` block. The invariant gate will then re-verify that
   all 12 IDs appear in `tc-manifest.json`.

## Self-Check: PASSED

- FOUND: scripts/extract-tc-ids-from-architecture.ts (regex updated)
- FOUND: .planning/test-contract/tc-canonical.json (12 TC-E2E entries)
- FOUND: .planning/test-contract/tc-allowlist.json (12 TC-E2E + reasons)
- FOUND: .planning/test-contract/tc-manifest.json (regenerated, 278 entries)
- FOUND: commit ab7b5f4 (regex fix + canonical)
- FOUND: commit 66fcf54 (allowlist + manifest)
- VERIFIED: tc-id-coverage invariant gate 3/3 passing
