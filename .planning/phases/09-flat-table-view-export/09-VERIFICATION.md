---
phase: 09-flat-table-view-export
verified: 2026-03-27T12:15:00Z
status: human_needed
score: 10/10 must-haves verified
human_verification:
  - test: "Visit /data and confirm flat table renders allocation rows"
    expected: "AG Grid table shows 6 columns: Person Name, Department, Project Name, Program, Month, Hours — rows populated from real data"
    why_human: "Visual rendering and real-data presence cannot be verified without a running app"
  - test: "Apply filters (person, project, department, month range) and confirm rows narrow"
    expected: "Each filter narrows the displayed rows; URL updates with filter params; Clear filters resets to all rows"
    why_human: "Filter interaction and URL state sync require browser execution"
  - test: "Navigate to page 2 and refresh the browser"
    expected: "Page 2 is still active after refresh; filter state is preserved in URL"
    why_human: "URL state persistence requires live browser behavior"
  - test: "Click Export > Export Excel (.xlsx) with filters applied"
    expected: "Browser downloads allocations-{date}.xlsx; file opens in Excel with correct columns (Person Name, Department, Project Name, Program, Month, Hours) and only filtered rows"
    why_human: "File download and binary content correctness require live execution"
  - test: "Click Export > Export CSV (.csv)"
    expected: "Browser downloads allocations-{date}.csv with correct data"
    why_human: "CSV download requires live execution"
  - test: "Confirm Import button and Flat/Pivot template download links are accessible in the action bar"
    expected: "Import button navigates to /data/import; template links trigger file downloads"
    why_human: "Navigation and download behavior require browser interaction"
---

# Phase 9: Flat Table View & Export Verification Report

**Phase Goal:** Users can view all allocation data in a sortable/filterable flat table and export it to Excel or CSV.
**Verified:** 2026-03-27T12:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths — Plan 01 (Backend)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/allocations/flat returns paginated allocation rows with person, department, project, program, month, hours | VERIFIED | `flat/route.ts` calls `listAllocationsFlat` + `countAllocationsFlat`, returns `{ rows, pagination }` JSON |
| 2 | GET /api/allocations/flat supports filtering by personId, projectId, departmentId, monthFrom, monthTo | VERIFIED | `buildFlatConditions` in service applies all 5 filters; route parses all 5 from search params |
| 3 | GET /api/allocations/export returns a downloadable .xlsx or .csv file with all matching rows | VERIFIED | `export/route.ts` sets `Content-Disposition: attachment; filename="allocations-{date}.{format}"`, returns `Uint8Array(buffer)` |
| 4 | Pagination response includes total count and totalPages for UI pagination controls | VERIFIED | Route returns `{ page, pageSize, total, totalPages: Math.ceil(total/pageSize) }` |

