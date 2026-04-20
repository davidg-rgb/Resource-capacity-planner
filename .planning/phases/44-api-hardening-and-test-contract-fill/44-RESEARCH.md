# Phase 44: API hardening + test contract fill — Research

**Researched:** 2026-04-09
**Domain:** API error taxonomy, tenant isolation static audit, TC-ID test manifest, deterministic UUID v5 fixtures
**Confidence:** HIGH (all findings grounded directly in the repo)

## Summary

Phase 44 is 100% a hardening/test-coverage phase against the locked v5.0
contract in `.planning/v5.0-ARCHITECTURE.md` §15. All six gray areas are
already locked in CONTEXT.md — the researcher's job is to ground-truth those
decisions against the codebase and surface the concrete inputs (file paths,
counts, and drift) the planner needs.

**Primary recommendation:** treat Wave A as non-trivial. Two CONTEXT
assumptions require correction:

1. **`withTenant()` is NOT wired into any `/api/v5/*` route handler.** The
   helper exists at `src/lib/tenant.ts` but is only used by legacy
   `src/features/{people,projects,...}/*.service.ts` files. Every v5.0 API
   route currently enforces tenancy by passing `orgId` (from `requireRole()`)
   into feature services that build their own `eq(...organizationId, orgId)`
   clauses manually. A static audit that greps for `withTenant(` in
   `app/api/v5/**` will report **0 matches / 17 files**, i.e. 100% failure.
   The planner must decide: (a) extend the audit to also accept
   `requireRole()` + explicit `orgId` threading as a second allowed pattern,
   or (b) actually refactor handlers to import and call `withTenant()`. The
   CONTEXT says "verify coverage; it does not invent the mechanism" — option
   (a) matches that constraint better.
2. **Only 1 of the 8 documented error codes is currently present** in
   `src/lib/errors.ts` (`PROPOSAL_NOT_ACTIVE`). The AppError sweep in Wave A
   will add 7 new subclasses plus a `src/lib/errors/codes.ts` barrel.

Everything else in CONTEXT lines up cleanly with the codebase.

## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **TC-ID ↔ test traceability — hybrid: naming convention + generated manifest.**
   Every test covering a §15 assertion MUST include the TC-ID as the first
   token of its `it()` / `test()` title. A generator script walks the test
   tree, extracts every `TC-XXX-NNN` token, writes
   `.planning/test-contract/tc-manifest.json`. A CI check diffs the manifest
   against the canonical TC-ID list extracted from ARCHITECTURE.md §15.
   Missing TC-IDs fail the build.
2. **Test tier split — PGlite integration first, thin Playwright for E2E only.**
   - Playwright: TC-E2E-*
   - Vitest + PGlite: TC-API-*, TC-NEG-*, TC-REG-*, TC-CL-*, TC-CP-*, TC-AR-*,
     TC-AC-*, TC-PS-*, TC-PR-*, TC-IMP-*, TC-EX-*, TC-PSN-*, TC-ZOOM-*
   - Vitest unit: TC-CAL-*, TC-DB-*, TC-PERF-*, pure-function UI helpers
   - Vitest + React Testing Library: TC-UI-*
3. **AppError taxonomy enforcement — one-time sweep + ESLint guard.** Sweep
   `app/api/v5/**` and imported services; replace raw throws / Response.json
   error shapes with AppError subclasses. Add all 8 codes to
   `src/lib/errors.ts` as named subclasses with constants exported from
   `src/lib/errors/codes.ts`. Add an ESLint `no-restricted-syntax` rule
   blocking `ThrowStatement[argument.callee.name='Error']` inside
   `app/api/v5/**` and `src/features/**/*.service.ts`. TC-NEG-* tests assert
   wire format.
4. **Tenant isolation coverage — static audit + one parameterized runtime test.**
   Static audit (`tests/invariants/tenant-isolation.static.test.ts`) scans
   every route file under `app/api/v5/**` for mutating verbs and asserts the
   handler body references `withTenant(` (**see risk R1 — handlers don't
   currently call it; spec must accept either `withTenant(` or
   `requireRole(...).orgId` threaded to a service**). Exceptions live in
   `tests/invariants/tenant-exceptions.json` with a reason string. One
   parameterized runtime test (`tests/invariants/tenant-isolation.runtime.test.ts`)
   iterates the mutating-route manifest and fires a cross-tenant request
   against PGlite, asserting 404.
5. **TC-CL-005 runtime harness repair — minimal stub expansion.** Extend the
   `@/db` mock in `tests/invariants/change-log.coverage.test.ts` to include
   `transaction: (fn) => fn(stubTx)`. Do NOT migrate to PGlite. After the
   stub fix, all 6 mutations in `tests/invariants/mutations.json` should
   exercise `recordChange` ≥1 time.
6. **Execution order — harden first, then lock in with tests.**
   - Wave A: AppError sweep + ESLint guard + tenant isolation audit/manifest
   - Wave B: TC-NEG-* tests + TC-API tenant-isolation runtime test
   - Wave C: TC-ID ↔ test manifest generator + CI diff check + fill all
     remaining TC-* gaps category-by-category
   - Wave D: Deterministic UUID v5 seed harness + TC-CL-005 runtime harness
     repair + final green-CI gate

