# Nordic Capacity — Roadmap

> Milestone: MVP (v1)
> Generated: 2025-03-25
> Depth: Comprehensive

## Phases

### Phase 1: Project Scaffolding & Dev Environment

**Goal:** A running Next.js 16 app with CI, linting, and empty database that deploys to Vercel.

**Requirements:**

- FOUND-03: Next.js 16 project setup with App Router, TypeScript, Tailwind CSS 4
- FOUND-09: Environment configuration — all env vars documented and validated at startup

**Success Criteria:**

1. Developer can run `pnpm dev` and see a blank page at localhost:3000
2. Vercel preview deployment succeeds on push to any branch
3. ESLint, Prettier, and TypeScript compile pass in CI with zero errors

**Dependencies:** None

**Parallel with:** None (must complete first)

**Plans:** 1 plan

Plans:

- [x] 01-01-PLAN.md -- Scaffold Next.js 16 with tooling, env validation, and CI pipeline (DONE)

---

### Phase 2: Database Schema & Tenant Isolation

**Goal:** All Drizzle tables exist on Neon PG17 with migrations, seed data, and the `withTenant()` wrapper enforcing row-level isolation.

**Requirements:**

- FOUND-01: Multi-tenant organization with row-level data isolation via `organization_id`
- FOUND-02: `withTenant()` ORM query wrapper enforcing tenant isolation on every database query
- FOUND-04: Drizzle ORM schema — organizations, people, projects, programs, departments, disciplines, allocations
- FOUND-05: Database migrations and development seed data on Neon PostgreSQL 17
- FOUND-07: Health check endpoint returning 200 with DB connection status

**Success Criteria:**

1. Running `pnpm db:migrate` creates all tables on Neon without errors
2. Health check endpoint at `/api/health` returns 200 with `{ db: "connected" }`
3. Integration test proves that a query scoped to Org A returns zero rows from Org B
4. Seed script populates a demo organization with people, projects, and allocations

**Dependencies:** Phase 1

**Parallel with:** None

**Plans:** 2/2 plans complete

Plans:

- [x] 02-01-PLAN.md -- Drizzle schema (13 tables), db client, deps, env update, Drizzle Kit config
- [x] 02-02-PLAN.md -- withTenant() wrapper, health check endpoint, migrations, seed script

---

### Phase 3: Authentication & App Shell

**Goal:** Users can sign up, log in, create an org, and see the app shell with navigation — all routes are protected.

**Requirements:**

- AUTH-01: User can sign up with email/password via Clerk
- AUTH-02: User can log in and stay logged in across sessions via Clerk
- AUTH-03: User can create a new organization during sign-up
- AUTH-04: Clerk webhook creates internal organization record with default disciplines/departments
- AUTH-05: All protected routes redirect to sign-in when unauthenticated
- AUTH-06: Tenant context middleware — `getTenantId()`, `requireRole()` on every API route
- AUTH-07: Admin can invite users to the organization via Clerk
- AUTH-08: Role-based access: Org Owner, Admin, Planner/Line Manager, Viewer
- FOUND-06: Error taxonomy — AppError hierarchy
- FOUND-08: App shell — top nav + contextual side nav + main area

**Success Criteria:**

1. A new user can sign up, create an organization, and land on the app shell with working navigation
2. An invited user receives an email, clicks the link, and joins the existing organization
3. Visiting any `/app/*` route while logged out redirects to the Clerk sign-in page
4. API routes return 403 when a Viewer role attempts an Admin-only action

**Dependencies:** Phase 2

**Parallel with:** None

**Plans:** 4/4 plans complete

Plans:

- [x] 03-01-PLAN.md -- Error taxonomy, auth helpers, Clerk deps, env config
- [x] 03-02-PLAN.md -- Clerk integration: proxy.ts, ClerkProvider, sign-in/sign-up, webhook, org service (DONE)
- [x] 03-03-PLAN.md -- App shell: top nav, side nav, breadcrumbs, (app) layout, placeholder pages (DONE)
- [x] 03-04-PLAN.md -- Invite API endpoint with role-based access control

---

### Phase 4: Person & Project CRUD

**Goal:** Users can create, edit, and delete people and projects — the domain entities that the allocation grid depends on.

**Requirements:**

- MGMT-01: Person CRUD — create, read, update, delete persons
- MGMT-02: Project CRUD — create, read, update, archive projects

**Success Criteria:**

1. User can create a person with name, discipline, department, and target capacity, then see them in a list
2. User can create a project with name, program, and status, then see it in a list
3. Deleting a person prompts for confirmation and removes them from all views

**Dependencies:** Phase 3

**Parallel with:** Phase 5 (reference data admin)

