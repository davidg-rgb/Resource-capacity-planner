# Phase 43: Admin register maintenance — Context

**Gathered:** 2026-04-08
**Status:** Ready for research / planning
**Mode:** `--auto` (recommended defaults selected by Claude; review and override before planning if needed)

<domain>
## Phase Boundary

Deliver Admin self-service CRUD for the five register entities (People, Projects, Departments, Disciplines, Programs) under a unified v5.0 pattern: list (active default + archived toggle) → side-sheet create/edit form → archive with dependent-row blocking → every mutation written through `recordChange` into `change_log`. Admin landing route becomes the global `change_log` feed.

In scope:
- **Five register list views** under `/admin/<entity>`: `people`, `projects`, `departments`, `disciplines`, `programs`. Each = table + "show archived" toggle + "New" button + side-sheet form for create/edit (UX-V5-14 / S14, ADM-01).
- **`features/admin/register.service.ts`** (NEW) — thin coordinator wrapping the existing v4 `person.service`, `project.service`, `department.service`, `discipline.service`, `program.service`. Every mutation wrapped in a single Drizzle transaction that calls the underlying service AND `recordChange` (ADR-003). Matches ARCHITECTURE §6.11b verbatim (ADM-03).
- **Archive + dependent-row blocking** (ADM-02): archiving raises `ConflictError` code `DEPENDENT_ROWS_EXIST` when the row has dependents that would be orphaned (see D-10 for the per-entity rules). Archived rows hidden from default list; toggle exposes them; archived rows are read-only in forms.
- **v5 API surface** under `/api/v5/admin/registers/[entity]` + `/[entity]/[id]` with GET / POST / PATCH / DELETE (archive), AppError taxonomy, `withTenant()` wrapper, persona=admin guard (ARCHITECTURE §1410-1413).
- **Admin landing view** = `/admin` (or `/admin/change-log`) rendering the global `change_log` feed across ALL entities via existing Phase 41 `change-log.read.ts` helper — no new read code, just point the route at it (ADM-04, TC-PSN-001).
- **Schema additions**: add `archived_at timestamp null` to `projects`, `departments`, `disciplines`, `programs` tables if missing (people already has it per src/db/schema.ts:194). One Drizzle migration file; `person_allocations` / existing active queries already filter on status or active rows, verify no regression.
- **Change-log action codes** `REGISTER_ROW_CREATED` / `REGISTER_ROW_UPDATED` / `REGISTER_ROW_DELETED` added to the `ChangeLogAction` union (ARCHITECTURE §817-819).

Out of scope (deferred):
- Hard delete — never exposed to admins (ARCHITECTURE §978). Archive is the only destructive primitive.
- Bulk edit / bulk archive — post-v5.0 polish.
- Import/export from register screens — Excel import pipeline is Phase 38's responsibility; no hooks here.
- Multi-tenant org switcher on the register screens — assume single active org per session.
- Role management (Clerk org members) — the existing `/admin/members` Clerk wiring stays as-is and is NOT touched here. "People" register = `people` DB rows (resources/headcount), distinct from Clerk members.
- Audit log detail page per row — the global change-log feed is enough for v5.0.
- Persona assignment UI (person → persona mapping) — PersonaProvider still reads from localStorage per Phase 34.

</domain>

<decisions>
## Implementation Decisions

### Routes & file layout
- **D-01:** Consolidate all admin register pages under the existing `src/app/(app)/admin/` route group. Final layout:
  - `src/app/(app)/admin/page.tsx` — NEW, renders the global change-log feed (admin landing, ADM-04).
  - `src/app/(app)/admin/change-log/page.tsx` — KEEP; becomes a thin wrapper or just redirects to `/admin` (pick whichever avoids breaking Phase 41 links).
  - `src/app/(app)/admin/people/page.tsx` — NEW (no v4 equivalent; the existing `/admin/members` is Clerk-only and stays separate).
  - `src/app/(app)/admin/projects/page.tsx` — NEW.
  - `src/app/(app)/admin/departments/page.tsx` — REWRITE on top of v5 register pattern (v4 page exists, uses `use-reference-data` hooks directly; replace body, keep route).
  - `src/app/(app)/admin/disciplines/page.tsx` — REWRITE as above.
  - `src/app/(app)/admin/programs/page.tsx` — REWRITE as above.
