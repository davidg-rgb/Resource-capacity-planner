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

### v5.0 — Plan vs Actual + Approval Workflow (shipped 2026-04-13)

- ✓ ISO 8601 / 53-week calendar foundation with Swedish holidays 2026–2030 (FOUND-V5-01/02) — v5.0
- ✓ Persona context + role switcher (PM, Line Mgr, Staff, R&D Mgr, Admin) with localStorage persistence (FOUND-V5-03) — v5.0
- ✓ Universal change_log with eslint + codegen + runtime invariant (FOUND-V5-04) — v5.0
- ✓ Day-grain `actual_entries` with largest-remainder distribution; plan-vs-actual cell (ACT-01..05) — v5.0
- ✓ Excel import pipeline — parse → preview → commit, idempotency, rollback within 24h, supersession (IMP-01..07, WIZ-01) — v5.0
- ✓ PM-wish → Line-Manager-approval state machine with re-routing and audit trail (PROP-01..08) — v5.0
- ✓ 14-screen persona inventory across PM/LM/Staff/R&D/Admin (UX-V5-01..12, HIST-01) — v5.0
- ✓ Admin register CRUD with archive + DEPENDENT_ROWS_EXIST blocking (ADM-01..04) — v5.0
- ✓ AppError taxonomy across all `/api/v5/*` routes with documented error codes (API-V5-01/02, TEST-V5-01/02) — v5.0
- ✓ PDF export captures every widget type — html2canvas → html-to-image swap (LAUNCH-01) — v5.0
- ✓ Playwright E2E infrastructure with NODE_ENV=test bypass, persona harness, 12 TC-E2E specs — v5.0

### v6.0 — UI Restructure & Journey Frictionless (shipped 2026-04-27)

- ✓ Pre-flight verification framework — grep/SQL-verified 9 assumptions before code (VERIFY-01..09) — v6.0
- ✓ Persona-aware landing redirect at `/` → `getLandingRoute(persona)` (NAV-01) — v6.0
- ✓ Persona-keyed sidebar with 18 new `sidebar.personaSections.*` i18n keys (NAV-02..05) — v6.0
- ✓ DepartmentPicker component (UNBREAK-08) — v6.0
- ✓ PersonaGate rewire with persona-kinds namespace fix (UNBREAK-06/09) — v6.0
- ✓ /admin and /admin/people 500s fixed via dev Neon migrations (UNBREAK-04/05) — v6.0
- ✓ 308 redirects for `/team`, `/projects`, `/wishes` with source pages deleted (LEAN-01..03) — v6.0
- ✓ 7 dead widgets removed with one-shot SQL migration stripping IDs from `dashboard_layouts.layout` (LEAN-05/11, POLISH-03..06) — v6.0
- ✓ Widget-registry defensive fallback for unknown IDs (LEAN-08) — v6.0
- ✓ Per-journey click-count targets enforced via 11 Playwright journey specs + axe-core a11y (PM-01..04, LM-01..03, STAFF-01, RD-01/02, ADMIN-01, SHARED-01) — v6.0
- ✓ Persona-scoped notification bell + `NavItemDef.visibleFor` top-nav filtering (POLISH-01/02) — v6.0
- ✓ Manager + project-leader dashboards fit 1440×900 viewport (POLISH-07 SOFT gate within threshold) — v6.0
- ✓ 4 independent feature flags (`uiV6.landing` / `.leanTrim` / `.perJourney` / `.polish`) with verified flag-off parity invariants (PJ-FLAG, POLISH-FLAG, LEAN-10) — v6.0

## Shipped

- **v1.0 MVP** (2026-03-27) — Core platform, auth, tenancy, grid, import, platform admin
- **v2.0 Visibility & Insights** (2026-03-28) — Heat map, dashboards, alerts, project view, PDF export
- **v3.0 Switch from Excel** (2026-03-30) — UX polish to make the app self-explanatory
- **v4.0 Dashboard Visualizations & Customization** (2026-04-01) — 13 widgets, custom dashboards, scenarios
- **v5.0 Plan vs Actual + Approval Workflow** (2026-04-13) — Day-grain actuals, PM/LM approval flow, 5-persona views, Excel pipeline, Playwright E2E
- **v6.0 UI Restructure & Journey Frictionless** (2026-04-27) — Persona-aware landing, duplicate surface removal, click-count targets, persona-scoped chrome, 4 feature-flag waves

See [MILESTONES.md](MILESTONES.md) for details.

## Current Milestone: Between milestones

**Status (2026-04-27):** v6.0 shipped and archived. No active milestone. Phase 54 (dashboard quadrant redesign) deferred indefinitely — Phase 53 SOFT-gate viewport telemetry showed no quadrant-redesign signal.

**Next planning step:** `/gsd-new-milestone` (or capture ideas first via `/gsd-add-backlog`).

### Carried-Forward Active Requirements (no milestone yet)

