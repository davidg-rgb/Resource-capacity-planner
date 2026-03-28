# Domain Pitfalls: v2.0 Visibility & Insights

**Domain:** Adding dashboards, heat maps, charts, PDF export, alerts, onboarding, feature flags, health monitoring, and announcements to an existing Next.js 16 + Neon Postgres + AG Grid resource planning SaaS.
**Researched:** 2026-03-28
**Focus:** Integration-specific pitfalls when retrofitting these features onto existing v1.0 codebase.

---

## Critical Pitfalls

Mistakes that cause rewrites, performance regressions, or architectural damage to the working v1.0.

### Pitfall 1: Dashboard Aggregation Queries Killing Neon Cold-Start Performance

**What goes wrong:** Dashboard pages issue 4-6 aggregation queries (SUM, GROUP BY, COUNT) that each join allocations + people + projects + departments. On Neon, the first hit after idle wakes the compute (500ms-2s cold start), then each aggregation scans the full allocations table for the org. For a 200-person org with 18 months of data (~50K allocation rows), this means multiple sequential full-table scans on a serverless connection that's already 50-100ms slower than direct Postgres.

**Why it happens:** The existing `allocation.service.ts` already does 4-way JOINs for the flat table view. Developers copy this pattern for dashboards without realizing that dashboards aggregate across ALL people/projects simultaneously, not paginated subsets. The flat table uses `LIMIT/OFFSET`; dashboards need full scans.

**Consequences:** Dashboard loads in 3-8 seconds. Users see spinners. Neon auto-suspends between visits, so every dashboard visit is a cold start. The app feels slow despite the input grid being snappy.

**Prevention:**
1. Create a dedicated `dashboard.service.ts` with a SINGLE query that computes all KPIs in one round-trip using CTEs (Common Table Expressions). One query, one cold-start hit.
2. Use `sql` tagged template in Drizzle for the dashboard query rather than the query builder -- complex aggregations with CTEs are cleaner in raw SQL.
3. Add a composite index: `CREATE INDEX alloc_org_month_person_project ON allocations(organization_id, month, person_id, project_id) INCLUDE (hours)` -- covers dashboard aggregations without table lookups.
4. Cache dashboard results in TanStack Query with `staleTime: 60_000` (1 minute). Allocation data changes on cell blur, not real-time -- stale dashboards are acceptable.
5. Consider a materialized view or summary table if queries exceed 500ms at scale.

**Detection:** Monitor query times with `pg_stat_statements`. Any dashboard query over 200ms on warm Neon is a red flag.

**Phase impact:** Must be addressed in the FIRST dashboard phase. Retrofitting query optimization later means rewriting all dashboard services.

### Pitfall 2: PDF Generation Exceeding Vercel Serverless Limits

**What goes wrong:** Developers reach for Puppeteer/Playwright for pixel-perfect PDF export of heat maps. Puppeteer bundles headless Chromium (~130MB unzipped), blowing past Vercel's 50MB function size limit. Even `@sparticuz/chromium-min` adds ~45MB. The 60-second Pro plan execution timeout becomes tight for rendering a complex heat map with 200 rows x 18 columns.

**Why it happens:** The Team Overview heat map is a visual, styled component. Developers want the PDF to match the screen exactly, so they default to "screenshot the page" approaches. The existing export in `allocation.service.ts` uses SheetJS for Excel (lightweight, data-only) -- PDF with visual fidelity is a fundamentally different problem.

**Consequences:** Build fails on Vercel. Or: PDF route works locally but times out in production. Or: Team resorts to `@sparticuz/chromium-min` which works but makes the function cold-start 5-10 seconds.

**Prevention:**
1. Use client-side PDF generation with `jsPDF` + `html2canvas`. The heat map is already rendered in the browser -- capture it there. Zero server cost.
2. If server-side is required: use `@react-pdf/renderer` to build the PDF from data (not screenshots). Reconstruct the heat map layout in react-pdf's primitives. Lightweight, no browser dependency.
3. NEVER add Puppeteer as a dependency. If pixel-perfect server-side PDF is truly needed later, use an external service (e.g., Browserless API) rather than bundling Chromium.
4. Set the PDF export button to generate client-side by default, with a `loading` state and progress indicator since `html2canvas` can take 1-3 seconds for large tables.

**Detection:** `pnpm build` will fail if bundle exceeds 50MB. Check serverless function sizes in Vercel dashboard.

**Phase impact:** Decide client-side vs. server-side PDF in architecture phase. Do NOT defer this decision.

### Pitfall 3: Heat Map Rendering Colliding with AG Grid on Same Page