**Plans:** 2 plans

Plans:

- [ ] 04-01-PLAN.md -- Person CRUD: TanStack Query setup, person service/schema/API routes, Team page UI
- [ ] 04-02-PLAN.md -- Project CRUD: project service/schema/API routes, Projects page UI

---

### Phase 5: Reference Data Admin

**Goal:** Admins can manage the lookup tables (disciplines, departments, programs) that Person and Project forms depend on.

**Requirements:**

- MGMT-03: Admin UI for reference data — disciplines CRUD
- MGMT-04: Admin UI for reference data — departments CRUD
- MGMT-05: Admin UI for reference data — programs CRUD

**Success Criteria:**

1. An Admin user can add a new discipline and it appears in the Person form dropdown immediately
2. Attempting to delete a department that has people assigned shows a warning with the count of affected people
3. A Viewer role cannot access the reference data admin pages

**Dependencies:** Phase 3

**Parallel with:** Phase 4 (Person & Project CRUD)

**Plans:** 2/2 plans complete

Plans:

- [x] 05-01-PLAN.md -- Backend: withTenant helpers, feature modules, API routes for disciplines/departments/programs CRUD
- [x] 05-02-PLAN.md -- Frontend: reference data hooks, admin CRUD pages, navigation integration

---

### Phase 6: AG Grid Spike & Core Grid

**Goal:** The Person Input Form renders an AG Grid with months as columns, projects as rows, and editable hour cells — the core product value.

**Requirements:**

- INPUT-01: Person Input Form displays AG Grid with months as columns, projects as rows, hours as cell values
- INPUT-02: User can click a cell, type hours (0-999), and the value saves on blur within 500ms
- INPUT-03: SUMMA row calculates sum of all project hours per month in real time
- INPUT-04: Target row shows configurable monthly capacity target per person (default 160h)
- INPUT-05: Status row shows color-coded indicator per month (green/amber/red/gray)
- INPUT-08: Dynamic project rows — "Add project..." row at bottom
- INPUT-12: Past months are read-only, current + future months are editable
- INPUT-13: Auto-save on cell blur with debounced batch upsert

**Success Criteria:**

1. User sees a grid for a person with 12+ month columns and their assigned projects as rows, and can type hours into cells
2. SUMMA row updates instantly when any cell value changes, and status row colors reflect the allocation level
3. Editing a cell and clicking away saves the value — refreshing the page shows the saved value
4. Past-month cells are visually distinct and reject input attempts

**Dependencies:** Phase 4

**Parallel with:** None (critical path — full focus)

**Plans:** 2 plans

Plans:

- [x] 06-01-PLAN.md -- Backend: AG Grid deps, allocation feature module, API routes, capacity/date utils (DONE)
- [x] 06-02-PLAN.md -- Frontend: AG Grid component, pinned rows, cell renderers, auto-save hook, person input page

---

### Phase 7: Grid Polish & Navigation

**Goal:** The Person Input Form has full spreadsheet-grade interactions: keyboard nav, drag-to-fill, clipboard paste, conflict detection, and person-to-person navigation.

**Requirements:**

- INPUT-06: Person sidebar lists all people grouped by department with status dots
- INPUT-07: Prev/next arrows navigate between people
- INPUT-09: Drag-to-fill custom implementation to replicate value across months
- INPUT-10: Keyboard navigation — Tab, Enter, Arrow keys, Escape
- INPUT-11: Custom clipboard paste handler (AG Grid Community limitation)
- INPUT-14: Conflict detection — warn if another user modified the same cell

**Success Criteria:**

1. User can press Tab/Enter/Arrow keys to move between cells without touching the mouse
2. User can drag the fill handle on a cell to copy its value across multiple months
3. User can Ctrl+V a block of numbers from Excel and they populate the correct cells
4. When two users edit the same cell, the second user sees a conflict warning before their save overwrites

**Dependencies:** Phase 6

**Parallel with:** Phase 8 (Import/Export — once grid API is stable)

**Plans:** 1/3 plans executed

Plans:

- [ ] 07-01-PLAN.md -- Person sidebar with department grouping, status dots, and prev/next navigation
- [x] 07-02-PLAN.md -- Keyboard navigation (Tab/Enter/Arrow/Escape) and clipboard paste handler
- [ ] 07-03-PLAN.md -- Custom drag-to-fill handle overlay and conflict detection

---

### Phase 8: Import Wizard

**Goal:** Users can upload an Excel/CSV file and import allocation data through a guided 4-step wizard with validation and Swedish header detection.

**Requirements:**

