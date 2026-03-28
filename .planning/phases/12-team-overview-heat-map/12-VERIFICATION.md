---
phase: 12-team-overview-heat-map
verified: 2026-03-28T14:00:00Z
status: human_needed
score: 9/9 automated must-haves verified
re_verification: false
human_verification:
  - test: "Navigate to /dashboard/team in a running dev server"
    expected: "Heat map table renders with colour-coded cells (red >100%, green 80-100%, yellow 50-79%, grey <50%), department rows are collapsible, filter controls update the URL and reload the table, clicking a person name navigates to /input/[personId], and the table scrolls horizontally with the Name column pinned"
    why_human: "All five TEAM requirements (TEAM-01 through TEAM-05) describe visual or interactive behaviour that cannot be confirmed by static code analysis"
  - test: "Disable the 'dashboards' feature flag for the test org and attempt to navigate to /dashboard/team"
    expected: "User is redirected away from the route (FlagGuard blocks access)"
    why_human: "Flag gating depends on runtime middleware / FlagGuard component evaluation that cannot be traced statically"
---

# Phase 12: Team Overview Heat Map — Verification Report

**Phase Goal:** Managers can see at a glance who is overloaded, underutilized, or healthy across the entire team and planning horizon
**Verified:** 2026-03-28T14:00:00Z
**Status:** human_needed (all automated checks pass; visual/interactive verification pending)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Analytics service returns per-person-per-month utilization data grouped by department | VERIFIED | `getTeamHeatMap` in `analytics.service.ts` uses a CTE with `generate_series` and groups into `DepartmentGroup[]` server-side (lines 56-149) |
| 2 | API endpoint validates filters and returns HeatMapResponse JSON | VERIFIED | `route.ts` validates `from`/`to` with `/^\d{4}-\d{2}$/`, returns `NextResponse.json(result)` or 400/500 on failure |
| 3 | Heat map status function uses TEAM-01 thresholds (over >100%, healthy 80-100%, under 50-79%, idle <50%) | VERIFIED | `calculateHeatMapStatus` in `capacity.ts` lines 49-56 implements exact thresholds; `calculateStatus` (INPUT-05) is unchanged |
| 4 | TanStack Query hook fetches and caches heat map data with 60s staleTime | VERIFIED | `useTeamHeatMap` in `use-team-heatmap.ts` has `staleTime: 60_000` and `queryKey: ['team-heatmap', filters]` |
| 5 | User sees a heat map table of all people x months with cells colour-coded by utilization | VERIFIED (code) | `HeatMapCell` applies `HEAT_MAP_COLORS[status]` class; rendered in `HeatMapTable` for every person x month |
| 6 | Heat map rows are grouped by department with collapsible sections | VERIFIED (code) | `HeatMapTable` uses `collapsedDepts: Set<string>`, `toggleDept`, `ChevronDown`/`ChevronRight` per dept group |
| 7 | User can filter by department, discipline, or date range via URL params | VERIFIED (code) | `TeamOverviewContent` reads `searchParams`, `setFilter` calls `router.replace`; `HeatMapFilters` renders four controls |
| 8 | Clicking a person name navigates to /input/[personId] | VERIFIED (code) | `HeatMapTable` line 78: `<Link href={\`/input/${person.personId}\`}>` |
| 9 | Heat map scrolls horizontally with sticky person name column | VERIFIED (code) | `overflow-x-auto` on outer div (line 31); `sticky left-0` on header `<th>` (line 35), dept header `<td>` (line 59), person name `<td>` (line 76) |