### Claude's Discretion

None — all 6 identified gray areas are locked above.

### Deferred Ideas (OUT OF SCOPE)

- Automated OpenAPI / Zod schema generation for `/api/v5/*`
- Migrating the entire invariants suite from stubs to PGlite
- Contract testing against a frozen API snapshot (Pact-style)
- Fuzz / property-based tests for the error wire format
- New API endpoints, new business logic, UI changes
- PDF export launch gate (Phase 45)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| API-V5-01 | All `/api/v5/*` endpoints return AppError hierarchy with consistent error codes | Error-code gap analysis below (1 of 8 present); AppError base class at `src/lib/errors.ts` is already correct shape, only missing subclasses/codes; `handleApiError()` already wires JSON shape and status code. |
| API-V5-02 | Every mutating endpoint tenant-scoped via `withTenant()`; no cross-tenant reads | Route inventory below; static audit script spec in Locked Decision #4; risk R1 about the missing `withTenant(` call-sites at handler layer. |
| TEST-V5-01 | ~280 §15 assertions map 1:1 to automated tests in CI | Full TC-ID inventory below (230 unique IDs, 122 currently in tests → **108 gap**); manifest generator spec in Locked Decision #1. |
| TEST-V5-02 | Deterministic UUID v5 seed produces identical fixtures across runs | §16 UUID v5 spec documented below; `tests/fixtures/` directory does NOT currently exist — Wave D creates it from scratch; seed-deterministic test also new. |

## Standard Stack

Nothing new to install for the core phase work. Everything needed is already
in `package.json`:

| Tool | Version | Role |
|------|---------|------|
| `vitest` | ^2.1.9 | Test runner (unit + integration) |
| `eslint` + flat config | `eslint.config.mjs` | Hosts the new `no-restricted-syntax` guard |
| `uuid` | existing transitive or add as direct dep if missing | `v5()` for deterministic fixtures (§16 calls this out explicitly) |
| PGlite | existing in integration tests | In-process Postgres for TC-API-* / TC-NEG-* runtime tests |
| Drizzle ORM | existing | Query layer; `withTenant()` already wraps it |
| Next.js | 15.x App Router | `app/api/v5/**/route.ts` file convention |
| `zod` | existing | Already used in every v5 route for body parsing |

**Check before Wave D:** run `pnpm ls uuid` — if not a direct dep, add it in
the Wave D plan as `pnpm add uuid && pnpm add -D @types/uuid`. §16 requires
the standard npm `uuid` package's `v5` export; do NOT hand-roll SHA1.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Naming-convention + manifest generator | Pact / Dredd / OpenAPI contract test | Locked out by CONTEXT; heavier infra |
| PGlite runtime test per mutating route | Playwright full-stack | CONTEXT reserves Playwright for TC-E2E-* only |
| `no-restricted-syntax` AST selector | Custom eslint-rules plugin entry | Existing `eslint-rules/` plugin at repo root could host this, but `no-restricted-syntax` is zero-code and already used in this file for `getDay()` — use the built-in |

## Architecture Patterns

### Recommended File Layout

```
src/lib/errors.ts                                   # existing — add 7 subclasses
src/lib/errors/codes.ts                             # NEW — barrel of 8 string constants
src/lib/api-utils.ts                                # existing — handleApiError unchanged (already AppError-aware)
tests/invariants/
├── change-log.coverage.test.ts                     # existing — apply TC-CL-005 stub fix
├── mutations.json                                  # existing — no change
├── tenant-isolation.static.test.ts                 # NEW — scans src/app/api/v5/**
├── tenant-isolation.runtime.test.ts                # NEW — PGlite cross-tenant prober
├── tenant-exceptions.json                          # NEW — {"routes": [{"file": "...", "reason": "..."}]}
├── error-taxonomy.static.test.ts                   # NEW — forbids `throw new Error` in v5 routes/services (complements ESLint rule as second layer)
└── tc-id-coverage.test.ts                          # NEW — diff manifest vs ARCHITECTURE.md §15
tests/fixtures/
├── seed.ts                                         # NEW — buildSeed(namespace)
├── seed.deterministic.test.ts                      # NEW — TEST-V5-02
└── namespace.ts                                    # NEW — frozen FIXTURE_NS UUID
scripts/generate-tc-manifest.ts                     # NEW — walks test tree, extracts TC-IDs
scripts/extract-tc-ids-from-architecture.ts         # NEW — greps §15 for canonical list
.planning/test-contract/tc-manifest.json            # NEW — generator output, committed
eslint.config.mjs                                   # existing — add no-restricted-syntax block for app/api/v5/** and src/features/**/*.service.ts
```

### Pattern 1: Route handler → service, already tenant-threaded

Every v5 route already follows this shape (verified in
`src/app/api/v5/proposals/route.ts`):

