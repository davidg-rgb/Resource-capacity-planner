---
phase: 07-grid-polish-navigation
plan: 01
subsystem: ui
tags: [react, sidebar, navigation, capacity-status, drizzle, ag-grid]

requires:
  - phase: 04-person-project-crud
    provides: Person/project CRUD service and API routes
  - phase: 06-ag-grid-spike-core-grid
    provides: AllocationGrid component and allocation hooks

provides:
  - PersonSidebar component with department-grouped people list and status dots
  - PersonHeader with prev/next sequential navigation
  - Adjacent person API endpoint
  - People with status endpoint (withStatus query param)
  - Input section layout with sidebar + content area

affects: [07-grid-polish-navigation, 08-import-wizard]

tech-stack:
  added: []
  patterns: [sidebar-layout-with-active-highlight, adjacent-person-navigation, computed-status-join-query]

key-files:
  created:
    - src/components/person/person-sidebar.tsx
    - src/components/person/person-header.tsx
    - src/app/(app)/input/layout.tsx
    - src/app/api/people/[id]/adjacent/route.ts
  modified:
    - src/features/people/person.service.ts
    - src/features/people/person.types.ts
    - src/app/api/people/route.ts
    - src/hooks/use-people.ts
    - src/app/(app)/input/[personId]/page.tsx

key-decisions:
  - "Single JOIN query for listPeopleWithStatus -- people + departments + disciplines + LEFT JOIN allocations with GROUP BY, not N+1"
  - "Client-side search filtering in sidebar -- dataset is small (tens of people per org)"
  - "Adjacent person uses full list scan -- simple approach fine for small datasets"

patterns-established:
  - "Sidebar layout pattern: layout.tsx with sidebar component + content area, pathname extraction for active item"
  - "Status dot pattern: getStatusColor() returns Tailwind class for capacity status visualization"

requirements-completed: [INPUT-06, INPUT-07]

duration: 4min
completed: 2026-03-26
---

# Phase 7 Plan 1: Person Sidebar & Navigation Summary

**Person sidebar with department-grouped list, capacity status dots, search filter, and prev/next sequential navigation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T23:35:45Z
- **Completed:** 2026-03-26T23:40:12Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- listPeopleWithStatus: single JOIN query returning people with department name, discipline abbreviation, and computed capacity status
- PersonSidebar component matching creative-direction/08-person-input-sidebar.html with grouped departments, status dots, search, and active highlight
- PersonHeader with prev/next navigation arrows that fetch adjacent person from API
- Input section layout with sidebar on left and content area on right

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend -- people with status endpoint and adjacent person API** - `ce70776` (feat)
2. **Task 2: Frontend -- person sidebar, header, and input layout** - `3308434` (feat)

## Files Created/Modified
- `src/features/people/person.types.ts` - Added PersonWithStatus type and withStatus filter option
- `src/features/people/person.service.ts` - Added listPeopleWithStatus (JOIN query) and getAdjacentPerson functions
- `src/app/api/people/route.ts` - Extended GET to support ?withStatus=true query param
- `src/app/api/people/[id]/adjacent/route.ts` - New endpoint for prev/next person navigation
- `src/components/person/person-sidebar.tsx` - Department-grouped people list with status dots and search
- `src/components/person/person-header.tsx` - Person name display with prev/next arrow navigation
- `src/app/(app)/input/layout.tsx` - Sidebar + content layout for input section
- `src/app/(app)/input/[personId]/page.tsx` - Replaced inline heading with PersonHeader component
- `src/hooks/use-people.ts` - Added usePeopleWithStatus hook

## Decisions Made
- Used single JOIN query with GROUP BY for listPeopleWithStatus rather than N+1 queries -- all data needed in one round trip
- Client-side search filtering in sidebar since people count per org is small (tens, not thousands)
- getAdjacentPerson scans full ordered list rather than using SQL window functions -- simpler and sufficient for dataset size
- Used useEffect + Promise.all to check both prev/next adjacency on mount for button enable/disable state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all components are wired to live API data.

## Next Phase Readiness
- Person sidebar and navigation complete, ready for grid polish tasks (07-02, 07-03)
- PersonHeader and PersonSidebar are independent components that can be extended in future plans

## Self-Check: PASSED

All 9 files verified present. Both commit hashes (ce70776, 3308434) confirmed in git log.

---
*Phase: 07-grid-polish-navigation*
*Completed: 2026-03-26*
