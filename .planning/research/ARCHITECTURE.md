# Architecture Patterns: v2.0 Visibility & Insights

**Domain:** Resource capacity planner — dashboards, visualizations, alerts, PDF export, operational tooling
**Researched:** 2026-03-28

## Recommended Architecture

v2.0 adds **read-heavy visualization layers** on top of the existing allocation data model. The core principle: the allocation table remains the single source of truth. All new features are computed views over existing data — no new canonical data tables for dashboard content. New schema tables are only needed for operational concerns (alerts config, onboarding state, announcements display state).

### Architecture Diagram

```
                            +------------------+
                            |    App Shell     |
                            |  (top-nav +      |
                            |   side-nav)      |
                            +--------+---------+
                                     |
              +----------------------+----------------------+
              |                      |                      |
    +---------v---------+  +---------v---------+  +---------v---------+
    |  Dashboard Page   |  |  Team Overview    |  |  Project View     |
    |  (KPI cards +     |  |  (heat map grid)  |  |  (staffing grid)  |
    |   charts)         |  |                   |  |                   |
    +---------+---------+  +---------+---------+  +---------+---------+
              |                      |                      |
              +----------+-----------+----------+-----------+
                         |                      |
              +----------v----------+  +--------v---------+
              | analytics.service   |  | alerts.service   |
              | (aggregation SQL)   |  | (threshold eval) |
              +----------+----------+  +--------+---------+
                         |                      |
              +----------v----------------------v----------+
              |           Existing Data Layer               |
              |  allocations + people + projects +          |
              |  departments + disciplines + programs       |
              |  (all via withTenant())                     |
              +--------------------------------------------+

    Separate Concerns:
    +-----------------+  +------------------+  +-----------------+
    | PDF Export      |  | Feature Flags    |  | Announcements   |
    | (API route,     |  | (existing table, |  | (existing table,|
    |  @react-pdf)    |  |  new service)    |  |  new service)   |
    +-----------------+  +------------------+  +-----------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/features/analytics/` (NEW) | Aggregation queries for dashboards, heat maps, charts | allocations, people, projects, departments, disciplines |
| `src/features/alerts/` (NEW) | Alert rule evaluation, threshold config, notification state | analytics service, people, allocations |
| `src/features/onboarding/` (NEW) | Multi-step wizard state, completion tracking per user | organizations, people, projects, allocations (count checks) |
| `src/features/feature-flags/` (NEW) | CRUD for per-tenant flags, flag check utility | featureFlags table (already in schema) |
| `src/features/announcements/` (NEW) | CRUD + display logic for system announcements | systemAnnouncements table (already in schema), dismissal state |
| `src/features/health/` (NEW) | Extended health metrics beyond basic DB ping | db, Neon pool stats, Clerk API status |
| `src/components/charts/` (NEW) | Reusable Recharts wrappers (bar, line, pie, area) | analytics service data via TanStack Query |
| `src/components/heat-map/` (NEW) | Person x Month capacity heat map grid | analytics service data via TanStack Query |
| `src/components/dashboard/` (NEW) | KPI cards, stat tiles, dashboard layout | charts, analytics hooks |
| `src/components/pdf/` (NEW) | @react-pdf/renderer document templates | analytics data passed as props |
| `src/components/alerts/` (NEW) | Alert badge in TopNav, alert list, alert config UI | alerts service via TanStack Query |
| `src/components/onboarding/` (NEW) | Wizard steps, progress indicator, empty states | onboarding service |

### Data Flow

**Dashboard / Chart Data Flow:**
```
1. Page component mounts (Server Component renders shell)
2. Client component calls useAnalytics() hook (TanStack Query)
3. Hook fetches GET /api/analytics/dashboard?timeRange=...
4. API route calls getTenantId() -> analytics.service aggregation queries
5. Service runs SQL aggregations with withTenant() scoping
6. Response flows back through TanStack Query cache -> Recharts components
```

**Heat Map Data Flow:**
```
1. Team Overview page loads
2. useTeamHeatMap(monthRange) fetches /api/analytics/team-heatmap
3. Service query: SELECT person, month, SUM(hours), target
   FROM allocations JOIN people ... GROUP BY person, month
4. Returns matrix: [{personId, personName, dept, months: {YYYY-MM: {hours, target, status}}}]
5. Rendered as CSS grid with color-coded cells (reusing CapacityStatus logic)
```

