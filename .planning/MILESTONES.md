# Milestones

## v1.0 MVP (Shipped: 2026-03-27)

**Phases completed:** 10 phases, 26 plans, 49 tasks

**Key accomplishments:**

- Next.js 16.2.1 scaffold with TypeScript 5.9, Tailwind 4 Nordic Precision tokens, Zod 4 env validation for 20 vars, and GitHub Actions CI pipeline
- Complete Drizzle ORM schema with 13 pgTable definitions, 4 enums, neon-http driver, and Drizzle Kit migration tooling
- withTenant() query wrapper for row-level tenant isolation across 8 tables, /api/health DB check, and demo seed with 23 allocations across 5 people and 4 projects
- POST /api/organizations/invite with admin role guard using Clerk Backend API createOrganizationInvitation()
- Fuzzy name matching validation service, transactional bulk import, Zod schemas, and 4 API route handlers for the complete import server-side API
- AG Grid read-only flat table on /data page with filter bar, pagination, URL state sync, and Excel/CSV export dropdown
- Clerk Actor Token impersonation with session tracking, cross-tenant user management (search/reset/logout), and filtered audit log query API
- Cross-tenant user management page, audit log viewer with filters/pagination, working impersonation flow on tenant detail, and amber impersonation warning banner in tenant app via Clerk actor claim detection

## v2.0 Visibility & Insights (Shipped: 2026-03-28)

**Phases completed:** 7 phases (11-17), 14 plans, 38 requirements
**Code review:** 2 rounds, 25 issues found and fixed, 0 remaining

**Key accomplishments:**

- Feature flag system with typed FeatureFlags interface, cached DB queries, FlagProvider context, admin toggle UI, nav filtering, and route-level guards
- Team Overview heat map — person x month utilization grid with CTE-based analytics service, department grouping, filters, sticky column, color-coded cells
- Management Dashboard with Recharts 3.x — KPI cards with drill-down, department utilization bar chart, discipline breakdown chart, time range selector
- Capacity alerts — on-demand computation, overloaded/underutilized lists with TopNav badge, flag-gated
- Project View — project-centric staffing grid with summary row and understaffed indicators
- PDF export via @react-pdf/renderer — landscape A4, department grouping, color legend, header/footer
- Onboarding wizard — 4-step guided setup for new tenants with engineering department/discipline suggestions
- Announcement system — platform admin CRUD with severity-based dismissible banners, localStorage dismissal
- System health monitoring — DB latency, active connections, error rate, memory on platform dashboard
- Tenant data operations — JSON export and GDPR purge with transactional deletion and name confirmation

## v3.0 Switch from Excel (Shipped: 2026-03-30)

**Phases completed:** 4 phases (18-21), 4 plans (Phase 22 deferred as stretch)
**Requirements:** 15 (UX-01 through UX-15)

**Key accomplishments:**

- Role-based landing experience — Clerk `orgRole` routes to manager/PM dashboards, no more land-on-people-list
- Self-explanatory navigation labels with Swedish primary copy
- Heat map promoted as hero (1-click from sign-in) — was buried 2 clicks deep
- Import-to-value flow — wizard surfaces "see your team load" CTA immediately after import success

## v4.0 Dashboard Visualizations & Customization (Shipped: 2026-04-01)

**Phases completed:** 10 phases (23-32), 13 widget specs + custom dashboards + scenarios
**Code review:** 3 rounds

**Key accomplishments:**

- 13 widget specs (KPI cards, capacity gauges, availability finder, discipline charts, project impact, utilization heat map, bench report, strategic alerts, resource conflicts, capacity forecast, etc.)
- Custom dashboard layouts — drag-to-arrange, persisted per `clerk_user_id` × dashboard
- Scenario layer — what-if planning over current allocations
- Widget registry with manager/project-leader default layouts

## v5.0 Plan vs Actual + Approval Workflow (Shipped: 2026-04-13)

**Phases completed:** 15 phases (33-47), ~62 plans, 38 requirements + 1 launch gate
**Code review:** 3-round architecture review (iter 1: 6 blockers, iter 2: 5 bugs, iter 3: doc drift + final fixes)

**Key accomplishments:**

