# Nordic Capacity — Requirements

> Derived from: ARCHITECTURE.md (38 features), resource-planner-scope.md, research findings
> Date: 2025-03-25
> Milestone: MVP (v1)

---

## v1 Requirements

### Foundation (FOUND)

- [x] **FOUND-01**: Multi-tenant organization with row-level data isolation via `organization_id` on every table (F-001)
- [ ] **FOUND-02**: `withTenant()` ORM query wrapper enforcing tenant isolation on every database query (Research: critical risk)
- [x] **FOUND-03**: Next.js 16 project setup with App Router, TypeScript, Tailwind CSS 4 config from prototypes (ADR-004, ADR-006)
- [x] **FOUND-04**: Drizzle ORM schema: organizations, people, projects, programs, departments, disciplines, allocations (ADR-002)
- [x] **FOUND-05**: Database migrations and development seed data on Neon PostgreSQL 17 (ADR-002)
- [ ] **FOUND-06**: Error taxonomy — AppError hierarchy: ValidationError, AuthError, ForbiddenError, NotFoundError, ConflictError, RateLimitError, InternalError (Section 11.1)
- [ ] **FOUND-07**: Health check endpoint returning 200 with DB connection status
- [ ] **FOUND-08**: App shell — top nav (Input/Team/Projects/Data/Dashboard) + contextual side nav + main area (A7)
- [x] **FOUND-09**: Environment configuration -- all env vars documented and validated at startup (Section 11.2)

### Authentication (AUTH)

- [ ] **AUTH-01**: User can sign up with email/password via Clerk (F-002)
- [ ] **AUTH-02**: User can log in and stay logged in across sessions via Clerk (F-002)
- [ ] **AUTH-03**: User can create a new organization during sign-up (F-002)
- [ ] **AUTH-04**: Clerk webhook creates internal organization record with default disciplines/departments (F-002)
- [ ] **AUTH-05**: All protected routes redirect to sign-in when unauthenticated (F-002)
- [ ] **AUTH-06**: Tenant context middleware — `getTenantId()`, `requireRole()` on every API route (Section 6)
- [ ] **AUTH-07**: Admin can invite users to the organization via Clerk (F-002)
- [ ] **AUTH-08**: Role-based access: Org Owner, Admin, Planner/Line Manager, Viewer (Section 2.2)

### Person Input Form (INPUT)

- [ ] **INPUT-01**: Person Input Form displays AG Grid with months as columns, projects as rows, hours as cell values (F-003)
- [ ] **INPUT-02**: User can click a cell, type hours (0-999), and the value saves on blur within 500ms (F-003, F-020)
- [ ] **INPUT-03**: SUMMA row calculates sum of all project hours per month in real time (F-005)
- [ ] **INPUT-04**: Target row shows configurable monthly capacity target per person (default 160h) (F-005, A1)
- [ ] **INPUT-05**: Status row shows color-coded indicator per month: green (<90%), amber (90-100%), red (>100%), gray (no allocations) (F-005)
- [ ] **INPUT-06**: Person sidebar lists all people grouped by department with status dots (F-004)
- [ ] **INPUT-07**: Prev/next arrows navigate between people (F-004)
- [ ] **INPUT-08**: Dynamic project rows — "Add project..." row at bottom, minimum 1 empty row (A5)
- [ ] **INPUT-09**: Drag-to-fill custom implementation to replicate value across months (F-021)
- [ ] **INPUT-10**: Keyboard navigation: Tab, Enter, Arrow keys, Escape (F-021)
- [ ] **INPUT-11**: Custom clipboard paste handler (AG Grid Community limitation — Research finding) (F-021)
- [ ] **INPUT-12**: Past months are read-only, current + future months are editable (A4)
- [ ] **INPUT-13**: Auto-save on cell blur with debounced batch upsert (F-020)
- [ ] **INPUT-14**: Conflict detection — warn if another user modified the same cell (F-020)

### Person & Project Management (MGMT)

- [ ] **MGMT-01**: Person CRUD — create, read, update, delete persons with name, discipline, department, target capacity (F-011)
- [ ] **MGMT-02**: Project CRUD — create, read, update, archive projects with name, program, status (F-012)
- [ ] **MGMT-03**: Admin UI for reference data: disciplines CRUD (F-010)
- [ ] **MGMT-04**: Admin UI for reference data: departments CRUD (F-010)
- [ ] **MGMT-05**: Admin UI for reference data: programs CRUD (F-010)

### Import & Export (IMPEX)

