# Phase 54: Audit-spine + eslint regex expansion — Research

**Researched:** 2026-05-13
**Domain:** Backend route refactor — funnel legacy register CRUD through the single audited writer; expand eslint mutating-verb regex
**Confidence:** HIGH

## Summary

Phase 54 is a route/service plumbing refactor with five symmetric copies. The destination service `src/features/admin/register.service.ts` is already a complete, tested, audit-compliant dispatcher: `createRegisterRow / updateRegisterRow / archiveRegisterRow / listRegisterRows` accept `entity: 'person' | 'project' | 'department' | 'discipline' | 'program'` and write a `change_log` row inside the same db.transaction() as the mutation itself (lines 200–421 of `register.service.ts`). It is already wired to the v5 admin UI via `/api/v5/admin/registers/[entity]/...` and the `use-admin-registers.ts` hook. The legacy `/api/people/*`, `/api/projects/*`, `/api/programs/*`, `/api/departments/*`, `/api/disciplines/*` routes still call the v4 services (`person.service.ts`, etc.) which use `withTenant().insertPerson(...) / updatePerson(...) / deleteX(...)` and never call `recordChange` — so every mutation through those routes is silently `@no-change-log`. Both surfaces are live in prod (onboarding wizard, person header, and several other UI flows still hit `/api/people` etc. through hooks `use-people.ts`, `use-projects.ts`, `use-reference-data.ts`).

The MED-03 work landed on 2026-05-10 (commit `e1d5e6d`) — the eslint regex at `eslint-rules/_mutation-prefix-regex.js:23-24` **already** matches `execute|promote|apply|cancel|stage|parseAndStage`. AUDIT-07's literal text in REQUIREMENTS.md ("expand to include `execute|promote|apply|cancel|stage`") therefore appears to already be done. The real Phase 54 work for AUDIT-07 is to (a) confirm and document this, (b) add an explicit eslint **rule unit test** (currently `src/features/change-log/__tests__/require-change-log.rule.test.ts` only tests `createFoo / updateBar / deleteBar / fetchFoo`) that exercises each new prefix to prevent regression, and (c) keep the regex + manifest scope synchronized as new verbs are introduced.

**Primary recommendation:** Refactor the 5 legacy service `create*/update*/delete*/archive*` functions to delegate to `createRegisterRow / updateRegisterRow / archiveRegisterRow` rather than calling `withTenant().*` directly. This is the lowest-risk path: keeps the route signatures, legacy hooks, and call sites unchanged; thread `actorUserId` from `requireRole()` through the route to the service. Phase 54 is then 5 service rewrites + 5 contract tests + 1 eslint rule-test addition + a manifest regen — small, mechanical, well-bounded.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mutating verb detection at lint time | Build / Tooling (eslint plugin) | — | Lives in `eslint-rules/`; runs at `pnpm lint` and pre-commit |
| Mutation manifest codegen | Build / Tooling (`scripts/`) | — | `tsx scripts/generate-mutations-manifest.ts` regenerates `tests/invariants/mutations.json` |
| Mutation auditing (writes to `change_log`) | API / Backend (service layer) | DB / Storage | Single canonical writer is `register.service.ts` per ADR-003; `change_log` is the persisted audit table |
| Route HTTP shape (auth, parsing, status codes) | API / Backend (route layer) | — | `src/app/api/people/*`, `/projects/*`, `/programs/*`, `/departments/*`, `/disciplines/*` |
| Audit invariant verification | Test infrastructure (Vitest + PGlite) | — | `src/features/admin/__tests__/register.audit.test.ts` template; new tests live alongside per-entity routes or under `src/features/{entity}/__tests__/` |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDIT-01 | `/api/people/*` PUT/POST/DELETE flow through `register.service.ts` | Refactor `src/features/people/person.service.ts` `createPerson / updatePerson / deletePerson` to call `createRegisterRow / updateRegisterRow / archiveRegisterRow` with `entity: 'person'`; route signature stays the same; thread `userId` from `requireRole()` (already returned at `src/lib/auth.ts:75-100`) |
| AUDIT-02 | `/api/projects/*` PUT/POST/DELETE flow through `register.service.ts` | Same pattern; refactor `src/features/projects/project.service.ts` `createProject / updateProject / archiveProject` |
| AUDIT-03 | `/api/programs/*` PUT/POST/DELETE flow through `register.service.ts` | Same pattern; refactor `src/features/programs/program.service.ts` `createProgram / updateProgram / deleteProgram` (note legacy `deleteProgram` short-circuits on usageCount > 0 — `register.service.ts:archiveRegisterRow` already handles that via `collectBlockers`, so the explicit check becomes redundant) |
| AUDIT-04 | `/api/departments/*` PUT/POST/DELETE flow through `register.service.ts` | Same pattern as AUDIT-03 |
| AUDIT-05 | `/api/disciplines/*` PUT/POST/DELETE flow through `register.service.ts` | Same pattern as AUDIT-03 |
| AUDIT-06 | Per-entity contract test asserts a `change_log` row is written for each mutating route | Clone `src/features/admin/__tests__/register.audit.test.ts` pattern (PGlite + vi.mock('@/db') + shared `register.test-fixtures.ts`). One test file per entity is the requirement; alternative is one parameterized file. Existing fixtures in `register.test-fixtures.ts` already bootstrap the change_log table, enum, and all five register tables — reusable as-is |
| AUDIT-07 | `MUTATION_PREFIX_REGEX` expanded to include `execute|promote|apply|cancel|stage` verbs | **Already landed** in commit `e1d5e6d` (MED-03, 2026-05-10) — see `eslint-rules/_mutation-prefix-regex.js:23-24`. Phase 54 task is to add explicit unit tests in `require-change-log.rule.test.ts` covering each new prefix (currently only `create/update/delete/fetch` exemplars exist) and confirm/document |