- [ ] Counter-proposal flow for LM approval (deferred from v5.0)
- [ ] Mobile-first responsive pass (deferred from v6.0)
- [ ] Email/Slack notification channel — currently in-app only
- [ ] Real role-based permissions replacing the persona "UX shortcut" (ADR-004)
- [ ] LEGACY_LAYOUTS code path cleanup once all tenants migrated off `uiV6.polish` flag-off path
- [ ] Three dev-env harness gaps from Phase 53 UAT (`/api/test/seed` no-tx under neon-http; `/api/v5/*/count` 404 in Turbopack dev; `requireRole()` bypasses Clerk session-level guards) — none affect production
- [ ] **Legacy register services audit-trail closure (HI-03)** — people/projects/programs/departments/disciplines services bypass `change_log` entirely; the v5 `register.service.ts` audits properly but legacy routes don't go through it. Recommended fix per ADR-003 single-canonical-writer: route `/api/{people,projects,programs,departments,disciplines}/*` through `register.service.ts`. Scope ≈ phase-sized (5 services × 3 mutations + 15 route plumbing changes). See `.planning/CODE-REVIEW-2026-05-10.md` HI-03.
- [ ] **`MUTATION_PREFIX_REGEX` expansion (MED-03)** — eslint guard misses `execute|promote|apply|cancel|stage` verbs, so future mutating exports under those prefixes silently skip the universal change_log invariant. Tracked alongside HI-03.
- [ ] **`withTenant()` coverage decision (MED-02)** — wrapper covers 8 of 16 tenant-scoped tables; remaining 8 use direct `db.select(...).where(eq(organizationId, orgId))`. Decision needed: extend `withTenant()` or remove it (current half-and-half is worst-of-both). See CODE-REVIEW MED-02.

### v6.0 Locked Decisions (still binding)

- **Feature-flag gating mandatory** for every restructure wave — independent kill-switches.
- **`next.config.redirects[]`** is the chosen mechanism for deleted-route redirects (308 permanent, preserves query strings).
- **i18n keys land under `sidebar.personaSections.*`** to avoid collision.
- **Widget-registry defensive fallback** — unknown widget IDs render placeholder, never throw.
- **SOFT gate over HARD gate** for viewport-fit diagnostics — emit JSON artifacts to CI rather than failing builds.

### v5.0 Locked Decisions (inherited, still binding)

- **ADR-004** Personas are UX shortcuts, not security boundaries.
- **Q5** Staff read-only "My Schedule" only.
- **Q6** Historic edits allowed with soft warning, no hard locks.
- **ISO 8601 + 53-week year** first-class. 2026 is a 53-week year. Swedish holidays 2026–2030 hardcoded.
- **Universal change_log** enforced via eslint + codegen + runtime test (TC-CL-005).

### Global Out of Scope (held)

- Stripe billing integration — 1-2 orgs initially, manual billing sufficient
- SSO / SAML (F-023) — Enterprise feature, no demand from current clients
- Audit trail (F-024) — Not requested by target users (change_log covers internal needs)
- Public API (F-025) — No integration demand yet
- Department-level scoping (F-022) — Adds complexity without clear client need
- Jira/HR system integrations — No client request
- Dark mode (A9) — No planning value
- Weekly granularity (A3) — Clients plan monthly, confirmed by phone notes
- Counter-proposal flow — deferred from v5.0; not in v6.0; revisit on client push

## Key Decisions

| Decision                            | Rationale                                                                               | Outcome           |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ----------------- |
| Neon over Supabase                  | Pure serverless Postgres, native Vercel integration, don't pay for unused auth/realtime | Neon ✓ Good       |
| AG Grid Community over Enterprise   | MIT licensed, covers core needs. Drag-to-fill implemented custom.                       | AG Grid Community ✓ Good |
| Clerk over Auth.js                  | Org management maps to tenants, invitation flows built-in, SSO available later          | Clerk ✓ Good      |
| Drizzle over Prisma                 | SQL-first, better complex aggregations, lighter weight                                  | Drizzle ✓ Good    |
| Modular monolith over microservices | Solo dev, shared domain model, no natural service boundary                              | Monolith ✓ Good   |
| No Stripe for MVP                   | Revenue integration deferred, focus on core product                                     | Deferred — Pending |
| Platform admin separate auth        | Own JWT + table, completely isolated from Clerk tenant auth                             | Separate ✓ Good   |
| ADR-004 personas as UX shortcuts (v5.0) | Solo dev, no real auth needed for early clients; persona = role switcher                | UX shortcut ✓ Good (validated through v6.0) |
| ISO 8601 + 53-week year (v5.0)      | 2026 is 53-week; native Date locale defaults broke; centralized in `lib/time/iso-calendar.ts` with eslint guard | Centralized utility ✓ Good |
| Universal change_log (v5.0)         | Audit trail via 3-mechanism enforcement (eslint + codegen + runtime invariant)          | 3-mechanism ✓ Good |
| Largest-remainder week→day distribution (v5.0) | Preserves sums to ±0.01h across grain boundaries                                | Largest-remainder ✓ Good |
| html-to-image over html2canvas (v5.0) | html2canvas left blank tiles for non-SVG widgets in PDF export                        | html-to-image ✓ Good |
| Feature-flag gating per wave (v6.0) | Independent kill-switches enable mid-rollout rollback without ripping out code          | 4-flag pattern ✓ Good |
| LEGACY_LAYOUTS + DEFAULT_LAYOUTS (v6.0) | Dual-layout pattern enables flag-off rollback during widget-registry restructuring   | Dual-layout ✓ Good (cleanup pending) |
| SOFT gate diagnostics (v6.0)        | JSON artifacts to CI > expect() calls when right action depends on telemetry, not correctness | SOFT gate ✓ Good |
| Pre-flight verification phase (v6.0) | Grep/SQL-verify assumptions before any code change to prevent scope-mid-execution      | Pre-flight phase ✓ Good (3 scope expansions caught) |

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

_Last updated: 2026-04-27 — v6.0 milestone shipped and archived. Between milestones._
