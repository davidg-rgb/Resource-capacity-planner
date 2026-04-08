---
phase: 43-admin-register-maintenance
plan: 01
subsystem: admin-registers-backend
tags: [backend, migrations, change-log, admin, register, archive]
requirements: [ADM-01, ADM-02, ADM-03]
dependency_graph:
  requires:
    - change-log.service.recordChange (Phase 35)
    - lib/auth.requireRole (Phase 34)
    - drizzle migrations 0000-0006
  provides:
    - features/admin/register.service (createRegisterRow / updateRegisterRow / archiveRegisterRow / listRegisterRows)
    - GET|POST /api/v5/admin/registers/[entity]
    - PATCH|DELETE /api/v5/admin/registers/[entity]/[id]
    - change_log_entity ENUM value 'program'
    - archived_at columns + indices on departments/disciplines/programs (+ index on projects)
  affects:
    - tests/invariants/mutations.json (now 6 entries — 3 admin register mutations added)
    - eslint.config.mjs nordic/require-change-log glob
key-files:
  created:
    - drizzle/migrations/0007_register_archive.sql
    - drizzle/migrations/0008_change_log_entity_program.sql
    - src/features/admin/register.service.ts
    - src/features/admin/register.schema.ts
    - src/features/admin/__tests__/register.service.test.ts
    - src/features/admin/__tests__/register.dependents.test.ts
    - src/features/admin/__tests__/register.audit.test.ts
    - src/features/admin/__tests__/register.test-fixtures.ts
    - src/app/api/v5/admin/registers/[entity]/route.ts
    - src/app/api/v5/admin/registers/[entity]/[id]/route.ts
    - src/app/api/v5/admin/registers/[entity]/__tests__/contract.test.ts
  modified:
    - src/db/schema.ts (changeLogEntityEnum + archived_at + indices)
    - drizzle/migrations/meta/_journal.json
    - eslint.config.mjs
    - scripts/generate-mutations-manifest.ts
    - tests/invariants/mutations.json
decisions:
  - "register.service is self-transacting: db.transaction(async tx => ...) per mutation; recordChange(input, tx) inside the same tx — preserves ADR-003 (RESEARCH §1 Option A)"
  - "Inline Drizzle writes against schema.* — does NOT call v4 services (they bypass our tx)"
  - "Server-side guard = requireRole('admin') (covers Clerk org:admin/owner). Persona is UX-only per ADR-004 — page-level <PersonaGate> wraps the screen in 43-02"
  - "Project archive sets BOTH status='archived' AND archivedAt to mirror v4 archiveProject"
  - "Un-archive is a PATCH { archivedAt: null } — no separate endpoint (D-11)"
  - "RegisterRow type is `any` to avoid the 5-table union acrobatics; loose typing is contained to the dispatcher"
  - "Migration 0008 is a separate file because Postgres ALTER TYPE ADD VALUE can't run inside a tx (RESEARCH §0)"
  - "Dependent-row blocker rules use the corrected RESEARCH §3 queries, NOT the broken D-10 ones (allocations has no status/end_date; allocation_proposals.personId not target_person_id; projects has no department_id)"
  - "Added admin/**/*.service.ts to nordic/require-change-log eslint glob + manifest generator INCLUDE — keeps ADR-003 enforced for register mutations"
metrics:
  duration: ~50min
  completed: 2026-04-08T19:05:00Z
  tests_added: 45
  files_created: 11
  files_modified: 5
---

# Phase 43 Plan 01: Admin register backend foundation Summary

Self-transacting `register.service.ts` dispatcher + `archived_at` schema migrations + v5 `/api/v5/admin/registers/[entity]` API surface, with universal `change_log` coverage inside the same tx as every mutation.

## What landed

### Schema (Task 1)
- **0007_register_archive.sql** — adds `archived_at timestamptz` to departments/disciplines/programs and `(organization_id, archived_at)` indices on those three tables plus an analogous index on `projects` (column already existed at schema.ts:222).
- **0008_change_log_entity_program.sql** — `ALTER TYPE change_log_entity ADD VALUE IF NOT EXISTS 'program'`. Separate file because Postgres ALTER TYPE ADD VALUE cannot run inside a transaction (RESEARCH §0/§5).
- **src/db/schema.ts** — extended `changeLogEntityEnum` literal array with `'program'`; added `archivedAt` columns + `*_org_archived_idx` indices for departments / disciplines / programs; added the missing `projects_org_archived_idx`.
- **drizzle/migrations/meta/_journal.json** — manually appended idx 7 + 8 entries so `db:migrate` picks them up in order.
- PGlite smoke test in `register.service.test.ts` locks in the new enum value before Task 2 starts using it.

### Service (Task 2)
`src/features/admin/register.service.ts` exports exactly the four functions in ARCHITECTURE §6.11b:

```ts
createRegisterRow({ orgId, actorUserId, entity, data })   → row
updateRegisterRow({ orgId, actorUserId, entity, id, data }) → row
archiveRegisterRow({ orgId, actorUserId, entity, id })    → row
listRegisterRows({ orgId, entity, includeArchived })      → row[]
```

