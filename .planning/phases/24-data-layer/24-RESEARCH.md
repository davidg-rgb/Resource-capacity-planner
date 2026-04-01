# Phase 24: Full Data Layer (11 API Endpoints + Hooks) - Research

**Researched:** 2026-04-01
**Domain:** Analytics API endpoints (Next.js App Router) + React Query hooks + Drizzle ORM raw SQL
**Confidence:** HIGH

## Summary

Phase 24 builds 11 new analytics API endpoints and 11 corresponding React Query hooks that feed data to the 13 visualization widgets planned for v4.0. The project already has a well-established pattern for analytics endpoints: CTE-based raw SQL via `db.execute(sql\`...\`)` with `generate_series` for gapless month grids, tenant scoping via `getTenantId()`, and error handling via `handleApiError()`. Every new endpoint follows this exact pattern.

The existing codebase (`analytics.service.ts`) contains 6 service functions that demonstrate the canonical approach: month_series CTE, active_people CTE filtered by `organization_id` and `archived_at IS NULL`, CROSS JOIN to the month grid, LEFT JOIN allocations, GROUP BY. The 11 new endpoints are variations on this theme with different aggregation dimensions (department, discipline, program, person) and different output shapes.

**Primary recommendation:** Extend `analytics.service.ts` with 11 new exported functions following the existing CTE + generate_series pattern. Create 11 new API route files under `src/app/api/analytics/`. Create a new `src/hooks/use-analytics.ts` (or individual files) for the React Query hooks. Reuse `validateMonthRange`, `generateMonthRange`, `getTenantId`, and `handleApiError` everywhere.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R24-01 | GET /api/analytics/capacity-forecast | Supply vs demand CTE pattern; sum target_hours for supply, sum allocation hours for demand, gap = supply - demand. Classify months as surplus/balanced/deficit. |
| R24-02 | GET /api/analytics/availability-timeline | Extends team-heatmap pattern; adds per-project breakdown within each person-month cell. Groups by department. |
| R24-03 | GET /api/analytics/availability | Ranked availability search; same base CTE, adds sorting + minHours filtering + totalAvailable aggregation. |
| R24-04 | GET /api/analytics/utilization-trends | 6-month lookback; per-entity (dept or person) utilization with changePercent and direction. Uses fixed 6-month window from current month. |
| R24-05 | GET /api/analytics/capacity-distribution | Stacked hours by grouping dimension (project/department/discipline); top N + "other" bucket. Reuses month grid pattern. |
| R24-06 | GET /api/analytics/person-summary | Single-person 360 card; current month + 6-month trend + 3-month forward availability. Single personId param. |
| R24-07 | GET /api/analytics/bench-report | Bench/idle capacity; people below threshold utilization. Aggregates by department and discipline. Compares to previous period. |
| R24-08 | GET /api/analytics/conflicts | Over-allocated people (>100%); includes per-project breakdown and suggested resolution (reduce largest allocation). |
| R24-09 | GET /api/analytics/program-rollup | Program aggregation; joins projects via program_id, aggregates people + hours. Discipline coverage calculation. |
| R24-10 | GET /api/analytics/period-comparison | Two-period delta comparison; runs utilization calc for both periods, computes deltas and signals. |
| R24-11 | GET /api/analytics/discipline-demand | Per-discipline supply vs demand per month; sustained deficit detection (3+ consecutive months). |
| R24-12 | React Query hooks for all 11 endpoints | Follow existing pattern: `useQuery` with descriptive queryKey, `staleTime: 60_000`, `enabled` guard where applicable, typed return. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.1 | App Router API routes | Already installed, all existing APIs use this |
| Drizzle ORM | ^0.45.1 | Raw SQL via `sql` tag + `db.execute()` | Already installed, all analytics use raw SQL not query builder |
| @tanstack/react-query | ^5.95.2 | Client-side data fetching + caching | Already installed, all hooks use this |
| TypeScript | ^5 | Type safety | Already installed |
| PostgreSQL (Neon) | - | Database | Already provisioned |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | (installed) | Query param validation | Optional upgrade from manual validation; existing pattern uses manual checks |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw SQL via `db.execute` | Drizzle query builder | Raw SQL is the established pattern for analytics; CTEs and generate_series are cleaner in raw SQL |
| Individual hook files | Single consolidated hooks file | Individual files match existing pattern (use-dashboard.ts, use-alerts.ts, etc.) |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── features/analytics/
│   ├── analytics.service.ts       # ADD 11 new service functions here
│   └── analytics.types.ts         # ADD 11 new response interfaces here
├── app/api/analytics/
│   ├── capacity-forecast/route.ts  # NEW
│   ├── availability-timeline/route.ts # NEW
│   ├── availability/route.ts       # NEW
│   ├── utilization-trends/route.ts # NEW
│   ├── capacity-distribution/route.ts # NEW
│   ├── person-summary/route.ts     # NEW
│   ├── bench-report/route.ts       # NEW
│   ├── conflicts/route.ts          # NEW
│   ├── program-rollup/route.ts     # NEW
│   ├── period-comparison/route.ts  # NEW
│   └── discipline-demand/route.ts  # NEW
├── hooks/
│   ├── use-capacity-forecast.ts    # NEW
│   ├── use-availability-timeline.ts # NEW
│   ├── use-availability.ts         # NEW
│   ├── use-utilization-trends.ts   # NEW
│   ├── use-capacity-distribution.ts # NEW
│   ├── use-person-summary.ts       # NEW
│   ├── use-bench-report.ts         # NEW
│   ├── use-conflicts.ts            # NEW
│   ├── use-program-rollup.ts       # NEW
│   ├── use-period-comparison.ts    # NEW
│   └── use-discipline-demand.ts    # NEW
```

### Pattern 1: Analytics Service Function (CTE + generate_series)
**What:** Every analytics query follows the same 4-CTE structure
**When to use:** All 11 new endpoints
**Example:**
```typescript
// Source: src/features/analytics/analytics.service.ts (existing pattern)
export async function getCapacityForecast(
  orgId: string,
  monthFrom: string,
  monthTo: string,
  filters?: { projectId?: string; departmentId?: string },
): Promise<CapacityForecastResponse> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  // Optional filter clauses (same pattern as getTeamHeatMap)
  const deptFilter = filters?.departmentId
    ? sql` AND p.department_id = ${filters.departmentId}::uuid`
    : sql``;

  const rows = await db.execute<{ month: string; supply: number; demand: number }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    ),
    active_people AS (
      SELECT p.id, p.target_hours_per_month AS target_hours
      FROM people p
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
        ${deptFilter}
    ),
    supply AS (
      SELECT ms.month, SUM(ap.target_hours)::int AS total
      FROM active_people ap CROSS JOIN month_series ms
      GROUP BY ms.month
    ),
    demand AS (
      SELECT to_char(a.month, 'YYYY-MM') AS month, SUM(a.hours)::int AS total
      FROM allocations a
      INNER JOIN active_people ap ON ap.id = a.person_id
      WHERE a.organization_id = ${orgId}::uuid
        AND to_char(a.month, 'YYYY-MM') >= ${monthFrom}
        AND to_char(a.month, 'YYYY-MM') <= ${monthTo}
      GROUP BY to_char(a.month, 'YYYY-MM')
    )
    SELECT
      ms.month,
      COALESCE(s.total, 0) AS supply,
      COALESCE(d.total, 0) AS demand
    FROM month_series ms
    LEFT JOIN supply s ON s.month = ms.month
    LEFT JOIN demand d ON d.month = ms.month
    ORDER BY ms.month
  `);

  // Transform rows to response shape...
}
```

