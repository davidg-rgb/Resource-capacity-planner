# Phase 14: Alerts & Project View - Research

**Researched:** 2026-03-28
**Domain:** Capacity alerts (on-demand computation) + Project staffing view (read-only grid)
**Confidence:** HIGH

## Summary

Phase 14 adds two complementary features: (1) a capacity alerts system that surfaces overloaded (>100%) and underutilized (<50%) people with a nav badge and dedicated list page, and (2) a Project View that lets users select a project and see all allocated people with hours/month plus a summary row.

Both features build directly on the analytics service established in Phase 12 (CTE-based SQL with `generate_series` for gapless month grids). Alerts reuse the same `person_utilization` CTE pattern from `getDashboardKPIs` but return individual person records instead of aggregating to counts. Project View uses a project-scoped variation of the `getTeamHeatMap` query, grouping by person within a single project rather than by department across all projects.

**Primary recommendation:** Extend `analytics.service.ts` with two new functions (`getCapacityAlerts` and `getProjectStaffing`), add corresponding API routes and TanStack Query hooks, then build the UI: alert badge in TopNav, `/alerts` page, and project staffing grid on a new `/projects/[projectId]` detail page. The `alerts` feature flag already exists in `flag.types.ts` and `flag-definitions.ts`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ALRT-01 | User can view a list of overloaded (>100%) and underutilized (<50%) people for the current period | New `getCapacityAlerts` service function filtering `person_utilization` CTE by threshold; renders as list page at `/alerts` |
| ALRT-02 | Alert badge in top nav shows count of active capacity alerts | New `getAlertCount` lightweight service function; `useAlertCount` hook polled in TopNav Bell button with badge overlay |
| ALRT-03 | Each alert links to the affected person's input form | Alert list items render as `<Link href={/input/${personId}}>` using existing person input route |
| ALRT-04 | Alerts are computed on demand from current allocation data (no separate storage) | Service functions query allocations table directly with CTE; no new DB tables, no background jobs |
| PROJ-01 | User can select a project and see all people allocated with hours per month | New `getProjectStaffing` service function; new `/projects/[projectId]` page with staffing grid |
| PROJ-02 | Project View shows a summary row with total hours per month across all people | Client-side computed summary row from staffing data (sum hours per month across all people) |
| PROJ-03 | User can click a person name in Project View to navigate to their Person Input Form | Person names render as `<Link href={/input/${personId}}>` |
| PROJ-04 | Project View shows months with no allocations as visually distinct (understaffed indicator) | Months where total allocation is 0 get a distinct `bg-amber-100 border-dashed` style in summary row |
</phase_requirements>

## Standard Stack

### Core (already installed)

| Library | Purpose | Why Standard |
|---------|---------|--------------|
| Drizzle ORM + raw SQL | CTE-based analytics queries | Established pattern from Phase 12-13; `db.execute<T>(sql`...`)` for complex aggregations |
| TanStack Query | Client-side data fetching and caching | All analytics hooks use 60s staleTime pattern; alerts badge needs shorter staleTime |
| Next.js App Router | Server Components + API routes | Existing architecture; `/alerts` page as server shell + client content |
| Tailwind CSS | Styling | Nordic Precision design system tokens from `globals.css` |
| Lucide React | Icons | `Bell` icon already in TopNav; add `AlertTriangle`, `ArrowUpRight` for alert severity |
| Sonner | Toast notifications | Already app-wide from Phase 11 |

### No New Dependencies

This phase requires zero new npm packages. All functionality is built with existing libraries.

## Architecture Patterns

### Recommended Structure

```
src/
  features/analytics/
    analytics.service.ts    # ADD: getCapacityAlerts(), getAlertCount(), getProjectStaffing()
    analytics.types.ts      # ADD: CapacityAlert, AlertSeverity, ProjectStaffing types
  app/api/analytics/
    alerts/route.ts         # NEW: GET /api/analytics/alerts?from=&to=
    alerts/count/route.ts   # NEW: GET /api/analytics/alerts/count?from=&to=
    project-staffing/route.ts  # NEW: GET /api/analytics/project-staffing?projectId=&from=&to=
  app/(app)/
    alerts/page.tsx         # NEW: Alerts list page
    projects/[projectId]/page.tsx  # NEW: Project staffing detail page
  hooks/
    use-alerts.ts           # NEW: useAlerts(), useAlertCount() hooks
    use-project-staffing.ts # NEW: useProjectStaffing() hook
  components/
    alerts/alert-badge.tsx  # NEW: Badge overlay for TopNav Bell icon
    alerts/alert-list.tsx   # NEW: Alert list with severity grouping
    project-view/project-staffing-grid.tsx  # NEW: Person x month grid for a project
    project-view/project-summary-row.tsx    # NEW: Totals row with understaffed indicator
  layout/
    top-nav.tsx             # MODIFY: Wire AlertBadge into Bell button
```