**PDF Export Data Flow:**
```
1. User clicks "Export PDF" on Team Overview
2. Client POSTs to /api/analytics/team-heatmap/pdf with current filters
3. API route fetches same data as heat map display
4. Passes data to @react-pdf/renderer Document component
5. renderToStream() generates PDF buffer
6. Returns as application/pdf with Content-Disposition header
```

**Alert Evaluation Flow:**
```
1. Dashboard page load triggers /api/alerts/active
2. Also: TopNav Bell icon polls /api/alerts/count (lightweight)
3. Alert evaluation: ON DEMAND, not background job
   - When dashboard loads, service checks: for each person/month in range,
     does SUM(hours)/target exceed threshold?
   - Returns alert objects with person, month, severity, hours, target
4. Alert config (optional): stored in alerts_config table per tenant
   - Default thresholds: amber >= 90%, red > 100%, overload > 120%
```

## New Modules Breakdown

### 1. `src/features/analytics/` (NEW - Core)

The heaviest new module. All dashboard/chart/heat-map data comes from here.

**Files:**
```
analytics/
  analytics.service.ts    -- Aggregation query functions
  analytics.types.ts      -- Response types for all analytics endpoints
```

**Key service functions:**

| Function | Purpose | SQL Pattern |
|----------|---------|-------------|
| `getDashboardKPIs(orgId, monthRange)` | Total people, total hours, avg utilization, over-allocated count | COUNT + SUM + AVG over allocations+people |
| `getUtilizationByMonth(orgId, monthRange)` | Monthly utilization trend for line chart | SUM(hours) / SUM(target) GROUP BY month |
| `getTeamHeatMap(orgId, monthRange, filters?)` | Person x month matrix with status colors | allocations JOIN people GROUP BY person, month |
| `getProjectStaffing(orgId, projectId, monthRange)` | Person x month hours for one project | allocations WHERE projectId GROUP BY person, month |
| `getDisciplineBreakdown(orgId, month)` | Hours by discipline for pie/bar chart | allocations JOIN people JOIN disciplines GROUP BY discipline |
| `getDepartmentSummary(orgId, monthRange)` | Department-level aggregates | allocations JOIN people JOIN departments GROUP BY department, month |

**Critical:** All queries MUST include `WHERE organization_id = $orgId` (tenant isolation). Use the existing `buildFlatConditions` pattern from `allocation.service.ts` as reference.

**Performance note:** These aggregation queries hit the allocations table which already has indexes on `(org_id, person_id, month)`, `(org_id, project_id, month)`, and `(org_id, month)`. For orgs with 500 people x 18 months x 5 projects = 45,000 allocation rows, these GROUP BY queries are fast without materialized views. Revisit if orgs exceed 100K allocation rows.

### 2. `src/features/alerts/` (NEW)

**Files:**
```
alerts/
  alerts.service.ts      -- Alert evaluation logic
  alerts.types.ts        -- Alert types and severity levels
  alerts.schema.ts       -- Zod schemas for API validation
```

**Approach:** Alerts are computed on demand, not stored. No background jobs, no cron. When the dashboard loads, the analytics service evaluates thresholds and returns alert objects. This keeps the architecture simple (no job scheduler needed on Vercel serverless).

**Optional enhancement:** Store an `alert_configs` table for customizable thresholds per tenant. Default thresholds are hardcoded (reuse existing `calculateStatus` from `src/lib/capacity.ts` which already defines green/amber/red).

### 3. `src/features/onboarding/` (NEW)

**Files:**
```
onboarding/
  onboarding.service.ts   -- Completion check logic
  onboarding.types.ts     -- Step definitions
```

