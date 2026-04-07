# Nordic Capacity — Resource Capacity Planner

## What This Is

A capacity planning tool deployed by a consulting business for engineering clients. Replaces Excel-based resource planning with a shared, visual system that shows team load at a glance and flags problems before they become project delays.

**Core promise:** See your team's load at a glance. Plan hours like Excel. Get alerted before problems happen.

**Deployment model:**
- **Operator:** Consulting business (manages tenants, onboards client organizations)
- **Tenants:** Engineering organizations (1-2 initially) running long-term projects with 20-200+ managed resources
- **End users:** Line managers and department heads who plan team capacity monthly over 12-24 month horizons

## Why It Exists

Line managers at engineering organizations plan resource allocation in shared Excel files. This works until it doesn't:

- **No big picture** — a manager has to mentally sum columns to know if someone is overbooked
- **No overload detection** — double-bookings go unnoticed until a project slips
- **Single-user lock** — one person edits at a time, everyone else waits
- **No shared visibility** — departments can't see each other's plans, conflicts across teams are invisible
- **Raw numbers, no visual feedback** — planners parse spreadsheets of hours without color coding or alerts

The tool gives these managers what Excel can't: a heat map that instantly shows who's overloaded, shared access for multiple planners, and automatic alerts when someone is overbooked.

## Target Users

**Line manager (linjechef):** Manages 10-30 engineers across multiple projects. Plans hours per person per project per month. Primary workflow: open heat map → spot issues → click person → edit their hours in the planning grid. Needs the grid to feel like Excel (drag, copy-paste, tab between cells).

**Department head (avdelningschef):** Oversees multiple teams. Needs the bird's-eye view: which departments are stretched, who's overloaded, are projects adequately staffed. Consumes dashboards, heat maps, and alerts — rarely edits hours directly.

**Project manager (projektledare):** Wants to know who's allocated to their project and whether they have enough hours. Views the project staffing grid. May flag understaffing to line managers.

## Core Value — The Switch-from-Excel Story

1. **Import your spreadsheet** — zero-friction on-ramp. The import wizard handles Swedish headers, column mapping, and validation. Existing data is live in minutes.
2. **See what Excel never showed you** — land on a heat map of your team's load. Red = overbooked. Green = available. This is the moment they can't go back to Excel.
3. **Plan like you always did** — the editing grid feels like a spreadsheet. Drag to copy, tab between cells, auto-save. No new paradigm to learn.
4. **Share visibility** — multiple planners, real-time, no file locking. Departments can see each other. Conflicts surface automatically.

## Who's Building It

Solo developer with AI agent team. No human team members. Architecture designed for solo development velocity.

## Architecture Source of Truth

**`ARCHITECTURE.md`** (4,544 lines, 15 sections) is the definitive build blueprint:

- 38 features with priority/phase mapping
- 23 modules with ~75 service functions (all with Called by/Calls cross-refs)
- 13 data models with full field definitions
- 35+ API endpoints with request/response contracts
- 7 data flow diagrams
- ~270 build verification checklist items
- Nordic Precision design system specification

**`resource-planner-scope.md`** is the original requirements document.

**`creative-direction/`** contains 9 Stitch screen HTML prototypes for UI reference.

## Tech Stack

| Layer      | Technology              | Purpose                                       |
| ---------- | ----------------------- | --------------------------------------------- |
| Framework  | Next.js 15 (App Router) | Full-stack React, Server Components           |
| Language   | TypeScript 5.x          | Type safety                                   |
| Database   | PostgreSQL 16 on Neon   | Serverless Postgres, scales to zero           |
| ORM        | Drizzle 0.35+           | SQL-first, type-safe queries                  |
| Auth       | Clerk                   | Authentication, organizations, invites, roles |
| Grid       | AG Grid Community 32.x  | Spreadsheet-grade editing                     |
| Styling    | Tailwind CSS 4.x        | Utility-first, matches prototypes             |
| State      | TanStack Query 5.x      | Server state, caching                         |
| Validation | Zod 3.x                 | Schema validation                             |
| Excel      | SheetJS 0.20+           | Import/export                                 |
| Monitoring | Sentry                  | Error tracking                                |
| Hosting    | Vercel Pro              | Frontend + serverless functions               |
| CI/CD      | GitHub Actions          | Automated testing, deployment                 |
| Fonts      | Manrope + Inter         | Design system typography                      |

## Core Architectural Principles

1. **"Flat table is truth"** — The allocation table (person/project/month) is canonical. The Person Input Form unpacks it into an editable grid, then writes changes back.
2. **Person ≠ User** — Persons are managed resources (may never log in). Users log in via Clerk.
3. **Row-level tenant isolation** — `organization_id` on every table, enforced at ORM middleware level.
4. **Modular monolith** — Single Next.js app with clear module boundaries (23 modules).
5. **Server-side processing** — Excel imports processed server-side for validation against DB.