### Pattern 1: Alerts as Analytics Query Extension

**What:** Alerts are NOT a separate feature module. They are a filtered view of the same `person_utilization` CTE used by `getDashboardKPIs`. The service function returns individual person records where utilization crosses thresholds.

**When:** Always. This is a locked decision -- no background jobs, no alert storage table.

**Example SQL pattern (extends existing CTE):**
```sql
WITH month_series AS (...),
active_people AS (...),
person_utilization AS (
  SELECT person_id, first_name, last_name, department_name,
         total_target, total_allocated,
         CASE WHEN total_target > 0
              THEN total_allocated::numeric / total_target::numeric
              ELSE 0 END AS utilization_ratio
  FROM ...
)
SELECT * FROM person_utilization
WHERE utilization_ratio > 1.0 OR utilization_ratio < 0.5
ORDER BY utilization_ratio DESC
```

**Rationale:** Reuses the exact aggregation logic already proven in Phase 13. No new tables, no new patterns. Alert count is just `COUNT(*)` of the same query.

### Pattern 2: Project Staffing as Project-Scoped Heat Map

**What:** Project View is structurally identical to the team heat map but filtered by `projectId` and pivoted differently. Instead of grouping people by department, it shows all people allocated to one project.

**When:** User navigates to `/projects/[projectId]`.

**Example SQL pattern:**
```sql
WITH month_series AS (
  SELECT to_char(d, 'YYYY-MM') AS month
  FROM generate_series($fromDate::date, $toDate::date, '1 month') AS d
),
project_people AS (
  SELECT DISTINCT a.person_id, p.first_name, p.last_name, p.target_hours_per_month
  FROM allocations a
  INNER JOIN people p ON p.id = a.person_id
  WHERE a.project_id = $projectId AND a.organization_id = $orgId
    AND p.archived_at IS NULL
)
SELECT pp.person_id, pp.first_name, pp.last_name, pp.target_hours_per_month,
       ms.month,
       COALESCE(SUM(a.hours), 0)::int AS hours
FROM project_people pp
CROSS JOIN month_series ms
LEFT JOIN allocations a
  ON a.person_id = pp.person_id
  AND a.project_id = $projectId
  AND to_char(a.month, 'YYYY-MM') = ms.month
  AND a.organization_id = $orgId
GROUP BY pp.person_id, pp.first_name, pp.last_name, pp.target_hours_per_month, ms.month
ORDER BY pp.last_name, pp.first_name, ms.month
```

**Rationale:** Same CTE + generate_series pattern as `getTeamHeatMap`. Returns gapless month grid so months with zero allocation are explicit (needed for PROJ-04 understaffed indicator).

### Pattern 3: Alert Badge with Separate Count Endpoint

**What:** The TopNav Bell icon needs a badge showing alert count. This should be a lightweight separate endpoint (`/api/analytics/alerts/count`) returning just the count, not the full alert list.

**When:** Every page load (TopNav renders on all app pages).

**Rationale:** The full alerts query returns person details, department, utilization ratio for each alert. The badge only needs a number. A `COUNT(*)` wrapper around the same CTE is much cheaper. Use a shorter staleTime (30s) since users expect the badge to reflect recent changes.

### Pattern 4: Project Navigation from Projects List

**What:** Add a "View Staffing" link/button on each project row in the existing `/projects` page, navigating to `/projects/[projectId]`.

**When:** User wants to see project staffing detail.

**Rationale:** The existing projects page is a CRUD list. Rather than rebuilding it, add a navigation action per row. The staffing detail page is a new dynamic route.

### Anti-Patterns to Avoid

- **Storing alerts in a separate table:** Alerts are ephemeral computed state. Storing them creates stale data problems and sync complexity. The decision is locked: compute on demand.
- **Background alert evaluation / cron jobs:** Vercel serverless has no persistent process. On-demand computation on page load is the correct pattern.
- **Polling the full alert list for the badge:** Use the lightweight `/count` endpoint. Don't fetch all alert details just to count them.
- **Making Project View editable:** Explicitly deferred to v3.0 (VIS-01). This is read-only.
- **Separate alerts feature module:** Do NOT create `src/features/alerts/`. Alerts are analytics queries. Keep them in `analytics.service.ts` alongside the other aggregation functions to avoid unnecessary module proliferation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Alert threshold logic | Custom threshold engine | Direct SQL WHERE clauses (>1.0 and <0.5) | Thresholds are hardcoded for v2.0. Configurable thresholds deferred to v3.0 |
| Alert count polling | WebSocket / SSE | TanStack Query with `refetchOnWindowFocus: true` + 30s staleTime | Low-contention data, not real-time domain |
| Project staffing grid | AG Grid | Plain HTML table with Tailwind | Read-only display; AG Grid is overkill for non-editable view |
| Summary row calculation | Server-side computed | Client-side reduce over staffing data | Simple sum; avoids an extra SQL aggregation layer |

