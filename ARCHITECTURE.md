# Nordic Capacity — Resource Capacity Planner Architecture Blueprint

> Generated from: `resource-planner-scope.md`, `07-resource-capacity-prd.html`, and 8 screen prototypes
> Date: 2026-03-25
> Status: DRAFT — Pending Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Requirements Analysis](#2-requirements-analysis)
3. [Architecture Decision Records](#3-architecture-decision-records)
4. [Tech Stack](#4-tech-stack)
5. [Project Structure](#5-project-structure)
6. [Module & Function Definitions](#6-module--function-definitions)
7. [Data Models](#7-data-models)
8. [Interface Contracts](#8-interface-contracts)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Dependency Map](#10-dependency-map)
11. [Cross-Cutting Concerns](#11-cross-cutting-concerns)
12. [Extensibility Guide](#12-extensibility-guide)
13. [Risk Register](#13-risk-register)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [Build Verification Checklist](#15-build-verification-checklist)

---

## 1. Executive Summary

Nordic Capacity is a multi-tenant SaaS web application that replaces Excel/Access-based resource planning for engineering organizations. It provides a spreadsheet-familiar editing experience for capacity planning at monthly granularity across 12-18 month horizons, targeting organizations managing 20-500 resources across multi-disciplinary engineering teams (software, mechanical, electronics, test, systems, hardware).

The system's central data structure is a flat allocation table — one row per person/project/month — from which all views derive. The primary editing interface unpacks this table into an editable grid for one person at a time, then writes changes back. Secondary views provide team-level heat maps, project staffing views, raw data export, and management dashboards.

The architecture is a modular monolith built on Next.js with PostgreSQL, designed for single-team development velocity while maintaining clear module boundaries that support future decomposition. The system uses row-level tenant isolation, server-side rendering for initial loads, and client-side state management for the interactive spreadsheet grid.

**Scale targets:** 50-200 concurrent users per tenant, 500 managed resources, ~100 active projects, 36-month planning window = ~1.8M potential allocation cells per tenant (500 people x 100 projects x 36 months, though actual density is ~5-10%).

---

## 2. Requirements Analysis

### 2.1 Core Features

| ID    | Feature                                                                                                                                                         | Priority | Phase |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| F-001 | Multi-tenant organization with data isolation                                                                                                                   | Must     | 1     |
| F-002 | Auth: sign-up, login, org creation, user invitation                                                                                                             | Must     | 1     |
| F-003 | Person Input Form with spreadsheet-grade grid editing                                                                                                           | Must     | 1     |
| F-004 | Person navigation (prev/next, sidebar list with status dots)                                                                                                    | Must     | 1     |
| F-005 | SUMMA + Target + Status rows with real-time calculation                                                                                                         | Must     | 1     |
| F-006 | Bulk import with 4-step wizard (Upload, Map, Validate, Import)                                                                                                  | Must     | 1     |
| F-007 | Column mapping with auto-detection of Swedish/English headers                                                                                                   | Must     | 1     |
| F-008 | Import validation with error/warning categorization and suggestions                                                                                             | Must     | 1     |
| F-009 | Flat table view with sorting, filtering, and Excel/CSV export                                                                                                   | Must     | 1     |
| F-010 | Admin UI for reference data (disciplines, departments, programs, projects)                                                                                      | Must     | 1     |
| F-011 | Person CRUD (name, discipline, department, target capacity)                                                                                                     | Must     | 1     |
| F-012 | Project CRUD (name, program, status)                                                                                                                            | Must     | 1     |
| F-013 | Team Overview heat map (read-only, all people, color-coded)                                                                                                     | Must     | 2     |
| F-014 | Project View (staffing per project, hours grid, summary row)                                                                                                    | Must     | 2     |
| F-015 | Management Dashboard with KPI cards and departmental heat map                                                                                                   | Should   | 2     |
| F-016 | Capacity alerts (overloaded, under-utilized)                                                                                                                    | Should   | 2     |
| F-017 | Discipline breakdown charts                                                                                                                                     | Should   | 2     |
| F-018 | Stripe billing integration                                                                                                                                      | Should   | 1     |
| F-019 | Downloadable import templates                                                                                                                                   | Should   | 1     |
| F-020 | Auto-save on cell blur with conflict detection                                                                                                                  | Must     | 1     |
| F-021 | Spreadsheet interactions: clipboard, drag-to-fill, keyboard nav, range select (range fill: Should Phase 1, defer if AG Grid Community doesn't support natively) | Must     | 1     |
| F-022 | Department-level scoping (line manager sees only their people)                                                                                                  | Should   | 3     |
| F-023 | SSO / SAML authentication                                                                                                                                       | Could    | 3     |
| F-024 | Audit trail                                                                                                                                                     | Could    | 3     |
| F-025 | Public API                                                                                                                                                      | Could    | 3     |
| F-026 | Pivot/grid format import detection and unpivoting                                                                                                               | Should   | 1     |
| F-027 | PDF export from Team Overview                                                                                                                                   | Should   | 2     |
| F-028 | Onboarding wizard for new organizations                                                                                                                         | Should   | 2     |
| F-029 | Platform admin dashboard (all orgs overview, health metrics, subscription status)                                                                               | Must     | 1E    |
| F-030 | Tenant impersonation (log in as any user in any org for support/debugging, with full audit trail)                                                               | Must     | 1E    |
| F-031 | Tenant management (create/suspend/reactivate/delete organizations)                                                                                              | Must     | 1E    |
| F-032 | Manual subscription management (extend trials, apply credits, override plans)                                                                                   | Must     | 1E    |
| F-033 | System health monitoring (error rates per tenant, import failure tracking, slow queries)                                                                        | Should   | 1E    |
| F-034 | Feature flags per tenant (beta features, premium tier features)                                                                                                 | Should   | 1E    |
| F-035 | Tenant data operations (export full tenant data, migrate, merge)                                                                                                | Should   | 2     |
| F-036 | Platform audit log (every platform admin action logged with who/what/when)                                                                                      | Must     | 1E    |
| F-037 | Cross-tenant user management (reset passwords, unlock accounts, force logout)                                                                                   | Must     | 1E    |
| F-038 | Announcements and maintenance notices to all tenants                                                                                                            | Should   | 2     |

### 2.2 User Roles & Journeys

**Roles:**

| Role                   | Permissions                                         |
| ---------------------- | --------------------------------------------------- |
| Org Owner              | Full admin + billing + subscription management      |
| Admin                  | Manage reference data, handle imports, invite users |
| Planner / Line Manager | Edit allocations for their people, view all data    |
| Viewer                 | Read-only access to all views, can export data      |

**Platform-Level Role (NOT a tenant role — separate auth system):**

| Role                         | Permissions                                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform Admin (Super Admin) | Cross-tenant visibility and access. Can view all organizations, impersonate any user, manage subscriptions, suspend/reactivate orgs, view system health, manage feature flags, broadcast announcements. Authenticated via `platform_admins` table with `PLATFORM_ADMIN_SECRET`, completely separate from Clerk tenant auth. |

**Journey 5: Platform Admin Resolves Support Ticket**

1. Customer emails: "We accidentally deleted a project with allocations"
2. Platform admin logs into platform admin panel (`/platform/*` routes)
3. Searches for customer org by name → finds "Acme Engineering"
4. Reviews org health: 45 users, active subscription, last import 2 hours ago
5. Impersonates the org owner → sees the application as that user would
6. Navigates to admin → projects → finds archived "Project Falcon" in trash
7. Restores the project (admin capability) → allocations reappear
8. Ends impersonation → returns to platform admin panel
9. Every action during impersonation is logged with the platform admin's identity

**Journey 6: Platform Admin Onboards Enterprise Customer**

1. Sales closes deal → platform admin creates org manually
2. Sets subscription to "active" with custom plan (bypassing Stripe trial)
3. Enables beta feature flags: "advanced-dashboard", "api-access"
4. Creates initial admin user account for the customer
5. Sends welcome announcement visible only to that org

**Journey 1: Line Manager Daily Workflow (Primary)**

1. Log in → land on last-visited person input form
2. Open person (from sidebar or prev/next) → review their allocation grid
3. Edit cells: click/type hours, tab to next cell, drag-to-fill repeated values
4. See SUMMA update in real time, status row changes color
5. Navigate to next person → repeat
6. Switch to Team Overview to scan for red/amber cells across team
7. Go to Flat Table → filter by department → export to Excel for monthly report

**Journey 2: Admin Bulk Import (Weekly/Monthly)**

1. Navigate to Data tab → Bulk Import
2. Upload .xlsx file with allocation data (Swedish headers: Namn, Projekt, Timmar, Månad, Avdelning)
3. System auto-maps columns → admin confirms or adjusts mapping
4. View validation results: 820 ready, 25 warnings, 5 errors
5. Review errors: typo in person name → apply suggestion "Johan Nilson" → "Johan Nilsson"
6. Ignore warnings for duplicate allocations (override existing)
7. Import 820 rows → see success confirmation

**Journey 3: Manager Dashboard Review (Phase 2)**

1. Navigate to Dashboard tab
2. See KPI cards: 240 total resources, 92% avg utilization, 12 overloaded, 4 unallocated
3. Review departmental utilization heat map — Electronics at 98% in May (red)
4. Read strategic alert: "Electronics team over 90% in Apr-May. Milestone 'Alpha-V2' at risk."
5. Click into overloaded department → see team overview filtered

**Journey 4: New Organization Onboarding**

1. Sign up with email → create organization (name, slug)
2. Invited to add team members (email invites)
3. Upload existing Excel spreadsheet → guided import flow
4. See data visualized immediately in Person Input Form

### 2.3 Constraints

| Constraint      | Detail                                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance     | Grid must render <200ms for 10 projects x 36 months. Team overview must load <1s for 500 people x 12 months.                                                |
| Data volume     | 500 resources, 100 projects, 36-month window per tenant. Allocation table ~90K rows (at 5% density) to ~1.8M rows (100% density). Realistic: ~50-200K rows. |
| Browser support | Chrome, Edge, Firefox latest-2. Safari latest. Desktop-first, responsive to 1024px minimum.                                                                 |
| Accessibility   | WCAG 2.1 AA for navigation. Grid editing exempt from full accessibility due to spreadsheet interaction model.                                               |
| I18n            | UI in English. Import system must handle Swedish column headers and month names. Future: full Swedish localization.                                         |
| Compliance      | GDPR — employee names stored, requires data processing agreement. Tenant data isolation. Data residency: EU (primary).                                      |
| Team size       | 1-3 developers. Architecture must support solo development velocity.                                                                                        |
| Budget          | Managed services over self-hosted. Minimize operational complexity.                                                                                         |

### 2.4 Integrations

| Integration       | Phase | Purpose                                                         |
| ----------------- | ----- | --------------------------------------------------------------- |
| Stripe            | 1     | Subscription billing, plan management, usage metering           |
| Google OAuth      | 1     | Social login                                                    |
| SheetJS (xlsx)    | 1     | Excel file parsing for import, Excel file generation for export |
| Sentry            | 1     | Error monitoring and performance tracking                       |
| Resend / SendGrid | 1     | Transactional email (invites, password reset)                   |
| Vercel Analytics  | 1     | Web analytics and performance monitoring                        |
| Jira              | 3     | Project sync (future)                                           |
| HR Systems        | 3     | People sync (future)                                            |

### 2.5 Open Questions / Resolved Ambiguities

| #   | Question                                                      | Resolution                                                                                                                                                                                                                                                                                                                                                                       | Rationale                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Capacity target — fixed or per-person?                        | **Per-person**, defaulting to 160h/month for new resources.                                                                                                                                                                                                                                                                                                                      | PRD says "configurable per person" (150h, 160h, 80h for part-time). Screens show 150h target. Default to 160h (standard full-time) with override.                                                                                                                                                   |
| A2  | Project hierarchy depth — one level enough?                   | **One level: Project → Program.**                                                                                                                                                                                                                                                                                                                                                | Scoping doc explicitly states "single level of hierarchy above projects." Sufficient for engineering orgs. Deeper nesting adds complexity without clear value.                                                                                                                                      |
| A3  | Monthly only or weekly granularity?                           | **Monthly only for Phase 1-2.** Planning horizon is 12-18 months; monthly is the natural unit.                                                                                                                                                                                                                                                                                   | Screen 08 shows weekly inputs but that screen is an alternate view of the same data. The canonical unit is month. Weekly can be added as a sub-view in Phase 3.                                                                                                                                     |
| A4  | Historical data — view past allocations?                      | **Yes, read-only for past months.** Current month and forward are editable. Past months are locked.                                                                                                                                                                                                                                                                              | Engineering managers need to compare plans vs. actuals. Past data should be preserved but not mutable.                                                                                                                                                                                              |
| A5  | Project rows — fixed 5 or dynamic?                            | **Dynamic with minimum 1 empty row.** Add new rows via "Add project..." row at bottom.                                                                                                                                                                                                                                                                                           | Screen 04 shows an "Add project..." placeholder row. Dynamic is more flexible and matches spreadsheet behavior.                                                                                                                                                                                     |
| A6  | Auto-save vs. explicit save?                                  | **Auto-save on cell blur** with a manual "Save Worksheet" button as safety net.                                                                                                                                                                                                                                                                                                  | Scoping doc says "auto-save on cell blur." Screen 04 shows "Save Worksheet" and "Discard Changes" buttons. Both are needed — auto-save for flow, explicit save for confidence.                                                                                                                      |
| A7  | Top nav + side nav — which is primary?                        | **Top nav for primary view switching** (Input/Team/Projects/Data/Dashboard). **Side nav for contextual navigation** within views (Resources/Allocations/Capacity/Milestones/Reports + person list).                                                                                                                                                                              | Both appear in prototypes. Top nav is consistent across all screens. Side nav content changes per context.                                                                                                                                                                                          |
| A8  | Notification system scope?                                    | **Phase 2.** Bell icon is present in all screens but notifications require alert infrastructure (capacity thresholds, import completion, etc.).                                                                                                                                                                                                                                  | Placeholder icon in Phase 1. Real notifications in Phase 2 alongside dashboard.                                                                                                                                                                                                                     |
| A9  | Dark mode?                                                    | **Phase 2.** Light theme first per creative direction. Dark mode class structure is in prototypes' Tailwind config.                                                                                                                                                                                                                                                              | Creative brief says "Light Theme First." Tailwind darkMode: "class" is already configured. Ship light, add dark via CSS variables toggle.                                                                                                                                                           |
| A10 | AG Grid vs Handsontable?                                      | **AG Grid Community Edition.**                                                                                                                                                                                                                                                                                                                                                   | See ADR-003 below for full analysis.                                                                                                                                                                                                                                                                |
| A11 | Which sidebar items are MVP?                                  | **Resources and Allocations only.** Capacity, Milestones, Reports are Phase 2+.                                                                                                                                                                                                                                                                                                  | MVP focuses on person input form (allocations) and person management (resources). Other sidebar items map to Phase 2 features.                                                                                                                                                                      |
| A12 | "Program" field on import — is it required?                   | **Optional.** Projects can exist without a program.                                                                                                                                                                                                                                                                                                                              | Some orgs use flat project lists without program hierarchy. Import should accept both.                                                                                                                                                                                                              |
| A14 | Department-level scoping — Phase 2 (scope doc) or Phase 3?    | **Phase 3 (intentional re-prioritization).** Scope doc specified department-level scoping as Phase 2. Architecture deliberately moves it to Phase 3 to prioritize Team Overview and Dashboard in Phase 2. This is an intentional re-prioritization, not an oversight.                                                                                                            | Phase 2 is already dense with Team Overview (F-013), Project View (F-014), Dashboard (F-015), and Alerts (F-016). Adding role-based data filtering to every query would risk Phase 2 delivery. Department scoping is a natural fit for Phase 3 alongside SSO and audit trail (enterprise features). |
| A13 | Free trial lifecycle — duration, expiry behavior, conversion? | **14-day free trial.** On expiry: read-only mode (users can view data and export, but cannot edit allocations, import data, or create/modify entities). Banner with upgrade CTA shown on every page. Trial-to-paid conversion via Stripe Checkout (`billingService.createCheckoutSession`). Platform admin can extend trials via `overrideSubscription(action: "extend_trial")`. | Scope doc specified "free trial with data import" but did not define expiry behavior. Read-only mode preserves data and trust while encouraging conversion. 14 days is standard SaaS trial length for tools that require data setup.                                                                |

---

## 3. Architecture Decision Records

### ADR-001: Modular Monolith over Microservices

**Decision:** Build as a modular monolith within a single Next.js application.

**Alternatives considered:**

- Microservices (separate auth, allocation, import, export services)
- Serverless functions (AWS Lambda / Vercel Functions per feature)

**Rationale:**

- Team size is 1-3 developers — microservices add deployment, networking, and debugging overhead with no benefit at this scale.
- All features share the same database and the same domain model (allocations, people, projects). No natural service boundary exists.
- Next.js API routes provide a clean module boundary without network hops.
- Modular monolith can be decomposed later if needed (the module boundaries are designed for it).

### ADR-002: PostgreSQL with Drizzle ORM

**Decision:** PostgreSQL on Neon (serverless) with Drizzle ORM.

**Alternatives considered:**

- Supabase (Postgres + auth + storage bundle)
- PlanetScale (MySQL)
- Prisma ORM

**Rationale:**

- PostgreSQL is the best fit for relational data with complex queries (aggregations across allocations, joins across tenants). The allocation table is highly relational.
- Neon provides serverless Postgres with connection pooling, branching for dev/staging, and auto-scaling. Better cold-start than Supabase for Vercel deployments.
- Drizzle over Prisma: Drizzle is SQL-first, generates better queries for complex aggregations (e.g., team overview requires GROUP BY person, month with conditional SUM). Prisma's abstraction can produce N+1 queries. Drizzle is also lighter weight and faster to boot.
- Row-level security via `organization_id` on every table. Enforced at ORM middleware level, not Postgres RLS (simpler to reason about and test).

### ADR-003: AG Grid Community Edition for Spreadsheet Grid

**Decision:** AG Grid Community Edition for the Person Input Form grid.

**Alternatives considered:**

- Handsontable (GPL + commercial license)
- Custom React grid (react-data-grid, TanStack Table)
- ProseMirror/Slate-based table editor

**Rationale:**

- AG Grid Community supports: direct cell editing, keyboard navigation (arrow keys, Tab, Enter), clipboard paste from Excel (text-based), column pinning (sticky project name column), custom cell renderers (for status row).
- Drag-to-fill and range selection require AG Grid Enterprise. Decision: implement drag-to-fill as a custom feature on top of Community Edition (it's a mousedown + mousemove handler on a corner div). Range selection is Phase 1; range fill (type-to-fill-all) deferred to Phase 2 if custom implementation required.
- Handsontable has a GPL license for open-source but requires a commercial license ($5K+/year) for SaaS. AG Grid Community is MIT-licensed.
- Custom grid (TanStack Table) would require building every spreadsheet interaction from scratch — 2-3 months of work for one developer.

### ADR-004: Next.js App Router with Server Components

**Decision:** Next.js 15 with App Router, Server Components for pages, Client Components for interactive elements.

**Alternatives considered:**

- Next.js Pages Router
- Remix
- SvelteKit

**Rationale:**

- App Router provides server components for data-heavy pages (team overview, flat table) — reduces client bundle. Server Actions for form submissions and mutations.
- Next.js has the strongest ecosystem for the chosen hosting (Vercel) and integrations (Clerk, Stripe).
- Pages Router is legacy. Remix has smaller ecosystem. SvelteKit would require team Svelte expertise.

### ADR-005: Clerk for Authentication

**Decision:** Clerk for auth and user management.

**Alternatives considered:**

- Auth.js (NextAuth)
- Supabase Auth
- Custom JWT auth

**Rationale:**

- Clerk provides: pre-built sign-up/login UI, organization management (maps to tenants), user invitation flow, role management, Google OAuth, magic links. All MVP auth requirements are covered out-of-box.
- Organization feature maps directly to multi-tenant model — each Clerk organization is a tenant.
- Auth.js requires building invitation flows, org management, and role management from scratch.
- SSO/SAML is a paid Clerk feature available when Phase 3 needs it.

### ADR-006: Tailwind CSS with Design Token Configuration

**Decision:** Tailwind CSS v4 with the design system tokens from the prototypes embedded in the config.

**Alternatives considered:**

- CSS Modules
- Styled Components
- Panda CSS

**Rationale:**

- All 8 screen prototypes are built with Tailwind and share an identical Tailwind config with the full Material Design 3-derived color system. Using the same tool ensures pixel-level fidelity to prototypes.
- The 30+ color tokens (primary, surface, error, outline-variant, etc.) are already defined in the config. Copy the config, get the design system.
- Manrope (headlines) + Inter (body) font families are already configured.

### ADR-007: Server-Side Excel Processing

**Decision:** Process Excel imports on the server using SheetJS (xlsx library). Generate Excel exports server-side.

**Alternatives considered:**

- Client-side processing (SheetJS in browser)
- Dedicated worker service

**Rationale:**

- Import files can be large (1,200+ rows). Client-side processing blocks the UI thread and is memory-constrained on low-end devices.
- Server-side processing allows validation against database (checking person names, project references) in the same request.
- SheetJS runs in Node.js. No additional service needed.
- Export also server-side: query database with filters, generate .xlsx, stream to client.

---

## 4. Tech Stack

| Layer          | Technology          | Version    | Purpose                                       |
| -------------- | ------------------- | ---------- | --------------------------------------------- |
| **Framework**  | Next.js             | 15.x       | Full-stack React framework, App Router        |
| **Language**   | TypeScript          | 5.x        | Type safety across client and server          |
| **Database**   | PostgreSQL          | 16         | Primary data store                            |
| **DB Hosting** | Neon                | Serverless | Managed Postgres with connection pooling      |
| **ORM**        | Drizzle             | 0.35+      | SQL-first ORM, migrations, type-safe queries  |
| **Auth**       | Clerk               | Latest     | Authentication, organizations, invites, roles |
| **Grid**       | AG Grid Community   | 32.x       | Spreadsheet-grade editing grid                |
| **Styling**    | Tailwind CSS        | 4.x        | Utility-first CSS matching prototypes         |
| **State**      | TanStack Query      | 5.x        | Server state management, caching, sync        |
| **Validation** | Zod                 | 3.x        | Schema validation (API, forms, imports)       |
| **Excel**      | SheetJS (xlsx)      | 0.20+      | Excel import/export                           |
| **Email**      | Resend              | Latest     | Transactional email                           |
| **Billing**    | Stripe              | Latest SDK | Subscriptions, metering                       |
| **Monitoring** | Sentry              | Latest     | Error tracking, performance                   |
| **Hosting**    | Vercel              | Pro        | Frontend hosting, serverless functions        |
| **CI/CD**      | GitHub Actions      | -          | Automated testing, deployment                 |
| **Fonts**      | Manrope + Inter     | Variable   | Design system typography via Google Fonts     |
| **Charts**     | Recharts            | 3.8.x      | Bar, line, pie charts for dashboard (v2.0)    |
| **PDF**        | @react-pdf/renderer | 4.3.x      | Server-side PDF generation (v2.0)             |
| **Toasts**     | Sonner              | 2.x        | Toast notifications (v2.0)                    |
| **Icons**      | Lucide React        | 1.7+       | Icon set (replaced Material Symbols)          |

---

## 5. Project Structure

```
nordic-capacity/
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Lint, type-check, test on PR
│       └── deploy.yml                      # Vercel deployment on merge
├── drizzle/
│   ├── migrations/                         # SQL migration files (auto-generated)
│   └── seed.ts                             # Development seed data
├── public/
│   └── fonts/                              # Self-hosted font files (fallback)
├── src/
│   ├── app/                                # Next.js App Router pages
│   │   ├── layout.tsx                      # Root layout: Clerk provider, fonts, Tailwind
│   │   ├── page.tsx                        # Landing / marketing page
│   │   ├── sign-in/[[...sign-in]]/
│   │   │   └── page.tsx                    # Clerk sign-in page
│   │   ├── sign-up/[[...sign-up]]/
│   │   │   └── page.tsx                    # Clerk sign-up page
│   │   ├── onboarding/
│   │   │   └── page.tsx                    # New org setup wizard
│   │   └── (app)/                          # Authenticated app layout group
│   │       ├── layout.tsx                  # App shell: top nav + side nav + main area
│   │       ├── input/
│   │       │   ├── page.tsx                # Person Input Form (F-003)
│   │       │   └── [personId]/
│   │       │       └── page.tsx            # Person Input Form for specific person
│   │       ├── projects/
│   │       │   ├── page.tsx                # Project list
│   │       │   └── [projectId]/
│   │       │       └── page.tsx            # Project View (F-014)
│   │       ├── data/
│   │       │   ├── page.tsx                # Flat Table View (F-009)
│   │       │   └── import/
│   │       │       └── page.tsx            # Bulk Import Wizard (F-006)
│   │       ├── dashboard/
│   │       │   ├── page.tsx                # Management Dashboard (F-015)
│   │       │   ├── dashboard-content.tsx   # Client component with charts + KPIs
│   │       │   └── team/
│   │       │       └── page.tsx            # Team Overview Heat Map (F-013)
│   │       ├── alerts/
│   │       │   └── page.tsx                # Capacity alerts list (F-016)
│   │       └── admin/
│   │           ├── page.tsx                # Admin overview
│   │           ├── people/
│   │           │   └── page.tsx            # People management (F-011)
│   │           ├── projects/
│   │           │   └── page.tsx            # Project management (F-012)
│   │           ├── disciplines/
│   │           │   └── page.tsx            # Discipline management
│   │           ├── departments/
│   │           │   └── page.tsx            # Department management
│   │           └── programs/
│   │               └── page.tsx            # Program management
│   │   └── (platform)/                     # Platform admin layout group (separate from tenant app)
│   │       ├── layout.tsx                  # Platform admin shell: own nav, no tenant context
│   │       ├── page.tsx                    # Platform dashboard with health metrics (F-029, F-033)
│   │       ├── tenants/
│   │       │   ├── page.tsx                # All tenants list with health/status (F-031)
│   │       │   └── [orgId]/
│   │       │       └── page.tsx            # Tenant detail: actions, impersonation, feature flags (F-030, F-034)
│   │       ├── subscriptions/
│   │       │   └── page.tsx                # Manual subscription management (F-032)
│   │       ├── users/
│   │       │   └── page.tsx                # Cross-tenant user management (F-037)
│   │       ├── audit/
│   │       │   └── page.tsx                # Platform audit log viewer (F-036)
│   │       └── announcements/
│   │           └── page.tsx                # System announcements (F-038)
│   ├── api/                                # Next.js API route handlers
│   │   ├── allocations/
│   │   │   ├── route.ts                    # GET (list/query), POST (create)
│   │   │   ├── [id]/
│   │   │   │   └── route.ts               # PATCH, DELETE single allocation
│   │   │   ├── batch/
│   │   │   │   └── route.ts               # POST batch upsert from grid save
│   │   │   └── export/
│   │   │       └── route.ts               # GET generate Excel/CSV export
│   │   ├── people/
│   │   │   ├── route.ts                    # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts               # GET, PATCH, DELETE
│   │   ├── projects/
│   │   │   ├── route.ts                    # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts               # GET, PATCH, DELETE
│   │   ├── programs/
│   │   │   ├── route.ts                    # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts               # GET, PATCH, DELETE
│   │   ├── departments/
│   │   │   └── route.ts                    # GET (list), POST, PATCH, DELETE
│   │   ├── disciplines/
│   │   │   └── route.ts                    # GET (list), POST, PATCH, DELETE
│   │   ├── import/
│   │   │   ├── upload/
│   │   │   │   └── route.ts               # POST upload file, parse headers
│   │   │   ├── validate/
│   │   │   │   └── route.ts               # POST validate mapped data
│   │   │   └── execute/
│   │   │       └── route.ts               # POST execute import
│   │   ├── analytics/                       # v2.0 analytics endpoints (split from single /dashboard)
│   │   │   ├── team-heatmap/
│   │   │   │   └── route.ts               # GET team heat map data
│   │   │   ├── dashboard/
│   │   │   │   └── route.ts               # GET KPI metrics
│   │   │   ├── departments/
│   │   │   │   └── route.ts               # GET department utilization
│   │   │   ├── disciplines/
│   │   │   │   └── route.ts               # GET discipline breakdown
│   │   │   ├── alerts/
│   │   │   │   ├── route.ts               # GET capacity alerts (flag-gated)
│   │   │   │   └── count/
│   │   │   │       └── route.ts           # GET alert count for badge
│   │   │   └── project-staffing/
│   │   │       └── route.ts               # GET project staffing grid
│   │   ├── reports/
│   │   │   └── team-heatmap/
│   │   │       └── route.tsx              # GET PDF export of team heat map (flag-gated)
│   │   ├── onboarding/
│   │   │   ├── status/
│   │   │   │   └── route.ts               # GET onboarding status
│   │   │   └── complete/
│   │   │       └── route.ts               # POST mark onboarding complete
│   │   ├── announcements/
│   │   │   └── active/
│   │   │       └── route.ts               # GET active announcements for tenant
│   │   ├── webhooks/
│   │   │   ├── clerk/
│   │   │   │   └── route.ts               # Clerk webhook handler
│   │   │   └── stripe/
│   │   │       └── route.ts               # Stripe webhook handler
│   │   ├── health/
│   │   │   └── route.ts                    # Health check endpoint
│   │   └── platform/                       # Platform admin API routes (F-029 to F-038)
│   │       ├── auth/
│   │       │   └── route.ts               # POST platform admin login (cookie-based JWT)
│   │       ├── tenants/
│   │       │   ├── route.ts               # GET list all tenants, POST create
│   │       │   └── [orgId]/
│   │       │       ├── route.ts           # GET detail, PATCH update, DELETE (with confirmation)
│   │       │       ├── suspend/
│   │       │       │   └── route.ts       # POST suspend tenant
│   │       │       ├── reactivate/
│   │       │       │   └── route.ts       # POST reactivate tenant
│   │       │       ├── impersonate/
│   │       │       │   └── route.ts       # POST start impersonation session
│   │       │       ├── subscription/
│   │       │       │   └── route.ts       # PATCH manual subscription override
│   │       │       ├── export/
│   │       │       │   └── route.ts       # GET full tenant data export (JSON)
│   │       │       ├── purge/
│   │       │       │   └── route.ts       # POST GDPR data purge (with name confirmation)
│   │       │       └── users/
│   │       │           └── route.ts       # GET users in org, POST reset/unlock/logout
│   │       ├── flags/
│   │       │   └── [orgId]/
│   │       │       └── route.ts           # GET/PATCH per-tenant feature flags
│   │       ├── health/
│   │       │   └── route.ts               # GET system health metrics
│   │       ├── audit-log/
│   │       │   └── route.ts               # GET platform audit log
│   │       ├── announcements/
│   │       │   ├── route.ts               # GET list, POST create announcement
│   │       │   └── [id]/
│   │       │       └── route.ts           # PATCH, DELETE announcement
│   │       └── impersonation/
│   │           └── end/
│   │               └── route.ts           # POST end impersonation session
│   ├── features/                           # Feature modules (business logic)
│   │   ├── allocations/
│   │   │   ├── allocation.service.ts       # Allocation CRUD and query logic
│   │   │   ├── allocation.queries.ts       # Drizzle query builders
│   │   │   ├── allocation.schema.ts        # Zod schemas for validation
│   │   │   └── allocation.types.ts         # TypeScript types
│   │   ├── people/
│   │   │   ├── person.service.ts           # Person CRUD logic
│   │   │   ├── person.queries.ts           # Drizzle query builders
│   │   │   ├── person.schema.ts            # Zod schemas
│   │   │   └── person.types.ts             # TypeScript types
│   │   ├── projects/
│   │   │   ├── project.service.ts          # Project CRUD logic
│   │   │   ├── project.queries.ts          # Drizzle query builders
│   │   │   ├── project.schema.ts           # Zod schemas
│   │   │   └── project.types.ts            # TypeScript types
│   │   ├── programs/
│   │   │   ├── program.service.ts          # Program CRUD logic
│   │   │   └── program.schema.ts           # Zod schemas
│   │   ├── import/
│   │   │   ├── import.service.ts           # Import orchestration
│   │   │   ├── import.parser.ts            # Excel/CSV parsing
│   │   │   ├── import.mapper.ts            # Column mapping logic
│   │   │   ├── import.validator.ts         # Data validation engine
│   │   │   ├── import.executor.ts          # Database write logic
│   │   │   ├── import.schema.ts            # Zod schemas
│   │   │   └── import.types.ts             # TypeScript types
│   │   ├── export/
│   │   │   ├── export.service.ts           # Excel/CSV generation
│   │   │   └── export.schema.ts            # Zod schemas for filter params
│   │   ├── analytics/                      # v2.0: Aggregation queries for dashboards, heat maps, alerts
│   │   │   ├── analytics.service.ts        # CTE-based SQL aggregations (team heatmap, KPIs, dept util, discipline, alerts, project staffing)
│   │   │   └── analytics.types.ts          # TypeScript types for all analytics responses
│   │   ├── flags/                          # v2.0: Per-tenant feature flag system
│   │   │   ├── flag.types.ts               # FeatureFlags interface, FlagName union, FLAG_ROUTE_MAP
│   │   │   ├── flag.service.ts             # getOrgFlags() with React cache() deduplication
│   │   │   ├── flag.context.tsx            # FlagProvider + useFlags() hook
│   │   │   └── flag-guard.tsx              # Client-side route guard for flagged pages
│   │   ├── onboarding/                     # v2.0: New-tenant guided setup wizard
│   │   │   ├── onboarding.service.ts       # isOrgOnboarded, markOnboarded, getOnboardingStatus
│   │   │   ├── onboarding.types.ts         # OnboardingStatus interface
│   │   │   └── onboarding.constants.ts     # Department/discipline suggestion lists
│   │   ├── announcements/                  # v2.0: Platform-wide announcement system
│   │   │   ├── announcement.service.ts     # CRUD + active query with date filtering
│   │   │   ├── announcement.schema.ts      # Zod create/update schemas
│   │   │   └── announcement.types.ts       # Announcement interface
│   │   ├── organizations/
│   │   │   ├── organization.service.ts     # Org setup, settings
│   │   │   └── organization.schema.ts      # Zod schemas
│   │   ├── billing/
│   │   │   ├── billing.service.ts          # Stripe subscription management
│   │   │   └── billing.types.ts            # TypeScript types
│   │   └── platform/                       # Platform admin (split from monolithic platform-admin)
│   │       ├── platform-dashboard.service.ts # Dashboard metrics
│   │       ├── platform-tenant.service.ts  # Tenant CRUD, suspend/reactivate
│   │       ├── platform-tenant-data.service.ts # Tenant data export/purge (v2.0)
│   │       ├── platform-health.service.ts  # System health metrics (v2.0)
│   │       ├── platform-impersonation.service.ts # Clerk Actor Token impersonation
│   │       ├── platform-user.service.ts    # Cross-tenant user management
│   │       ├── platform-audit.service.ts   # Audit log queries
│   │       ├── platform-tenant.schema.ts   # Zod schemas
│   │       └── platform-admin.auth.ts      # Platform admin auth (cookie-based JWT)
│   ├── components/                         # Shared UI components
│   │   ├── layout/
│   │   │   ├── top-nav.tsx                 # Top navigation bar
│   │   │   ├── side-nav.tsx                # Left sidebar navigation
│   │   │   ├── app-shell.tsx               # App shell combining top + side nav
│   │   │   └── breadcrumbs.tsx             # Breadcrumb component
│   │   ├── grid/
│   │   │   ├── allocation-grid.tsx         # AG Grid wrapper for person input
│   │   │   ├── grid-config.ts              # AG Grid column definitions
│   │   │   ├── cell-renderers/
│   │   │   │   ├── hours-cell.tsx          # Numeric cell with tabular-nums
│   │   │   │   ├── status-cell.tsx         # Color-coded status dot
│   │   │   │   ├── summa-cell.tsx          # Bold summary cell
│   │   │   │   └── project-cell.tsx        # Project name with dropdown
│   │   │   └── drag-to-fill.tsx            # Custom drag-to-fill handler
│   │   ├── heat-map/                       # v2.0: Team Overview heat map (pure HTML table, not AG Grid)
│   │   │   ├── heat-map-table.tsx          # Department-grouped table with collapsible sections
│   │   │   ├── heat-map-cell.tsx           # Color-coded capacity cell
│   │   │   └── heat-map-filters.tsx        # Department/discipline/date range filters
│   │   ├── import/
│   │   │   ├── import-wizard.tsx           # Import wizard container
│   │   │   ├── step-upload.tsx             # File upload step
│   │   │   ├── step-mapping.tsx            # Column mapping step
│   │   │   ├── step-validation.tsx         # Validation results step
│   │   │   └── step-import.tsx             # Import execution step
│   │   ├── data-table/
│   │   │   ├── flat-table.tsx              # Flat table view component
│   │   │   ├── table-filters.tsx           # Filter bar component
│   │   │   └── table-pagination.tsx        # Pagination component
│   │   ├── charts/                         # v2.0: Recharts-based dashboard visualizations
│   │   │   ├── kpi-card.tsx                # KPI metric card with optional drill-down link
│   │   │   ├── department-bar-chart.tsx    # Recharts horizontal bar chart for dept utilization
│   │   │   ├── discipline-chart.tsx        # Recharts horizontal bar chart for discipline hours
│   │   │   └── chart-colors.ts            # Nordic Precision color constants for charts
│   │   ├── alerts/                         # v2.0: Capacity alert components
│   │   │   ├── alert-badge.tsx             # TopNav bell icon with count badge
│   │   │   └── alert-list.tsx              # Alert list grouped by severity
│   │   ├── project-view/                   # v2.0: Project-centric staffing view
│   │   │   ├── project-staffing-grid.tsx   # Person x month hours table for a project
│   │   │   └── project-summary-row.tsx     # Total hours row with understaffed indicators
│   │   ├── pdf/                            # v2.0: @react-pdf/renderer PDF templates
│   │   │   ├── heat-map-pdf.tsx            # Team Overview heat map PDF document
│   │   │   ├── pdf-header-footer.tsx       # Fixed header/footer with org name, dates, page numbers
│   │   │   └── pdf-styles.ts              # PDF StyleSheet and color definitions
│   │   ├── onboarding/                     # v2.0: New-tenant onboarding wizard
│   │   │   ├── onboarding-wizard.tsx       # Multi-step wizard orchestrator
│   │   │   ├── step-departments.tsx        # Department creation with suggestions
│   │   │   ├── step-disciplines.tsx        # Discipline creation with suggestions
│   │   │   ├── step-people.tsx             # Person creation or import redirect
│   │   │   └── step-complete.tsx           # Success screen with navigation
│   │   ├── announcements/                  # v2.0: Announcement display
│   │   │   ├── announcement-banner.tsx     # Dismissible banner in app layout
│   │   │   └── use-dismissed-announcements.ts # localStorage dismissal state
│   │   ├── person/
│   │   │   ├── person-header.tsx           # Person name, nav arrows, attributes
│   │   │   ├── person-sidebar.tsx          # Person list sidebar with search
│   │   │   └── person-form.tsx             # Person create/edit form
│   │   └── ui/
│   │       ├── discipline-tag.tsx          # Discipline badge (SW, Mek, Elnik...)
│   │       ├── status-dot.tsx              # Capacity status indicator
│   │       ├── filter-pills.tsx            # Filter pill toggles
│   │       ├── toast.tsx                   # Save confirmation toast
│   │       └── stepper.tsx                 # Multi-step progress indicator
│   ├── db/
│   │   ├── index.ts                        # Drizzle client initialization
│   │   ├── schema.ts                       # All table definitions
│   │   └── migrate.ts                      # Migration runner
│   ├── lib/
│   │   ├── auth.ts                         # Clerk auth helpers, middleware
│   │   ├── tenant.ts                       # Tenant context extraction
│   │   ├── errors.ts                       # Error taxonomy classes
│   │   ├── capacity.ts                     # Capacity calculation utilities
│   │   ├── date-utils.ts                   # Month generation, current month detection
│   │   ├── excel.ts                        # SheetJS wrapper utilities
│   │   ├── stripe.ts                       # Stripe client initialization
│   │   ├── platform-auth.ts               # Platform admin auth helpers (JWT via PLATFORM_ADMIN_SECRET)
│   │   └── constants.ts                    # App-wide constants
│   ├── hooks/
│   │   ├── use-allocations.ts              # TanStack Query hook for allocations
│   │   ├── use-people.ts                   # TanStack Query hook for people
│   │   ├── use-projects.ts                 # TanStack Query hook for projects
│   │   ├── use-current-person.ts           # Current person context hook
│   │   ├── use-grid-autosave.ts            # Auto-save on cell change (invalidates analytics caches)
│   │   ├── use-keyboard-nav.ts             # Grid keyboard navigation
│   │   ├── use-team-heatmap.ts             # v2.0: TanStack Query for team heat map
│   │   ├── use-dashboard.ts               # v2.0: TanStack Query for KPIs, dept util, discipline
│   │   ├── use-alerts.ts                   # v2.0: TanStack Query for alerts + alert count
│   │   └── use-project-staffing.ts         # v2.0: TanStack Query for project staffing view
│   └── middleware.ts                       # Next.js middleware: auth + tenant resolution
├── tailwind.config.ts                      # Design system tokens from prototypes
├── drizzle.config.ts                       # Drizzle ORM configuration
├── next.config.ts                          # Next.js configuration
├── package.json
├── tsconfig.json
└── .env.example                            # Environment variable template
```

---

## 6. Module & Function Definitions

> **Note on query layer functions:** Functions in the query layer (e.g., `allocationQueries.*`, `personQueries.*`, `platformAdminQueries.*`) are 1:1 Drizzle query wrappers and intentionally not specified with full signatures. They are referenced in "Calls" fields for traceability but are implementation detail.

### 6.1 Allocation Service (`src/features/allocations/allocation.service.ts`)

**Purpose:** Core business logic for managing the flat allocation table — the central data store from which all views derive.

```
getPersonAllocations(orgId: String, personId: String, startMonth: String, endMonth: String): Promise<List<Allocation>>
  Purpose: Retrieve all allocations for one person across a month range, used to populate the Person Input Form grid
  Params:
    - orgId: tenant identifier, used for data isolation
    - personId: the person whose allocations to retrieve
    - startMonth: YYYY-MM format, start of visible window
    - endMonth: YYYY-MM format, end of visible window
  Returns: List of Allocation records, one per project-month combination
  Side effects: None (read-only)
  Error cases:
    - NotFoundError if person doesn't exist in org
    - ValidationError if month format is invalid
  Called by: GET /api/allocations (route handler), PersonInputPage (server component)
  Calls: allocationQueries.findByPersonAndRange
```

```
getTeamAllocations(orgId: String, filters: TeamFilter): Promise<List<PersonMonthSummary>>
  Purpose: Retrieve aggregated monthly totals per person for the Team Overview heat map
  Params:
    - orgId: tenant identifier
    - filters: { departmentId?: String, disciplineId?: String, startMonth: String, endMonth: String }
  Returns: List of { personId, personName, discipline, department, targetHours, months: Map<String, Number> }
  Side effects: None (read-only)
  Error cases:
    - ValidationError if filters are malformed
  Called by: GET /api/allocations?view=team (route handler), TeamHeatmapPage (server component, Phase 2)
  Calls: allocationQueries.aggregateByPerson
```

```
getProjectAllocations(orgId: String, projectId: String, startMonth: String, endMonth: String): Promise<ProjectAllocationView>
  Purpose: Retrieve all people allocated to a specific project for the Project View
  Params:
    - orgId: tenant identifier
    - projectId: project to view
    - startMonth: start of visible window
    - endMonth: end of visible window
  Returns: { project: Project, people: List<{ personId, name, discipline, months: Map<String, Number> }>, monthlyTotals: Map<String, Number> }
  Side effects: None (read-only)
  Error cases:
    - NotFoundError if project doesn't exist in org
  Called by: GET /api/allocations?view=project&projectId=X (route handler), ProjectViewPage (Phase 2)
  Calls: allocationQueries.findByProjectAndRange
```

```
upsertAllocation(orgId: String, data: AllocationUpsert): Promise<Allocation>
  Purpose: Create or update a single allocation cell. Called on auto-save when a cell value changes.
  Params:
    - orgId: tenant identifier
    - data: { personId: String, projectId: String, month: String, hours: Number }
  Returns: The created or updated Allocation record
  Side effects:
    - INSERT or UPDATE in allocations table
    - If hours is 0 and record exists, DELETE the record (zero means unallocated)
  Error cases:
    - ValidationError if hours < 0 or > 744 (max hours in a month)
    - NotFoundError if person or project doesn't exist in org
    - ConflictError if concurrent edit detected (optimistic locking via updated_at)
  Called by: POST /api/allocations (route handler), use-grid-autosave hook
  Calls: allocationQueries.upsert, personService.getById (validation), projectService.getById (validation)
```

```
batchUpsertAllocations(orgId: String, data: List<AllocationUpsert>): Promise<BatchResult>
  Purpose: Create or update multiple allocation cells in a single transaction. Used for drag-to-fill, paste operations, and import.
  Params:
    - orgId: tenant identifier
    - data: list of { personId, projectId, month, hours } records
  Returns: { created: Number, updated: Number, deleted: Number, errors: List<BatchError> }
  Side effects:
    - Multiple INSERT/UPDATE/DELETE in allocations table within a transaction
    - Rows with hours=0 are deleted
  Error cases:
    - ValidationError if any record has invalid data (partial success: valid records committed, errors returned)
    - ConflictError for concurrent edit conflicts
  Called by: POST /api/allocations/batch (route handler), importExecutor.execute, use-grid-autosave (batch mode)
  Calls: allocationQueries.batchUpsert
```

```
getAllocationsFlat(orgId: String, filters: FlatTableFilter): Promise<PaginatedResult<FlatAllocation>>
  Purpose: Query the flat allocation table for the Data Table view with filtering, sorting, and pagination
  Params:
    - orgId: tenant identifier
    - filters: { personId?, disciplineId?, departmentId?, projectId?, programId?, startMonth?, endMonth?, sortBy?, sortDir?, page?, pageSize? }
  Returns: { items: List<FlatAllocation>, total: Number, page: Number, pageSize: Number }
  Side effects: None (read-only)
  Error cases:
    - ValidationError if filter params are malformed
  Called by: GET /api/allocations (route handler with query params), FlatTablePage, exportService.generateExcel, platformAdminService.exportTenantData
  Calls: allocationQueries.findFlat
```

```
deleteAllocation(orgId: String, allocationId: String): Promise<Void>
  Purpose: Delete a single allocation record
  Params:
    - orgId: tenant identifier
    - allocationId: the allocation to delete
  Returns: Void
  Side effects: DELETE from allocations table
  Error cases:
    - NotFoundError if allocation doesn't exist in org
  Called by: DELETE /api/allocations/[id] (route handler)
  Calls: allocationQueries.delete
```

### 6.2 Person Service (`src/features/people/person.service.ts`)

**Purpose:** CRUD operations for Person (resource) entities and navigation utilities.

```
listPeople(orgId: String, filters: PersonFilter): Promise<List<PersonWithStatus>>
  Purpose: List all people in org with current capacity status, grouped by department. Used for sidebar and admin views.
  Params:
    - orgId: tenant identifier
    - filters: { departmentId?, disciplineId?, search?: String }
  Returns: List of { person: Person, currentMonthStatus: "healthy" | "warning" | "overloaded" | "empty", currentMonthTotal: Number }
  Side effects: None (read-only)
  Error cases: None (returns empty list if no matches)
  Called by: GET /api/people (route handler), PersonSidebar component, AdminPeoplePage, importService.validateMappedData, platformAdminService.exportTenantData
  Calls: personQueries.findAll, allocationQueries.currentMonthSummary
```

```
getById(orgId: String, personId: String): Promise<Person>
  Purpose: Get a single person's details
  Params:
    - orgId: tenant identifier
    - personId: the person to retrieve
  Returns: Person record with discipline, department, and target capacity
  Side effects: None (read-only)
  Error cases:
    - NotFoundError if person doesn't exist in org
  Called by: GET /api/people/[id] (route handler), PersonInputPage, upsertAllocation (validation)
  Calls: personQueries.findById
```

```
createPerson(orgId: String, data: PersonCreate): Promise<Person>
  Purpose: Create a new person/resource
  Params:
    - orgId: tenant identifier
    - data: { firstName: String, lastName: String, disciplineId: String, departmentId: String, targetHoursPerMonth: Number }
  Returns: Created Person record
  Side effects: INSERT into people table
  Error cases:
    - ValidationError if required fields missing or targetHours out of range (1-744)
    - ConflictError if person with same name exists in same department (warning, not blocker)
  Called by: POST /api/people (route handler), AdminPeoplePage, importExecutor.execute
  Calls: personQueries.insert
```

```
updatePerson(orgId: String, personId: String, data: PersonUpdate): Promise<Person>
  Purpose: Update a person's attributes
  Params:
    - orgId: tenant identifier
    - personId: the person to update
    - data: Partial<{ firstName, lastName, disciplineId, departmentId, targetHoursPerMonth }>
  Returns: Updated Person record
  Side effects: UPDATE in people table
  Error cases:
    - NotFoundError if person doesn't exist in org
    - ValidationError if data is invalid
  Called by: PATCH /api/people/[id] (route handler), PersonForm component
  Calls: personQueries.update
```

```
deletePerson(orgId: String, personId: String): Promise<Void>
  Purpose: Soft-delete a person (archive). Allocations are preserved but person is hidden from active views.
  Params:
    - orgId: tenant identifier
    - personId: the person to archive
  Returns: Void
  Side effects: SET archived_at = NOW() on person record
  Error cases:
    - NotFoundError if person doesn't exist in org
  Called by: DELETE /api/people/[id] (route handler), AdminPeoplePage
  Calls: personQueries.softDelete
```

```
getAdjacentPerson(orgId: String, currentPersonId: String, direction: "next" | "prev", filters: PersonFilter): Promise<Optional<Person>>
  Purpose: Get the next or previous person for prev/next navigation in the Input Form
  Params:
    - orgId: tenant identifier
    - currentPersonId: the person currently being viewed
    - direction: navigate forward or backward in the sorted list
    - filters: active filters (so navigation respects current filter context)
  Returns: The adjacent Person record, or None if at the end of the list
  Side effects: None (read-only)
  Error cases: None (returns None at boundaries)
  Called by: PersonHeader component (prev/next buttons)
  Calls: personQueries.findAdjacent
```

### 6.3 Project Service (`src/features/projects/project.service.ts`)

**Purpose:** CRUD operations for Project entities and project listing utilities.

```
listProjects(orgId: String, filters: ProjectFilter): Promise<List<ProjectWithProgram>>
  Purpose: List all active projects with their program parent. Used for dropdowns, admin, and project view list.
  Params:
    - orgId: tenant identifier
    - filters: { programId?, status?: "active" | "planned" | "archived", search?: String }
  Returns: List of projects with program name
  Side effects: None (read-only)
  Error cases: None (returns empty list)
  Called by: GET /api/projects (route handler), ProjectCell dropdown, FlatTableFilters, AdminProjectsPage, importService.validateMappedData
  Calls: projectQueries.findAll
```

```
getById(orgId: String, projectId: String): Promise<ProjectWithDetails>
  Purpose: Get a single project with program and allocation summary
  Params:
    - orgId: tenant identifier
    - projectId: the project to retrieve
  Returns: Project with program, total hours, people count, discipline list
  Side effects: None (read-only)
  Error cases:
    - NotFoundError if project doesn't exist in org
  Called by: GET /api/projects/[id] (route handler), ProjectViewPage, upsertAllocation (validation)
  Calls: projectQueries.findById, allocationQueries.projectSummary
```

```
createProject(orgId: String, data: ProjectCreate): Promise<Project>
  Purpose: Create a new project
  Params:
    - orgId: tenant identifier
    - data: { name: String, programId?: String, status: "active" | "planned" }
  Returns: Created Project record
  Side effects: INSERT into projects table
  Error cases:
    - ValidationError if name is empty
    - ConflictError if project with same name exists in org
  Called by: POST /api/projects (route handler), AdminProjectsPage, importExecutor.execute
  Calls: projectQueries.insert
```

```
updateProject(orgId: String, projectId: String, data: ProjectUpdate): Promise<Project>
  Purpose: Update project attributes
  Params:
    - orgId: tenant identifier
    - projectId: the project to update
    - data: Partial<{ name, programId, status }>
  Returns: Updated Project record
  Side effects: UPDATE in projects table
  Error cases:
    - NotFoundError if project doesn't exist
    - ValidationError if data invalid
  Called by: PATCH /api/projects/[id] (route handler), AdminProjectsPage
  Calls: projectQueries.update
```

```
deleteProject(orgId: String, projectId: String): Promise<Void>
  Purpose: Archive a project. Preserves allocations for historical data.
  Params:
    - orgId: tenant identifier
    - projectId: the project to archive
  Returns: Void
  Side effects: SET status = "archived", archived_at = NOW()
  Error cases:
    - NotFoundError if project doesn't exist
  Called by: DELETE /api/projects/[id] (route handler)
  Calls: projectQueries.archive
```

### 6.4 Program Service (`src/features/programs/program.service.ts`)

**Purpose:** CRUD for Program entities (the hierarchy level above Project).

```
listPrograms(orgId: String): Promise<List<Program>>
  Purpose: List all programs for dropdowns and admin
  Params:
    - orgId: tenant identifier
  Returns: List of Program records
  Side effects: None
  Error cases: None
  Called by: GET /api/programs (route handler), ProjectForm, FlatTableFilters
  Calls: programQueries.findAll
```

```
createProgram(orgId: String, data: ProgramCreate): Promise<Program>
  Purpose: Create a new program
  Params:
    - orgId: tenant identifier
    - data: { name: String, description?: String }
  Returns: Created Program
  Side effects: INSERT into programs table
  Error cases:
    - ValidationError if name empty
    - ConflictError if duplicate name
  Called by: POST /api/programs (route handler), AdminProgramsPage
  Calls: programQueries.insert
```

```
updateProgram(orgId: String, programId: String, data: ProgramUpdate): Promise<Program>
  Purpose: Update program attributes
  Called by: PATCH /api/programs/[id] (route handler)
  Calls: programQueries.update
```

```
deleteProgram(orgId: String, programId: String): Promise<Void>
  Purpose: Delete a program. Projects under it become orphaned (programId set to null).
  Called by: DELETE /api/programs/[id] (route handler)
  Calls: programQueries.delete, projectQueries.clearProgram
```

### 6.5 Import Service (`src/features/import/import.service.ts`)

**Purpose:** Orchestrates the 4-step bulk import flow: upload, map columns, validate, execute.

```
parseUploadedFile(orgId: String, file: Buffer, fileName: String): Promise<ParseResult>
  Purpose: Parse an uploaded Excel/CSV file, extract headers and sample data for the mapping step
  Params:
    - orgId: tenant identifier
    - file: raw file buffer
    - fileName: original filename (used for format detection)
  Returns: { headers: List<String>, sampleRows: List<Map<String, String>>, rowCount: Number, suggestedMappings: List<ColumnMapping>, format: "flat" | "pivot" }
  Side effects: Stores parsed data in temp storage (Redis or filesystem) keyed by import session ID
  Error cases:
    - ValidationError if file is empty, too large (>10MB), or unsupported format
    - InternalError if parsing fails
  Called by: POST /api/import/upload (route handler)
  Calls: importParser.parse, importMapper.suggestMappings
```

```
validateMappedData(orgId: String, sessionId: String, mappings: List<ColumnMapping>): Promise<ValidationResult>
  Purpose: Validate mapped data against the database — check person names, project references, detect duplicates, flag capacity warnings
  Params:
    - orgId: tenant identifier
    - sessionId: import session (references stored parsed data)
    - mappings: user-confirmed column mappings (source column → system field)
  Returns: { ready: Number, warnings: List<ValidationIssue>, errors: List<ValidationIssue>, suggestions: Map<String, String> }
  Side effects: Updates import session with validation results
  Error cases:
    - NotFoundError if session expired
    - ValidationError if required mappings are missing (person name, project, month, hours)
  Called by: POST /api/import/validate (route handler)
  Calls: importValidator.validate, personService.listPeople, projectService.listProjects
```

```
executeImport(orgId: String, sessionId: String, options: ImportOptions): Promise<ImportResult>
  Purpose: Execute the validated import — write data to the allocations table
  Params:
    - orgId: tenant identifier
    - sessionId: import session
    - options: { skipErrors: Boolean, overrideDuplicates: Boolean, createMissingPeople: Boolean, createMissingProjects: Boolean }
  Returns: { imported: Number, skipped: Number, errors: List<ImportError>, createdPeople: List<Person>, createdProjects: List<Project> }
  Side effects: INSERT/UPDATE/DELETE in allocations, people, and projects tables within a transaction
  Error cases:
    - NotFoundError if session expired
    - InternalError if transaction fails (rolls back)
  Called by: POST /api/import/execute (route handler)
  Calls: importExecutor.execute, allocationService.batchUpsertAllocations, personService.createPerson, projectService.createProject
```

### 6.6 Import Parser (`src/features/import/import.parser.ts`)

**Purpose:** Parse Excel/CSV files into a normalized row structure.

```
parse(file: Buffer, fileName: String): Promise<ParsedFile>
  Purpose: Read an Excel or CSV file and return headers + rows as string arrays
  Params:
    - file: raw file buffer
    - fileName: for format detection (.xlsx, .xls, .csv)
  Returns: { headers: List<String>, rows: List<List<String>>, sheetName: String }
  Side effects: None (pure function)
  Error cases:
    - ValidationError if file is corrupt, empty, or has no header row
  Called by: importService.parseUploadedFile
  Calls: xlsx.read (SheetJS)
```

```
detectFormat(headers: List<String>, sampleRows: List<List<String>>): "flat" | "pivot"
  Purpose: Detect whether uploaded data is in flat-table format (one row per allocation) or pivot/grid format (projects as rows, months as columns)
  Params:
    - headers: column headers from the file
    - sampleRows: first 5 rows of data
  Returns: "flat" if headers contain month-like column, "pivot" if headers are month names/dates
  Side effects: None (pure function)
  Error cases: None (defaults to "flat" if ambiguous)
  Called by: importService.parseUploadedFile
  Calls: dateUtils.isMonthHeader
```

```
unpivot(headers: List<String>, rows: List<List<String>>, personColumn: Number, startColumn: Number): List<FlatRow>
  Purpose: Convert a pivot/grid format (months as columns) into flat rows (one per person/month)
  Params:
    - headers: column headers (including month names)
    - rows: data rows
    - personColumn: index of the person name column
    - startColumn: index where month columns begin
  Returns: List of { person, month, hours } flat records
  Side effects: None (pure function)
  Error cases:
    - ValidationError if month headers can't be parsed
  Called by: importService.parseUploadedFile (when format is "pivot")
  Calls: dateUtils.parseSwedishMonth
```

### 6.7 Import Mapper (`src/features/import/import.mapper.ts`)

**Purpose:** Auto-detect column mappings from uploaded headers by matching against known Swedish and English field names.

```
suggestMappings(headers: List<String>): List<ColumnMapping>
  Purpose: Given file headers, suggest which system field each maps to by fuzzy matching against known header names
  Params:
    - headers: column headers from the uploaded file
  Returns: List of { sourceColumn: String, systemField: String, confidence: Number, status: "matched" | "unmatched" }
  Side effects: None (pure function)
  Error cases: None (unmatched columns get status "unmatched")
  Called by: importService.parseUploadedFile
  Calls: None (uses internal HEADER_ALIASES dictionary)
```

Known header aliases:

- Person Name: "Namn", "Name", "Person", "Resource", "Resurs"
- Project: "Projekt", "Project"
- Hours: "Timmar", "Hours", "Planerade timmar", "Planned Hours"
- Month: "Månad", "Month", "Period"
- Department: "Avdelning", "Department", "Dept", "Afdeling"
- Discipline: "Disciplin", "Discipline", "Roll", "Role"
- Program: "Program", "Platform"

### 6.8 Import Validator (`src/features/import/import.validator.ts`)

**Purpose:** Validate mapped import data against the database for correctness and integrity.

```
validate(orgId: String, rows: List<MappedRow>, existingPeople: List<Person>, existingProjects: List<Project>): ValidationResult
  Purpose: Check each row for errors (missing refs, invalid data) and warnings (duplicates, capacity overflows)
  Params:
    - orgId: tenant identifier
    - rows: mapped data rows
    - existingPeople: all people in org (for reference checking)
    - existingProjects: all projects in org
  Returns: { ready: List<MappedRow>, warnings: List<ValidationIssue>, errors: List<ValidationIssue> }
  Side effects: None (pure function)
  Error cases: None (issues are returned, not thrown)
  Called by: importService.validateMappedData
  Calls: findClosestMatch (for name suggestions)
```

```
findClosestMatch(input: String, candidates: List<String>): Optional<String>
  Purpose: Find the closest matching string from a candidate list using Levenshtein distance. Used for "Did you mean?" suggestions.
  Params:
    - input: the unmatched name from import data
    - candidates: list of known names in the system
  Returns: The closest match if distance <= 2, else None
  Side effects: None (pure function)
  Error cases: None
  Called by: validate (for person/project name matching)
  Calls: None (implements Levenshtein internally)
```

### 6.9 Import Executor (`src/features/import/import.executor.ts`)

**Purpose:** Execute the final import by writing validated data to the database.

```
execute(orgId: String, rows: List<MappedRow>, options: ImportOptions): Promise<ImportResult>
  Purpose: Write validated import rows to the database in a single transaction
  Params:
    - orgId: tenant identifier
    - rows: validated and mapped rows to import
    - options: { skipErrors, overrideDuplicates, createMissingPeople, createMissingProjects }
  Returns: { imported, skipped, errors, createdPeople, createdProjects }
  Side effects:
    - INSERT/UPDATE allocations
    - Optionally CREATE new people/projects
    - All within a single database transaction
  Error cases:
    - InternalError if transaction fails (full rollback)
  Called by: importService.executeImport
  Calls: allocationService.batchUpsertAllocations, personService.createPerson, projectService.createProject
```

### 6.10 Export Service (`src/features/export/export.service.ts`)

**Purpose:** Generate Excel and CSV exports from the flat allocation table.

```
generateExcel(orgId: String, filters: FlatTableFilter): Promise<Buffer>
  Purpose: Generate an Excel (.xlsx) file from filtered allocation data
  Params:
    - orgId: tenant identifier
    - filters: same filters as getAllocationsFlat (person, discipline, department, project, program, month range)
  Returns: Excel file as a Buffer
  Side effects: None (generates in memory)
  Error cases:
    - InternalError if generation fails
  Called by: GET /api/allocations/export (route handler)
  Calls: allocationService.getAllocationsFlat (with pagination disabled), excelLib.createWorkbook
```

```
generateCsv(orgId: String, filters: FlatTableFilter): Promise<String>
  Purpose: Generate a CSV string from filtered allocation data
  Params:
    - orgId: tenant identifier
    - filters: same as generateExcel
  Returns: CSV content as String
  Side effects: None
  Error cases: None
  Called by: GET /api/allocations/export?format=csv (route handler)
  Calls: allocationService.getAllocationsFlat
```

```
generateImportTemplate(type: "people" | "projects" | "allocations"): Promise<Buffer>
  Purpose: Generate a downloadable Excel template with headers, examples, and dropdown validations
  Params:
    - type: which import template to generate
  Returns: Excel file as Buffer
  Side effects: None
  Error cases: None
  Called by: GET /api/allocations/export?template=true&type=X (route handler)
  Calls: excelLib.createWorkbook
```

### 6.11 Analytics Service (`src/features/analytics/analytics.service.ts`) — v2.0

**Purpose:** CTE-based SQL aggregation queries for all v2.0 visualizations: team heat map, dashboard KPIs, department utilization, discipline breakdown, capacity alerts, alert counts, and project staffing. Uses raw SQL via Drizzle `sql` tagged templates for complex CTEs with `generate_series`. All queries scope by `organization_id` via parameterized orgId.

**v2.0 Implementation Notes:**

- Split from original single `/api/dashboard` endpoint into 7 focused endpoints under `/api/analytics/*`
- Each endpoint validates month range (max 36 months) via shared `validateMonthRange()` helper
- All routes use `handleApiError()` for proper HTTP status mapping (401/403/400/500)
- Queries use CROSS JOIN with generate_series for gapless month grids
- SUM(target_hours) across CROSS JOIN rows replaces `target_hours * month_count` for correctness

```
getKpis(orgId: String): Promise<DashboardKpis>
  Purpose: Calculate top-level KPI metrics for the dashboard
  Params:
    - orgId: tenant identifier
  Returns: { totalResources: Number, avgUtilization: Number, overloadedCount: Number, unallocatedCount: Number }
  Side effects: None (read-only)
  Error cases: None
  Called by: GET /api/dashboard (route handler), DashboardPage
  Calls: allocationQueries.dashboardAggregates, personQueries.countActive
```

```
getDepartmentHeatmap(orgId: String, startMonth: String, endMonth: String): Promise<List<DepartmentRow>>
  Purpose: Calculate utilization percentage per department per month for the heat map table
  Params:
    - orgId: tenant identifier
    - startMonth, endMonth: visible month range
  Returns: List of { department: String, months: Map<String, Number> } where values are utilization percentages
  Side effects: None
  Error cases: None
  Called by: GET /api/dashboard (route handler), DeptHeatmap component
  Calls: allocationQueries.departmentUtilization
```

```
getCapacityAlerts(orgId: String): Promise<List<CapacityAlert>>
  Purpose: Identify and return strategic alerts (overloaded departments, under-utilized teams, milestone risks)
  Params:
    - orgId: tenant identifier
  Returns: List of { severity: "critical" | "warning" | "info", title: String, description: String, departmentId?: String }
  Side effects: None
  Error cases: None
  Called by: GET /api/dashboard (route handler), DashboardPage
  Calls: allocationQueries.departmentUtilization, personQueries.findOverloaded
```

```
getDisciplineBreakdown(orgId: String): Promise<List<DisciplineMetric>>
  Purpose: Calculate utilization per discipline for the discipline bars visualization
  Params:
    - orgId: tenant identifier
  Returns: List of { discipline: String, utilizationPercent: Number, available: Number, assigned: Number }
  Side effects: None
  Error cases: None
  Called by: GET /api/dashboard (route handler), DisciplineBars component
  Calls: allocationQueries.disciplineUtilization
```

### 6.12 Organization Service (`src/features/organizations/organization.service.ts`)

**Purpose:** Organization setup and configuration.

```
createOrganization(userId: String, data: OrgCreate): Promise<Organization>
  Purpose: Create a new organization (tenant) during onboarding
  Params:
    - userId: Clerk user ID of the creator (becomes org owner)
    - data: { name: String, slug: String }
  Returns: Created Organization record
  Side effects: INSERT into organizations table, seed default disciplines and departments
  Error cases:
    - ConflictError if slug is taken
    - ValidationError if name or slug is empty
  Called by: Clerk webhook handler (on org creation), onboarding page
  Calls: orgQueries.insert, seedDefaults
```

```
seedDefaults(orgId: String): Promise<Void>
  Purpose: Create default disciplines (SW, Mek, Elnik, HW, Test, PT, Sys) and a "General" department for a new org
  Params:
    - orgId: the new organization's ID
  Returns: Void
  Side effects: INSERT default disciplines and departments
  Error cases: None
  Called by: createOrganization
  Calls: disciplineQueries.insertMany, departmentQueries.insert
```

```
checkTrialStatus(orgId: String): Promise<TrialStatus>
  Purpose: Check the trial status of an organization. Returns whether the trial is active, expired, or the org is on a paid plan. Used by middleware to enforce read-only mode on expired trials.
  Params:
    - orgId: tenant identifier
  Returns: { status: "trial_active" | "trial_expired" | "paid" | "suspended" | "cancelled", daysRemaining?: Number, trialEndsAt?: Timestamp, isReadOnly: Boolean }
  Side effects: None (read-only)
  Error cases:
    - NotFoundError if org doesn't exist
  Called by: tenant.ts middleware (on every authenticated request), billing page, app layout (banner display)
  Calls: orgQueries.findById
  Logic:
    - trial_active: subscription_status = "trial" AND (trial_ends_at > NOW() OR trial_ends_at IS NULL AND created_at + 14 days > NOW())
    - trial_expired: subscription_status = "trial" AND trial period has elapsed
    - paid: subscription_status = "active"
    - isReadOnly: true if trial_expired, suspended, or cancelled
```

### 6.13 Billing Service (`src/features/billing/billing.service.ts`)

**Purpose:** Stripe subscription management.

```
createCheckoutSession(orgId: String, planId: String): Promise<String>
  Purpose: Create a Stripe Checkout session for subscription signup
  Params:
    - orgId: tenant identifier
    - planId: Stripe price ID
  Returns: Checkout session URL (redirect user here)
  Side effects: Creates Stripe Checkout Session
  Error cases:
    - InternalError if Stripe call fails
  Called by: billing page (future)
  Calls: stripe.checkout.sessions.create
```

```
handleWebhook(event: StripeEvent): Promise<Void>
  Purpose: Process Stripe webhook events (subscription created, updated, cancelled, payment failed, trial expiry)
  Params:
    - event: Stripe webhook event
  Returns: Void
  Side effects: UPDATE organization subscription status. On checkout.session.completed for a trial org, transitions subscription_status from "trial" to "active".
  Error cases:
    - ValidationError if webhook signature invalid
  Called by: POST /api/webhooks/stripe (route handler)
  Calls: orgQueries.updateSubscription, organizationService.checkTrialStatus
```

### 6.14 Capacity Utilities (`src/lib/capacity.ts`)

**Purpose:** Pure utility functions for capacity calculations used across views.

```
calculateStatus(totalHours: Number, targetHours: Number): "healthy" | "warning" | "overloaded" | "empty"
  Purpose: Determine the capacity status of a person for a given month (input form sidebar dots, grid status row)
  Params:
    - totalHours: sum of all allocations for the person in that month
    - targetHours: person's target capacity (e.g., 150h)
  Returns: Status string
  Side effects: None (pure function)
  Error cases: None
  Called by: grid-config.ts (status row), StatusCell, PersonSidebar, person.service.ts
  Calls: None
  Logic:
    - empty: totalHours = 0
    - healthy: totalHours > 0 AND totalHours / targetHours < 0.85
    - warning: totalHours / targetHours >= 0.85 AND < 1.0
    - overloaded: totalHours / targetHours >= 1.0

  Note: The heat map uses a SEPARATE function `calculateHeatMapStatus` with different thresholds
  (over >100%, healthy 80-100%, under 50-79%, idle <50%) for the Team Overview color coding.
```

```
calculateUtilization(totalHours: Number, targetHours: Number): Number
  Purpose: Calculate utilization as a percentage
  Params:
    - totalHours: allocated hours
    - targetHours: capacity target
  Returns: Percentage (0-200+)
  Side effects: None
  Error cases: Returns 0 if targetHours is 0
  Called by: DashboardService.getKpis, DeptHeatmap, DisciplineBars
  Calls: None
```

```
getStatusColor(status: String): { bg: String, text: String, dot: String }
  Purpose: Map a capacity status to its CSS color classes from the design system
  Params:
    - status: "healthy" | "warning" | "overloaded" | "empty"
  Returns: Tailwind CSS class strings: bg (container background), text (label text), dot (saturated indicator fill)
  Side effects: None
  Error cases: Returns gray for unknown status
  Called by: StatusCell (.dot for 3x3 indicator), PersonSidebar (.dot for 2x2 indicator)
  Calls: None
  Mapping:
    - healthy: { bg: "bg-green-50", text: "text-emerald-800", dot: "bg-green-500" }
    - warning: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500" }
    - overloaded: { bg: "bg-red-50", text: "text-red-800", dot: "bg-red-500" }
    - empty: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-300" }
```

### 6.15 Date Utilities (`src/lib/date-utils.ts`)

**Purpose:** Month generation, parsing, and formatting for the planning grid.

```
generateMonthRange(startMonth: String, count: Number): List<String>
  Purpose: Generate a list of YYYY-MM month strings starting from a given month
  Params:
    - startMonth: YYYY-MM format start
    - count: number of months to generate
  Returns: List of YYYY-MM strings (e.g., ["2026-01", "2026-02", ...])
  Side effects: None
  Error cases:
    - ValidationError if startMonth format is invalid
  Called by: AllocationGrid (column generation), PersonInputPage, TeamHeatmapPage
  Calls: None
```

```
getCurrentMonth(): String
  Purpose: Get the current month as YYYY-MM
  Returns: Current month string
  Called by: AllocationGrid (highlight current month), PersonInputPage
  Calls: None
```

```
isMonthHeader(value: String): Boolean
  Purpose: Detect if a string looks like a month header (for import format detection). Handles Swedish month names, English, YYYY-MM, etc.
  Params:
    - value: header string to test
  Returns: true if it looks like a month reference
  Called by: importParser.detectFormat
  Calls: None
```

```
parseSwedishMonth(value: String): Optional<String>
  Purpose: Parse a Swedish month name (e.g., "Januari 2026") into YYYY-MM format
  Params:
    - value: Swedish or English month string
  Returns: YYYY-MM string or None if unparseable
  Called by: importParser.unpivot, importValidator.validate
  Calls: None
  Swedish months: januari, februari, mars, april, maj, juni, juli, augusti, september, oktober, november, december
```

### 6.16 Tenant Context (`src/lib/tenant.ts`)

**Purpose:** Extract and validate the current tenant (organization) from the request context.

```
getTenantId(request: Request): Promise<String>
  Purpose: Extract the organization ID from Clerk auth context. Every API call uses this for data isolation.
  Params:
    - request: incoming HTTP request (with Clerk session)
  Returns: Organization ID string
  Side effects: None
  Error cases:
    - AuthError if no valid session
    - ForbiddenError if user has no organization membership
  Called by: Every API route handler
  Calls: Clerk auth() helper
```

```
requireRole(request: Request, minimumRole: Role): Promise<{ orgId: String, userId: String, role: Role }>
  Purpose: Check that the current user has at least the specified role within their organization
  Params:
    - request: incoming HTTP request
    - minimumRole: "viewer" | "planner" | "admin" | "owner"
  Returns: Tenant context with orgId, userId, and actual role
  Side effects: None
  Error cases:
    - AuthError if not authenticated
    - ForbiddenError if role is insufficient
  Called by: API route handlers that need role checks (e.g., admin-only routes)
  Calls: getTenantId, Clerk organizationMembership lookup
```

### 6.17 Auth Middleware (`src/middleware.ts`)

**Purpose:** Next.js middleware for route protection and tenant context.

```
middleware(request: NextRequest): NextResponse
  Purpose: Protect authenticated routes, redirect unauthenticated users to sign-in, extract tenant info, detect impersonation, and route platform admin requests to platform auth
  Params:
    - request: Next.js request object
  Returns: NextResponse (continue, redirect, or reject)
  Side effects: None
  Error cases:
    - Redirects to /sign-in for unauthenticated requests to /app/* routes
    - Returns 401 for /api/platform/* requests without valid platform admin token
    - Returns 401 for expired impersonation sessions
  Called by: Next.js middleware system (automatically)
  Calls: Clerk authMiddleware, resolveImpersonation (from platform-auth.ts), verifyPlatformAdminToken (for /api/platform/* routes)
```

### 6.18 Platform Admin Service (`src/features/platform-admin/platform-admin.service.ts`)

**Purpose:** Cross-tenant operations for SaaS platform administration. All functions require platform admin authentication (separate from tenant auth). Every mutation creates an entry in the platform audit log.

```
listOrganizations(filters: PlatformOrgFilter): Promise<PaginatedResult<PlatformOrgSummary>>
  Purpose: List all tenant organizations with health metrics, subscription status, and user counts for the platform dashboard
  Params:
    - filters: { search?: String, status?: "active" | "trial" | "suspended" | "cancelled", sortBy?: "name" | "created_at" | "user_count" | "subscription_status", sortDir?: "asc" | "desc", page?: Number, pageSize?: Number }
  Returns: { items: List<{ org: Organization, userCount: Number, resourceCount: Number, lastActiveAt: Timestamp, errorRate24h: Number, subscriptionStatus: String }>, total: Number, page: Number, pageSize: Number }
  Side effects: None (read-only)
  Error cases:
    - AuthError if not authenticated as platform admin
  Called by: GET /api/platform/organizations (route handler), PlatformDashboardPage
  Calls: platformAdminQueries.findAllOrgs, platformAdminQueries.getOrgMetrics
```

```
getOrgHealth(orgId: String): Promise<OrgHealthDetail>
  Purpose: Get detailed health and usage metrics for a single organization, used for support and debugging
  Params:
    - orgId: the organization to inspect
  Returns: { org: Organization, userCount: Number, resourceCount: Number, projectCount: Number, allocationCount: Number, lastImportAt: Timestamp, lastImportStatus: String, errorRate24h: Number, avgResponseTime: Number, storageUsedMb: Number, featureFlags: Map<String, Boolean>, subscriptionDetail: SubscriptionDetail, recentErrors: List<ErrorEntry> }
  Side effects: None (read-only)
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if org doesn't exist
  Called by: GET /api/platform/organizations/[orgId] (route handler), PlatformOrgDetailPage
  Calls: platformAdminQueries.getOrgDetail, platformAdminQueries.getOrgErrorLog, platformAdminQueries.getOrgMetrics
```

```
impersonateUser(platformAdminId: String, orgId: String, userId: String): Promise<ImpersonationSession>
  Purpose: Start an impersonation session, allowing the platform admin to act as a specific user in a specific org for support/debugging. Creates an audit trail entry and returns a scoped session token.
  Params:
    - platformAdminId: the platform admin performing the impersonation
    - orgId: the target organization
    - userId: the target user to impersonate (Clerk user ID)
  Returns: { sessionId: String, token: String, expiresAt: Timestamp, impersonatedUser: { id, name, email, role }, org: { id, name } }
  Side effects:
    - INSERT into platform_audit_log (action: "impersonation_started")
    - INSERT into impersonation_sessions table
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if org or user doesn't exist
  Called by: POST /api/platform/organizations/[orgId]/impersonate (route handler)
  Calls: platformAdminQueries.insertAuditLog, platformAdminQueries.createImpersonationSession, Clerk user lookup
```

```
endImpersonation(platformAdminId: String, sessionId: String): Promise<Void>
  Purpose: End an active impersonation session and log all actions performed during the session
  Params:
    - platformAdminId: the platform admin ending impersonation
    - sessionId: the impersonation session to end
  Returns: Void
  Side effects:
    - UPDATE impersonation_sessions SET ended_at = NOW()
    - INSERT into platform_audit_log (action: "impersonation_ended", details include action count)
  Error cases:
    - NotFoundError if session doesn't exist or already ended
  Called by: POST /api/platform/impersonation/end (route handler)
  Calls: platformAdminQueries.endImpersonationSession, platformAdminQueries.insertAuditLog
```

```
suspendOrganization(platformAdminId: String, orgId: String, reason: String): Promise<Organization>
  Purpose: Suspend a tenant organization (blocks all user access, preserves data)
  Params:
    - platformAdminId: the platform admin performing the action
    - orgId: the organization to suspend
    - reason: required reason for audit trail
  Returns: Updated Organization record with status "suspended"
  Side effects:
    - UPDATE organizations SET subscription_status = "suspended", suspended_at = NOW(), suspended_reason = reason
    - INSERT into platform_audit_log (action: "org_suspended")
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if org doesn't exist
    - ConflictError if org is already suspended
  Called by: POST /api/platform/organizations/[orgId]/suspend (route handler)
  Calls: platformAdminQueries.updateOrgStatus, platformAdminQueries.insertAuditLog
```

```
reactivateOrganization(platformAdminId: String, orgId: String, reason: String): Promise<Organization>
  Purpose: Reactivate a suspended organization
  Params:
    - platformAdminId: the platform admin performing the action
    - orgId: the organization to reactivate
    - reason: required reason for audit trail
  Returns: Updated Organization record with previous or "active" status restored
  Side effects:
    - UPDATE organizations SET subscription_status = "active", suspended_at = NULL, suspended_reason = NULL
    - INSERT into platform_audit_log (action: "org_reactivated")
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if org doesn't exist
    - ConflictError if org is not currently suspended
  Called by: POST /api/platform/organizations/[orgId]/reactivate (route handler)
  Calls: platformAdminQueries.updateOrgStatus, platformAdminQueries.insertAuditLog
```

```
deleteOrganization(platformAdminId: String, orgId: String, confirmation: String): Promise<Void>
  Purpose: Permanently delete a tenant organization and all its data. Requires typing the org name as confirmation.
  Params:
    - platformAdminId: the platform admin performing the action
    - orgId: the organization to delete
    - confirmation: must match org name exactly (safety check)
  Returns: Void
  Side effects:
    - CASCADE DELETE all tenant data (allocations, people, projects, programs, departments, disciplines, import sessions)
    - DELETE organization record
    - INSERT into platform_audit_log (action: "org_deleted") — audit log entry preserved even after org deletion
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if org doesn't exist
    - ValidationError if confirmation doesn't match org name
  Called by: DELETE /api/platform/organizations/[orgId] (route handler)
  Calls: platformAdminQueries.deleteOrgCascade, platformAdminQueries.insertAuditLog
```

```
overrideSubscription(platformAdminId: String, orgId: String, override: SubscriptionOverride): Promise<Organization>
  Purpose: Manually override subscription details — extend trials, apply credits, change plans, bypass Stripe
  Params:
    - platformAdminId: the platform admin performing the action
    - orgId: the organization to modify
    - override: { action: "extend_trial" | "apply_credit" | "change_plan" | "set_status", trialEndDate?: Date, creditAmount?: Number, planId?: String, status?: SubscriptionStatus, reason: String }
  Returns: Updated Organization record
  Side effects:
    - UPDATE organization subscription fields based on action
    - INSERT into platform_audit_log (action: "subscription_override")
    - Optionally sync to Stripe metadata
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if org doesn't exist
    - ValidationError if override params are invalid
  Called by: PATCH /api/platform/organizations/[orgId]/subscription (route handler)
  Calls: platformAdminQueries.updateOrgSubscription, platformAdminQueries.insertAuditLog, stripe.subscriptions.update (optional)
```

```
getSystemHealth(): Promise<SystemHealthMetrics>
  Purpose: Get system-wide health metrics — error rates per tenant, import failure rates, slow queries, database stats
  Params: None
  Returns: { overallErrorRate: Number, topErrorTenants: List<{ orgId, orgName, errorRate, errorCount }>, importFailureRate: Number, recentImportFailures: List<ImportFailureEntry>, avgQueryTime: Number, slowQueries: List<SlowQueryEntry>, dbConnectionPoolStatus: { active, idle, total }, uptimeSeconds: Number }
  Side effects: None (read-only)
  Error cases:
    - AuthError if not authenticated as platform admin
  Called by: GET /api/platform/health (route handler), PlatformHealthPage
  Calls: platformAdminQueries.getErrorMetrics, platformAdminQueries.getImportMetrics, platformAdminQueries.getQueryMetrics
```

```
setFeatureFlags(platformAdminId: String, orgId: String, flags: Map<String, Boolean>): Promise<Map<String, Boolean>>
  Purpose: Enable or disable feature flags for a specific tenant (beta features, premium features)
  Params:
    - platformAdminId: the platform admin performing the action
    - orgId: the organization to configure
    - flags: map of flag name to enabled/disabled (e.g., { "advanced-dashboard": true, "api-access": false })
  Returns: Updated complete feature flag map for the org
  Side effects:
    - UPSERT into feature_flags table
    - INSERT into platform_audit_log (action: "feature_flags_updated")
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if org doesn't exist
    - ValidationError if flag name is not in allowed list
  Called by: PUT /api/platform/organizations/[orgId]/feature-flags (route handler)
  Calls: platformAdminQueries.upsertFeatureFlags, platformAdminQueries.insertAuditLog
```

```
getFeatureFlags(orgId: String): Promise<Map<String, Boolean>>
  Purpose: Get current feature flags for an organization. Also used by tenant middleware to check feature access.
  Params:
    - orgId: the organization to query
  Returns: Map of flag name to enabled/disabled
  Side effects: None (read-only)
  Error cases: None (returns empty map if no flags set)
  Called by: GET /api/platform/organizations/[orgId]/feature-flags (route handler), tenant middleware (feature gating)
  Calls: platformAdminQueries.getFeatureFlags
```

```
exportTenantData(platformAdminId: String, orgId: String): Promise<Buffer>
  Purpose: Export all data for a tenant as a structured JSON archive (for GDPR compliance, migration, or support)
  Params:
    - platformAdminId: the platform admin requesting the export
    - orgId: the organization whose data to export
  Returns: JSON file as Buffer containing all org data (people, projects, programs, allocations, departments, disciplines, settings)
  Side effects:
    - INSERT into platform_audit_log (action: "tenant_data_exported")
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if org doesn't exist
  Called by: GET /api/platform/organizations/[orgId]/export (route handler)
  Calls: platformAdminQueries.insertAuditLog, personService.listPeople, projectService.listProjects, allocationService.getAllocationsFlat, programService.listPrograms
```

```
getPlatformAuditLog(filters: AuditLogFilter): Promise<PaginatedResult<PlatformAuditEntry>>
  Purpose: Query the platform audit log for accountability and compliance
  Params:
    - filters: { adminId?: String, orgId?: String, action?: String, startDate?: Date, endDate?: Date, page?: Number, pageSize?: Number }
  Returns: { items: List<PlatformAuditEntry>, total: Number, page: Number, pageSize: Number }
  Side effects: None (read-only)
  Error cases:
    - AuthError if not authenticated as platform admin
  Called by: GET /api/platform/audit-log (route handler), PlatformAuditLogPage
  Calls: platformAdminQueries.findAuditEntries
```

```
resetUserPassword(platformAdminId: String, orgId: String, userId: String): Promise<Void>
  Purpose: Trigger a password reset for a user in any tenant org (sends reset email via Clerk)
  Params:
    - platformAdminId: the platform admin performing the action
    - orgId: the organization the user belongs to
    - userId: the user whose password to reset
  Returns: Void
  Side effects:
    - Triggers Clerk password reset email
    - INSERT into platform_audit_log (action: "user_password_reset")
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if user doesn't exist in org
  Called by: POST /api/platform/organizations/[orgId]/users (route handler, action: "reset_password")
  Calls: Clerk users.updateUser, platformAdminQueries.insertAuditLog
```

```
forceLogoutUser(platformAdminId: String, orgId: String, userId: String): Promise<Void>
  Purpose: Force logout a user by revoking all their active sessions (for security incidents)
  Params:
    - platformAdminId: the platform admin performing the action
    - orgId: the organization the user belongs to
    - userId: the user to force logout
  Returns: Void
  Side effects:
    - Revokes all Clerk sessions for the user
    - INSERT into platform_audit_log (action: "user_force_logout")
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if user doesn't exist
  Called by: POST /api/platform/organizations/[orgId]/users (route handler, action: "force_logout")
  Calls: Clerk sessions.revokeAll, platformAdminQueries.insertAuditLog
```

```
createAnnouncement(platformAdminId: String, data: AnnouncementCreate): Promise<SystemAnnouncement>
  Purpose: Create a system-wide announcement or maintenance notice visible to all or specific tenants
  Params:
    - platformAdminId: the platform admin creating the announcement
    - data: { title: String, body: String, severity: "info" | "warning" | "critical", targetOrgIds?: List<String>, startsAt: Timestamp, expiresAt?: Timestamp }
  Returns: Created SystemAnnouncement record
  Side effects:
    - INSERT into system_announcements table
    - INSERT into platform_audit_log (action: "announcement_created")
  Error cases:
    - AuthError if not authenticated as platform admin
    - ValidationError if title/body empty or startsAt in the past
  Called by: POST /api/platform/announcements (route handler)
  Calls: platformAdminQueries.insertAnnouncement, platformAdminQueries.insertAuditLog
```

```
listAnnouncements(filters: AnnouncementFilter): Promise<List<SystemAnnouncement>>
  Purpose: List announcements — for platform admin management and for tenant-facing display
  Params:
    - filters: { active?: Boolean, orgId?: String }
  Returns: List of SystemAnnouncement records
  Side effects: None (read-only)
  Error cases: None
  Called by: GET /api/platform/announcements (route handler), tenant app layout (to show active banners)
  Calls: platformAdminQueries.findAnnouncements
```

```
updateOrganizationMetadata(platformAdminId: String, orgId: String, updates: OrgMetadataUpdate): Promise<Organization>
  Purpose: Update organization metadata (name, platform notes) with audit logging
  Params:
    - platformAdminId: the platform admin performing the action
    - orgId: the organization to update
    - updates: { name?: String, platformNotes?: String }
  Returns: Updated Organization record
  Side effects:
    - UPDATE organizations SET name/platform_notes
    - INSERT into platform_audit_log (action: "org_metadata_updated", details include before/after values)
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if org doesn't exist
    - ValidationError if name is empty
  Called by: PATCH /api/platform/organizations/[orgId] (route handler)
  Calls: platformAdminQueries.updateOrg, platformAdminQueries.insertAuditLog
```

```
updateAnnouncement(platformAdminId: String, announcementId: String, updates: AnnouncementUpdate): Promise<SystemAnnouncement>
  Purpose: Update an existing system announcement with audit logging
  Params:
    - platformAdminId: the platform admin performing the action
    - announcementId: the announcement to update
    - updates: Partial<{ title: String, body: String, severity: "info" | "warning" | "critical", expiresAt: Timestamp }>
  Returns: Updated SystemAnnouncement record
  Side effects:
    - UPDATE system_announcements
    - INSERT into platform_audit_log (action: "announcement_updated")
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if announcement doesn't exist
    - ValidationError if title/body empty
  Called by: PATCH /api/platform/announcements/[id] (route handler)
  Calls: platformAdminQueries.updateAnnouncement, platformAdminQueries.insertAuditLog
```

```
deleteAnnouncement(platformAdminId: String, announcementId: String): Promise<Void>
  Purpose: Delete a system announcement with audit logging
  Params:
    - platformAdminId: the platform admin performing the action
    - announcementId: the announcement to delete
  Returns: Void
  Side effects:
    - DELETE from system_announcements
    - INSERT into platform_audit_log (action: "announcement_deleted")
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if announcement doesn't exist
  Called by: DELETE /api/platform/announcements/[id] (route handler)
  Calls: platformAdminQueries.deleteAnnouncement, platformAdminQueries.insertAuditLog
```

```
listOrgUsers(platformAdminId: String, orgId: String): Promise<List<OrgUser>>
  Purpose: List all users in an organization via Clerk with audit logging for access tracking
  Params:
    - platformAdminId: the platform admin performing the action
    - orgId: the organization whose users to list
  Returns: List of { id: String, name: String, email: String, role: String, lastActiveAt: Timestamp }
  Side effects:
    - INSERT into platform_audit_log (action: "org_users_viewed")
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if org doesn't exist
  Called by: GET /api/platform/organizations/[orgId]/users (route handler)
  Calls: Clerk organizationMemberships.list, platformAdminQueries.insertAuditLog
```

```
unlockAccount(platformAdminId: String, orgId: String, userId: String): Promise<Void>
  Purpose: Unlock a locked user account in any tenant org (clears Clerk lockout state)
  Params:
    - platformAdminId: the platform admin performing the action
    - orgId: the organization the user belongs to
    - userId: the user whose account to unlock
  Returns: Void
  Side effects:
    - Unlocks user account via Clerk API
    - INSERT into platform_audit_log (action: "user_account_unlocked")
  Error cases:
    - AuthError if not authenticated as platform admin
    - NotFoundError if user doesn't exist in org
  Called by: POST /api/platform/organizations/[orgId]/users (route handler, action: "unlock_account")
  Calls: Clerk users.updateUser, platformAdminQueries.insertAuditLog
```

### 6.21 Department Service (`src/features/departments/department.service.ts`)

**Purpose:** CRUD operations for Department reference data entities.

```
listDepartments(orgId: String): Promise<List<Department>>
  Purpose: List all departments for an organization
  Params:
    - orgId: tenant identifier
  Returns: List of Department records
  Side effects: None (read-only)
  Error cases: None (returns empty list)
  Called by: GET /api/departments (route handler), AdminDepartmentsPage, FlatTableFilters
  Calls: departmentQueries.findAll
```

```
createDepartment(orgId: String, data: DepartmentCreate): Promise<Department>
  Purpose: Create a new department
  Params:
    - orgId: tenant identifier
    - data: { name: String }
  Returns: Created Department record
  Side effects: INSERT into departments table
  Error cases:
    - ValidationError if name is empty
    - ConflictError if department with same name exists in org
  Called by: POST /api/departments (route handler), AdminDepartmentsPage
  Calls: departmentQueries.insert
```

```
updateDepartment(orgId: String, departmentId: String, data: DepartmentUpdate): Promise<Department>
  Purpose: Update a department's name
  Params:
    - orgId: tenant identifier
    - departmentId: the department to update
    - data: { name: String }
  Returns: Updated Department record
  Side effects: UPDATE in departments table
  Error cases:
    - NotFoundError if department doesn't exist in org
    - ValidationError if name is empty
    - ConflictError if duplicate name
  Called by: PATCH /api/departments (route handler), AdminDepartmentsPage
  Calls: departmentQueries.update
```

```
deleteDepartment(orgId: String, departmentId: String): Promise<Void>
  Purpose: Delete a department. Fails if people are still assigned to it.
  Params:
    - orgId: tenant identifier
    - departmentId: the department to delete
  Returns: Void
  Side effects: DELETE from departments table
  Error cases:
    - NotFoundError if department doesn't exist in org
    - ConflictError if people are still assigned to this department
  Called by: DELETE /api/departments (route handler), AdminDepartmentsPage
  Calls: departmentQueries.delete, personQueries.countByDepartment
```

### 6.22 Discipline Service (`src/features/disciplines/discipline.service.ts`)

**Purpose:** CRUD operations for Discipline reference data entities.

```
listDisciplines(orgId: String): Promise<List<Discipline>>
  Purpose: List all disciplines for an organization
  Params:
    - orgId: tenant identifier
  Returns: List of Discipline records
  Side effects: None (read-only)
  Error cases: None (returns empty list)
  Called by: GET /api/disciplines (route handler), AdminDisciplinesPage, FlatTableFilters
  Calls: disciplineQueries.findAll
```

```
createDiscipline(orgId: String, data: DisciplineCreate): Promise<Discipline>
  Purpose: Create a new discipline
  Params:
    - orgId: tenant identifier
    - data: { name: String, abbreviation: String }
  Returns: Created Discipline record
  Side effects: INSERT into disciplines table
  Error cases:
    - ValidationError if name or abbreviation is empty
    - ConflictError if discipline with same abbreviation exists in org
  Called by: POST /api/disciplines (route handler), AdminDisciplinesPage
  Calls: disciplineQueries.insert
```

```
updateDiscipline(orgId: String, disciplineId: String, data: DisciplineUpdate): Promise<Discipline>
  Purpose: Update a discipline's name or abbreviation
  Params:
    - orgId: tenant identifier
    - disciplineId: the discipline to update
    - data: Partial<{ name: String, abbreviation: String }>
  Returns: Updated Discipline record
  Side effects: UPDATE in disciplines table
  Error cases:
    - NotFoundError if discipline doesn't exist in org
    - ValidationError if name/abbreviation empty
    - ConflictError if duplicate abbreviation
  Called by: PATCH /api/disciplines (route handler), AdminDisciplinesPage
  Calls: disciplineQueries.update
```

```
deleteDiscipline(orgId: String, disciplineId: String): Promise<Void>
  Purpose: Delete a discipline. Fails if people are still assigned to it.
  Params:
    - orgId: tenant identifier
    - disciplineId: the discipline to delete
  Returns: Void
  Side effects: DELETE from disciplines table
  Error cases:
    - NotFoundError if discipline doesn't exist in org
    - ConflictError if people are still assigned to this discipline
  Called by: DELETE /api/disciplines (route handler), AdminDisciplinesPage
  Calls: disciplineQueries.delete, personQueries.countByDiscipline
```

### 6.19 Platform Admin Auth (`src/features/platform-admin/platform-admin.auth.ts`)

**Purpose:** Authentication and authorization for platform admin operations, completely separate from Clerk tenant auth.

```
createPlatformAdmin(email: String, password: String, name: String): Promise<PlatformAdmin>
  Purpose: Create a new platform admin account. Used by the seed script to bootstrap the initial platform admin before the system can be used.
  Params:
    - email: platform admin email (must be unique)
    - password: plaintext password (will be hashed with bcrypt)
    - name: display name for the admin
  Returns: Created PlatformAdmin record (without password_hash)
  Side effects:
    - INSERT into platform_admins table with bcrypt-hashed password
  Error cases:
    - ConflictError if email already exists
    - ValidationError if email, password, or name is empty
    - ValidationError if password is less than 12 characters
  Called by: drizzle/seed.ts (seed script), CLI bootstrap command
  Calls: bcrypt.hash, platformAdminQueries.insertAdmin
```

```
authenticatePlatformAdmin(email: String, password: String): Promise<{ token: String, admin: PlatformAdmin }>
  Purpose: Authenticate a platform admin via email/password against the platform_admins table
  Params:
    - email: platform admin email
    - password: password to verify against bcrypt hash
  Returns: JWT token signed with PLATFORM_ADMIN_SECRET, plus admin profile
  Side effects:
    - INSERT into platform_audit_log (action: "platform_admin_login")
    - UPDATE platform_admins SET last_login_at = NOW()
  Error cases:
    - AuthError if email not found or password doesn't match
  Called by: POST /api/platform/auth (route handler)
  Calls: platformAdminQueries.findAdminByEmail, bcrypt.compare, jwt.sign
```

```
verifyPlatformAdminToken(token: String): Promise<PlatformAdmin>
  Purpose: Verify and decode a platform admin JWT token. Used as middleware for all /api/platform/* routes.
  Params:
    - token: JWT from Authorization header (Bearer token)
  Returns: PlatformAdmin record from decoded token
  Side effects: None
  Error cases:
    - AuthError if token is invalid, expired, or admin account is deactivated
  Called by: All /api/platform/* route handlers (via requirePlatformAdmin middleware)
  Calls: jwt.verify (using PLATFORM_ADMIN_SECRET), platformAdminQueries.findAdminById
```

```
requirePlatformAdmin(request: Request): Promise<PlatformAdmin>
  Purpose: Middleware helper that extracts and verifies the platform admin token from request headers
  Params:
    - request: incoming HTTP request
  Returns: Authenticated PlatformAdmin record
  Side effects: None
  Error cases:
    - AuthError if no Bearer token in Authorization header
    - AuthError if token verification fails
  Called by: Every /api/platform/* route handler
  Calls: verifyPlatformAdminToken
```

### 6.20 Impersonation Middleware (`src/lib/platform-auth.ts`)

**Purpose:** Middleware that detects active impersonation sessions and injects the impersonated user's context into tenant API requests, while logging every action to the platform audit log.

```
resolveImpersonation(request: Request): Promise<Optional<ImpersonationContext>>
  Purpose: Check if the current request is from an impersonating platform admin and return the impersonated user's context
  Params:
    - request: incoming HTTP request (checks for X-Impersonation-Token header)
  Returns: ImpersonationContext { platformAdminId, impersonatedUserId, impersonatedOrgId, sessionId } or None
  Side effects: None
  Error cases:
    - AuthError if impersonation token is expired or session has ended
  Called by: middleware.ts (Next.js middleware), tenant.ts getTenantId
  Calls: platformAdminQueries.getActiveImpersonationSession
```

```
logImpersonatedAction(sessionId: String, action: String, resource: String, resourceId: String, details?: Record<String, Any>): Promise<Void>
  Purpose: Log every action taken while impersonating a user. Called by API route handlers when an impersonation session is active.
  Params:
    - sessionId: active impersonation session ID
    - action: what was done (e.g., "allocation_updated", "project_created")
    - resource: resource type affected
    - resourceId: ID of affected resource
    - details: optional additional context
  Returns: Void
  Side effects: INSERT into platform_audit_log with impersonation context
  Error cases: None (fire-and-forget logging, errors are silently captured by Sentry)
  Called by: All tenant API route handlers (when impersonation context is present)
  Calls: platformAdminQueries.insertAuditLog
```

### 6.23 Clipboard Handler (`src/lib/clipboard-handler.ts`)

**Purpose:** Handle paste operations from Excel/Google Sheets clipboard into the allocation grid. Parses tab-delimited text, validates numeric values, maps to grid cells, and returns structured results for batch update.

```
handlePaste(event: ClipboardEvent, gridApi: GridApi, orgId: String): Promise<Result<PasteResult, ValidationError>>
  Purpose: Process a clipboard paste event into the allocation grid. Parses pasted text (tab-delimited from Excel), validates all values, maps to target cells based on current selection, and returns a list of cell updates for batch upsert.
  Params:
    - event: browser ClipboardEvent (from Ctrl+V / Cmd+V)
    - gridApi: AG Grid API instance (for current selection context — focused cell, selected range)
    - orgId: tenant identifier (for validation context)
  Returns:
    Success: { cells: List<{ personId: String, projectId: String, month: String, hours: Number }>, rowCount: Number, colCount: Number }
    Error: { invalidCells: List<{ row: Number, col: Number, value: String, reason: String }> }
  Side effects: None (pure parsing + validation; caller is responsible for calling batchUpsertAllocations)
  Error cases:
    - ValidationError if clipboard is empty or contains no parseable data
    - ValidationError if any pasted value is non-numeric (returns all invalid cells, not just first)
    - ValidationError if paste range exceeds grid bounds (more rows/columns than available)
  Called by: AllocationGrid component (onPaste event handler)
  Calls: None (pure utility)
  Parsing spec:
    - Split clipboard text by newline (\\n) to get rows
    - Split each row by tab (\\t) to get columns
    - Trim whitespace from each cell value
    - Accept comma as decimal separator (European format): "120,5" → 120.5
    - Empty cells are treated as 0 (delete allocation)
    - Map rows starting from the focused cell's row, columns starting from focused cell's column
    - Skip header rows if detected (first row contains non-numeric values matching known headers)
  Validation rules:
    - All values must be numeric (integer or decimal) after parsing
    - Values must be in range 0-744
    - Paste must not overlap with SUMMA, Target, or Status rows (read-only rows)
    - Paste must not exceed the month column range of the grid
```

---

## 7. Data Models

### Entity: Organization

| Field                  | Type      | Constraints                                                                  |
| ---------------------- | --------- | ---------------------------------------------------------------------------- |
| id                     | UUID      | PK, auto-generated                                                           |
| clerk_org_id           | String    | unique, required, Clerk organization reference                               |
| name                   | String    | required, max 100                                                            |
| slug                   | String    | unique, required, max 50, lowercase, alphanumeric + hyphens                  |
| subscription_status    | Enum      | "trial" / "active" / "past_due" / "cancelled" / "suspended", default "trial" |
| stripe_customer_id     | String    | nullable, unique                                                             |
| stripe_subscription_id | String    | nullable                                                                     |
| suspended_at           | Timestamp | nullable, set when org is suspended by platform admin                        |
| suspended_reason       | String    | nullable, max 500                                                            |
| trial_ends_at          | Timestamp | nullable, for manual trial extension by platform admin                       |
| credit_balance_cents   | Integer   | default 0, for manual credits applied by platform admin                      |
| platform_notes         | String    | nullable, max 2000, internal notes from platform admin                       |
| created_at             | Timestamp | auto-generated                                                               |
| updated_at             | Timestamp | auto-updated                                                                 |

Relationships:

- Organization 1:N People (via people.organization_id)
- Organization 1:N Projects (via projects.organization_id)
- Organization 1:N Programs (via programs.organization_id)
- Organization 1:N Departments (via departments.organization_id)
- Organization 1:N Disciplines (via disciplines.organization_id)
- Organization 1:N FeatureFlags (via feature_flags.organization_id)
- Organization 1:N ImpersonationSessions (via impersonation_sessions.target_org_id)
- Organization 1:N PlatformAuditLog (via platform_audit_log.target_org_id)

Common queries:

- getByClerkOrgId(clerkOrgId) — on every authenticated request
- getBySlug(slug) — URL resolution
- updateSubscription(orgId, status) — Stripe webhook
- listAll(filters, pagination) — platform admin dashboard

Indexes:

- UNIQUE(clerk_org_id)
- UNIQUE(slug)

---

### Entity: Person

| Field                  | Type      | Constraints                              |
| ---------------------- | --------- | ---------------------------------------- |
| id                     | UUID      | PK, auto-generated                       |
| organization_id        | UUID      | FK → organizations.id, required          |
| first_name             | String    | required, max 100                        |
| last_name              | String    | required, max 100                        |
| discipline_id          | UUID      | FK → disciplines.id, required            |
| department_id          | UUID      | FK → departments.id, required            |
| target_hours_per_month | Integer   | required, default 160, min 1, max 744    |
| sort_order             | Integer   | default 0, used for prev/next navigation |
| archived_at            | Timestamp | nullable, set when soft-deleted          |
| created_at             | Timestamp | auto-generated                           |
| updated_at             | Timestamp | auto-updated                             |

Relationships:

- Person N:1 Organization (via organization_id)
- Person N:1 Discipline (via discipline_id)
- Person N:1 Department (via department_id)
- Person 1:N Allocations (via allocations.person_id)

Common queries:

- listByOrg(orgId, filters) — sidebar, admin, team overview
- findById(orgId, personId) — input form
- findAdjacent(orgId, currentId, direction) — prev/next nav
- countActive(orgId) — dashboard KPI

Indexes:

- INDEX(organization_id, archived_at) — filtered listing
- INDEX(organization_id, department_id) — department filtering
- INDEX(organization_id, discipline_id) — discipline filtering
- INDEX(organization_id, sort_order) — navigation ordering

---

### Entity: Project

| Field           | Type      | Constraints                                         |
| --------------- | --------- | --------------------------------------------------- |
| id              | UUID      | PK, auto-generated                                  |
| organization_id | UUID      | FK → organizations.id, required                     |
| name            | String    | required, max 200                                   |
| program_id      | UUID      | FK → programs.id, nullable                          |
| status          | Enum      | "active" / "planned" / "archived", default "active" |
| archived_at     | Timestamp | nullable                                            |
| created_at      | Timestamp | auto-generated                                      |
| updated_at      | Timestamp | auto-updated                                        |

Relationships:

- Project N:1 Organization (via organization_id)
- Project N:1 Program (via program_id, optional)
- Project 1:N Allocations (via allocations.project_id)

Common queries:

- listByOrg(orgId, filters) — dropdowns, admin
- findById(orgId, projectId) — project view
- listByProgram(orgId, programId) — program view

Indexes:

- INDEX(organization_id, status) — active project listing
- UNIQUE(organization_id, name) — prevent duplicate project names within org
- INDEX(program_id) — program grouping

---

### Entity: Program

| Field           | Type      | Constraints                     |
| --------------- | --------- | ------------------------------- |
| id              | UUID      | PK, auto-generated              |
| organization_id | UUID      | FK → organizations.id, required |
| name            | String    | required, max 200               |
| description     | String    | nullable, max 500               |
| created_at      | Timestamp | auto-generated                  |
| updated_at      | Timestamp | auto-updated                    |

Relationships:

- Program N:1 Organization (via organization_id)
- Program 1:N Projects (via projects.program_id)

Common queries:

- listByOrg(orgId) — dropdowns, admin
- findById(orgId, programId)

Indexes:

- UNIQUE(organization_id, name)

---

### Entity: Department

| Field           | Type      | Constraints                     |
| --------------- | --------- | ------------------------------- |
| id              | UUID      | PK, auto-generated              |
| organization_id | UUID      | FK → organizations.id, required |
| name            | String    | required, max 100               |
| created_at      | Timestamp | auto-generated                  |

Relationships:

- Department N:1 Organization
- Department 1:N People

Indexes:

- UNIQUE(organization_id, name)

---

### Entity: Discipline

| Field           | Type      | Constraints                                       |
| --------------- | --------- | ------------------------------------------------- |
| id              | UUID      | PK, auto-generated                                |
| organization_id | UUID      | FK → organizations.id, required                   |
| name            | String    | required, max 50, display name (e.g., "Software") |
| abbreviation    | String    | required, max 10 (e.g., "SW", "Mek", "Elnik")     |
| created_at      | Timestamp | auto-generated                                    |

Relationships:

- Discipline N:1 Organization
- Discipline 1:N People

Indexes:

- UNIQUE(organization_id, abbreviation)

---

### Entity: Allocation (The Flat Table)

| Field           | Type      | Constraints                                            |
| --------------- | --------- | ------------------------------------------------------ |
| id              | UUID      | PK, auto-generated                                     |
| organization_id | UUID      | FK → organizations.id, required                        |
| person_id       | UUID      | FK → people.id, required                               |
| project_id      | UUID      | FK → projects.id, required                             |
| month           | Date      | required, always first day of month (e.g., 2026-03-01) |
| hours           | Integer   | required, min 0, max 744                               |
| created_at      | Timestamp | auto-generated                                         |
| updated_at      | Timestamp | auto-updated, used for optimistic locking              |

Relationships:

- Allocation N:1 Organization (via organization_id)
- Allocation N:1 Person (via person_id)
- Allocation N:1 Project (via project_id)

Common queries:

- findByPersonAndRange(orgId, personId, startMonth, endMonth) — input form grid
- aggregateByPerson(orgId, filters) — team overview heat map
- findByProjectAndRange(orgId, projectId, start, end) — project view
- findFlat(orgId, filters, pagination) — flat table view
- upsert(orgId, personId, projectId, month, hours) — cell save
- currentMonthSummary(orgId) — sidebar status dots
- dashboardAggregates(orgId) — dashboard KPIs
- departmentUtilization(orgId, range) — department heat map
- disciplineUtilization(orgId) — discipline bars

Indexes:

- UNIQUE(organization_id, person_id, project_id, month) — prevents duplicate allocations
- INDEX(organization_id, person_id, month) — person input form query
- INDEX(organization_id, project_id, month) — project view query
- INDEX(organization_id, month) — date range scans
- INDEX(person_id, month) — person summary queries

---

### Entity: ImportSession (Transient)

| Field             | Type      | Constraints                                                               |
| ----------------- | --------- | ------------------------------------------------------------------------- |
| id                | UUID      | PK, auto-generated                                                        |
| organization_id   | UUID      | FK → organizations.id, required                                           |
| user_id           | String    | Clerk user ID who initiated                                               |
| file_name         | String    | required                                                                  |
| status            | Enum      | "parsing" / "mapped" / "validated" / "importing" / "completed" / "failed" |
| row_count         | Integer   | total rows in file                                                        |
| parsed_data       | JSONB     | parsed file data (headers + rows)                                         |
| mappings          | JSONB     | column mappings                                                           |
| validation_result | JSONB     | validation results                                                        |
| import_result     | JSONB     | final import results                                                      |
| created_at        | Timestamp | auto-generated                                                            |
| expires_at        | Timestamp | created_at + 24h                                                          |

Common queries:

- findById(sessionId) — resume import wizard
- cleanup() — delete expired sessions (cron job)

Indexes:

- INDEX(organization_id, status)
- INDEX(expires_at) — cleanup query

---

### Entity: PlatformAdmin

| Field         | Type      | Constraints               |
| ------------- | --------- | ------------------------- |
| id            | UUID      | PK, auto-generated        |
| email         | String    | unique, required, max 255 |
| password_hash | String    | required, bcrypt hash     |
| name          | String    | required, max 100         |
| is_active     | Boolean   | required, default true    |
| last_login_at | Timestamp | nullable                  |
| created_at    | Timestamp | auto-generated            |
| updated_at    | Timestamp | auto-updated              |

Relationships:

- PlatformAdmin 1:N PlatformAuditLog (via platform_audit_log.admin_id)
- PlatformAdmin 1:N ImpersonationSession (via impersonation_sessions.admin_id)

Common queries:

- findByEmail(email) — login
- findById(id) — token verification

Indexes:

- UNIQUE(email)

**Note:** This table is completely separate from Clerk users. Platform admins do NOT use Clerk for authentication. They have their own login flow with email/password, and JWTs signed with `PLATFORM_ADMIN_SECRET`.

---

### Entity: PlatformAuditLog

| Field                    | Type      | Constraints                                                                                 |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------- |
| id                       | UUID      | PK, auto-generated                                                                          |
| admin_id                 | UUID      | FK → platform_admins.id, required                                                           |
| action                   | String    | required, max 100 (e.g., "org_suspended", "impersonation_started", "subscription_override") |
| target_org_id            | UUID      | FK → organizations.id, nullable (null for system-wide actions)                              |
| target_user_id           | String    | nullable, Clerk user ID if action targets a specific user                                   |
| impersonation_session_id | UUID      | FK → impersonation_sessions.id, nullable (set when action was during impersonation)         |
| details                  | JSONB     | nullable, action-specific context (reason, before/after values, etc.)                       |
| ip_address               | String    | nullable, max 45                                                                            |
| user_agent               | String    | nullable, max 500                                                                           |
| created_at               | Timestamp | auto-generated                                                                              |

Relationships:

- PlatformAuditLog N:1 PlatformAdmin (via admin_id)
- PlatformAuditLog N:1 Organization (via target_org_id, optional)
- PlatformAuditLog N:1 ImpersonationSession (via impersonation_session_id, optional)

Common queries:

- findByFilters(adminId?, orgId?, action?, dateRange?, page, pageSize) — audit log viewer
- findByImpersonationSession(sessionId) — review all actions during an impersonation
- countByOrgAndAction(orgId, action, dateRange) — metrics

Indexes:

- INDEX(admin_id, created_at DESC) — admin activity history
- INDEX(target_org_id, created_at DESC) — org action history
- INDEX(action, created_at DESC) — action type filtering
- INDEX(impersonation_session_id) — impersonation session actions
- INDEX(created_at DESC) — chronological browsing

---

### Entity: ImpersonationSession

| Field          | Type      | Constraints                                  |
| -------------- | --------- | -------------------------------------------- |
| id             | UUID      | PK, auto-generated                           |
| admin_id       | UUID      | FK → platform_admins.id, required            |
| target_org_id  | UUID      | FK → organizations.id, required              |
| target_user_id | String    | required, Clerk user ID being impersonated   |
| token_hash     | String    | required, hashed session token               |
| started_at     | Timestamp | auto-generated                               |
| ended_at       | Timestamp | nullable (null while active)                 |
| expires_at     | Timestamp | required, started_at + 1 hour (hard limit)   |
| action_count   | Integer   | default 0, incremented on each logged action |

Relationships:

- ImpersonationSession N:1 PlatformAdmin (via admin_id)
- ImpersonationSession N:1 Organization (via target_org_id)
- ImpersonationSession 1:N PlatformAuditLog (via platform_audit_log.impersonation_session_id)

Common queries:

- getActiveSession(adminId) — check if admin has an active impersonation
- findById(sessionId) — verify/end session
- listByOrg(orgId) — audit: who impersonated this org

Indexes:

- INDEX(admin_id, ended_at) — active session lookup
- INDEX(target_org_id, started_at DESC) — org impersonation history
- INDEX(expires_at) — cleanup expired sessions

---

### Entity: FeatureFlag

| Field           | Type      | Constraints                                                                 |
| --------------- | --------- | --------------------------------------------------------------------------- |
| id              | UUID      | PK, auto-generated                                                          |
| organization_id | UUID      | FK → organizations.id, required                                             |
| flag_name       | String    | required, max 100 (e.g., "advanced-dashboard", "api-access", "beta-export") |
| enabled         | Boolean   | required, default false                                                     |
| set_by_admin_id | UUID      | FK → platform_admins.id, required                                           |
| created_at      | Timestamp | auto-generated                                                              |
| updated_at      | Timestamp | auto-updated                                                                |

Relationships:

- FeatureFlag N:1 Organization (via organization_id)
- FeatureFlag N:1 PlatformAdmin (via set_by_admin_id)

Common queries:

- getByOrg(orgId) — feature gating middleware
- getByOrgAndFlag(orgId, flagName) — single flag check
- listAllFlags() — admin overview

Indexes:

- UNIQUE(organization_id, flag_name) — one entry per flag per org
- INDEX(flag_name) — find all orgs with a specific flag

---

### Entity: SystemAnnouncement

| Field               | Type      | Constraints                                            |
| ------------------- | --------- | ------------------------------------------------------ |
| id                  | UUID      | PK, auto-generated                                     |
| title               | String    | required, max 200                                      |
| body                | String    | required, max 2000                                     |
| severity            | Enum      | "info" / "warning" / "critical", default "info"        |
| target_org_ids      | UUID[]    | nullable, if null applies to all orgs                  |
| created_by_admin_id | UUID      | FK → platform_admins.id, required                      |
| starts_at           | Timestamp | required, when to start showing                        |
| expires_at          | Timestamp | nullable, when to stop showing (null = manual removal) |
| created_at          | Timestamp | auto-generated                                         |
| updated_at          | Timestamp | auto-updated                                           |

Relationships:

- SystemAnnouncement N:1 PlatformAdmin (via created_by_admin_id)

Common queries:

- findActive(orgId?) — active announcements for a specific org (or all)
- findAll(page, pageSize) — admin management view

Indexes:

- INDEX(starts_at, expires_at) — active announcement lookup
- INDEX(created_by_admin_id) — admin's announcements

---

_Note: The Organization entity's platform admin fields (`suspended_at`, `suspended_reason`, `trial_ends_at`, `credit_balance_cents`, `platform_notes`) are defined in the Organization entity above (Section 7). They are not repeated here to avoid duplication._

---

## 8. Interface Contracts

### 8.1 External API

All API endpoints are prefixed with `/api/`. All require Clerk authentication except webhooks and health. All scoped by tenant via `getTenantId()`.

---

#### Allocations

```
GET /api/allocations
  Purpose: Query allocations — supports multiple view modes via query params
  Auth: viewer+
  Request:
    Query:
      view: "person" | "team" | "project" | "flat" (default "flat")
      personId: String (required if view=person)
      projectId: String (required if view=project)
      departmentId: String (optional filter)
      disciplineId: String (optional filter)
      programId: String (optional filter)
      startMonth: String YYYY-MM (default: current month - 1)
      endMonth: String YYYY-MM (default: current month + 11)
      page: Number (default 1, flat view only)
      pageSize: Number (default 50, flat view only)
      sortBy: String (flat view only)
      sortDir: "asc" | "desc" (flat view only)
  Response:
    200 (view=person): { person: Person, allocations: List<Allocation>, months: List<String> }
    200 (view=team): { people: List<PersonMonthSummary>, months: List<String> }
    200 (view=project): { project: ProjectWithDetails, people: List<PersonMonthSummary>, monthlyTotals: Map<String, Number> }
    200 (view=flat): { items: List<FlatAllocation>, total: Number, page: Number, pageSize: Number }
    400: { error: "VALIDATION_ERROR", message: String, details: List<FieldError> }
    401: { error: "AUTH_ERROR", message: "Not authenticated" }
  Maps to: allocationService.getPersonAllocations | getTeamAllocations | getProjectAllocations | getAllocationsFlat
```

```
POST /api/allocations
  Purpose: Create or update a single allocation (auto-save from grid cell)
  Auth: planner+
  Request:
    Body: { personId: String, projectId: String, month: String, hours: Number }
  Response:
    200: { allocation: Allocation }
    400: { error: "VALIDATION_ERROR", message: String }
    404: { error: "NOT_FOUND", message: "Person or project not found" }
    409: { error: "CONFLICT", message: "Record was modified by another user" }
  Maps to: allocationService.upsertAllocation
```

```
POST /api/allocations/batch
  Purpose: Batch create/update allocations (drag-to-fill, paste, import)
  Auth: planner+
  Request:
    Body: { allocations: List<{ personId: String, projectId: String, month: String, hours: Number }> }
  Response:
    200: { created: Number, updated: Number, deleted: Number, errors: List<BatchError> }
    400: { error: "VALIDATION_ERROR", message: String }
  Maps to: allocationService.batchUpsertAllocations
```

```
DELETE /api/allocations/[id]
  Purpose: Delete a single allocation
  Auth: planner+
  Request:
    Params: { id: String }
  Response:
    204: (no body)
    404: { error: "NOT_FOUND" }
  Maps to: allocationService.deleteAllocation
```

```
GET /api/allocations/export
  Purpose: Export allocations as Excel or CSV
  Auth: viewer+
  Request:
    Query:
      format: "xlsx" | "csv" (default "xlsx")
      template: Boolean (if true, returns empty template)
      type: "allocations" | "people" | "projects" (for templates)
      (same filter params as GET /api/allocations view=flat)
  Response:
    200: Binary file stream with Content-Disposition header
    400: { error: "VALIDATION_ERROR" }
  Maps to: exportService.generateExcel | generateCsv | generateImportTemplate
```

---

#### People

```
GET /api/people
  Purpose: List people with optional filtering and status
  Auth: viewer+
  Request:
    Query:
      departmentId: String (optional)
      disciplineId: String (optional)
      search: String (optional, searches first+last name)
      includeArchived: Boolean (default false)
  Response:
    200: { people: List<PersonWithStatus> }
  Maps to: personService.listPeople
```

```
POST /api/people
  Purpose: Create a new person
  Auth: admin+
  Request:
    Body: { firstName: String, lastName: String, disciplineId: String, departmentId: String, targetHoursPerMonth: Number }
  Response:
    201: { person: Person }
    400: { error: "VALIDATION_ERROR" }
    409: { error: "CONFLICT", message: "Person with same name exists in department" }
  Maps to: personService.createPerson
```

```
GET /api/people/[id]
  Purpose: Get a single person
  Auth: viewer+
  Response:
    200: { person: Person }
    404: { error: "NOT_FOUND" }
  Maps to: personService.getById
```

```
PATCH /api/people/[id]
  Purpose: Update a person
  Auth: admin+
  Request:
    Body: Partial<{ firstName, lastName, disciplineId, departmentId, targetHoursPerMonth }>
  Response:
    200: { person: Person }
    404: { error: "NOT_FOUND" }
  Maps to: personService.updatePerson
```

```
DELETE /api/people/[id]
  Purpose: Archive a person (soft-delete)
  Auth: admin+
  Response:
    204: (no body)
    404: { error: "NOT_FOUND" }
  Maps to: personService.deletePerson
```

---

#### Projects

```
GET /api/projects
  Purpose: List projects
  Auth: viewer+
  Request:
    Query: { programId?, status?, search? }
  Response:
    200: { projects: List<ProjectWithProgram> }
  Maps to: projectService.listProjects
```

```
POST /api/projects
  Purpose: Create a project
  Auth: admin+
  Request:
    Body: { name: String, programId?: String, status: "active" | "planned" }
  Response:
    201: { project: Project }
    409: { error: "CONFLICT" }
  Maps to: projectService.createProject
```

```
GET /api/projects/[id]
  Purpose: Get a project with details
  Auth: viewer+
  Response:
    200: { project: ProjectWithDetails }
    404: { error: "NOT_FOUND" }
  Maps to: projectService.getById
```

```
PATCH /api/projects/[id]
  Purpose: Update a project
  Auth: admin+
  Response:
    200: { project: Project }
  Maps to: projectService.updateProject
```

```
DELETE /api/projects/[id]
  Purpose: Archive a project
  Auth: admin+
  Response:
    204: (no body)
  Maps to: projectService.deleteProject
```

---

#### Programs

```
GET /api/programs
  Auth: viewer+
  Response:
    200: { programs: List<Program> }
  Maps to: programService.listPrograms
```

```
POST /api/programs
  Auth: admin+
  Request:
    Body: { name: String, description?: String }
  Response:
    201: { program: Program }
  Maps to: programService.createProgram
```

```
PATCH /api/programs/[id]
  Auth: admin+
  Maps to: programService.updateProgram
```

```
DELETE /api/programs/[id]
  Auth: admin+
  Maps to: programService.deleteProgram
```

---

#### Reference Data (Departments, Disciplines)

```
GET /api/departments
  Auth: viewer+
  Response: { departments: List<Department> }
  Maps to: departmentService.listDepartments

POST /api/departments
  Auth: admin+
  Request: { name: String }
  Response: { department: Department }
  Maps to: departmentService.createDepartment

PATCH /api/departments/[id]
  Auth: admin+
  Request: { name: String }
  Response: { department: Department }
  Maps to: departmentService.updateDepartment

DELETE /api/departments/[id]
  Auth: admin+
  Response: 204 (no body)
  Maps to: departmentService.deleteDepartment

GET /api/disciplines
  Auth: viewer+
  Response: { disciplines: List<Discipline> }
  Maps to: disciplineService.listDisciplines

POST /api/disciplines
  Auth: admin+
  Request: { name: String, abbreviation: String }
  Response: { discipline: Discipline }
  Maps to: disciplineService.createDiscipline

PATCH /api/disciplines/[id]
  Auth: admin+
  Request: Partial<{ name: String, abbreviation: String }>
  Response: { discipline: Discipline }
  Maps to: disciplineService.updateDiscipline

DELETE /api/disciplines/[id]
  Auth: admin+
  Response: 204 (no body)
  Maps to: disciplineService.deleteDiscipline
```

---

#### Import

```
POST /api/import/upload
  Purpose: Upload file and get parsing results + suggested mappings
  Auth: admin+
  Request:
    Body: FormData with file field
  Response:
    200: { sessionId: String, headers: List<String>, sampleRows: List<Map<String, String>>, rowCount: Number, suggestedMappings: List<ColumnMapping>, format: "flat" | "pivot" }
    400: { error: "VALIDATION_ERROR", message: "File too large / unsupported format" }
  Maps to: importService.parseUploadedFile
```

```
POST /api/import/validate
  Purpose: Validate mapped data against database
  Auth: admin+
  Request:
    Body: { sessionId: String, mappings: List<{ sourceColumn: String, systemField: String }> }
  Response:
    200: { ready: Number, warnings: List<ValidationIssue>, errors: List<ValidationIssue> }
    404: { error: "NOT_FOUND", message: "Import session expired" }
  Maps to: importService.validateMappedData
```

```
POST /api/import/execute
  Purpose: Execute the import
  Auth: admin+
  Request:
    Body: { sessionId: String, skipErrors: Boolean, overrideDuplicates: Boolean, createMissingPeople: Boolean, createMissingProjects: Boolean }
  Response:
    200: { imported: Number, skipped: Number, errors: List<ImportError>, createdPeople: List<Person>, createdProjects: List<Project> }
    404: { error: "NOT_FOUND", message: "Import session expired" }
  Maps to: importService.executeImport
```

---

#### Dashboard (Phase 2)

```
GET /api/dashboard
  Purpose: Get all dashboard data in one request
  Auth: viewer+
  Request:
    Query: { startMonth?, endMonth? }
  Response:
    200: { kpis: DashboardKpis, departmentHeatmap: List<DepartmentRow>, alerts: List<CapacityAlert>, disciplineBreakdown: List<DisciplineMetric> }
  Maps to: dashboardService.getKpis + getDepartmentHeatmap + getCapacityAlerts + getDisciplineBreakdown
```

---

#### Webhooks

```
POST /api/webhooks/clerk
  Purpose: Handle Clerk organization and user lifecycle events
  Auth: Clerk webhook signature verification (svix)
  Events handled: organization.created, organizationMembership.created, user.created
  Maps to: organizationService.createOrganization

POST /api/webhooks/stripe
  Purpose: Handle Stripe subscription lifecycle events
  Auth: Stripe webhook signature verification
  Events handled: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
  Maps to: billingService.handleWebhook
```

---

#### Health

```
GET /api/health
  Purpose: Health check for monitoring
  Auth: None
  Response:
    200: { status: "ok", timestamp: String, db: "connected" | "error" }
```

---

#### Platform Admin (F-029 to F-038)

All `/api/platform/*` endpoints require platform admin authentication via Bearer token in the Authorization header. These are completely separate from Clerk-authenticated tenant endpoints.

```
POST /api/platform/auth
  Purpose: Authenticate a platform admin and receive a JWT
  Auth: None (login endpoint)
  Rate limit: 5 requests per minute per IP
  Request:
    Body: { email: String, password: String }
  Response:
    200: { token: String, admin: { id: String, name: String, email: String } }
    401: { error: "ERR_AUTH", message: "Invalid credentials" }
    429: { error: "ERR_RATE_LIMIT", message: "Too many login attempts. Try again later." }
  Maps to: platformAdminAuth.authenticatePlatformAdmin
```

```
GET /api/platform/organizations
  Purpose: List all tenant organizations with health metrics
  Auth: Platform Admin (Bearer token)
  Request:
    Query: { search?, status?, sortBy?, sortDir?, page?, pageSize? }
  Response:
    200: { items: List<PlatformOrgSummary>, total: Number, page: Number, pageSize: Number }
    401: { error: "ERR_AUTH" }
  Maps to: platformAdminService.listOrganizations
```

```
POST /api/platform/organizations
  Purpose: Create a new organization manually (for enterprise onboarding)
  Auth: Platform Admin
  Request:
    Body: { name: String, slug: String, ownerEmail: String, subscriptionStatus?: String }
  Response:
    201: { org: Organization }
    409: { error: "ERR_CONFLICT", message: "Slug already taken" }
  Maps to: organizationService.createOrganization (reuses existing service), platformAdminQueries.insertAuditLog
```

```
GET /api/platform/organizations/[orgId]
  Purpose: Get detailed health and metrics for a single organization
  Auth: Platform Admin
  Response:
    200: { orgHealth: OrgHealthDetail }
    404: { error: "ERR_NOT_FOUND" }
  Maps to: platformAdminService.getOrgHealth
```

```
PATCH /api/platform/organizations/[orgId]
  Purpose: Update organization metadata (name, platform notes)
  Auth: Platform Admin
  Request:
    Body: { name?: String, platformNotes?: String }
  Response:
    200: { org: Organization }
    404: { error: "ERR_NOT_FOUND" }
  Maps to: platformAdminService.updateOrganizationMetadata
```

```
DELETE /api/platform/organizations/[orgId]
  Purpose: Permanently delete an organization and all its data
  Auth: Platform Admin
  Request:
    Body: { confirmation: String }  // Must match org name
  Response:
    204: (no body)
    400: { error: "ERR_VALIDATION", message: "Confirmation does not match organization name" }
    404: { error: "ERR_NOT_FOUND" }
  Maps to: platformAdminService.deleteOrganization
```

```
POST /api/platform/organizations/[orgId]/suspend
  Purpose: Suspend an organization (blocks user access)
  Auth: Platform Admin
  Request:
    Body: { reason: String }
  Response:
    200: { org: Organization }
    404: { error: "ERR_NOT_FOUND" }
    409: { error: "ERR_CONFLICT", message: "Organization is already suspended" }
  Maps to: platformAdminService.suspendOrganization
```

```
POST /api/platform/organizations/[orgId]/reactivate
  Purpose: Reactivate a suspended organization
  Auth: Platform Admin
  Request:
    Body: { reason: String }
  Response:
    200: { org: Organization }
    409: { error: "ERR_CONFLICT", message: "Organization is not suspended" }
  Maps to: platformAdminService.reactivateOrganization
```

```
POST /api/platform/organizations/[orgId]/impersonate
  Purpose: Start an impersonation session for a user in this org
  Auth: Platform Admin
  Request:
    Body: { userId: String }
  Response:
    200: { session: ImpersonationSession }
    404: { error: "ERR_NOT_FOUND", message: "User not found in organization" }
  Maps to: platformAdminService.impersonateUser
```

```
PATCH /api/platform/organizations/[orgId]/subscription
  Purpose: Manually override subscription (extend trial, apply credit, change plan)
  Auth: Platform Admin
  Request:
    Body: { action: "extend_trial" | "apply_credit" | "change_plan" | "set_status", trialEndDate?: String, creditAmount?: Number, planId?: String, status?: String, reason: String }
  Response:
    200: { org: Organization }
    400: { error: "ERR_VALIDATION" }
  Maps to: platformAdminService.overrideSubscription
```

```
GET /api/platform/organizations/[orgId]/feature-flags
  Purpose: Get feature flags for an organization
  Auth: Platform Admin
  Response:
    200: { flags: Map<String, Boolean> }
  Maps to: platformAdminService.getFeatureFlags
```

```
PUT /api/platform/organizations/[orgId]/feature-flags
  Purpose: Set feature flags for an organization
  Auth: Platform Admin
  Request:
    Body: { flags: Map<String, Boolean> }
  Response:
    200: { flags: Map<String, Boolean> }
  Maps to: platformAdminService.setFeatureFlags
```

```
GET /api/platform/organizations/[orgId]/export
  Purpose: Export all data for a tenant as JSON archive
  Auth: Platform Admin
  Response:
    200: Binary JSON file with Content-Disposition header
  Maps to: platformAdminService.exportTenantData
```

```
GET /api/platform/organizations/[orgId]/users
  Purpose: List all users in an organization (from Clerk)
  Auth: Platform Admin
  Response:
    200: { users: List<{ id, name, email, role, lastActiveAt }> }
  Maps to: platformAdminService.listOrgUsers
```

```
POST /api/platform/organizations/[orgId]/users
  Purpose: Perform user management actions (reset password, force logout, unlock)
  Auth: Platform Admin
  Request:
    Body: { userId: String, action: "reset_password" | "force_logout" | "unlock_account" }
  Response:
    200: { success: true }
    404: { error: "ERR_NOT_FOUND" }
  Maps to: platformAdminService.resetUserPassword | forceLogoutUser | unlockAccount
```

```
GET /api/platform/health
  Purpose: Get system-wide health metrics
  Auth: Platform Admin
  Response:
    200: { metrics: SystemHealthMetrics }
  Maps to: platformAdminService.getSystemHealth
```

```
GET /api/platform/audit-log
  Purpose: Query platform audit log
  Auth: Platform Admin
  Request:
    Query: { adminId?, orgId?, action?, startDate?, endDate?, page?, pageSize? }
  Response:
    200: { items: List<PlatformAuditEntry>, total: Number, page: Number, pageSize: Number }
  Maps to: platformAdminService.getPlatformAuditLog
```

```
GET /api/platform/announcements
  Purpose: List system announcements
  Auth: Platform Admin
  Request:
    Query: { active?: Boolean }
  Response:
    200: { announcements: List<SystemAnnouncement> }
  Maps to: platformAdminService.listAnnouncements
```

```
POST /api/platform/announcements
  Purpose: Create a new system announcement
  Auth: Platform Admin
  Request:
    Body: { title: String, body: String, severity: "info" | "warning" | "critical", targetOrgIds?: List<String>, startsAt: String, expiresAt?: String }
  Response:
    201: { announcement: SystemAnnouncement }
    400: { error: "ERR_VALIDATION" }
  Maps to: platformAdminService.createAnnouncement
```

```
PATCH /api/platform/announcements/[id]
  Purpose: Update an announcement
  Auth: Platform Admin
  Request:
    Body: Partial<{ title, body, severity, expiresAt }>
  Response:
    200: { announcement: SystemAnnouncement }
  Maps to: platformAdminService.updateAnnouncement
```

```
DELETE /api/platform/announcements/[id]
  Purpose: Delete an announcement
  Auth: Platform Admin
  Response:
    204: (no body)
  Maps to: platformAdminService.deleteAnnouncement
```

```
POST /api/platform/impersonation/end
  Purpose: End an active impersonation session
  Auth: Platform Admin
  Request:
    Body: { sessionId: String }
  Response:
    200: { actionCount: Number }
  Maps to: platformAdminService.endImpersonation
```

---

### 8.2 Internal Module Contracts

```
AllocationGrid → useGridAutosave hook:
  Input: { personId: String, cellChanges: List<{ projectId, month, hours }> }
  Behavior: Debounce 300ms, then call POST /api/allocations or POST /api/allocations/batch
  Output: Optimistic update in TanStack Query cache, rollback on error
  Error handling: Show toast on conflict, refetch grid data
```

```
PersonSidebar → PersonInputPage:
  Input: selectedPersonId: String
  Behavior: URL param update → triggers server component re-render with new person data
  Output: New person's allocations loaded in grid
```

```
ImportWizard state machine:
  States: idle → uploading → mapping → validating → importing → complete | failed
  Transitions:
    idle → uploading: user selects file
    uploading → mapping: POST /api/import/upload succeeds
    mapping → validating: user confirms mappings, POST /api/import/validate
    validating → importing: user clicks "Import X rows", POST /api/import/execute
    importing → complete: import succeeds
    importing → failed: import fails
    any → idle: user clicks "Cancel"
```

---

## 9. Data Flow Diagrams

### Flow 1: Edit Allocation Cell (Happy Path)

```
User clicks cell in AllocationGrid
  → AG Grid enters edit mode (shows number input)
  → User types value (e.g., "120")
  → User presses Tab/Enter or clicks away (blur event)
  → AG Grid fires onCellValueChanged event
    → useGridAutosave.handleCellChange({ personId, projectId, month, hours: 120 })
      → Optimistic update: TanStack Query cache updated immediately
      → SUMMA row recalculates (capacity.ts → calculateStatus)
      → Status row re-renders with new color
      → Debounce 300ms
      → POST /api/allocations { personId, projectId, month: "2026-03", hours: 120 }
        → Route handler: getTenantId(request) → orgId
        → allocationService.upsertAllocation(orgId, data)
          → allocationSchema.validate(data)
          → personService.getById(orgId, personId) → verify exists
          → projectService.getById(orgId, projectId) → verify exists
          → allocationQueries.upsert(orgId, personId, projectId, month, hours)
            → INSERT ... ON CONFLICT (org_id, person_id, project_id, month) DO UPDATE SET hours = 120
          → Return updated Allocation
        → Response 200: { allocation }
      → useGridAutosave confirms cache (no rollback needed)
      → Toast: "Saved" (subtle, auto-dismiss 2s)
```

Error branch — concurrent edit:

```
  → allocationQueries.upsert detects updated_at mismatch
    → Throw ConflictError
    → Response 409: { error: "CONFLICT" }
    → useGridAutosave rolls back optimistic update
    → Refetch person allocations from server
    → Toast: "Another user modified this cell. Refreshing..."
```

Error branch — validation failure:

```
  → allocationSchema.validate fails (hours > 744)
    → Throw ValidationError
    → Response 400: { error: "VALIDATION_ERROR" }
    → useGridAutosave rolls back to previous value
    → Toast: "Invalid value: hours must be 0-744"
```

### Flow 2: Bulk Import (Happy Path)

```
Admin navigates to /data/import
  → ImportWizard renders (state: idle)

Step 1: Upload
  → Admin selects file "Allocation_Data_Q1_2026.xlsx"
  → POST /api/import/upload (FormData with file)
    → getTenantId(request) → orgId
    → importService.parseUploadedFile(orgId, file, fileName)
      → importParser.parse(file, "Allocation_Data_Q1_2026.xlsx")
        → xlsx.read(file) → workbook
        → Extract headers: ["Namn", "Projekt", "Timmar", "Månad", "Avdelning"]
        → Extract rows: 1,200 data rows
      → importParser.detectFormat(headers, sampleRows) → "flat"
      → importMapper.suggestMappings(headers)
        → "Namn" → "Person Name" (confidence: 0.95, matched)
        → "Projekt" → "Project" (confidence: 0.95, matched)
        → "Timmar" → "Planned Hours" (confidence: 0.90, matched)
        → "Månad" → "Month" (confidence: 0.90, matched)
        → "Avdelning" → "Department" (confidence: 0.85, matched)
      → Create ImportSession in DB (status: "parsing")
      → Store parsed data in session
    → Response 200: { sessionId, headers, sampleRows, rowCount: 1200, suggestedMappings, format: "flat" }
  → ImportWizard transitions to state: mapping

Step 2: Mapping
  → StepMapping component renders suggested mappings
  → Admin reviews: all 5 columns matched correctly
  → Admin clicks "Continue to Validation"
  → POST /api/import/validate { sessionId, mappings }
    → importService.validateMappedData(orgId, sessionId, mappings)
      → Load ImportSession from DB
      → Load existingPeople and existingProjects from DB
      → importValidator.validate(orgId, rows, existingPeople, existingProjects)
        → For each row:
          → Check person name exists → Row 34: "Johan Nilson" not found
            → findClosestMatch("Johan Nilson", personNames) → "Johan Nilsson" (distance 1)
            → Error: { row: 34, severity: "error", message: "Person not found", suggestion: "Johan Nilsson" }
          → Check project exists → OK
          → Check month parseable → OK
          → Check hours is numeric → OK
          → Check for duplicate (same person+project+month) → Row 112: duplicate
            → Warning: { row: 112, severity: "warning", message: "Duplicate allocation" }
      → Return: { ready: 820, warnings: [25 items], errors: [5 items] }
    → Response 200: { ready: 820, warnings, errors }
  → ImportWizard transitions to state: validating

Step 3: Validation Review
  → StepValidation renders summary cards (820 ready, 25 warnings, 5 errors)
  → Admin clicks "Apply Fix" on "Johan Nilson" → "Johan Nilsson"
  → Admin clicks "Import 820 rows, skip errors"

Step 4: Execute
  → POST /api/import/execute { sessionId, skipErrors: true, overrideDuplicates: true }
    → importService.executeImport(orgId, sessionId, options)
      → importExecutor.execute(orgId, validRows, options)
        → Begin transaction
        → For each valid row:
          → Resolve person_id from name
          → Resolve project_id from name
          → Parse month
          → allocationService.batchUpsertAllocations(orgId, batch)
        → Commit transaction
        → Return { imported: 820, skipped: 5, errors: [] }
    → Response 200: { imported: 820, skipped: 5 }
  → ImportWizard transitions to state: complete
  → Toast: "Import complete. 820 allocations imported."
```

### Flow 3: Team Overview Load (Phase 2)

```
User navigates to /team
  → TeamHeatmapPage (server component) renders
    → getTenantId from Clerk session → orgId
    → allocationService.getTeamAllocations(orgId, { startMonth: "2026-01", endMonth: "2026-09" })
      → allocationQueries.aggregateByPerson(orgId, range)
        → SQL: SELECT p.id, p.first_name, p.last_name, d.abbreviation, dept.name,
                       a.month, SUM(a.hours) as total
                FROM allocations a
                JOIN people p ON a.person_id = p.id
                JOIN disciplines d ON p.discipline_id = d.id
                JOIN departments dept ON p.department_id = dept.id
                WHERE a.organization_id = $orgId
                  AND a.month BETWEEN $start AND $end
                  AND p.archived_at IS NULL
                GROUP BY p.id, p.first_name, p.last_name, d.abbreviation, dept.name, a.month
                ORDER BY dept.name, p.last_name, p.first_name
      → Return grouped data
    → For each person/month: calculateStatus(total, targetHours)
    → Return List<PersonMonthSummary>
  → TeamHeatmap renders:
    → Department group headers
    → Person rows with avatar, name, discipline tag
    → Month cells colored by status (getStatusColor)
    → Current month column highlighted
    → Footer: aggregated metrics
```

### Flow 4: Export to Excel

```
User on /data → clicks "Export to Excel"
  → FlatTable component triggers GET /api/allocations/export?format=xlsx with current filter params
    → Route handler: getTenantId → orgId
    → exportService.generateExcel(orgId, filters)
      → allocationService.getAllocationsFlat(orgId, { ...filters, pageSize: Infinity })
        → allocationQueries.findFlat(orgId, filters)
          → SQL: SELECT p.first_name || ' ' || p.last_name AS person,
                         d.abbreviation AS discipline, dept.name AS department,
                         proj.name AS project, prog.name AS program,
                         a.month, a.hours
                  FROM allocations a
                  JOIN people p ON a.person_id = p.id
                  ...
                  WHERE filters
                  ORDER BY person, month
      → xlsx.utils.json_to_sheet(data)
      → xlsx.write(workbook, { type: "buffer" })
      → Return Buffer
    → Response: Binary with headers
      Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
      Content-Disposition: attachment; filename="resource-export-2026-03-25.xlsx"
  → Browser downloads file
```

### Flow 5: Person Navigation (Prev/Next)

```
User on /input/[personId] → clicks [►] next arrow
  → PersonHeader component
    → personService.getAdjacentPerson(orgId, currentPersonId, "next", activeFilters)
      → personQueries.findAdjacent
        → SQL: SELECT * FROM people
                WHERE organization_id = $orgId AND archived_at IS NULL
                  AND sort_order > (SELECT sort_order FROM people WHERE id = $currentId)
                ORDER BY sort_order ASC LIMIT 1
      → Return next Person or None
    → If nextPerson exists:
      → router.push(`/input/${nextPerson.id}`)
      → Page re-renders with new person's data
      → Grid loads new person's allocations
    → If None (end of list):
      → Next button disabled (visual feedback)
```

### Flow 6: Platform Admin Impersonates User

```
Platform admin navigates to /platform/organizations
  → PlatformDashboardPage renders (requires platform admin auth)
    → platformAdminService.listOrganizations({ sortBy: "lastActiveAt" })
      → platformAdminQueries.findAllOrgs()
      → platformAdminQueries.getOrgMetrics()
      → Return paginated list with health metrics
  → Admin clicks on "Acme Engineering" org

  → OrgDetailPage renders
    → platformAdminService.getOrgHealth(orgId)
      → Full health detail: 45 users, active subscription, 0.2% error rate
    → Admin sees user list → selects "anna@acme.com" (Org Owner)
    → Admin clicks "Impersonate"

  → POST /api/platform/organizations/[orgId]/impersonate { userId: "user_abc123" }
    → requirePlatformAdmin(request) → verify Bearer token → platformAdmin
    → platformAdminService.impersonateUser(platformAdmin.id, orgId, "user_abc123")
      → Verify org exists → OK
      → Verify user belongs to org via Clerk → OK
      → Generate impersonation token (JWT, 1-hour expiry)
      → INSERT into impersonation_sessions { adminId, orgId, userId, tokenHash, expiresAt }
      → INSERT into platform_audit_log { action: "impersonation_started", targetOrgId, targetUserId }
      → Return { sessionId, token, expiresAt, impersonatedUser, org }
    → Response 200: { session }

  → Browser stores impersonation token, redirects to /input (tenant app)
  → UI shows impersonation banner: "You are impersonating anna@acme.com in Acme Engineering. [End Impersonation]"

  → Admin navigates tenant app as anna@acme.com
    → Every request includes X-Impersonation-Token header
    → middleware.ts → resolveImpersonation(request) → detects impersonation
      → Returns ImpersonationContext { platformAdminId, impersonatedUserId, impersonatedOrgId }
    → getTenantId uses impersonated org and user context
    → Any mutation (e.g., POST /api/allocations) → logImpersonatedAction(sessionId, "allocation_updated", ...)
      → INSERT into platform_audit_log with impersonation_session_id

  → Admin clicks "End Impersonation"
    → POST /api/platform/impersonation/end { sessionId }
      → platformAdminService.endImpersonation(adminId, sessionId)
        → UPDATE impersonation_sessions SET ended_at = NOW()
        → INSERT into platform_audit_log { action: "impersonation_ended", details: { actionCount: 7 } }
    → Browser clears impersonation token → redirects to /platform
```

### Flow 7: Platform Admin Resolves Tenant Issue

```
Support ticket: "Acme Engineering reports import always failing"

Platform admin navigates to /platform/organizations → searches "Acme"
  → platformAdminService.getOrgHealth("acme-org-id")
    → Returns health detail including:
      → lastImportAt: "2026-03-24T14:30:00Z"
      → lastImportStatus: "failed"
      → recentErrors: [
          { type: "import_validation_error", count: 12, lastOccurred: "2026-03-24" },
          { type: "import_parse_error", count: 3, lastOccurred: "2026-03-23" }
        ]
  → Admin sees: 15 import errors in last 48 hours

  → Admin impersonates the org admin user
    → Navigates to /data/import → uploads the customer's test file
    → Sees: "Error parsing file — column 'Planerade timmar (Q1)' not recognized"
    → Identifies issue: customer uses a non-standard Swedish header variant
  → Ends impersonation

  → Admin notes the issue, files internal bug to add header alias
  → Admin uses /platform/organizations/[orgId] to add platform_notes: "Import fails due to non-standard header 'Planerade timmar (Q1)'. Fix in progress — ticket #1234"
    → INSERT into platform_audit_log { action: "org_notes_updated" }

  → Admin contacts customer with workaround: rename column to "Timmar"
```

---

## 10. Dependency Map

### 10.1 Internal Dependencies (module → module)

```
API Route Handlers
  ├── allocationService ──→ allocationQueries (DB)
  │                     ──→ personService (validation)
  │                     ──→ projectService (validation)
  ├── personService ────→ personQueries (DB)
  │                  ──→ allocationQueries (for status calculation)
  ├── projectService ──→ projectQueries (DB)
  │                   ──→ allocationQueries (for summary)
  ├── programService ──→ programQueries (DB)
  │                   ──→ projectQueries (for cascade)
  ├── importService ───→ importParser
  │                  ──→ importMapper
  │                  ──→ importValidator ──→ personService, projectService
  │                  ──→ importExecutor ──→ allocationService, personService, projectService
  ├── exportService ───→ allocationService
  │                  ──→ xlsx (SheetJS)
  ├── dashboardService → allocationQueries, personQueries
  ├── orgService ──────→ orgQueries (DB)
  │                  ──→ disciplineQueries, departmentQueries (seeding)
  ├── billingService ──→ Stripe SDK, orgQueries
  └── platformAdminService ──→ platformAdminQueries (DB)
                            ──→ platformAdminAuth (JWT)
                            ──→ organizationService (org CRUD reuse)
                            ──→ personService (tenant data export)
                            ──→ projectService (tenant data export)
                            ──→ allocationService (tenant data export)
                            ──→ programService (tenant data export)
                            ──→ Clerk SDK (user management, session revocation)
                            ──→ Stripe SDK (subscription overrides)

UI Components
  ├── AllocationGrid ──→ useAllocations hook ──→ GET/POST /api/allocations
  │                  ──→ useGridAutosave hook ──→ POST /api/allocations[/batch]
  │                  ──→ AG Grid library
  │                  ──→ capacity.ts (status calculation)
  ├── PersonSidebar ───→ usePeople hook ──→ GET /api/people
  ├── PersonHeader ────→ usePeople hook
  ├── FlatTable ───────→ useAllocations hook ──→ GET /api/allocations?view=flat
  ├── ImportWizard ────→ POST /api/import/*
  ├── TeamHeatmap ─────→ GET /api/allocations?view=team (Phase 2)
  ├── Dashboard ───────→ GET /api/dashboard (Phase 2)
  └── PlatformAdmin ──→ GET/POST/PATCH/DELETE /api/platform/* (own auth, not Clerk)
                     ──→ platformAdminAuth (JWT verification)

Shared
  ├── tenant.ts ──→ Clerk auth
  ├── middleware.ts ──→ Clerk authMiddleware
  ├── capacity.ts ──→ (pure functions, no dependencies)
  ├── date-utils.ts ──→ (pure functions, no dependencies)
  ├── errors.ts ──→ (pure functions, no dependencies)
  └── platform-auth.ts ──→ platformAdminQueries (impersonation session lookup)
                        ──→ jwt (PLATFORM_ADMIN_SECRET verification)
```

### 10.2 External Dependencies (packages/services)

| Package                          | Purpose                                            | Version | License    |
| -------------------------------- | -------------------------------------------------- | ------- | ---------- |
| next                             | Framework                                          | 15.x    | MIT        |
| react, react-dom                 | UI library                                         | 19.x    | MIT        |
| typescript                       | Type system                                        | 5.x     | Apache-2.0 |
| drizzle-orm                      | ORM                                                | 0.35+   | Apache-2.0 |
| drizzle-kit                      | Migrations                                         | 0.25+   | Apache-2.0 |
| @neondatabase/serverless         | Neon Postgres driver                               | Latest  | Apache-2.0 |
| @clerk/nextjs                    | Auth                                               | Latest  | MIT        |
| ag-grid-react, ag-grid-community | Grid component                                     | 32.x    | MIT        |
| @tanstack/react-query            | Server state                                       | 5.x     | MIT        |
| zod                              | Validation                                         | 3.x     | MIT        |
| xlsx (SheetJS Community)         | Excel I/O                                          | 0.20+   | Apache-2.0 |
| tailwindcss                      | CSS                                                | 4.x     | MIT        |
| @sentry/nextjs                   | Error monitoring                                   | Latest  | MIT        |
| stripe                           | Billing SDK                                        | Latest  | MIT        |
| resend                           | Email                                              | Latest  | MIT        |
| clsx                             | Class names                                        | Latest  | MIT        |
| date-fns                         | Date utilities                                     | 3.x     | MIT        |
| bcryptjs                         | Password hashing for platform admin accounts       | 2.x     | MIT        |
| jose                             | JWT signing/verification for platform admin tokens | 5.x     | MIT        |

| Service | Purpose            | Tier            |
| ------- | ------------------ | --------------- |
| Vercel  | Hosting            | Pro ($20/mo)    |
| Neon    | Database           | Pro ($19/mo)    |
| Clerk   | Auth               | Pro ($25/mo)    |
| Stripe  | Billing            | Pay-per-use     |
| Sentry  | Monitoring         | Team ($26/mo)   |
| Resend  | Email              | Free tier → Pro |
| GitHub  | Source code, CI/CD | Team            |

---

## 11. Cross-Cutting Concerns

### 11.1 Error Taxonomy

All errors extend a base `AppError` class. API route handlers catch these and return structured JSON responses.

```
AppError (base)
  message: String — human-readable description
  code: String — machine-readable error code (e.g., "ERR_VALIDATION")
  statusCode: Number — HTTP status code
  details?: Record<String, Any> — additional context

├── ValidationError (400)
│   code: "ERR_VALIDATION"
│   details: { fields: List<{ field: String, message: String }> }
│   Examples:
│     - Missing required field: { field: "firstName", message: "First name is required" }
│     - Out of range: { field: "hours", message: "Hours must be between 0 and 744" }
│     - Invalid format: { field: "month", message: "Month must be in YYYY-MM format" }
│
├── AuthError (401)
│   code: "ERR_AUTH"
│   Examples:
│     - Missing session: "Not authenticated"
│     - Expired token: "Session expired, please sign in again"
│
├── ForbiddenError (403)
│   code: "ERR_FORBIDDEN"
│   Examples:
│     - Insufficient role: "Admin role required for this action"
│     - Wrong organization: "You don't have access to this organization"
│
├── NotFoundError (404)
│   code: "ERR_NOT_FOUND"
│   details: { resource: String, id: String }
│   Examples:
│     - "Person not found": { resource: "person", id: "uuid-here" }
│     - "Project not found": { resource: "project", id: "uuid-here" }
│     - "Import session expired": { resource: "importSession", id: "uuid-here" }
│
├── ConflictError (409)
│   code: "ERR_CONFLICT"
│   details: { conflictType: String }
│   Examples:
│     - Duplicate: { conflictType: "duplicate", field: "name", value: "Project Atlas" }
│     - Concurrent edit: { conflictType: "concurrent_edit", expectedVersion: "timestamp", actualVersion: "timestamp" }
│
├── PayloadTooLargeError (413)
│   code: "ERR_PAYLOAD_TOO_LARGE"
│   Examples:
│     - "Import file exceeds 10MB limit"
│
└── InternalError (500)
    code: "ERR_INTERNAL"
    Examples:
      - Database connection failure
      - Stripe API unreachable
      - Excel file generation failure
```

**Error response format (all API endpoints):**

```json
{
  "error": "ERR_VALIDATION",
  "message": "Invalid allocation data",
  "details": {
    "fields": [{ "field": "hours", "message": "Hours must be between 0 and 744" }]
  }
}
```

### 11.2 Environment & Configuration

| Variable                              | Required | Env          | Description                                                                              | Example                                                          |
| ------------------------------------- | -------- | ------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`                        | Yes      | All          | Neon PostgreSQL connection string                                                        | `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Yes      | All          | Clerk frontend key                                                                       | `pk_test_...`                                                    |
| `CLERK_SECRET_KEY`                    | Yes      | All          | Clerk backend key                                                                        | `sk_test_...`                                                    |
| `CLERK_WEBHOOK_SECRET`                | Yes      | All          | Clerk webhook signing secret                                                             | `whsec_...`                                                      |
| `STRIPE_SECRET_KEY`                   | Yes      | Prod/Staging | Stripe API key                                                                           | `sk_test_...`                                                    |
| `STRIPE_WEBHOOK_SECRET`               | Yes      | Prod/Staging | Stripe webhook signing secret                                                            | `whsec_...`                                                      |
| `STRIPE_PRICE_ID`                     | Yes      | Prod/Staging | Stripe price ID for subscription plan                                                    | `price_...`                                                      |
| `RESEND_API_KEY`                      | Yes      | Prod/Staging | Email sending API key                                                                    | `re_...`                                                         |
| `SENTRY_DSN`                          | Yes      | Prod/Staging | Sentry error tracking DSN                                                                | `https://xxx@sentry.io/xxx`                                      |
| `NEXT_PUBLIC_APP_URL`                 | Yes      | All          | Application base URL                                                                     | `https://app.nordiccapacity.com`                                 |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`       | Yes      | All          | Clerk sign-in page path                                                                  | `/sign-in`                                                       |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`       | Yes      | All          | Clerk sign-up page path                                                                  | `/sign-up`                                                       |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Yes      | All          | Redirect after sign-in                                                                   | `/input`                                                         |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Yes      | All          | Redirect after sign-up                                                                   | `/onboarding`                                                    |
| `IMPORT_MAX_FILE_SIZE_MB`             | No       | All          | Maximum import file size (default: 10)                                                   | `10`                                                             |
| `IMPORT_SESSION_TTL_HOURS`            | No       | All          | Import session expiry (default: 24)                                                      | `24`                                                             |
| `AUTOSAVE_DEBOUNCE_MS`                | No       | All          | Auto-save debounce interval (default: 300)                                               | `300`                                                            |
| `PLATFORM_ADMIN_SECRET`               | Yes      | All          | JWT signing key for platform admin tokens (min 64 chars, separate from any Clerk secret) | `a-very-long-random-secret-...`                                  |
| `PLATFORM_ADMIN_TOKEN_EXPIRY`         | No       | All          | Platform admin JWT expiry (default: "8h")                                                | `8h`                                                             |
| `IMPERSONATION_MAX_DURATION_MINUTES`  | No       | All          | Max impersonation session length (default: 60)                                           | `60`                                                             |

### 11.3 Naming Conventions

**Files:**

- TypeScript files: `kebab-case.ts` (e.g., `allocation.service.ts`, `date-utils.ts`)
- React components: `kebab-case.tsx` (e.g., `allocation-grid.tsx`, `person-header.tsx`)
- Component names inside files: `PascalCase` (e.g., `export function AllocationGrid()`)

**Functions:**

- `camelCase`, verb-first: `getPersonAllocations`, `createProject`, `validateMappedData`
- Boolean functions: `is`/`has` prefix: `isMonthHeader`, `hasPermission`
- Event handlers: `handle` prefix: `handleCellChange`, `handleImportClick`
- Hooks: `use` prefix: `useAllocations`, `useGridAutosave`

**Database tables and columns:**

- Tables: `snake_case`, plural: `organizations`, `people`, `allocations`, `projects`
- Columns: `snake_case`: `organization_id`, `first_name`, `target_hours_per_month`
- Foreign keys: `referenced_table_singular_id`: `person_id`, `project_id`, `discipline_id`
- Timestamps: `created_at`, `updated_at`, `archived_at`

**API routes:**

- `/api/v1/` prefix (omitted in Phase 1, added when public API launches in Phase 3)
- Plural nouns: `/api/allocations`, `/api/people`, `/api/projects`
- Actions as sub-resources: `/api/allocations/batch`, `/api/allocations/export`
- IDs as path params: `/api/people/[id]`

**Types and interfaces:**

- `PascalCase`, no `I` prefix: `Person`, `Allocation`, `ProjectWithDetails`
- Input types: `*Create`, `*Update`: `PersonCreate`, `ProjectUpdate`
- Response types: `*WithStatus`, `*WithDetails`: `PersonWithStatus`, `ProjectWithProgram`
- Enum-like: `type Role = "owner" | "admin" | "planner" | "viewer"`

**CSS / Tailwind:**

- Design token colors from prototype config (e.g., `text-primary`, `bg-surface-container-low`)
- Custom classes in globals: `kebab-case` (e.g., `.tabular-nums`, `.focus-cell`)
- No BEM, no CSS Modules — Tailwind utilities only

**Zod schemas:**

- Same file as type: `allocation.schema.ts` contains both `allocationCreateSchema` and type `AllocationCreate`
- Schema names: `camelCase` + `Schema` suffix: `allocationCreateSchema`, `personUpdateSchema`

### 11.4 Platform Admin Authentication (Separate from Tenant Auth)

Platform admin authentication is intentionally isolated from the Clerk-based tenant authentication system. This separation ensures that:

1. **No shared attack surface** — compromising Clerk does not grant platform admin access, and vice versa.
2. **No tenant role confusion** — platform admins are not "super users" in any tenant; they operate through a distinct auth flow.
3. **Independent credential management** — platform admin passwords are hashed with bcrypt in the `platform_admins` table, not managed by Clerk.

**Auth flow:**

```
Platform Admin Login:
  1. POST /api/platform/auth { email, password }
  2. Verify credentials against platform_admins table (bcrypt)
  3. Issue JWT signed with PLATFORM_ADMIN_SECRET (8-hour default expiry)
  4. All subsequent /api/platform/* requests include: Authorization: Bearer <jwt>
  5. requirePlatformAdmin middleware verifies token on every request
```

**Impersonation auth flow:**

```
During Impersonation:
  1. Platform admin starts impersonation → receives impersonation token
  2. Browser sends impersonation token via X-Impersonation-Token header on tenant API requests
  3. middleware.ts calls resolveImpersonation() → detects impersonation context
  4. getTenantId() returns impersonated user's org instead of platform admin's context
  5. requireRole() returns impersonated user's role in the org
  6. Every mutation logs to platform_audit_log with impersonation_session_id
  7. Impersonation sessions auto-expire after IMPERSONATION_MAX_DURATION_MINUTES
```

**Key security rules:**

- Platform admin JWTs use a different secret (`PLATFORM_ADMIN_SECRET`) than any Clerk key
- Impersonation tokens are separate from platform admin JWTs — they are short-lived (1 hour max) and scoped to a specific user+org
- All impersonation actions are logged to the platform audit log, including the original platform admin's identity
- Platform admin accounts can be deactivated instantly (is_active = false) which invalidates all tokens on next verification
- No platform admin endpoint is accessible with a Clerk token, and no tenant endpoint is accessible with a platform admin token (except during impersonation)

---

## 12. Extensibility Guide

### Adding a New Feature Module

To add a new feature (e.g., "Milestones" from the sidebar):

1. **Create the feature folder:**

   ```
   src/features/milestones/
   ├── milestone.service.ts
   ├── milestone.queries.ts
   ├── milestone.schema.ts
   └── milestone.types.ts
   ```

2. **Add the database table** in `src/db/schema.ts`:

   ```
   export const milestones = pgTable("milestones", {
     id: uuid("id").primaryKey().defaultRandom(),
     organizationId: uuid("organization_id").references(() => organizations.id),
     ...
   });
   ```

3. **Create API routes** in `src/api/milestones/route.ts` — follow existing pattern: extract tenant, validate input, call service, return response.

4. **Create UI components** in `src/components/milestones/` — no need to modify existing components.

5. **Add navigation** — add entry to `side-nav.tsx` items array (the sidebar is data-driven).

6. **Create page** in `src/app/(app)/milestones/page.tsx`.

No existing files need modification except `schema.ts` (database) and `side-nav.tsx` (navigation). This is by design — the feature structure is additive.

### Adding a New API Endpoint to an Existing Module

1. Add the route handler in the appropriate `src/api/` directory.
2. Add the business logic function in the corresponding `*.service.ts`.
3. Add the query function in the corresponding `*.queries.ts`.
4. Add Zod validation schema in `*.schema.ts`.
5. Cross-reference in this architecture doc.

### Adding a New Import Field

1. Add the system field to the `SYSTEM_FIELDS` constant in `import.mapper.ts`.
2. Add Swedish aliases to the `HEADER_ALIASES` dictionary.
3. Add validation logic in `import.validator.ts`.
4. Add mapping in `import.executor.ts` to write to the correct database column.

### Adding a New Discipline or Department

These are admin-configurable via the UI (CRUD operations on the reference data tables). No code change needed.

### Adding a New Platform Admin Capability

To add a new platform admin action (e.g., "Merge two tenant orgs"):

1. **Add the service function** in `src/features/platform-admin/platform-admin.service.ts`:
   - Follow the existing pattern: accept `platformAdminId` as first param
   - Always INSERT into platform_audit_log at the end of the function
   - Add proper Called by/Calls cross-references

2. **Add Zod schema** in `platform-admin.schema.ts` for input validation.

3. **Add API route** in `src/api/platform/` — call `requirePlatformAdmin(request)` first, then service function.

4. **Add UI page** in `src/app/(platform)/platform/` — the platform layout is separate from the tenant layout.

5. **Add checklist items** in Section 15 of this document.

No tenant-side code needs modification. The platform admin module is fully additive and isolated from tenant modules.

### Adding a New Feature Flag

1. Add the flag name to the `ALLOWED_FLAGS` constant in `platform-admin.service.ts`.
2. Use `getFeatureFlags(orgId)` in tenant middleware or service code to gate the feature:
   ```
   const flags = await platformAdminService.getFeatureFlags(orgId);
   if (!flags.get("my-new-feature")) throw new ForbiddenError("Feature not available");
   ```
3. Enable/disable per tenant via the platform admin UI or API.

### Adding Dark Mode

1. The Tailwind config already has `darkMode: "class"`.
2. All prototype colors have dark equivalents in the token system.
3. Add a theme toggle in the top nav (Settings button).
4. Store preference in localStorage + Clerk user metadata.
5. Apply `dark` class to `<html>` element.

---

## 13. Risk Register

| #   | Risk                                                                                                                          | Probability | Impact   | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | AG Grid Community lacks drag-to-fill, forcing custom implementation                                                           | High        | Medium   | Build custom drag-to-fill as a React overlay component. The core interaction is mousedown on corner handle → mousemove to extend selection → mouseup to fill. ~2-3 days of work. Prototype early in Phase 1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| R2  | Excel clipboard interop produces garbled data (tab-delimited vs. system clipboard)                                            | Medium      | High     | AG Grid Community supports text-based clipboard. Test with Excel 2019+, Google Sheets, LibreOffice. Handle both `\t` and `,` delimiters in paste handler.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| R3  | Neon serverless cold starts cause slow first query on grid load                                                               | Medium      | Medium   | Use Neon's connection pooling. Pre-warm with a health check ping on Vercel function warm-up. Cache person list in TanStack Query with staleTime of 5 minutes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| R4  | Import of 1,200+ row Excel files exceeds Vercel function timeout (60s on Pro)                                                 | Medium      | High     | Process imports in chunks. Parse file synchronously (fast), validate in batches of 200 rows, execute insert in batches of 100 within a transaction. Total should complete in <30s for 1,200 rows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| R5  | Concurrent editing by two planners on the same person's allocations                                                           | Medium      | Medium   | Optimistic locking via `updated_at` timestamp on each allocation row. On conflict, show toast "Another user modified this cell" and refetch. Phase 3 adds real-time conflict resolution via WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| R6  | Swedish character encoding (å, ä, ö) breaks import parsing                                                                    | Low         | High     | SheetJS handles Excel file encoding natively. For CSV imports, detect encoding (UTF-8, ISO-8859-1, Windows-1252) and convert. Test with real Swedish Excel files during import development.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| R7  | GDPR compliance — storing employee names requires data processing agreement                                                   | High        | High     | Build tenant-level data export (all data for an org as JSON/Excel) and data deletion (purge all org data) endpoints. Document in Terms of Service. EU data residency via Neon EU region.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| R8  | Clerk organization model doesn't map perfectly to tenant needs                                                                | Low         | Medium   | Clerk organizations support metadata, roles, and invitations which cover MVP needs. If limitations appear, sync Clerk org to internal `organizations` table and use internal table as source of truth.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| R9  | Grid performance degrades with 20+ project rows x 36 months                                                                   | Medium      | Medium   | AG Grid handles this volume well (it virtualizes rows and columns). Keep DOM rows to visible viewport. For Team Overview (500 rows), use TanStack Virtual for row virtualization.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| R10 | Stripe integration complexity for per-resource billing                                                                        | Low         | Low      | Start with flat-tier pricing (e.g., 3 tiers by resource count). Avoid per-resource metering in Phase 1. Report resource counts to Stripe metadata for future metering upgrade.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| R11 | Platform admin access is a security-critical attack surface — a compromised platform admin account can access all tenant data | High        | Critical | Mitigations: (1) Separate auth system with its own secret (PLATFORM_ADMIN_SECRET), not Clerk. (2) Bcrypt password hashing with high cost factor. (3) Short-lived JWTs (8h). (4) Impersonation sessions capped at 1 hour with mandatory audit trail. (5) Every platform admin action logged with IP, user agent, timestamp. (6) Ability to instantly deactivate admin accounts (is_active flag). (7) No shared credentials between platform admin and tenant auth. (8) Platform admin UI served on separate route group (/platform/\*) with its own layout, reducing XSS attack surface from tenant-uploaded content. (9) Consider adding MFA for platform admin login in Phase 2. |

---

## 14. Implementation Roadmap

### Phase 1A: Foundation (Weeks 1-3)

**Goal:** Core infrastructure is running — auth, database, basic UI shell.

**Modules:**

- Next.js project setup with Tailwind config from prototypes
- Drizzle schema: organizations, people, projects, programs, departments, disciplines, allocations
- Database migrations and seed data
- Clerk integration: sign-up, sign-in, organization creation, webhook handler
- App shell: top nav, side nav, routing structure
- Tenant context middleware (`getTenantId`, `requireRole`)
- Error taxonomy (`src/lib/errors.ts`)
- Health check endpoint

**Dependencies:** None (foundational)

**Definition of done:**

- [ ] User can sign up, create an organization, and see the app shell
- [ ] Database tables exist with correct indexes
- [ ] Clerk webhook creates internal organization record with default disciplines/departments
- [ ] All protected routes redirect to sign-in when unauthenticated
- [ ] Health check returns 200 with DB connection status

### Phase 1B: Person Input Form (Weeks 3-6)

**Goal:** The primary editing interface is functional — the core value proposition.

**Modules:**

- Person CRUD (service, queries, API routes)
- Allocation CRUD (service, queries, API routes, batch endpoint)
- AG Grid integration with column definitions
- Custom cell renderers (hours, status, summa, project dropdown)
- Auto-save on cell blur with debounce
- SUMMA row real-time calculation
- Status row with color-coded capacity indicators
- Person navigation (prev/next, sidebar list with status dots)
- Drag-to-fill custom implementation
- Keyboard navigation (Tab, Enter, Arrow keys, Escape)

**Dependencies:** Phase 1A

**Definition of done:**

- [ ] Planner can open a person, see their allocation grid populated from the database
- [ ] Editing a cell auto-saves to the database within 500ms of blur
- [ ] SUMMA row updates in real time as cells change
- [ ] Status row shows correct color (green/amber/red/gray) per month
- [ ] Prev/next arrows navigate between people
- [ ] Sidebar shows all people grouped by department with status dots
- [ ] Drag-to-fill works to replicate a value across months
- [ ] Tab, Enter, and arrow keys navigate between cells

### Phase 1C: Import & Export (Weeks 6-9)

**Goal:** Users can bulk-load data from Excel and export for analysis.

**Modules:**

- Import wizard: upload, mapping, validation, execution (all 4 steps)
- Import parser (Excel/CSV)
- Column mapper with Swedish header detection
- Import validator with error/warning categorization and name suggestions
- Import executor with transaction support
- Flat table view with sorting, filtering, pagination
- Excel/CSV export with filters applied
- Downloadable import templates

**Dependencies:** Phase 1B (needs people and projects in DB to validate against)

**Definition of done:**

- [ ] Admin can upload an Excel file with Swedish headers and see auto-mapped columns
- [ ] Validation step shows ready/warning/error counts with actionable suggestions
- [ ] Import creates/updates allocations in a single transaction
- [ ] Flat table shows all allocation data with sortable/filterable columns
- [ ] Export button downloads filtered data as .xlsx with correct columns
- [ ] Import templates are downloadable with headers and example data

### Phase 1D: Admin & Billing (Weeks 9-11)

**Goal:** Reference data is manageable, billing is connected.

**Modules:**

- Admin UI for reference data (disciplines, departments, programs, projects, people)
- Stripe integration: checkout session, webhook handler, subscription status
- User invitation flow (via Clerk organizations)
- Onboarding polish

**Dependencies:** Phase 1A-1C

**Definition of done:**

- [ ] Admin can add/edit/delete disciplines, departments, programs, projects
- [ ] Stripe checkout creates a subscription
- [ ] Subscription status is reflected in the UI (trial/active/past_due)
- [ ] Admin can invite users to the organization

### Phase 1E: Platform Administration (Weeks 11-14)

**Goal:** SaaS operator can administrate, support, and troubleshoot all tenant organizations before going live with paying customers.

**Modules:**

- Platform admin database tables (platform_admins, platform_audit_log, impersonation_sessions, feature_flags, system_announcements)
- Platform admin auth (email/password login, JWT with PLATFORM_ADMIN_SECRET, separate from Clerk)
- Platform admin service (listOrganizations, getOrgHealth, impersonateUser, suspendOrganization, reactivateOrganization, overrideSubscription, setFeatureFlags, getPlatformAuditLog)
- Platform admin API routes (`/api/platform/*` with requirePlatformAdmin middleware)
- Impersonation middleware (resolveImpersonation, logImpersonatedAction)
- Platform admin UI (dashboard, org list, org detail, impersonation flow, audit log, user management)
- Cross-tenant user management (password reset, force logout via Clerk SDK)
- System announcements (create, list, display in tenant app)

**Dependencies:** Phase 1A (database, auth infrastructure), Phase 1D (billing/subscription to override)

**Definition of done:**

- [ ] Seed script (`drizzle/seed.ts` or `scripts/create-platform-admin.ts`) creates the initial platform admin account using `createPlatformAdmin`. Must be run before first platform admin login.
- [ ] Platform admin can log in via separate auth flow (not Clerk)
- [ ] Platform admin dashboard shows all organizations with health metrics
- [ ] Platform admin can search and filter organizations by name, status, subscription
- [ ] Platform admin can view detailed health for a single org (user count, error rate, last import)
- [ ] Platform admin can impersonate any user in any org
- [ ] Impersonation shows a visible banner in the tenant UI
- [ ] Every action during impersonation is logged in the platform audit log
- [ ] Impersonation sessions expire after 1 hour max
- [ ] Platform admin can suspend and reactivate organizations
- [ ] Platform admin can extend trials and override subscription status
- [ ] Platform admin can set feature flags per org
- [ ] Platform admin can reset user passwords and force logout
- [ ] Platform admin can export all data for a tenant
- [ ] Platform audit log records every platform admin action with who/what/when/IP
- [ ] Platform admin can create and manage system announcements
- [ ] No tenant endpoint is accessible with a platform admin token (separation verified)
- [ ] No platform endpoint is accessible with a Clerk token (separation verified)

**Rationale for timing:** Platform admin capabilities are required before accepting paying customers. Without impersonation and tenant management, support becomes impossible at scale. This must ship before or concurrent with the first production launch.

### Phase 2A: Team & Project Views (Weeks 15-18)

**Goal:** Read-only views for scanning team capacity and project staffing.

**Modules:**

- Team Overview heat map (component, API endpoint)
- Heatmap cell renderer with color coding
- Filter bar (discipline, department pills)
- Project View with staffing grid and summary row
- Click-to-navigate from team view to person input form
- PDF export from Team Overview

**Dependencies:** Phase 1B

**Definition of done:**

- [ ] Team Overview shows all people grouped by department with color-coded month cells
- [ ] Filters narrow the view by discipline and department
- [ ] Clicking a person row navigates to their Input Form
- [ ] Project View shows all assigned people with hours and a monthly total row
- [ ] PDF export produces a readable document

### Phase 2B: Dashboard (Weeks 18-21)

**Goal:** Management-level capacity intelligence.

**Modules:**

- Dashboard service (KPIs, department heat map, alerts, discipline breakdown)
- KPI cards component (Total Resources, Avg Utilization, Overloaded, Unallocated)
- Department utilization heat map (table with colored cells)
- Capacity alert cards (critical/warning)
- Discipline utilization bars
- Notification system (bell icon + basic alerts)

**Dependencies:** Phase 2A (uses same aggregation queries)

**Definition of done:**

- [ ] Dashboard shows 4 KPI cards with correct values
- [ ] Department heat map shows utilization % per department per month with color coding
- [ ] At least 2 alert types fire: overloaded department and under-utilized team
- [ ] Discipline bars show utilization with available/assigned counts

### Phase 3: Scale & Stickiness (Weeks 22+)

**Goal:** Enterprise readiness and stickiness features.

**Modules:**

- Department-level scoping (line manager sees only their people)
- SSO / SAML via Clerk
- Audit trail (who changed what, when)
- Public API with API key management
- Multi-user conflict resolution (WebSocket-based)
- Integration hooks (Jira, HR systems)

**Dependencies:** Phase 2

**Can run in parallel with:** Phase 2B (independent concerns)

---

## 15. Build Verification Checklist

### Module: Allocation Service

- [ ] `getPersonAllocations(orgId, personId, startMonth, endMonth): Promise<List<Allocation>>` — implemented and matches spec
- [ ] `getPersonAllocations` returns only allocations within org (tenant isolation verified)
- [ ] `getPersonAllocations` returns empty list for person with no allocations
- [ ] `getPersonAllocations` handles error case: person not found → NotFoundError
- [ ] `getPersonAllocations` handles error case: invalid month format → ValidationError
- [ ] `getPersonAllocations` called by GET /api/allocations?view=person — integration verified
- [ ] `getTeamAllocations(orgId, filters): Promise<List<PersonMonthSummary>>` — implemented and matches spec
- [ ] `getTeamAllocations` filters by department and discipline correctly
- [ ] `getTeamAllocations` excludes archived people
- [ ] `getTeamAllocations` called by GET /api/allocations?view=team — integration verified
- [ ] `getProjectAllocations(orgId, projectId, startMonth, endMonth): Promise<ProjectAllocationView>` — implemented and matches spec
- [ ] `getProjectAllocations` includes monthly totals row
- [ ] `getProjectAllocations` handles error case: project not found → NotFoundError
- [ ] `getProjectAllocations` called by GET /api/allocations?view=project — integration verified
- [ ] `upsertAllocation(orgId, data): Promise<Allocation>` — implemented and matches spec
- [ ] `upsertAllocation` creates new record when none exists
- [ ] `upsertAllocation` updates existing record when person/project/month match
- [ ] `upsertAllocation` deletes record when hours = 0
- [ ] `upsertAllocation` handles error case: hours < 0 → ValidationError
- [ ] `upsertAllocation` handles error case: hours > 744 → ValidationError
- [ ] `upsertAllocation` handles error case: person not found → NotFoundError
- [ ] `upsertAllocation` handles error case: project not found → NotFoundError
- [ ] `upsertAllocation` handles error case: concurrent edit → ConflictError
- [ ] `upsertAllocation` called by POST /api/allocations — integration verified
- [ ] `upsertAllocation` called by useGridAutosave hook — integration verified
- [ ] `batchUpsertAllocations(orgId, data): Promise<BatchResult>` — implemented and matches spec
- [ ] `batchUpsertAllocations` processes all valid records in a transaction
- [ ] `batchUpsertAllocations` returns partial results (valid committed, errors reported)
- [ ] `batchUpsertAllocations` called by POST /api/allocations/batch — integration verified
- [ ] `batchUpsertAllocations` called by importExecutor.execute — integration verified
- [ ] `getAllocationsFlat(orgId, filters): Promise<PaginatedResult<FlatAllocation>>` — implemented and matches spec
- [ ] `getAllocationsFlat` supports all filter params (person, discipline, department, project, program, month range)
- [ ] `getAllocationsFlat` supports sorting by any column
- [ ] `getAllocationsFlat` supports pagination
- [ ] `getAllocationsFlat` called by GET /api/allocations?view=flat — integration verified
- [ ] `deleteAllocation(orgId, allocationId): Promise<Void>` — implemented and matches spec
- [ ] `deleteAllocation` handles error case: not found → NotFoundError

### Module: Person Service

- [ ] `listPeople(orgId, filters): Promise<List<PersonWithStatus>>` — implemented and matches spec
- [ ] `listPeople` includes currentMonthStatus for each person
- [ ] `listPeople` supports search by first+last name
- [ ] `listPeople` filters by department and discipline
- [ ] `listPeople` excludes archived people by default
- [ ] `listPeople` called by GET /api/people — integration verified
- [ ] `listPeople` called by PersonSidebar component — integration verified
- [ ] `getById(orgId, personId): Promise<Person>` — implemented and matches spec
- [ ] `getById` handles error case: not found → NotFoundError
- [ ] `getById` called by GET /api/people/[id] — integration verified
- [ ] `getById` called by upsertAllocation (validation) — integration verified
- [ ] `createPerson(orgId, data): Promise<Person>` — implemented and matches spec
- [ ] `createPerson` validates required fields
- [ ] `createPerson` validates targetHoursPerMonth range (1-744)
- [ ] `createPerson` handles error case: validation failure → ValidationError
- [ ] `createPerson` called by POST /api/people — integration verified
- [ ] `createPerson` called by importExecutor.execute — integration verified
- [ ] `updatePerson(orgId, personId, data): Promise<Person>` — implemented and matches spec
- [ ] `updatePerson` handles error case: not found → NotFoundError
- [ ] `updatePerson` called by PATCH /api/people/[id] — integration verified
- [ ] `deletePerson(orgId, personId): Promise<Void>` — implemented and matches spec
- [ ] `deletePerson` soft-deletes (sets archived_at, preserves allocations)
- [ ] `deletePerson` called by DELETE /api/people/[id] — integration verified
- [ ] `getAdjacentPerson(orgId, currentPersonId, direction, filters): Promise<Optional<Person>>` — implemented and matches spec
- [ ] `getAdjacentPerson` returns None at list boundaries
- [ ] `getAdjacentPerson` called by PersonHeader component — integration verified

### Module: Project Service

- [ ] `listProjects(orgId, filters): Promise<List<ProjectWithProgram>>` — implemented and matches spec
- [ ] `listProjects` includes program name
- [ ] `listProjects` filters by status and program
- [ ] `listProjects` called by GET /api/projects — integration verified
- [ ] `getById(orgId, projectId): Promise<ProjectWithDetails>` — implemented and matches spec
- [ ] `getById` includes total hours and people count
- [ ] `getById` called by GET /api/projects/[id] — integration verified
- [ ] `createProject(orgId, data): Promise<Project>` — implemented and matches spec
- [ ] `createProject` handles error case: duplicate name → ConflictError
- [ ] `createProject` called by POST /api/projects — integration verified
- [ ] `updateProject(orgId, projectId, data): Promise<Project>` — implemented and matches spec
- [ ] `updateProject` called by PATCH /api/projects/[id] — integration verified
- [ ] `deleteProject(orgId, projectId): Promise<Void>` — implemented and matches spec
- [ ] `deleteProject` archives (preserves allocations)
- [ ] `deleteProject` called by DELETE /api/projects/[id] — integration verified

### Module: Program Service

- [ ] `listPrograms(orgId): Promise<List<Program>>` — implemented and matches spec
- [ ] `createProgram(orgId, data): Promise<Program>` — implemented and matches spec
- [ ] `updateProgram(orgId, programId, data): Promise<Program>` — implemented and matches spec
- [ ] `deleteProgram(orgId, programId): Promise<Void>` — implemented and matches spec
- [ ] `deleteProgram` sets programId to null on child projects

### Module: Import Service

- [ ] `parseUploadedFile(orgId, file, fileName): Promise<ParseResult>` — implemented and matches spec
- [ ] `parseUploadedFile` handles .xlsx files
- [ ] `parseUploadedFile` handles .csv files
- [ ] `parseUploadedFile` detects flat vs pivot format
- [ ] `parseUploadedFile` returns suggested column mappings
- [ ] `parseUploadedFile` handles error case: file too large → ValidationError
- [ ] `parseUploadedFile` handles error case: corrupt file → ValidationError
- [ ] `parseUploadedFile` called by POST /api/import/upload — integration verified
- [ ] `validateMappedData(orgId, sessionId, mappings): Promise<ValidationResult>` — implemented and matches spec
- [ ] `validateMappedData` identifies unmatched person names
- [ ] `validateMappedData` provides "Did you mean?" suggestions for close matches
- [ ] `validateMappedData` detects duplicate allocations
- [ ] `validateMappedData` flags capacity warnings
- [ ] `validateMappedData` handles error case: session expired → NotFoundError
- [ ] `validateMappedData` handles error case: missing required mappings → ValidationError
- [ ] `validateMappedData` called by POST /api/import/validate — integration verified
- [ ] `executeImport(orgId, sessionId, options): Promise<ImportResult>` — implemented and matches spec
- [ ] `executeImport` writes data in a single transaction
- [ ] `executeImport` optionally creates missing people
- [ ] `executeImport` optionally creates missing projects
- [ ] `executeImport` rolls back on failure
- [ ] `executeImport` called by POST /api/import/execute — integration verified

### Module: Import Parser

- [ ] `parse(file, fileName): Promise<ParsedFile>` — implemented and matches spec
- [ ] `parse` handles .xlsx with SheetJS
- [ ] `parse` handles .csv with proper delimiter detection
- [ ] `detectFormat(headers, sampleRows): "flat" | "pivot"` — implemented and matches spec
- [ ] `unpivot(headers, rows, personColumn, startColumn): List<FlatRow>` — implemented and matches spec
- [ ] `unpivot` correctly handles Swedish month names as column headers

### Module: Import Mapper

- [ ] `suggestMappings(headers): List<ColumnMapping>` — implemented and matches spec
- [ ] `suggestMappings` correctly maps Swedish headers (Namn, Projekt, Timmar, Månad, Avdelning)
- [ ] `suggestMappings` correctly maps English headers

### Module: Import Validator

- [ ] `validate(orgId, rows, existingPeople, existingProjects): ValidationResult` — implemented and matches spec
- [ ] `validate` categorizes issues as errors vs warnings
- [ ] `findClosestMatch(input, candidates): Optional<String>` — implemented and matches spec
- [ ] `findClosestMatch` returns match when Levenshtein distance <= 2

### Module: Import Executor

- [ ] `execute(orgId, rows, options): Promise<ImportResult>` — implemented and matches spec
- [ ] `execute` uses database transaction
- [ ] `execute` reports created people and projects in result

### Module: Export Service

- [ ] `generateExcel(orgId, filters): Promise<Buffer>` — implemented and matches spec
- [ ] `generateExcel` includes correct column headers
- [ ] `generateExcel` applies filters before export
- [ ] `generateExcel` called by GET /api/allocations/export — integration verified
- [ ] `generateCsv(orgId, filters): Promise<String>` — implemented and matches spec
- [ ] `generateImportTemplate(type): Promise<Buffer>` — implemented and matches spec
- [ ] `generateImportTemplate` generates templates for "people", "projects", "allocations"

### Module: Dashboard Service (Phase 2)

- [ ] `getKpis(orgId): Promise<DashboardKpis>` — implemented and matches spec
- [ ] `getKpis` returns totalResources, avgUtilization, overloadedCount, unallocatedCount
- [ ] `getDepartmentHeatmap(orgId, startMonth, endMonth): Promise<List<DepartmentRow>>` — implemented and matches spec
- [ ] `getDepartmentHeatmap` returns utilization percentages per department per month
- [ ] `getCapacityAlerts(orgId): Promise<List<CapacityAlert>>` — implemented and matches spec
- [ ] `getCapacityAlerts` identifies departments with >95% utilization
- [ ] `getCapacityAlerts` identifies departments with <30% utilization
- [ ] `getDisciplineBreakdown(orgId): Promise<List<DisciplineMetric>>` — implemented and matches spec
- [ ] All dashboard functions called by GET /api/dashboard — integration verified

### Module: Organization Service

- [ ] `createOrganization(userId, data): Promise<Organization>` — implemented and matches spec
- [ ] `createOrganization` handles error case: duplicate slug → ConflictError
- [ ] `createOrganization` called by Clerk webhook handler — integration verified
- [ ] `seedDefaults(orgId): Promise<Void>` — implemented and matches spec
- [ ] `seedDefaults` creates 7 default disciplines (SW, Mek, Elnik, HW, Test, PT, Sys)
- [ ] `seedDefaults` creates default "General" department
- [ ] `seedDefaults` called by createOrganization — integration verified
- [ ] `checkTrialStatus(orgId): Promise<TrialStatus>` — implemented and matches spec
- [ ] `checkTrialStatus` returns trial_active for orgs within 14-day trial period
- [ ] `checkTrialStatus` returns trial_expired after 14 days and sets isReadOnly = true
- [ ] `checkTrialStatus` returns paid for active subscriptions
- [ ] `checkTrialStatus` called by tenant middleware — integration verified

### Module: Department Service

- [ ] `listDepartments(orgId): Promise<List<Department>>` — implemented and matches spec
- [ ] `listDepartments` called by GET /api/departments — integration verified
- [ ] `createDepartment(orgId, data): Promise<Department>` — implemented and matches spec
- [ ] `createDepartment` handles error case: duplicate name → ConflictError
- [ ] `createDepartment` called by POST /api/departments — integration verified
- [ ] `updateDepartment(orgId, departmentId, data): Promise<Department>` — implemented and matches spec
- [ ] `updateDepartment` handles error case: not found → NotFoundError
- [ ] `updateDepartment` called by PATCH /api/departments/[id] — integration verified
- [ ] `deleteDepartment(orgId, departmentId): Promise<Void>` — implemented and matches spec
- [ ] `deleteDepartment` handles error case: people still assigned → ConflictError
- [ ] `deleteDepartment` called by DELETE /api/departments/[id] — integration verified

### Module: Discipline Service

- [ ] `listDisciplines(orgId): Promise<List<Discipline>>` — implemented and matches spec
- [ ] `listDisciplines` called by GET /api/disciplines — integration verified
- [ ] `createDiscipline(orgId, data): Promise<Discipline>` — implemented and matches spec
- [ ] `createDiscipline` handles error case: duplicate abbreviation → ConflictError
- [ ] `createDiscipline` called by POST /api/disciplines — integration verified
- [ ] `updateDiscipline(orgId, disciplineId, data): Promise<Discipline>` — implemented and matches spec
- [ ] `updateDiscipline` handles error case: not found → NotFoundError
- [ ] `updateDiscipline` called by PATCH /api/disciplines/[id] — integration verified
- [ ] `deleteDiscipline(orgId, disciplineId): Promise<Void>` — implemented and matches spec
- [ ] `deleteDiscipline` handles error case: people still assigned → ConflictError
- [ ] `deleteDiscipline` called by DELETE /api/disciplines/[id] — integration verified

### API: Departments & Disciplines

- [ ] `GET /api/departments` — returns list of departments
- [ ] `POST /api/departments` — creates department, returns 201
- [ ] `PATCH /api/departments/[id]` — updates department
- [ ] `DELETE /api/departments/[id]` — deletes department, returns 409 if people assigned
- [ ] `GET /api/disciplines` — returns list of disciplines
- [ ] `POST /api/disciplines` — creates discipline, returns 201
- [ ] `PATCH /api/disciplines/[id]` — updates discipline
- [ ] `DELETE /api/disciplines/[id]` — deletes discipline, returns 409 if people assigned
- [ ] All department/discipline endpoints enforce tenant isolation
- [ ] Write endpoints enforce admin+ role

### Module: Billing Service

- [ ] `createCheckoutSession(orgId, planId): Promise<String>` — implemented and matches spec
- [ ] `handleWebhook(event): Promise<Void>` — implemented and matches spec
- [ ] `handleWebhook` handles checkout.session.completed
- [ ] `handleWebhook` handles customer.subscription.updated
- [ ] `handleWebhook` handles customer.subscription.deleted
- [ ] `handleWebhook` called by POST /api/webhooks/stripe — integration verified

### Module: Capacity Utilities

- [ ] `calculateStatus(totalHours, targetHours): String` — implemented and matches spec
- [ ] `calculateStatus` returns "empty" when totalHours = 0
- [ ] `calculateStatus` returns "healthy" when utilization < 85%
- [ ] `calculateStatus` returns "warning" when utilization 85-99%
- [ ] `calculateStatus` returns "overloaded" when utilization >= 100%
- [ ] `calculateUtilization(totalHours, targetHours): Number` — implemented and matches spec
- [ ] `calculateUtilization` returns 0 when targetHours is 0
- [ ] `getStatusColor(status): { bg, text }` — implemented and matches spec
- [ ] `getStatusColor` returns correct Tailwind classes for each status

### Module: Date Utilities

- [ ] `generateMonthRange(startMonth, count): List<String>` — implemented and matches spec
- [ ] `getCurrentMonth(): String` — implemented and matches spec
- [ ] `isMonthHeader(value): Boolean` — implemented and matches spec
- [ ] `parseSwedishMonth(value): Optional<String>` — implemented and matches spec
- [ ] `parseSwedishMonth` handles all 12 Swedish month names

### Module: Tenant Context

- [ ] `getTenantId(request): Promise<String>` — implemented and matches spec
- [ ] `getTenantId` handles error case: no session → AuthError
- [ ] `getTenantId` handles error case: no org membership → ForbiddenError
- [ ] `getTenantId` called by every API route handler — integration verified
- [ ] `requireRole(request, minimumRole): Promise<Context>` — implemented and matches spec
- [ ] `requireRole` handles error case: insufficient role → ForbiddenError

### Module: Auth Middleware

- [ ] `middleware(request): NextResponse` — implemented and matches spec
- [ ] Middleware protects all `/app/*` routes
- [ ] Middleware redirects unauthenticated users to `/sign-in`
- [ ] Middleware allows public access to `/`, `/sign-in`, `/sign-up`, `/api/webhooks/*`, `/api/health`
- [ ] Middleware detects impersonation token and injects impersonated user context
- [ ] Middleware protects `/platform/*` routes (requires platform admin auth, NOT Clerk)
- [ ] Middleware blocks Clerk tokens on `/api/platform/*` routes
- [ ] Middleware blocks platform admin tokens on `/api/*` tenant routes (except during impersonation)

### API: Allocations

- [ ] `GET /api/allocations` — returns correct response for view=person
- [ ] `GET /api/allocations` — returns correct response for view=team
- [ ] `GET /api/allocations` — returns correct response for view=project
- [ ] `GET /api/allocations` — returns correct response for view=flat
- [ ] `GET /api/allocations` — auth enforcement verified (viewer+)
- [ ] `GET /api/allocations` — error responses match contract
- [ ] `POST /api/allocations` — creates/updates allocation correctly
- [ ] `POST /api/allocations` — auth enforcement verified (planner+)
- [ ] `POST /api/allocations` — returns 409 on concurrent edit
- [ ] `POST /api/allocations/batch` — processes batch correctly
- [ ] `POST /api/allocations/batch` — auth enforcement verified (planner+)
- [ ] `DELETE /api/allocations/[id]` — deletes allocation
- [ ] `DELETE /api/allocations/[id]` — returns 404 for unknown ID
- [ ] `GET /api/allocations/export` — returns Excel file with correct Content-Type
- [ ] `GET /api/allocations/export?format=csv` — returns CSV file
- [ ] `GET /api/allocations/export?template=true&type=allocations` — returns template

### API: People

- [ ] `GET /api/people` — returns list with status
- [ ] `POST /api/people` — creates person, returns 201
- [ ] `GET /api/people/[id]` — returns person
- [ ] `PATCH /api/people/[id]` — updates person
- [ ] `DELETE /api/people/[id]` — soft-deletes person
- [ ] All people endpoints enforce tenant isolation
- [ ] Write endpoints enforce admin+ role

### API: Projects

- [ ] `GET /api/projects` — returns list with programs
- [ ] `POST /api/projects` — creates project, returns 201
- [ ] `GET /api/projects/[id]` — returns project with details
- [ ] `PATCH /api/projects/[id]` — updates project
- [ ] `DELETE /api/projects/[id]` — archives project
- [ ] All project endpoints enforce tenant isolation

### API: Import

- [ ] `POST /api/import/upload` — parses file and returns headers/mappings
- [ ] `POST /api/import/validate` — validates and returns ready/warning/error counts
- [ ] `POST /api/import/execute` — imports data and returns results
- [ ] Import endpoints enforce admin+ role
- [ ] Import handles Swedish headers correctly
- [ ] Import handles both flat and pivot formats

### API: Dashboard (Phase 2)

- [ ] `GET /api/dashboard` — returns all dashboard data
- [ ] Dashboard endpoint enforces viewer+ role

### API: Webhooks

- [ ] `POST /api/webhooks/clerk` — handles org and user lifecycle events
- [ ] `POST /api/webhooks/stripe` — handles subscription lifecycle events
- [ ] Webhook endpoints verify signatures

### Data Models

- [ ] `Organization` — schema matches spec (all fields, types, constraints)
- [ ] `Organization` — unique constraints on clerk_org_id and slug enforced
- [ ] `Person` — schema matches spec
- [ ] `Person` — soft-delete via archived_at works correctly
- [ ] `Person` — indexes created for org+department, org+discipline queries
- [ ] `Project` — schema matches spec
- [ ] `Project` — unique constraint on org+name enforced
- [ ] `Program` — schema matches spec
- [ ] `Department` — schema matches spec
- [ ] `Discipline` — schema matches spec with abbreviation field
- [ ] `Allocation` — schema matches spec
- [ ] `Allocation` — unique constraint on org+person+project+month enforced
- [ ] `Allocation` — indexes created for person queries, project queries, date range queries
- [ ] `ImportSession` — schema matches spec with JSONB fields
- [ ] All tables have organization_id for tenant isolation
- [ ] All foreign key relationships correctly enforced
- [ ] All auto-generated fields (id, created_at, updated_at) work

### Data Flows

- [ ] Edit Allocation Cell — happy path works end-to-end (click → type → blur → save → SUMMA update → status update)
- [ ] Edit Allocation Cell — error branch: concurrent edit shows toast and refetches
- [ ] Edit Allocation Cell — error branch: validation failure reverts cell value
- [ ] Bulk Import — happy path works end-to-end (upload → map → validate → import)
- [ ] Bulk Import — handles Swedish headers correctly in mapping step
- [ ] Bulk Import — shows "Did you mean?" suggestions for close name matches
- [ ] Bulk Import — import executes in transaction (all-or-nothing)
- [ ] Team Overview Load — data aggregates correctly by person and month (Phase 2)
- [ ] Export to Excel — filtered data exports as downloadable .xlsx file
- [ ] Person Navigation — prev/next arrows cycle through people correctly
- [ ] Person Navigation — boundary handling (first/last person)

### UI Components

- [ ] AllocationGrid — renders AG Grid with correct column definitions
- [ ] AllocationGrid — cells are editable with numeric input
- [ ] AllocationGrid — sticky left column for project names
- [ ] AllocationGrid — current month column is highlighted
- [ ] AllocationGrid — drag-to-fill handle appears on focused cell
- [ ] PersonSidebar — shows people grouped by department
- [ ] PersonSidebar — status dots show correct color per person
- [ ] PersonSidebar — search filters people by name
- [ ] PersonHeader — shows person name, discipline tag, department, target hours
- [ ] PersonHeader — prev/next navigation works
- [ ] TopNav — shows 5 tabs (Input, Team, Projects, Data, Dashboard)
- [ ] TopNav — active tab is highlighted with bottom border
- [ ] SideNav — shows contextual items (Resources, Allocations, Capacity, Milestones, Reports)
- [ ] ImportWizard — 4-step stepper shows progress correctly
- [ ] FlatTable — renders data with sortable columns
- [ ] FlatTable — filter bar filters by person, discipline, department, project, date range
- [ ] DisciplineTag — renders pill-shaped badge with correct abbreviation
- [ ] StatusDot — renders correct color for each status

### Module: Platform Admin Service

- [ ] `listOrganizations(filters): Promise<PaginatedResult<PlatformOrgSummary>>` — implemented and matches spec
- [ ] `listOrganizations` returns correct user counts and health metrics per org
- [ ] `listOrganizations` supports search, status filter, sorting, and pagination
- [ ] `listOrganizations` called by GET /api/platform/organizations — integration verified
- [ ] `getOrgHealth(orgId): Promise<OrgHealthDetail>` — implemented and matches spec
- [ ] `getOrgHealth` returns error rates, import status, and resource counts
- [ ] `getOrgHealth` handles error case: org not found → NotFoundError
- [ ] `getOrgHealth` called by GET /api/platform/organizations/[orgId] — integration verified
- [ ] `impersonateUser(platformAdminId, orgId, userId): Promise<ImpersonationSession>` — implemented and matches spec
- [ ] `impersonateUser` creates audit log entry with action "impersonation_started"
- [ ] `impersonateUser` creates impersonation session with 1-hour expiry
- [ ] `impersonateUser` handles error case: user not in org → NotFoundError
- [ ] `impersonateUser` called by POST /api/platform/organizations/[orgId]/impersonate — integration verified
- [ ] `endImpersonation(platformAdminId, sessionId): Promise<Void>` — implemented and matches spec
- [ ] `endImpersonation` sets ended_at on session
- [ ] `endImpersonation` logs action count during session
- [ ] `endImpersonation` called by POST /api/platform/impersonation/end — integration verified
- [ ] `suspendOrganization(platformAdminId, orgId, reason): Promise<Organization>` — implemented and matches spec
- [ ] `suspendOrganization` sets subscription_status to "suspended"
- [ ] `suspendOrganization` creates audit log entry
- [ ] `suspendOrganization` handles error case: already suspended → ConflictError
- [ ] `suspendOrganization` called by POST /api/platform/organizations/[orgId]/suspend — integration verified
- [ ] `reactivateOrganization(platformAdminId, orgId, reason): Promise<Organization>` — implemented and matches spec
- [ ] `reactivateOrganization` restores subscription_status to "active"
- [ ] `reactivateOrganization` creates audit log entry
- [ ] `reactivateOrganization` handles error case: not suspended → ConflictError
- [ ] `reactivateOrganization` called by POST /api/platform/organizations/[orgId]/reactivate — integration verified
- [ ] `deleteOrganization(platformAdminId, orgId, confirmation): Promise<Void>` — implemented and matches spec
- [ ] `deleteOrganization` requires confirmation matching org name
- [ ] `deleteOrganization` cascade deletes all tenant data
- [ ] `deleteOrganization` preserves audit log entry after org deletion
- [ ] `deleteOrganization` called by DELETE /api/platform/organizations/[orgId] — integration verified
- [ ] `overrideSubscription(platformAdminId, orgId, override): Promise<Organization>` — implemented and matches spec
- [ ] `overrideSubscription` supports extend_trial, apply_credit, change_plan, set_status actions
- [ ] `overrideSubscription` creates audit log entry with before/after values
- [ ] `overrideSubscription` called by PATCH /api/platform/organizations/[orgId]/subscription — integration verified
- [ ] `getSystemHealth(): Promise<SystemHealthMetrics>` — implemented and matches spec
- [ ] `getSystemHealth` returns error rates, import failure rates, and query performance
- [ ] `getSystemHealth` called by GET /api/platform/health — integration verified
- [ ] `setFeatureFlags(platformAdminId, orgId, flags): Promise<Map<String, Boolean>>` — implemented and matches spec
- [ ] `setFeatureFlags` validates flag names against allowed list
- [ ] `setFeatureFlags` creates audit log entry
- [ ] `setFeatureFlags` called by PUT /api/platform/organizations/[orgId]/feature-flags — integration verified
- [ ] `getFeatureFlags(orgId): Promise<Map<String, Boolean>>` — implemented and matches spec
- [ ] `getFeatureFlags` returns empty map for orgs with no flags
- [ ] `getFeatureFlags` called by tenant middleware for feature gating — integration verified
- [ ] `exportTenantData(platformAdminId, orgId): Promise<Buffer>` — implemented and matches spec
- [ ] `exportTenantData` includes all tenant entities (people, projects, allocations, programs, etc.)
- [ ] `exportTenantData` creates audit log entry
- [ ] `exportTenantData` called by GET /api/platform/organizations/[orgId]/export — integration verified
- [ ] `getPlatformAuditLog(filters): Promise<PaginatedResult<PlatformAuditEntry>>` — implemented and matches spec
- [ ] `getPlatformAuditLog` supports filtering by admin, org, action, and date range
- [ ] `getPlatformAuditLog` called by GET /api/platform/audit-log — integration verified
- [ ] `resetUserPassword(platformAdminId, orgId, userId): Promise<Void>` — implemented and matches spec
- [ ] `resetUserPassword` triggers Clerk password reset
- [ ] `resetUserPassword` creates audit log entry
- [ ] `forceLogoutUser(platformAdminId, orgId, userId): Promise<Void>` — implemented and matches spec
- [ ] `forceLogoutUser` revokes all Clerk sessions
- [ ] `forceLogoutUser` creates audit log entry
- [ ] `createAnnouncement(platformAdminId, data): Promise<SystemAnnouncement>` — implemented and matches spec
- [ ] `createAnnouncement` supports targeting all orgs or specific orgs
- [ ] `createAnnouncement` creates audit log entry
- [ ] `listAnnouncements(filters): Promise<List<SystemAnnouncement>>` — implemented and matches spec
- [ ] `listAnnouncements` filters active announcements correctly (starts_at <= now, expires_at > now or null)
- [ ] `updateOrganizationMetadata(platformAdminId, orgId, updates): Promise<Organization>` — implemented and matches spec
- [ ] `updateOrganizationMetadata` creates audit log entry with before/after values
- [ ] `updateOrganizationMetadata` called by PATCH /api/platform/organizations/[orgId] — integration verified
- [ ] `updateAnnouncement(platformAdminId, announcementId, updates): Promise<SystemAnnouncement>` — implemented and matches spec
- [ ] `updateAnnouncement` creates audit log entry
- [ ] `updateAnnouncement` called by PATCH /api/platform/announcements/[id] — integration verified
- [ ] `deleteAnnouncement(platformAdminId, announcementId): Promise<Void>` — implemented and matches spec
- [ ] `deleteAnnouncement` creates audit log entry
- [ ] `deleteAnnouncement` called by DELETE /api/platform/announcements/[id] — integration verified
- [ ] `listOrgUsers(platformAdminId, orgId): Promise<List<OrgUser>>` — implemented and matches spec
- [ ] `listOrgUsers` logs access in audit trail
- [ ] `listOrgUsers` called by GET /api/platform/organizations/[orgId]/users — integration verified
- [ ] `unlockAccount(platformAdminId, orgId, userId): Promise<Void>` — implemented and matches spec
- [ ] `unlockAccount` clears Clerk lockout state
- [ ] `unlockAccount` creates audit log entry
- [ ] `unlockAccount` called by POST /api/platform/organizations/[orgId]/users (action: "unlock_account") — integration verified

### Module: Platform Admin Auth

- [ ] `createPlatformAdmin(email, password, name): Promise<PlatformAdmin>` — implemented and matches spec
- [ ] `createPlatformAdmin` hashes password with bcrypt
- [ ] `createPlatformAdmin` handles error case: duplicate email → ConflictError
- [ ] `createPlatformAdmin` handles error case: password too short → ValidationError
- [ ] `authenticatePlatformAdmin(email, password): Promise<{ token, admin }>` — implemented and matches spec
- [ ] `authenticatePlatformAdmin` verifies bcrypt hash
- [ ] `authenticatePlatformAdmin` returns JWT signed with PLATFORM_ADMIN_SECRET
- [ ] `authenticatePlatformAdmin` handles error case: invalid credentials → AuthError
- [ ] `authenticatePlatformAdmin` logs login in audit log
- [ ] `verifyPlatformAdminToken(token): Promise<PlatformAdmin>` — implemented and matches spec
- [ ] `verifyPlatformAdminToken` rejects expired tokens
- [ ] `verifyPlatformAdminToken` rejects tokens for deactivated admins (is_active = false)
- [ ] `requirePlatformAdmin(request): Promise<PlatformAdmin>` — implemented and matches spec
- [ ] `requirePlatformAdmin` extracts Bearer token from Authorization header
- [ ] `requirePlatformAdmin` called by all /api/platform/\* route handlers — integration verified

### Module: Impersonation Middleware

- [ ] `resolveImpersonation(request): Promise<Optional<ImpersonationContext>>` — implemented and matches spec
- [ ] `resolveImpersonation` detects X-Impersonation-Token header
- [ ] `resolveImpersonation` validates impersonation session is active and not expired
- [ ] `resolveImpersonation` returns None when no impersonation token present
- [ ] `resolveImpersonation` handles error case: expired session → AuthError
- [ ] `logImpersonatedAction(sessionId, action, resource, resourceId, details): Promise<Void>` — implemented and matches spec
- [ ] `logImpersonatedAction` inserts audit log with impersonation_session_id
- [ ] `logImpersonatedAction` increments action_count on impersonation session
- [ ] `logImpersonatedAction` called by tenant API route handlers during impersonation — integration verified

### API: Platform Admin

- [ ] `POST /api/platform/auth` — authenticates platform admin, returns JWT
- [ ] `POST /api/platform/auth` — returns 401 for invalid credentials
- [ ] `GET /api/platform/organizations` — returns paginated org list with metrics
- [ ] `GET /api/platform/organizations` — auth enforcement verified (platform admin only)
- [ ] `POST /api/platform/organizations` — creates org manually
- [ ] `GET /api/platform/organizations/[orgId]` — returns org health detail
- [ ] `GET /api/platform/organizations/[orgId]` — returns 404 for unknown org
- [ ] `PATCH /api/platform/organizations/[orgId]` — updates org metadata
- [ ] `DELETE /api/platform/organizations/[orgId]` — deletes org with confirmation
- [ ] `DELETE /api/platform/organizations/[orgId]` — returns 400 if confirmation doesn't match
- [ ] `POST /api/platform/organizations/[orgId]/suspend` — suspends org
- [ ] `POST /api/platform/organizations/[orgId]/reactivate` — reactivates org
- [ ] `POST /api/platform/organizations/[orgId]/impersonate` — starts impersonation
- [ ] `PATCH /api/platform/organizations/[orgId]/subscription` — overrides subscription
- [ ] `GET /api/platform/organizations/[orgId]/feature-flags` — returns flags
- [ ] `PUT /api/platform/organizations/[orgId]/feature-flags` — sets flags
- [ ] `GET /api/platform/organizations/[orgId]/export` — returns JSON data archive
- [ ] `GET /api/platform/organizations/[orgId]/users` — lists users from Clerk
- [ ] `POST /api/platform/organizations/[orgId]/users` — reset password / force logout
- [ ] `GET /api/platform/health` — returns system health metrics
- [ ] `GET /api/platform/audit-log` — returns paginated audit entries
- [ ] `GET /api/platform/announcements` — returns announcements
- [ ] `POST /api/platform/announcements` — creates announcement
- [ ] `PATCH /api/platform/announcements/[id]` — updates announcement
- [ ] `DELETE /api/platform/announcements/[id]` — deletes announcement
- [ ] `POST /api/platform/impersonation/end` — ends impersonation session
- [ ] All /api/platform/\* endpoints reject Clerk tokens (separation enforced)
- [ ] All tenant /api/\* endpoints reject platform admin tokens (separation enforced)

### Data Models: Platform Admin

- [ ] `PlatformAdmin` — schema matches spec (email, password_hash, name, is_active)
- [ ] `PlatformAdmin` — unique constraint on email enforced
- [ ] `PlatformAuditLog` — schema matches spec (admin_id, action, target_org_id, details, etc.)
- [ ] `PlatformAuditLog` — indexes created for admin_id, target_org_id, action, impersonation_session_id
- [ ] `PlatformAuditLog` — entries preserved even after org deletion
- [ ] `ImpersonationSession` — schema matches spec (admin_id, target_org_id, target_user_id, expires_at)
- [ ] `ImpersonationSession` — auto-expires after IMPERSONATION_MAX_DURATION_MINUTES
- [ ] `ImpersonationSession` — action_count increments on each logged action
- [ ] `FeatureFlag` — schema matches spec (organization_id, flag_name, enabled)
- [ ] `FeatureFlag` — unique constraint on org+flag_name enforced
- [ ] `SystemAnnouncement` — schema matches spec (title, body, severity, target_org_ids, starts_at, expires_at)
- [ ] `Organization` — additional fields added (suspended_at, suspended_reason, trial_ends_at, credit_balance_cents, platform_notes)
- [ ] All platform tables do NOT include organization_id as tenant isolation (these are cross-tenant tables)

### Data Flows: Platform Admin

- [ ] Platform Admin Impersonates User — happy path works end-to-end (login → find org → impersonate → act as user → end impersonation)
- [ ] Platform Admin Impersonates User — impersonation banner visible in tenant UI
- [ ] Platform Admin Impersonates User — every action during impersonation logged in platform audit log
- [ ] Platform Admin Impersonates User — session auto-expires after 1 hour
- [ ] Platform Admin Resolves Tenant Issue — admin can view org health, impersonate user, diagnose issue
- [ ] Platform Admin Resolves Tenant Issue — notes added to org are persisted

### Module: Clipboard Handler

- [ ] `handlePaste(event, gridApi, orgId): Promise<Result<PasteResult, ValidationError>>` — implemented and matches spec
- [ ] `handlePaste` parses tab-delimited text from Excel clipboard
- [ ] `handlePaste` validates all values are numeric (0-744)
- [ ] `handlePaste` accepts comma as decimal separator (European format)
- [ ] `handlePaste` maps pasted cells to correct grid positions from focused cell
- [ ] `handlePaste` rejects paste that overlaps read-only rows (SUMMA, Target, Status)
- [ ] `handlePaste` called by AllocationGrid onPaste handler — integration verified

### Design System

- [ ] Tailwind config includes all 30+ color tokens from prototypes
- [ ] Manrope font used for headlines
- [ ] Inter font used for body/labels
- [ ] Tabular-nums applied to all numeric data
- [ ] Border radius matches spec (2px default, 6px for cards)
- [ ] Status colors match: green (healthy), amber (warning), red (overloaded), gray (empty)

---

_End of Architecture Blueprint_
