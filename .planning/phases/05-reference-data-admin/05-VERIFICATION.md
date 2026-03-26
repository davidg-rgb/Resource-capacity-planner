---
phase: 05-reference-data-admin
verified: 2026-03-26T00:00:00Z
status: human_needed
score: 11/11 must-haves verified
human_verification:
  - test: "Admin creates a new discipline and observes Person form dropdown"
    expected: "New discipline appears immediately in the discipline dropdown on the Person add/edit form (team page) without page reload"
    why_human: "Requires browser interaction — verifying React Query cache invalidation triggers a live re-render of the dropdown in a separate page component"
  - test: "Attempt to delete a department with assigned people"
    expected: "A warning message appears inline showing 'Assigned to N people. Remove assignments before deleting.' with the Confirm Delete button absent"
    why_human: "Requires live data with a department that has people assigned; the UI branch (checkDeleteId + usageCount > 0) must be observed in-browser"
  - test: "Log in as a Viewer-role user and navigate to /admin/disciplines"
    expected: "Page renders the 'Access Denied' message with shield icon; Add/Edit/Delete controls are not shown"
    why_human: "Requires a real Clerk session with org:member (viewer) role — cannot verify Clerk orgRole values programmatically"
---

# Phase 05: Reference Data Admin — Verification Report

