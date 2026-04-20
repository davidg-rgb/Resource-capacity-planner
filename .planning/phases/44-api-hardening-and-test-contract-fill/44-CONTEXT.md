# Phase 44 — API hardening + test contract fill — CONTEXT

**Phase:** 44
**Name:** API hardening + test contract fill
**Mode:** auto (recommended defaults, no interactive discussion)
**Created:** 2026-04-09

## Domain boundary

Make the v5.0 API bulletproof before launch:

1. Every `/api/v5/*` endpoint returns the `AppError` hierarchy with the documented
   error codes (`HISTORIC_CONFIRM_REQUIRED`, `BAD_HOURS`, `PROPOSAL_NOT_ACTIVE`,
   `REASON_REQUIRED`, `BATCH_ALREADY_ROLLED_BACK`, `ROLLBACK_WINDOW_EXPIRED`,
   `DEPENDENT_ROWS_EXIST`, `ERR_US_WEEK_HEADERS`).
2. Every mutating endpoint goes through `withTenant()`; cross-tenant reads 404.
3. All ~280 TC-* assertions in ARCHITECTURE.md §15 map 1:1 to named, passing
   tests in CI.
4. Deterministic UUID v5 seed (§16) produces identical fixtures across runs.
5. Repair the deferred TC-CL-005 change-log runtime invariant harness
   (see `.planning/phases/43-admin-register-maintenance/deferred-items.md`).

Out of scope: new API endpoints, new business logic, UI changes, the PDF export
launch gate (Phase 45).

## Carrying forward from prior phases

- `AppError` hierarchy already exists at `src/lib/errors.ts` — extend, don't
  replace. `api-utils.ts` already has `handleApiError()` converting to responses.
- `withTenant()` ORM wrapper already exists and is used across v5.0 services.
  Phase 44 verifies coverage; it does not invent the mechanism.
- Invariant tests live in `tests/invariants/`. Two styles already established:
  **static** (scanning source for a contract) and **runtime** (importing services
  under a stubbed `@/db`).
- PGlite is the integration-test database of record across v5.0 phases.
- TC-CL-005 runtime harness failure root cause is pre-diagnosed: the `@/db` stub
  in `tests/invariants/change-log.coverage.test.ts` is missing a `transaction(fn)`
  method, so services written against `db.transaction(...)` throw before
  `recordChange` is ever observed.
- Phase 43-04 shipped a complementary static `mutations-manifest.test.ts` that
  asserts the register mutations are present in the manifest — this stays as the
  second layer next to the repaired runtime harness.

## Decisions (locked)

### 1. TC-ID ↔ test traceability — **hybrid: naming convention + generated manifest**

- Every automated test that covers a §15 assertion MUST include the TC-ID as the
  first token of its `it()` / `test()` title, e.g.
  `it('TC-CAL-001 week numbers use ISO 8601', ...)`.
- A generator script walks the test tree, extracts every `TC-XXX-NNN` token from
  test titles, and writes `.planning/test-contract/tc-manifest.json`
  (`{ "TC-CAL-001": { file, testName, status } }`).
- A CI check diffs the generated manifest against the canonical TC-ID list
  extracted from `ARCHITECTURE.md §15`. Missing TC-IDs fail the build.
- Why hybrid: naming convention is greppable by humans; the manifest is
  tooling-verifiable and gives a single source-of-truth for coverage reporting
  and DoD claims.

### 2. Test tier split — **PGlite integration first, thin Playwright for E2E only**

- TC-E2E-* → Playwright (full stack, browser).
- TC-API-*, TC-NEG-*, TC-REG-*, TC-CL-*, TC-CP-*, TC-AR-*, TC-AC-*, TC-PS-*,
  TC-PR-*, TC-IMP-*, TC-EX-*, TC-PSN-*, TC-ZOOM-* → Vitest + PGlite integration.
- TC-CAL-*, TC-DB-*, TC-PERF-*, pure-function UI helpers → Vitest unit.
- TC-UI-* → Vitest + React Testing Library (component), no browser.
- Rationale: PGlite matches existing v5.0 invariants infra, keeps CI under the
  flakiness budget, and reserves Playwright for the handful of TC-E2E-* flows
  where browser reality matters.

### 3. AppError taxonomy enforcement — **one-time sweep + ESLint guard**

- Sweep every file under `app/api/v5/**` and every service it imports; replace
  any `throw new Error(...)` / raw `Response.json({error: ...})` with the
  matching `AppError` subclass.
- Add all 8 documented error codes to `src/lib/errors.ts` as named subclasses if
  not already present, with stable `code` constants exported from a single
  barrel (`src/lib/errors/codes.ts`).
- Add an ESLint rule (`no-restricted-syntax`) blocking `ThrowStatement[argument.callee.name='Error']`
  inside `app/api/v5/**` and `src/features/**/*.service.ts`. Error message points
  to `src/lib/errors.ts`.
- TC-NEG-* tests assert the wire format (HTTP status + `code` field) for each
  documented error code. They lock in what the sweep + guard produce.

### 4. Tenant isolation coverage — **static audit + one parameterized runtime test**

