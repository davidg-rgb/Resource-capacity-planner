# Resource Capacity Planner — Scoping Document

**Status:** Draft v3
**Last updated:** 2026-03-25

---

## 1. Problem Statement

Engineering and product-development organizations manage resource planning through spreadsheets or legacy desktop tools (MS Access, SQL Server). While functional at small scale, these break down as teams grow:

- No real-time visibility into over/under-allocation across people
- Manual effort to detect conflicts and capacity issues
- Data locked in single-user files with no shared source of truth
- No visual feedback — planners mentally parse raw numbers to assess workload
- No collaboration across line managers or departments

The goal is a **web-based SaaS product** that replaces the spreadsheet workflow with something faster, smarter, and collaborative by default. The product targets engineering organizations, PMOs, and resource managers who have outgrown spreadsheets but don't need the complexity of enterprise PPM tools.

---

## 1.1 SaaS Product Model

Multi-tenant SaaS application. Each customer organization is a tenant with fully isolated data.

**Onboarding flow:** Self-service sign-up → create organization → invite team members → bulk import existing data (or start fresh). The bulk Excel import is the core conversion mechanism — upload your spreadsheet, see your data visualized instantly.

**Billing model:** TBD — likely per-resource-managed or tiered. Free trial with data import to drive activation.

**Key SaaS requirements:** tenant data isolation, auth and user management (invite flows, SSO in later phases), subscription/billing infrastructure, onboarding wizard.

---

## 1.2 Competitive Landscape

The resource/capacity planning market is crowded but biased: nearly every tool is built for **professional services, agencies, and consulting firms** — not engineering or product-development organizations. This creates a meaningful gap.

### Direct Competitors

