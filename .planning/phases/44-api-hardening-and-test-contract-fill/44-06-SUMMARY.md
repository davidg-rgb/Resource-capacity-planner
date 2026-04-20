---
phase: 44
plan: 06
subsystem: test-infrastructure
tags: [TEST-V5-01, tc-ids, invariants, ci-gate]
requires: [44-04, 44-05]
provides:
  - canonical-tc-id-extractor
  - tc-id-manifest-generator
  - tc-id-coverage-ci-gate
  - tc-allowlist-baseline
affects: [tests/invariants, .planning/test-contract]
tech-stack:
  added: []
  patterns: [static-invariant, naming-convention, diff-gate, allowlist-budget]
key-files:
  created:
    - scripts/extract-tc-ids-from-architecture.ts
    - scripts/generate-tc-manifest.ts
    - tests/invariants/tc-id-coverage.test.ts
    - .planning/test-contract/tc-canonical.json
    - .planning/test-contract/tc-manifest.json
    - .planning/test-contract/tc-allowlist.json
  modified: []
decisions:
  - Dynamic 44-05 tests (TC-API-TENANT-NNN built via template literal) do not surface in the manifest; canonical has no such IDs either, so no CI gap.
  - Baseline allowlist holds 160 entries (not the planned ~108) because canonical range expansion inflates TC-UI-* groups.
metrics:
  duration: ~15min
  completed: 2026-04-09
  tasks: 3
  commits: 3
---

# Phase 44 Plan 06: TC-ID Manifest Infrastructure Summary

Wave C foundation — canonical TC-ID extractor, test-tree manifest generator, and CI diff gate with baseline allowlist now in place. TEST-V5-01 infrastructure ready for Wave C fill plans 44-07..13 to shrink the allowlist.

## Commits

| Task | Hash      | Message                                             |
| ---- | --------- | --------------------------------------------------- |
| 1    | `8f69874` | feat(44-06): add canonical TC-ID extractor          |
| 2    | `b20dd74` | feat(44-06): add TC-ID manifest generator           |
| 3    | `eb7a0d2` | test(44-06): add TC-ID coverage CI gate + allowlist |

## What was built

### Task 1 — Canonical extractor

`scripts/extract-tc-ids-from-architecture.ts` reads `.planning/v5.0-ARCHITECTURE.md`, isolates §15 (between `## 15.` and `## 16.` markers), matches both single TC-IDs (`TC-XXX-NNN[a-z]?`) and range notation (`TC-XXX-NNN..MMM`), and expands ranges with zero-padded width preservation.

**Output:** `.planning/test-contract/tc-canonical.json` — **273 canonical TC-IDs** (above the ≥200 acceptance floor; range expansion materializes 14×4 `TC-UI-{EMPTY,ERROR,LOAD}-*` families).

### Task 2 — Manifest generator