## Design System: Nordic Precision

- **Typography:** Manrope (headlines, 600-700 weight) + Inter (body, 400-500 weight)
- **Primary color:** Muted blue `#496173`
- **Palette:** Material Design 3-derived, 30+ tokens (primary, surface, error, outline-variant, etc.)
- **Corner radius:** 2px (inputs), 6px (cards/containers)
- **Data presentation:** `tabular-nums` for number columns, tonal layering for depth

## Requirements

### Validated

- [x] Next.js 16 project setup with App Router, TypeScript, Tailwind CSS 4 (FOUND-03) — Phase 1
- [x] Environment configuration — all env vars documented and validated at startup (FOUND-09) — Phase 1
- [x] Multi-tenant organization with data isolation (F-001 / FOUND-01) — Phase 2
- [x] `withTenant()` ORM wrapper enforcing tenant isolation (FOUND-02) — Phase 2
- [x] Drizzle ORM schema — all 13 entities (FOUND-04) — Phase 2
- [x] Database migrations and seed data on Neon PG17 (FOUND-05) — Phase 2
- [x] Health check endpoint with DB status (FOUND-07) — Phase 2
- [x] Auth: sign-up, login, org creation, user invitation (F-002 / AUTH-01–AUTH-07) — Phase 3
- [x] Role-based access: Owner, Admin, Planner, Viewer (AUTH-08) — Phase 3
- [x] App shell with top nav + side nav routing (A7 / FOUND-08) — Phase 3
- [x] Error taxonomy — AppError hierarchy (FOUND-06) — Phase 3
- [x] Tenant context middleware — getTenantId(), requireRole() (AUTH-06) — Phase 3
- [x] Person CRUD — create, read, update, soft-delete (MGMT-01 / F-011) — Phase 4
- [x] Project CRUD — create, read, update, archive (MGMT-02 / F-012) — Phase 4
- [x] Admin UI for reference data: disciplines, departments, programs (MGMT-03/04/05 / F-010) — Phase 5

- [x] Person Input Form with AG Grid — months as columns, projects as rows, editable hours (INPUT-01/02 / F-003) — Phase 6
- [x] SUMMA + Target + Status rows with real-time calculation (INPUT-03/04/05 / F-005) — Phase 6
- [x] Auto-save on cell blur with debounced batch upsert (INPUT-13 / F-020) — Phase 6
- [x] Dynamic project rows — "Add project" at bottom (INPUT-08) — Phase 6
- [x] Past months read-only, current + future editable (INPUT-12) — Phase 6

- [x] Person sidebar with dept grouping + status dots, prev/next navigation (INPUT-06/07 / F-004) — Phase 7
- [x] Keyboard nav: Tab/Enter/Arrow/Escape (INPUT-10 / F-021) — Phase 7
- [x] Custom clipboard paste from Excel (INPUT-11 / F-021) — Phase 7
- [x] Custom drag-to-fill across months (INPUT-09 / F-021) — Phase 7
- [x] Conflict detection with overwrite/refresh prompt (INPUT-14 / F-020) — Phase 7

- [x] Bulk import 4-step wizard (F-006 / IMPEX-01) — Phase 8
- [x] Column mapping with Swedish/English auto-detection (F-007 / IMPEX-03) — Phase 8
- [x] Import validation with error/warning + suggestions (F-008 / IMPEX-04/05) — Phase 8
- [x] Pivot/grid format detection and unpivoting (F-026 / IMPEX-06) — Phase 8
- [x] Server-side Excel processing with SheetJS (ADR-007 / IMPEX-08) — Phase 8
- [x] Swedish encoding handling + merged cells (IMPEX-09/10) — Phase 8
- [x] Downloadable import templates (F-019 / IMPEX-13) — Phase 8

- [x] Flat table view with sorting, filtering, pagination (F-009 / IMPEX-11) — Phase 9
- [x] Excel/CSV export with current filters applied (F-009 / IMPEX-12) — Phase 9

- [x] Platform admin auth with separate JWT, isolated from Clerk (PLAT-01/10/11) — Phase 10
- [x] Platform admin dashboard with org metrics (F-029 / PLAT-02) — Phase 10
- [x] Tenant impersonation via Clerk Actor Tokens with banner (F-030 / PLAT-03/04/05) — Phase 10
- [x] Tenant management: create/suspend/reactivate/delete (F-031 / PLAT-06) — Phase 10
- [x] Manual subscription management (F-032 / PLAT-07) — Phase 10
- [x] Platform audit log (F-036 / PLAT-08) — Phase 10
- [x] Cross-tenant user management via Clerk SDK (F-037 / PLAT-09) — Phase 10