- Every mutation opens its own `db.transaction(async (tx) => ...)` and calls `recordChange(input, tx)` inside the **same** tx — ADR-003 preserved.
- Inlined Drizzle writes against `schema.people | schema.projects | schema.departments | schema.disciplines | schema.programs`. Does **not** call the v4 services (they would bypass our tx — see RESEARCH §1).
- Validation routes through each entity's existing Zod schema (`personCreateSchema`, `projectCreateSchema`, `disciplineCreateSchema`, `programCreateSchema`) plus a tiny new `register.schema.ts` for departments (which only had a hand-rolled TS type pre-Phase 43). Update schemas are extended with `archivedAt: Date | null` to allow PATCH-based un-archive (D-11).
- Project archival sets BOTH `status='archived'` AND `archivedAt = now()` to keep parity with v4 `archiveProject`.
- Dependent-row blockers raise `ConflictError('DEPENDENT_ROWS_EXIST', { entity, id, blockers })` using the **corrected** RESEARCH §3 rules:
  - person: future allocations (`month >= current monthKey`, no `status`/`end_date`), lead PM on a non-archived project, active proposals (column is `personId`)
  - project: future allocations, active proposals
  - department: non-archived people (the spurious `projects.department_id` blocker from D-10 is dropped — that column doesn't exist)
  - discipline: non-archived people
  - program: non-archived projects (`status != 'archived' AND archived_at IS NULL`)
- `listRegisterRows` orders archived rows first using `(archived_at IS NULL) ASC, archived_at DESC, name ASC` — works in both Postgres and PGlite.
- `RegisterRow` is intentionally typed as `any` (5-table union not worth the type acrobatics for a thin internal admin API). The loose typing is contained to the dispatcher.

Coverage:
- `register.service.test.ts` — 12 tests: create + update + archive + list + un-archive + cross-org isolation + unknown-entity rejection + project archive sets status + person create with FK refs.
- `register.dependents.test.ts` — 13 tests across 5 describe blocks (TC-REG-003..007), one per blocker condition + happy path per entity.
- `register.audit.test.ts` — 6 tests: every mutation writes exactly one `change_log` row with the right action / entity / before-after shape.
- `register.test-fixtures.ts` — shared PGlite bootstrap (every test file gets its own PGlite — they're isolated).

### API routes (Task 3)
- **`/api/v5/admin/registers/[entity]/route.ts`** — `GET` (list, supports `?includeArchived=true|false`) and `POST` (create, returns 201).
- **`/api/v5/admin/registers/[entity]/[id]/route.ts`** — `PATCH` (update, also handles un-archive via `{ archivedAt: null }`) and `DELETE` (archive, returns 200 with the archived row).
- Both routes:
  - validate `params.entity` against the `RegisterEntity` union → 404 `NotFoundError` if unknown
  - `await requireRole('admin')` (covers Clerk `org:admin` AND `org:owner` per the existing `lib/auth.ts` role hierarchy)
  - dispatch to `registerService.*` and forward errors through `handleApiError` (maps `ConflictError` → 409, `NotFoundError` → 404, `ValidationError` → 400)
- **Contract test** (`__tests__/contract.test.ts`) — 14 tests:
  - GET list returns 200 with `{ rows }` for every entity (`describe.each([...5 entities])`)
  - POST department / program create + 201
  - GET reflects POSTed rows
  - PATCH update + PATCH un-archive
  - DELETE archive
  - Unknown entity → 404
  - `planner` role → 403, `viewer` role → 403
  - DELETE with dependent row → 409 with `{ error: 'ERR_CONFLICT', message: 'DEPENDENT_ROWS_EXIST', details.blockers.people > 0 }`

### Cross-cutting
- **eslint.config.mjs** — added `src/features/admin/**/*.service.ts` to the `nordic/require-change-log` glob so every future admin mutation must call `recordChange()` (or use the documented escape hatch). Already enforced for register.service.ts — all three mutating exports contain `recordChange(...)` inline.
- **scripts/generate-mutations-manifest.ts** — same glob added to `INCLUDE`. `tests/invariants/mutations.json` now contains 6 entries (3 change-log + `createRegisterRow` / `updateRegisterRow` / `archiveRegisterRow`). `pnpm check:mutations-manifest` is green.

## Verification

```
pnpm tsc --noEmit                                   ✓ clean
pnpm vitest run src/features/admin/__tests__        ✓ 31/31
pnpm vitest run src/app/api/v5/admin                ✓ 14/14
pnpm eslint src/features/admin src/app/api/v5/admin ✓ 0 errors
pnpm check:mutations-manifest                       ✓ in sync (6 entries)
```

Total new tests: **45** (31 service + 14 route).

## Deviations from Plan

### [Rule 3 — Blocker] Server-side persona guard does not exist
- **Found during:** Task 3 (interface inspection)
- **Issue:** Plan §interfaces and §tasks/Task 3 reference `withTenant` as a route wrapper and ask for an "admin persona guard" at the API layer. In reality `withTenant(orgId)` (`src/lib/tenant.ts`) is a query-builder factory, not a request wrapper, and persona is a UX-only concept (per ADR-004 / RESEARCH §4 / CONTEXT D-03). No server-side persona-gate primitive exists.
- **Fix:** Used `requireRole('admin')` (the existing v5 pattern from `proposals/route.ts` and `change-log/route.ts`), which checks the Clerk `orgRole` and resolves the internal `orgId`. This is the same gate that protects every other v5 admin route. The page-level `<PersonaGate allowed={['admin']}>` wrapper will be added in Plan 43-02 where the screens land.
- **Files modified:** `src/app/api/v5/admin/registers/[entity]/route.ts`, `[id]/route.ts`
- **Commit:** 408eeb4

### [Rule 2 — Auto-add critical functionality] eslint glob + mutations manifest
- **Found during:** Task 2 (lint pass)
- **Issue:** `nordic/require-change-log` only fires for files in its include glob; `src/features/admin/**` was not in the glob. Without the addition, register.service.ts would slip past the rule and a future regression could remove the `recordChange()` call without anyone noticing. The mutations manifest had the same blind spot.
- **Fix:** Added `src/features/admin/**/*.service.ts` to both `eslint.config.mjs` and `scripts/generate-mutations-manifest.ts INCLUDE`. Regenerated `tests/invariants/mutations.json` (now 6 entries).
- **Files modified:** `eslint.config.mjs`, `scripts/generate-mutations-manifest.ts`, `tests/invariants/mutations.json`
- **Commit:** e017d7a

### [Rule 3 — Blocker] department had no Zod schema
- **Found during:** Task 2
- **Issue:** `src/features/departments/department.types.ts` only exports a hand-rolled TS `DepartmentCreate` type — no `departmentCreateSchema` exists. The plan tells the executor to "use each entity's existing Zod schema". For department this didn't exist.
- **Fix:** Added a 12-line `src/features/admin/register.schema.ts` exporting `departmentCreateSchema` and `departmentUpdateSchema` (z.string min(1) max(100)). Did not touch v4's `department.types.ts` (out of scope per D-13).
- **Commit:** e017d7a

### [Rule 1 — Bug] DESC NULLS FIRST didn't sort archived rows first under PGlite
- **Found during:** Task 2 (test run)
- **Issue:** First implementation used a `sql\`${col} DESC NULLS FIRST\`` raw fragment. Under PGlite the archived row landed *last*, not first. Likely a Drizzle-pglite parser quirk.
- **Fix:** Switched to a portable expression: `(archived_at IS NULL) ASC, archived_at DESC, name ASC`. Identical semantics, works in both Postgres and PGlite. Test passes.
- **Commit:** e017d7a

### [Rule 1 — Bug] `recordChange` signature mismatch in plan
- **Found during:** Task 2 (interface scan)
- **Issue:** Plan `<interfaces>` block claims `recordChange` takes `{ organizationId, actorUserId, persona, ..., context }`. Real signature (`change-log.service.ts:25`) takes `{ orgId, actorPersonaId, entity, entityId, action, previousValue, newValue, context }` — five field renames. The plan would not have compiled.
- **Fix:** Used the real signature. Mapped `actorUserId` (the executor input field name from ARCHITECTURE §6.11b) to `actorPersonaId` (the change_log column).
- **Commit:** e017d7a

## Authentication gates
None — no external services were touched.

## Known Stubs
None. The dispatcher is fully wired and there are no placeholder values flowing to consumers. The next plan (43-02) consumes this surface via `use-admin-registers.ts`.

## Test code IDs introduced
- TC-REG-003 — person dependent-row blockers (allocations / leadPm / proposals + happy path)
- TC-REG-004 — project dependent-row blockers
- TC-REG-005 — department dependent-row blockers
- TC-REG-006 — discipline dependent-row blockers
- TC-REG-007 — program dependent-row blockers
- TC-REG-audit — every mutation writes one change_log row with correct shape
- (TC-REG-001/002/008..010 land in Plan 43-04 integration tests)

## Self-Check: PASSED
- drizzle/migrations/0007_register_archive.sql — FOUND
- drizzle/migrations/0008_change_log_entity_program.sql — FOUND
- src/features/admin/register.service.ts — FOUND
- src/features/admin/register.schema.ts — FOUND
- src/features/admin/__tests__/register.service.test.ts — FOUND
- src/features/admin/__tests__/register.dependents.test.ts — FOUND
- src/features/admin/__tests__/register.audit.test.ts — FOUND
- src/app/api/v5/admin/registers/[entity]/route.ts — FOUND
- src/app/api/v5/admin/registers/[entity]/[id]/route.ts — FOUND
- src/app/api/v5/admin/registers/[entity]/__tests__/contract.test.ts — FOUND
- commit b88891b — FOUND
- commit e017d7a — FOUND
- commit 408eeb4 — FOUND
