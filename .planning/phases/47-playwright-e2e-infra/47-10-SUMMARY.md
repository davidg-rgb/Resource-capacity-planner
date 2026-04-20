---
phase: 47-playwright-e2e-infra
plan: 10
subsystem: test-contract
tags: [test-contract, playwright, manifest, invariants]
requires: [47-06, 47-07, 47-08, 47-09]
provides:
  - "tc-manifest.json covering all 12 canonical TC-E2E-* IDs"
  - "tc-allowlist.json with zero TC-E2E entries"
  - "tc-manifest generator able to scan e2e/**/*.spec.ts"
affects:
  - "Phase 44-12 deferral closed (TC-E2E group)"
tech_stack:
  added: []
  patterns:
    - "Extended TC-ID grammar: alphanumeric prefix segments, optional uppercase trailing letter, optional lowercase -suffix tail (for -approve/-reject variants)"
key_files:
  created:
    - ".planning/phases/47-playwright-e2e-infra/47-10-SUMMARY.md"
  modified:
    - "scripts/generate-tc-manifest.ts"
    - ".planning/test-contract/tc-manifest.json"
    - ".planning/test-contract/tc-allowlist.json"
decisions:
  - "Widened TC-ID regex in generator rather than special-casing TC-E2E — keeps single grammar path for all future prefixes"
metrics:
  duration: "~5 min"
  completed: "2026-04-09"
  tasks: 3
  commits: 3
requirements: [PLAY-09]
---

# Phase 47 Plan 10: Close Test Contract TC-E2E Gap — Summary

One-liner: Removed the 12 TC-E2E-* deferral entries from `tc-allowlist.json`, extended `scripts/generate-tc-manifest.ts` to scan Playwright specs, regenerated `tc-manifest.json` so all 12 IDs are now covered by real tests, and re-verified the `tc-id-coverage` invariant green — closing Phase 44-12's remaining deferral.

## What Changed

1. **Generator extended** (`scripts/generate-tc-manifest.ts`):
   - Added `e2e` to `ROOTS`, matching `.spec.ts` / `.test.ts` under `e2e/`
   - Widened `FIRST_TC_RE` and `VALID_RE` from `[A-Z]+` prefix segments + `\d+[a-z]?` suffix to `[A-Z0-9]+` prefix segments + `\d+[A-Za-z]?(?:-[a-z]+)?` suffix. This supports:
     - Alphanumeric prefix segments: `TC-E2E-*` (the `E2E` middle digit previously broke the regex entirely)
     - Uppercase trailing letter: `TC-E2E-1A` (was `[a-z]?` only)
     - Lowercase tail suffix: `TC-E2E-2B-approve`, `TC-E2E-2B-reject`

2. **Manifest regenerated**: 280 → 292 entries. All 12 canonical TC-E2E-* IDs present with their `e2e/**/*.spec.ts` source paths.

3. **Allowlist cleaned**: removed all 12 TC-E2E entries from `stillMissing`, dropped `groups.TC-E2E`, dropped `reasons.TC-E2E`. TC-NEG deferral (13 IDs) preserved unchanged.

## Verification

- `pnpm vitest run tests/invariants/tc-id-coverage.test.ts`: **3/3 green** (TC-INV-COVERAGE-001/002/003)
- `pnpm vitest run` full suite: **714/714 green** across 107 files
- `pnpm typecheck`: clean
- Manual check: all 12 canonical TC-E2E-* IDs now resolvable via `manifest.entries[id]`
- Playwright suite execution itself is CI's job (requires `nc_e2e` DB bootstrap); the TC contract coverage gate proves the specs are linked to canonical IDs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical functionality] Extended TC-ID grammar in generator regex**

- **Found during:** Task 1
- **Issue:** The existing `FIRST_TC_RE` (`^(TC-[A-Z]+(?:-[A-Z]+)*-\d+[a-z]?)\b`) could not match any of the 12 canonical TC-E2E-* IDs:
  - `[A-Z]+` failed on `E2E` (digit in the middle of the prefix segment)
  - `[a-z]?` suffix rejected the uppercase `A`/`B` variant letters (`TC-E2E-1A`)
  - No provision for lowercase tail suffixes like `-approve`/`-reject`
- **Fix:** Widened prefix segment class to `[A-Z0-9]+` and the suffix to `\d+[A-Za-z]?(?:-[a-z]+)?`. Also added `e2e` to `ROOTS` (plan explicitly flagged this as expected — Rule 2 covered both changes in one commit).
- **Files modified:** `scripts/generate-tc-manifest.ts`
- **Commit:** `159b457`

The plan's notes section predicted this change; it's documented here for traceability.

### Auth Gates

None.

### Architectural Changes

None.

## Commits

| Task | Commit    | Message |
|------|-----------|---------|
| 1    | `159b457` | feat(47-10): extend tc-manifest generator to scan e2e specs |
| 2    | `81abdbe` | chore(47-10): remove TC-E2E from tc-allowlist |
| 3    | (no new files — gate run only) | — |

## Phase 47 Status

This is the final plan in Phase 47 (Playwright E2E infrastructure). With this merge:

- All 12 TC-E2E-* flows from ARCHITECTURE §15.13 have real Playwright specs at `e2e/{pm,line-manager,staff,rd}/*.spec.ts`
- TC contract has **0 TC-E2E allowlist entries**
- `tc-id-coverage` invariant green: 285 canonical IDs, all either present in manifest or in the (TC-NEG-only) deferral list
- Phase 44-12's remaining deferral is now closed

Next step: `/gsd:verify-work` to close Phase 47.

## Self-Check: PASSED

- `scripts/generate-tc-manifest.ts` — MODIFIED (confirmed via commit 159b457)
- `.planning/test-contract/tc-manifest.json` — REGENERATED, all 12 TC-E2E IDs present (confirmed by node assertion)
- `.planning/test-contract/tc-allowlist.json` — CLEANED, no TC-E2E references (confirmed by node assertion)
- Commits `159b457` and `81abdbe` — FOUND in `git log`
- tc-id-coverage invariant — 3/3 GREEN
- Full vitest suite — 714/714 GREEN