## Shipped

- **v1.0 MVP** (2026-03-27) — Core platform, auth, tenancy, grid, import, platform admin
- **v2.0 Visibility & Insights** (2026-03-28) — Heat map, dashboards, alerts, project view, PDF export
- **v3.0 Switch from Excel** (2026-03-30) — UX polish to make the app self-explanatory
- **v4.0 Dashboard Visualizations & Customization** (2026-04-01) — 13 widgets, custom dashboards, scenarios

See [MILESTONES.md](MILESTONES.md) for details.

## Current Milestone: v5.0 — Plan vs Actual + Approval Workflow

**Goal:** Transform Nordic Capacity from a "fancier Excel" into a workflow tool by introducing a plan-vs-actual layer (day-grain actuals), a PM→line-manager proposal/approval flow, and persona-scoped views. Strictly additive to the v4.0 schema.

**Target features:**
- Plan vs Actual layer — `actual_entries` (day grain), flexible input (day/week/month), comparison UI everywhere
- Excel import pipeline — SheetJS, idempotent on `(org,person,project,date)`, override checkbox, rollback + supersession
- Proposal/approval workflow — PM wishes → line mgr approval with state machine and audit trail
- Persona-scoped views — 5 personas (PM, Line Mgr, Staff, R&D Mgr, Admin), role switcher header, 14 screens
- Admin register maintenance — self-service CRUD with archive / dependent-row blocking
- ISO 8601 + 53-week year — first-class, Swedish holidays 2026–2030 hardcoded
- Universal change_log — eslint rule + codegen + runtime test enforcement
- Historic edit guardrails — soft warning before editing current-month
- Launch gate (separate): PDF export bug fix (html2canvas → html-to-image / modern-screenshot)

**Planning artifacts (frozen, do not re-review):**
- [.planning/v5.0-FEEDBACK.md](v5.0-FEEDBACK.md) — client raw notes + 6 resolved decisions (Q1–Q6)
- [.planning/v5.0-USER-JOURNEYS.md](v5.0-USER-JOURNEYS.md) — 5 personas, 11 journeys, 14-screen inventory
- [.planning/v5.0-ARCHITECTURE.md](v5.0-ARCHITECTURE.md) — 11 ADRs, 4 new tables, ~30 modules, ~280 testable assertions (§15), 7-stage roadmap (§14)
- [.planning/v5.0-HANDOFF.md](v5.0-HANDOFF.md) — cross-session handoff brief

### v5.0 Non-Goals (from USER-JOURNEYS.md)

- No real authentication — role switcher only (ADR-004)
- No task/activity sub-dimension under projects
- No multi-entry-per-day preservation (sum on import)
- No notifications outside the app (email, Slack)
- No staff actuals entry — read-only for staff
- No hard locks on historic edits
- No counter-proposal flow (deferred unless client pushes)
- No drag-reorder of projects/people (drag-to-copy hours IS in scope)
- No mobile-first design — desktop primary

### Global Out of Scope

- Stripe billing integration — 1-2 orgs initially, manual billing sufficient
- SSO / SAML (F-023) — Enterprise feature, no demand from current clients
- Audit trail (F-024) — Not requested by target users
- Public API (F-025) — No integration demand yet
- Department-level scoping (F-022) — Adds complexity without clear client need
- Jira/HR system integrations — No client request
- Dark mode (A9) — No planning value
- Weekly granularity (A3) — Clients plan monthly, confirmed by phone notes
- New features or capabilities — v3.0 is polish, not features

## Key Decisions

| Decision                            | Rationale                                                                               | Outcome           |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ----------------- |
| Neon over Supabase                  | Pure serverless Postgres, native Vercel integration, don't pay for unused auth/realtime | Neon              |
| AG Grid Community over Enterprise   | MIT licensed, covers core needs. Drag-to-fill implemented custom.                       | AG Grid Community |
| Clerk over Auth.js                  | Org management maps to tenants, invitation flows built-in, SSO available later          | Clerk             |
| Drizzle over Prisma                 | SQL-first, better complex aggregations, lighter weight                                  | Drizzle           |
| Modular monolith over microservices | Solo dev, shared domain model, no natural service boundary                              | Monolith          |
| No Stripe for MVP                   | Revenue integration deferred, focus on core product                                     | Deferred          |
| Platform admin separate auth        | Own JWT + table, completely isolated from Clerk tenant auth                             | Separate          |

## Repository

- **GitHub:** https://github.com/davidg-rgb/Resource-capacity-planner.git
- **Branch strategy:** main (production), feature branches per phase
- **Deployment:** Vercel (auto-deploy on merge to main)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-04-07 — v5.0 milestone started (Plan vs Actual + Approval Workflow)_