- **D-02:** Single shared component `src/components/admin/RegisterTable.tsx` drives every list view. Props: `entity`, column defs, Zod schema, `formComponent`. Five per-entity form components in `src/components/admin/forms/` (`PersonForm.tsx`, `ProjectForm.tsx`, `DepartmentForm.tsx`, `DisciplineForm.tsx`, `ProgramForm.tsx`) — forms diverge enough (person has department FK, project has lead_pm + dates, etc.) that one mega-form would be worse than five small ones.
- **D-03:** Persona guard: all `/admin/*` routes allowed only for `['admin']` via the Phase 41 `assertPersonaOrRedirect` helper. Non-admin personas get the "switch persona" hint card, same pattern as Phase 41.

### Service layer
- **D-04:** New file `src/features/admin/register.service.ts` implements exactly the surface in ARCHITECTURE §6.11b: `createRegisterRow`, `updateRegisterRow`, `archiveRegisterRow`, `listRegisterRows`. No other public exports.
- **D-05:** Register service is a **thin coordinator** — it does NOT re-implement validation or SQL. It dispatches by `entity` to the existing v4 services (`person.service`, `project.service`, `department.service`, `discipline.service`, `program.service`). Each branch runs INSIDE a single Drizzle transaction that also calls `recordChange`. This preserves ADR-003 (one tx, one writer) and the universal-log invariant for admin-driven mutations (ARCHITECTURE §988).
- **D-06:** Validation uses each entity's existing Zod schema (`people.schema.ts`, `project.schema.ts`, `department.schema.ts`, `discipline.schema.ts`, `program.schema.ts`). If a schema is missing a field the admin form needs, extend the existing schema — do not create a parallel one in `features/admin/`.
- **D-07:** The existing v4 services do NOT currently write `change_log`. Register service wraps them; direct callers of the v4 services (outside admin) remain un-logged, and that is fine for v5.0 — only admin-driven mutations need the register log entries. Non-admin paths that mutate these tables are already logged via proposals/allocations/etc.

### Archive + dependent-row rules
- **D-08:** Add `archived_at timestamp with time zone null` to `projects`, `departments`, `disciplines`, `programs` tables via a single new migration `src/db/migrations/NNNN_register_archive.sql`. Add an `(organization_id, archived_at)` index per table (mirrors `people_org_archived_idx` at schema.ts:202). `people.archived_at` already exists — no change.
- **D-09:** `listRegisterRows({ includeArchived: false })` filters `WHERE archived_at IS NULL`. `true` returns both, order by `archived_at DESC NULLS FIRST, name ASC`.
- **D-10:** Dependent-row rules for `archiveRegisterRow` — raise `ConflictError('DEPENDENT_ROWS_EXIST', { entity, id, blockers })` when:
  - **person**: has any `person_allocations` row where `end_date >= today` AND `status = 'approved'`; OR is the `lead_pm_person_id` on any non-archived project; OR is referenced by any active `allocation_proposals.target_person_id`.
  - **project**: has any `person_allocations` row where `end_date >= today` AND `status = 'approved'`; OR any active `allocation_proposals.project_id`.
  - **department**: has any non-archived `people.department_id` row; OR any non-archived `projects.department_id` row.
  - **discipline**: has any non-archived `people.discipline_id` row.
  - **program**: has any non-archived `projects.program_id` row.
  `blockers` in the error payload contains counts: `{ allocations?: n, proposals?: n, people?: n, projects?: n }` so the UI can render a specific "3 active allocations" hint. Tested by TC-REG dependent-row tests.