**Approach:** Stateless computation. Check existing data to determine onboarding progress:
- Step 1: Organization exists (always true if they're logged in)
- Step 2: At least 1 department + 1 discipline created
- Step 3: At least 1 person created
- Step 4: At least 1 project created
- Step 5: At least 1 allocation exists

No new DB table needed. Query counts from existing tables. Store "dismissed" state in `localStorage` on client side to avoid showing the wizard to users who have already completed or skipped it.

### 4. `src/features/feature-flags/` (NEW)

**Files:**
```
feature-flags/
  feature-flags.service.ts  -- CRUD + check functions
  feature-flags.types.ts    -- Flag name constants
```

**Schema already exists:** `featureFlags` table in `schema.ts` with `organizationId`, `flagName`, `enabled`, `setByAdminId`. Just needs the service layer.

**Key functions:**
- `getFlags(orgId)` -- all flags for tenant
- `isEnabled(orgId, flagName)` -- single flag check (used in API routes and pages)
- `setFlag(orgId, flagName, enabled, adminId)` -- platform admin toggle

**Client-side:** Fetch flags once on app load, cache in TanStack Query with long stale time. Provide `useFeatureFlag(name)` hook.

### 5. `src/features/announcements/` (NEW)

**Files:**
```
announcements/
  announcements.service.ts  -- Query active announcements, CRUD for admins
  announcements.types.ts    -- Announcement types
```

**Schema already exists:** `systemAnnouncements` table with `title`, `body`, `severity`, `targetOrgIds`, `startsAt`, `expiresAt`.

**Query pattern:** `WHERE startsAt <= NOW() AND (expiresAt IS NULL OR expiresAt > NOW()) AND (targetOrgIds IS NULL OR orgId = ANY(targetOrgIds))`.

**Dismissal:** Store dismissed announcement IDs in `localStorage` per user. No DB table for dismissals (keeps it simple; announcements are rare and temporary).

### 6. `src/features/health/` (NEW)

**Files:**
```
health/
  health.service.ts  -- Extended health checks
```

**Extends existing** `/api/health` endpoint. Add:
- DB connection pool stats (Neon provides these)
- Response time measurement (wrap the SELECT 1 in timing)
- Clerk API reachability (optional lightweight check)
- Memory/runtime info from `process.memoryUsage()`
- Version info from `package.json`

**Platform admin only.** The existing `/api/health` stays public for uptime monitors. New `/api/platform/health` returns extended metrics behind platform auth.

## Existing Code Extensions

### Files to Modify

| File | Change | Reason |
|------|--------|--------|
| `src/components/layout/top-nav.tsx` | Add alert badge to Bell icon, announcement banner below header | Alerts + Announcements integration |
| `src/components/layout/side-nav.tsx` | Add sub-nav items under Dashboard (Overview, Disciplines, Departments) | Dashboard sub-pages |
| `src/components/layout/app-shell.tsx` | Add announcement banner slot above main content | Announcements display |
| `src/app/(app)/dashboard/page.tsx` | Replace placeholder with KPI cards + charts | Dashboard implementation |
| `src/app/(app)/team/page.tsx` | Add heat map view toggle alongside people table | Team Overview heat map |
| `src/app/(app)/projects/page.tsx` | Add staffing grid view per project | Project View staffing |
| `src/lib/capacity.ts` | Export threshold constants, add `calculateUtilization()` helper | Shared by heat map + alerts |
| `src/app/onboarding/page.tsx` | Replace Clerk-only form with multi-step wizard | Onboarding wizard |
| `src/app/api/health/route.ts` | Keep simple, but add link to extended health | Health monitoring |
| `src/proxy.ts` | No changes needed (routes already covered) | -- |

### New API Routes

```
src/app/api/
  analytics/
    dashboard/route.ts           -- GET: KPI summary
    utilization/route.ts         -- GET: Monthly utilization trend
    team-heatmap/route.ts        -- GET: Person x month matrix
    team-heatmap/pdf/route.ts    -- POST: PDF export of heat map
    project-staffing/route.ts    -- GET: Project staffing grid
    discipline-breakdown/route.ts -- GET: Discipline pie/bar data
    department-summary/route.ts  -- GET: Department aggregates
  alerts/
    route.ts                     -- GET: Active alerts for tenant
    count/route.ts               -- GET: Alert count (lightweight, for badge)
    config/route.ts              -- GET/PUT: Alert threshold config (optional)
  announcements/
    active/route.ts              -- GET: Active announcements for current tenant
  feature-flags/
    route.ts                     -- GET: All flags for tenant
    [flagName]/route.ts          -- GET/PUT: Single flag (platform admin)
  onboarding/
    status/route.ts              -- GET: Onboarding completion status
  platform/
    health/route.ts              -- GET: Extended health metrics
    announcements/route.ts       -- GET/POST: CRUD announcements (admin)
    announcements/[id]/route.ts  -- PUT/DELETE: Single announcement (admin)
    feature-flags/
      [orgId]/route.ts           -- GET/PUT: Flags for specific tenant (admin)
```

### New Client Hooks

```
src/hooks/
  use-analytics.ts       -- useKPIs(), useUtilization(), useTeamHeatMap(), etc.
  use-alerts.ts          -- useAlerts(), useAlertCount()
  use-feature-flags.ts   -- useFeatureFlags(), useFeatureFlag(name)
  use-announcements.ts   -- useActiveAnnouncements()
  use-onboarding.ts      -- useOnboardingStatus()
```

### New Pages

```
src/app/(app)/
  dashboard/
    page.tsx              -- Management dashboard (rewrite from placeholder)
    disciplines/page.tsx  -- Discipline breakdown charts
    departments/page.tsx  -- Department summary view
  team/
    page.tsx              -- Extend with heat map toggle
    overview/page.tsx     -- Dedicated heat map page (if separate from team list)
```

## Patterns to Follow

### Pattern 1: Analytics Service as Pure SQL Aggregations

**What:** Keep analytics service functions as thin wrappers around Drizzle SQL aggregation queries. No in-memory data transformation.

**When:** All dashboard/chart data.

**Example:**
```typescript
// analytics.service.ts
export async function getUtilizationByMonth(
  orgId: string,
  monthFrom: string,
  monthTo: string,
): Promise<MonthlyUtilization[]> {
  const rows = await db
    .select({
      month: allocations.month,
      totalHours: sql<number>`sum(${allocations.hours})`,
      totalTarget: sql<number>`sum(${people.targetHoursPerMonth})`,
    })
    .from(allocations)
    .innerJoin(people, eq(allocations.personId, people.id))
    .where(
      and(
        eq(allocations.organizationId, orgId),
        gte(allocations.month, `${monthFrom}-01`),
        lte(allocations.month, `${monthTo}-01`),
      ),
    )
    .groupBy(allocations.month)
    .orderBy(allocations.month);

  return rows.map((r) => ({
    month: normalizeMonth(r.month),
    utilization: r.totalTarget > 0 ? r.totalHours / r.totalTarget : 0,
    totalHours: r.totalHours,
    totalTarget: r.totalTarget,
  }));
}
```

**Rationale:** Pushes computation to PostgreSQL where indexes exist. Keeps the JS layer thin. Matches the existing pattern in `allocation.service.ts`.

### Pattern 2: Recharts with Wrapper Components

**What:** Create thin wrapper components around Recharts that enforce the Nordic Precision design system.

**When:** Every chart in the app.

**Example:**
```typescript
// components/charts/capacity-line-chart.tsx
'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const CHART_COLORS = {
  primary: '#496173',
  amber: '#F59E0B',
  red: '#EF4444',
  grid: '#E5E7EB',
};

interface Props {
  data: { month: string; utilization: number }[];
}

export function CapacityLineChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: 'Inter' }} />
        <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="utilization"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Rationale:** Recharts is lightweight (~200KB gzipped), composable, SVG-based, Tailwind-compatible, well-maintained. Tremor would add another abstraction layer unnecessary given the custom Nordic Precision design system. Nivo has SSR issues with App Router.

### Pattern 3: Heat Map as CSS Grid, Not AG Grid

**What:** Build the team heat map as a custom CSS Grid component, not reusing AG Grid.

**When:** Team Overview and PDF export.

**Rationale:** AG Grid is overkill for a read-only colored matrix. The heat map is display-only (no editing). A CSS grid with `grid-template-columns: repeat(N, 1fr)` plus color-coded cells is simpler, more performant, and easier to render in @react-pdf/renderer for PDF export. AG Grid Community does not support custom cell renderers with color fills well for this use case.

### Pattern 4: PDF via @react-pdf/renderer (Not Puppeteer)

**What:** Use `@react-pdf/renderer` for server-side PDF generation in API routes.

**When:** Team Overview PDF export.

**Rationale:** Puppeteer requires a headless Chrome binary which does not work on Vercel serverless. `@react-pdf/renderer` generates PDF from React component trees purely in Node.js with no browser dependency. It supports tables, text styling, and color fills which covers the heat map layout. Trade-off: you must reimplement the layout in @react-pdf primitives (View, Text, etc.) rather than reusing web components directly. But for a structured table/grid, this is straightforward.

```typescript
// api/analytics/team-heatmap/pdf/route.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { TeamHeatMapDocument } from '@/components/pdf/team-heatmap-document';

export async function POST(request: Request) {
  const orgId = await getTenantId();
  const { monthFrom, monthTo } = await request.json();
  const data = await getTeamHeatMap(orgId, monthFrom, monthTo);

  const buffer = await renderToBuffer(
    <TeamHeatMapDocument data={data} monthFrom={monthFrom} monthTo={monthTo} />
  );

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="team-overview.pdf"',
    },
  });
}
```

### Pattern 5: Feature Flags as Middleware + Hook

**What:** Check feature flags in both API routes (server) and components (client).

**When:** Gating new features per tenant.

**Server-side check:**
```typescript
// In API route
const enabled = await isEnabled(orgId, 'dashboards');
if (!enabled) {
  return NextResponse.json({ error: 'Feature not available' }, { status: 403 });
}
```

**Client-side hook:**
```typescript
// In component
const dashboardEnabled = useFeatureFlag('dashboards');
if (!dashboardEnabled) return <UpgradeBanner />;
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Background Job for Alerts
**What:** Running a cron job or scheduled function to pre-compute alerts.
**Why bad:** Adds infrastructure complexity (Vercel Cron, queue, state management) for a feature that only needs data when someone views the dashboard. Over-engineering.
**Instead:** Compute alerts on demand when dashboard loads. Cache in TanStack Query for 60s.