## Common Pitfalls

### Pitfall 1: Alert Count Stale After Allocation Edit
**What goes wrong:** User edits allocations on the input form, navigates back, badge still shows old count.
**Why it happens:** TanStack Query cache not invalidated after allocation mutation.
**How to avoid:** In the allocation mutation's `onSuccess`, invalidate `['alert-count']` and `['alerts']` query keys. The existing allocation hooks already invalidate related queries.
**Warning signs:** Badge number doesn't change after saving allocation edits.

### Pitfall 2: Division by Zero in Alert Computation
**What goes wrong:** Person with `target_hours_per_month = 0` causes divide-by-zero.
**Why it happens:** Edge case -- some people may be added without setting target hours, defaulting to 0 or being set to 0.
**How to avoid:** SQL CASE expression: `WHEN total_target > 0 THEN ...`. Already established pattern in `getDashboardKPIs`.
**Warning signs:** PostgreSQL error or NaN in response.

### Pitfall 3: Project Staffing Shows Archived People
**What goes wrong:** People who were once allocated to a project but are now archived still appear in Project View.
**Why it happens:** Allocations for archived people still exist in the DB.
**How to avoid:** INNER JOIN with `people WHERE archived_at IS NULL` in the `project_people` CTE.
**Warning signs:** Unexpected names in the staffing grid.

### Pitfall 4: Empty Project View Confusion
**What goes wrong:** User selects a project with no allocations and sees a blank grid.
**Why it happens:** No people allocated means the CTE returns zero rows.
**How to avoid:** Detect empty result and show a clear empty state: "No people allocated to this project. Go to the Input page to add allocations."
**Warning signs:** Blank page with no guidance.

### Pitfall 5: Alert Badge Fires on Every Page Navigation
**What goes wrong:** The alert count API is called excessively, causing unnecessary DB load.
**Why it happens:** TopNav re-renders on every route change.
**How to avoid:** TanStack Query's staleTime (30s) prevents re-fetching within the window. Also consider `refetchOnMount: false` if data was recently fetched.
**Warning signs:** Network tab shows `/api/analytics/alerts/count` on every click.

### Pitfall 6: Feature Flag Not Gating Alerts Route
**What goes wrong:** Direct URL access to `/alerts` bypasses flag check.
**Why it happens:** Flag only checked in nav visibility, not at route/API level.
**How to avoid:** The `alerts` flag is already defined in `FLAG_ROUTE_MAP` mapping to `['/alerts']`. FlagGuard middleware from Phase 11 handles route-level gating. Also add flag check in the API route handler.
**Warning signs:** Users with flag disabled can access `/alerts` via URL.

## Code Examples

### Alert Service Function (extends analytics.service.ts)

```typescript
// Source: Follows getDashboardKPIs CTE pattern from Phase 13
export async function getCapacityAlerts(
  orgId: string,
  monthFrom: string,
  monthTo: string,
): Promise<CapacityAlert[]> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;
  const months = monthCount(monthFrom, monthTo);

  const result = await db.execute<{
    person_id: string;
    first_name: string;
    last_name: string;
    department_name: string;
    total_target: number;
    total_allocated: number;
    utilization_ratio: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month') AS d
    ),
    active_people AS (
      SELECT p.id AS person_id, p.first_name, p.last_name,
             p.target_hours_per_month AS target_hours,
             d.name AS department_name
      FROM people p
      INNER JOIN departments d ON d.id = p.department_id
      WHERE p.organization_id = ${orgId}::uuid AND p.archived_at IS NULL
    ),
    person_utilization AS (
      SELECT ap.person_id, ap.first_name, ap.last_name, ap.department_name,
             ap.target_hours * ${months} AS total_target,
             COALESCE(SUM(a.hours), 0) AS total_allocated,
             CASE WHEN ap.target_hours * ${months} > 0
                  THEN COALESCE(SUM(a.hours), 0)::numeric / (ap.target_hours * ${months})::numeric
                  ELSE 0 END AS utilization_ratio
      FROM active_people ap
      CROSS JOIN month_series ms
      LEFT JOIN allocations a ON a.person_id = ap.person_id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.person_id, ap.first_name, ap.last_name, ap.department_name, ap.target_hours
    )
    SELECT * FROM person_utilization
    WHERE utilization_ratio > 1.0 OR utilization_ratio < 0.5
    ORDER BY utilization_ratio DESC
  `);

  return result.rows.map((row) => ({
    personId: row.person_id,
    firstName: row.first_name,
    lastName: row.last_name,
    departmentName: row.department_name,
    totalTarget: row.total_target,
    totalAllocated: Number(row.total_allocated),
    utilizationRatio: Number(row.utilization_ratio),
    severity: Number(row.utilization_ratio) > 1.0 ? 'overloaded' : 'underutilized',
  }));
}
```

### Alert Count Function (lightweight)

```typescript
export async function getAlertCount(
  orgId: string,
  monthFrom: string,
  monthTo: string,
): Promise<number> {
  // Same CTE but only COUNT(*), no detail columns
  const result = await db.execute<{ count: number }>(sql`
    WITH ... same CTEs ...
    SELECT COUNT(*)::int AS count FROM person_utilization
    WHERE utilization_ratio > 1.0 OR utilization_ratio < 0.5
  `);
  return result.rows[0]?.count ?? 0;
}
```

### Alert Badge Component

```typescript
// Source: Follows TopNav Bell button pattern
'use client';
import { useAlertCount } from '@/hooks/use-alerts';
import { getCurrentMonth, generateMonthRange } from '@/lib/date-utils';

