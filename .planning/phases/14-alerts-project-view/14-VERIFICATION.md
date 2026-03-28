---
phase: 14-alerts-project-view
verified: 2026-03-28T14:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 14: Alerts & Project View Verification Report

**Phase Goal:** Planners receive proactive capacity warnings and can view staffing from the project perspective
**Verified:** 2026-03-28T14:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

**Plan 01 truths (ALRT-01 through ALRT-04):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a list of overloaded (>100%) and underutilized (<50%) people grouped by severity | VERIFIED | `alert-list.tsx` splits alerts into overloaded/underutilized sections with AlertTriangle and ArrowDownRight icons; `/alerts/page.tsx` calls `useAlerts` and renders `<AlertList alerts={data} />` |
| 2 | Alert badge in top nav shows count of active capacity alerts | VERIFIED | `top-nav.tsx` renders `<AlertBadge />` inside a `<Link href="/alerts">` wrapper guarded by `flags.alerts`; `alert-badge.tsx` calls `useAlertCount` and renders count span when count > 0 |
| 3 | Each alert links to the affected person's input form | VERIFIED | `alert-list.tsx` line 87: `<Link href={\`/input/${alert.personId}\`}>` on every person name |
| 4 | Alerts are computed on demand with no separate storage | VERIFIED | `analytics.service.ts` `getCapacityAlerts` runs a CTE SQL query at request time; no tables or background jobs; both API routes call service directly |

**Plan 02 truths (PROJ-01 through PROJ-04):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | User can select a project and see all people allocated to it with hours per month | VERIFIED | `projects/page.tsx` has "View" link column with `<Link href={\`/projects/${project.id}\`}>` and Eye icon for non-archived projects; `projects/[projectId]/page.tsx` calls `useProjectStaffing` and renders full staffing table |
| 6 | Project View shows a summary row with total hours per month | VERIFIED | `project-summary-row.tsx` computes per-month totals via `Array.reduce`; rendered in `<tfoot>` of the staffing table in the detail page |
| 7 | User can click a person name to navigate to their input form | VERIFIED | `project-staffing-grid.tsx` line 35: `<Link href={\`/input/${person.personId}\`}>` on every person name |
| 8 | Months with no allocations are visually distinct as understaffed | VERIFIED | `project-summary-row.tsx` applies `bg-amber-100 border-dashed border-amber-300 border` with "--" text and title tooltip when `total === 0 && hasPeople` |

