---
phase: 35-foundations-universal-change_log-infrastructure
verified: 2026-04-07T18:00:00Z
status: gaps_found
score: 3/4 must-haves verified
re_verification: false
gaps:
  - truth: "scripts/generate-mutations-manifest.ts regenerates tests/invariants/mutations.json deterministically; CI fails when the committed manifest is stale"
    status: failed
    reason: "The codegen script exists and is correct, but the package.json scripts generate:mutations-manifest and check:mutations-manifest were never added. The lint script does not chain check:mutations-manifest. Commit 1009f4e message claimed these scripts landed but the actual diff for package.json only adds two devDependencies (glob, ts-morph). CI drift gate is inoperable — running `pnpm check:mutations-manifest` fails with 'script not found'."
    artifacts:
      - path: "package.json"
        issue: "Missing scripts: generate:mutations-manifest, check:mutations-manifest. lint script is 'eslint .' with no manifest check chained."
      - path: "scripts/generate-mutations-manifest.ts"
        issue: "File exists and is correct; the gap is the missing npm script entry points."
    missing:
      - "Add `\"generate:mutations-manifest\": \"tsx scripts/generate-mutations-manifest.ts\"` to package.json scripts"
      - "Add `\"check:mutations-manifest\": \"tsx scripts/generate-mutations-manifest.ts && git diff --exit-code tests/invariants/mutations.json\"` to package.json scripts"
      - "Chain check:mutations-manifest into the lint script: `\"lint\": \"eslint . && pnpm check:mutations-manifest\"`"
human_verification:
  - test: "Run pnpm test and confirm all 47 tests (10 files) pass including TC-CL-001..005 and the RuleTester suite"
    expected: "All 47 tests pass with no failures"
    why_human: "Cannot execute pnpm test in this verification context"
  - test: "Run pnpm lint and observe whether any change-log service files are flagged"
    expected: "eslint passes; no nordic/require-change-log violations"
    why_human: "Cannot run eslint interactively"
---

# Phase 35: Foundations — Universal change_log Infrastructure Verification Report

**Phase Goal:** Stand up the `change_log` table, `recordChange` helper, and the three-mechanism enforcement (eslint rule + codegen manifest + runtime test) that guarantees every mutating service writes an audit row.
**Verified:** 2026-04-07
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `recordChange()` inserts an audit row inside the caller's transaction and rolls back with it (TC-CL-001..004) | VERIFIED | `change-log.service.ts` 46-line implementation with pglite-backed tests; TC-CL-001 insert, TC-CL-002 Zod rejection, TC-CL-003 tx routing, TC-CL-004 rollback all present in `change-log.service.test.ts` |
| 2 | Eslint rule `nordic/require-change-log` AST-walks `features/**/*.service.ts` and fails CI if any mutating function omits `recordChange` without an `@no-change-log` escape hatch | VERIFIED | Rule implemented in `eslint-rules/require-change-log.js`; plugin wired in `eslint.config.mjs` under files `src/features/change-log/**/*.service.ts`; 8-case RuleTester suite in `require-change-log.rule.test.ts` (5 valid, 3 invalid) |
| 3 | `scripts/generate-mutations-manifest.ts` regenerates `tests/invariants/mutations.json` deterministically; CI fails when the committed manifest is stale | FAILED | Codegen script exists and is correct; `mutations.json` exists (empty `{"entries": []}`). However `generate:mutations-manifest` and `check:mutations-manifest` npm scripts are absent from `package.json`. The `lint` script is `"eslint ."` only — no manifest drift gate is chained. The CI gate is inoperable. |
| 4 | Runtime invariant test calls every entry in the manifest and asserts ≥1 `recordChange` call (TC-CL-005) | VERIFIED | `tests/invariants/change-log.coverage.test.ts` exists; loads manifest, spies on `recordChange`, asserts ≥1 call per entry. Empty-manifest short-circuit for Phase 35 documented and intentional. `vitest.config.ts` includes `tests/invariants/**/*.test.{ts,tsx}`. |