### Observable Truths — Plan 02 (UI)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | User sees a paginated table with Person Name, Department, Project Name, Program, Month, Hours columns | VERIFIED | `flat-table-columns.ts` defines all 6 `ColDef` entries; AG Grid uses `flatTableColumnDefs` |
| 6 | User can filter by person, project, department, and date range using dropdowns above the table | VERIFIED | `flat-table-filters.tsx` renders 3 `<select>` dropdowns + 2 `<input type="month">` pickers |
| 7 | Filters persist in URL search params so page refresh preserves the view | VERIFIED | `flat-table.tsx` reads all filters via `useSearchParams()`, writes via `router.push(pathname + '?' + params)` |
| 8 | User can click Export and download an .xlsx or .csv file containing all filtered data | VERIFIED | Export dropdown in `flat-table.tsx` builds `buildExportUrl()` including current filter params, renders `<a download>` links |
| 9 | Pagination controls allow navigating between pages and changing page size (25/50/100) | VERIFIED | `flat-table-pagination.tsx` renders Previous/Next buttons + page-size `<select>` with 25/50/100 options; wired to `setFilter('page'/'pageSize', ...)` |
| 10 | Import button and template links remain accessible in a compact action bar | VERIFIED | `data/page.tsx` renders Import link + Flat/Pivot template `<a download>` buttons in the header action bar |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/allocations/allocation.types.ts` | FlatTableRow, FlatTableFilters, FlatTableResponse types | VERIFIED | All 3 types present at lines 52-80 |
| `src/features/allocations/allocation.service.ts` | listAllocationsFlat, countAllocationsFlat, exportAllocationsFlat | VERIFIED | All 3 exported functions at lines 232, 254, 274; plus private helpers `buildFlatConditions` and `buildFlatBaseQuery` |
| `src/app/api/allocations/flat/route.ts` | GET handler for paginated flat table data | VERIFIED | 38-line handler with filter parsing, `Promise.all([list, count])`, JSON response |
| `src/app/api/allocations/export/route.ts` | GET handler for Excel/CSV file download | VERIFIED | 41-line handler with `Content-Disposition` header and `Uint8Array(buffer)` body |
| `src/hooks/use-flat-allocations.ts` | TanStack Query hook for flat table data | VERIFIED | `useFlatAllocations` with `keepPreviousData`, fetches `/api/allocations/flat` |
| `src/components/flat-table/flat-table.tsx` | AG Grid read-only flat table component | VERIFIED | Renders `AgGridReact` + `FlatTableFilters` + `FlatTablePagination` + export dropdown |
| `src/components/flat-table/flat-table-filters.tsx` | Filter bar with searchable dropdowns and month pickers | VERIFIED | 3 `<select>` dropdowns (person/project/dept), 2 `<input type="month">`, clear button |
| `src/components/flat-table/flat-table-pagination.tsx` | Pagination controls with page size selector | VERIFIED | Prev/Next buttons, "Page X of Y", rows-per-page `<select>` |
| `src/components/flat-table/flat-table-columns.ts` | AG Grid column definitions for flat table | VERIFIED | 6 `ColDef` entries with `flatTableColumnDefs` export |
| `src/app/(app)/data/page.tsx` | Restructured data page with flat table as primary content | VERIFIED | `<FlatTable>` inside `<Suspense>` as primary content; Import + template buttons in action bar |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `flat/route.ts` | `allocation.service.ts` | `listAllocationsFlat` + `countAllocationsFlat` | WIRED | `Promise.all([listAllocationsFlat(...), countAllocationsFlat(...)])` at line 26 |
| `export/route.ts` | `allocation.service.ts` | `exportAllocationsFlat` | WIRED | `exportAllocationsFlat(orgId, filters, format)` at line 23 |
| `allocation.service.ts` | `src/db/schema.ts` | Drizzle joins (allocations + people + departments + projects + programs) | WIRED | `innerJoin(people)`, `innerJoin(departments)`, `innerJoin(projects)`, `leftJoin(programs)` at lines 222-225 |
| `flat-table.tsx` | `use-flat-allocations.ts` | `useFlatAllocations` hook call | WIRED | `const { data, isLoading } = useFlatAllocations(filters)` at line 35 |
| `use-flat-allocations.ts` | `/api/allocations/flat` | fetch call with filter params | WIRED | `fetch('/api/allocations/flat?${params}')` at line 17 |
| `data/page.tsx` | `flat-table.tsx` | component import and render | WIRED | `import { FlatTable }` + `<FlatTable />` inside `<Suspense>` |
| `flat-table-filters.tsx` | `next/navigation useSearchParams` | URL search param state sync | WIRED | `useSearchParams()` + `router.push(pathname + '?' + params)` in `flat-table.tsx` — FlatTableFilters receives `onFilterChange` which calls `setFilter` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `flat-table.tsx` | `data?.rows` | `useFlatAllocations(filters)` → `fetch /api/allocations/flat` | Yes — `listAllocationsFlat` runs real Drizzle query with 4 JOINs | FLOWING |
| `export/route.ts` | `buffer` | `exportAllocationsFlat` → `listAllocationsFlat(pageSize: 100000)` | Yes — same real Drizzle query, no static fallback | FLOWING |
| `flat-table-filters.tsx` | People dropdown | `usePeople()` | Real API-backed hook (pre-existing) | FLOWING |
| `flat-table-filters.tsx` | Projects dropdown | `useProjects()` | Real API-backed hook (pre-existing) | FLOWING |
| `flat-table-filters.tsx` | Departments dropdown | `useDepartments()` | Real API-backed hook (pre-existing) | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — app requires Clerk env vars to run; no runnable entry point without full environment setup. TypeScript compilation (`tsc --noEmit`) passes with zero errors, confirming type-level correctness.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| IMPEX-11 | 09-01-PLAN, 09-02-PLAN | Flat table view with sorting, filtering, pagination for all allocation data | SATISFIED | AG Grid with 6 sortable columns, 5 filter types, pagination with page size selector — all wired to real Drizzle queries |
| IMPEX-12 | 09-01-PLAN, 09-02-PLAN | Excel/CSV export with current filters applied | SATISFIED | `buildExportUrl()` passes current filter params to `/api/allocations/export`; service builds SheetJS workbook from filtered rows |

No orphaned requirements — both IMPEX-11 and IMPEX-12 are claimed by both plans and have full implementation evidence.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `use-flat-allocations.ts` | 24 | `placeholderData: keepPreviousData` | None | This is intentional TanStack Query API for smooth pagination UX; not a stub |

No blockers, no warnings, no stubs found across all 9 phase files.

### Human Verification Required

#### 1. Flat Table Renders Real Data

**Test:** Log in and navigate to `/data`
**Expected:** AG Grid shows rows of allocation data with all 6 columns populated from the database
**Why human:** Visual rendering and row presence require a running app with seeded data

#### 2. Filter Interactions Narrow Results and Update URL

**Test:** Apply a person filter, then a date range filter; observe the URL and row count
**Expected:** URL gains `?personId=...&monthFrom=...` params; rows narrow to matching allocations; "Clear filters" link appears and resets all filters
**Why human:** Filter chaining behavior and URL update require browser interaction

#### 3. Page Refresh Preserves Filter State

**Test:** Apply filters, navigate to page 2, then refresh the browser tab
**Expected:** Same filters and page 2 are active after refresh (URL state preserved)
**Why human:** Browser refresh behavior requires a live app

#### 4. Excel Export Downloads a Valid File

**Test:** Apply a department filter, then click Export > Export Excel (.xlsx)
**Expected:** Browser downloads `allocations-{today}.xlsx`; file opens in Excel showing only the filtered department's allocations with the 6 column headers
**Why human:** File download trigger and binary XLSX correctness require live execution

#### 5. CSV Export Downloads a Valid File

**Test:** Click Export > Export CSV (.csv) with no filters applied
**Expected:** Browser downloads `allocations-{today}.csv`; file contains all allocations with correct headers
**Why human:** CSV file download and content correctness require live execution

#### 6. Import Button and Template Links Work

**Test:** Click Import button; separately click Flat template and Pivot template links
**Expected:** Import navigates to `/data/import`; template links download XLSX files
**Why human:** Navigation and download behavior require browser interaction

### Gaps Summary

No gaps found. All 10 must-have truths are VERIFIED across both plans. All artifacts exist at levels 1-4 (exist, substantive, wired, data-flowing). All 4 task commits (142784e, 679ab3c, d42f701, 6258029) are confirmed in git history. TypeScript compiles with zero errors. The only remaining items are the 6 human verification tests that require a running browser session with real data.

---

_Verified: 2026-03-27T12:15:00Z_
_Verifier: Claude (gsd-verifier)_