## Standard Stack

### Core (already in repo; no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | `^0.45.1` [VERIFIED: package.json:48] | DB driver; provides `db.transaction(tx => ...)` used by `recordChange` | Already the only ORM in the project; `register.service.ts` standardizes on it |
| Vitest | `^2.1.9` [VERIFIED: package.json:97] | Contract test runner | All existing register tests use Vitest |
| @electric-sql/pglite | `^0.4.3` [VERIFIED: package.json:67] | In-memory Postgres for service-level integration tests | Used by `register.audit.test.ts` and `register.integration.test.ts` to assert against real SQL behavior without Neon-http |
| `eslint` + custom plugin `nordic` | eslint `^9` [VERIFIED: package.json:84] | `nordic/require-change-log` rule loaded from `eslint-rules/` | Already wired in `eslint.config.mjs:34-37` |
| `ts-morph` | `^27.0.2` [VERIFIED: package.json:94] | Mutations manifest generator (`scripts/generate-mutations-manifest.ts`) | Already used; no change needed |

**Installation:** No new dependencies. Phase 54 is pure refactor + tests.

### Internal modules (HIGH confidence — verified by direct read)

| Module | Path | Phase-54 Role |
|--------|------|---------------|
| `register.service.ts` | `src/features/admin/register.service.ts` | Destination — `createRegisterRow / updateRegisterRow / archiveRegisterRow / listRegisterRows`. Public surface lines 200/300/365/423 |
| `recordChange` | `src/features/change-log/change-log.service.ts:30-50` | Sole writer to `change_log`; takes `(input, tx?)` and is called inside the same transaction |
| `MUTATION_PREFIX_REGEX` | `eslint-rules/_mutation-prefix-regex.js:23-24` | Shared regex; current value: `/^(create\|update\|delete\|edit\|submit\|resubmit\|approve\|reject\|commit\|rollback\|upsert\|archive\|withdraw\|patch\|execute\|promote\|apply\|cancel\|stage\|parseAndStage\|bulk[A-Z]\|batch[A-Z])/` |
| `nordic/require-change-log` rule | `eslint-rules/require-change-log.js` | Reads regex via `require('./_mutation-prefix-regex')`; enforces `recordChange()` call inside body or `@no-change-log <reason>` JSDoc escape |
| Mutations manifest codegen | `scripts/generate-mutations-manifest.ts` | Same regex; writes `tests/invariants/mutations.json` |
| Existing rule test | `src/features/change-log/__tests__/require-change-log.rule.test.ts` | Tested with `createFoo / updateBar / deleteBar / fetchFoo`; AUDIT-07 needs cases for `execute / promote / apply / cancel / stage` |
| Existing per-mutation audit pattern | `src/features/admin/__tests__/register.audit.test.ts` | Reference template for the 5 new tests |
| Shared PGlite fixtures | `src/features/admin/__tests__/register.test-fixtures.ts` | Already bootstraps change_log, all 5 register tables, two test orgs |
| `withTenant()` helper | `src/lib/tenant.ts:15-100+` | Currently used by all 5 legacy services. **After Phase 54 the 5 legacy services no longer call `withTenant().insert/update/delete`** — they delegate to `register.service.ts` which uses raw `tx.insert/update/select` inside a tx. (This is intentional per `register.service.ts:14-19` comment.) Phase 55 will decide the broader `withTenant()` policy |

## Architecture Patterns

### System Architecture Diagram

```
                  ┌──────────── Legacy admin UI surfaces ─────────────┐
                  │  onboarding-wizard, person-header, PersonForm,   │
                  │  use-people, use-projects, use-reference-data,   │
                  │  step-people, step-departments, step-disciplines │
                  └──────────────────────┬───────────────────────────┘
                                         │ fetch('/api/people') etc.
                                         ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  src/app/api/people/{route,[id]/route}.ts                       │
   │  src/app/api/projects/{route,[id]/route}.ts                     │
   │  src/app/api/programs/{route,[id]/route}.ts                     │
   │  src/app/api/departments/{route,[id]/route}.ts                  │
   │  src/app/api/disciplines/{route,[id]/route}.ts                  │
   │  -- requireRole('admin') | viewer for GET                       │
   │  -- Zod parse → call legacy service                             │
   └────────────────────────┬────────────────────────────────────────┘
                            │ TODAY: createPerson(orgId, data)
                            │ AFTER: createRegisterRow({ entity:'person', actorUserId, orgId, data })
                            ▼
       TODAY (legacy)                       AFTER PHASE 54
       ────────────────                     ──────────────────────────
       person.service.ts                    person.service.ts (becomes
       projects.service.ts          ──►     a thin adapter that calls
       programs.service.ts                  register.service.ts; OR
       departments.service.ts               routes call register.service
       disciplines.service.ts               directly — see DESIGN Q1)
       │
       │ withTenant(orgId)
       │   .insertPerson(...)                src/features/admin/register.service.ts
       │   .updatePerson(...)        ──►     db.transaction(async tx => {
       │   ...                                  tx.insert(t).values(...).returning()
       ▼                                        await recordChange({...}, tx)
       db.* (no change_log row)                })
                                                      │
                                                      ▼
                                               change_log table
                                               (audit spine)
```

### Recommended Project Structure (delta vs. current)