```typescript
// Source: src/app/api/v5/proposals/route.ts lines 29-48
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireRole('planner');
    const body = createBodySchema.parse(await request.json());
    const result = await createProposal({ orgId, ... });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

Services internally build `eq(..., organizationId, orgId)` clauses. This
means the static tenant audit in Wave A has two valid patterns to accept:

- **Pattern A (preferred future):** handler imports `withTenant(orgId)` and
  uses its methods directly.
- **Pattern B (current reality):** handler calls `requireRole()` to get
  `orgId`, then passes it as an argument to a service function that is
  responsible for scoping.

The audit script should grep for EITHER `withTenant(` OR the pair
`requireRole(` AND `orgId` in the handler file. Exceptions go in
`tenant-exceptions.json`.

### Pattern 2: handleApiError already works

`src/lib/api-utils.ts` already converts `AppError` → JSON with
`{ error: code, message, ...(details && { details }) }` and uses
`error.statusCode`. ZodError is also converted to a `ValidationError`. The
AppError sweep therefore only needs to replace raw `throw new Error(...)` /
`NextResponse.json({error: ...})` inside handlers and services — the
`handleApiError` wire-format is already correct and TC-INV-003 compliant.

### Anti-Patterns to Avoid

- **Don't rewrite `AppError.toJSON()` shape.** TC-INV-003 asserts
  `{ error: { code, message, details? } }` but current code emits
  `{ error: code, message, details? }` (flat). **RISK R4**: This contradicts
  the TC-INV-003 text in ARCHITECTURE.md §15.15. Planner must resolve: either
  (a) change `toJSON()` to nest under `error` and update every test that
  currently asserts the flat shape, or (b) accept the flat shape as the
  canonical contract and document the TC-INV-003 deviation. Recommend (b) —
  the current shape is already shipped and all existing contract tests
  (`capacity.contract.test.ts`, `change-log.contract.test.ts`) assert the
  flat shape.
- **Don't migrate change-log runtime invariant to PGlite.** Locked out.
- **Don't weaken the ESLint `no-restricted-syntax` selector** — it must use
  `ThrowStatement[argument.type='NewExpression'][argument.callee.name='Error']`
  to match `throw new Error(...)` specifically.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deterministic UUIDs | Custom SHA1 hashing | `uuid` npm package's `v5()` export | §16 explicitly says "do NOT hand-roll SHA1 truncation" |
| TC-ID extraction from titles | Regex on AST | Plain `/^TC-[A-Z]+-\d+[a-z]?/` regex against title strings | Titles are ordered-first-token by convention; regex is sufficient |
| Cross-tenant HTTP probing | Raw `fetch` to a booted server | Reuse existing PGlite bootstrap pattern from `tests/invariants` + Next.js route-handler direct invocation | PGlite is already integrated; don't spin up HTTP |
| Error-code constants | Scatter magic strings | `src/lib/errors/codes.ts` barrel export | Single source; both route code and tests import from the same module |

## Current AppError Gap Analysis

**File:** `src/lib/errors.ts` (92 lines, read in full)

| Required code (per CONTEXT) | Present? | Location / action |
|---|---|---|
| `HISTORIC_CONFIRM_REQUIRED` | ❌ | Add `HistoricConfirmRequiredError` subclass (409) |
| `BAD_HOURS` | ❌ | Add `BadHoursError` subclass (400) |
| `PROPOSAL_NOT_ACTIVE` | ✅ | `ProposalNotActiveError` at lines 71-85, code `PROPOSAL_NOT_ACTIVE` (409) — already present |
| `REASON_REQUIRED` | ❌ | Add `ReasonRequiredError` subclass (400) |
| `BATCH_ALREADY_ROLLED_BACK` | ❌ | Add `BatchAlreadyRolledBackError` subclass (409) |
| `ROLLBACK_WINDOW_EXPIRED` | ❌ | Add `RollbackWindowExpiredError` subclass (409) |
| `DEPENDENT_ROWS_EXIST` | ❌ | Add `DependentRowsExistError` subclass (409) |
| `ERR_US_WEEK_HEADERS` | ❌ | Already used as a ValidationError code string in §15.19 TC-IMP-006 / IMP-02; add as a named `UsWeekHeadersError` subclass for consistency (400) |

**Additional existing codes** (preserve, don't touch):
`ERR_HOLIDAY_YEAR_OUT_OF_RANGE`, `ERR_VALIDATION`, `ERR_AUTH`, `ERR_FORBIDDEN`,
`ERR_NOT_FOUND`, `ERR_CONFLICT`, `ERR_PAYLOAD_TOO_LARGE`, `ERR_INTERNAL`.

**Wire format verification (`src/lib/api-utils.ts` lines 10-30):**

```
{ error: "<CODE>", message: "<msg>", details?: {...} }
```

HTTP status from `error.statusCode`. Unknown errors → 500 with
`{ error: "ERR_INTERNAL", message: "Internal server error" }`. ZodError →
wrapped to ValidationError with 400.

## /api/v5/* Route Inventory

**17 route files** found under `src/app/api/v5/`:

| # | Route file | Verbs (inferred from filename/path) |
|---|---|---|
| 1 | `src/app/api/v5/proposals/route.ts` | POST, GET |
| 2 | `src/app/api/v5/proposals/[id]/approve/route.ts` | POST |
| 3 | `src/app/api/v5/proposals/[id]/reject/route.ts` | POST |
| 4 | `src/app/api/v5/proposals/[id]/resubmit/route.ts` | POST |
| 5 | `src/app/api/v5/proposals/[id]/withdraw/route.ts` | POST |
| 6 | `src/app/api/v5/proposals/[id]/impact/route.ts` | GET |
| 7 | `src/app/api/v5/imports/parse/route.ts` | POST |
| 8 | `src/app/api/v5/imports/[sessionId]/preview/route.ts` | GET |
| 9 | `src/app/api/v5/imports/[sessionId]/commit/route.ts` | POST |
| 10 | `src/app/api/v5/imports/batches/[batchId]/rollback/route.ts` | POST |
| 11 | `src/app/api/v5/planning/allocations/route.ts` | GET (likely also POST) |
| 12 | `src/app/api/v5/planning/allocations/[id]/route.ts` | PATCH, DELETE |
| 13 | `src/app/api/v5/planning/pm-home/route.ts` | GET |
| 14 | `src/app/api/v5/capacity/route.ts` | GET |
| 15 | `src/app/api/v5/change-log/route.ts` | GET |
| 16 | `src/app/api/v5/admin/registers/[entity]/route.ts` | GET, POST |
| 17 | `src/app/api/v5/admin/registers/[entity]/[id]/route.ts` | PATCH, DELETE |

**withTenant() usage across v5 handlers:** zero (0 / 17). Handlers use
`requireRole()` to get `orgId`, then pass it to services. See Risk R1.

**Mutating handlers (planner's Wave A static-audit target):** proposals POST,
all 4 proposal state transitions, imports parse/commit/rollback, planning
allocations POST/PATCH/DELETE, register create/update/delete → **11 mutating
routes** minimum.

## Test Infrastructure

### ESLint config — `eslint.config.mjs` (112 lines, read in full)

- **Flat config** (`eslint/config` + `defineConfig`). Files to modify: this
  single file; add a new block at the end.
- Existing pattern at lines 62-70 already uses `no-restricted-syntax` with an
  AST `selector` — the new rule can follow the same shape.
- Existing custom plugin is registered from `./eslint-rules/index.js` — we
  do NOT need a new custom rule; `no-restricted-syntax` suffices.
- Proposed new block (draft for planner):

```js
{
  files: ['src/app/api/v5/**/*.ts', 'src/features/**/*.service.ts'],
  rules: {
    'no-restricted-syntax': ['error', {
      selector: "ThrowStatement[argument.type='NewExpression'][argument.callee.name='Error']",
      message: "Throw AppError subclasses from '@/lib/errors', not raw Error. v5 API contract requires typed error codes.",
    }],
  },
},
```

### Vitest + test structure

- Test runner: `vitest ^2.1.9`, script `pnpm test` → `vitest run`.
- Lint chain: `pnpm lint` → `eslint . && pnpm check:mutations-manifest`
  (existing combined check).
- `tests/invariants/` contains exactly 2 files today:
  - `change-log.coverage.test.ts` (runtime, broken — see TC-CL-005)
  - `mutations.json` (manifest consumed by the above)
- `tests/fixtures/` does NOT exist — Wave D creates it.
- Static invariant sibling: `src/features/change-log/__tests__/mutations-manifest.test.ts`
  (referenced in CONTEXT; confirmed present via earlier phase 43-04 commits).

### TC-CL-005 harness — root cause confirmed

File: `tests/invariants/change-log.coverage.test.ts` (62 lines, read in full).
Lines 16-18 stub `@/db` as `{ insert: ... }` only. All 6 services in
`mutations.json` wrap writes in `db.transaction(async (tx) => { ... })`, so
`db.transaction is not a function` throws before `recordChange` is reached.
The `try/catch` at lines 50-55 silently swallows it.

**Fix (minimal, Wave D):**

```typescript
vi.mock('@/db', () => {
  const stubTx = {
    insert: () => ({ values: () => ({ returning: async () => [{}] }) }),
    update: () => ({ set: () => ({ where: async () => [{}] }) }),
    delete: () => ({ where: async () => [{}] }),
    select: () => ({ from: () => ({ where: async () => [] }) }),
  };
  return {
    db: {
      ...stubTx,
      transaction: async <T>(fn: (tx: typeof stubTx) => Promise<T>) => fn(stubTx),
    },
  };
});
```

Planner should verify the shape matches what `actuals.service`,
`admin/register.service`, and `import/actuals-import.service` actually call
on `tx` inside their transaction bodies. A 5-minute grep will confirm.

## TC-ID Inventory (canonical §15 extraction)

Source of truth: `.planning/v5.0-ARCHITECTURE.md` lines 1898–2340. A grep for
`TC-[A-Z]+-[0-9]+[a-z]?` yields **230 unique TC-IDs** across **19 prefixes**:

| Prefix | Count | §15 subsection | Test tier (per locked decision #2) |
|---|---:|---|---|
| **TC-CAL** | 31 | 15.1 ISO Calendar + 15.18 | Vitest unit |
| **TC-UI** | 30 | 15.12 UI components + 15.20 | Vitest + RTL |
| **TC-API** | 21 | 15.10 API routes (integration) | Vitest + PGlite |
| **TC-IMP** | 18 | 15.9 Excel parser + 15.19 | Vitest + PGlite |
| **TC-AC** | 17 | 15.6 / 15.7 Actuals | Vitest + PGlite |
| **TC-PS** | 16 | 15.4 Planning direct edit + 15.18 | Vitest + PGlite |
| **TC-PR** | 14 | 15.5 Planning proposals + 15.18 | Vitest + PGlite |
| **TC-NEG** | 14 | 15.14 + 15.21 Non-goals | Vitest + PGlite |
| **TC-EX** | 12 | referenced from §15 (export/download) | Vitest + PGlite |
| **TC-DB** | 10 | 15.2 Database schema | Vitest unit (schema introspection) |
| **TC-REG** | 9 | 15.17 Admin register | Vitest + PGlite |
| **TC-PSN** | 8 | 15.11 Persona context + 15.18 | Vitest + PGlite |
| **TC-PERF** | 7 | 15.16 Performance budgets | Vitest unit (bench) or skip in CI |
| **TC-INV** | 6 | 15.15 Cross-cutting invariants | Vitest (static analysis) |
| **TC-CL** | 5 | 15.3 Change log service | Vitest + PGlite / runtime stub |
| **TC-CP** | 4 | referenced (copy-forward) | Vitest + PGlite |
| **TC-AR** | 4 | referenced (aggregation) | Vitest + PGlite |
| **TC-ZOOM** | 3 | 15.18 TimelineGrid zoom | Vitest + RTL |
| **TC-MOBILE** | 1 | 15.18 mobile gating | Vitest + RTL |
| **TC-E2E** | (not in grep; see note) | 15.13 | Playwright |
| **TC-RD-READONLY** | 1 | 15.18 | Vitest + RTL |

**Note on TC-E2E:** the grep counts TC-E2E-* uses 12 explicit IDs
(TC-E2E-1A..1D, 2A, 2B-approve, 2B-reject, 2C, 2D, 3A, 4A, 4B) but the regex
collapsed `1A` etc. into the prefix count. Planner should re-extract
`TC-E2E-\w+` separately to get the exact set.

**Total canonical assertions:** 230 (grep-verified). Matches the "~280" in
ROADMAP/REQUIREMENTS approximately — the spread comes from how sub-IDs
like `TC-CAL-001b`, `TC-UI-EMPTY-001..014` ranges, and `TC-E2E-1A..4B` are
counted. The planner's Wave C should treat **230 as the hard number for the
CI diff check** and only expand to ~280 if the generator resolves range
notation (`TC-UI-EMPTY-001..014` → 14 distinct IDs).

### Current Coverage Gap

Grep of `src/` and `tests/` for `TC-[A-Z]+-\d+[a-z]?`:

- **230** canonical IDs in ARCHITECTURE.md §15
- **138** TC-ID tokens found in test/source files
- **122** exact matches (already covered)
- **108** canonical IDs not yet present in any test file title or comment

This **108-item gap** sizes Wave C precisely. Many are in prefixes with
little existing work (TC-EX, TC-PERF, TC-ZOOM, TC-DB, TC-NEG), and some
prefixes (TC-API, TC-REG, TC-AC) are already partially done by earlier
phases (40–43).

## §16 Deterministic UUID v5 Seed Spec

Source: `.planning/v5.0-ARCHITECTURE.md` lines 2220–2340 (read in full).

- **Namespace:** a hardcoded v4 UUID constant `NC_NAMESPACE`. Architecture
  places it at `tests/helpers/seed-uuids.ts`. CONTEXT locks it at
  `tests/fixtures/seed.ts` exported as `FIXTURE_NS`. **Planner resolves
  conflict: prefer CONTEXT's location (`tests/fixtures/`) since it also
  houses the Excel fixture `actuals-row-per-entry.xlsx` referenced in §16.7.**
- **Entities seeded** (§16.1–16.7):
  - 6 people (anna, per, sara, erik, karin, janne) via
    `uuidv5('seed:person:' + slug, NC_NAMESPACE)`
  - 4 departments (Software Design, Electronics Design, Mechanical Design, Management)
  - 4 projects (Nordlys, Aurora, Stella, Forsen)
  - Allocations for 2026-01..2027-12 (24 months) — pattern in §16.4
  - Day-grain actuals for 2026-01-01..2026-04-06 — pattern in §16.5
  - Proposals: 1 rejected, 2 pending — §16.6
  - 1 committed import batch, 1 staged session — §16.7
- **Invocation:** integration tests call `await loadV5Seed()` in `beforeAll`;
  existing v4.0 seed pattern is `drizzle/seed.v5.ts`. For Phase 44 scope, the
  minimal deliverable is `tests/fixtures/seed.ts::buildSeed(namespace)`
  returning a `SeedBundle` pure-data object. DB wiring
  (`loadV5Seed` → PGlite) is a separate concern and can be stubbed if no
  Wave C integration test needs it yet.
- **Determinism test:** `tests/fixtures/seed.deterministic.test.ts` runs the
  generator twice and `expect(first).toEqual(second)` — this is the
  TEST-V5-02 assertion.
- **Partial implementation today:** none. `tests/fixtures/` directory does
  not exist. `uuid` package status in `package.json` needs verification; if
  absent, add it in the Wave D plan.

## Runtime State Inventory

Phase 44 is a hardening/test phase, NOT a rename/migration. Runtime state
inventory not applicable.

| Category | Items Found | Action |
|---|---|---|
| Stored data | None — phase adds no schema or data | — |
| Live service config | None | — |
| OS-registered state | None | — |
| Secrets/env vars | `NC_TEST_NOW` already used by §16.9 time mocking — no change | — |
| Build artifacts | `.planning/test-contract/tc-manifest.json` new generated artifact, committed | Add to git, not gitignored |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Vitest | all test tiers | ✓ | ^2.1.9 | — |
| ESLint flat config | Wave A guard | ✓ | via `eslint-config-next` | — |
| PGlite | Wave B runtime test | ✓ (already used in v5 phases per CONTEXT) | — | — |
| `uuid` npm package | Wave D §16 seed | ❓ verify with `pnpm ls uuid` | — | If missing, `pnpm add uuid && pnpm add -D @types/uuid` |
| Playwright | TC-E2E-* (Wave C) | Existing in prior v5 phases | — | — |
| Next.js 15 App Router | route handler direct invocation | ✓ | 15.x | — |

**No blocking missing dependencies.** Single item to verify during Wave A: is
`uuid` a direct dep or only transitive. `tests/fixtures/` and
`.planning/test-contract/` directories must be created.

## Common Pitfalls

### Pitfall 1: AppError sweep breaks existing contract tests

**What goes wrong:** replacing `NextResponse.json({ error: "FOO", ... })`
with `throw new FooError(...)` changes the wire format from what existing
tests assert (e.g. `capacity.contract.test.ts`, `change-log.contract.test.ts`).
**Why:** existing contract tests assert the flat shape
`{ error: "<code>", message: "..." }` — which is already what `handleApiError`
emits for `AppError`. Sweep is safe AS LONG AS the sweep goes through
`handleApiError` (not direct `NextResponse.json`).
**How to avoid:** grep for `NextResponse.json` under `src/app/api/v5/**`
before the sweep and confirm the sweep replacement routes through
`handleApiError(new FooError(...))`. The route scaffold already uses
try/catch around `handleApiError(error)` (see
`src/app/api/v5/proposals/route.ts` line 47).

### Pitfall 2: Static audit false positives on exceptions

**What goes wrong:** some routes legitimately don't need tenancy (e.g. a
future `/api/v5/health` or `/api/v5/version` endpoint). **Prevention:**
CONTEXT already mandates `tests/invariants/tenant-exceptions.json` with a
reason string. Spec: `{ "routes": [{ "file": "src/app/api/v5/...", "verbs": ["GET"], "reason": "..." }] }`.

### Pitfall 3: TC-ID manifest drifts silently

**What goes wrong:** a test is renamed and the TC-ID token is lost; manifest
re-generates and the CI diff check misses the drop because both sides
updated. **Prevention:** the canonical list is extracted from
ARCHITECTURE.md §15 (immutable spec). The generator emits the current test
tree manifest. CI diffs `{canonical} - {test tree}` — missing TC-IDs fail
the build. Ensure the diff is **one-sided** (canonical IDs missing from
tests), not `diff -u` symmetric.

### Pitfall 4: Regex over-matches `TC-UI-EMPTY-001..014` range notation

**What goes wrong:** ARCHITECTURE.md contains range notation like
`TC-UI-EMPTY-001..014` and `TC-UI-LOAD-001..014`. A naive grep counts only
`TC-UI-EMPTY-001` and `TC-UI-EMPTY-014`. **Prevention:** the
`extract-tc-ids-from-architecture.ts` script must expand `..N` ranges into
distinct IDs. This resolves the 230-vs-~280 discrepancy.

### Pitfall 5: §16 namespace location conflict

ARCHITECTURE.md puts `NC_NAMESPACE` in `tests/helpers/seed-uuids.ts`.
CONTEXT puts `FIXTURE_NS` in `tests/fixtures/seed.ts`. **Resolution:**
follow CONTEXT (it's the newer, locked decision).

### Pitfall 6: TC-INV-003 wire shape says `{ error: { code, message, details? } }`, reality is flat

See Anti-Pattern section above. Planner must pick a side before Wave B
writes TC-INV-003 assertion.

## Code Examples

### Error sweep replacement

```typescript
// BEFORE (hypothetical, in an import service):
if (!batch) throw new Error('Batch already rolled back');

// AFTER:
import { BatchAlreadyRolledBackError } from '@/lib/errors';
if (!batch) throw new BatchAlreadyRolledBackError({ batchId });
```

### UUID v5 deterministic seed

```typescript
// Source: .planning/v5.0-ARCHITECTURE.md §16.1
// tests/fixtures/seed.ts
import { v5 as uuidv5 } from 'uuid';

export const FIXTURE_NS = '00000000-0000-4000-8000-000000000001' as const; // pick a real v4

export function personId(slug: string): string {
  return uuidv5('seed:person:' + slug, FIXTURE_NS);
}

export function buildSeed(namespace: string = FIXTURE_NS): SeedBundle {
  const people = ['anna', 'per', 'sara', 'erik', 'karin', 'janne'].map(slug => ({
    id: uuidv5('seed:person:' + slug, namespace),
    slug,
    // ...
  }));
  return { people, /* projects, allocations, actuals, proposals, batches */ };
}
```

### Static tenant audit skeleton

```typescript
// Source: pattern adapted from existing tests/invariants/change-log.coverage.test.ts
// tests/invariants/tenant-isolation.static.test.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const MUTATING = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/;
const WITH_TENANT = /withTenant\(|requireRole\([^)]*\)[\s\S]*?\borgId\b/;

