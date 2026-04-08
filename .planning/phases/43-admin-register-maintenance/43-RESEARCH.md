# Phase 43: Admin register maintenance — Research

**Researched:** 2026-04-08
**Domain:** Admin CRUD over tenant registers (people / projects / departments / disciplines / programs) with change-log audit
**Confidence:** HIGH (codebase-grounded; every claim below is a direct file read)

## Summary

Phase 43 is ~90% wiring on top of code that already exists. The v4 services, the change_log writer/reader, the ConflictError taxonomy, the PersonaGate guard, and even the three `REGISTER_ROW_*` action enum values are all already in place. The two load-bearing gaps that drive the shape of every plan are:

1. **v4 services do NOT accept an outer Drizzle `tx`** — they each call `withTenant(orgId).insertX(...)` which internally uses the top-level `db` singleton. There is no `db.transaction()` anywhere in the register-entity services. Assumption A-01 is **WRONG as written**. The register service cannot "wrap an existing v4 call inside one tx that also writes change_log" without first refactoring the v4 services to accept an executor, OR opening its own `db.transaction()` and calling Drizzle directly (bypassing the v4 service layer) within the transaction.
2. **The `change_log_entity` Postgres enum is missing `'program'`** (schema.ts:63–72 currently has `allocation, proposal, actual_entry, person, project, department, discipline, import_batch`). Adding `program` requires an `ALTER TYPE ... ADD VALUE 'program'` migration. This is NOT a schema typing change Drizzle auto-generates cleanly — needs a hand-written SQL step.

The `REGISTER_ROW_CREATED / _UPDATED / _DELETED` action enum values already exist at schema.ts:85–87. D-20 only needs the TS types to pick them up, which they already do via `changeLogActionEnum.enumValues` (change-log.types.ts:6).

**Primary recommendation:** Open `register.service.ts` on top of `db.transaction(async (tx) => { ... })` and call **Drizzle directly** against `schema.*` inside the transaction, passing `tx` to `recordChange()` (which already supports an executor param — change-log.service.ts:25-30). Do NOT try to thread `tx` through the existing v4 services; treat them as read-side helpers for listing and leave their write paths untouched. This matches how Phase 35/36 services work and is the minimum-blast-radius option.

---

## User Constraints (from CONTEXT.md)

### Locked decisions (D-01..D-20)
Already captured verbatim in `43-CONTEXT.md`. Summary of the ones that shape plans:
- D-04/D-05: register.service.ts is the only new service; it dispatches by entity.
- D-08: single migration adding `archived_at` to projects/departments/disciplines/programs (people already has it). See §5 — **note projects already has `archived_at` too** (schema.ts:222) so the migration only touches 3 tables.
- D-10: dependent-row rules for archive — exact SQL sketches in §3.
- D-12: new v5 API routes `src/app/api/v5/admin/registers/[entity]/...`.
- D-14: side-sheet form — **no Sheet primitive exists in src/components/ui**, see §4.
- D-18: admin landing reuses `ChangeLogFeed` — already there, see §4.
- D-19: persona-router one-liner to redirect admin to `/admin`. **`persona-router.tsx` does not exist**; the landing logic lives inside `PersonaProvider` / layout — see §6.
- D-20: three REGISTER_ROW_* action codes — **already in the enum** (schema.ts:85–87), so this decision is effectively already done. No new action codes required.

### Claude's discretion
- 4-plan split (43-01 backend, 43-02 shared UI, 43-03 per-entity pages, 43-04 landing+router+tests) is still the right cut.
- Un-archive UX: PATCH-based per D-11.

### Deferred / out of scope
- Hard delete, bulk ops, CSV export, Clerk `/admin/members` rewrite, reassign-on-archive, persona assignment UI.

---

## 1. Assumption validation (A-01..A-06)

### A-01 — v4 services accept outer `tx`: **FALSE — must rework the approach**

| Service | File | Shape |
|---|---|---|
| person | `src/features/people/person.service.ts` | `createPerson(orgId, data)` → calls `withTenant(orgId).insertPerson(...).returning()`. No tx param. `deletePerson` is a soft-delete via `updatePerson({archivedAt: new Date()})`. |
| project | `src/features/projects/project.service.ts` | `createProject(orgId, data)` / `updateProject(orgId, id, data)` / `archiveProject(orgId, id)` — all call `withTenant(orgId).X().returning()`. No tx. `archiveProject` sets `status='archived'` AND `archivedAt=new Date()`. |
| department | `src/features/departments/department.service.ts` | `createDepartment / updateDepartment / deleteDepartment`. `deleteDepartment` is HARD delete (with usage-count pre-check → ConflictError). No tx. |
| discipline | `src/features/disciplines/discipline.service.ts` | Same pattern as department. Hard delete + usage check. No tx. |
| program | `src/features/programs/program.service.ts` | Same pattern. Hard delete + usage check. No tx. |