- [ ] **IMPEX-01**: 4-step import wizard: Upload → Map → Validate → Import (F-006)
- [ ] **IMPEX-02**: Upload accepts .xlsx, .xls, and .csv files (F-006)
- [ ] **IMPEX-03**: Column mapping with auto-detection of Swedish headers (Namn, Projekt, Timmar, Månad, Avdelning) and English headers (F-007)
- [ ] **IMPEX-04**: Validation step shows ready/warning/error counts with actionable suggestions (F-008)
- [ ] **IMPEX-05**: Name fuzzy matching — suggest corrections for typos (e.g., "Johan Nilson" → "Johan Nilsson") (F-008)
- [ ] **IMPEX-06**: Pivot/grid format detection and automatic unpivoting to flat format (F-026)
- [ ] **IMPEX-07**: Import executes in a single database transaction with rollback on failure (F-006)
- [ ] **IMPEX-08**: Server-side Excel processing — files processed on server, not client (ADR-007)
- [ ] **IMPEX-09**: Handle Swedish character encoding (å, ä, ö) in .xls files (Research: codepage pitfall)
- [ ] **IMPEX-10**: Handle merged cells, hidden rows, formula cells gracefully (Research: pitfall)
- [ ] **IMPEX-11**: Flat table view with sorting, filtering, pagination for all allocation data (F-009)
- [ ] **IMPEX-12**: Excel/CSV export with current filters applied (F-009)
- [ ] **IMPEX-13**: Downloadable import templates with headers and example data (F-019)

### Platform Admin (PLAT)

- [ ] **PLAT-01**: Platform admin auth — separate email/password login with own JWT, not Clerk (F-029)
- [ ] **PLAT-02**: Platform admin dashboard showing all organizations with health metrics (F-029)
- [ ] **PLAT-03**: Tenant impersonation — log in as any user in any org with visible banner (F-030)
- [ ] **PLAT-04**: Every impersonation action logged in platform audit log with admin identity (F-030, F-036)
- [ ] **PLAT-05**: Impersonation sessions expire after 1 hour max (F-030)
- [ ] **PLAT-06**: Tenant management — create, suspend, reactivate, delete organizations (F-031)
- [ ] **PLAT-07**: Manual subscription management — extend trials, override status (F-032)
- [ ] **PLAT-08**: Platform audit log — every admin action with who/what/when/IP (F-036)
- [ ] **PLAT-09**: Cross-tenant user management — reset passwords, force logout via Clerk SDK (F-037)
- [ ] **PLAT-10**: Auth separation verified — no tenant endpoint accessible with platform token and vice versa (F-029)
- [ ] **PLAT-11**: Seed script creates initial platform admin account (Phase 1E definition of done)

---

## v2 Requirements (Post-MVP)

- [ ] Team Overview heat map — all people, color-coded months, department grouping (F-013)
- [ ] Project View — staffing per project, hours grid, summary row (F-014)
- [ ] Management Dashboard — KPI cards, departmental heat map, alerts (F-015)
- [ ] Capacity alerts — overloaded, under-utilized (F-016)
- [ ] Discipline breakdown charts (F-017)
- [ ] PDF export from Team Overview (F-027)
- [ ] Onboarding wizard for new organizations (F-028)
- [ ] System health monitoring — error rates per tenant, import failures, slow queries (F-033)
- [ ] Feature flags per tenant (F-034)
- [ ] Tenant data operations — export, migrate, merge (F-035)
- [ ] System announcements to all tenants (F-038)
- [ ] Leave management integration (Research: table stakes gap)
- [ ] Dark mode (A9)

## Out of Scope

- **Stripe billing** — Deferred from MVP per user decision. No revenue integration needed yet.
- **SSO / SAML** (F-023) — Enterprise feature, Phase 3. Available via Clerk when needed.
- **Audit trail** (F-024) — Phase 3.
- **Public API** (F-025) — Phase 3.
- **Department-level scoping** (F-022) — Phase 3. Intentional re-prioritization (A14).
- **Time tracking** — Anti-feature (Research). Agency workflow, not engineering.
- **Full project management** — Anti-feature. Focus on capacity, not task management.
- **Daily/weekly task scheduling** — Anti-feature. Monthly granularity is the core unit.
- **AI auto-scheduling** — Anti-feature. Planners want control, not black-box optimization.
- **Native mobile app** — Anti-feature for MVP. Desktop-first, responsive to 1024px.
- **Gantt charts** — Anti-feature. Grid/heatmap is the core paradigm.

## Traceability