```
src/features/people/person.service.ts          # AUDIT-01: rewritten or thin-shim
src/features/projects/project.service.ts       # AUDIT-02
src/features/programs/program.service.ts       # AUDIT-03
src/features/departments/department.service.ts # AUDIT-04
src/features/disciplines/discipline.service.ts # AUDIT-05
src/features/{people,projects,programs,departments,disciplines}/__tests__/
    audit.contract.test.ts                     # AUDIT-06 (5 new files OR 1 parameterized)
src/features/change-log/__tests__/
    require-change-log.rule.test.ts            # AUDIT-07: add 5 new test cases
eslint-rules/_mutation-prefix-regex.js         # AUDIT-07: already updated; verify only
tests/invariants/mutations.json                # auto-regenerated by check:mutations-manifest
```

### Pattern 1: Service-level delegation to register.service.ts (preferred)

**What:** Each legacy service keeps its public function signature (`createPerson(orgId, data)`) but the body delegates to `register.service.ts` instead of `withTenant()`. Requires threading `actorUserId` through.

**Why preferred:** Keeps the existing route → service contract unchanged; minimal churn at call sites (`use-people.ts`, `use-projects.ts` still hit `/api/people`, `/api/projects`); the audit spine becomes inherited by every existing caller automatically.

**Decision needed:** `createPerson(orgId, data)` doesn't currently take `actorUserId`. Either (a) extend the signature to `createPerson(orgId, userId, data)` — touches the 2 route files per entity (10 route files total) but is mechanical, or (b) have routes bypass the service entirely and call `register.service.ts` directly. Both are valid; option (b) is what `/api/v5/admin/registers/*` already does and is cleaner long-term.

**Example (option a):**

```typescript
// Source: refactored from src/features/people/person.service.ts
// (current shape at src/features/people/person.service.ts:113-128 + 134-147)
import { createRegisterRow, updateRegisterRow, archiveRegisterRow }
  from '@/features/admin/register.service';

export async function createPerson(orgId: string, actorUserId: string, data: PersonCreate) {
  return createRegisterRow({
    orgId,
    actorUserId,
    entity: 'person',
    data,
  });
}

export async function updatePerson(orgId: string, actorUserId: string, id: string, data: PersonUpdate) {
  return updateRegisterRow({
    orgId,
    actorUserId,
    entity: 'person',
    id,
    data,
  });
}

export async function deletePerson(orgId: string, actorUserId: string, id: string) {
  return archiveRegisterRow({
    orgId,
    actorUserId,
    entity: 'person',
    id,
  });
}
```

Route (after):