**What goes wrong:** The Team Overview heat map shows persons as rows, months as columns, cells colored by utilization. Developers build this as a second AG Grid instance (since AG Grid is already in the project) or as a canvas-based chart. When both the input grid and the heat map/dashboard are in the app, AG Grid's CSS and event handlers leak between instances, or the combined DOM weight causes jank.

**Why it happens:** AG Grid Community (v35) is designed for data editing. Heat maps need read-only colored cells with hover tooltips and click-to-navigate. Using AG Grid for both means fighting its editing infrastructure. Alternatively, mixing AG Grid with a separate charting library (Recharts, Nivo) on the same page doubles the JavaScript payload.

**Consequences:** Input form performance regresses because AG Grid is now loaded on dashboard pages too. Or: Custom cell renderers for heat map colors conflict with input form cell renderers. Or: Bundle size bloats from 200KB to 500KB+ with a charting library on top of AG Grid.

**Prevention:**
1. Build the heat map as a pure HTML table with Tailwind classes. Persons x months is a simple grid -- no library needed. Use `<td>` with dynamic `bg-*` classes or inline `style={{ backgroundColor }}`. This is 0KB additional bundle.
2. Use AG Charts (from the AG Grid team, MIT licensed, ~80KB) ONLY if you need proper charts (bar, line, pie for the Management Dashboard KPIs). It shares design language with AG Grid and avoids style conflicts.
3. Keep AG Grid instances to a MAXIMUM of one per page. The Person Input Form uses AG Grid. Dashboards should NOT.
4. Lazy-load chart components with `next/dynamic` to avoid loading chart JS on input form pages.

**Detection:** Run `next build` and check route-level bundle sizes. Any dashboard route over 300KB JS is suspicious.

**Phase impact:** Architecture decision needed before building any visualization. Wrong choice here means rewriting all dashboard components.

### Pitfall 4: Feature Flags Creating Untestable Code Paths

**What goes wrong:** Feature flags are added as `if (flagEnabled('heat-map')) { ... }` scattered throughout components and API routes. The flag check queries the database on every render. With 11 new features in v2.0, that's potentially 11 flags creating 2^11 = 2048 possible code path combinations. Testing becomes impossible.

**Why it happens:** The existing `featureFlags` table (already in schema) stores per-org flags. Developers add flag checks inline wherever a new feature touches the UI. No caching strategy means each flag check is a DB round-trip. No centralized flag evaluation means flags leak into every layer.

**Consequences:** Every page load fires 3-5 flag queries. Flags are checked in components (client), API routes (server), and services (server) inconsistently. Removing a flag after GA requires finding every `if` statement. Cross-tenant bugs appear when one org has a flag enabled and another doesn't, and the code path difference isn't tested.

**Prevention:**
1. Load ALL flags for the org ONCE per request in middleware or a React Server Component layout. Store in a `flags` object passed via context.
2. Create a typed `FeatureFlags` interface: `{ heatMap: boolean; pdfExport: boolean; ... }`. No string-based flag names in component code.
3. Use flags at the ROUTE level, not the component level. Either the entire `/dashboard` route is available or it isn't. Don't conditionally render sub-components based on flags.
4. Limit v2.0 to 3-4 flags maximum: `dashboards`, `pdfExport`, `alerts`, `onboarding`. Group related features under one flag.
5. Cache flags in TanStack Query with `staleTime: 300_000` (5 minutes). Flag changes are admin actions, not real-time.

**Detection:** Search codebase for flag check calls. If more than 10 callsites exist for a single flag, the flag is too granular.

**Phase impact:** Feature flag architecture must be built in the first phase, before any flagged feature ships.

---

## Moderate Pitfalls

Mistakes that cause significant rework or user experience problems.

### Pitfall 5: Dashboard Data Shape Mismatch Between Server and Client

**What goes wrong:** The server returns raw aggregation data (e.g., `{ personId, month, totalHours, targetHours }`), and the client transforms it into the shape needed by each chart. Different dashboard widgets need different transformations of the same underlying data. Each widget re-fetches and re-transforms, causing waterfalls.

**Why it happens:** The existing pattern in `use-allocations.ts` fetches person-specific data for a single grid. Dashboard data is cross-person, cross-project. Developers copy the hook-per-component pattern without realizing dashboards need a shared data layer.

**Prevention:**
1. Create ONE `useDashboardData(orgId, dateRange)` hook that fetches a single pre-shaped payload from ONE API endpoint.
2. The server should return data already shaped for the dashboard: `{ heatMapRows, kpis, disciplineBreakdown, alertsList }`. Let the server do the heavy transformation -- it has direct DB access.
3. Use TanStack Query's `select` option to derive widget-specific views from the shared query without re-fetching.

