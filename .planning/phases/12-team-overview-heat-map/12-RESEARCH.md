# Phase 12: Team Overview Heat Map - Research

**Researched:** 2026-03-28
**Domain:** SQL aggregation service + pure HTML/CSS heat map component (person x month utilization matrix)
**Confidence:** HIGH

## Summary

Phase 12 builds the first analytics feature: a team-wide capacity heat map showing all people x all months, color-coded by utilization. This is the foundation that later phases (13-15) will reuse. The phase has two distinct layers: (1) a new `analytics.service.ts` that performs a single CTE-based SQL aggregation query against the existing `allocations` + `people` + `departments` tables, and (2) a pure HTML `<table>` component styled with Tailwind that renders the person x month matrix with color-coded cells.

The decision to use a pure HTML table (not AG Grid, not Nivo `@nivo/heatmap`) is locked. This gives 0KB additional bundle cost, full Tailwind styling control, simpler horizontal scroll behavior, and a data shape that @react-pdf/renderer can consume directly in Phase 15. The analytics service is the critical-path module -- it must be designed to also serve Phases 13 (Dashboard) and 14 (Alerts) without rework.

**Primary recommendation:** Build the analytics service with a single CTE-based SQL query that returns the full person x month matrix in one database round-trip. Render with a plain HTML table using Tailwind background color classes. Gate the route behind the existing `dashboards` feature flag.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEAM-01 | Heat map of all people x months, cells color-coded by utilization (green 80-100%, yellow 50-79%, red >100%, grey <50%) | Analytics service CTE query returns per-person-per-month hours + target. Existing `calculateStatus()` in `src/lib/capacity.ts` needs threshold adjustment (current thresholds differ from TEAM-01 spec). HTML table cells get dynamic Tailwind bg classes. |
| TEAM-02 | Rows grouped by department with collapsible sections | SQL query orders by department. Client groups rows by `departmentName`. Collapsible sections via local React state toggling `hidden` class on department group `<tbody>` elements. |
| TEAM-03 | Filter by department, discipline, or date range | URL search params (`?dept=X&disc=Y&from=2026-03&to=2027-06`). Filters passed to analytics API endpoint. SQL WHERE clauses on `departments.id`, `disciplines.id`, `allocations.month` range. Reuse existing `useDepartments()` and `useDisciplines()` hooks for filter dropdowns. |
| TEAM-04 | Click person name navigates to Person Input Form | Person name cells rendered as `<Link href="/input/[personId]">`. No new logic needed -- existing input form route handles it. |
| TEAM-05 | Horizontal scroll across 12-18 month planning horizon | `overflow-x-auto` on table container. Sticky first column (person name) via `sticky left-0 z-10 bg-surface`. Month columns generated from `generateMonthRange()` in `src/lib/date-utils.ts`. |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.45.x | SQL query builder for analytics aggregations | Already in stack, supports raw `sql` tagged templates for CTEs |
| TanStack Query | 5.x | Client-side caching of heat map data | Already in stack, `staleTime: 60_000` for analytics |
| Tailwind CSS | 4.x | Heat map cell styling with dynamic bg colors | Already in stack, Nordic Precision design tokens defined |
| Next.js 16 | 16.2.1 | API routes for analytics endpoint, App Router pages | Already in stack |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.x | Validate query params on analytics API route | Filter validation |
| Lucide React | 1.7.x | Icons for collapse/expand chevrons, filter UI | Department group headers |

### No New Dependencies

This phase requires **zero** npm installs. The heat map is pure HTML + Tailwind. The analytics service uses Drizzle's existing `sql` template tag for CTEs.

## Architecture Patterns

### Recommended Project Structure

```
src/
  features/
    analytics/
      analytics.service.ts    -- CTE-based aggregation queries (NEW)
      analytics.types.ts       -- Response types (NEW)
  app/
    (app)/
      dashboard/
        team/
          page.tsx             -- Team Overview Heat Map page (NEW)
    api/
      analytics/
        team-heatmap/
          route.ts             -- GET endpoint returning heat map matrix (NEW)
  components/
    heat-map/
      heat-map-table.tsx       -- Pure HTML table component (NEW)
      heat-map-filters.tsx     -- Department/discipline/date filters (NEW)
      heat-map-cell.tsx        -- Single cell with color + number (NEW)
  hooks/
    use-team-heatmap.ts        -- TanStack Query hook for heat map data (NEW)
```

