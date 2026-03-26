---
phase: 06-ag-grid-spike-core-grid
verified: 2026-03-26T22:00:00Z
status: passed
score: 4/4 success criteria verified
re_verification: false
---

# Phase 6: AG Grid Spike & Core Grid Verification Report

**Phase Goal:** The Person Input Form renders an AG Grid with months as columns, projects as rows, and editable hour cells — the core product value.
**Verified:** 2026-03-26T22:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a grid for a person with 12+ month columns and their assigned projects as rows, and can type hours into cells | VERIFIED | `allocation-grid.tsx` generates 12 months via `generateMonthRange(startMonth, 12)`. `buildColumnDefs` maps each month to an editable column. `valueParser` enforces 0-999 range. `AgGridReact` renders with `rowData={localRowData}`. |
| 2 | SUMMA row updates instantly when any cell value changes, and status row colors reflect the allocation level | VERIFIED | `handleCellValueChanged` calls `setLocalRowData` synchronously before triggering auto-save. `pinnedBottomRowData` is a `useMemo` derived from `localRowData`, so SUMMA recomputes on every cell edit without a server round-trip. `computePinnedRows` calls `calculateStatus` per month for the status dot. `cellRendererSelector` routes `__status__` pinned rows to `StatusCell`, which calls `getStatusColor`. |
| 3 | Editing a cell and clicking away saves the value — refreshing the page shows the saved value | VERIFIED | `stopEditingWhenCellsLoseFocus={true}` on `AgGridReact` triggers `onCellValueChanged` on blur. `useGridAutosave.handleCellChange` debounces at 300ms then POSTs to `/api/allocations/batch`. The batch route calls `batchUpsertAllocations` in a DB transaction with `onConflictDoUpdate`. On reload, `useAllocations` fetches from `/api/allocations?personId=X` which queries the DB via `listAllocationsForPerson`. |
| 4 | Past-month cells are visually distinct and reject input attempts | VERIFIED | `buildColumnDefs` sets `editable: (params) => !params.node?.isRowPinned() && month >= currentMonth` — past months return false. `cellClass` adds `bg-surface-container-low`, `text-outline`, `opacity-60` for `month < currentMonth`. |

**Score:** 4/4 success criteria verified