**Phase impact:** Design the dashboard API contract before building any widgets.

### Pitfall 6: Capacity Alerts That Spam or Miss

**What goes wrong:** Alert logic checks `if (totalHours > targetHours) alert('over-allocated')` on every data load. This creates alert fatigue (every slight over-allocation triggers it) or misses real problems (checks only run when someone views the page, not continuously).

**Why it happens:** The existing `calculateStatus()` in `src/lib/capacity.ts` returns red/yellow/green for the input form pinned rows. Developers extend this to alerts without considering thresholds, persistence, or delivery timing.

**Consequences:** Users disable alerts because they fire constantly. Or: alerts only appear when the dashboard is open (polling-based), missing issues that happen between visits.

**Prevention:**
1. Alerts should be computed server-side and stored in a table, not computed client-side on page load.
2. Define clear thresholds with hysteresis: trigger at 110% utilization, clear at 95%. Not "over 100% = alert".
3. For v2.0, alerts should be VISIBLE ON DASHBOARD only (not email/push). This avoids needing background jobs or cron. The alert list is a query result, not a notification system.
4. Batch alert computation: run alert evaluation when allocations are saved (in `batchUpsertAllocations`), not on every page view. Store alert state in a new `capacity_alerts` table.
5. Add a "dismissed" flag per alert per user so one user dismissing doesn't affect others.

**Phase impact:** Alert architecture should be designed with dashboards but can ship one phase later.

### Pitfall 7: Onboarding Wizard That Breaks for Existing Users

**What goes wrong:** An onboarding wizard is added that triggers on first login. But the app already has users who have been using v1.0 for months. The wizard shows them "Welcome! Let's set up your first project" when they already have 50 projects. Or worse: it blocks access to the app until completed.

**Why it happens:** Onboarding is designed for new signups without considering the existing user base. No migration strategy for marking existing users as "onboarded."

**Consequences:** Existing users are annoyed by irrelevant onboarding. Power users feel patronized. If the wizard is skippable, new users skip it and miss critical setup steps.

**Prevention:**
1. Add an `onboardingCompletedAt` timestamp to the organization (not user) level. Run a migration that sets this to `NOW()` for all existing orgs.
2. Make onboarding contextual, not modal. Instead of a blocking wizard, show inline hints ("You haven't added any people yet -- here's how") that disappear once the action is taken.
3. If a wizard is required for new orgs: check if the org has any people/projects. If yes, mark onboarding as complete automatically.
4. Implement as a checklist (visible but non-blocking) rather than a step-by-step wizard. Users can complete steps in any order.

**Phase impact:** Must handle migration for existing users in the same phase as onboarding. Cannot ship separately.

### Pitfall 8: Chart Library Bundle Bloat

**What goes wrong:** Adding Recharts (uses D3 under the hood, ~200KB gzipped) or Nivo (~300KB+ with dependencies) to a project that already ships AG Grid (~250KB) and SheetJS (~150KB). Total client JS exceeds 1MB. Dashboard pages load slowly on mobile/low-bandwidth.

**Why it happens:** The Management Dashboard needs bar charts, pie charts, and line graphs. Developers npm-install the first popular charting library without checking bundle impact.

**Consequences:** Lighthouse performance score drops. First Contentful Paint exceeds 3 seconds. Users on slower connections see blank dashboards for 5+ seconds.

**Prevention:**
1. First choice: AG Charts Community (MIT, ~80KB gzipped). Already compatible with AG Grid's design language. Covers bar, line, pie, donut. One vendor, consistent look.
2. If AG Charts doesn't fit: use `lightweight-charts` by TradingView (~40KB) for time-series, or hand-roll simple charts with SVG + Tailwind for KPI cards.
3. NEVER import a charting library in a layout or root component. Use `next/dynamic(() => import(...), { ssr: false })` for every chart component.
4. Set a bundle budget: no dashboard route should exceed 400KB JS (gzipped). Check with `next build` output.
5. Tree-shake aggressively. Import `import { BarChart } from 'ag-charts-community'` not `import * as AgCharts`.

**Detection:** `pnpm build` output shows per-route bundle sizes. Also check with `@next/bundle-analyzer`.

### Pitfall 9: System Health Monitoring Exposing Internal State

**What goes wrong:** The health endpoint (`/api/health`) already exists. Developers extend it with detailed diagnostics: database connection pool stats, query latencies, memory usage, error rates, Neon connection state. This information is served without authentication, exposing infrastructure details to anyone.