- IMPEX-01: 4-step import wizard — Upload, Map, Validate, Import
- IMPEX-02: Upload accepts .xlsx, .xls, and .csv files
- IMPEX-03: Column mapping with auto-detection of Swedish and English headers
- IMPEX-04: Validation step shows ready/warning/error counts with actionable suggestions
- IMPEX-05: Name fuzzy matching — suggest corrections for typos
- IMPEX-06: Pivot/grid format detection and automatic unpivoting to flat format
- IMPEX-07: Import executes in a single database transaction with rollback on failure
- IMPEX-08: Server-side Excel processing — files processed on server, not client
- IMPEX-09: Handle Swedish character encoding (å, ä, ö) in .xls files
- IMPEX-10: Handle merged cells, hidden rows, formula cells gracefully
- IMPEX-13: Downloadable import templates with headers and example data

**Success Criteria:**

1. User uploads a Swedish Excel file with headers like "Namn", "Projekt", "Timmar" and the wizard auto-maps columns correctly
2. Validation step shows a clear count of rows ready to import vs. rows with warnings/errors, with fix suggestions
3. A failed import rolls back completely — no partial data appears in the system
4. User can download a template file, fill it in Excel, and import it without errors

**Dependencies:** Phase 6 (needs allocation model and batch upsert)

**Parallel with:** Phase 7 (grid polish)

**Plans:** 1/4 plans executed

Plans:

- [x] 08-01-PLAN.md -- Import feature module: types, SheetJS parsing, format detection, templates
- [ ] 08-02-PLAN.md -- Validation service, fuzzy matching, import execution, API routes
- [ ] 08-03-PLAN.md -- Wizard shell, upload step UI, TanStack Query hooks, data page update
- [ ] 08-04-PLAN.md -- Map, Validate, Import step UIs, full wizard wiring

---

### Phase 9: Flat Table View & Export

**Goal:** Users can view all allocation data in a sortable/filterable flat table and export it to Excel or CSV.

**Requirements:**

- IMPEX-11: Flat table view with sorting, filtering, pagination for all allocation data
- IMPEX-12: Excel/CSV export with current filters applied

**Success Criteria:**

1. User can view all allocations across all people and projects in a single paginated table
2. User can filter by person, project, department, or date range and the table updates instantly
3. User clicks "Export" and downloads an Excel file containing exactly the filtered data they see on screen

**Dependencies:** Phase 6

**Parallel with:** Phase 7, Phase 8

---

### Phase 10: Platform Admin

**Goal:** A platform super-admin can manage all tenants, impersonate users, and view audit logs — completely isolated from the tenant auth system.

**Requirements:**

- PLAT-01: Platform admin auth — separate email/password login with own JWT
- PLAT-02: Platform admin dashboard showing all organizations with health metrics
- PLAT-03: Tenant impersonation — log in as any user in any org with visible banner
- PLAT-04: Every impersonation action logged in platform audit log
- PLAT-05: Impersonation sessions expire after 1 hour max
- PLAT-06: Tenant management — create, suspend, reactivate, delete organizations
- PLAT-07: Manual subscription management — extend trials, override status
- PLAT-08: Platform audit log — every admin action with who/what/when/IP
- PLAT-09: Cross-tenant user management — reset passwords, force logout via Clerk SDK
- PLAT-10: Auth separation verified — no tenant endpoint accessible with platform token and vice versa
- PLAT-11: Seed script creates initial platform admin account

**Success Criteria:**

1. Platform admin logs in at `/platform` with credentials that are not Clerk-based, and sees a dashboard of all organizations
2. Platform admin can impersonate a user in any tenant, with a visible banner showing "Impersonating [user] in [org]", and the session auto-expires after 1 hour
3. Every impersonation and management action appears in the audit log with admin identity, timestamp, and IP
4. A Clerk-authenticated tenant user cannot access any `/platform` endpoint, and a platform admin token cannot access any `/api` tenant endpoint

**Dependencies:** Phase 2 (needs DB schema), Phase 3 (needs Clerk integration for user management)

**Parallel with:** Phase 4, 5, 6, 7, 8, 9 (fully independent from tenant-facing features)

---

## Coverage Matrix