### Anti-Pattern 2: Separate Analytics Database / Materialized Views
**What:** Creating materialized views or a separate analytics DB for dashboard queries.
**Why bad:** Premature optimization. Target audience is 20-500 managed resources. Even at 500 people x 18 months x 10 projects = 90K rows, PostgreSQL handles GROUP BY in milliseconds.
**Instead:** Direct queries with existing indexes. Add materialized views only if query times exceed 500ms.

### Anti-Pattern 3: Real-Time WebSocket Updates for Dashboards
**What:** Pushing dashboard updates via WebSocket when allocations change.
**Why bad:** Massive complexity. Resource planning is not a real-time domain (changes happen infrequently).
**Instead:** TanStack Query with `refetchOnWindowFocus: true` and a 30-60s stale time. Users get fresh data when switching tabs.

### Anti-Pattern 4: Storing Rendered Charts as Images
**What:** Pre-rendering chart images on the server and caching them.
**Why bad:** Stale data, cache invalidation complexity, loses interactivity.
**Instead:** Recharts renders client-side from fresh data. Fast enough for the data volumes involved.

### Anti-Pattern 5: Reusing AG Grid for Heat Maps
**What:** Using AG Grid with custom cell renderers for the team heat map.
**Why bad:** AG Grid is designed for editable spreadsheets. Adding it to a read-only color matrix adds 200KB+ of unnecessary JS, complex configuration for a simple display need, and makes PDF export harder.
**Instead:** CSS Grid with colored div cells. Lightweight, accessible, easy to port to @react-pdf.