const exceptions = JSON.parse(readFileSync('tests/invariants/tenant-exceptions.json', 'utf8'));
const exceptionFiles = new Set(exceptions.routes.map((r: any) => r.file));

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.name === 'route.ts') yield p;
  }
}

describe('TC-API-TENANT-STATIC: every mutating /api/v5/* route enforces tenancy', () => {
  for (const file of walk('src/app/api/v5')) {
    const src = readFileSync(file, 'utf8');
    if (!MUTATING.test(src)) continue;
    if (exceptionFiles.has(file.replace(/\\/g, '/'))) continue;
    it(`TC-API-TENANT ${file} uses withTenant() or requireRole+orgId`, () => {
      expect(src).toMatch(WITH_TENANT);
    });
  }
});
```

## State of the Art

Not applicable — no external library decisions to make. Everything is
internal repo convention.

## Validation Architecture

This phase's ENTIRE PURPOSE is test coverage. The VALIDATION.md is dominated
by the TC-ID manifest + CI diff check. Capture that explicitly so the
validation-strategy generator picks it up.

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest ^2.1.9 + PGlite (integration) + Playwright (E2E only) |
| Config file | `vitest.config.ts` (existing — verify in Wave 0) |
| Quick run command | `pnpm test -- tests/invariants` |
| Full suite command | `pnpm lint && pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| API-V5-01 | All v5 routes return AppError subclasses with documented codes | static (ESLint) + unit | `pnpm lint` + `pnpm test -- tests/invariants/error-taxonomy.static.test.ts` | ❌ Wave A |
| API-V5-01 | Wire format per TC-NEG-* | integration (PGlite) | `pnpm test -- src/app/api/v5/**/__tests__/*.contract.test.ts` | partial — Wave B adds TC-NEG-* |
| API-V5-02 | Every mutating route calls withTenant/requireRole+orgId | static | `pnpm test -- tests/invariants/tenant-isolation.static.test.ts` | ❌ Wave A |
| API-V5-02 | Cross-tenant request returns 404 | integration (PGlite) | `pnpm test -- tests/invariants/tenant-isolation.runtime.test.ts` | ❌ Wave B |
| TEST-V5-01 | 230 canonical TC-IDs all have passing tests | CI diff check | `pnpm test -- tests/invariants/tc-id-coverage.test.ts` | ❌ Wave C |
| TEST-V5-02 | UUID v5 seed byte-identical across runs | unit | `pnpm test -- tests/fixtures/seed.deterministic.test.ts` | ❌ Wave D |
| TC-CL-005 | All 6 mutations exercise recordChange under stub | runtime invariant | `pnpm test -- tests/invariants/change-log.coverage.test.ts` | ✅ file exists, broken — Wave D fix |