`withTenant(orgId)` in `src/lib/tenant.ts:15` is a **plain factory returning pre-scoped builders against the top-level `db` singleton** — it is NOT a transaction. There is no overload that accepts a `tx` handle, and no service in this list calls `db.transaction(...)`.

**Implication for register.service.ts design:**
- Option A (RECOMMENDED): register.service.ts opens `await db.transaction(async (tx) => { ... })` itself and does raw Drizzle `tx.insert(schema.X).values(...)` / `tx.update(schema.X).set(...)` + `recordChange(..., tx)` inside that callback. Skip the v4 write functions entirely; they stay as-is for non-admin callers.
- Option B: Refactor every v4 create/update/delete to accept an optional `tx: Transaction` param, swap `withTenant(orgId).insertX` for `(tx ?? db).insert(schema.X).values({...organizationId: orgId})`. Higher blast radius, touches many call sites. Not recommended for Phase 43.
- Option C (worst): Run v4 service call and `recordChange` in separate txs. Violates ADR-003 ("one tx, one writer") and fails TC-CL-005 invariant tests.

Plan 43-01 should adopt Option A explicitly and the plan description should call out that the dispatcher re-implements the insert/update SQL inline (it's ~5 lines per entity).

### A-02 — change_log has `entity_type`/`entity_id`: **TRUE**

`schema.ts:550-552` — `entity changeLogEntityEnum('entity').notNull(), entityId uuid('entity_id').notNull()`. `recordChange` at `change-log.service.ts:30-44` inserts into exactly these columns. **However** the enum `changeLogEntityEnum` does NOT include `'program'` (schema.ts:63-72). Adding the three new REGISTER_ROW_* actions doesn't need a schema change (those action values already exist at schema.ts:85-87), but register service must insert program rows with `entity: 'program'` which will fail until the enum is extended.

**Action for Plan 43-01:** add a migration step `ALTER TYPE change_log_entity ADD VALUE IF NOT EXISTS 'program';` and update the `changeLogEntityEnum` pgEnum literal in schema.ts to include `'program'`. Note: Postgres requires ALTER TYPE ADD VALUE to run **outside** a transaction block — drizzle-kit generates this correctly but the migration file may need manual splitting if it shares a file with other DDL.

### A-03 — change-log read helper accepts entity filter: **TRUE (with a naming correction)**

The helper is named `getFeed` (not `listChangeLogEntries`) at `src/features/change-log/change-log.read.ts:48`. Its `FeedFilter` type accepts `entity?: ChangeLogEntity[]` (types.ts:14, read.ts:62-64) and `/api/v5/change-log/route.ts:38-42` already parses `?entity=...` CSV. The Phase 41 `ChangeLogFeed` component (`src/components/change-log/change-log-feed.tsx`) reads from `/api/v5/change-log` via `useInfiniteQuery` and accepts `initialFilter: FeedFilter` (line 32-36). D-18 can use it as-is — pass `initialFilter: {}` for "all entities" and let the existing filter bar do the rest.

**CONTEXT.md correction:** replace references to `listChangeLogEntries` with `getFeed`.

### A-04 — Clerk org-role gate on `/admin/*`: **TRUE** — every v4 admin page does `const isAdmin = orgRole === 'org:admin' || orgRole === 'org:owner'` (departments/page.tsx:20-21, programs/page.tsx:20-21). New pages must preserve this guard. Persona guard (kind='admin') stacks on top via `<PersonaGate allowed={['admin']}>`.

### A-05 — No existing TC-REG tests: **TRUE** — no files matching `register` found under `src/features/admin/` (directory does not yet exist) or under any `__tests__`.

### A-06 — `programs` table shape: **TRUE** — `schema.ts:158-174`:
```
id uuid pk, organizationId uuid fk, name varchar(200) notNull,
description varchar(500) nullable, createdAt, updatedAt
```
Only `name` + `description` as user-editable fields (matches D-17). `departments` has only `name` (schema.ts:129-140, no parent column — **D-17 "parent" column for departments is aspirational; the schema has no parent**). `disciplines` has `name` + `abbreviation` (schema.ts:143-155) — **no `color` column; D-17 "color" is also aspirational**. Planner must either drop these columns from the spec or add them to the migration. Recommendation: drop from D-17 for v5.0 scope and note as post-v5.0 polish.

---

## 2. Existing v4 admin pages (UX pattern to match/replace)

**File:** `src/app/(app)/admin/departments/page.tsx` (and nearly identical `disciplines/page.tsx`, `programs/page.tsx`)

Pattern observed:
- Client component (`'use client'`), uses `useAuth` from Clerk for `orgRole` gate.
- Hooks from `src/hooks/use-reference-data.ts`: `useDepartments()`, `useDepartment(id)`, `useCreateDepartment()`, `useUpdateDepartment()`, `useDeleteDepartment()`. Query key is `['departments']`, etc. Mutations invalidate on success (use-reference-data.ts:56-58).
- Inline edit: `editingId` state swaps the row into an input form; submit via mutation; `resetForm()` clears state.
- Add row: `addMode` state appends an input row at the bottom of the table. "Add Department" button below.
- Delete confirmation: two-stage — click Trash → `checkDeleteId` set → if `useDepartment(id).usageCount > 0` show inline red "Assigned to N people" message with X-out; else show "Confirm Delete" button that actually runs the mutation. A `window.confirm()` is ALSO called before the mutation (defense-in-depth).
- Icons: `lucide-react` — `Check, Pencil, Plus, ShieldAlert, Trash2, X`. Colors via theme tokens (`bg-primary`, `text-on-surface-variant`, `border-outline-variant/15`).
- No Sheet/Drawer, no AlertDialog. Edit happens inline in the row.
- `programs/page.tsx:1-40` differs only by adding a `description` textarea state.
- `members/page.tsx` is the Clerk-org-members page — **leave untouched per D-01**.
- `change-log/page.tsx` already exists and renders `<ChangeLogFeed initialFilter={buildPersonaDefault(persona)} projects={[]} people={[]} />`. Per D-01 the planner can either keep it or redirect it; redirecting to `/admin` is lower risk since external links may reference it.

**Divergence for v5 pattern:** Phase 43 moves from inline-edit to a side-sheet form. Planner must either (a) add a Sheet primitive (see §4) or (b) reuse the existing `src/components/drawer/` generic drawer component that Phase 40/41 already use for the cross-persona drill-down drawer.

---

## 3. Dependent-row blocker queries (D-10)

All queries use Drizzle and assume the register service is in a tx (`tx` variable) — replace `tx` with `db` for a pre-check outside a tx.

### person archival blockers
```ts
// Any future/current approved allocations
const [allocCount] = await tx
  .select({ n: sql<number>`count(*)` })
  .from(schema.allocations)
  .where(and(
    eq(schema.allocations.organizationId, orgId),
    eq(schema.allocations.personId, id),
    gte(schema.allocations.month, `${todayYMD}-01`),
  ));
// Note: the v5 `allocations` table does NOT have `status` or `end_date` columns
// (schema.ts:240-273). It has person/project/month/hours. So the D-10 rule
// "status='approved' AND end_date >= today" must be rewritten as
// "month >= current month". Flag to planner: D-10 references columns that
// don't exist on `allocations` — they exist on `allocation_proposals`.

// Lead PM on any non-archived project
const [leadPmCount] = await tx
  .select({ n: sql<number>`count(*)` })
  .from(schema.projects)
  .where(and(
    eq(schema.projects.organizationId, orgId),
    eq(schema.projects.leadPmPersonId, id),
    ne(schema.projects.status, 'archived'),
  ));

// Active allocation proposals targeting this person
const [propCount] = await tx
  .select({ n: sql<number>`count(*)` })
  .from(schema.allocationProposals)
  .where(and(
    eq(schema.allocationProposals.organizationId, orgId),
    eq(schema.allocationProposals.personId, id),
    eq(schema.allocationProposals.status, 'proposed'),
  ));
// Note: the column is `personId`, not `target_person_id` as D-10 says.
// `allocation_proposals` has `personId` (schema.ts:647) + `targetDepartmentId`
// (schema.ts:665). D-10 wording is incorrect — flag to planner.
```

### project archival blockers
```ts
// Future allocations on this project
const [allocCount] = await tx
  .select({ n: sql<number>`count(*)` })
  .from(schema.allocations)
  .where(and(
    eq(schema.allocations.organizationId, orgId),
    eq(schema.allocations.projectId, id),
    gte(schema.allocations.month, `${todayYMD}-01`),
  ));

// Active proposals on this project
const [propCount] = await tx
  .select({ n: sql<number>`count(*)` })
  .from(schema.allocationProposals)
  .where(and(
    eq(schema.allocationProposals.organizationId, orgId),
    eq(schema.allocationProposals.projectId, id),
    eq(schema.allocationProposals.status, 'proposed'),
  ));
```

### department archival blockers
```ts
// People still assigned
const [peopleCount] = await tx
  .select({ n: sql<number>`count(*)` })
  .from(schema.people)
  .where(and(
    eq(schema.people.organizationId, orgId),
    eq(schema.people.departmentId, id),
    isNull(schema.people.archivedAt),
  ));
// D-10 also says "non-archived projects.department_id" — but the `projects`
// table has NO `department_id` column (schema.ts:210-237 — only programId,
// leadPmPersonId). Flag: drop that blocker from D-10, it's referencing a
// column that does not exist.
```

### discipline archival blockers
```ts
const [peopleCount] = await tx
  .select({ n: sql<number>`count(*)` })
  .from(schema.people)
  .where(and(
    eq(schema.people.organizationId, orgId),
    eq(schema.people.disciplineId, id),
    isNull(schema.people.archivedAt),
  ));
```

### program archival blockers
```ts
const [projectCount] = await tx
  .select({ n: sql<number>`count(*)` })
  .from(schema.projects)
  .where(and(
    eq(schema.projects.organizationId, orgId),
    eq(schema.projects.programId, id),
    ne(schema.projects.status, 'archived'),
  ));
// Once projects.archived_at is added, also OR with isNull(archivedAt).
```

**Throw shape:**
```ts
throw new ConflictError('DEPENDENT_ROWS_EXIST', {
  entity, id,
  blockers: { allocations: n, proposals: n, people: n, projects: n, leadPm: n }
});
```
`ConflictError` lives at `src/lib/errors.ts:59` — constructor accepts `(message, details?)`.

---

## 4. Existing primitives to reuse

| Primitive | Path | Notes |
|---|---|---|
| **Sheet / side-drawer** | **DOES NOT EXIST** as a ui/sheet.tsx. Use the existing generic drawer under `src/components/drawer/` (Phase 40/41 drill-down drawer) OR add a new `src/components/ui/sheet.tsx` shadcn-style primitive. | `src/components/ui/` directory does not exist — `src/components/` has topical folders (dialogs, drawer, timeline, etc.) but no shadcn `ui/` folder. Recommendation: add `src/components/ui/sheet.tsx` as a new radix-ui Sheet wrapper OR extend `drawer/` with a "form drawer" variant. Planner decides — Plan 43-02 scope. |
| **AlertDialog** | **DOES NOT EXIST**. v4 uses `window.confirm()` (departments/page.tsx:70) + an inline two-stage "Confirm Delete" button. Existing dialog at `src/components/dialogs/historic-edit-dialog.tsx` is the closest analogue but is purpose-specific. | Recommendation: add `src/components/ui/alert-dialog.tsx` (radix AlertDialog) in Plan 43-02, reuse for all archive confirmations. |
| **Toast** | Search returned no matches in `src/components/` or `src/lib/`. v4 pages use inline error state + red text. | Planner should either add `sonner` / `react-hot-toast` in Plan 43-02, or use inline error state matching v4 convention. Recommend `sonner` — 1 file install, already-familiar API. **Flag:** this is a new dependency, worth confirming with user before adding. |
| **TanStack Query hook pattern** | `src/hooks/use-reference-data.ts:14-60` | See the useDisciplines / useCreateDiscipline example above. Pattern: `queryKey: ['disciplines']`, mutation invalidates on success, throws `new Error(err.message)` from API response. Plan 43-02's `use-admin-registers.ts` should copy this shape but key on `['admin-registers', entity, {includeArchived}]` and invalidate both the list AND `['change-log']`. |
| **ChangeLogFeed** | `src/components/change-log/change-log-feed.tsx:32` | Props: `{ initialFilter: FeedFilter, projects?: ProjectLite[], people?: PersonLite[] }`. Already wired to `/api/v5/change-log` via useInfiniteQuery. D-18 page = `<ChangeLogFeed initialFilter={{}} projects={...} people={...} />`. |
| **PersonaGate** | `src/features/personas/persona-route-guard.ts:38` | `<PersonaGate allowed={['admin']}>{children}</PersonaGate>`. Shows "switch persona" hint card for non-admin personas. |
| **withTenant** | `src/lib/tenant.ts:15` | Read helpers only; NOT a transaction wrapper. |
| **recordChange(input, tx?)** | `src/features/change-log/change-log.service.ts:25` | Already accepts an optional executor param (loosely typed as `Pick<typeof db, 'insert'>`) — a `tx` handle passes type-check. |
| **ConflictError** | `src/lib/errors.ts:59` | `new ConflictError(message, details?)`. `handleApiError` at `src/lib/api-utils.ts` maps it to HTTP 409. |

---

## 5. archived_at migration

**Location:** `drizzle/migrations/` (config at `drizzle.config.ts` — `out: './drizzle/migrations'`). Existing files go `0000_tearful_the_initiative.sql` through `0006_import_status_staged_committed.sql`. Next file = `0007_*.sql` (drizzle-kit generates the slug).

**Current state:**
- `people.archivedAt` — EXISTS (schema.ts:194).
- `projects.archivedAt` — **EXISTS** (schema.ts:222). D-08 says "add to projects" — **this is unnecessary**; only the index may need adding. CONTEXT.md should be corrected.
- `departments.archivedAt` — MISSING (schema.ts:129-140 only has id/orgId/name/createdAt, no updatedAt either).
- `disciplines.archivedAt` — MISSING (schema.ts:143-155, same shape).
- `programs.archivedAt` — MISSING (schema.ts:158-174).

**Required ALTER statements (migration `0007_register_archive.sql`):**
```sql
ALTER TABLE "departments" ADD COLUMN "archived_at" timestamp with time zone;
ALTER TABLE "disciplines" ADD COLUMN "archived_at" timestamp with time zone;
ALTER TABLE "programs" ADD COLUMN "archived_at" timestamp with time zone;

CREATE INDEX "departments_org_archived_idx" ON "departments" ("organization_id","archived_at");
CREATE INDEX "disciplines_org_archived_idx" ON "disciplines" ("organization_id","archived_at");
CREATE INDEX "programs_org_archived_idx" ON "programs" ("organization_id","archived_at");
CREATE INDEX "projects_org_archived_idx" ON "projects" ("organization_id","archived_at");

-- Separate statement (cannot run inside a transaction block in drizzle-kit output):
ALTER TYPE "change_log_entity" ADD VALUE IF NOT EXISTS 'program';
```

Also update `src/db/schema.ts`:
- departments pgTable: add `archivedAt: timestamp('archived_at', { withTimezone: true })`, add `updatedAt`, add `index('departments_org_archived_idx').on(t.organizationId, t.archivedAt)`.
- disciplines pgTable: same.
- programs pgTable: add `archivedAt` + index (updatedAt already exists).
- projects pgTable: add the missing archived index (column already exists).
- changeLogEntityEnum: add `'program'` to the literal array.

**Important:** the drizzle-kit-generated file for `ALTER TYPE ... ADD VALUE` may need the `--breakpoints` flag or manual splitting into two migration files, because Postgres requires ADD VALUE to run outside a transaction. Standard drizzle workaround: put the ALTER TYPE in its own migration file `0008_change_log_entity_program.sql` and let drizzle-kit apply them sequentially.

---

## 6. Phase 41 patterns to copy

| What | Location | Notes |
|---|---|---|
| `assertPersonaOrRedirect` | `src/features/personas/persona-route-guard.ts:20` | Pure function: `(persona, allowed[]) => { allowed: true } | { allowed: false }`. |
| `PersonaGate` wrapper | `src/features/personas/persona-route-guard.ts:38` | Client component, reads `usePersona()`, renders children or hint card. Wrap each `/admin/<entity>/page.tsx` body in `<PersonaGate allowed={['admin']}>`. Keep the Clerk `orgRole` check too (see A-04). |
| `ChangeLogFeed` component | `src/components/change-log/change-log-feed.tsx` | Props: `initialFilter, projects?, people?`. Used in `src/app/(app)/admin/change-log/page.tsx:50`. D-18 page copies that file 1:1 with `initialFilter={{}}`. |
| Change-log API | `src/app/api/v5/change-log/route.ts` | GET with `?entity=person,project,...` CSV filter already supported. No changes needed. |
| Proposal queue archived/toggle pattern | **Not found in Phase 41 proposal pages** (proposals pages live under `src/app/api/v5/proposals/` for API; the UI queue page wasn't grepped here). | Planner may need to look at the proposal queue page directly during Plan 43-02 if they want to mimic its "show archived" toggle placement. |
| `persona-router.tsx` one-line landing change (D-19) | **File does not exist at that path.** | Landing logic is inside `PersonaProvider` at `src/features/personas/persona.context.tsx:52`. A fresh `grep` in Plan 43-04 should find the default-landing switch (whatever file maps `persona.kind → URL`). The change is still a one-liner: `case 'admin': return '/admin'`. |

---

## 7. Risks & gotchas

1. **tx threading is not as-advertised (A-01).** Biggest risk to the plan structure. Plan 43-01 must either inline the Drizzle writes inside `db.transaction(...)` in register.service.ts OR do a v4 service refactor (larger scope). Recommendation locked as Option A in §1.
2. **`change_log_entity` enum missing `'program'`.** Plan 43-01 needs a TWO-file migration (because ALTER TYPE ADD VALUE can't run in a tx). Easy to miss; will blow up at first `recordChange({ entity: 'program', ... })` call otherwise.
3. **D-10 references columns that don't exist:**
   - `allocations.status` / `allocations.end_date` — NOT present. The `allocations` table only has (person, project, month, hours). Rule rewrite: "any allocation row where `month >= current_month`".
   - `allocation_proposals.target_person_id` — column is actually named `personId` (schema.ts:647).
   - `projects.department_id` — does NOT exist. Drop the "department archival blocked by projects" rule.
4. **D-17 columns that don't exist in schema:** `departments.parent`, `disciplines.color`. Either drop from v5.0 spec or add to the migration. Recommend drop (not in scope for Phase 43 per D-06 "extend existing schemas if needed" vs. scope creep).
5. **D-08 says "add archived_at to projects"** — already exists (schema.ts:222). Migration only touches departments/disciplines/programs + indices.
6. **D-20 "add REGISTER_ROW_* to the ChangeLogAction union"** — already there (schema.ts:85-87). The Zod `z.enum(changeLogActionEnum.enumValues)` in `change-log.service.ts:14` picks them up automatically. No work required.
7. **No Sheet / AlertDialog / toast primitive exists.** Plan 43-02 must either add them (new deps: radix-ui Sheet + AlertDialog, sonner for toasts) or repurpose existing `drawer/` + inline confirmations. Radix-ui is already a transitive dep in most Next.js shadcn setups; confirm in package.json before committing. **Flag for user:** adding `sonner` is a new runtime dep. If the user prefers no new deps, Plan 43-02 should use inline error banners matching v4 UX.
8. **v4 admin pages use `window.confirm()`** — not great UX, but works. If `alert-dialog.tsx` can't land in time, falling back to `window.confirm()` is acceptable for the archive action.
9. **`persona-router.tsx` does not exist.** D-19's "one-line change" target needs to be re-discovered during planning — the real landing logic lives in `persona.context.tsx` or `(app)/layout.tsx`. Flag for Plan 43-04 Wave 0.
10. **No existing register test fixtures.** Plan 43-04 writes TC-REG-001..010 from scratch. Should follow the pattern in `src/features/change-log/__tests__/` for the tx-based integration tests.
11. **`use-reference-data.ts` hooks point at v4 routes** `/api/disciplines`, `/api/departments`, `/api/programs` (not `/api/v5/...`). Leave them alone per D-13. New hooks in `use-admin-registers.ts` point at `/api/v5/admin/registers/[entity]`.

---

## Confidence assessment

| Area | Level | Reason |
|---|---|---|
| Service refactor scope (A-01) | HIGH | Read all 5 v4 service files top-to-bottom + `tenant.ts` + `recordChange`. |
| Schema/migration scope (§5, A-02, A-06) | HIGH | Direct reads of `schema.ts` for every table + enum + migrations directory listing. |
| Dependent-row queries (§3) | HIGH | Every table/column referenced verified against schema.ts. Several D-10 errors found and flagged. |
| Existing primitives (§4) | MEDIUM-HIGH | Glob confirmed no `ui/sheet.tsx` / `ui/alert-dialog.tsx` / toast files. ChangeLogFeed + PersonaGate verified by direct read. |
| Phase 41 persona-router location (D-19) | LOW | `persona-router.tsx` not found; reported as risk. Planner must grep during 43-04 Wave 0. |
| Test infrastructure | MEDIUM | Confirmed no register tests exist; existing change-log `__tests__/` gives a pattern. Vitest config not read in this pass. |

**Valid until:** 2026-05-08 (30 days — v5.0 codebase is moving fast, assumptions may drift).