- Static audit script (`tests/invariants/tenant-isolation.static.test.ts`) scans
  every route file under `app/api/v5/**` for mutating verbs (`POST`, `PUT`,
  `PATCH`, `DELETE`) and asserts the handler body references `withTenant(`.
  Route files that legitimately need an exception declare it in a manifest
  (`tests/invariants/tenant-exceptions.json`) with a reason string.
- One parameterized runtime test (`tests/invariants/tenant-isolation.runtime.test.ts`)
  iterates the mutating-route manifest and fires a cross-tenant request against
  PGlite, asserting a 404 response. This catches cases where `withTenant()` is
  called but the scoping is wrong.
- Both layers together satisfy TC-API tenant-isolation assertions and
  API-V5-02.

### 5. TC-CL-005 runtime harness repair — **minimal stub expansion**

- Extend the `@/db` mock in `tests/invariants/change-log.coverage.test.ts` to
  include `transaction: (fn) => fn(stubTx)` where `stubTx` is the same stub
  shape used for top-level calls.
- Do NOT migrate the runtime invariant to PGlite — the cost is disproportionate
  when the pre-existing static `mutations-manifest.test.ts` already covers the
  "was the mutation registered?" question.
- After the stub fix, all 6 listed mutations (actuals upsert, register
  create/update/archive, import commit/rollback) should exercise `recordChange`
  at least once under the runtime invariant.

### 6. Execution order — **harden first, then lock in with tests**

- Wave A: AppError sweep + ESLint guard + tenant isolation audit/manifest
  (changes code; tests come next).
- Wave B: TC-NEG-* tests (error code wire format) + TC-API tenant-isolation
  runtime test — these lock in Wave A.
- Wave C: TC-ID ↔ test manifest generator + CI diff check + fill all remaining
  TC-* gaps category-by-category (TC-CAL, TC-DB, TC-CL, TC-PS, TC-PR, TC-AC,
  TC-AR, TC-CP, TC-IMP, TC-EX, TC-PSN, TC-UI, TC-ZOOM, TC-REG, TC-E2E, TC-PERF).
- Wave D: Deterministic UUID v5 seed harness (§16) + TC-CL-005 runtime harness
  repair + final green-CI gate.
- Rationale: hardening first minimizes rework in the test bodies. Tests written
  against the hardened code can assert the final contract directly instead of
  being rewritten after the sweep.

## Decisions (Claude's discretion)

None — all 6 identified gray areas are locked above.

## Deterministic UUID v5 seed (TEST-V5-02)

- Seed generator lives at `tests/fixtures/seed.ts`, exported as
  `buildSeed(namespace: string = FIXTURE_NS): SeedBundle`.
- `FIXTURE_NS` is a frozen UUID v5 namespace constant checked into the repo.
- All integration tests that need fixtures import `buildSeed()` at
  `beforeAll` time. No test generates its own random UUIDs.
- A dedicated test (`tests/fixtures/seed.deterministic.test.ts`) runs the
  generator twice and asserts byte-for-byte identical output. This is the
  TEST-V5-02 assertion.

## Canonical refs

Mandatory reads for researcher + planner:

- `.planning/v5.0-ARCHITECTURE.md` — §15 (full TC-* assertion list), §16 (UUID
  v5 seed spec)
- `.planning/REQUIREMENTS.md` — API-V5-01, API-V5-02, TEST-V5-01, TEST-V5-02
- `.planning/ROADMAP.md` — Phase 44 entry (lines 234+)
- `.planning/STATE.md` — current position and milestone status
- `.planning/phases/43-admin-register-maintenance/deferred-items.md` — TC-CL-005
  runtime harness diagnosis
- `src/lib/errors.ts` — current AppError hierarchy (extend, don't replace)
- `src/lib/api-utils.ts` — `handleApiError()` converter
- `tests/invariants/` — existing static + runtime invariant patterns
- `tests/invariants/change-log.coverage.test.ts` — file that needs the TC-CL-005
  stub fix
- `tests/invariants/mutations.json` — the mutation list the runtime harness
  iterates
- `src/features/change-log/__tests__/mutations-manifest.test.ts` — the static
  sibling that already passes
- `app/api/v5/**` — every route file (sweep target)

## Deferred ideas (not in scope)

- Automated OpenAPI / Zod schema generation for `/api/v5/*` — nice, but not in
  the phase goal. Roadmap backlog.
- Migrating the entire invariants suite from stubs to PGlite — too large and
  unrelated to the phase goal.
- Contract testing against a frozen API snapshot (Pact-style) — future work.
- Fuzz / property-based tests for the error wire format — future work.

## Success criteria (copied from ROADMAP.md — do not alter)

1. All ~280 §15 assertions map 1:1 to passing automated tests in CI.
2. Every `/api/v5/*` endpoint returns the AppError hierarchy with the documented
   error codes, verified by TC-NEG-*.
3. Every mutating endpoint goes through `withTenant()`; cross-tenant read
   attempt returns 404.
4. Deterministic UUID v5 seed produces identical fixtures across test runs.

## Next step

Run `/gsd:plan-phase 44-api-hardening-and-test-contract-fill` to produce the
phase plan. Researcher + planner will read this CONTEXT.md first and should not
re-ask any of the locked decisions above.