### Sampling Rate

- **Per task commit:** `pnpm test -- <affected file glob>`
- **Per wave merge:** `pnpm lint && pnpm test -- tests/invariants tests/fixtures`
- **Phase gate:** `pnpm lint && pnpm test` (full suite green) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/invariants/tenant-isolation.static.test.ts` — new, covers API-V5-02
- [ ] `tests/invariants/tenant-isolation.runtime.test.ts` — new (Wave B)
- [ ] `tests/invariants/tenant-exceptions.json` — new empty `{"routes": []}`
- [ ] `tests/invariants/error-taxonomy.static.test.ts` — new, second layer to ESLint
- [ ] `tests/invariants/tc-id-coverage.test.ts` — new (Wave C)
- [ ] `tests/fixtures/seed.ts` — new (Wave D)
- [ ] `tests/fixtures/seed.deterministic.test.ts` — new (Wave D)
- [ ] `tests/fixtures/namespace.ts` — new (Wave D)
- [ ] `scripts/generate-tc-manifest.ts` — new (Wave C)
- [ ] `scripts/extract-tc-ids-from-architecture.ts` — new (Wave C)
- [ ] `.planning/test-contract/tc-manifest.json` — new generated artifact (Wave C)
- [ ] `src/lib/errors/codes.ts` — new barrel (Wave A)
- [ ] `vitest.config.ts` — verify present in Wave 0; if not, create

## Risks

### R1 — withTenant() is not wired into v5 handlers (HIGH)
CONTEXT assumes `withTenant()` "already exists and is used across v5.0
services". True at the service layer; **false at the handler layer** — zero
v5 route files import it. The static audit as literally described in
CONTEXT decision #4 will fail 100% of routes. **Mitigation:** broaden the
audit regex to accept `requireRole(...)` + `orgId` threading as a second
valid pattern. Planner should call this out explicitly in the Wave A plan
and update the audit script spec accordingly.

### R2 — TC-INV-003 wire shape vs actual AppError.toJSON (MEDIUM)
ARCHITECTURE §15.15 text says `{ error: { code, message, details? } }`
(nested). Actual `src/lib/errors.ts` line 12-18 emits
`{ error: code, message, details? }` (flat). Existing contract tests
already assert the flat shape. **Mitigation:** document the flat shape as
canonical in Wave A; do not nest. Update the TC-INV-003 test to match
reality, or update ARCHITECTURE.md §15.15 text in a doc-only commit before
Wave B.

### R3 — TC-ID count 230 vs the "~280" in ROADMAP (LOW)
Grep finds 230 unique IDs in §15. The ROADMAP quotes "~280". Diff comes
from range-notation (`TC-UI-EMPTY-001..014`). **Mitigation:** Wave C
extractor must expand ranges; document the exact count the extractor
produces in the PR description. Either 230 or ~280 is fine as long as the
canonical list and test manifest use the same counting rule.

### R4 — 108 TC-ID gap is larger than a single wave (MEDIUM)
108 missing TC-IDs is a lot for Wave C. Most will be straightforward (adding
TC-ID tokens to existing test titles), but some prefixes are completely
unwritten (TC-EX, several TC-PERF). **Mitigation:** planner should split
Wave C by prefix into sub-plans (e.g. 44-03a-tc-cal, 44-03b-tc-db,
44-03c-tc-cl, etc.) and accept that TC-PERF-* may be best as a skipped /
pending tier in CI rather than full benchmark execution.

### R5 — `tests/fixtures/` directory missing (LOW)
Harmless; just create it in Wave D.

## Open Questions

1. **Do any existing v5 route files directly call `NextResponse.json({ error: ... })` outside the `catch → handleApiError` path?**
   - What we know: the routes I sampled (`proposals/route.ts`) go through
     `handleApiError`. `capacity.contract.test.ts` / `change-log.contract.test.ts`
     assert the flat wire format implying `handleApiError` is the path.
   - What's unclear: whether all 17 routes follow the pattern.
   - Recommendation: Wave A starts with an inventory scan:
     `rg "NextResponse\.json\(\s*\{\s*error" src/app/api/v5` — any hit is a
     sweep target.

2. **Does `vitest.config.ts` exist and what paths does it currently include?**
   - What we know: `pnpm test` → `vitest run` works in prior phases.
   - What's unclear: whether `tests/invariants/` and `tests/fixtures/` are
     already in the include globs.
   - Recommendation: Wave 0 first task = cat the config and either confirm
     or add the two dirs to `include`.

3. **Is the `uuid` package a direct dependency?**
   - What we know: nothing in grep so far.
   - Recommendation: Wave D first task = `pnpm ls uuid` + add if missing.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/44-api-hardening-and-test-contract-fill/44-CONTEXT.md` (186 lines, full read)