---

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/features/allocations/allocation.service.ts` | `listAllocationsForPerson`, `batchUpsertAllocations` | Yes | Yes — real DB query with JOIN + transaction | Imported by both API routes | VERIFIED |
| `src/app/api/allocations/route.ts` | GET endpoint for person allocations | Yes | Yes — `export async function GET`, reads `personId`, calls service | Consumed by `useAllocations` hook | VERIFIED |
| `src/app/api/allocations/batch/route.ts` | POST endpoint for batch upsert | Yes | Yes — `export async function POST`, validates with Zod, calls service | Consumed by `useGridAutosave` | VERIFIED |
| `src/lib/capacity.ts` | `calculateStatus`, `getStatusColor` | Yes | Yes — correct thresholds per INPUT-05 | Imported by `grid-config.ts` and `status-cell.tsx` | VERIFIED |
| `src/lib/date-utils.ts` | `generateMonthRange`, `getCurrentMonth`, `formatMonthHeader` | Yes | Yes — all 4 functions implemented | Imported by `allocation-grid.tsx`, `grid-config.ts`, `allocation.service.ts` | VERIFIED |

#### Plan 02 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/components/grid/allocation-grid.tsx` | Main AG Grid component with `AgGridReact` | Yes | Yes — 147 lines, full implementation with local state SUMMA | Imported and rendered by `/input/[personId]/page.tsx` | VERIFIED |
| `src/components/grid/grid-config.ts` | `buildColumnDefs`, `computePinnedRows`, `transformToGridRows` | Yes | Yes — 166 lines, all four exported pure functions implemented | Imported by `allocation-grid.tsx` | VERIFIED |
| `src/hooks/use-allocations.ts` | `useAllocations`, `usePersonDetail` | Yes | Yes — TanStack Query hooks, fetch from live API endpoints | Imported by `/input/[personId]/page.tsx` | VERIFIED |
| `src/hooks/use-grid-autosave.ts` | `useGridAutosave` with 300ms debounce | Yes | Yes — pendingRef Map deduplication, flush to `/api/allocations/batch` | Imported by `/input/[personId]/page.tsx`, `onCellChange` wired to `AllocationGrid` | VERIFIED |
| `src/components/grid/cell-renderers/status-cell.tsx` | Color-coded status dot via `StatusCell` | Yes | Yes — calls `getStatusColor`, renders colored dot with title tooltip | Registered in `AllocationGrid.components`, selected by `cellRendererSelector` in `buildColumnDefs` | VERIFIED |
| `src/app/(app)/input/[personId]/page.tsx` | Person input form page rendering `AllocationGrid` | Yes | Yes — renders `AllocationGrid` with all props wired from hooks | Route exists at `/input/[personId]`, linked from `/input` listing page | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `allocation-grid.tsx` | `use-grid-autosave.ts` | `onCellChange -> handleCellChange` | WIRED | `handleCellValueChanged` calls `onCellChange({ projectId, month, hours })`, page passes `handleCellChange` as `onCellChange` |
| `allocation-grid.tsx` | `local useState<GridRow[]>` | `setLocalRowData` in `handleCellValueChanged` | WIRED | Line 99-103: `setLocalRowData((prev) => prev.map(...))` runs synchronously before `onCellChange` |
| `use-grid-autosave.ts` | `/api/allocations/batch` | fetch POST with debounced pending changes | WIRED | Line 27: `fetch('/api/allocations/batch', { method: 'POST', ... })` |
| `use-allocations.ts` | `/api/allocations` | fetch GET with personId | WIRED | Line 12: `fetch(\`/api/allocations?personId=${personId}\`)` |
| `allocation-grid.tsx` | `grid-config.ts` | import `buildColumnDefs`, `computePinnedRows`, `transformToGridRows` | WIRED | Lines 15-19: all four functions imported and called |
| `/input/[personId]/page.tsx` | `allocation-grid.tsx` | renders `AllocationGrid` | WIRED | Line 75: `<AllocationGrid ... />` with all props populated from hooks |
| `src/app/api/allocations/route.ts` | `allocation.service.ts` | import `listAllocationsForPerson` | WIRED | Line 3: `import { listAllocationsForPerson }` |
| `src/app/api/allocations/batch/route.ts` | `allocation.service.ts` | import `batchUpsertAllocations` | WIRED | Line 5: `import { batchUpsertAllocations }` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `allocation-grid.tsx` | `localRowData` (rendered in `AgGridReact`) | `allocations` prop → `transformToGridRows` → `useState` | Yes — `allocations` prop comes from `useAllocations` hook which fetches `/api/allocations?personId`, which queries `schema.allocations` JOIN `schema.projects` via Drizzle ORM | FLOWING |
| `allocation-grid.tsx` | `pinnedBottomRowData` (SUMMA/Target/Status) | `computePinnedRows(localRowData, months, targetHours)` | Yes — computed from live `localRowData`, `targetHours` comes from `usePersonDetail` fetching `/api/people/[personId]` | FLOWING |
| `use-grid-autosave.ts` | POST body `{ allocations: batch }` | `pendingRef.current` populated by cell edits | Yes — each cell edit appends to the pending Map, flush POSTs to batch API which runs DB transaction | FLOWING |
| `status-cell.tsx` | `props.value` (CapacityStatus) | `computePinnedRows` → `calculateStatus(sum, targetHours)` | Yes — `sum` is derived from real row data, `targetHours` from DB person record | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — app requires a running Next.js server. The grid is a client-side AG Grid component and cannot be spot-checked without starting the dev server.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INPUT-01 | 06-01, 06-02 | Person Input Form displays AG Grid with months as columns, projects as rows, hours as cell values | SATISFIED | `AllocationGrid` renders `AgGridReact` with `buildColumnDefs` (month columns) and `transformToGridRows` (project rows). Hours are editable cell values with `valueParser`. |
| INPUT-02 | 06-01, 06-02 | User can click a cell, type hours (0-999), and the value saves on blur within 500ms | SATISFIED | `singleClickEdit={true}`, `stopEditingWhenCellsLoseFocus={true}`, `valueParser` enforces 0-999, `useGridAutosave` fires at 300ms debounce on blur. |
| INPUT-03 | 06-02 | SUMMA row calculates sum of all project hours per month in real time | SATISFIED | `computePinnedRows` sums `Number(row[month])` across all data rows. Pinned rows recompute from `localRowData` via `useMemo` on every cell edit. |
| INPUT-04 | 06-02 | Target row shows configurable monthly capacity target per person (default 160h) | SATISFIED | `computePinnedRows` sets `targetRow[month] = targetHours` for each month. `targetHours` comes from `person.targetHoursPerMonth` fetched from API. |
| INPUT-05 | 06-01, 06-02 | Status row shows color-coded indicator: green (<90%), amber (90-100%), red (>100%), gray (no allocations) | SATISFIED | `calculateStatus` in `capacity.ts` implements exact thresholds. `computePinnedRows` calls it per month. `StatusCell` renderer renders colored dot via `getStatusColor`. |
| INPUT-08 | 06-02 | Dynamic project rows — "Add project..." row at bottom, minimum 1 empty row | SATISFIED | `createAddProjectRow()` creates `__add__` row appended to grid. `ProjectCell` renders a button for `isAddRow`. Page wires `handleAddProject` → `setShowProjectSelector(true)` → `handleProjectSelected` → `setAddedProjects`. `transformToGridRows` merges `addedProjects` as zero-hour rows. |
| INPUT-12 | 06-01, 06-02 | Past months are read-only, current + future months are editable | SATISFIED | `editable: (params) => !params.node?.isRowPinned() && month >= currentMonth`. Past-month `cellClass` adds `opacity-60` with muted color classes. |
| INPUT-13 | 06-01, 06-02 | Auto-save on cell blur with debounced batch upsert | SATISFIED | `stopEditingWhenCellsLoseFocus={true}` triggers `onCellValueChanged` on blur. `useGridAutosave` debounces at 300ms, deduplicates by `projectId:month`, POSTs to `/api/allocations/batch` which runs a DB transaction. |

