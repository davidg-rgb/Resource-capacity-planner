# Phase 13: Dashboard & Charts - Research

**Researched:** 2026-03-28
**Domain:** Dashboard KPI cards, bar/pie charts with Recharts 3.x, analytics service extension
**Confidence:** HIGH

## Summary

Phase 13 builds a management dashboard with KPI cards, departmental utilization bar chart, and discipline breakdown chart. The analytics service from Phase 12 (`src/features/analytics/analytics.service.ts`) provides the CTE-based SQL pattern. This phase extends that service with three new aggregation functions (dashboard KPIs, department utilization, discipline breakdown) and creates Recharts wrapper components styled with Nordic Precision design tokens.

Recharts 3.8.1 is the current stable version. It is NOT yet installed in the project -- `pnpm add recharts` is required. The existing dashboard page at `src/app/(app)/dashboard/page.tsx` is a placeholder with a single link card. It must be replaced with the full KPI + chart layout. The `dashboards` feature flag already exists and gates the `/dashboard` route.

**Primary recommendation:** Extend `analytics.service.ts` with three new query functions, install Recharts 3.8.x, build thin wrapper chart components that consume Nordic Precision CSS variables, and replace the dashboard placeholder page with the real implementation.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | KPI cards: overall utilization %, total headcount, overloaded count, underutilized count | New `getDashboardKPIs()` service function with single CTE query; KPI card components using existing design tokens |
| DASH-02 | Departmental utilization as a bar chart | New `getDepartmentUtilization()` service function; Recharts `BarChart` wrapper with Nordic Precision colors |
| DASH-03 | Time range selector (next 3, 6, or 12 months) | URL-based filter state (searchParams pattern from Phase 12); all queries accept monthFrom/monthTo params |
| DASH-04 | Click KPI card to drill down to underlying people list | KPI cards as `Link` components routing to filtered team-heatmap view (e.g., `/dashboard/team?status=over`) |
| CHRT-01 | Discipline breakdown as bar/pie chart showing hours by discipline per month | New `getDisciplineBreakdown()` service function; Recharts `BarChart` or `PieChart` wrapper |
| CHRT-02 | Discipline chart respects same time range as dashboard | Shared time range state via URL searchParams, passed to all API calls |
| CHRT-03 | Charts use Recharts with Nordic Precision design tokens | Chart color constants derived from CSS variables in globals.css; Recharts theming via direct props |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.8.1 | Bar charts, pie charts, responsive containers | Most popular React charting library, 24M+ weekly downloads, React 19 compatible, TypeScript-first, SVG-based |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query | ^5.95.2 | Data fetching + caching for dashboard endpoints | All chart data flows through query hooks with 60s staleTime |
| Drizzle ORM | 0.45.1 | SQL aggregation queries in analytics service | All new service functions use Drizzle's `sql` template tag |
| Tailwind CSS | ^4 | Card layouts, responsive grid, design tokens | Dashboard layout, KPI card styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Tremor | Tremor wraps Recharts AND imposes its own design system -- conflicts with Nordic Precision |
| Recharts | Chart.js | Canvas-based, not SVG, harder to style with CSS variables |
| Recharts | Nivo | Heavier for simple bar/pie charts; reserved for heat map (Phase 12) |

**Installation:**
```bash
pnpm add recharts@^3.8
```

**Version verification:** Recharts 3.8.1 confirmed current on npm as of 2026-03-28.

## Architecture Patterns

### Recommended Project Structure
```
src/
  features/analytics/
    analytics.service.ts    # EXTEND: add getDashboardKPIs, getDepartmentUtilization, getDisciplineBreakdown
    analytics.types.ts      # EXTEND: add DashboardKPIs, DepartmentUtilization, DisciplineBreakdown types
  components/charts/
    chart-colors.ts         # NEW: Nordic Precision color constants for charts
    kpi-card.tsx            # NEW: Reusable KPI card component
    department-bar-chart.tsx  # NEW: Recharts BarChart wrapper for departments
    discipline-chart.tsx    # NEW: Recharts BarChart/PieChart wrapper for disciplines
  hooks/
    use-dashboard.ts        # NEW: useDashboardKPIs, useDepartmentUtilization, useDisciplineBreakdown
  app/(app)/dashboard/
    page.tsx                # REPLACE: full dashboard with KPI cards + charts
  app/api/analytics/
    dashboard/route.ts      # NEW: GET endpoint for KPI data
    departments/route.ts    # NEW: GET endpoint for department utilization
    disciplines/route.ts    # NEW: GET endpoint for discipline breakdown
```