**Score:** 9/9 truths — all verified programmatically. Truths 5-9 additionally require human visual confirmation.

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Level 1: Exists | Level 2: Substantive | Level 3: Wired | Level 4: Data Flows | Status |
|----------|----------------|---------------------|---------------|--------------------|----|
| `src/features/analytics/analytics.types.ts` | Yes (37 lines) | All 5 interfaces exported: `HeatMapCell`, `HeatMapPerson`, `DepartmentGroup`, `HeatMapResponse`, `HeatMapFilters` | Imported by service, route, hook, and page | Types — no data flow applicable | VERIFIED |
| `src/features/analytics/analytics.service.ts` | Yes (151 lines) | Exports `getTeamHeatMap`; CTE with `generate_series`, `CROSS JOIN`, `LEFT JOIN allocations`, server-side grouping | Called by `route.ts` line 26 | `db.execute(sql\`...\`)` hits real tables (`people`, `departments`, `allocations`) | VERIFIED |
| `src/lib/capacity.ts` | Yes (64 lines) | Exports `calculateHeatMapStatus` + `HEAT_MAP_COLORS` alongside unchanged `calculateStatus`/`getStatusColor` | Used by `heat-map-cell.tsx` line 11 | Pure function — no data flow applicable | VERIFIED |
| `src/app/api/analytics/team-heatmap/route.ts` | Yes (36 lines) | Exports `GET`; validates params with regex; calls `getTenantId()` + `getTeamHeatMap()`; 400/500 error handling | Called by `useTeamHeatMap` fetch | Delegates to `getTeamHeatMap` which queries DB | VERIFIED |
| `src/hooks/use-team-heatmap.ts` | Yes (36 lines) | Exports `useTeamHeatMap`; `useQuery` with `queryKey`, `queryFn`, `staleTime: 60_000` | Used by `dashboard/team/page.tsx` line 37 | Fetches `/api/analytics/team-heatmap` which returns real DB data | VERIFIED |

### Plan 02 Artifacts

| Artifact | Level 1: Exists | Level 2: Substantive | Level 3: Wired | Status |
|----------|----------------|---------------------|---------------|--------|
| `src/components/heat-map/heat-map-cell.tsx` | Yes (20 lines) | Exports `HeatMapCell`; imports and applies `calculateHeatMapStatus` + `HEAT_MAP_COLORS` | Used in `heat-map-table.tsx` line 85 | VERIFIED |
| `src/components/heat-map/heat-map-filters.tsx` | Yes (68 lines) | Exports `HeatMapFilters`; renders dept/discipline selects from `useDepartments`/`useDisciplines`; date range inputs | Used in `dashboard/team/page.tsx` line 50 | VERIFIED |
| `src/components/heat-map/heat-map-table.tsx` | Yes (99 lines) | Exports `HeatMapTable`; `overflow-x-auto`, `sticky left-0`, `collapsedDepts`, `ChevronDown/Right`, `Link` to `/input/[personId]` | Used in `dashboard/team/page.tsx` line 69 | VERIFIED |
| `src/app/(app)/dashboard/team/page.tsx` | Yes (98 lines) | `'use client'`; `Suspense` boundary; reads 4 URL params; calls `useTeamHeatMap`; renders `HeatMapFilters` + `HeatMapTable`; loading/error/empty states; colour legend | Entry point for /dashboard/team route | VERIFIED |
| `src/app/(app)/dashboard/page.tsx` | Yes (29 lines) | Contains `Link` to `/dashboard/team` within a grid card | Navigation entry point for heat map | VERIFIED |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `route.ts` | `analytics.service.ts` | `getTeamHeatMap()` call | WIRED | Line 3 import + line 26 call in route.ts |
| `use-team-heatmap.ts` | `/api/analytics/team-heatmap` | `fetch` in `useQuery` | WIRED | Line 28: `fetch(\`/api/analytics/team-heatmap?${params}\`)` |
| `analytics.service.ts` | `src/db` | `db.execute(sql\`...\`)` with CTE | WIRED | Line 46: `await db.execute<{...}>(sql\`WITH month_series AS...\`)` |
| `dashboard/team/page.tsx` | `use-team-heatmap.ts` | `useTeamHeatMap()` call | WIRED | Line 6 import + line 37 call |
| `heat-map-cell.tsx` | `src/lib/capacity.ts` | `calculateHeatMapStatus` + `HEAT_MAP_COLORS` | WIRED | Line 3 import + lines 11+15 usage |
| `heat-map-table.tsx` | `heat-map-cell.tsx` | `<HeatMapCell>` in table cells | WIRED | Line 8 import + line 85 JSX usage |
| `heat-map-table.tsx` | `/input/[personId]` | `<Link href={\`/input/${person.personId}\`}>` | WIRED | Line 77-79 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `heat-map-table.tsx` | `data: HeatMapResponse` (prop) | Passed from `dashboard/team/page.tsx` → `useTeamHeatMap` → `GET /api/analytics/team-heatmap` → `getTeamHeatMap` | `db.execute` queries `people`, `departments`, `allocations` tables with `generate_series` CTE | FLOWING |
| `heat-map-filters.tsx` | `departments` / `disciplines` | `useDepartments()` + `useDisciplines()` from `use-reference-data.ts` | Hooks verified to exist and export (lines 14 and 115 of `use-reference-data.ts`) | FLOWING |
| `heat-map-cell.tsx` | `hours`, `targetHours` | Props drilled from `HeatMapTable` → `HeatMapResponse.departments[].people[].months` + `.targetHours` | Same DB path as `HeatMapTable` | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — verifying the Next.js app requires a running dev server. The API route, service, and hook are wired end-to-end but cannot be invoked without `pnpm dev`.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| TEAM-01 | 12-01, 12-02 | Heat map cells colour-coded by utilization (green 80-100%, yellow 50-79%, red >100%, grey <50%) | SATISFIED | `calculateHeatMapStatus` + `HEAT_MAP_COLORS` in `capacity.ts`; applied in `HeatMapCell` |
| TEAM-02 | 12-02 | Heat map rows grouped by department with collapsible sections | SATISFIED | `HeatMapTable` groups by `dept.departmentId`; `collapsedDepts` state + `toggleDept`; `ChevronDown`/`ChevronRight` chevrons |
| TEAM-03 | 12-01, 12-02 | User can filter heat map by department, discipline, or date range | SATISFIED | `HeatMapFilters` renders 4 controls; `dashboard/team/page.tsx` reads URL params and calls `router.replace` |
| TEAM-04 | 12-02 | User can click person name to navigate to their Person Input Form | SATISFIED | `<Link href={\`/input/${person.personId}\`}>` in `heat-map-table.tsx` line 78 |
| TEAM-05 | 12-02 | Heat map scrolls horizontally across 12-18 month planning horizon | SATISFIED | `overflow-x-auto` on wrapper div; `sticky left-0` on Name column header, dept header, and person name cell |