```typescript
// Source: src/app/api/people/route.ts (POST handler after refactor)
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireRole('admin');  // userId already returned
    const body = await request.json();
    const data = personCreateSchema.parse(body);
    const person = await createPerson(orgId, userId, data);
    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Pattern 2: Route → register.service direct (alternative)

**What:** Delete the 5 legacy service mutation functions entirely; routes call `createRegisterRow`/etc. directly with `entity` literal. Read helpers (`listPeople`, `getPersonById`, `listProjects`, etc.) stay in their feature folders because they have entity-specific filters and joins that `register.service.ts:listRegisterRows` doesn't cover.

**Tradeoff:** Cleaner — one canonical mutation writer, the v5 admin route and the legacy routes use the same path. Costlier — 10 route file rewrites instead of 5 service rewrites, but the route files are short (40–50 LoC each).

### Anti-Patterns to Avoid

- **Calling `recordChange` directly from the legacy service** — bypasses the dispatcher; defeats ADR-003 "single canonical writer" (see `register.service.ts:14-19` comment). Phase 54 must funnel through `register.service.ts`, not just add audit calls to the v4 services.
- **Adding `@no-change-log` escape hatches** — would suppress the eslint rule but leave the dual-write-path drift in place. The whole point of the phase is to *eliminate* the dual write path. The audit escape hatch should not appear in any AUDIT-01..05 commits.
- **Forgetting `actorUserId`** — `createRegisterRow` requires it; if the route doesn't thread `userId` from `requireRole()`, the persisted `change_log.actor_persona_id` is wrong. RBAC tests already exist (`src/app/api/people/__tests__/rbac.contract.test.ts`) but don't assert this — Phase 54 contract tests need to.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Writing to `change_log` | Direct `db.insert(changeLog)` calls in the 5 legacy services | `recordChange(input, tx)` via `register.service.ts` | ADR-003 single canonical writer; eslint rule looks for `recordChange()` calls; codegen manifest counts `register.service.ts` exports |
| Per-entity FK validation | Re-implementing tenant-scoped FK checks per entity | `register.service.ts` lines 212–268 already validate `disciplineId`, `departmentId`, `programId`, `leadPmPersonId` against the tenant | The check exists, is unit-tested, and is part of CR-04 fix |
| Per-entity dependent-row blocker checks | Re-implementing usage counts per entity in route handlers | `collectBlockers()` in `register.service.ts:448-574` already covers all 5 entities | Existing `register.dependents.test.ts` locks this behavior; the legacy `deleteDepartment/deleteDiscipline/deleteProgram` checks become redundant |
| Mutating-verb regex | Defining a new regex per file/test | Import shared `MUTATION_PREFIX_REGEX` from `eslint-rules/_mutation-prefix-regex.js` | CONS-P1-11: drift between eslint rule and codegen manifest is a documented footgun |
| Test fixtures | Bootstrapping PGlite tables per test | Reuse `src/features/admin/__tests__/register.test-fixtures.ts` (`ORG_ID`, `ORG_ID_2`, `initRegisterTestDb`, `resetRegisterTestDb`) | Already bootstraps `change_log`, both enums, all 5 register tables, plus 2 orgs |

**Key insight:** The destination service, validation, blocker checks, eslint rule, manifest codegen, runtime invariant, and test fixtures all already exist. Phase 54 is wiring the existing pieces together for 5 already-live legacy routes.

## Runtime State Inventory

> Phase 54 is a code-level refactor. No data migration, no service config change, no OS-level state, no env vars, no build artifacts to update. The five categories are inventoried explicitly below.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. The audit-spine refactor changes only the *write path* going forward; existing `change_log` rows are untouched. `change_log_entity` enum already includes all 5 values (`person, project, department, discipline, program` — verified at `register.test-fixtures.ts:24-30` and `src/db/schema.ts:63-74`) | None — verified via direct enum read |
| Live service config | None. No Vercel env vars, no Clerk config, no Neon branch changes | None — verified by absence of env references in `register.service.ts` and the 5 legacy services |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `tests/invariants/mutations.json` is regenerated by `npm run check:mutations-manifest` — Phase 54 will regenerate it. Currently lists `register.service.ts::{createRegisterRow, updateRegisterRow, archiveRegisterRow}` (verified at `tests/invariants/mutations.json:5-18`). If AUDIT-01..05 use option (a) and legacy services keep `createPerson/createProject/...` exports that delegate to `register.service.ts`, those new exports will start matching the regex too — codegen will pick them up and the manifest grows. If using option (b) and the legacy services lose their mutating exports, manifest stays the same | Run `pnpm check:mutations-manifest` after AUDIT-01..05 land; commit the regenerated `tests/invariants/mutations.json` |

## Common Pitfalls

### Pitfall 1: Forgetting to thread `actorUserId` from the route

**What goes wrong:** Route only awaits `getTenantId()` (returns `orgId` only, no `userId`); service-level call to `createRegisterRow({ actorUserId: ??? })` fails Zod (`actorPersonaId: z.string().min(1)` at `change-log.service.ts:16`).
**Why it happens:** 4 of 5 entities currently use `requireRole('admin')` (which returns `userId`) for mutations — but the GET handlers and some legacy paths use `getTenantId()` alone. Cargo-culting `getTenantId` into the new mutation flow loses `userId`.
**How to avoid:** Always use `await requireRole('admin')` for the 5 mutating routes; destructure `{ orgId, userId }`; pass `userId` as `actorUserId`. Already true today for POST/PATCH/DELETE on all 5 entities — verify in tests.
**Warning signs:** `change_log.actor_persona_id` IS NOT NULL constraint failure at runtime, or `ValidationError: invalid actorPersonaId` from `recordChange`.

### Pitfall 2: Changing the route response shape

**What goes wrong:** `register.service.ts:createRegisterRow` returns `RegisterRow` (the raw DB row). Legacy `createPerson` returns the same shape (raw `people.*` columns). But the v5 admin route wraps it as `{ row }` while the legacy people route wraps as `{ person }`. If you switch the legacy route to call `register.service` directly and forget to keep the `{ person }` wrap, every consumer of `use-people.ts:46` (PersonForm submit, onboarding wizard) breaks.
**Why it happens:** Different wrapper conventions between the legacy and v5 admin APIs.
**How to avoid:** Keep the route response shape exactly identical to today. Compare current vs. proposed JSON in the contract test; the `{ person }`, `{ project }`, `{ program }`, `{ department }`, `{ discipline }` envelopes MUST survive untouched.
**Warning signs:** TypeScript errors in `use-people.ts`, `use-projects.ts`, `use-reference-data.ts`; broken onboarding-wizard E2E.

### Pitfall 3: Losing the legacy delete error semantics for usage-blocked deletes

**What goes wrong:** Legacy `deleteDepartment / deleteDiscipline / deleteProgram` throw a `ConflictError` with `{ usageCount: count }` (e.g., `department.service.ts:69-71`). `register.service.ts:archiveRegisterRow` throws `ConflictError('DEPENDENT_ROWS_EXIST', { entity, id, blockers: { ... } })` — different message, different details shape. Frontend currently catches the legacy shape (or doesn't — TBD).
**Why it happens:** Two parallel implementations diverged.
**How to avoid:** Audit every call site that handles a 409 from `/api/{departments,disciplines,programs}/[id]` DELETE — is there one? Search for `usageCount` or `Cannot delete` in client code. If consumers exist, the planner needs to decide whether to (a) keep the legacy 409 shape via a route-level adapter, (b) migrate the 1–2 client callers to the v5 `DEPENDENT_ROWS_EXIST` shape (preferred — matches `use-admin-registers.ts:DependentRowsError`).
**Warning signs:** Departments admin shows "Cannot delete: 3 people are assigned to it" today but post-refactor shows raw `DEPENDENT_ROWS_EXIST` JSON; or the toast disappears entirely.

### Pitfall 4: `archiveProject` semantics — status='archived' + archivedAt

**What goes wrong:** Legacy `archiveProject` (`project.service.ts:88-97`) sets both `status: 'archived'` AND `archivedAt: new Date()`. `register.service.ts:archiveRegisterRow` (lines 393–397) explicitly mirrors this for `project` only: `setValues.status = 'archived'`. So the semantics are preserved — but only because someone remembered to add the project-specific branch. If the planner edits this code path, the project status fallback can regress.
**Why it happens:** Project alone uses an enum status column; the other 4 use only `archivedAt`.
**How to avoid:** Don't touch `register.service.ts:393-397` unless the contract test explicitly fails. AUDIT-02 contract test should assert that DELETE on `/api/projects/[id]` leaves the row with both `status='archived'` AND `archivedAt != null`.

### Pitfall 5: Person un-archive via PATCH `{ archivedAt: null }` exists today via the v5 admin route — does it exist on the legacy route?

**What goes wrong:** `register.service.ts:updateRegisterRow` + `register.schema` `*UpdateSchema.extend({ archivedAt: z.union([z.date(), z.null()]).optional() })` (lines 142–145) allow un-archive via PATCH. Legacy `updatePerson` etc. don't currently support un-archive — `personUpdateSchema` (`src/features/people/person.schema.ts:16`) is `personCreateSchema.partial()` which does NOT include `archivedAt`. After refactor, the legacy route inherits this capability silently. That may or may not be desired.
**Why it happens:** v5 admin route was designed around un-archive; legacy was not.
**How to avoid:** Decide explicitly. If un-archive should NOT be available on the legacy route, add a route-level reject. If it should — document it in the phase notes. Phase 54 contract tests should assert the chosen behavior.

### Pitfall 6: Pre-existing AUDIT-07 violations are NOT a risk

**What goes wrong:** A reasonable worry: "after expanding the regex, will it surface pre-existing violations that block the build?"
**Why it doesn't apply here:** The regex was already expanded on 2026-05-10 (commit `e1d5e6d`). The 8 pre-existing violations from MED-03 were each closed with either a `recordChange` call (HI-01, HI-02 in same batch) or a documented `@no-change-log <reason>` escape hatch. The `pnpm lint` build is currently green on `main`. Phase 54's AUDIT-07 work is purely additive: a unit test that documents what each new prefix should fail on.
**Verification:** Look at the commit `e1d5e6d` body; check that `pnpm lint` is green on main today.

## Code Examples

### Existing canonical mutation pattern in register.service.ts

```typescript
// Source: src/features/admin/register.service.ts:200-298 (createRegisterRow)
export async function createRegisterRow(input: CreateRegisterRowInput): Promise<RegisterRow> {
  assertEntity(input.entity);
  const parsed = parseCreate(input.entity, input.data);

  return db.transaction(async (tx) => {
    // ... FK tenant validation ...
    const t = tableFor(input.entity);
    const insertValues = { ...(parsed as object), organizationId: input.orgId };
    const insertedRows = (await tx
      .insert(t as any)
      .values(insertValues as any)
      .returning()) as unknown as RegisterRow[];
    const row = insertedRows[0];
    if (!row) throw new InternalError(`Failed to insert ${input.entity}`);
    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorUserId,
        entity: changeLogEntity(input.entity),
        entityId: (row as RegisterRow).id,
        action: 'REGISTER_ROW_CREATED',
        previousValue: null,
        newValue: row as Record<string, unknown>,
        context: { source: 'admin.register.create' },
      },
      tx,
    );
    return row as RegisterRow;
  });
}
```

### Existing canonical audit test pattern

```typescript
// Source: src/features/admin/__tests__/register.audit.test.ts:56-70
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { ORG_ID, initRegisterTestDb, resetRegisterTestDb } from './register.test-fixtures';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });
vi.mock('@/db', () => ({ get db() { return testDb; } }));

