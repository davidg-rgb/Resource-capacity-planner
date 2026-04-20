---
phase: 14-alerts-project-view
plan: 02
subsystem: ui, project-view
tags: [project-staffing, staffing-grid, understaffed-indicator, next-link]

requires:
  - phase: 14-alerts-project-view
    plan: 01
    provides: ProjectStaffingResponse types, useProjectStaffing hook, /api/analytics/project-staffing endpoint
provides:
  - ProjectStaffingGrid component with person rows and month columns
  - ProjectSummaryRow component with totals and understaffed indicators
  - /projects/[projectId] detail page with staffing overview
  - View Staffing link on projects list page
affects: [future project view enhancements, v3.0 inline editing]

tech-stack:
  added: []
  patterns: [read-only HTML table (not AG Grid) for project staffing view, tfoot summary row pattern]

key-files:
  created:
    - src/components/project-view/project-staffing-grid.tsx
    - src/components/project-view/project-summary-row.tsx
    - src/app/(app)/projects/[projectId]/page.tsx
  modified:
    - src/app/(app)/projects/page.tsx

key-decisions:
  - "Used plain HTML table with Tailwind instead of AG Grid for read-only project staffing view per research guidance"
  - "View link visible to ALL roles (not gated by canEdit) since project staffing is read-only"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03, PROJ-04]

duration: 2min
completed: 2026-03-28
---

# Phase 14 Plan 02: Project View UI Summary

**Project staffing detail page with per-person-per-month grid, summary row with understaffed indicators, and View Staffing navigation from projects list**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T13:09:30Z
- **Completed:** 2026-03-28T13:11:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Built ProjectStaffingGrid component rendering person rows with month columns, clickable person names linking to /input/{personId}
- Built ProjectSummaryRow component computing totals per month with amber bg-amber-100 understaffed indicator for zero-allocation months
- Created /projects/[projectId] detail page using useProjectStaffing hook with loading/error/empty states
- Added "View" link with Eye icon to projects list for all non-archived projects, visible to all roles

## Task Commits

Each task was committed atomically:

1. **Task 1: Create project staffing grid and summary row components** - `bb04155` (feat)
2. **Task 2: Create project detail page and add View Staffing link to projects list** - `4e3703d` (feat)

## Files Created/Modified
- `src/components/project-view/project-staffing-grid.tsx` - Staffing grid with person rows, month columns, Link to /input/{personId}
- `src/components/project-view/project-summary-row.tsx` - Summary row with totals, amber understaffed indicator for zero-hour months
- `src/app/(app)/projects/[projectId]/page.tsx` - Project detail page with breadcrumbs, staffing table, back link
- `src/app/(app)/projects/page.tsx` - Added Eye icon View link column for non-archived projects

## Decisions Made
- Used plain HTML table with Tailwind (not AG Grid) for read-only staffing view, per research anti-pattern guidance
- View link is visible to ALL roles since project staffing is a read-only operation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None

## Known Stubs
None - all components are wired to live data sources via useProjectStaffing hook.

## Self-Check: PASSED

- All 4 files verified present
- Commits bb04155, 4e3703d verified in git log