### Pattern 1: Single CTE Query for All Aggregation

**What:** One SQL query using Common Table Expressions that computes the full person x month utilization matrix in a single database round-trip.

**When to use:** Always for the heat map endpoint. Prevents Neon cold-start penalty from multiplying across sequential queries.

**Example:**
```typescript
// analytics.service.ts
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type { HeatMapRow } from './analytics.types';

export async function getTeamHeatMap(
  orgId: string,
  monthFrom: string,
  monthTo: string,
  filters?: { departmentId?: string; disciplineId?: string },
): Promise<HeatMapRow[]> {
  // Single query: people LEFT JOIN allocations, grouped by person + month
  // Returns one row per person per month with sum(hours) and target
  const rows = await db.execute<{
    person_id: string;
    first_name: string;
    last_name: string;
    department_id: string;
    department_name: string;
    discipline_id: string;
    target_hours: number;
    month: string;
    total_hours: number;
  }>(sql`
    WITH months AS (
      SELECT generate_series(
        ${monthFrom}::date,
        ${monthTo}::date,
        '1 month'::interval
      )::date AS month
    ),
    active_people AS (
      SELECT p.id, p.first_name, p.last_name,
             p.department_id, d.name AS department_name,
             p.discipline_id, p.target_hours_per_month
      FROM people p
      INNER JOIN departments d ON d.id = p.department_id
      WHERE p.organization_id = ${orgId}
        AND p.archived_at IS NULL
        ${filters?.departmentId ? sql`AND p.department_id = ${filters.departmentId}` : sql``}
        ${filters?.disciplineId ? sql`AND p.discipline_id = ${filters.disciplineId}` : sql``}
    ),
    person_months AS (
      SELECT ap.id AS person_id, ap.first_name, ap.last_name,
             ap.department_id, ap.department_name, ap.discipline_id,
             ap.target_hours_per_month AS target_hours,
             m.month
      FROM active_people ap
      CROSS JOIN months m
    )
    SELECT pm.person_id, pm.first_name, pm.last_name,
           pm.department_id, pm.department_name, pm.discipline_id,
           pm.target_hours,
           to_char(pm.month, 'YYYY-MM') AS month,
           COALESCE(SUM(a.hours), 0)::int AS total_hours
    FROM person_months pm
    LEFT JOIN allocations a
      ON a.person_id = pm.person_id
      AND a.month = pm.month
      AND a.organization_id = ${orgId}
    GROUP BY pm.person_id, pm.first_name, pm.last_name,
             pm.department_id, pm.department_name, pm.discipline_id,
             pm.target_hours, pm.month
    ORDER BY pm.department_name, pm.last_name, pm.first_name, pm.month
  `);

  return rows;
}
```

**Rationale:** Single round-trip to Neon. `generate_series` ensures months with zero allocations still appear. CROSS JOIN ensures every person has a row for every month (no gaps). Covered by the proposed composite index.

### Pattern 2: Heat Map as Pure HTML Table with Tailwind

**What:** Render the person x month matrix as a standard `<table>` element with Tailwind background color classes on `<td>` cells.

**When to use:** Team Overview heat map display.

**Example:**
```typescript
// components/heat-map/heat-map-table.tsx
'use client';

import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { formatMonthHeader } from '@/lib/date-utils';
import type { HeatMapData, DepartmentGroup } from '@/features/analytics/analytics.types';

const STATUS_COLORS = {
  over:   'bg-red-500/80 text-white',      // >100%
  healthy:'bg-green-500/60 text-green-950', // 80-100%
  under:  'bg-amber-400/60 text-amber-950', // 50-79%
  idle:   'bg-gray-200 text-gray-500',      // <50%
} as const;

function getUtilizationClass(hours: number, target: number): string {
  if (target === 0) return STATUS_COLORS.idle;
  const ratio = hours / target;
  if (ratio > 1.0) return STATUS_COLORS.over;
  if (ratio >= 0.8) return STATUS_COLORS.healthy;
  if (ratio >= 0.5) return STATUS_COLORS.under;
  return STATUS_COLORS.idle;
}
```