- ISO 8601 / 53-week calendar foundation with Swedish holidays 2026–2030 hardcoded; eslint guard prevents date-fns week-API imports outside `lib/time/iso-calendar.ts`
- Universal `change_log` infrastructure with eslint rule + codegen manifest + runtime invariant test (TC-CL-005)
- 5-persona role switcher (PM, Line Mgr, Staff, R&D Mgr, Admin) with localStorage persistence and persona-keyed routing
- Day-grain `actual_entries` with largest-remainder week/month → day distribution; plan-vs-actual cell reused across PM/LM/Staff/R&D timelines
- Excel import pipeline (SheetJS) with parse → preview → commit, idempotency, rollback within 24h, supersession
- PM-wish → Line-Manager-approval state machine with routing (re-route on department change), audit trail, resubmit-from-rejected
- Admin self-service CRUD with archive + `DEPENDENT_ROWS_EXIST` blocking
- AppError taxonomy across all `/api/v5/*` routes with documented error codes
- PDF export bug fix (html2canvas → html-to-image) — 9/9 widgets render correctly in exports
- Playwright E2E infrastructure with NODE_ENV=test Clerk bypass, nc_e2e database bootstrap, persona harness, 12 TC-E2E specs

## v6.0 UI Restructure & Journey Frictionless (Shipped: 2026-04-27)

**Phases completed:** 6 required phases (48-53), 22 plans, 39 active requirements + 6 net scope-expansion (45 implemented total)
**Code review:** Multiple post-ship fix batches — UI review batch (UI-MN-01..04), code-review fix batch (MN-01..04, NT-01..03, MJ-01..02, WR-03..05), structural validation sweep, live flag-OFF parity sweep on Vercel prod
**Post-ship close-out:** Test 3 closure 2026-05-10 — POLISH-03/04/05/06 prod migrations + R2-P1-10 hours CHECK constraint applied via Neon MCP to prod branch `br-gentle-poetry-alfgjqb1`; idempotence verified.

**Known deferred items at close:** 20 (see `.planning/STATE.md` Deferred Items — all are pre-existing accepted gaps from prior shipped milestones or v6.0 SOFT gates designed as `human_needed`; none blocked v6.0 ship). Phase 54 (3 QUAD-* requirements) deferred indefinitely — Phase 53 SOFT-gate viewport telemetry showed no quadrant-redesign signal.

**Key accomplishments:**

- Phase 48 pre-flight verification framework — grep/SQL-verified 9 assumptions before any code change; 3 failed checks triggered scope expansions (UNBREAK-08 DepartmentPicker, UNBREAK-09 PersonaGate rewire, LEAN-11 dashboard_layouts migration, LM-03 queue/count endpoint)
- 4 independent feature flags (`uiV6.landing` / `.leanTrim` / `.perJourney` / `.polish`) — each acts as a kill-switch with verified flag-off parity invariants
- Persona-aware landing redirect at `/` → `getLandingRoute(persona)` so users never land on the admin dashboard by default
- Persona-keyed sidebar with 18 new `sidebar.personaSections.*` i18n keys (sv + en parity); persona switcher refactored to grouped `<select>` with edge-case handling
- 308 redirects via `next.config.ts` for `/team`, `/projects`, `/wishes` — source pages deleted, query strings preserved for deep-links
- 7 dead widgets removed (`discipline-progress`, `discipline-demand`, `project-impact`, `utilization-heat-map`, `bench-report`, `strategic-alerts`, `resource-conflicts`) with one-shot SQL migrations stripping IDs from custom `dashboard_layouts.layout` JSONB
- Widget-registry defensive fallback — unknown IDs render "Widget ej tillgänglig" placeholder instead of throwing
- Per-journey click-count targets enforced via 11 Playwright journey specs (PM, LM, Staff, R&D, Admin) plus axe-core a11y assertions; flag-off parity invariant ships per wave
- Persona-scoped notification bell + `NavItemDef.visibleFor` top-nav filtering; `discipline-chart` + `discipline-distribution` merged into single widget with chart-type toggle; `strategic-alerts` replaced with inline banner
- 1440×900 viewport SOFT gate — diagnostic JSON artifacts captured in CI rather than `expect()` calls so Phase 54 redesign can be triggered by data; UAT Test 1 (2026-04-24) confirmed within threshold

---