| REQ-ID   | Phase | Description                                             |
| -------- | ----- | ------------------------------------------------------- |
| FOUND-01 | 2     | Multi-tenant organization with row-level data isolation |
| FOUND-02 | 2     | `withTenant()` ORM query wrapper                        |
| FOUND-03 | 1     | Next.js 16 project setup                                |
| FOUND-04 | 2     | Drizzle ORM schema for all tables                       |
| FOUND-05 | 2     | Database migrations and seed data                       |
| FOUND-06 | 3     | Error taxonomy — AppError hierarchy                     |
| FOUND-07 | 2     | Health check endpoint                                   |
| FOUND-08 | 3     | App shell with navigation                               |
| FOUND-09 | 1     | Environment configuration                               |
| AUTH-01  | 3     | Sign up with email/password via Clerk                   |
| AUTH-02  | 3     | Log in and stay logged in                               |
| AUTH-03  | 3     | Create organization during sign-up                      |
| AUTH-04  | 3     | Clerk webhook creates internal org record               |
| AUTH-05  | 3     | Protected routes redirect to sign-in                    |
| AUTH-06  | 3     | Tenant context middleware                               |
| AUTH-07  | 3     | Invite users to organization                            |
| AUTH-08  | 3     | Role-based access control                               |
| INPUT-01 | 6     | AG Grid with months/projects/hours                      |
| INPUT-02 | 6     | Click cell, type hours, save on blur                    |
| INPUT-03 | 6     | SUMMA row real-time calculation                         |
| INPUT-04 | 6     | Target row with capacity target                         |
| INPUT-05 | 6     | Status row color-coded indicators                       |
| INPUT-06 | 7     | Person sidebar with status dots                         |
| INPUT-07 | 7     | Prev/next navigation between people                     |
| INPUT-08 | 6     | Dynamic "Add project..." row                            |
| INPUT-09 | 7     | Drag-to-fill custom implementation                      |
| INPUT-10 | 7     | Keyboard navigation                                     |
| INPUT-11 | 7     | Custom clipboard paste handler                          |
| INPUT-12 | 6     | Past months read-only                                   |
| INPUT-13 | 6     | Auto-save with debounced batch upsert                   |
| INPUT-14 | 7     | Conflict detection                                      |
| MGMT-01  | 4     | Person CRUD                                             |
| MGMT-02  | 4     | Project CRUD                                            |
| MGMT-03  | 5     | Disciplines CRUD                                        |
| MGMT-04  | 5     | Departments CRUD                                        |
| MGMT-05  | 5     | Programs CRUD                                           |
| IMPEX-01 | 8     | 4-step import wizard                                    |
| IMPEX-02 | 8     | Upload .xlsx, .xls, .csv                                |
| IMPEX-03 | 8     | Column mapping with Swedish/English auto-detection      |
| IMPEX-04 | 8     | Validation with error/warning counts                    |
| IMPEX-05 | 8     | Name fuzzy matching                                     |
| IMPEX-06 | 8     | Pivot/grid format detection and unpivoting              |
| IMPEX-07 | 8     | Single transaction with rollback                        |
| IMPEX-08 | 8     | Server-side Excel processing                            |
| IMPEX-09 | 8     | Swedish character encoding handling                     |
| IMPEX-10 | 8     | Handle merged cells, hidden rows, formulas              |
| IMPEX-11 | 9     | Flat table view with sorting/filtering                  |
| IMPEX-12 | 9     | Excel/CSV export with filters                           |
| IMPEX-13 | 8     | Downloadable import templates                           |
| PLAT-01  | 10    | Platform admin separate JWT auth                        |
| PLAT-02  | 10    | Platform admin dashboard                                |
| PLAT-03  | 10    | Tenant impersonation with banner                        |
| PLAT-04  | 10    | Impersonation audit logging                             |
| PLAT-05  | 10    | Impersonation session expiry (1h)                       |
| PLAT-06  | 10    | Tenant management (create/suspend/delete)               |
| PLAT-07  | 10    | Manual subscription management                          |
| PLAT-08  | 10    | Platform audit log                                      |
| PLAT-09  | 10    | Cross-tenant user management                            |
| PLAT-10  | 10    | Auth separation verification                            |
| PLAT-11  | 10    | Platform admin seed script                              |

## Phase Dependency Graph

```
Phase 1: Scaffolding
  |
  v
Phase 2: DB Schema & Tenant Isolation
  |
  +--------------------------------------+
  v                                      v
Phase 3: Auth & App Shell            Phase 10: Platform Admin ------+
  |                                   (can start after Phase 3      |
  +--------------+                     for Clerk SDK integration)   |
  v              v                                                  |
Phase 4:       Phase 5:                                             |
Person/Proj    Ref Data Admin                                       |
CRUD           (parallel w/ 4)                                      |
  |                                                                 |
  v                                                                 |
Phase 6: AG Grid Spike & Core Grid <-- CRITICAL PATH               |
  |                                                                 |
  +--------------+--------------+                                   |
  v              v              v                                   |
Phase 7:       Phase 8:       Phase 9:                              |
Grid Polish    Import Wizard  Flat Table                            |
& Navigation   (parallel w/7) & Export                              |
                               (parallel w/ 7, 8)                   |
```

---

_60 v1 requirements mapped across 10 phases. All phases independently deployable or testable._
