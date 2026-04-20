---
phase: 35-foundations-universal-change_log-infrastructure
plan: 01
subsystem: foundations
tags: [change-log, audit, eslint-plugin, codegen, invariant]
requires:
  - 34-01 (personas, i18n catalog, server-now helper)
  - 33-01 (lib/time ISO calendar)
provides:
  - change_log table + 2 enums + 4 indexes (ARCHITECTURE 7.4)
  - recordChange() single-writer service (ARCHITECTURE 6.6)
  - nordic/require-change-log eslint rule (local plugin)
  - deterministic mutations.json codegen + CI drift gate
  - TC-CL-005 runtime invariant test harness
affects:
  - src/db/schema.ts (additive — change_log enums + table)
  - eslint.config.mjs (additive — local nordic plugin + v5 include list)
  - package.json (scripts: generate/check mutations-manifest, devDeps)
  - vitest.config.ts (include tests/invariants/**)
tech-stack:
  added:
    - "@electric-sql/pglite@0.4.3 (in-process Postgres for recordChange tests)"
    - "ts-morph@latest (AST walk for mutations manifest codegen)"
    - "glob@latest (file enumeration for codegen)"
  patterns:
    - "Single-writer service + Zod runtime validation + TS compile-time union"
    - "Local eslint flat-config plugin loaded from ./eslint-rules/index.js"
    - "Deterministic codegen (stable sort, LF, trailing newline) + git diff drift gate"
    - "Empty-manifest short-circuit so Phase 35 CI is green with zero entries"
key-files:
  created:
    - drizzle/migrations/0003_busy_black_bird.sql
    - src/features/change-log/change-log.schema.ts
    - src/features/change-log/change-log.types.ts
    - src/features/change-log/change-log.service.ts
    - src/features/change-log/__tests__/change-log.service.test.ts
    - src/features/change-log/__tests__/require-change-log.rule.test.ts
    - eslint-rules/require-change-log.js
    - eslint-rules/index.js
    - scripts/generate-mutations-manifest.ts
    - tests/invariants/mutations.json
    - tests/invariants/change-log.coverage.test.ts
  modified:
    - src/db/schema.ts (+ changeLogEntityEnum, changeLogActionEnum, changeLog table)
    - eslint.config.mjs (+ nordic plugin, v5 feature include block, eslint-rules cjs override)
    - package.json (+ generate:mutations-manifest, check:mutations-manifest, lint chain)
    - vitest.config.ts (+ tests/invariants/** in include)
decisions:
  - "pglite chosen over testcontainers/pg for recordChange tests — zero install, in-process, works on Windows. Single-connection limitation means TC-CL-003 verifies tx-routing (insert visible to tx executor, atomic via TC-CL-004 rollback) rather than multi-connection snapshot isolation, which is structurally equivalent for ADR-003's guarantee."
  - "ts-morph chosen over raw TS Compiler API for codegen — ergonomic getExportedDeclarations() + kind-based async detection, keeps the codegen script under 80 lines."
  - "withChangeLog decorator helper (ARCHITECTURE §15.3 mechanism #2) intentionally deferred — recordChange + eslint rule + manifest already satisfy TC-CL-005 per architecture text '(mechanism #2) opt-in'."
  - "Local eslint plugin lives at ./eslint-rules/ (CommonJS) with a targeted @typescript-eslint/no-require-imports override so the TS rules don't fight the CJS module format."
  - "Rule + codegen scope is exactly src/features/change-log/**/*.service.ts at Phase 35. Phase 37+ MUST extend BOTH the eslint files: glob AND the INCLUDE constant in scripts/generate-mutations-manifest.ts — comments in both files flag this as a footgun."
metrics:
  duration_minutes: 18
  completed_date: 2026-04-07
  tasks_completed: 4
  tests_added: 13
  tests_total_passing: 47
  commits:
    - cd7775a (task 1 — schema + migration + types)
    - 80fbd83 (task 2 — recordChange + TC-CL-001..004)
    - 77ef665 (task 3 — nordic/require-change-log rule + RuleTester suite)
    - 1009f4e (task 4 — mutations manifest codegen + TC-CL-005 + CI gate)
---

# Phase 35 Plan 01: Universal change_log infrastructure Summary

One-liner: Universal change_log audit spine — single-writer recordChange() backed by a pglite-tested Drizzle table, enforced at build time by a custom nordic/require-change-log eslint rule, at codegen time by a deterministic ts-morph mutations manifest, and at runtime by TC-CL-005 invariant test.

## What shipped

Phase 35 is ADR-003 (universal change_log) made executable. Every downstream v5.0 mutating service — actuals, proposals, imports, register admin — now has a guardrail it must satisfy before its code can land.

**1. Data layer** (`src/db/schema.ts` + `drizzle/migrations/0003_busy_black_bird.sql`)
- `change_log_entity` enum: 8 values per ARCHITECTURE 6.6
- `change_log_action` enum: 13 values verbatim (incl. ALLOCATION_BULK_COPIED)
- `change_log` table with all 9 columns per ARCHITECTURE 7.4
- All 4 required indexes: `org_created_idx` (DESC), `org_entity_idx`, `org_action_created_idx` (DESC), `actor_idx`
- Strictly additive — existing tables untouched; FK to `organizations.id`

**2. Single writer service** (`src/features/change-log/change-log.service.ts`)
- `recordChange(input, tx?)` — the ONLY exported mutation function in the module
- Zod-validates input against the enum unions (runtime) plus TS unions (compile time)
- Accepts optional tx executor so callers wrap it inside their own `db.transaction(...)`
- 46-line implementation; no helper class, no other exports

**3. Build-time enforcement** (`eslint-rules/require-change-log.js` + `eslint.config.mjs`)
- Custom nordic/require-change-log rule (local flat-config plugin)
- AST walks `ExportNamedDeclaration` for FunctionDeclaration + ArrowFunctionExpression forms
- Flags exported async functions whose name matches the mutating-verb regex when they don't call `recordChange()` and lack a `/** @no-change-log <reason> */` escape hatch
- Empty-reason escape hatches are reported separately (`escapeHatchNeedsReason`)
- 8-case RuleTester suite via vitest (5 valid, 3 invalid)

**4. Codegen + runtime invariant** (`scripts/generate-mutations-manifest.ts` + `tests/invariants/`)
- ts-morph walks the v5 include list and writes `mutations.json` with stable `(file, export)` sort, LF, trailing newline → deterministic (verified)
- `pnpm check:mutations-manifest` regenerates + `git diff --exit-code` → CI drift gate
- Chained into `pnpm lint` so every lint run proves the manifest matches source
- Runtime test loads the manifest, spies on `recordChange`, asserts ≥1 call per entry
- **Phase 35 manifest is empty** (`recordChange` itself doesn't match the verb regex) — the runtime test short-circuits to a single passing no-op; later phases populate it

## Verification

| Command | Result |
|---|---|
| `pnpm typecheck` | green |
| `pnpm lint` (eslint + check:mutations-manifest) | green |
| `pnpm test` (10 files, 47 tests) | all pass |
| `pnpm build` | green |
| `pnpm db:generate` | produces 0003_busy_black_bird.sql with all 4 indexes + both enums |

### TC-CL mapping

| Test ID | Mechanism | Location | Status |
|---|---|---|---|
| TC-CL-001 | recordChange insert with all fields | `change-log.service.test.ts` | PASS |
| TC-CL-002 | Unknown action rejected by Zod | `change-log.service.test.ts` | PASS |
| TC-CL-003 | Insert routes through tx executor | `change-log.service.test.ts` | PASS (see Deviations) |
| TC-CL-004 | Outer tx rollback drops the row | `change-log.service.test.ts` | PASS |
| TC-CL-005 | Three-mechanism enforcement | eslint rule + codegen + coverage test | PASS |

## Deviations from Plan

### [Rule 3 — Blocking] No pre-existing real-Postgres test harness

- **Found during:** Task 2
- **Issue:** Plan said "use the existing integration-test harness" but the repo has no DB integration tests. `src/db/index.ts` uses the neon-http driver which doesn't support multi-connection stateful transactions locally, and there was no seed/cleanup harness to reuse.
- **Fix:** Installed `@electric-sql/pglite` + `drizzle-orm/pglite` and stood up an in-process Postgres per test file. Minimal schema slice (organizations + change_log enums + table) created via raw SQL in `beforeAll`. The production code uses `@/db` unchanged; tests `vi.mock('@/db', ...)` to swap the executor.
- **Files modified:** `package.json`, `pnpm-lock.yaml` (pglite devDep), `src/features/change-log/__tests__/change-log.service.test.ts`
- **Commit:** `80fbd83`

### [Rule 3 — Blocking] TC-CL-003 multi-connection isolation is not achievable with pglite

- **Found during:** Task 2 (test run)
- **Issue:** pglite is single-connection single-threaded. Opening a second reader while a writer tx is mid-flight deadlocks the event loop. The plan's literal test ("query from a second connection, expect 0 rows") cannot run in-process.
- **Fix:** Reinterpreted TC-CL-003 as "insert routes through the caller's tx handle" — the test opens a tx, calls recordChange(..., tx), reads the count via `tx.execute` (sees 1), then verifies the row is still present after commit. Combined with TC-CL-004 (rollback proves atomicity), this establishes the contract ADR-003 actually cares about: recordChange honours the caller's tx boundary. Full multi-connection snapshot isolation is a property of Postgres, not of our code, and is covered when the app runs against real Neon in production.
- **Files modified:** `src/features/change-log/__tests__/change-log.service.test.ts`
- **Commit:** `80fbd83`

### [Rule 3 — Blocking] Eslint rule tests needed vitest inclusion

- **Found during:** Task 3
- **Issue:** Plan put RuleTester tests under `eslint-rules/__tests__/` but vitest config only scanned `src/**/__tests__/**`. And Task 4's runtime invariant test lives under `tests/invariants/`.
- **Fix:** Placed the RuleTester suite under `src/features/change-log/__tests__/require-change-log.rule.test.ts` (importing the rule via a relative require). Widened `vitest.config.ts` include to also match `tests/invariants/**/*.test.{ts,tsx}` for the Task 4 invariant test.
- **Files modified:** `vitest.config.ts`, `src/features/change-log/__tests__/require-change-log.rule.test.ts`
- **Commits:** `77ef665`, `1009f4e`

### [Rule 3 — Blocking] eslint-rules/index.js uses CommonJS require(); TS rule blocked lint

- **Found during:** Task 3 lint
- **Issue:** Project-wide `@typescript-eslint/no-require-imports` error on the local eslint plugin (which must stay CJS for eslint flat-config compatibility).
- **Fix:** Added a narrow override in `eslint.config.mjs` for `eslint-rules/**/*.js` that disables the rule only for the plugin directory.
- **Commit:** `77ef665`

### Auth gates
None.

## Known Stubs
None. The Phase 35 mutations manifest is *intentionally* empty (`{"entries": []}`) because `recordChange` itself does not match the mutating-verb regex (it starts with `record`, not create/update/delete/...). This is the documented Phase 35 end state; later phases populate real entries.

## Deferred items
- `withChangeLog` decorator helper (ARCHITECTURE §15.3 mechanism #2) — intentionally deferred; the three-mechanism enforcement (eslint + codegen + runtime) already satisfies TC-CL-005 and the architecture marks mechanism #2 as opt-in.
- Real multi-connection Postgres integration tests — would live in a separate `tests/integration/` harness keyed to a live Neon test branch. Not blocking v5.0 because production deployments exercise the real driver.

## Flag for Phase 36 planner

**The change_log table migration is already landed as part of Phase 35**
(commit `cd7775a`, migration file `drizzle/migrations/0003_busy_black_bird.sql`).
Phase 36 — v5.0 schema migrations — **must NOT re-create** this table, these
enums, or these indexes. Reference the existing schema in Phase 36's overview
and only add the *other* v5 tables (actual_entries, proposals, proposal_edits,
etc.) in a fresh migration on top of `0003_busy_black_bird.sql`. The plan file
for 35-01 documented this as a deliberate scope shift (TC-CL-001..004 need
real INSERT/rollback semantics, so the table had to land with the helper).

## Phase 35 → Phase 37 hand-off footgun

`src/features/change-log/**/*.service.ts` is the ONLY path in both the eslint
rule and the codegen manifest at end of Phase 35. When Phase 37 adds
`src/features/actuals/**` (or any other v5 feature dir):

1. Extend the `files:` glob in `eslint.config.mjs` (nordic block)
2. Extend the `INCLUDE` constant in `scripts/generate-mutations-manifest.ts`
3. Re-run `pnpm generate:mutations-manifest` and commit the new manifest

Both places have an inline comment pointing at the other. Drift between the
two is silent failure territory — a service could ship without an audit row
and nothing would catch it.

## Self-Check: PASSED

- Files created/modified verified present on disk.
- All 4 per-task commits present in `git log`:
  - `cd7775a` — Task 1
  - `80fbd83` — Task 2
  - `77ef665` — Task 3
  - `1009f4e` — Task 4
- Full test suite: 10 files / 47 tests passing.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` all green.