### Pattern 3: URL-Based Filter State

**What:** Store filter state (department, discipline, date range) in URL search params rather than React state.

**When to use:** All analytics pages with filters.

**Example:**
```typescript
// Shareable, bookmarkable, survives navigation
// /dashboard/team?dept=uuid&disc=uuid&from=2026-03&to=2027-06

import { useSearchParams, useRouter } from 'next/navigation';

function useHeatMapFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters = {
    departmentId: searchParams.get('dept') ?? undefined,
    disciplineId: searchParams.get('disc') ?? undefined,
    monthFrom: searchParams.get('from') ?? getCurrentMonth(),
    monthTo: searchParams.get('to') ?? getDefaultEndMonth(),
  };

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`?${params.toString()}`);
  };

  return { filters, setFilter };
}
```

### Pattern 4: Department-Grouped Collapsible Sections

**What:** Group heat map rows by department with a collapsible header row. Each department is a separate `<tbody>` that can be toggled.

**When to use:** TEAM-02 requirement.

**Example:**
```typescript
// Group flat rows into department buckets on the client
function groupByDepartment(rows: HeatMapRow[]): DepartmentGroup[] {
  const map = new Map<string, DepartmentGroup>();
  for (const row of rows) {
    let group = map.get(row.departmentId);
    if (!group) {
      group = {
        departmentId: row.departmentId,
        departmentName: row.departmentName,
        people: [],
      };
      map.set(row.departmentId, group);
    }
    // Find or create person in group
    let person = group.people.find(p => p.personId === row.personId);
    if (!person) {
      person = {
        personId: row.personId,
        name: `${row.firstName} ${row.lastName}`,
        targetHours: row.targetHours,
        months: {},
      };
      group.people.push(person);
    }
    person.months[row.month] = row.totalHours;
  }
  return Array.from(map.values());
}
```

### Anti-Patterns to Avoid

- **Using AG Grid for the heat map:** AG Grid is for editable spreadsheets. The heat map is read-only. AG Grid adds 250KB+ JS and its editing infrastructure fights read-only display.
- **Using @nivo/heatmap:** Adds ~100KB+ bundle. The data shape (person x month) is better served by a plain table. Nivo's chart semantics (axes, scales, legends) are unnecessary for a simple colored matrix.
- **Multiple sequential queries:** Never fire one query per department or per person. One CTE-based query returns everything.
- **Client-side aggregation:** Never fetch raw allocation rows and aggregate in JavaScript. Push GROUP BY to PostgreSQL.
- **Hardcoding month columns:** Use `generateMonthRange()` from `src/lib/date-utils.ts` to dynamically generate the month range.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Month range generation | Custom date math | `generateMonthRange()` from `src/lib/date-utils.ts` | Already tested, handles year boundaries |
| Capacity status colors | New color logic | Adapt `calculateStatus()` from `src/lib/capacity.ts` | Existing logic, just needs threshold adjustment for TEAM-01 spec |
| Tenant scoping | Manual WHERE clauses | Existing `eq(allocations.organizationId, orgId)` pattern | Consistent with all other services |
| Feature flag gating | Custom route guard | Existing `FlagGuard` + `FLAG_ROUTE_MAP` in `src/features/flags/` | Phase 11 already built this |
| Department/discipline dropdowns | Fetch logic | Existing `useDepartments()` / `useDisciplines()` hooks in `src/hooks/use-people.ts` | Already fetches and caches reference data |

## Common Pitfalls

### Pitfall 1: Capacity Status Threshold Mismatch

**What goes wrong:** The existing `calculateStatus()` in `src/lib/capacity.ts` uses different thresholds than TEAM-01 specifies. Current: green <90%, amber 90-100%, red >100%. TEAM-01 requires: green 80-100%, yellow 50-79%, red >100%, grey <50%.