**Score:** 3/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `drizzle/migrations/0003_busy_black_bird.sql` | change_log table + 2 enums + 4 indexes | VERIFIED | Both enums (8 + 13 values), table with 9 columns, 4 indexes (`org_created_idx` DESC, `org_entity_idx`, `org_action_created_idx` DESC, `actor_idx`), FK to `organizations.id` |
| `src/features/change-log/change-log.schema.ts` | Re-export schema symbols | VERIFIED | Exists; re-exports `changeLog`, `changeLogActionEnum`, `changeLogEntityEnum` from `@/db/schema` |
| `src/features/change-log/change-log.types.ts` | Type definitions | VERIFIED | Exists |
| `src/features/change-log/change-log.service.ts` | `recordChange()` single-writer | VERIFIED | 46 lines, Zod validation, optional tx executor, single exported mutation function |
| `src/features/change-log/__tests__/change-log.service.test.ts` | TC-CL-001..004 | VERIFIED | All 4 test cases present and substantive; pglite in-process Postgres |
| `src/features/change-log/__tests__/require-change-log.rule.test.ts` | RuleTester suite | VERIFIED | 8 cases (5 valid, 3 invalid); wired into vitest via src/ include path |
| `eslint-rules/require-change-log.js` | ESLint rule implementation | VERIFIED | AST walker for ExportNamedDeclaration, mutating-verb regex, escape hatch detection with reason check |
| `eslint-rules/index.js` | Local plugin entry point | VERIFIED | Exports `nordic` plugin with `require-change-log` rule |
| `scripts/generate-mutations-manifest.ts` | Codegen script | VERIFIED | ts-morph AST walk, stable sort, LF + trailing newline, INCLUDE constant |
| `tests/invariants/mutations.json` | Manifest file | VERIFIED | Exists; `{"entries": []}` — intentionally empty at Phase 35 |
| `tests/invariants/change-log.coverage.test.ts` | TC-CL-005 runtime invariant | VERIFIED | Loads manifest, dynamic import, recordChange spy, empty-manifest short-circuit |
| `src/db/schema.ts` | changeLog table + enums added | VERIFIED | `changeLogEntityEnum` (8 values), `changeLogActionEnum` (13 values), `changeLog` table with all 4 indexes |
| `eslint.config.mjs` | nordic plugin + v5 include block | VERIFIED | Plugin imported, `files: ['src/features/change-log/**/*.service.ts']`, CJS override for eslint-rules/ |
| `package.json` scripts: `generate:mutations-manifest`, `check:mutations-manifest` | CI drift gate | MISSING | Only `glob` and `ts-morph` devDeps were added in commit 1009f4e; scripts section was not updated |
| `vitest.config.ts` | `tests/invariants/**` include | VERIFIED | Line 11: `'tests/invariants/**/*.test.{ts,tsx}'` present in include array |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `change-log.service.ts` | `@/db` | `db.insert` / `tx.insert` | WIRED | Imports `db` from `@/db`; uses `(tx ?? db).insert(changeLog)` |
| `eslint.config.mjs` | `eslint-rules/index.js` | `import nordic` | WIRED | Line 4 import confirmed; plugin registered under `plugins: { nordic }` |
| `eslint.config.mjs` | `src/features/change-log/**/*.service.ts` | `files:` glob | WIRED | Scope matches exactly the single service file present in Phase 35 |
| `tests/invariants/change-log.coverage.test.ts` | `tests/invariants/mutations.json` | `readFileSync` | WIRED | Reads manifest at runtime; path `resolve(process.cwd(), 'tests/invariants/mutations.json')` |
| `tests/invariants/change-log.coverage.test.ts` | `change-log.service.ts` | `vi.spyOn(changeLogService, 'recordChange')` | WIRED | Dynamic import + spy confirmed |
| `package.json` lint | `check:mutations-manifest` | chain | NOT WIRED | Script `check:mutations-manifest` does not exist; lint script is `"eslint ."` only |
| `scripts/generate-mutations-manifest.ts` | `package.json` | `pnpm generate:mutations-manifest` | NOT WIRED | No `generate:mutations-manifest` script entry in package.json |

---

### Data-Flow Trace (Level 4)

