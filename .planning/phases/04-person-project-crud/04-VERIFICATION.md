---
phase: 04-person-project-crud
verified: 2026-03-26T14:30:00Z
status: human_needed
score: 11/11 must-haves verified
human_verification:
  - test: "Create a person and confirm they appear in the Team list"
    expected: "Form submits, POST /api/people returns 201, person row appears in table without page reload"
    why_human: "TanStack Query cache invalidation and real-time list update requires browser execution"
  - test: "Edit a person and confirm the updated values are reflected in the list"
    expected: "Form pre-populated with existing values, PATCH succeeds, row updates in place"
    why_human: "Form pre-fill and optimistic update behavior requires browser execution"
  - test: "Delete a person and confirm the confirmation dialog appears and they are removed from the list"
    expected: "window.confirm fires, DELETE /api/people/:id returns 204, row removed from table"
    why_human: "window.confirm interaction and DOM removal require browser execution — this directly corresponds to Success Criterion 3"
  - test: "Create a project and confirm it appears in the Projects list"
    expected: "Form submits, POST /api/projects returns 201, project row appears in table"
    why_human: "TanStack Query list refresh requires browser execution"
  - test: "Archive a project and confirm it disappears from the default list"
    expected: "window.confirm fires, DELETE /api/projects/:id returns 204, project removed from table"
    why_human: "Archive confirmation flow and list filter (ne status 'archived') requires browser execution"
  - test: "Attempt to create a duplicate project name in the same org"
    expected: "Server returns HTTP 409 with ConflictError, UI shows error message"
    why_human: "Requires a live database with existing data to trigger the unique_violation path"
---

# Phase 4: Person & Project CRUD Verification Report