- **D-11:** Archive is soft-delete: sets `archived_at = now()`. Un-archive is an `updateRegisterRow` call that nulls `archived_at` — no special API endpoint, just PATCH `{ archivedAt: null }`. Admin form must allow editing an archived row's archived state.

### API routes
- **D-12:** NEW files under `src/app/api/v5/admin/registers/`:
  - `[entity]/route.ts` — GET (list, query `?includeArchived=true`) + POST (create).
  - `[entity]/[id]/route.ts` — PATCH (update) + DELETE (archive).
  `[entity]` is validated against the `RegisterEntity` union; unknown entity → 404 `NotFoundError`. All routes wrapped with `withTenant()` + admin persona guard. Error taxonomy: `ValidationError` (400), `NotFoundError` (404), `ConflictError` (409, includes `DEPENDENT_ROWS_EXIST`), generic 500. TanStack Query hooks live in `src/hooks/use-admin-registers.ts` (NEW).
- **D-13:** The v4 `use-reference-data` hooks currently backing `/admin/departments|disciplines|programs|members` are NOT removed in this phase — other v4 screens may still call them. Rewritten admin pages point at the new v5 hooks instead; v4 hooks become orphaned-but-not-deleted (cleanup is a post-v5.0 concern).

### UI details
- **D-14:** Side-sheet form = the existing `Sheet` primitive (same one Phase 40/41 use for drill-down drawer). Opens on "New" button click or row edit click. Submit button does optimistic create/update via TanStack mutation. On `DEPENDENT_ROWS_EXIST` error, show a destructive toast with the blocker counts and keep the row un-archived.
- **D-15:** Table empty state: "Inga rader. Lägg till" inline button (matches ARCHITECTURE §1722 for S14). Skeleton rows while loading. Toast + retry on error.
- **D-16:** Archive button is a small icon in the row-actions cell with a confirmation `AlertDialog` ("Arkivera X? Raden göms från standardvyn.") — matching the v4 `/admin/departments` delete-confirmation pattern (Pencil/Trash2 icons already in use there per page scout).
- **D-17:** Columns per entity (keep minimal, extend later if asked):
  - people: name, email, discipline, department, employment %, archived
  - projects: name, code, lead PM, department, program, status, start–end, archived
  - departments: name, parent, archived
  - disciplines: name, color, archived
  - programs: name, description, archived

### Change-log landing route
- **D-18:** `/admin/page.tsx` reuses the Phase 41 `change-log.read.ts#listChangeLogEntries` helper with NO entity filter (scope=all). Renders with the existing `ChangeLogFeed` component from Phase 41 — do not fork it. Adds a top-bar filter `entity ∈ { all, person, project, department, discipline, program, allocation, proposal, actual, import }` that passes through to the read helper.
- **D-19:** Default persona redirect: when PersonaProvider resolves to `admin`, first-login lands on `/admin` (the change-log feed) — matches ARCHITECTURE §1014 `admin → /admin/change-log`, consolidated to `/admin`. Phase 34 persona-landing-router code at `components/personas/persona-router.tsx` needs a one-line change.

### Change-log action codes
- **D-20:** Add `'REGISTER_ROW_CREATED' | 'REGISTER_ROW_UPDATED' | 'REGISTER_ROW_DELETED'` to the `ChangeLogAction` union in `src/features/change-log/change-log.types.ts` and the matching Zod enum. `context` JSON shape: `{ entity: RegisterEntity, snapshot?: <row>, before?: <row>, after?: <row> }`. Verified by TC-CL-005 invariant + TC-REG audit tests.

</decisions>

<claudes_discretion>
## Left to the planner

- **Split across plans.** Recommend the planner break Phase 43 into ~4 plans:
  1. `43-01` schema migration + register.service.ts + API routes + change-log action codes (backend);
  2. `43-02` shared RegisterTable + form primitives + hooks;
  3. `43-03` five per-entity pages (rewrite departments/disciplines/programs, new people/projects);
  4. `43-04` admin landing change-log feed + persona-router one-liner + TC-REG tests.
  Planner may merge 43-02 into 43-03 if the shared component turns out to be trivial.