### Pattern 1: Analytics Service Extension (CTE-based SQL)
**What:** Add new aggregation functions to the existing `analytics.service.ts` following the same CTE + generate_series pattern from Phase 12.
**When to use:** All dashboard data queries.
**Example:**
```typescript
// analytics.service.ts -- new function
export async function getDashboardKPIs(
  orgId: string,
  monthFrom: string,
  monthTo: string,
): Promise<DashboardKPIs> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  const rows = await db.execute<{
    total_people: number;
    total_allocated_hours: number;
    total_target_hours: number;
    over_count: number;
    under_count: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    ),
    person_utilization AS (
      SELECT
        p.id AS person_id,
        p.target_hours_per_month AS target,
        COALESCE(SUM(a.hours), 0)::int AS total_hours
      FROM people p
      CROSS JOIN month_series ms
      LEFT JOIN allocations a
        ON a.person_id = p.id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
      GROUP BY p.id, p.target_hours_per_month
    )
    SELECT
      COUNT(*)::int AS total_people,
      SUM(total_hours)::int AS total_allocated_hours,
      SUM(target * (SELECT COUNT(*) FROM month_series))::int AS total_target_hours,
      COUNT(*) FILTER (WHERE total_hours > target * (SELECT COUNT(*) FROM month_series))::int AS over_count,
      COUNT(*) FILTER (WHERE target > 0 AND total_hours < target * 0.5 * (SELECT COUNT(*) FROM month_series))::int AS under_count
    FROM person_utilization
  `);

  const row = rows.rows[0];
  return {
    totalPeople: row.total_people,
    utilizationPercent: row.total_target_hours > 0
      ? Math.round((row.total_allocated_hours / row.total_target_hours) * 100)
      : 0,
    overloadedCount: row.over_count,
    underutilizedCount: row.under_count,
  };
}
```

### Pattern 2: Recharts Wrapper with Nordic Precision Tokens
**What:** Thin wrapper components that enforce design system colors and typography on all charts.
**When to use:** Every Recharts chart in the app.
**Example:**
```typescript
// components/charts/chart-colors.ts
// Map Nordic Precision design tokens to chart-friendly hex values
export const CHART_COLORS = {
  primary: '#496173',       // --color-primary
  primaryDim: '#3d5567',    // --color-primary-dim
  secondary: '#586065',     // --color-secondary
  tertiary: '#5b6063',      // --color-tertiary
  error: '#9f403d',         // --color-error
  surface: '#f8fafb',       // --color-surface
  grid: '#a9b4b7',          // --color-outline-variant
  text: '#2a3437',          // --color-on-surface
  textMuted: '#566164',     // --color-on-surface-variant

  // Semantic capacity colors (reuse from heat map thresholds)
  over: '#EF4444',          // red-500 (matches HEAT_MAP_COLORS)
  healthy: '#22C55E',       // green-500
  under: '#FBBF24',         // amber-400
  idle: '#D1D5DB',          // gray-300

  // Department chart palette (ordered for visual distinction)
  palette: [
    '#496173', '#586065', '#5b6063', '#3d5567',
    '#727d80', '#a9b4b7', '#465e70', '#4c5459',
  ],
} as const;

export const CHART_FONT = {
  family: 'Inter, sans-serif',
  headlineFamily: 'Manrope, sans-serif',
  size: 12,
  smallSize: 10,
} as const;
```

```typescript
// components/charts/department-bar-chart.tsx
'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS, CHART_FONT } from './chart-colors';

interface DepartmentData {
  departmentName: string;
  utilizationPercent: number;
}

interface Props {
  data: DepartmentData[];
}

export function DepartmentBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          type="number"
          domain={[0, 150]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: CHART_FONT.size, fontFamily: CHART_FONT.family }}
        />
        <YAxis
          type="category"
          dataKey="departmentName"
          tick={{ fontSize: CHART_FONT.size, fontFamily: CHART_FONT.family }}
          width={110}
        />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Bar
          dataKey="utilizationPercent"
          fill={CHART_COLORS.primary}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 3: URL-Based Time Range State
**What:** Store the selected time range (3/6/12 months) in URL searchParams so the dashboard state is shareable and survives refresh.
**When to use:** Dashboard page time range selector.
**Example:**
```typescript
// Dashboard page reads ?range=3 (default), ?range=6, or ?range=12
// All API calls derive monthFrom/monthTo from current month + range
const range = searchParams.get('range') ?? '3';
const monthFrom = getCurrentMonth(); // e.g. "2026-03"
const monthTo = addMonths(monthFrom, parseInt(range)); // e.g. "2026-06"
```
**Rationale:** Matches Phase 12 pattern of URL-based filter state for heat map.