const registerSvcPromise = import('../register.service');

it('department: create writes 1 row with snapshot in newValue', async () => {
  const { createRegisterRow } = await registerSvcPromise;
  const row = await createRegisterRow({
    orgId: ORG_ID,
    actorUserId: 'admin1',
    entity: 'department',
    data: { name: 'Audited' },
  });
  const log = await testDb
    .select()
    .from(schema.changeLog)
    .where(and(
      eq(schema.changeLog.entity, 'department'),
      eq(schema.changeLog.entityId, row.id),
    ));
  expect(log).toHaveLength(1);
  expect(log[0].action).toBe('REGISTER_ROW_CREATED');
  expect(log[0].newValue).toMatchObject({ name: 'Audited' });
});
```

### Existing canonical HTTP integration test (cloned for AUDIT-06)

```typescript
// Source: src/features/admin/__tests__/register.integration.test.ts:30-46
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async (min: string) => {
    const order = { viewer: 0, planner: 1, admin: 2, owner: 3 } as const;
    if (order[fakeAuth.role] < order[min as keyof typeof order]) {
      const { ForbiddenError } = await import('@/lib/errors');
      throw new ForbiddenError(`${min} role required for this action`);
    }
    return fakeAuth;  // { orgId, userId, role }
  }),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

// Then for each of the 5 entities — import the legacy route, fire POST/PATCH/DELETE,
// query change_log, assert exactly 1 REGISTER_ROW_CREATED/UPDATED/DELETED row.
```

### Existing canonical eslint rule test (to extend for AUDIT-07)

```typescript
// Source: src/features/change-log/__tests__/require-change-log.rule.test.ts:18-92
import { RuleTester } from 'eslint';
const rule = require('../../../../eslint-rules/require-change-log');

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('nordic/require-change-log', rule, {
  valid: [
    // ... existing cases ...
    // AUDIT-07 ADDITIONS:
    {
      name: 'execute prefix: mutating export that calls recordChange passes',
      code: `export async function executeImport() { await recordChange({}, tx); return 1; }`,
    },
    // ... promote / apply / cancel / stage analogs ...
  ],
  invalid: [
    // ... existing cases ...
    // AUDIT-07 ADDITIONS:
    {
      name: 'execute prefix: mutating export without recordChange and no escape hatch fails',
      code: `export async function executeImport() { return 1; }`,
      errors: [{ messageId: 'missingRecordChange' }],
    },
    // ... promote / apply / cancel / stage analogs ...
  ],
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dual write path: legacy services bypass change_log | Single canonical writer (`register.service.ts`) introduced for the v5 admin route in Phase 43 | 2026-04-13 (v5.0 ship) | Plug for legacy routes is what Phase 54 is doing |
| `MUTATION_PREFIX_REGEX` missing `execute\|promote\|apply\|cancel\|stage` | Regex expanded to cover all 5 new verbs + `parseAndStage` | 2026-05-10 (commit `e1d5e6d`) | Eslint catches new mutating verbs at lint time |
| 8 known-bad mutations escaped the rule by name | Each closed with either `recordChange` call (HI-01, HI-02) or documented `@no-change-log <reason>` (the 8) | 2026-05-10 (same batch) | Build is currently green; Phase 54 doesn't inherit a blocker |

**Deprecated/outdated:**
- Direct `withTenant().insertPerson(...) / updatePerson(...) / deleteX(...)` for mutating paths after Phase 54 — these become read-only helpers or the methods get removed entirely. Phase 55 will decide the broader `withTenant()` policy (TENANT-01 ADR).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | None [VERIFIED]: every factual claim in this RESEARCH was verified against the codebase at commit `77a4605` (HEAD as of 2026-05-13). All file paths, line numbers, and code snippets are quoted verbatim | — | — |

> **Note:** The `archivedAt` un-archive behavior (Pitfall 5), the `usageCount` legacy 409 shape (Pitfall 3), and the choice between Pattern 1 vs Pattern 2 (see Open Questions) are design decisions, not assumptions — they should be raised in discuss-phase or decided by the planner.

## Open Questions

1. **Q1: Pattern 1 (service-shim) or Pattern 2 (route → register.service direct)?**
   - What we know: Both work mechanically. Pattern 1 changes 5 service files (each ~100 LoC) and 10 route files lightly (thread `userId` arg). Pattern 2 deletes the mutation half of the 5 service files and rewrites 10 route files (each ~50 LoC).
   - What's unclear: Which is preferred long-term aesthetic? Pattern 1 preserves legacy import paths (`createPerson` etc.) — easier rollback. Pattern 2 is cleaner and matches what v5 admin already does — eventually removes the legacy services entirely.
   - Recommendation: **Pattern 1 for Phase 54** because rollback safety and small per-file diff size matters more than aesthetic purity here; Pattern 2 can land in a v8 cleanup phase if desired.

2. **Q2: Should the 5 legacy DELETE routes inherit the `register.service.ts` dependent-row blocker behavior wholesale?**
   - What we know: Legacy `deleteDepartment/deleteDiscipline/deleteProgram` check usage count and throw `ConflictError(\`Cannot delete X: N \`)`. `archiveRegisterRow` throws `ConflictError('DEPENDENT_ROWS_EXIST', { blockers: {...} })`. Different message + details shape.
   - What's unclear: Is anything in the prod UI catching the old shape? `use-admin-registers.ts:DependentRowsError` already knows the new shape.
   - Recommendation: Search for `usageCount` consumers in `src/` during planning; the answer dictates whether to add a route-level adapter or migrate consumers to the v5 shape. Discuss-phase question.

3. **Q3: Should the AUDIT-06 contract tests be 5 separate files (one per entity, per requirement) or 1 parameterized file with `it.each(['person','project',...])`?**
   - What we know: REQUIREMENTS.md AUDIT-06 says "one test per entity, 5 tests total." `register.integration.test.ts` uses `it.each(ENTITIES)` and has been working for 6 weeks — both shapes are precedent.
   - What's unclear: Whether "one test per entity" is literal (5 files) or logical (5 test cases, 1 file).
   - Recommendation: Logical (1 file with `it.each`) — matches the `register.integration.test.ts` precedent and is materially easier to maintain. Discuss-phase to confirm.

4. **Q4: After AUDIT-01..05 land, should the GET handlers' `getTenantId()` calls (lines 11–13 of the `[id]/route.ts` files) be tightened to `requireRole('viewer')`?**
   - What we know: LO-03 already fixed GET-list role checks for `/api/projects` and `/api/departments` to `requireRole('viewer')`. But the `[id]` GET handlers on all 5 entities still use bare `getTenantId()` (e.g., `src/app/api/people/[id]/route.ts:12`).
   - What's unclear: Is this in-scope for Phase 54 or deferred?
   - Recommendation: **Out of scope for Phase 54.** This is a read-path concern, while Phase 54 is mutation-path. Document in PROJECT.md carry-forward.

5. **Q5: After Phase 54, should the `personUpdateSchema`/etc. be extended to allow `archivedAt: null` so the legacy PATCH routes can un-archive (matching v5 admin behavior)?**
   - What we know: `register.service.ts:updateRegisterRow` adds `archivedAt: z.union([z.date(), z.null()]).optional()` inside `parseUpdate`. The legacy schemas don't include it. Today: legacy PATCH `{ archivedAt: null }` silently strips the field; v5 admin PATCH un-archives.
   - What's unclear: Do existing legacy callers (`use-people.ts:75-95`) ever want to un-archive? Probably not — they don't expose an un-archive UI.
   - Recommendation: **Keep behavior identical** — the legacy update schemas continue to NOT include `archivedAt`, so passing it through `updateRegisterRow` won't un-archive because Zod strips unknown keys. Document this and assert it in contract tests.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest + tsx + Next | ✓ (assumed — current dev env runs prior phases) | — | — |
| pnpm | `pnpm test`, `pnpm lint`, `pnpm check:mutations-manifest` | ✓ | `10.33.0` [VERIFIED: package.json:5] | — |
| @electric-sql/pglite | New contract tests | ✓ | `^0.4.3` [VERIFIED: package.json:67] | — |
| vitest | All new tests | ✓ | `^2.1.9` [VERIFIED: package.json:97] | — |
| ts-morph | Mutations manifest regen (auto-runs as part of `check:mutations-manifest`) | ✓ | `^27.0.2` [VERIFIED: package.json:94] | — |
| eslint + nordic plugin | AUDIT-07 rule-test | ✓ | eslint `^9` [VERIFIED: package.json:84]; nordic is local `eslint-rules/` | — |
| Neon-http driver | Not used in tests; tests use PGlite | n/a | n/a | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `^2.1.9` (unit + integration); Playwright `^1.59.1` (E2E, not used by this phase) |
| Config file | `vitest.config.ts` (TODO confirm — Phase 54 follows existing pattern; no new config needed) |
| Quick run command | `pnpm test -- src/features/people/__tests__/audit.contract.test.ts` (per file) |
| Full suite command | `pnpm test` followed by `pnpm check:mutations-manifest` and `pnpm lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AUDIT-01 | POST `/api/people` writes 1 `change_log` row with `entity='person', action='REGISTER_ROW_CREATED'`; PATCH writes UPDATED; DELETE writes DELETED | integration (PGlite) | `pnpm test -- src/features/people/__tests__/audit.contract.test.ts` | ❌ Wave 0 |
| AUDIT-02 | Same for `/api/projects/*`; additional assertion that DELETE leaves `status='archived'` AND `archivedAt != null` | integration (PGlite) | `pnpm test -- src/features/projects/__tests__/audit.contract.test.ts` | ❌ Wave 0 |
| AUDIT-03 | Same for `/api/programs/*`; preserves dependent-row blocker semantics | integration (PGlite) | `pnpm test -- src/features/programs/__tests__/audit.contract.test.ts` | ❌ Wave 0 |
| AUDIT-04 | Same for `/api/departments/*` | integration (PGlite) | `pnpm test -- src/features/departments/__tests__/audit.contract.test.ts` | ❌ Wave 0 |
| AUDIT-05 | Same for `/api/disciplines/*` | integration (PGlite) | `pnpm test -- src/features/disciplines/__tests__/audit.contract.test.ts` | ❌ Wave 0 |
| AUDIT-06 | Rolls up AUDIT-01..05; **already-existing** `register.integration.test.ts:TC-REG-010` asserts 15 rows for 5×{create,update,archive} on the *v5* route — Phase 54 needs the same shape on the *legacy* routes | integration (PGlite) | Reuse `register.integration.test.ts` precedent | ❌ Wave 0 (5 new files OR 1 parameterized — see Q3) |
| AUDIT-07 | `MUTATION_PREFIX_REGEX` matches `execute / promote / apply / cancel / stage`; rule fails when these prefixes appear on an export without `recordChange()` | unit (RuleTester) | `pnpm test -- src/features/change-log/__tests__/require-change-log.rule.test.ts` | ✅ exists; extend with 5 new cases (each valid + invalid pair) |
| AUDIT-07 (cross-check) | After regex change, `pnpm check:mutations-manifest` produces a byte-identical `tests/invariants/mutations.json` (or expected diff committed) | invariant | `pnpm check:mutations-manifest` | ✅ exists at `scripts/generate-mutations-manifest.ts` + `tests/invariants/mutations.json` |

**Grep predicates for "no direct ORM call outside register.service.ts" (Success Criterion 1):**

```bash
# After Phase 54, the following ripgrep commands MUST return zero matches
# in person.service.ts / project.service.ts / program.service.ts /
# department.service.ts / discipline.service.ts:

rg "withTenant\(.*\)\.(insert|update|delete)(Person|Project|Program|Department|Discipline)" src/features/{people,projects,programs,departments,disciplines}/*.service.ts

rg "db\.(insert|update|delete)\(schema\.(people|projects|programs|departments|disciplines)\)" src/features/{people,projects,programs,departments,disciplines}/*.service.ts
```

Read helpers (`db.select(...).from(schema.people)`) are NOT in scope — only mutations.

**Smoke flow for the "create person → update → delete = +3 rows" baseline (Success Criterion 5):**

The TC-REG-010 test at `register.integration.test.ts:280-321` already asserts exactly this for the v5 admin route (15 rows for 5 entities × 3 mutations). Phase 54 contract tests must replicate the per-entity assertion on the *legacy* routes. A per-entity test asserting `change_log.count(*) WHERE entity = '<entity>' AND organization_id = <ORG_ID>` is exactly 3 after a create/update/delete sequence is the canonical baseline.

### Sampling Rate

- **Per task commit:** `pnpm test -- <affected test files>` and `pnpm lint`
- **Per wave merge:** `pnpm test && pnpm check:mutations-manifest && pnpm lint`
- **Phase gate:** Full suite green before `/gsd-verify-work` (Vitest `pnpm test`, Eslint `pnpm lint`, mutations-manifest invariant `pnpm check:mutations-manifest`, plus `pnpm typecheck`)

### Wave 0 Gaps

- [ ] `src/features/people/__tests__/audit.contract.test.ts` — covers AUDIT-01
- [ ] `src/features/projects/__tests__/audit.contract.test.ts` — covers AUDIT-02
- [ ] `src/features/programs/__tests__/audit.contract.test.ts` — covers AUDIT-03
- [ ] `src/features/departments/__tests__/audit.contract.test.ts` — covers AUDIT-04
- [ ] `src/features/disciplines/__tests__/audit.contract.test.ts` — covers AUDIT-05
  - (Or 1 parameterized file under a different location — see Q3.)
- [ ] 5 new test cases (valid + invalid pair each) in `src/features/change-log/__tests__/require-change-log.rule.test.ts` — covers AUDIT-07

*All shared infrastructure (PGlite fixtures, `register.test-fixtures.ts`, `recordChange` mocking precedent, eslint RuleTester wiring) already exists; nothing else to bootstrap.*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes (indirect) | Clerk via `requireRole('admin')` at `src/lib/auth.ts:75`; Phase 54 must continue using `requireRole('admin')` for POST/PATCH/DELETE — the rbac.contract.test.ts files at `src/app/api/people/__tests__/rbac.contract.test.ts` and `src/app/api/projects/__tests__/rbac.contract.test.ts` already lock this |
| V3 Session Management | no (Clerk-owned) | n/a |
| V4 Access Control | yes | `requireRole('admin')` for mutations; `requireRole('viewer')` for GETs on the 5 routes already in place; tenant isolation via `organizationId` predicate inside `register.service.ts` — same model as v5 admin |
| V5 Input Validation | yes | zod schemas (`personCreateSchema` etc.) at the route layer + zod inside `register.service.ts:parseCreate` (defense in depth, intentional duplication) |
| V6 Cryptography | no | n/a |

### Known Threat Patterns for Next.js 14 App Router + Drizzle

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via raw string | Tampering | Drizzle parameterized queries (Phase 54 uses only `tx.insert/update/select` with column objects) |
| Cross-tenant data read via FK | Information Disclosure | `register.service.ts:212-268` already validates `disciplineId/departmentId/programId/leadPmPersonId` against the caller's tenant — CR-04 fix carried over |
| Cross-tenant mutation via path manipulation | Tampering | `register.service.ts:updateRegisterRow` filters WHERE `id=? AND organizationId=?` (line 314, 323); legacy routes inherit this when they delegate |
| Audit-trail bypass via direct ORM call | Repudiation | The whole point of Phase 54 — `eslint-rules/nordic/require-change-log` rule + mutations-manifest invariant + runtime `change-log.coverage.test.ts` all enforce that every mutating export has a `recordChange` path |

## Sources

### Primary (HIGH confidence — direct codebase read)

- `D:\Kod Projekt\Resurs & Projektplanering\src\features\admin\register.service.ts` — full file read
- `D:\Kod Projekt\Resurs & Projektplanering\src\features\change-log\change-log.service.ts` — full file read
- `D:\Kod Projekt\Resurs & Projektplanering\eslint-rules\_mutation-prefix-regex.js` — full file read
- `D:\Kod Projekt\Resurs & Projektplanering\eslint-rules\require-change-log.js` — full file read
- `D:\Kod Projekt\Resurs & Projektplanering\eslint.config.mjs` — full file read
- `D:\Kod Projekt\Resurs & Projektplanering\scripts\generate-mutations-manifest.ts` — full file read
- `D:\Kod Projekt\Resurs & Projektplanering\tests\invariants\mutations.json` — full file read (22 entries)
- `D:\Kod Projekt\Resurs & Projektplanering\tests\invariants\change-log.coverage.test.ts` — full file read
- All 10 route files at `src/app/api/{people,projects,programs,departments,disciplines}/{route,[id]/route}.ts` — full reads
- All 5 legacy services at `src/features/{people,projects,programs,departments,disciplines}/<entity>.service.ts` — full reads
- `D:\Kod Projekt\Resurs & Projektplanering\src\features\admin\__tests__\register.audit.test.ts` — full read (template for AUDIT-06)
- `D:\Kod Projekt\Resurs & Projektplanering\src\features\admin\__tests__\register.integration.test.ts` — full read (HTTP-level template)
- `D:\Kod Projekt\Resurs & Projektplanering\src\features\admin\__tests__\register.test-fixtures.ts` — full read (reusable PGlite bootstrap)
- `D:\Kod Projekt\Resurs & Projektplanering\src\features\change-log\__tests__\require-change-log.rule.test.ts` — full read (RuleTester template for AUDIT-07)
- `D:\Kod Projekt\Resurs & Projektplanering\src\features\change-log\__tests__\mutations-manifest.test.ts` — full read
- `D:\Kod Projekt\Resurs & Projektplanering\src\hooks\use-admin-registers.ts` — full read (v5 admin consumer)
- `D:\Kod Projekt\Resurs & Projektplanering\src\hooks\use-people.ts` — full read (legacy consumer)
- `D:\Kod Projekt\Resurs & Projektplanering\src\lib\tenant.ts` — read of public surface (`withTenant` shape)
- `D:\Kod Projekt\Resurs & Projektplanering\.planning\CODE-REVIEW-2026-05-10.md` — full read (HI-03, MED-03 source findings)
- `D:\Kod Projekt\Resurs & Projektplanering\.planning\REQUIREMENTS.md` — full read
- `D:\Kod Projekt\Resurs & Projektplanering\.planning\ROADMAP.md` — full read
- `D:\Kod Projekt\Resurs & Projektplanering\.planning\STATE.md` — full read
- `D:\Kod Projekt\Resurs & Projektplanering\package.json` — full read (dependency + script verification)

### Secondary (MEDIUM confidence)

- None — every claim in this RESEARCH derives from a primary codebase artifact.

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against `package.json` at HEAD
- Architecture: HIGH — full reads of register.service.ts + all 10 routes + all 5 legacy services + the eslint plugin + the codegen + 3 representative tests
- Pitfalls: HIGH — each pitfall derives from a line-numbered file reference
- AUDIT-07 status: HIGH — verified regex content already includes the 5 verbs as of `e1d5e6d` (2026-05-10); cross-checked against MED-03 entry in CODE-REVIEW

**Research date:** 2026-05-13
**Valid until:** 2026-06-12 (30 days; stable architectural surface — nothing in this domain is moving fast)

## RESEARCH COMPLETE