**Why it happens:** `calculateStatus()` was built for the Person Input Form (INPUT-05) where amber means "approaching full". The heat map needs different semantics (under-utilized is a concern too).

**How to avoid:** Create a new `calculateHeatMapStatus()` function (or extend existing with a mode parameter) that implements the TEAM-01 thresholds. Do NOT modify the existing `calculateStatus()` -- it is correct for the input grid. The two contexts have intentionally different thresholds.

**Warning signs:** Heat map shows mostly green when it should show grey/yellow for underutilized people.

### Pitfall 2: Neon Cold-Start Multiplied by Query Count

**What goes wrong:** Dashboard page fires 3-4 separate aggregation queries. First query wakes Neon (500ms-2s cold start), each subsequent query adds latency. Total: 3-6 seconds.

**Why it happens:** Developer copies the "one service function per data need" pattern from v1.0. Dashboard needs all data at once, not piecemeal.

**How to avoid:** Single CTE query returns the full matrix. One round-trip. Cache in TanStack Query with `staleTime: 60_000`. The analytics API endpoint returns the complete heat map dataset.

**Warning signs:** Dashboard loads in >2 seconds on first visit after idle period.

### Pitfall 3: Missing Months in Heat Map Grid

**What goes wrong:** The heat map only shows months where at least one allocation exists. Months with zero allocations (gaps) are missing from the grid, making it impossible to see the full planning horizon.

**Why it happens:** A simple GROUP BY on allocations only returns months with data. The CTE approach with `generate_series` + `CROSS JOIN` ensures every person has every month, even with zero hours.

**How to avoid:** Use the CTE pattern with `generate_series` to create a complete month grid. The `person_months` CTE cross-joins all active people with all months in range, then LEFT JOINs to allocations. This guarantees no gaps.

**Warning signs:** Heat map columns jump from "Jan 2026" to "Apr 2026" when Feb-Mar have no allocations.

### Pitfall 4: Horizontal Scroll Losing Row Context

**What goes wrong:** When scrolling horizontally across 12-18 month columns, the person name column scrolls out of view. Users cannot tell whose row they are looking at.

**Why it happens:** Standard `overflow-x-auto` on a `<div>` scrolls everything, including the first column.

**How to avoid:** Make the first column (person name + department header) sticky:
```css
/* Person name column */
th:first-child, td:first-child {
  position: sticky;
  left: 0;
  z-index: 10;
  background: var(--color-surface); /* prevent see-through */
}
```
Use Tailwind: `sticky left-0 z-10 bg-surface`.

**Warning signs:** Usability test: scroll right, can you still see who each row belongs to?

### Pitfall 5: Feature Flag Route Not Registered

**What goes wrong:** The team overview page loads without checking the `dashboards` feature flag, or the nav item appears but the route is not gated.

**Why it happens:** Phase 11 set up `FLAG_ROUTE_MAP` gating `/dashboard` routes. If the heat map lives at a different path (e.g., `/team/overview`), it is not covered.

**How to avoid:** Place the heat map page under `/dashboard/team` so it inherits the `dashboards` flag gate from `FLAG_ROUTE_MAP`. If placed elsewhere, update `FLAG_ROUTE_MAP` in `src/features/flags/flag.types.ts` to include the new path. Also add a nav item with `flag: 'dashboards'` to `NAV_ITEMS` in `top-nav.tsx`.

### Pitfall 6: Large Table Rendering Performance

**What goes wrong:** For 200+ people x 18 months = 3,600+ cells, the initial render becomes sluggish. Each cell has a dynamic class computation.

**Why it happens:** React renders all cells synchronously. No virtualization for a plain HTML table.

**How to avoid:** For v2.0 target (20-500 people), this is acceptable. At 500 people x 18 months = 9,000 cells, the table should still render in <100ms. The department collapse feature naturally reduces visible rows. If performance degrades: (1) add `React.memo` to row components, (2) consider `content-visibility: auto` CSS for off-screen department groups. Virtualization is NOT needed for v2.0 scale.

## Code Examples

### Heat Map Status Calculation (New, TEAM-01 thresholds)