**Phase Goal:** Admins can manage the lookup tables (disciplines, departments, programs) that Person and Project forms depend on.
**Verified:** 2026-03-26
**Status:** human_needed (all automated checks passed; 3 behavioral items need human confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Disciplines can be created, read, updated, and deleted via API | VERIFIED | `src/app/api/disciplines/route.ts` (GET+POST), `src/app/api/disciplines/[id]/route.ts` (GET+PATCH+DELETE); service functions all implemented with DB queries |
| 2 | Departments can be created, read, updated, and deleted via API | VERIFIED | `src/app/api/departments/route.ts` (GET+POST), `src/app/api/departments/[id]/route.ts` (GET+PATCH+DELETE); service functions all implemented |
| 3 | Programs can be created, read, updated, and deleted via API | VERIFIED | `src/app/api/programs/route.ts` (GET+POST), `src/app/api/programs/[id]/route.ts` (GET+PATCH+DELETE); service functions all implemented |
| 4 | Deleting a department/discipline/program with dependents returns 409 with usage count | VERIFIED | All three services check usage count before delete and throw `ConflictError` with count in message; `handleApiError` converts to 409 |
| 5 | All write operations (POST/PATCH/DELETE) require admin role | VERIFIED | Every POST/PATCH/DELETE route handler calls `requireRole('admin')` before any mutation |
| 6 | Foreign key violations return 409 instead of 500 | VERIFIED | `src/lib/api-utils.ts` handles Postgres error code `23503` and returns 409 ConflictError |
| 7 | Admin can add a new discipline and it appears in the Person form dropdown immediately | VERIFIED (automated) / NEEDS HUMAN (live) | `useCreateDiscipline` invalidates `['disciplines']` queryKey on success; Person form (`/team/page.tsx`) uses `useDisciplines()` with same queryKey — cache invalidation chain is correct. Live re-render requires human test |
| 8 | Attempting to delete a department with assigned people shows warning with count | VERIFIED (automated) / NEEDS HUMAN (live) | `useDepartment(checkDeleteId)` fetches `usageCount`; JSX branch at line 161 of departments/page.tsx renders "Assigned to {usageCount} people" when `usageCount > 0`. Requires live data to observe |
| 9 | Viewer role cannot access admin pages | VERIFIED (automated) / NEEDS HUMAN (live) | All three admin pages check `orgRole === 'org:admin' \|\| orgRole === 'org:owner'` and render Access Denied for any other role. Clerk role string mapping verified in `src/lib/auth.ts`. Live session test needed |
| 10 | Admin pages are accessible from the app navigation | VERIFIED | `top-nav.tsx` has `{ label: 'Admin', href: '/admin/disciplines', icon: ShieldCheck }` in NAV_ITEMS; `side-nav.tsx` has `/admin` section with all 3 sub-pages |
| 11 | Backward-compatible re-exports maintain existing consumers | VERIFIED | `use-people.ts` line 99 re-exports `useDepartments, useDisciplines` from `./use-reference-data`; `use-projects.ts` line 97 re-exports `usePrograms` |

**Score:** 11/11 truths verified (3 need human confirmation for live behavior)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/disciplines/discipline.service.ts` | Discipline CRUD + usage count | VERIFIED | All 6 functions present: list, getById, create, update, delete, getUsageCount. DB queries use drizzle-orm with tenant scoping |
| `src/features/departments/department.service.ts` | Department CRUD + usage count | VERIFIED | All 6 functions present; usage count queries `people` table with `archivedAt IS NULL` |
| `src/features/programs/program.service.ts` | Program CRUD + usage count | VERIFIED | All 6 functions; usage count queries `projects` table with `ne(status, 'archived')` |
| `src/features/disciplines/discipline.schema.ts` | Zod validation schema | VERIFIED | `disciplineCreateSchema` and `disciplineUpdateSchema` with correct field constraints |
| `src/features/departments/department.schema.ts` | Zod validation schema | VERIFIED | `departmentCreateSchema` and `departmentUpdateSchema` |
| `src/features/programs/program.schema.ts` | Zod validation schema | VERIFIED | `programCreateSchema` and `programUpdateSchema` with optional description |
| `src/app/api/disciplines/[id]/route.ts` | GET, PATCH, DELETE for single discipline | VERIFIED | All 3 methods; GET returns `{ discipline, usageCount }`; PATCH/DELETE gated by `requireRole('admin')` |
| `src/app/api/departments/[id]/route.ts` | GET, PATCH, DELETE for single department | VERIFIED | All 3 methods with same pattern |
| `src/app/api/programs/[id]/route.ts` | GET, PATCH, DELETE for single program | VERIFIED | All 3 methods with same pattern |
| `src/hooks/use-reference-data.ts` | CRUD hooks for all 3 entities | VERIFIED | 15 exported functions: 5 per entity (list, single, create, update, delete) with React Query mutations and cache invalidation |
| `src/app/(app)/admin/disciplines/page.tsx` | Disciplines CRUD admin page | VERIFIED | `export default function DisciplinesPage()`; role check; inline add/edit/delete with usage-count warning |
| `src/app/(app)/admin/departments/page.tsx` | Departments CRUD admin page | VERIFIED | `export default function DepartmentsPage()`; same pattern |
| `src/app/(app)/admin/programs/page.tsx` | Programs CRUD admin page | VERIFIED | `export default function ProgramsPage()`; description field included |
| `src/lib/tenant.ts` | withTenant helpers for all entities | VERIFIED | `updateDepartment`, `updateDiscipline`, `deleteDepartment`, `deleteDiscipline`, `deleteProgram` all present |
| `src/lib/api-utils.ts` | FK violation (23503) handler | VERIFIED | Handler for code `23503` returns 409 ConflictError at line 37-44 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/disciplines/route.ts` | `discipline.service.ts` | `import { listDisciplines, createDiscipline }` | WIRED | Import present at line 4; both functions called in GET/POST handlers |
| `src/app/api/disciplines/[id]/route.ts` | `discipline.service.ts` | `import { getDisciplineById, getDisciplineUsageCount, ... }` | WIRED | All 4 service functions imported and called in route handlers |
| `discipline.service.ts` | `src/lib/tenant.ts` | `withTenant(orgId).insertDiscipline/updateDiscipline/deleteDiscipline` | WIRED | All three tenant helpers called at lines 41, 56, 77 |
| `src/lib/api-utils.ts` | Postgres error code 23503 | `code === '23503'` check in `handleApiError` | WIRED | Handler at line 37-44 with ConflictError response |
| `src/app/(app)/admin/disciplines/page.tsx` | `use-reference-data.ts` | `import { useDisciplines, useCreateDiscipline, ... }` | WIRED | Import at line 7-13; all 5 hooks used in component |
| `use-reference-data.ts` | `/api/disciplines, /api/departments, /api/programs` | `fetch` calls in queryFn/mutationFn | WIRED | Each hook fetches the correct endpoint with proper method |
| `src/components/layout/side-nav.tsx` | admin pages | `SECTION_NAV['/admin']` | WIRED | `/admin` key added at line 58 with 3 sub-page items |
| `useCreateDiscipline` | `useDisciplines` in Person form | `invalidateQueries(['disciplines'])` | WIRED | `onSuccess` invalidates `['disciplines']`; `/team/page.tsx` uses `useDisciplines()` with same key |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `admin/disciplines/page.tsx` | `disciplines` | `useDisciplines()` → `GET /api/disciplines` → `listDisciplines(orgId)` → `db.select().from(schema.disciplines).where(...)` | Yes — direct DB query ordered by name | FLOWING |
| `admin/departments/page.tsx` | `departments` | `useDepartments()` → `GET /api/departments` → `listDepartments(orgId)` → DB select | Yes | FLOWING |
| `admin/programs/page.tsx` | `programs` | `usePrograms()` → `GET /api/programs` → `listPrograms(orgId)` → DB select | Yes | FLOWING |
| `admin/disciplines/page.tsx` (delete target) | `deleteTarget.usageCount` | `useDiscipline(checkDeleteId)` → `GET /api/disciplines/[id]` → `getDisciplineUsageCount` → `count(*)` on `people` table | Yes — live count with `archivedAt IS NULL` filter | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — the admin pages require a running browser with a Clerk session. TypeScript compilation passed with zero errors (no tsc output = clean compile), confirming all imports, type signatures, and API contracts are correct.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MGMT-03 | 05-01-PLAN.md, 05-02-PLAN.md | Admin UI for reference data: disciplines CRUD | SATISFIED | API routes (GET/POST/PATCH/DELETE), service with usage-count protection, admin page with inline CRUD, navigation link |
| MGMT-04 | 05-01-PLAN.md, 05-02-PLAN.md | Admin UI for reference data: departments CRUD | SATISFIED | Same pattern; delete warning shows count of assigned people |
| MGMT-05 | 05-01-PLAN.md, 05-02-PLAN.md | Admin UI for reference data: programs CRUD | SATISFIED | Same pattern; usage count queries non-archived projects |

No orphaned requirements — all 3 phase requirements are claimed by both plans and have corresponding implementation.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `admin/disciplines/page.tsx` | 75 | `window.confirm()` | Info | Zero-confirmation delete uses a browser dialog after usage-count check passes. Acceptable for admin-only UI; not a blocker |
| `admin/departments/page.tsx` | 70 | `window.confirm()` | Info | Same |
| `admin/programs/page.tsx` | — | `window.confirm()` | Info | Same |

No STUB, PLACEHOLDER, TODO, FIXME, or hardcoded empty data patterns found in any phase files. No route returns empty arrays without a DB query.

---

## Human Verification Required

### 1. New Discipline Appears in Person Form Dropdown Immediately

**Test:** Log in as an admin. Navigate to `/admin/disciplines` and add a new discipline (e.g., "Test Discipline", abbr "TST"). Without reloading, open the Team page (`/team`) and open the Add Person or Edit Person form. Check the Discipline dropdown.
**Expected:** "Test Discipline" appears in the dropdown without any page reload.
**Why human:** React Query cache invalidation (`['disciplines']` key) triggering a re-render in a separate page component requires a live browser session to observe.

### 2. Department Delete Warning with People Count

**Test:** Ensure at least one person is assigned to a department. Navigate to `/admin/departments`. Click the trash icon on that department.
**Expected:** Instead of a Confirm Delete button, the row shows an inline red message: "Assigned to N people. Remove assignments before deleting." with a cancel (X) button. The Confirm Delete button is absent.
**Why human:** Requires live database state where `getDepartmentUsageCount` returns a non-zero value; the conditional UI branch cannot be triggered without real data.

### 3. Viewer Role Access Denied

**Test:** Create or invite a user with the Clerk organization role of `org:member` (Viewer). Log in as that user. Navigate to `/admin/disciplines`.
**Expected:** The page renders the "Access Denied" message with the ShieldAlert icon and the text "You need Admin privileges to manage reference data." No table, no Add button, no edit/delete controls are visible.
**Why human:** Requires a real Clerk session with `orgRole !== 'org:admin'` and `orgRole !== 'org:owner'`. The auth check at the top of each page component reads `orgRole` from `useAuth()` which only populates in a live Clerk context.

---

## Gaps Summary

No automated gaps. All 15 files exist, are substantive (not stubs), are wired into the application (imported and used), and have real data flowing through them. TypeScript compiles cleanly (zero errors). Three items require human verification for live behavioral confirmation but no code defects were found.

---

_Verified: 2026-03-26_
_Verifier: Claude (gsd-verifier)_
