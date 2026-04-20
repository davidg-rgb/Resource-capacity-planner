---
phase: 06-ag-grid-spike-core-grid
plan: 02
subsystem: ui
tags: [ag-grid, react, allocation-grid, autosave, tanstack-query, cell-renderers]

requires:
  - phase: 06-ag-grid-spike-core-grid
    plan: 01
    provides: allocation service, API endpoints, capacity utils, date utils, AG Grid packages
  - phase: 04-person-project-crud
    provides: people/projects hooks and API endpoints

provides:
  - AllocationGrid component with AG Grid, real-time SUMMA, capacity status dots
  - Person Input Form page at /input/[personId]
  - useAllocations + usePersonDetail TanStack Query hooks
  - useGridAutosave debounced auto-save hook
  - Grid configuration module (column defs, data transform, pinned rows)
  - StatusCell and ProjectCell custom AG Grid cell renderers
  - Input page people list at /input

affects: [07 grid polish, 07 navigation, 08 import wizard]

tech-stack:
  added: []
  patterns: [local-state-pinned-rows, debounced-autosave, cell-renderer-selector]

key-files:
  created:
    - src/hooks/use-allocations.ts
    - src/hooks/use-grid-autosave.ts
    - src/components/grid/grid-config.ts
    - src/components/grid/allocation-grid.tsx
    - src/components/grid/cell-renderers/status-cell.tsx
    - src/components/grid/cell-renderers/project-cell.tsx
    - src/app/(app)/input/[personId]/page.tsx
  modified:
    - src/app/(app)/input/page.tsx

key-decisions:
  - "Local useState<GridRow[]> for real-time SUMMA updates without server round-trip (BLOCKER 3 fix)"
  - "addedProjects local state for add-project flow merges into transformToGridRows (BLOCKER 2 fix)"
  - "cellRendererSelector in buildColumnDefs (not retroactively) for status dot rendering (WARNING 4 fix)"
  - "Reused existing use-projects.ts hook from Phase 4 instead of creating simplified duplicate"

patterns-established:
  - "Local state grid pattern: serverRowData seeds useState, cell edits update locally, server sync via useEffect"
  - "Debounced autosave: pending changes Map deduped by projectId:month, flushed via 300ms debounce"
  - "Cell renderer selector: cellRendererSelector on month cols for conditional status rendering in pinned rows"

requirements-completed: [INPUT-01, INPUT-02, INPUT-03, INPUT-04, INPUT-05, INPUT-08, INPUT-12, INPUT-13]

duration: 5min
completed: 2026-03-26
---

# Phase 6 Plan 2: AG Grid Person Input Form Summary

**AG Grid allocation grid with local-state real-time SUMMA, debounced autosave, capacity status dots, and add-project flow at /input/[personId]**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T21:41:16Z
- **Completed:** 2026-03-26T21:46:29Z
- **Tasks:** 2
- **Files created/modified:** 8

## Accomplishments

- TanStack Query hooks for allocations and person detail fetching
- Grid autosave hook with 300ms debounce and batch POST to /api/allocations/batch
- Grid configuration module with pure functions: buildColumnDefs (past-month read-only, status cellRendererSelector), transformToGridRows (with addedProjectIds merge), computePinnedRows (SUMMA/Target/Status), createAddProjectRow
- AllocationGrid component maintaining local row state for instant SUMMA recalculation
- StatusCell renderer showing color-coded capacity dots (green/amber/red/gray)
- ProjectCell renderer handling pinned row bold labels, add-project button, and regular text
- Person input page at /input/[personId] with grid, project selector dropdown, and autosave
- Input listing page at /input with clickable people links

## Task Commits

1. **Task 1: Hooks and grid configuration** - `2f010d8` (feat)
2. **Task 2: AG Grid component, cell renderers, person input page** - `d9b96f8` (feat)

## Files Created/Modified

- `src/hooks/use-allocations.ts` - useAllocations + usePersonDetail hooks
- `src/hooks/use-grid-autosave.ts` - Debounced autosave with pendingRef Map
- `src/components/grid/grid-config.ts` - buildColumnDefs, transformToGridRows, computePinnedRows, createAddProjectRow
- `src/components/grid/allocation-grid.tsx` - Main AG Grid component with local state SUMMA
- `src/components/grid/cell-renderers/status-cell.tsx` - Color-coded status dot
- `src/components/grid/cell-renderers/project-cell.tsx` - Project name / add-project button
- `src/app/(app)/input/[personId]/page.tsx` - Person input form page
- `src/app/(app)/input/page.tsx` - Updated with people list links

## Decisions Made

- Used local `useState<GridRow[]>` for real-time SUMMA (pinned rows recompute from local data, not server)
- addedProjects local state pattern for add-project: new projects appear as zero-hour rows immediately
- cellRendererSelector configured directly in buildColumnDefs month columns (not added retroactively)
- Reused existing `use-projects.ts` hook from Phase 4 (returns ProjectRow[]) instead of creating a simplified duplicate

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] React 19 useRef requires initial argument**
- **Found during:** Task 1
- **Issue:** `useRef<T>()` without argument causes TS error in React 19
- **Fix:** Changed to `useRef<T | undefined>(undefined)`
- **Files modified:** src/hooks/use-grid-autosave.ts
- **Commit:** 2f010d8

**2. [Rule 3 - Blocking] Skipped duplicate use-projects.ts creation**
- **Found during:** Task 1
- **Issue:** Plan specifies creating src/hooks/use-projects.ts but it already exists from Phase 4 with full CRUD hooks
- **Fix:** Reused existing hook which returns ProjectRow[] (has id, name, status fields needed by the grid)
- **Files modified:** none (existing file sufficient)
- **Commit:** n/a

## Known Stubs

None -- all data flows are wired to real API endpoints.

## Self-Check: PASSED

- All 8 created/modified files exist on disk
- Commit 2f010d8 (Task 1) verified in git log
- Commit d9b96f8 (Task 2) verified in git log