- **Un-archive UX.** D-11 says un-archive is a PATCH. If the planner finds this awkward in the form, a dedicated "Återställ" button on archived rows is acceptable — still a PATCH under the hood.
- **Whether to touch `/admin/members`.** D-01 keeps it untouched. If during implementation the planner discovers it's confusing to have both `/admin/members` (Clerk) and `/admin/people` (register), they may add a banner clarifying "Members = login access, People = resources" — do NOT merge them.
- **Archived-toggle placement.** Table header toggle vs. tab-pill above the table — planner's call, follow whatever Phase 41 used for the proposal queue filter for consistency.

</claudes_discretion>

<assumptions>
## Assumptions (flag if wrong)

- **A-01:** The existing v4 `department.service`, `discipline.service`, `program.service`, `project.service`, `person.service` expose create/update/delete functions with Drizzle transactions that can be passed an outer `tx`. If they do not accept an outer tx, research phase must note this — the register service needs to open the tx at its level, so the v4 services may need a tx-accepting overload. (Likely similar to how Phase 35's services already do this.)
- **A-02:** `change_log` already has `entity_type` / `entity_id` columns from Phase 35; register entries use these plus the action codes in D-20. No schema change to `change_log` itself.
- **A-03:** Phase 41's `change-log.read.ts#listChangeLogEntries` already accepts an optional entity filter and returns rows in reverse-chronological order with actor/persona metadata. If it does not, the admin landing route (D-18) needs a small extension — capture in RESEARCH.md.
- **A-04:** Clerk `orgRole === 'org:admin' || 'org:owner'` is the source of truth for "is the current user allowed to hit `/admin/*` at all" (see v4 `/admin/departments/page.tsx`). Persona (kind='admin') is an orthogonal UX concept from Phase 34. Both guards must pass: Clerk org role AND persona selection.
- **A-05:** No existing test file covers register CRUD + dependent-row blocking. Phase 43 creates TC-REG-001..010 fresh. Phase 44 fills any §15 gaps.
- **A-06:** `programs` table has `name` (required) and `description` (optional) columns only. If more fields are needed for the UI, defer them to a polish pass.

</assumptions>

<non_goals>
## Non-goals (hard no)

- No new register entities beyond the five listed (no adding clients, vendors, cost centers, etc.).
- No hard delete. Ever.
- No bulk operations.
- No CSV export from register tables (defer to post-v5.0).
- No touching the Clerk `/admin/members` flow.
- No rework of the v4 `use-reference-data` hooks — leave them orphaned.
- No new change-log action codes beyond the three REGISTER_ROW_* codes.

</non_goals>

<open_questions>
## Open questions (answer before plan approval, or accept default)

- **Q-01:** Should archived rows appear in read models used by other personas (PM timeline, LM heatmap)? **Default:** no — archived = fully hidden from non-admin views; only the admin register with `includeArchived=true` shows them.
- **Q-02:** When archiving a person with active allocations, should we offer a "reassign then archive" flow? **Default:** no — surface the blocker, require the admin to re-allocate manually first. Reassign-on-archive is a post-v5.0 feature.
- **Q-03:** Does `projects.lead_pm_person_id` need a NOT NULL constraint relaxation to allow archiving the PM without breaking the project? **Default:** already nullable per v4 schema; no change. If not nullable, add to D-10 person rule: project archival blockers include "is lead PM of N projects".

</open_questions>

## Next steps

1. Review this CONTEXT.md; override any decision that looks wrong before research runs.
2. Run `/gsd:plan-phase 43` — researcher reads this doc, validates A-01..A-06 against the codebase, then planner produces 43-01..43-04 PLANs.
3. After plans land, `/gsd:execute-phase 43`.