export function AlertBadge() {
  const monthFrom = getCurrentMonth();
  const monthTo = generateMonthRange(monthFrom, 3).at(-1)!;
  const { data: count } = useAlertCount(monthFrom, monthTo);

  if (!count || count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

### Project Staffing Types

```typescript
export interface ProjectStaffingPerson {
  personId: string;
  firstName: string;
  lastName: string;
  targetHoursPerMonth: number;
  months: Record<string, number>; // YYYY-MM -> hours allocated to THIS project
}

export interface ProjectStaffingResponse {
  projectId: string;
  projectName: string;
  people: ProjectStaffingPerson[];
  months: string[];       // ordered YYYY-MM array
  generatedAt: string;
}

export type AlertSeverity = 'overloaded' | 'underutilized';

export interface CapacityAlert {
  personId: string;
  firstName: string;
  lastName: string;
  departmentName: string;
  totalTarget: number;
  totalAllocated: number;
  utilizationRatio: number;   // e.g., 1.25 = 125%, 0.3 = 30%
  severity: AlertSeverity;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Background cron alerts | On-demand computation | Architecture decision (v2.0) | No infra complexity, always fresh data |
| Separate alerts table | Ephemeral query results | Architecture decision (v2.0) | No storage overhead, no stale alerts |
| AG Grid for read-only views | Plain HTML table + Tailwind | Phase 12 decision | Lighter bundle, simpler maintenance |

## Open Questions

1. **Alert time range default**
   - What we know: Dashboard defaults to "current month + next 2 months" (3-month range)
   - What's unclear: Should alerts use the same default or always show "current month only"?
   - Recommendation: Default to current month + next 2 months (same as dashboard) for consistency. Users see alerts for the near-term planning horizon.

2. **Project View navigation entry point**
   - What we know: The existing `/projects` page is a CRUD list
   - What's unclear: Should Project View be on `/projects/[projectId]` or a separate `/project-view` page?
   - Recommendation: Use `/projects/[projectId]` as a detail page. It naturally extends the existing project list with a "View" action per row. No new top-level nav item needed.

3. **Alert grouping in the list**
   - What we know: ALRT-01 says "list of overloaded and underutilized people"
   - What's unclear: Should overloaded and underutilized be shown as separate sections or one mixed list?
   - Recommendation: Two sections -- "Overloaded" (sorted by utilization descending) and "Underutilized" (sorted by utilization ascending). Clearer for the user to act on.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/features/analytics/analytics.service.ts` -- CTE patterns for all aggregation queries
- Existing codebase: `src/features/analytics/analytics.types.ts` -- Type conventions for analytics responses
- Existing codebase: `src/lib/capacity.ts` -- Threshold constants and status calculation patterns
- Existing codebase: `src/features/flags/flag.types.ts` -- `alerts` flag already defined with route `/alerts`
- Existing codebase: `src/components/layout/top-nav.tsx` -- Bell icon button ready for badge integration
- Existing codebase: `src/app/(app)/projects/page.tsx` -- Projects CRUD list to extend with navigation
- Existing codebase: `src/hooks/use-dashboard.ts` -- Hook patterns with 60s staleTime

### Secondary (MEDIUM confidence)
- Phase 12 SUMMARY: Established CTE + generate_series pattern, confirmed performance for analytics queries
- Phase 13 SUMMARY: COUNT FILTER pattern for overloaded/underutilized, division-by-zero guards
- ARCHITECTURE.md: Alert evaluation flow, anti-pattern guidance (no background jobs)
- FEATURES.md: Alert workflow definition, Project View workflow definition

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- direct extension of established Phase 12/13 patterns
- Pitfalls: HIGH -- based on real patterns observed in existing codebase

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- no external dependencies changing)
