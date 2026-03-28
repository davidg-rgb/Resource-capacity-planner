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

---