### Pattern 4: KPI Card with Drill-Down Link
**What:** KPI cards that display a metric and link to a filtered view for drill-down (DASH-04).
**When to use:** Each of the 4 KPI cards on the dashboard.
**Example:**
```typescript
// components/charts/kpi-card.tsx
import Link from 'next/link';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;        // drill-down link
  trend?: 'up' | 'down' | 'flat';
}

export function KPICard({ title, value, subtitle, href }: KPICardProps) {
  const content = (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-6">
      <p className="font-headline text-xs font-semibold uppercase tracking-widest text-outline">
        {title}
      </p>
      <p className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block transition-shadow hover:shadow-md">
      {content}
    </Link>
  ) : content;
}
```

### Anti-Patterns to Avoid
- **Background job for dashboard data:** Compute on demand. 500 people x 18 months = 9K rows max, PostgreSQL handles GROUP BY in <200ms.
- **Storing chart images:** Render client-side from fresh data. No server-side chart-to-image pipeline needed for this phase.
- **Client-side aggregation:** Push all SUM/COUNT/GROUP BY to SQL. Do NOT fetch raw allocations and aggregate in JavaScript.
- **Hardcoded time ranges in SQL:** Always parameterize monthFrom/monthTo. The time range selector (DASH-03) must control all queries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar charts | Custom SVG path rendering | Recharts `BarChart` + `Bar` | Axis scaling, tooltips, responsive sizing, accessibility layer |
| Pie charts | Custom arc calculations | Recharts `PieChart` + `Pie` | Label positioning, animation, hover states |
| Responsive chart containers | Custom ResizeObserver wrapper | Recharts `ResponsiveContainer` | Handles all resize edge cases, debouncing |
| Number formatting | Custom percentage formatting | `Intl.NumberFormat` | Locale-aware, handles edge cases |
| Month arithmetic | Custom date string parsing | Existing `generateMonthRange` from `src/lib/date-utils.ts` | Already tested, handles year rollover |

## Common Pitfalls

### Pitfall 1: Recharts 3.x Breaking Changes
**What goes wrong:** Code copied from v2 examples fails silently or throws errors.
**Why it happens:** Recharts 3.0 rewrote state management. `accessibilityLayer` now defaults to `true`. `CartesianGrid` requires explicit axis ID matching with multiple axes. Z-index follows render order now.
**How to avoid:** Use v3 API patterns only. No `CategoricalChartState` access. Set explicit `xAxisId`/`yAxisId` when using multiple axes.
**Warning signs:** Console warnings about deprecated props; tooltip not appearing.

### Pitfall 2: ResponsiveContainer Needs a Sized Parent
**What goes wrong:** Chart renders with 0 width/height or collapses.
**Why it happens:** `ResponsiveContainer` reads parent dimensions. If the parent has no explicit or flow-based dimensions, the container collapses.
**How to avoid:** Ensure the parent `div` has a defined height (e.g., `h-[300px]`) or is in a flex/grid layout that provides intrinsic sizing.
**Warning signs:** Chart appears as a thin line or is invisible.

### Pitfall 3: Hydration Mismatch with Recharts in Next.js
**What goes wrong:** Server-rendered chart HTML doesn't match client-rendered SVG, causing React hydration errors.
**Why it happens:** Recharts uses `ResponsiveContainer` which reads DOM dimensions -- unavailable during SSR.
**How to avoid:** All chart components MUST use `'use client'` directive. Do not attempt to server-render Recharts components. The dashboard page shell can be a Server Component, but chart sections must be client components.
**Warning signs:** Hydration mismatch warnings in console.

### Pitfall 4: SQL Division by Zero in Utilization Calculations
**What goes wrong:** NaN or Infinity in utilization percentage.
**Why it happens:** Person with `target_hours_per_month = 0` or no people in range.
**How to avoid:** Always guard with `CASE WHEN total_target > 0 THEN ... ELSE 0 END` in SQL or null-check in TypeScript.
**Warning signs:** KPI card showing "NaN%" or "Infinity%".

### Pitfall 5: Stale Dashboard After Allocation Changes
**What goes wrong:** User edits allocations, navigates to dashboard, sees old numbers.
**Why it happens:** TanStack Query cache holds stale data.
**How to avoid:** Use `refetchOnWindowFocus: true` (default) and invalidate analytics queries when allocation mutations succeed. Consider `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` in allocation mutation's `onSuccess`.
**Warning signs:** Dashboard shows different numbers than heat map for same period.