| REQ-ID   | Phase | Phase Name                            | Status  |
| -------- | ----- | ------------------------------------- | ------- |
| FOUND-01 | 2     | DB Schema & Tenant Isolation          | Pending |
| FOUND-02 | 2     | DB Schema & Tenant Isolation          | Pending |
| FOUND-03 | 1     | Project Scaffolding & Dev Environment | Pending |
| FOUND-04 | 2     | DB Schema & Tenant Isolation          | Pending |
| FOUND-05 | 2     | DB Schema & Tenant Isolation          | Pending |
| FOUND-06 | 3     | Authentication & App Shell            | Pending |
| FOUND-07 | 2     | DB Schema & Tenant Isolation          | Pending |
| FOUND-08 | 3     | Authentication & App Shell            | Pending |
| FOUND-09 | 1     | Project Scaffolding & Dev Environment | Pending |
| AUTH-01  | 3     | Authentication & App Shell            | Pending |
| AUTH-02  | 3     | Authentication & App Shell            | Pending |
| AUTH-03  | 3     | Authentication & App Shell            | Pending |
| AUTH-04  | 3     | Authentication & App Shell            | Pending |
| AUTH-05  | 3     | Authentication & App Shell            | Pending |
| AUTH-06  | 3     | Authentication & App Shell            | Pending |
| AUTH-07  | 3     | Authentication & App Shell            | Pending |
| AUTH-08  | 3     | Authentication & App Shell            | Pending |
| INPUT-01 | 6     | AG Grid Spike & Core Grid             | Pending |
| INPUT-02 | 6     | AG Grid Spike & Core Grid             | Pending |
| INPUT-03 | 6     | AG Grid Spike & Core Grid             | Pending |
| INPUT-04 | 6     | AG Grid Spike & Core Grid             | Pending |
| INPUT-05 | 6     | AG Grid Spike & Core Grid             | Pending |
| INPUT-06 | 7     | Grid Polish & Navigation              | Pending |
| INPUT-07 | 7     | Grid Polish & Navigation              | Pending |
| INPUT-08 | 6     | AG Grid Spike & Core Grid             | Pending |
| INPUT-09 | 7     | Grid Polish & Navigation              | Pending |
| INPUT-10 | 7     | Grid Polish & Navigation              | Pending |
| INPUT-11 | 7     | Grid Polish & Navigation              | Pending |
| INPUT-12 | 6     | AG Grid Spike & Core Grid             | Pending |
| INPUT-13 | 6     | AG Grid Spike & Core Grid             | Pending |
| INPUT-14 | 7     | Grid Polish & Navigation              | Pending |
| MGMT-01  | 4     | Person & Project CRUD                 | Pending |
| MGMT-02  | 4     | Person & Project CRUD                 | Pending |
| MGMT-03  | 5     | Reference Data Admin                  | Pending |
| MGMT-04  | 5     | Reference Data Admin                  | Pending |
| MGMT-05  | 5     | Reference Data Admin                  | Pending |
| IMPEX-01 | 8     | Import Wizard                         | Pending |
| IMPEX-02 | 8     | Import Wizard                         | Pending |
| IMPEX-03 | 8     | Import Wizard                         | Pending |
| IMPEX-04 | 8     | Import Wizard                         | Pending |
| IMPEX-05 | 8     | Import Wizard                         | Pending |
| IMPEX-06 | 8     | Import Wizard                         | Pending |
| IMPEX-07 | 8     | Import Wizard                         | Pending |
| IMPEX-08 | 8     | Import Wizard                         | Pending |
| IMPEX-09 | 8     | Import Wizard                         | Pending |
| IMPEX-10 | 8     | Import Wizard                         | Pending |
| IMPEX-11 | 9     | Flat Table View & Export              | Pending |
| IMPEX-12 | 9     | Flat Table View & Export              | Pending |
| IMPEX-13 | 8     | Import Wizard                         | Pending |
| PLAT-01  | 10    | Platform Admin                        | Pending |
| PLAT-02  | 10    | Platform Admin                        | Pending |
| PLAT-03  | 10    | Platform Admin                        | Pending |
| PLAT-04  | 10    | Platform Admin                        | Pending |
| PLAT-05  | 10    | Platform Admin                        | Pending |
| PLAT-06  | 10    | Platform Admin                        | Pending |
| PLAT-07  | 10    | Platform Admin                        | Pending |
| PLAT-08  | 10    | Platform Admin                        | Pending |
| PLAT-09  | 10    | Platform Admin                        | Pending |
| PLAT-10  | 10    | Platform Admin                        | Pending |
| PLAT-11  | 10    | Platform Admin                        | Pending |

---

_60 v1 requirements across 6 categories. 13 v2 requirements deferred. 11 explicit exclusions._