All 5 TEAM requirement IDs from REQUIREMENTS.md are claimed by plans 12-01 and 12-02 and have corresponding implementation evidence. No orphaned requirements detected.

---

## Anti-Patterns Found

No stub indicators, TODO/FIXME comments, empty return values, or hardcoded empty arrays found in any Phase 12 file. The `calculateStatus` function (INPUT-05 thresholds) in `capacity.ts` is confirmed unchanged alongside the new heat map additions.

---

## Human Verification Required

### 1. Full Heat Map Render Check

**Test:** Start `pnpm dev`, navigate to `/dashboard/team` with at least one department and person having allocations in the database.
**Expected:** Table renders with colour-coded cells matching TEAM-01 thresholds; colour legend below table matches cell colours; person names display as `LastName, FirstName`.
**Why human:** Cell colour rendering, text contrast, and layout fidelity cannot be confirmed from static file analysis.

### 2. Department Collapse / Expand (TEAM-02)

**Test:** Click a department header row on the heat map.
**Expected:** Person rows under that department hide (collapse). Click again — they re-appear (expand). Chevron icon toggles between right and down.
**Why human:** Interactive React state behaviour requires a live browser.

### 3. Filter Controls Update URL and Refetch (TEAM-03)

**Test:** Change the Department dropdown; observe the browser URL bar and the table content.
**Expected:** URL updates to include `?dept=<uuid>`; table re-fetches and shows only people from that department. Clearing the filter removes the param and shows all.
**Why human:** `router.replace` and `useSearchParams` integration requires a running Next.js router.

### 4. Person Name Navigation (TEAM-04)

**Test:** Click any person name in the heat map.
**Expected:** Browser navigates to `/input/<personId>` and the Person Input Form renders for that person.
**Why human:** Next.js `<Link>` navigation and the target route require a live dev server to confirm.

### 5. Horizontal Scroll with Sticky Column (TEAM-05)

**Test:** Load the heat map with 12+ months (default range). Scroll the table to the right.
**Expected:** Person name column remains visible and fixed at the left edge while month columns scroll underneath.
**Why human:** `sticky left-0` sticky positioning depends on the browser paint model, overflow context, and z-index stacking — cannot be confirmed statically.

### 6. Feature Flag Gating

**Test:** Disable the `dashboards` flag for the test org and attempt to visit `/dashboard` or `/dashboard/team`.
**Expected:** User is redirected away (FlagGuard blocks access).
**Why human:** Flag evaluation is runtime middleware that depends on the org's flag state in the database.

---

## Gaps Summary

No gaps found. All 9 automated truths pass all four verification levels (exists, substantive, wired, data-flowing). The 5 TEAM requirements are fully implemented with real DB-backed data. The phase goal is structurally complete; the only outstanding items are human visual/interactive confirmations listed above.

---

_Verified: 2026-03-28T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