```typescript
// src/lib/capacity.ts (add alongside existing calculateStatus)
export type HeatMapStatus = 'over' | 'healthy' | 'under' | 'idle';

/**
 * Calculate heat map status per TEAM-01 specification.
 * Different thresholds from the input form's calculateStatus().
 *   - over: >100% utilization (red)
 *   - healthy: 80-100% (green)
 *   - under: 50-79% (yellow)
 *   - idle: <50% (grey)
 */
export function calculateHeatMapStatus(hours: number, targetHours: number): HeatMapStatus {
  if (targetHours === 0) return 'idle';
  const ratio = hours / targetHours;
  if (ratio > 1.0) return 'over';
  if (ratio >= 0.8) return 'healthy';
  if (ratio >= 0.5) return 'under';
  return 'idle';
}

export const HEAT_MAP_COLORS: Record<HeatMapStatus, string> = {
  over:    'bg-red-500/80 text-white',
  healthy: 'bg-green-500/60 text-green-950',
  under:   'bg-amber-400/60 text-amber-950',
  idle:    'bg-gray-200 text-gray-500',
};
```

### Analytics Types

```typescript
// src/features/analytics/analytics.types.ts

export interface HeatMapCell {
  month: string;        // YYYY-MM
  totalHours: number;
  targetHours: number;
}

export interface HeatMapPerson {
  personId: string;
  firstName: string;
  lastName: string;
  targetHours: number;
  months: Record<string, number>; // month -> totalHours
}

export interface DepartmentGroup {
  departmentId: string;
  departmentName: string;
  people: HeatMapPerson[];
}

export interface HeatMapResponse {
  departments: DepartmentGroup[];
  months: string[];     // ordered list of YYYY-MM strings in range
  generatedAt: string;  // ISO timestamp
}

export interface HeatMapFilters {
  departmentId?: string;
  disciplineId?: string;
  monthFrom: string;    // YYYY-MM
  monthTo: string;      // YYYY-MM
}
```

### TanStack Query Hook

```typescript
// src/hooks/use-team-heatmap.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import type { HeatMapResponse, HeatMapFilters } from '@/features/analytics/analytics.types';

export function useTeamHeatMap(filters: HeatMapFilters) {
  const params = new URLSearchParams({
    from: filters.monthFrom,
    to: filters.monthTo,
  });
  if (filters.departmentId) params.set('dept', filters.departmentId);
  if (filters.disciplineId) params.set('disc', filters.disciplineId);

  return useQuery<HeatMapResponse>({
    queryKey: ['team-heatmap', filters],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/team-heatmap?${params}`);
      if (!res.ok) throw new Error('Failed to fetch heat map data');
      return res.json();
    },
    staleTime: 60_000,  // 1 minute -- allocation data changes infrequently
  });
}
```

### Composite Index Migration

```sql
-- Drizzle migration for heat map query performance
-- Covers: WHERE organization_id = ? AND month BETWEEN ? AND ?
-- with person_id grouping and hours aggregation
CREATE INDEX IF NOT EXISTS alloc_org_month_person_covering
  ON allocations (organization_id, month, person_id)
  INCLUDE (hours, project_id);