**Phase Goal:** Users can create, edit, and delete people and projects — the domain entities that the allocation grid depends on.
**Verified:** 2026-03-26T14:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can see a list of people in the Team page | VERIFIED | `team/page.tsx` calls `usePeople()`, renders table with `people?.map(...)` |
| 2 | User can create a new person with name, discipline, department, and target capacity | VERIFIED | Form with all 5 fields, `useCreatePerson().mutateAsync(form)` on submit, POST /api/people → createPerson() |
| 3 | User can edit an existing person's details | VERIFIED | `openEdit` pre-fills form from PersonRow, `useUpdatePerson().mutateAsync({id, data})` on submit, PATCH /api/people/:id |
| 4 | User can soft-delete a person (sets archivedAt) | VERIFIED | `window.confirm` guard, `useDeletePerson().mutateAsync(id)`, DELETE route calls `deletePerson()` which sets `archivedAt: new Date()` |
| 5 | Archived people do not appear in the default list | VERIFIED | `listPeople` pushes `isNull(schema.people.archivedAt)` condition unless `filters.includeArchived` |
| 6 | User can see a list of projects in the Projects page | VERIFIED | `projects/page.tsx` calls `useProjects()`, renders table with `projects?.map(...)` |
| 7 | User can create a new project with name, program, and status | VERIFIED | Form with name/programId/status fields, `useCreateProject().mutateAsync(payload)`, POST /api/projects → createProject() |
| 8 | User can edit an existing project's details | VERIFIED | `openEdit` pre-fills form from ProjectRow, `useUpdateProject().mutateAsync({id, data})`, PATCH /api/projects/:id |
| 9 | User can archive a project (sets status 'archived' and archivedAt) | VERIFIED | `window.confirm` guard, `useArchiveProject().mutateAsync(id)`, DELETE route calls `archiveProject()` which sets `status: 'archived', archivedAt: new Date()` |
| 10 | Archived projects do not appear in the default list | VERIFIED | `listProjects` pushes `ne(schema.projects.status, 'archived')` unless `filters.includeArchived` |
| 11 | Duplicate project names within the same org return a ConflictError | VERIFIED | `handleApiError` catches Postgres error code `23505` and wraps in `ConflictError`; unique constraint `projects_org_name_uniq` enforces at DB level |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/api-utils.ts` | handleApiError utility | VERIFIED | Handles AppError, ZodError (Zod 4 `zod/v4`), Postgres 23505, fallback 500 |
| `src/components/providers/query-provider.tsx` | TanStack Query provider | VERIFIED | useState QueryClient, staleTime 30s, retry 1, wraps children in QueryClientProvider |
| `src/features/people/person.service.ts` | Person business logic | VERIFIED | Exports listPeople, getPersonById, createPerson, updatePerson, deletePerson |
| `src/features/people/person.schema.ts` | Zod validation schemas | VERIFIED | personCreateSchema, personUpdateSchema (manual Zod 4 schemas) |
| `src/app/api/people/route.ts` | GET /api/people, POST /api/people | VERIFIED | Both handlers with handleApiError, role-gated POST |
| `src/app/api/people/[id]/route.ts` | GET/PATCH/DELETE /api/people/:id | VERIFIED | Next.js 16 `await params`, role-gated PATCH/DELETE |
| `src/hooks/use-people.ts` | TanStack Query hooks for people | VERIFIED | usePeople, useCreatePerson, useUpdatePerson, useDeletePerson, useDepartments, useDisciplines |
| `src/features/projects/project.service.ts` | Project business logic | VERIFIED | Exports listProjects, getProjectById, createProject, updateProject, archiveProject |
| `src/features/projects/project.schema.ts` | Zod validation schemas | VERIFIED | projectCreateSchema, projectUpdateSchema |
| `src/app/api/projects/route.ts` | GET /api/projects, POST /api/projects | VERIFIED | Both handlers with handleApiError, role-gated POST |
| `src/app/api/projects/[id]/route.ts` | GET/PATCH/DELETE /api/projects/:id | VERIFIED | Archive on DELETE (not hard-delete), Next.js 16 await params |
| `src/hooks/use-projects.ts` | TanStack Query hooks for projects | VERIFIED | useProjects, useCreateProject, useUpdateProject, useArchiveProject, usePrograms |
| `src/app/(app)/team/page.tsx` | Team page CRUD UI | VERIFIED | Full form, table, loading/error states, window.confirm delete, lucide icons |
| `src/app/(app)/projects/page.tsx` | Projects page CRUD UI | VERIFIED | Full form, table, status badges, loading/error states, window.confirm archive, lucide icons |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/people/route.ts` | `person.service.ts` | `import { listPeople, createPerson }` | WIRED | Direct import confirmed |
| `src/app/api/people/[id]/route.ts` | `person.service.ts` | `import { deletePerson, getPersonById, updatePerson }` | WIRED | Direct import confirmed |
| `src/hooks/use-people.ts` | `/api/people` | `fetch('/api/people')` | WIRED | All four hooks call correct endpoints with response handling |
| `src/app/(app)/team/page.tsx` | `use-people.ts` | `usePeople, useCreatePerson, useDeletePerson, useUpdatePerson` | WIRED | All four hooks imported and used in render |
| `src/app/(app)/layout.tsx` | `query-provider.tsx` | `<QueryProvider>` wrapping `<AppShell>` | WIRED | Children wrapped at top level |
| `src/app/api/projects/route.ts` | `project.service.ts` | `import { listProjects, createProject }` | WIRED | Direct import confirmed |
| `src/app/api/projects/[id]/route.ts` | `project.service.ts` | `import { archiveProject, getProjectById, updateProject }` | WIRED | Archive (not hard-delete) confirmed |
| `src/hooks/use-projects.ts` | `/api/projects` | `fetch('/api/projects')` | WIRED | All hooks call correct endpoints |
| `src/app/(app)/projects/page.tsx` | `use-projects.ts` | `useProjects, useCreateProject, useArchiveProject, useUpdateProject` | WIRED | All four hooks imported and used in render |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `team/page.tsx` | `people` (from `usePeople()`) | `GET /api/people` → `listPeople(orgId)` → `db.select().from(schema.people).where(and(...))` | Yes — Drizzle query against `people` table | FLOWING |
| `projects/page.tsx` | `projects` (from `useProjects()`) | `GET /api/projects` → `listProjects(orgId)` → `db.select().from(schema.projects).where(and(...))` | Yes — Drizzle query against `projects` table | FLOWING |
| `team/page.tsx` | `departments` (from `useDepartments()`) | `GET /api/departments` → `withTenant(orgId).departments()` | Yes — tenant-scoped query | FLOWING |
| `team/page.tsx` | `disciplines` (from `useDisciplines()`) | `GET /api/disciplines` → `withTenant(orgId).disciplines()` | Yes — tenant-scoped query | FLOWING |
| `projects/page.tsx` | `programs` (from `usePrograms()`) | `GET /api/programs` → `withTenant(orgId).programs()` | Yes — tenant-scoped query | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for UI/page components — requires running browser. Runnable checks (TypeScript, file structure) covered above.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles clean | `npx tsc --noEmit` | No output (zero errors) | PASS |
| Phase commits exist | `git log --oneline \| head -10` | 45d95bc, dd0cde2, 0046591, b4beafb all present | PASS |
| All API route files exist | `ls src/app/api/{people,projects,departments,disciplines,programs}/` | All present | PASS |
| All feature module files exist | `ls src/features/{people,projects}/` | schema, service, types for both | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MGMT-01 | 04-01-PLAN.md | Person CRUD — create, read, update, delete persons with name, discipline, department, target capacity | SATISFIED | Full vertical slice: service, API routes, hooks, Team page UI — all verified present and wired |
| MGMT-02 | 04-02-PLAN.md | Project CRUD — create, read, update, archive projects with name, program, status | SATISFIED | Full vertical slice: service, API routes, hooks, Projects page UI — all verified present and wired |