**Why it happens:** Health checks are usually public (for uptime monitors like Better Uptime, Vercel's own checks). Developers add detailed metrics to the same endpoint.

**Prevention:**
1. Keep `/api/health` as a simple `{ status: "ok", timestamp }` -- public, no auth, for uptime monitors.
2. Create `/api/platform/health` (behind platform admin JWT auth) for detailed diagnostics: DB latency, connection pool, active tenants, error rates.
3. Never expose: connection strings, query plans, stack traces, Neon endpoint IDs, or tenant counts in unauthenticated endpoints.
4. For Sentry integration (already in stack): use Sentry's built-in performance monitoring rather than building custom metrics collection. Don't reinvent observability.

**Phase impact:** Low risk, straightforward. Can ship with any phase.

### Pitfall 10: Announcement System Without Dismissal Tracking

**What goes wrong:** System announcements (from `systemAnnouncements` table) are shown as banners. There's no record of which users have seen or dismissed them. Banners reappear on every page load. Users can't make them go away.

**Why it happens:** The schema has `startsAt` and `expiresAt` but no per-user dismissal tracking. Developers show all active announcements to all users.

**Prevention:**
1. Add an `announcement_dismissals` table: `(announcement_id, user_id, dismissed_at)`. Or use `localStorage` for non-critical announcements (simpler, no migration, but clears on browser change).
2. For v2.0, use `localStorage` dismissals (keyed by announcement ID). Only add a DB table if analytics on dismissal rates is needed.
3. Show maximum 1 announcement banner at a time. Queue multiple announcements, showing the highest severity first.
4. Critical announcements should NOT be dismissible (e.g., scheduled maintenance). Info announcements should be.

---

## Minor Pitfalls

### Pitfall 11: Heat Map Color Scale That Hides Nuance

**What goes wrong:** Using a binary red/green color scheme where >100% = red and <100% = green. This hides the difference between 50% utilized (needs more work) and 95% utilized (almost full). Color-blind users can't distinguish red from green.

**Prevention:**
1. Use a diverging color scale: blue (under-allocated) -> white/neutral (on-target) -> amber/red (over-allocated). Matches the Nordic Precision design system's muted palette.
2. Use the existing status calculation logic from `calculateStatus()` but expand to 5 levels: critically-under (<50%), under (50-80%), on-target (80-110%), over (110-130%), critically-over (>130%).
3. Add number labels in heat map cells (not just color). Accessibility requires that color is never the only indicator.
4. Test with a colorblindness simulator before shipping.

### Pitfall 12: Date Range Picker State Not Synced Across Dashboard Widgets

**What goes wrong:** Each dashboard widget has its own date range state. User changes the date range on the KPI cards but the heat map still shows the old range. Or: navigating away and back resets the date range to defaults.

**Prevention:**
1. Store the dashboard date range in URL search params (`?from=2026-01&to=2027-06`). This makes it shareable, bookmarkable, and survives navigation.
2. Use a single `useDashboardFilters()` hook that reads from URL params and passes to all widgets.
3. Default range: current month to +12 months (matching the existing input form's horizon).

### Pitfall 13: Tenant Data Operations Without Confirmation or Undo

**What goes wrong:** Platform admin triggers "reset tenant data" or "export tenant data" and it happens immediately. Accidental clicks destroy production data. Or: bulk operations on allocations table take >60 seconds and timeout on Vercel.

**Prevention:**
1. Require explicit confirmation with org name typed in (like GitHub's repo delete).
2. For destructive operations: soft-delete first (set `archivedAt`), hard-delete after 30 days. The schema already uses `archivedAt` on people and projects.
3. For long-running operations: return a 202 Accepted with a job ID. Poll for completion. Or: use Vercel's `waitUntil()` for background processing within the same request.

### Pitfall 14: AG Grid Version Mismatch Between Input Form and New Components

**What goes wrong:** Installing AG Charts or updating AG Grid for dashboard features creates version conflicts. AG Grid v35 + AG Charts v10 may have incompatible type definitions or peer dependency warnings.

**Prevention:**
1. Pin AG Grid and AG Charts to the same major version series. Check compatibility matrix in AG Grid docs.
2. Update both in the same PR. Never update one without the other.
3. The current `ag-grid-community: ^35.2.0` uses caret range -- pin to exact version (`35.2.0`) before adding AG Charts.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Heat Map (F-013) | Pitfall 3 (AG Grid collision), Pitfall 1 (query perf), Pitfall 11 (color scale) | Build as HTML table, single CTE query, diverging palette | Critical |
| Project Staffing Grid (F-014) | Pitfall 5 (data shape mismatch) | Share dashboard data hook with heat map | Moderate |
| Management Dashboard (F-015) | Pitfall 1 (Neon aggregation), Pitfall 8 (bundle bloat), Pitfall 12 (date sync) | CTE query, AG Charts, URL-based date range | Critical |
| Capacity Alerts (F-016) | Pitfall 6 (alert spam) | Threshold hysteresis, dashboard-only display | Moderate |
| Discipline Charts (F-017) | Pitfall 8 (bundle bloat) | AG Charts or SVG, lazy load | Moderate |
| PDF Export (F-027) | Pitfall 2 (Vercel limits) | Client-side jsPDF + html2canvas | Critical |
| Onboarding (F-028) | Pitfall 7 (existing users) | Migration + contextual hints | Moderate |
| Health Monitoring (F-033) | Pitfall 9 (info exposure) | Authenticated platform endpoint | Low |
| Feature Flags (F-034) | Pitfall 4 (untestable paths) | Route-level flags, typed interface, load once | Critical |
| Tenant Data Ops (F-035) | Pitfall 13 (no undo) | Soft-delete, typed confirmation | Moderate |
| Announcements (F-038) | Pitfall 10 (no dismissal) | localStorage dismissals | Low |

## Integration-Specific Pitfalls Matrix

These pitfalls only appear when features interact with each other or the existing v1.0 system.

| Feature A | Feature B | Integration Pitfall |
|-----------|-----------|-------------------|
| Heat Map | Person Input Form | Navigating from heat map cell to person input form must preserve context (which person, which month). If not designed, users click a red cell and land on a generic person page with no month context. **Fix:** Link heat map cells to `/input/[personId]?highlight=2026-04`. |
| Feature Flags | Dashboards | If dashboards are behind a flag but the nav link isn't, users see a broken route. **Fix:** Feature flags must control both nav visibility AND route access. |
| PDF Export | Heat Map | PDF captures the current viewport. If the heat map is scrollable (>12 months), the PDF only captures visible months. **Fix:** Render a full-width hidden div for PDF capture, or generate from data not DOM. |
| Alerts | Dashboard | Alert badges in nav (`3 alerts`) require a lightweight query separate from the full dashboard. If alerts use the same heavy dashboard query, the nav bar becomes slow. **Fix:** Dedicated `GET /api/alerts/count` endpoint returning just the count. |
| Onboarding | Feature Flags | New features gated by flags shouldn't appear in onboarding for orgs where the flag is off. **Fix:** Onboarding steps must check flag state. |
| Announcements | Impersonation | Platform admin impersonating a tenant sees tenant announcements AND platform announcements. Banner stacking makes the app unusable. **Fix:** During impersonation, suppress tenant announcements, show only impersonation banner. |

## Neon-Specific Performance Warnings

| Query Pattern | Risk | Mitigation |
|---------------|------|------------|
| Multiple sequential aggregation queries | Cold start multiplied by query count | Combine into single CTE-based query |
| `COUNT(*)` on allocations table without org filter | Full table scan across ALL tenants | Always include `WHERE organization_id = $1` (already enforced by tenant middleware, but verify for dashboard queries) |
| JOINing 4+ tables for dashboard | Query planner may choose suboptimal plan on Neon | Use `EXPLAIN ANALYZE` on Neon console, add covering indexes |
| Polling for alerts (setInterval) | Keeps Neon compute awake, prevents scale-to-zero cost savings | Use stale-while-revalidate pattern, not polling. Compute on page visit only. |
| Dashboard + Input Form open in two tabs | Two connections consuming pool slots, both doing heavy queries | Neon serverless driver handles this with HTTP-based queries (no persistent connections), but watch pool limits on Pro plan |

## Sources

- [Vercel Serverless Function Size Limits](https://vercel.com/kb/guide/troubleshooting-function-250mb-limit)
- [Neon Performance Tips](https://neon.com/blog/performance-tips-for-neon-postgres)
- [Neon Benchmarking Latency](https://neon.com/docs/guides/benchmarking-latency)
- [Next.js PDF Generation Discussion](https://github.com/vercel/next.js/discussions/61243)
- [Flagsmith: Feature Flag Pitfalls](https://www.flagsmith.com/blog/pitfalls-of-feature-flags)
- [Userpilot: Onboarding Wizard Pitfalls](https://userpilot.com/blog/onboarding-wizard/)
- [AG Charts Documentation](https://www.ag-grid.com/charts/)
- [LogRocket: React Chart Libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [Neon Serverless Driver Latency Discussion](https://ishan.page/blog/dbms-neon/)