**Float** (~4,500 customers, #1 on G2 for Resource Management)
- Clean drag-and-drop scheduling UI, strong brand, built-in time tracking.
- Task-based, calendar-driven approach optimized for short-term (day/week) visibility — weaker for 6–18 month capacity planning. Reporting frequently criticized as limited. Not suited for manufacturing or complex multi-layered projects. Views get crowded at scale.
- Pricing: from $6/user/month (per-user, not per-resource).
- Gap: Float is day/week-oriented. Our core use case is monthly planning across 18+ month horizons.

**Runn** (~15k users, NZ-based)
- Strong long-term capacity visualization, scenario planning, financial/profitability tracking, open API. Clean UI.
- Still younger product with feature gaps. Limited native integrations. Primarily targets IT, consulting, and agencies. Oriented around billable hours/project profitability.
- Pricing: ~$8/resource/month (per person managed, not per user).
- Gap: Closest competitor on planning horizon but agency-shaped. No engineering discipline taxonomy.

**Resource Guru** (UK-based)
- Extreme simplicity, fast to implement. Good clash management.
- Simplicity is the ceiling — teams outgrow it. Reporting only on premium plans. Not suited for large orgs.
- Pricing: from ~$5/resource/month.
- Gap: Too basic for multi-attribute filtering (discipline + department + program).

### Adjacent / Enterprise

- **Productive** — all-in-one agency management. Too agency-specific.
- **Saviom** — enterprise resource management, highly customizable but sacrifices usability.
- **EpicFlow** — enterprise-grade for defense/engineering but locked behind enterprise pricing.
- **Meisterplan / Planview / Celoxis** — full PPM suites. Resource planning is one module among many. Configuration-heavy, enterprise pricing.
- **Monday / Asana / ClickUp** — general PM tools with bolted-on capacity views. Broad but shallow.

### The Market Gap

Almost every tool is built around:
1. **Agency model** — billable hours, client projects, margins. Core question: "are we billing enough?"
2. **Enterprise PPM model** — portfolio management, strategic alignment. Core question: "are we investing in the right programs?"

What's underserved is the **engineering operations model** — core question: *"Do we have the right people with the right disciplines available for our projects over the next 12–18 months?"*

This world features: multi-disciplinary teams (SW, mechanical, electronics, test), program/platform-based project hierarchies, monthly planning granularity, capacity as hours available vs. hours planned (not billable vs. non-billable), 12–18 month planning horizons, and users who think in spreadsheets.

### Positioning

**"The capacity planner for engineering teams that have outgrown Excel but don't need enterprise PPM."**

Sweet spot: 20–500 managed resources, multi-disciplinary engineering teams, program/platform-based projects, monthly granularity over 12–18 months. Currently using Excel or homegrown databases.

We win on: zero-friction Excel import onboarding, engineering-native taxonomy (disciplines, departments, programs), month-level planning density, spreadsheet-familiar editing, and focused simplicity vs. bloated platforms.

---

## 2. Users & Roles

### 2.1 Tenant-Level Roles

| Role | Description |
|---|---|
| **Org Owner** | Creates the organization. Manages billing, subscription, and org settings. Full admin rights. |
| **Admin** | Manages reference data (people, projects, programs, disciplines, departments). Handles bulk imports. Invites users. |
| **Planner / Line Manager** | Primary user. Edits allocations for their people. Core workflow: open person → edit grid → next person → export flat table. |
| **Viewer** | Read-only access to see plans, overview, and export data. |

### 2.2 Scoping

All users belong to one tenant (organization). In MVP, all roles see all data within their org. Department-level scoping (line manager sees only their people) is Phase 2.

---

## 3. Data Model

### 3.1 Architecture Principle

> **"Vi sparade inte data, utan packade upp datat för en individ för en period o visade."**
>
> The input form does NOT store data. It unpacks one person's allocations from the flat table into an editable grid, and writes changes back. The flat table is the canonical data store. All views derive from it.

### 3.2 Core Entities

**Organization (Tenant)**
- Name, slug (for URL), subscription status
- All entities below are scoped to an organization

**User (Auth)**
- Email, name, organization (FK), role (owner/admin/planner/viewer)

**Person (Resource)**
- Name (first, last)
- Discipline (e.g., SW, Mechanical, Electronics, Test, Systems, HW, PT)
- Department / Line Group (e.g., RoD, Operations)
- Target capacity (hours/month — configurable per person, e.g., 150h, 160h, 80h for part-time)
- Organization (FK)

> **Person ≠ User.** A Person is a resource being planned. A User logs into the app. A line manager (User) may manage 10 people (Persons) who never log in.

**Project**
- Name
- Parent: Program or Product Family / Platform
- Status (active, planned, archived)

**Program / Platform**
- Name, description
- Single level of hierarchy above projects

**Allocation (The Flat Table)**
- Person (FK)
- Project (FK)
- Month (year-month, stored as first-of-month date, e.g., 2026-03-01)
- Planned hours (integer)

> This is the central table. One row = one person's planned hours on one project for one month. Matches the client's legacy "Data tabellen" structure: Name, Dept, Role, Period, Hours, Project. We normalize Person/Project into FKs but the shape is identical. All views and exports derive from this table.

### 3.3 Reference Data

Disciplines, departments, and program/platform lists are admin-configurable (not hardcoded). Managed through admin UI. Available as dropdowns/filters throughout the app.

---

## 4. Core Views

### 4.1 Person Input Form (Primary — Editing)

The main editing interface. **One person at a time.** A line manager opens a person, sees their project allocations as an editable spreadsheet grid, makes changes, moves to the next person.

**Layout:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  Person: [◄] Anna Lindström [►]  ·  SW dev  ·  Drivetrain           │
│  Target: 150h/month                                                  │
├──────────────┬────────┬────────┬────────┬────────┬────────┬────────┤
│              │ Jan-26 │ Feb-26 │ Mar-26 │ Apr-26 │ May-26 │  ...   │
├──────────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ Project 1 [▼]│   0    │    0   │    0   │    0   │    0   │        │
│ Project 2 [▼]│  10    │   10   │   10   │   10   │   10   │        │
│ Project 3 [▼]│ 140    │  140   │  140   │  140   │  140   │        │
│ (empty)   [▼]│        │        │        │        │        │        │
│ (empty)   [▼]│        │        │        │        │        │        │
├──────────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ SUMMA        │  150   │  150   │  150   │  150   │  150   │        │
│ Target       │  150   │  150   │  150   │  150   │  150   │        │
│ Status       │   ✓    │   ✓    │   ✓    │   ✓    │   ✓    │        │
└──────────────┴────────┴────────┴────────┴────────┴────────┴────────┘
                         ◄──── 9 months visible, scroll for 24-36 ────►
```

**Key elements:**
- **Person selector** — prev/next arrows, dropdown, or sidebar list to navigate between people
- **Person metadata** — name, discipline, department, target hours at top
- **Project rows** — each row has a project dropdown. 5 rows by default (expandable). Selecting a project populates from existing flat-table data.
- **Month columns** — rolling window ~9 months visible, scrollable across 24–36 months
- **Editable cells** — each cell is a number input (hours). Direct click to edit.
- **SUMMA row** — auto-calculated total per month. Updates in real time.
- **Target row** — person's monthly capacity target
- **Status row** — visual: green (OK), amber (near full), red (over), gray (very low)

**Spreadsheet interactions (critical):**
- Direct cell editing: click → type → Tab/Enter to navigate
- Copy-paste: Ctrl+C/V compatible with Excel clipboard
- Drag-to-fill: corner handle, drag to replicate values
- Multi-select: click-drag range, type to fill all
- Keyboard: arrow keys, Enter (commit + down), Tab (commit + right), Escape (cancel)

**Save behavior:**
- Auto-save on cell blur
- On save: find/create/update/delete allocation record in flat table
- Subtle "saved" indicator
- Conflict detection for concurrent edits

### 4.2 Team Overview (Primary — Reading)

All people at once. Read-only capacity heat map for scanning after individual editing.

- Rows: all people in scope (filterable by discipline, department)
- Columns: months
- Cells: total hours per person per month, color-coded (green/amber/red)
- Click person → opens their Input Form (4.1)

### 4.3 Project View (Secondary)

Select a project, see all people allocated over time.

- Rows: people assigned (with discipline badges)
- Columns: months
- Cells: hours on this project
- Summary row: total hours/month
- Click person → opens Input Form

### 4.4 Flat Table View (Data Table)

Raw allocation data as it exists in the database. One row per allocation.

- Columns: Person, Discipline, Department, Project, Program, Month, Hours
- Sortable, filterable, searchable, read-only
- **Export to Excel/CSV** — the client's primary analysis workflow
- Filterable before export by any attribute or date range

### 4.5 Dashboard / Overview (Phase 2)

Department-level and program-level capacity utilization. KPIs, heat map grid, alerts, discipline breakdowns.

---

## 5. Bulk Import

### 5.1 Import Targets

| Type | Purpose |
|---|---|
| **People** | Bulk load personnel: name, discipline, department, capacity |
| **Projects** | Bulk load projects with program/platform |
| **Allocations** | Bulk load the full allocation matrix |

### 5.2 Supported Formats

- **Flat table** — one row per allocation (matches legacy "Data tabellen")
- **Pivot/grid** — projects as rows, months as columns (matches "Inmatnings-sida" layout). System detects and unpivots.

### 5.3 Import Flow

1. Upload .xlsx or .csv
2. Column mapping — auto-detect + user adjust. Handles Swedish headers (Namn, Avdelning, Timmar, Projekt, Månad).
3. Validation — required fields, reference matching, duplicate detection, capacity warnings
4. Preview — X new, Y updates, Z conflicts
5. Confirm & import — resolve conflicts inline

### 5.4 Templates

Downloadable Excel templates per import type with headers, examples, and validated dropdowns.

---

## 6. Data Export

- Flat table → Excel/CSV from Data Table view
- All columns: Person, Discipline, Department, Project, Program, Month, Hours
- Filterable before export
- Core requirement — the client's primary analysis workflow

---

## 7. Interaction Patterns

### 7.1 Design Principles

- **Excel-native feel.** The grid must feel like a spreadsheet. Use a dedicated component (AG Grid / Handsontable).
- **One person at a time.** Sequential editing workflow: open → edit → next.
- **Flat table is truth.** Input form unpacks and repacks. Stores nothing itself.
- **Real-time feedback.** SUMMA + status update instantly.
- **Density for reading, focus for editing.** Team overview is dense. Input form is focused.

### 7.2 Navigation

- Prev/Next arrows to cycle through people
- Person dropdown to jump by name
- Sidebar list with capacity status dots (green/amber/red per person)

---

## 8. Technical Architecture

### 8.1 Frontend

- **Framework:** Next.js (React)
- **Spreadsheet grid:** AG Grid (Enterprise) or Handsontable — most critical choice. Must support: direct editing, clipboard Excel interop, drag-to-fill, keyboard nav, range selection.
- **Team overview:** lighter React component (read-only)
- **State:** React Query / SWR. Grid manages cell state; sync to API on blur.

### 8.2 Backend

- Next.js API routes or separate service
- PostgreSQL (Supabase, Neon, or AWS RDS)
- Row-level security with organization_id
- Prisma or Drizzle ORM
- SheetJS for Excel import/export

### 8.3 Auth

- Clerk, Auth.js, or Supabase Auth
- Email/password, magic link, Google OAuth. SSO later.
- Invite system: admin invites → user creates account → auto-joined

### 8.4 Billing

- Stripe. Per-resource or tiered. Free trial.

### 8.5 Hosting

- Vercel (frontend), managed PostgreSQL (DB), S3-compatible (file uploads)
- Sentry (errors), GitHub Actions → Vercel (CI/CD)

---

## 9. Open Questions

### Product & Market
1. Target customer profile — engineering only, or broader?
2. Pricing model — per-resource, per-seat, or tiers?
3. Naming and branding

### Functional
4. Capacity target — 150h standard (per example) or varies? Part-time handling?
5. Project hierarchy — one level (Project → Program) enough?
6. Granularity — monthly only, or ever weekly?
7. Historical data — view past allocations?
8. Project rows — 5 default expandable, or dynamic?

### Technical
9. Data volume per tenant — expected people/projects/months?
10. GDPR — employee name storage requirements? Data residency?

---

## 10. Phasing

### Phase 1 — MVP

- Multi-tenant data model + PostgreSQL
- Auth: sign-up, login, org creation, invite users
- **Person Input Form** with spreadsheet grid (AG Grid / Handsontable)
- Person navigation (prev/next, dropdown, sidebar with status dots)
- SUMMA + target + status rows with real-time calculation
- Bulk import with column mapping + validation
- Flat table view with Excel/CSV export
- Admin UI for reference data
- Stripe (single plan or free beta)

### Phase 2 — Product-Market Fit

- Team Overview heat map
- Project View
- Dashboard with KPIs, alerts, breakdowns
- Filtered exports, onboarding wizard, tiered pricing

### Phase 3 — Scale & Stickiness

- Role-based scoping (line manager sees only their people)
- SSO / SAML
- Multi-user conflict resolution
- Integrations (Jira, HR, time tracking)
- Audit trail, public API