**REQUIREMENTS.md tracking note:** MGMT-01 is marked `[ ]` (unchecked) in REQUIREMENTS.md while MGMT-02 is marked `[x]`. This is a documentation inconsistency — the implementation for MGMT-01 is fully present and equivalent in quality to MGMT-02. The checkbox should be updated to `[x]`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODOs, FIXMEs, placeholder returns, or stub patterns were found in any phase-04 files. The EMPTY_FORM constants in both page files are legitimate initial state values that get overwritten on edit — not stubs.

### Human Verification Required

#### 1. Create Person End-to-End

**Test:** Navigate to /team, click "Add Person", fill in first name, last name, select a department and discipline from dropdowns, set target hours, submit.
**Expected:** Person appears in the table immediately without page reload. Network tab shows POST /api/people returning 201.
**Why human:** TanStack Query cache invalidation (`invalidateQueries(['people'])`) and dropdown population from /api/departments and /api/disciplines require a running server with seeded reference data.

#### 2. Edit Person End-to-End

**Test:** Click the pencil icon on an existing person row. Verify the form pre-populates with their current values. Change the last name and submit.
**Expected:** Updated name reflected in the table row immediately.
**Why human:** Form pre-fill correctness and optimistic UI update require browser execution.

#### 3. Delete Person with Confirmation (Success Criterion 3)

**Test:** Click the trash icon on a person row. Observe the confirmation dialog. Click OK.
**Expected:** `window.confirm` fires with message "Are you sure you want to remove [name]? This will archive them.", person disappears from the list after DELETE /api/people/:id returns 204. Person should NOT appear in the list on next page load (soft-delete persists).
**Why human:** `window.confirm` interaction and DOM removal require browser execution. This is the primary verification for Success Criterion 3.

#### 4. Create Project End-to-End (Success Criterion 2)

**Test:** Navigate to /projects, click "Add Project", enter a name, optionally select a program, set status to "planned", submit.
**Expected:** Project appears in the table with a blue "planned" status badge. Network tab shows POST /api/projects returning 201.
**Why human:** Status badge rendering and list refresh require browser execution.

#### 5. Archive Project with Confirmation

**Test:** Click the archive icon on a project row. Click OK on the confirm dialog.
**Expected:** `window.confirm` fires with "Are you sure you want to archive [name]? It will be hidden from active views.", project disappears from the list.
**Why human:** Requires browser execution and confirms ne(status, 'archived') filter is working end-to-end.

#### 6. Duplicate Project Name Returns 409

**Test:** Create a project named "Alpha". Then attempt to create another project named "Alpha".
**Expected:** Second attempt fails. Network tab shows 409. UI ideally shows an error message (check console if no toast).
**Why human:** Requires a live database with the unique constraint active to trigger the Postgres 23505 error code path.

### Gaps Summary

No gaps found. All 11 truths are verified at all four levels (exists, substantive, wired, data-flowing). TypeScript compiles clean. The phase goal — "users can create, edit, and delete people and projects" — is achieved in code.

The only action item is a documentation fix: MGMT-01 checkbox in REQUIREMENTS.md should be updated from `[ ]` to `[x]` to match implementation reality.

Human verification is required for the three Success Criteria and the conflict-detection edge case, all of which depend on a running server with real database access.

---

_Verified: 2026-03-26T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
