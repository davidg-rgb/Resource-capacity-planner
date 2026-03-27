# Nordic Capacity — Resource Capacity Planner

## What This Is

A multi-tenant SaaS web application that replaces Excel/Access-based resource planning for engineering organizations. Provides spreadsheet-familiar editing for capacity planning at monthly granularity across 12-18 month horizons.

**Target users:** Engineering orgs (20-500 managed resources) with multi-disciplinary teams (software, mechanical, electronics, test, systems, hardware) who have outgrown spreadsheets but don't need enterprise PPM tools.

**Core value proposition:** "The capacity planner for engineering teams that have outgrown Excel but don't need enterprise PPM." Zero-friction Excel import, engineering-native taxonomy, monthly planning density, spreadsheet-familiar editing.

## Why It Exists

Engineering organizations manage resource planning through spreadsheets that break down as teams grow:

- No real-time visibility into over/under-allocation
- Manual effort to detect conflicts and capacity issues
- Data locked in single-user files with no shared source of truth
- No visual feedback — planners mentally parse raw numbers
- No collaboration across line managers or departments

Competitors (Float, Runn, Resource Guru) are all agency/consulting-focused. The engineering operations model — "Do we have the right people with the right disciplines available over the next 12-18 months?" — is underserved.

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

### Active — Post-MVP (Milestone 2)

- [ ] Team Overview heat map (F-013)
- [ ] Project View staffing grid (F-014)
- [ ] Management Dashboard with KPIs (F-015)
- [ ] Capacity alerts (F-016)
- [ ] Discipline breakdown charts (F-017)
- [ ] PDF export from Team Overview (F-027)
- [ ] Onboarding wizard (F-028)
- [ ] System health monitoring (F-033)
- [ ] Feature flags per tenant (F-034)
- [ ] Tenant data operations (F-035)
- [ ] Announcements (F-038)

### Out of Scope

- Stripe billing integration — Not needed for MVP, defer to post-MVP
- SSO / SAML (F-023) — Enterprise feature, Phase 3
- Audit trail (F-024) — Phase 3
- Public API (F-025) — Phase 3
- Department-level scoping (F-022) — Phase 3
- Jira/HR system integrations — Phase 3
- Dark mode (A9) — Phase 2+
- Weekly granularity (A3) — Phase 3

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

---

_Last updated: 2026-03-27 — Phase 7 complete (Grid polish — keyboard nav, clipboard paste, drag-to-fill, conflict detection, person sidebar)_