**Note on tracker table in REQUIREMENTS.md:** The status tracking table at lines 142-154 shows INPUT-01/02/12/13 as "In Progress" and INPUT-03/04/05/08 as "Pending". This is stale metadata — the checklist above it correctly marks all 8 as `[x]` completed. The tracker table is documentation drift and does not reflect implementation state.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `REQUIREMENTS.md` tracker table | 142-154 | Status tracking table shows phase-6 requirements as "In Progress" / "Pending" instead of "Done" | Info | Documentation drift only — does not affect runtime behavior. The checklist (lines 36-48) correctly marks all 8 as complete. |

No code anti-patterns found. No TODO/FIXME/placeholder comments in any phase-6 source files. No empty implementations or return stubs. All data flows are wired to real DB queries.

---

### Human Verification Required

#### 1. Grid renders correctly in browser

**Test:** Navigate to `/input`, click a person, observe the AG Grid.
**Expected:** Grid displays with a pinned "Project" column on the left, 12 month columns (6 past, current, 5 future), project name rows for existing allocations, and pinned bottom rows labeled SUMMA, Target, Status.
**Why human:** AG Grid rendering (correct column widths, theming, CSS class application) cannot be verified without a running browser.

#### 2. SUMMA updates in real time without page refresh

**Test:** Click a past-hour cell in a current/future month and type a new number. Click away.
**Expected:** SUMMA row for that column updates immediately as the new value is entered (before any network round-trip completes).
**Why human:** Real-time reactivity requires observing DOM updates in a live browser.

#### 3. Past-month cells visually reject input

**Test:** Click on a cell in a past-month column.
**Expected:** Cell does not enter edit mode. Visual opacity/color change distinguishes it from editable cells.
**Why human:** AG Grid's `editable: false` behavior and CSS class application must be confirmed visually.

#### 4. Auto-save persists across page reload

**Test:** Edit a cell value, wait 1 second, then reload the page.
**Expected:** The edited value is still shown after reload (confirming the debounced POST reached the DB).
**Why human:** Requires live browser interaction and network confirmation.

#### 5. Add project flow works end-to-end

**Test:** Click the "+ Add project..." row. Select a project from the dropdown.
**Expected:** A new row appears in the grid for the selected project with all month cells set to 0 and editable.
**Why human:** Requires interactive browser testing of the selector UI.

---

### Gaps Summary

No gaps. All 4 success criteria are verified against actual codebase artifacts. All 8 requirement IDs (INPUT-01 through INPUT-05, INPUT-08, INPUT-12, INPUT-13) are satisfied by substantive, wired implementations with real data flowing from the DB through the API to the AG Grid component. Four commits (a5d7c89, f35b1cf, 2f010d8, d9b96f8) are confirmed in git history.

---

_Verified: 2026-03-26T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