## Scalability Considerations

| Concern | At 50 people (small) | At 500 people (target) | At 5000 people (future) |
|---------|---------------------|----------------------|------------------------|
| Dashboard query time | <50ms | <200ms | May need materialized views |
| Heat map rendering | Trivial | 500x18 = 9000 cells, fine | Need virtualization or pagination |
| PDF generation | <1s | 2-5s (500 rows, 18 cols) | Need chunking or background job |
| Alert evaluation | <50ms | <200ms (one aggregation query) | Need pre-computation |
| Feature flag checks | Negligible | Negligible | Negligible |
| TanStack Query cache | Standard | Standard | May need query splitting by date range |

## Technology Choices for v2.0

| Need | Technology | Version | Why |
|------|-----------|---------|-----|
| Charts | Recharts | 2.x | Lightweight, composable, SVG-based, Tailwind-compatible, active maintenance |
| PDF | @react-pdf/renderer | 4.x | Pure Node.js PDF gen, no browser binary, works on Vercel serverless |
| Heat map | Custom CSS Grid | -- | Simpler than AG Grid for read-only colored matrix, easy PDF port |
| Feature flags | Custom (DB-backed) | -- | Schema already exists, no external service needed |
| Announcements | Custom (DB-backed) | -- | Schema already exists, simple display logic |
| Health monitoring | Custom + Sentry | -- | Extend existing /api/health, Sentry already in stack |
| Alert notifications | TanStack Query polling | -- | No WebSocket needed, 60s refresh cycle |