Not applicable. Phase 35 delivers infrastructure (schema, service, tooling) — no dynamic-data-rendering components.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `recordChange` module exports the function | `grep -n "^export async function recordChange" src/features/change-log/change-log.service.ts` | Line 25 match | PASS |
| mutations.json is valid JSON with `entries` array | File content: `{"entries": []}` | Valid, array length 0 | PASS |
| TC-CL-005 test file includes empty-manifest short-circuit | `grep -n "manifest is empty at Phase 35" tests/invariants/change-log.coverage.test.ts` | Line 29 match | PASS |
| `generate:mutations-manifest` npm script exists | `grep "generate:mutations-manifest" package.json` | No match | FAIL |
| `check:mutations-manifest` npm script exists | `grep "check:mutations-manifest" package.json` | No match | FAIL |
| lint chains check:mutations-manifest | `grep -A1 '"lint"' package.json` | `"lint": "eslint ."` — no chain | FAIL |
| All 4 phase commits exist in git log | `git log --oneline cd7775a 80fbd83 77ef665 1009f4e` | All 4 found | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FOUND-V5-04 | 35-01-PLAN.md | Universal `change_log` table + `recordChange()` service + eslint rule + codegen manifest + TC-CL-005 | PARTIAL | Table, service, eslint rule, codegen script, and runtime test are all present and substantive. The CI drift gate (npm scripts + lint chain) for the codegen manifest is not wired in `package.json`, making enforcement mechanism (b) incomplete. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `package.json` | scripts section | Missing `generate:mutations-manifest` and `check:mutations-manifest` entries | Blocker | The codegen CI drift gate (Success Criterion 3) is inoperable. `pnpm check:mutations-manifest` fails with "script not found". The `pnpm lint` script does not invoke the manifest check. Developers can commit a stale `mutations.json` with no CI signal. |

No other anti-patterns found. No TODO/FIXME/placeholder comments in phase files. `recordChange` is the sole exported mutation. `mutations.json` is intentionally empty and documented as such.

---

### Human Verification Required

#### 1. Full Test Suite Pass

**Test:** Run `pnpm test` in project root.
**Expected:** 10 test files, 47 tests all passing, including TC-CL-001..004 in `change-log.service.test.ts`, 8 RuleTester cases in `require-change-log.rule.test.ts`, and TC-CL-005 no-op in `change-log.coverage.test.ts`.
**Why human:** Cannot execute pnpm in this verification context.

#### 2. Lint Pass Against Service File

**Test:** Run `pnpm lint` and confirm the single `change-log.service.ts` passes `nordic/require-change-log` (the `recordChange` function itself starts with `record`, not a mutating verb, so the rule should not flag it).
**Expected:** No `nordic/require-change-log` violations; zero lint errors related to the CJS override for `eslint-rules/`.
**Why human:** Cannot run eslint interactively.

---

### Gaps Summary

**One gap blocks full goal achievement.** The codegen manifest is the third enforcement mechanism of ADR-003 (eslint rule + codegen manifest + runtime test). The codegen script (`scripts/generate-mutations-manifest.ts`) and the output file (`tests/invariants/mutations.json`) exist and are correct. However, the two npm scripts that make the drift gate runnable — `generate:mutations-manifest` and `check:mutations-manifest` — were never added to `package.json`. The `lint` script therefore cannot chain the manifest check.

**Root cause:** Commit `1009f4e` message explicitly states "package.json gains generate:mutations-manifest + check:mutations-manifest; the latter is chained into the lint script" but the actual diff for `package.json` in that commit only adds two devDependency entries (`glob`, `ts-morph`). The scripts block change was omitted from the commit.

**Scope of fix:** Narrow — three lines in `package.json` (two new script entries, one updated `lint` value). All other deliverables are complete and correct.

**No impact on downstream phases until Phase 37** adds real mutating services to the include list. The eslint rule and TC-CL-005 runtime invariant work correctly. The missing piece only matters when a developer tries to run `pnpm check:mutations-manifest` or relies on `pnpm lint` catching a stale manifest.

---

_Verified: 2026-04-07T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