**Score: 8/8 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/analytics/analytics.types.ts` | CapacityAlert, AlertSeverity, ProjectStaffingPerson, ProjectStaffingResponse types | VERIFIED | All 4 types present at lines 60-91; 91 lines total |
| `src/features/analytics/analytics.service.ts` | getCapacityAlerts, getAlertCount, getProjectStaffing functions | VERIFIED | All 3 exported at lines 372, 460, 516; real CTE SQL with DB queries, result mapping |
| `src/app/api/analytics/alerts/route.ts` | GET /api/analytics/alerts endpoint | VERIFIED | 39 lines; exports GET; flag-gated; calls getCapacityAlerts |
| `src/app/api/analytics/alerts/count/route.ts` | GET /api/analytics/alerts/count endpoint | VERIFIED | 39 lines; exports GET; flag-gated; calls getAlertCount |
| `src/app/api/analytics/project-staffing/route.ts` | GET /api/analytics/project-staffing endpoint | VERIFIED | 38 lines; exports GET; validates projectId + MONTH_RE; calls getProjectStaffing |
| `src/hooks/use-alerts.ts` | useAlerts, useAlertCount hooks | VERIFIED | 53 lines; both hooks exported with correct queryKeys and staleTime values |
| `src/hooks/use-project-staffing.ts` | useProjectStaffing hook | VERIFIED | 30 lines; exported; enabled: !!projectId guard; staleTime 60_000 |
| `src/components/alerts/alert-badge.tsx` | AlertBadge component with count overlay | VERIFIED | 24 lines; calls useAlertCount; renders red span when count > 0; returns null otherwise |
| `src/components/alerts/alert-list.tsx` | AlertList component with severity grouping | VERIFIED | 115 lines; groups by severity; person links to /input/{personId}; empty state |
| `src/app/(app)/alerts/page.tsx` | Alerts page at /alerts route | VERIFIED | 41 lines (>30 min); useAlerts wired; AlertList rendered; loading/error states |
| `src/components/layout/top-nav.tsx` | TopNav with alert badge wired into Bell button | VERIFIED | 178 lines; AlertBadge imported and rendered inside Link to /alerts; Alerts nav item added |
| `src/components/project-view/project-staffing-grid.tsx` | Staffing grid table with person rows and month columns | VERIFIED | 61 lines; ProjectStaffingGrid exported; person links to /input/{personId}; month column rendering |
| `src/components/project-view/project-summary-row.tsx` | Summary row with total hours and understaffed indicators | VERIFIED | 51 lines; ProjectSummaryRow exported; totals computed; amber understaffed indicator |
| `src/app/(app)/projects/[projectId]/page.tsx` | Project detail page at /projects/[projectId] | VERIFIED | 80 lines (>40 min); useProjectStaffing, ProjectStaffingGrid, ProjectSummaryRow all used |
| `src/app/(app)/projects/page.tsx` | Updated projects list with View Staffing link | VERIFIED | Contains "View" text and Eye icon; href /projects/${project.id} per non-archived project |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `alert-badge.tsx` | `/api/analytics/alerts/count` | `useAlertCount` hook | WIRED | `useAlertCount` imported and called; hook fetches `/api/analytics/alerts/count?from=…&to=…` |
| `alerts/page.tsx` | `/api/analytics/alerts` | `useAlerts` hook | WIRED | `useAlerts` imported and called; hook fetches `/api/analytics/alerts?from=…&to=…` |
| `alert-list.tsx` | `/input/${personId}` | Next.js Link | WIRED | `<Link href={\`/input/${alert.personId}\`}>` in AlertItem component |
| `top-nav.tsx` | `alert-badge.tsx` | AlertBadge rendered inside Bell wrapper | WIRED | `import { AlertBadge }` from alert-badge; rendered inside `{flags.alerts && <Link><Bell /><AlertBadge /></Link>}` |
| `projects/[projectId]/page.tsx` | `/api/analytics/project-staffing` | `useProjectStaffing` hook | WIRED | `useProjectStaffing(projectId, monthFrom, monthTo)` called; hook fetches `/api/analytics/project-staffing?projectId=…` |
| `project-staffing-grid.tsx` | `/input/${personId}` | Next.js Link on person names | WIRED | `<Link href={\`/input/${person.personId}\`}>` per person row |
| `projects/page.tsx` | `/projects/${project.id}` | View Staffing link in table row | WIRED | `<Link href={\`/projects/${project.id}\`}>` with Eye icon; column header "View" in table |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `alert-list.tsx` | `alerts: CapacityAlert[]` (prop) | `alerts/page.tsx` -> `useAlerts` -> `/api/analytics/alerts` -> `getCapacityAlerts` | CTE SQL with `generate_series`, people/departments/allocations joins, utilization filter | FLOWING |
| `alert-badge.tsx` | `count` from `useAlertCount` | -> `/api/analytics/alerts/count` -> `getAlertCount` | CTE SQL COUNT query against live allocation data | FLOWING |
| `project-staffing-grid.tsx` | `people: ProjectStaffingPerson[]` (prop) | `projects/[projectId]/page.tsx` -> `useProjectStaffing` -> `/api/analytics/project-staffing` -> `getProjectStaffing` | CTE SQL with `generate_series`, people/allocations CROSS JOIN, grouped per-person-per-month | FLOWING |
| `project-summary-row.tsx` | `people: ProjectStaffingPerson[]` (prop) | Same as above; totals computed client-side via `Array.reduce` | Derived from real DB data passed via props | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles without errors | `npx tsc --noEmit` | Zero output (exit 0) | PASS |
| useAlertCount hook exported from use-alerts.ts | grep "export function useAlertCount" | Found at line 34 | PASS |
| Alert count invalidated on allocation save | grep "alert-count" in use-grid-autosave.ts | Found at lines 87, 93, 136, 141 (4 invalidation calls across 2 paths) | PASS |
| Commit hashes from SUMMARY verified in git log | git log --oneline | f4991e2, dd7102d, 2ac3c00, bb04155, 4e3703d all present | PASS |
| No placeholder/stub patterns in new files | grep TODO/FIXME/PLACEHOLDER | No matches | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ALRT-01 | 14-01 | User can view a list of overloaded (>100%) and underutilized (<50%) people for the current period | SATISFIED | `/alerts/page.tsx` renders `AlertList` with `useAlerts` data; `AlertList` groups by severity |
| ALRT-02 | 14-01 | Alert badge in top nav shows count of active capacity alerts | SATISFIED | `AlertBadge` in `top-nav.tsx` inside flags.alerts guard; count from `useAlertCount` live API |
| ALRT-03 | 14-01 | Each alert links to the affected person's input form | SATISFIED | `<Link href={\`/input/${alert.personId}\`}>` in alert-list.tsx AlertItem |
| ALRT-04 | 14-01 | Alerts are computed on demand from current allocation data (no separate storage) | SATISFIED | Service functions run SQL at request time; no migration for alert table; no job scheduler |
| PROJ-01 | 14-02 | User can select a project and see all people allocated to it with hours per month | SATISFIED | "View" link on projects list -> `/projects/[projectId]` -> `ProjectStaffingGrid` with month columns |
| PROJ-02 | 14-02 | Project View shows a summary row with total hours per month across all people | SATISFIED | `ProjectSummaryRow` in `<tfoot>` computes per-month totals |
| PROJ-03 | 14-02 | User can click a person name in Project View to navigate to their Person Input Form | SATISFIED | `<Link href={\`/input/${person.personId}\`}>` per row in `project-staffing-grid.tsx` |
| PROJ-04 | 14-02 | Project View shows months with no allocations as visually distinct (understaffed indicator) | SATISFIED | `bg-amber-100 border-dashed border-amber-300 border` with "--" text when total == 0 and people exist |

**Orphaned requirements:** None. All 8 requirement IDs declared in plan frontmatter are covered. No additional Phase 14 IDs found in REQUIREMENTS.md.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

No TODO/FIXME/PLACEHOLDER comments, no empty return stubs, no hardcoded empty arrays in rendered components. All components receive data from live query hooks.

---

## Human Verification Required

### 1. Alert badge live refresh

**Test:** Enable alerts feature flag for a tenant. Open the app in a browser. In a separate tab, navigate to the Input page for a person and allocate hours that push their utilization over 100%. Return to any other page.
**Expected:** The bell icon badge count in TopNav increments within 30 seconds (matching the `staleTime: 30_000` + `refetchOnWindowFocus: true` setting), or immediately on next window focus.
**Why human:** Requires live browser session with a tenant that has the alerts flag enabled and real allocation data.

### 2. Amber understaffed indicator visual appearance

**Test:** Navigate to a project detail page (`/projects/[projectId]`) for a project that has allocations in some months but not all within the displayed 12-month window.
**Expected:** Months with zero total allocation show amber background cells with "--" text. Months with hours show the numeric total in bold.
**Why human:** Requires real project data; visual styling cannot be verified via grep.

### 3. Alerts page with flag disabled

**Test:** Disable the `alerts` flag for a tenant. Attempt to navigate to `/alerts`.
**Expected:** FlagGuard middleware redirects or blocks access. Bell icon is hidden in TopNav. The `/api/analytics/alerts` and `/api/analytics/alerts/count` routes return 403.
**Why human:** Requires flag configuration in the database and browser verification.

---

## Gaps Summary

No gaps found. All 8 observable truths verified, all 15 artifacts exist and are substantive, all 7 key links confirmed wired, all data flows traced to real database queries. TypeScript compiles clean. Commits f4991e2, dd7102d, 2ac3c00, bb04155, and 4e3703d are present in git log matching SUMMARY documentation.

---

_Verified: 2026-03-28T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