`scripts/generate-tc-manifest.ts` walks `tests/**` and `src/**/*.{test,spec}.{ts,tsx}` as plain text, finds `it(`/`test(`/`describe(` calls with any quote style (`'` `"` `` ` ``), extracts the first-token TC-ID from each title, and writes a deterministic sorted manifest.

**Output:** `.planning/test-contract/tc-manifest.json` — **126 entries** (above the ≥122 baseline). Includes `TC-NEG-013` from 44-04 confirming that phase's error-wire-format tests are picked up.

### Task 3 — CI diff gate + allowlist baseline (TDD)

`tests/invariants/tc-id-coverage.test.ts` with three invariants:

1. `TC-INV-COVERAGE-001` — `canonical ⊆ (manifest ∪ allowlist)` — fails if any canonical TC-ID is uncovered and unexcused.
2. `TC-INV-COVERAGE-002` — `allowlist ∩ manifest = ∅` — fails when Wave C fills a TC-ID but forgets to remove it from the allowlist.
3. `TC-INV-COVERAGE-003` — `allowlist ⊆ canonical` — fails on stray / misspelled allowlist entries.

`.planning/test-contract/tc-allowlist.json` baseline: **160 entries** grouped by prefix (TC-AC, TC-API, TC-CAL, TC-DB, TC-EX, TC-IMP, TC-INV, TC-NEG, TC-PERF, TC-PR, TC-PS, TC-PSN, TC-RD-READONLY, TC-UI, TC-UI-EMPTY, TC-UI-ERROR, TC-UI-LOAD).

Initial state: **GREEN** — 273 canonical = 113 present + 160 allowed. Wave C shrinks to `allowlist = []` by Wave D.

## Coverage math

| Quantity             | Count |
| -------------------- | ----- |
| Canonical (§15)      | 273   |
| Manifest entries     | 126   |
| Canonical ∩ Manifest | 113   |
| Allowlist baseline   | 160   |
| Uncovered + unexcued | 0     |

(Note: 13 of the 126 manifest entries are test-only TC-IDs not in the §15 canonical — such as `TC-CAL-025` carried from earlier phases, and various `TC-API-00N` subdivisions like `-004a`/`-004b`. These are harmless under the current gate since the gate is canonical-driven.)

## Deviations from Plan

### [Rule 3 — Blocking acceptance criterion] TC-API-TENANT-* not surfaceable via static scan

- **Found during:** Task 2 verification
- **Issue:** Plan acceptance criterion says "Entries include at least one `TC-API-TENANT-*` key (proves 44-05 tests were picked up)." The 44-05 tests (`tenant-isolation.runtime.test.ts`, `tenant-isolation.static.test.ts`) construct their TC-IDs dynamically via template literals (`` `TC-API-TENANT-${String(idx+1).padStart(3,'0')}` ``) and parameterized describe blocks — no literal TC-ID string exists in source for a text scanner to find.
- **Impact:** Also, the canonical list from ARCHITECTURE.md §15 contains **zero** `TC-API-TENANT-*` IDs — the §15 document uses a different numbering (TC-API-030..051 range etc. cover the same tenant concern). So there is no CI gap from this criterion.
- **Decision:** Do not retrofit 44-05 tests to emit literal TC-IDs. Document the mismatch and move on; the CI gate still enforces the canonical set correctly. The manifest does include `TC-API-001`, `TC-API-004a/b`, `TC-API-010..014`, `TC-API-030..034`, `TC-API-040..041`, `TC-API-050..051` — proving 44-05 and 44-03 tenant tests with literal IDs are picked up.
- **Files modified:** None.
- **Commit:** n/a (documentation-only deviation)

### [Rule 2 — Missing invariant] Added third invariant (allowlist orphan check)

- **Found during:** Task 3 design
- **Added:** `TC-INV-COVERAGE-003` catches non-canonical entries accidentally added to the allowlist (e.g. typos, stale IDs after ARCHITECTURE edits).
- **Rationale:** Symmetry with `-002` stale check; prevents allowlist rot.
- **Commit:** `eb7a0d2`

### [Rule 3 — Baseline count] Allowlist grew to 160 (plan expected ~108)

- **Found during:** Task 3 allowlist computation.
- **Root cause:** Canonical range-expansion (14×4 `TC-UI-{EMPTY,ERROR,LOAD}-*` families) is more aggressive than the research phase modeled. Canonical count is 273 (not the ~230 lower bound), and manifest is 126, so missing = 160.
- **Impact:** Wave C plans 44-07..13 must absorb the extra 52 IDs. Each Wave C plan's success criterion is simply "remove its prefix group from the allowlist."
- **No plan amendment needed:** the allowlist mechanism is exactly designed to make this visible without blocking CI.

## Self-Check: PASSED

- FOUND: scripts/extract-tc-ids-from-architecture.ts
- FOUND: scripts/generate-tc-manifest.ts
- FOUND: tests/invariants/tc-id-coverage.test.ts
- FOUND: .planning/test-contract/tc-canonical.json (273 entries)
- FOUND: .planning/test-contract/tc-manifest.json (126 entries)
- FOUND: .planning/test-contract/tc-allowlist.json (160 entries)
- FOUND commit: 8f69874 (task 1)
- FOUND commit: b20dd74 (task 2)
- FOUND commit: eb7a0d2 (task 3)
- VERIFIED: `pnpm vitest run tests/invariants/tc-id-coverage.test.ts` → 3/3 passing