### Pattern 2: API Route Handler
**What:** Thin route that validates params, calls service, returns JSON
**When to use:** All 11 new route files
**Example:**
```typescript
// Source: src/app/api/analytics/dashboard/route.ts (existing)
import { NextRequest, NextResponse } from 'next/server';
import { getCapacityForecast, validateMonthRange } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;
    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));
    // Extract additional params...
    const result = await getCapacityForecast(orgId, from, to);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Pattern 3: React Query Hook
**What:** Typed hook with descriptive queryKey and staleTime: 60_000
**When to use:** All 11 hooks
**Example:**
```typescript
// Source: src/hooks/use-dashboard.ts (existing pattern)
'use client';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { CapacityForecastResponse } from '@/features/analytics/analytics.types';

export function useCapacityForecast(
  monthFrom: string,
  monthTo: string,
  filters?: { projectId?: string; departmentId?: string },
): UseQueryResult<CapacityForecastResponse> {
  return useQuery<CapacityForecastResponse>({
    queryKey: ['capacity-forecast', monthFrom, monthTo, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ from: monthFrom, to: monthTo });
      if (filters?.projectId) params.set('projectId', filters.projectId);
      if (filters?.departmentId) params.set('departmentId', filters.departmentId);
      const response = await fetch(`/api/analytics/capacity-forecast?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch capacity forecast: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
```

### Anti-Patterns to Avoid
- **N+1 queries:** Never fetch person data in a loop. Use a single CTE-based query that JOINs everything.
- **Missing org scoping:** Every query MUST include `organization_id = ${orgId}::uuid` on every table access.
- **Forgetting `archived_at IS NULL`:** All people queries must exclude archived people.
- **Not using `::uuid` casts:** PostgreSQL needs explicit UUID casts for parameterized queries in raw SQL.
- **Inconsistent month format:** Always use `to_char(d, 'YYYY-MM')` in SQL and YYYY-MM strings in TypeScript.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Month grid generation | Custom loop logic | `generate_series` in SQL + `generateMonthRange` in TS | Existing pattern, handles edge cases |
| Param validation | Ad-hoc checks | `validateMonthRange()` from analytics.service | Already handles format + range checks |
| Error responses | Custom error formatting | `handleApiError()` from api-utils | Consistent error shape across all APIs |
| Tenant scoping | Manual org lookups | `getTenantId()` from auth.ts | Handles Clerk session -> internal UUID mapping |
| Query caching | Manual state management | TanStack Query with `staleTime: 60_000` | Established pattern, handles refetching |

## Common Pitfalls

### Pitfall 1: Allocation month column is DATE not TEXT
**What goes wrong:** The `allocations.month` column is `date('month', { mode: 'string' })` which stores `YYYY-MM-DD`. Comparing directly to `YYYY-MM` strings fails.
**Why it happens:** Easy to forget the day component.
**How to avoid:** Always use `to_char(a.month, 'YYYY-MM')` when comparing or grouping allocation months.
**Warning signs:** Empty results when data should exist.

### Pitfall 2: Division by zero in utilization calculations
**What goes wrong:** People with `target_hours_per_month = 0` cause division errors.
**Why it happens:** Some orgs may have people with 0 target hours (contractors, placeholders).
**How to avoid:** Always use `CASE WHEN total_target > 0 THEN ... ELSE 0 END` pattern (already used in existing code).
**Warning signs:** SQL errors in production for specific orgs.

### Pitfall 3: Missing CROSS JOIN for gapless grids
**What goes wrong:** Months with no allocations are missing from results, causing gaps in charts.
**Why it happens:** Using only JOIN on allocations skips months with zero hours.
**How to avoid:** Always CROSS JOIN people with month_series, then LEFT JOIN allocations.
**Warning signs:** Charts with missing data points.

### Pitfall 4: Large result sets for availability-timeline
**What goes wrong:** With 100+ people x 12 months x multiple projects, the response can be very large.
**Why it happens:** Availability timeline returns per-person, per-month, per-project data.
**How to avoid:** Keep the month range reasonable (max 36 months enforced by `validateMonthRange`). Consider adding pagination for large orgs.
**Warning signs:** Slow API responses, large JSON payloads.

### Pitfall 5: Inconsistent queryKey structure in hooks
**What goes wrong:** Stale data shown because queryKeys don't include all filter parameters.
**Why it happens:** Forgetting to include optional filters in the queryKey array.
**How to avoid:** Always include ALL parameters that affect the query result in the queryKey.
**Warning signs:** UI shows stale data after filter changes.

### Pitfall 6: Program rollup requires nullable program_id
**What goes wrong:** Projects without a program_id are excluded from program rollup.
**Why it happens:** Using INNER JOIN on programs table.
**How to avoid:** For "all programs" view, include unlinked projects separately. For specific program, INNER JOIN is correct.
**Warning signs:** Totals don't match when comparing program rollup to other views.

## Shared Query Patterns (Endpoint Grouping)

The 11 endpoints share common SQL building blocks. Grouping them by pattern reduces code duplication:

### Group A: Supply vs Demand (3 endpoints)
- **R24-01 capacity-forecast**: supply (sum target) vs demand (sum allocated) per month
- **R24-05 capacity-distribution**: demand broken down by grouping dimension per month
- **R24-11 discipline-demand**: supply vs demand per discipline per month

All three use: month_series + active_people + aggregation by month. The difference is the grouping dimension.

### Group B: Person-Level Utilization (4 endpoints)
- **R24-02 availability-timeline**: per-person, per-month, per-project breakdown
- **R24-03 availability**: ranked people by available hours
- **R24-07 bench-report**: people below threshold utilization
- **R24-08 conflicts**: people above 100% utilization

All four compute per-person utilization, then filter/sort differently. Could share a common `personUtilizationCTE` base.

### Group C: Trend/Comparison (2 endpoints)
- **R24-04 utilization-trends**: 6-month entity trends
- **R24-10 period-comparison**: two-period delta

Both compute utilization across time ranges and derive change signals.

### Group D: Entity-Specific (2 endpoints)
- **R24-06 person-summary**: single person deep dive
- **R24-09 program-rollup**: program-level aggregation

These are unique enough to not share much with others.

## Code Examples

### Response Type Definitions (add to analytics.types.ts)
```typescript
// Source: DASHBOARD-VISUALIZATIONS-SPEC.md lines 1313-1707
// All 11 response interfaces are fully specified in the spec.
// Copy them verbatim into analytics.types.ts.
```

### Availability Search with Sorting
```typescript
// R24-03: The availability endpoint needs dynamic sorting
const sortClause = {
  available: sql`total_available DESC`,
  utilization: sql`avg_utilization ASC`,
  name: sql`p.last_name ASC, p.first_name ASC`,
}[sort ?? 'available'];
```

### Bench Report FTE Calculation
```typescript
// R24-07: FTE equivalent = bench hours / average target hours per month
// DASHBOARD-VISUALIZATIONS-SPEC.md line 1526
const fteEquivalent = benchHours / avgTargetHoursPerMonth;
```

### Sustained Deficit Detection
```typescript
// R24-11: Check for 3+ consecutive deficit months
// Process month-ordered results and count consecutive deficit streaks
function hasSustainedDeficit(months: Record<string, { gap: number }>): boolean {
  let consecutive = 0;
  for (const month of Object.keys(months).sort()) {
    if (months[month].gap < 0) {
      consecutive++;
      if (consecutive >= 3) return true;
    } else {
      consecutive = 0;
    }
  }
  return false;
}
```

### Conflict Resolution Suggestion
```typescript
// R24-08: Suggest reducing the largest allocation to resolve conflict
// Sort person's projects by hours DESC, suggest reducing first by overBy amount
const sorted = projects.sort((a, b) => b.hours - a.hours);
const largest = sorted[0];
return {
  projectId: largest.projectId,
  projectName: largest.projectName,
  reduceBy: overBy,
  newHours: largest.hours - overBy,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Drizzle query builder for analytics | Raw SQL via `db.execute(sql\`...\`)` | Project inception | All analytics use raw SQL for CTE support |
| Individual fetch calls | TanStack Query hooks | v1.0 | Consistent caching, deduplication |

## Open Questions

1. **Should analytics.service.ts be split into multiple files?**
   - What we know: Current file is ~650 lines with 6 functions. Adding 11 more would make it ~1500+ lines.
   - What's unclear: Whether the team prefers one large file or split by domain.
   - Recommendation: Split into `analytics-core.service.ts` (existing), `analytics-forecast.service.ts` (Group A), `analytics-people.service.ts` (Group B), `analytics-trends.service.ts` (Group C+D). Keep shared helpers (validateMonthRange) in the original file. OR keep everything in one file since it is all cohesive analytics logic -- planner's discretion.

2. **Should period-comparison accept arbitrary date ranges or only months?**
   - What we know: The spec uses `fromA`, `toA`, `fromB`, `toB` as YYYY-MM params.
   - What's unclear: Whether validation should enforce non-overlapping periods.
   - Recommendation: Validate format with `validateMonthRange` for each pair independently. Allow overlapping periods (useful for YoY comparison).

3. **Color assignment for projects in availability-timeline**
   - What we know: The spec requires `color: string` on project entries within timeline data.
   - What's unclear: Whether colors come from a palette at the API level or UI level.
   - Recommendation: Assign colors from a fixed palette at the API level using project index modulo palette length. This ensures consistent colors across widgets.

## Performance Considerations

| Endpoint | Concern | Mitigation |
|----------|---------|------------|
| availability-timeline (R24-02) | Largest response: people x months x projects | Max 36-month range enforced; consider department filter as required |
| bench-report (R24-07) | Needs previous period comparison (doubles query work) | Use two CTEs in one query, not two separate queries |
| period-comparison (R24-10) | Two full utilization calculations | Single query with UNION or conditional aggregation |
| program-rollup (R24-09) | Discipline coverage needs all disciplines, not just allocated ones | CROSS JOIN disciplines with program people |

**General:** All queries are tenant-scoped and the allocations table has indexes on `(organization_id, person_id, month)` and `(organization_id, project_id, month)`. These cover the primary access patterns. No new indexes needed.

## Sources

### Primary (HIGH confidence)
- `src/features/analytics/analytics.service.ts` -- 6 existing service functions demonstrating exact pattern
- `src/app/api/analytics/*/route.ts` -- 6 existing API route handlers
- `src/hooks/use-*.ts` -- 8 existing React Query hooks
- `.planning/DASHBOARD-VISUALIZATIONS-SPEC.md` lines 1300-1707 -- all 11 API response interfaces with full TypeScript definitions
- `src/db/schema.ts` -- complete database schema with all tables, indexes, and relations

### Secondary (MEDIUM confidence)
- `package.json` -- verified versions: Next.js 16.2.1, drizzle-orm ^0.45.1, @tanstack/react-query ^5.95.2

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and in active use
- Architecture: HIGH - 6 existing endpoints provide exact pattern to follow
- Pitfalls: HIGH - identified from reading actual codebase patterns and SQL structure

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable -- no dependency changes expected)