## Code Examples

### API Route Pattern (follows Phase 12 exactly)
```typescript
// src/app/api/analytics/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDashboardKPIs } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;
    const from = params.get('from');
    const to = params.get('to');

    if (!from || !to || !MONTH_RE.test(from) || !MONTH_RE.test(to)) {
      return NextResponse.json(
        { error: 'Invalid parameters. Required: from (YYYY-MM), to (YYYY-MM)' },
        { status: 400 },
      );
    }

    const result = await getDashboardKPIs(orgId, from, to);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[dashboard] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### TanStack Query Hook Pattern (follows Phase 12 exactly)
```typescript
// src/hooks/use-dashboard.ts
'use client';
import { useQuery } from '@tanstack/react-query';

interface DashboardKPIs {
  totalPeople: number;
  utilizationPercent: number;
  overloadedCount: number;
  underutilizedCount: number;
}

export function useDashboardKPIs(monthFrom: string, monthTo: string) {
  return useQuery<DashboardKPIs>({
    queryKey: ['dashboard-kpis', monthFrom, monthTo],
    queryFn: async () => {
      const params = new URLSearchParams({ from: monthFrom, to: monthTo });
      const res = await fetch(`/api/analytics/dashboard?${params}`);
      if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });
}
```

### Time Range Selector Component
```typescript
// Inline in dashboard page or extracted as component
const TIME_RANGES = [
  { label: '3 months', value: '3' },
  { label: '6 months', value: '6' },
  { label: '12 months', value: '12' },
] as const;

// Use URL searchParams for state (shareable, survives refresh)
function TimeRangeSelector({ current, onChange }: {
  current: string;
  onChange: (range: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-md border border-outline-variant/30 p-1">
      {TIME_RANGES.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
            current === value
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts v2 with CategoricalChartState | Recharts v3 with hooks (useActiveTooltipLabel) | v3.0.0 (late 2025) | Cannot access internal state via old API |
| accessibilityLayer opt-in | accessibilityLayer default true | v3.0.0 | Charts are accessible by default, keyboard nav works |
| CartesianGrid auto-matches axes | CartesianGrid needs explicit xAxisId/yAxisId | v3.0.0 | Must specify axis IDs with multiple axes |

## Open Questions

1. **Drill-down destination for KPI cards (DASH-04)**
   - What we know: Cards should be clickable to see underlying people
   - What's unclear: Should drill-down go to the team heat map page with a filter, or to a new filtered list page?
   - Recommendation: Route to `/dashboard/team?status=over` (reusing the heat map from Phase 12 with a status filter). This avoids building a separate list component.

2. **Discipline chart type: bar vs pie**
   - What we know: CHRT-01 says "bar/pie chart"
   - What's unclear: Which chart type better serves the data
   - Recommendation: Use a horizontal bar chart (same pattern as department chart). Bar charts are better for comparing values across categories than pie charts, and the discipline count could be large (10+). A pie chart with 10+ slices is hard to read.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/features/analytics/analytics.service.ts` (CTE pattern)
- Existing codebase: `src/features/analytics/analytics.types.ts` (type patterns)
- Existing codebase: `src/lib/capacity.ts` (threshold functions)
- Existing codebase: `src/features/flags/flag.types.ts` (`dashboards` flag exists)
- Existing codebase: `src/app/globals.css` (Nordic Precision design tokens)
- Existing codebase: `src/hooks/use-team-heatmap.ts` (TanStack Query hook pattern)
- [Recharts 3.0 Migration Guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) - breaking changes
- [Recharts BarChart API](https://recharts.github.io/en-US/api/BarChart/) - component props
- npm registry: recharts 3.8.1 (verified 2026-03-28)

### Secondary (MEDIUM confidence)
- [Recharts Data Visualization Patterns](https://ecosire.com/blog/recharts-data-visualization-guide) - dashboard patterns
- `.planning/research/STACK.md` - stack decisions
- `.planning/research/ARCHITECTURE.md` - analytics service architecture

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts 3.8.1 verified on npm, React 19 compatible, project stack research recommends it
- Architecture: HIGH - Extending existing analytics.service.ts with same CTE pattern, same API route pattern, same hook pattern
- Pitfalls: HIGH - Recharts 3.0 migration guide reviewed, hydration/SSR issues well-documented in Next.js ecosystem

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable domain, no fast-moving dependencies)