```

**Note:** The existing indexes `allocations_org_person_month_idx` and `allocations_org_month_idx` partially cover this, but the covering index with INCLUDE avoids heap lookups for the SUM(hours) aggregation.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nivo @nivo/heatmap for React heat maps | Pure HTML table for simple matrices | Project decision (locked) | 0KB bundle addition vs ~100KB+ |
| Multiple queries per dashboard widget | Single CTE query returning full dataset | PostgreSQL best practice for serverless (Neon) | One cold-start penalty instead of N |
| Client-side data aggregation | Server-side SQL GROUP BY | Always was best practice | Prevents shipping raw allocation rows to client |

**Deprecated/outdated:**
- The STACK.md recommends `@nivo/heatmap` for the heat map. This has been overridden by the locked decision to use pure HTML/Tailwind (STATE.md: "Heat map: pure HTML/CSS table with Tailwind, NOT AG Grid").

## Open Questions

1. **Route placement: `/dashboard/team` vs `/team/overview`**
   - What we know: The `dashboards` flag gates `/dashboard` routes. Placing the heat map under `/dashboard/team` gets free flag gating.
   - What's unclear: Users might expect "Team" nav to include the heat map, not "Dashboard".
   - Recommendation: Place at `/dashboard/team` for flag gating simplicity. Add a nav sub-item under Dashboard. The existing `/team` page remains the people CRUD list.

2. **Composite index: add now or wait for performance data?**
   - What we know: Existing indexes partially cover the query. The composite INCLUDE index is optimal for the CTE.
   - What's unclear: Whether existing indexes are sufficient at current data volumes.
   - Recommendation: Add the covering index in this phase. It is a non-destructive, non-locking operation on Neon (CONCURRENTLY). Better to have it and not need it.

3. **How many months to show by default?**
   - What we know: TEAM-05 says "12-18 month planning horizon". The existing input form uses `generateMonthRange(currentMonth, 18)`.
   - Recommendation: Default to 12 months. Allow user to extend to 18 via date range filter. This keeps the initial view manageable while supporting the full horizon.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual testing (no automated test framework in project) |
| Config file | None |
| Quick run command | `pnpm build && pnpm dev` (visual verification) |
| Full suite command | `pnpm build` (type checking + build) |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEAM-01 | Cells color-coded by utilization thresholds | Manual visual | `pnpm build` (type check) | N/A |
| TEAM-02 | Department grouping with collapse | Manual visual | `pnpm build` | N/A |
| TEAM-03 | Filter by dept/disc/date range | Manual + URL param verification | `pnpm build` | N/A |
| TEAM-04 | Click person name navigates to input form | Manual click test | `pnpm build` | N/A |
| TEAM-05 | Horizontal scroll with sticky column | Manual visual | `pnpm build` | N/A |

### Sampling Rate

- **Per task commit:** `pnpm build` (catches type errors, import issues)
- **Per wave merge:** Visual smoke test in dev server
- **Phase gate:** All 5 TEAM requirements manually verified in browser

### Wave 0 Gaps

None -- no automated test infrastructure exists in the project. All validation is via `pnpm build` (TypeScript type checking) and manual browser testing.

## Sources

### Primary (HIGH confidence)

- Existing codebase: `src/features/allocations/allocation.service.ts` -- established Drizzle query patterns, JOIN structure, `buildFlatConditions` filter pattern
- Existing codebase: `src/lib/capacity.ts` -- current `calculateStatus()` thresholds (green <90%, amber 90-100%, red >100%)
- Existing codebase: `src/lib/date-utils.ts` -- `generateMonthRange()`, `formatMonthHeader()`, `normalizeMonth()` utilities
- Existing codebase: `src/features/flags/` -- complete flag infrastructure (FlagGuard, FlagProvider, FLAG_ROUTE_MAP, flag.service)
- Existing codebase: `src/db/schema.ts` -- allocations table schema with existing indexes
- Existing codebase: `src/features/people/person.service.ts` -- `listPeopleWithStatus()` shows LEFT JOIN aggregation pattern
- `.planning/research/ARCHITECTURE.md` -- analytics service design, heat map data flow, recommended module structure
- `.planning/research/PITFALLS.md` -- Neon cold-start CTE mitigation, AG Grid collision avoidance, color scale nuance
- `.planning/research/STACK.md` -- original Nivo recommendation (overridden by locked HTML table decision)

### Secondary (MEDIUM confidence)

- PostgreSQL `generate_series` for month grid: well-documented PostgreSQL feature, standard pattern for gapless time series
- Tailwind `sticky` positioning for table columns: standard CSS `position: sticky` with Tailwind utility classes
- INCLUDE index for covering queries: PostgreSQL 11+ feature, well-documented optimization for aggregation queries

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all existing libraries
- Architecture: HIGH -- CTE pattern well-established, HTML table is simplest possible approach
- Pitfalls: HIGH -- Neon cold-start, threshold mismatch, and sticky scroll are concrete and verified against codebase

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- no external dependencies to change)