- `.planning/REQUIREMENTS.md` (lines 82–94 for API-V5 / TEST-V5, lines 165–170 for traceability)
- `.planning/STATE.md` (current position)
- `.planning/v5.0-ARCHITECTURE.md` (§15 at lines 1898–2215; §16 at lines 2217–2340; grep of all `TC-*` tokens)
- `src/lib/errors.ts` (92 lines, full read — AppError gap analysis)
- `src/lib/api-utils.ts` (31 lines, full read — wire format verification)
- `src/lib/tenant.ts` (177 lines, full read — confirmed handler-layer gap)
- `src/app/api/v5/proposals/route.ts` (91 lines, full read — pattern sample)
- `eslint.config.mjs` (112 lines, full read — flat config + existing `no-restricted-syntax` precedent)
- `tests/invariants/change-log.coverage.test.ts` (62 lines, full read)
- `tests/invariants/mutations.json` (32 lines, full read)
- `.planning/phases/43-admin-register-maintenance/deferred-items.md` (22 lines, full read — root cause confirmed)
- `.planning/config.json` (workflow config — nyquist validation enabled by default)
- `package.json` (test / lint scripts)

### Secondary (MEDIUM confidence)
- Glob results for `src/app/api/v5/**/route.ts` (17 files inventoried)
- Grep results for `withTenant` (51 files overall; zero under `src/app/api/v5/**`)
- Grep results for `TC-[A-Z]+-\d+[a-z]?` across repo (230 canonical vs 138 present in source; 122 overlap; 108 gap)

### Tertiary (LOW confidence)
None — everything is grounded in the repo or in the frozen architecture spec.

## Metadata

**Confidence breakdown:**
- AppError gap: HIGH — full file read, 1-of-8 confirmed
- Route inventory: HIGH — glob + sampled handler
- withTenant gap (R1): HIGH — grep across entire `src/app/api/v5/**` returned zero hits
- TC-ID count (230): HIGH — reproducible grep; gap of 108 vs test tree also HIGH
- TC-CL-005 root cause: HIGH — matches phase 43 deferred-items.md diagnosis line-for-line
- §16 UUID v5 spec: HIGH — full section read
- TC-INV-003 wire-shape conflict (R2): MEDIUM — depends on whether ARCHITECTURE.md text is prescriptive or descriptive

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable; architecture frozen, no external libs)