## Suggested Build Order

Based on dependency analysis between new features:

```
Phase 1: Analytics Foundation
  - analytics.service.ts (all aggregation queries)
  - analytics.types.ts
  - API routes for dashboard/heatmap/staffing/discipline
  - useAnalytics hooks
  Depends on: nothing new (reads existing data)
  Unlocks: everything else

Phase 2: Dashboard + Charts
  - Recharts wrapper components
  - Dashboard page with KPI cards
  - Utilization line chart
  - Discipline breakdown chart
  Depends on: Phase 1 (analytics service)

Phase 3: Team Heat Map + Project Staffing
  - Heat map component (CSS Grid)
  - Team Overview page integration
  - Project staffing grid
  Depends on: Phase 1 (analytics service)

Phase 4: Alerts
  - alerts.service.ts
  - Alert badge in TopNav
  - Alert list on dashboard
  Depends on: Phase 1 (analytics service), Phase 2 (dashboard page exists)

Phase 5: PDF Export
  - @react-pdf/renderer setup
  - TeamHeatMapDocument component
  - PDF API route
  Depends on: Phase 3 (heat map data/layout defined)

Phase 6: Operational Features (parallelizable)
  6a: Feature Flags
    - feature-flags.service.ts
    - Platform admin UI for flag management
    - useFeatureFlag hook
    Depends on: nothing (schema exists)

  6b: Announcements
    - announcements.service.ts
    - Banner component in AppShell
    - Platform admin CRUD
    Depends on: nothing (schema exists)

  6c: Onboarding Wizard
    - onboarding.service.ts (completion checks)
    - Multi-step wizard UI
    - Replace current Clerk-only onboarding page
    Depends on: nothing

  6d: System Health
    - health.service.ts (extended)
    - Platform admin health dashboard
    Depends on: nothing
```

**Ordering rationale:**
1. Analytics service first because dashboards, heat maps, alerts, and PDF all depend on aggregation queries
2. Dashboard and heat map next because they are the highest-value user-facing features
3. Alerts after dashboard because they display within the dashboard context
4. PDF after heat map because PDF exports the heat map layout
5. Operational features (flags, announcements, onboarding, health) are independent and can be built in any order or in parallel

## Sources

- Existing codebase analysis: `src/features/allocations/allocation.service.ts`, `src/db/schema.ts`, `src/lib/capacity.ts`
- [Recharts vs Nivo comparison](https://www.speakeasy.com/blog/nivo-vs-recharts) - MEDIUM confidence
- [Best React chart libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/) - MEDIUM confidence
- [Tremor](https://www.tremor.so/) - MEDIUM confidence
- [@react-pdf/renderer on npm](https://www.npmjs.com/package/@react-pdf/renderer) - HIGH confidence (860K weekly downloads, React 19 compatible)
- [PDF generation in Next.js serverless](https://techresolve.blog/2025/12/25/anyone-generating-pdfs-server-side-in-next-js/) - MEDIUM confidence
- [Vercel Flags SDK](https://flags-sdk.dev/) - HIGH confidence (official Vercel docs)
- [Feature flags in Next.js](https://spin.atomicobject.com/feature-flags-in-nextjs/) - MEDIUM confidence
