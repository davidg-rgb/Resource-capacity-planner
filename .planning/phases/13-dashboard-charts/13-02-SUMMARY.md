---
phase: 13-dashboard-charts
plan: 02
subsystem: ui
tags: [recharts, kpi-cards, bar-charts, dashboard, nordic-precision]

# Dependency graph
requires:
  - phase: 13-dashboard-charts
    plan: 01
    provides: analytics hooks (useDashboardKPIs, useDepartmentUtilization, useDisciplineBreakdown), chart color constants
provides:
  - KPICard component with drill-down links
  - DepartmentBarChart Recharts horizontal bar chart
  - DisciplineChart Recharts horizontal bar chart
  - Full dashboard page with KPIs, charts, time range selector
affects: [14-alerts-project-view, 15-pdf-export]

# Tech tracking
tech-stack:
  added: [recharts@3.8]
  patterns: [Recharts horizontal BarChart with Nordic Precision tokens, Suspense-wrapped client component for useSearchParams, URL-based time range state]

key-files:
  created:
    - src/components/charts/kpi-card.tsx
    - src/components/charts/department-bar-chart.tsx
    - src/components/charts/discipline-chart.tsx
    - src/app/(app)/dashboard/dashboard-content.tsx
  modified:
    - src/app/(app)/dashboard/page.tsx
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Split dashboard page into server shell + client DashboardContent component for Suspense/useSearchParams compatibility"
  - "Used Recharts ValueType (not explicit number) for Tooltip formatter to match v3 typing"
  - "DisciplineChart uses CHART_COLORS.secondary to visually distinguish from DepartmentBarChart"

patterns-established:
  - "Recharts chart wrapper: 'use client' + ResponsiveContainer inside h-[300px] parent"
  - "KPI card with optional drill-down via next/link"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04, CHRT-01, CHRT-02, CHRT-03]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 13 Plan 02: Dashboard UI Summary

**Recharts KPI cards, department utilization bar chart, and discipline breakdown chart with 3/6/12 month time range selector**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T12:45:02Z
- **Completed:** 2026-03-28T12:47:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed Recharts 3.8 for chart rendering
- KPICard component displaying metric with optional drill-down Link to team heat map
- DepartmentBarChart horizontal bar chart showing department utilization percentages
- DisciplineChart horizontal bar chart showing total hours by discipline
- Full dashboard page with 4 KPI cards, 2 charts, time range selector, loading skeletons, error states
- All charts styled with Nordic Precision CHART_COLORS and CHART_FONT tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Recharts and create KPI card and chart components** - `7beb20d` (feat)
2. **Task 2: Replace dashboard placeholder with full KPI + charts page** - `03c5a98` (feat)

## Files Created/Modified
- `src/components/charts/kpi-card.tsx` - KPICard with title, value, subtitle, optional drill-down href
- `src/components/charts/department-bar-chart.tsx` - Recharts horizontal BarChart for department utilization %
- `src/components/charts/discipline-chart.tsx` - Recharts horizontal BarChart for discipline hours
- `src/app/(app)/dashboard/dashboard-content.tsx` - Client component with hooks, time range, KPIs, charts
- `src/app/(app)/dashboard/page.tsx` - Server shell with Breadcrumbs, Suspense, Team Overview link
- `package.json` - Added recharts dependency
- `pnpm-lock.yaml` - Lock file updated

## Decisions Made
- Split dashboard into server shell + client DashboardContent for Suspense/useSearchParams compatibility (same pattern as team/page.tsx)
- Used Recharts implicit ValueType for Tooltip formatter to satisfy v3 strict typing
- DisciplineChart uses CHART_COLORS.secondary (different fill from DepartmentBarChart's primary) for visual distinction

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Recharts v3 Tooltip formatter typing**
- **Found during:** Task 1
- **Issue:** Explicit `(v: number)` parameter type conflicted with Recharts v3 `Formatter<ValueType, NameType>` which expects `ValueType | undefined`
- **Fix:** Removed explicit type annotation, let TypeScript infer from Recharts types
- **Files modified:** department-bar-chart.tsx, discipline-chart.tsx
- **Commit:** 7beb20d (included in Task 1 commit)

**2. [Rule 3 - Blocking] Dashboard content extracted to separate file**
- **Found during:** Task 2
- **Issue:** Plan suggested inline client component in same file, but Next.js App Router requires 'use client' at file level -- mixing server default export with inline client component is not clean
- **Fix:** Created dashboard-content.tsx as dedicated client component, imported in server page.tsx
- **Files modified:** dashboard-content.tsx (new), page.tsx (modified)
- **Commit:** 03c5a98

## Issues Encountered
None

## Known Stubs
None -- all components are wired to real data hooks from Plan 01.

## User Setup Required
None

## Next Phase Readiness
- Dashboard fully functional with KPIs, charts, and time range selector
- All Phase 13 requirements complete (DASH-01 through DASH-04, CHRT-01 through CHRT-03)
- Chart components reusable for future phases (PDF export in Phase 15)

## Self-Check: PASSED

---
*Phase: 13-dashboard-charts*
*Completed: 2026-03-28*
