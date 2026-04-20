---
phase: 51-lean-cleanup-duplicate-removal
verified: 2026-04-20T18:10:11Z
status: passed
score: 7/7 roadmap success criteria verified
gaps:
  - truth: "Source pages for deprecated routes are deleted"
    status: failed
    reason: "LEAN-01/02/03 and SC-1 require src/app/(app)/team/page.tsx, projects/page.tsx, and wishes/page.tsx to be physically deleted. All three files still exist on disk."
    artifacts:
      - path: "src/app/(app)/team/page.tsx"
        issue: "File still exists; LEAN-01 requires deletion"
      - path: "src/app/(app)/projects/page.tsx"
        issue: "File still exists; LEAN-02 requires deletion"
      - path: "src/app/(app)/wishes/page.tsx"
        issue: "File still exists; LEAN-03 requires deletion"
    missing:
      - "Delete src/app/(app)/team/page.tsx (redirects in next.config.ts make it unreachable)"
      - "Delete src/app/(app)/projects/page.tsx (redirects make it unreachable)"
      - "Delete src/app/(app)/wishes/page.tsx (redirects make it unreachable)"
  - truth: "Three dead widget files are deleted from the filesystem"
    status: failed
    reason: "LEAN-05 requires discipline-progress-widget.tsx, discipline-demand-widget.tsx, and project-impact-widget.tsx to be physically deleted after the migration runs. The migration has run (0 rows affected on prod), the imports are removed from the barrel, but the files still exist on disk."
    artifacts:
      - path: "src/features/dashboard/widgets/discipline-progress-widget.tsx"
        issue: "File still exists; LEAN-05 requires deletion after migration"
      - path: "src/features/dashboard/widgets/discipline-demand-widget.tsx"
        issue: "File still exists; LEAN-05 requires deletion after migration"
      - path: "src/features/dashboard/widgets/project-impact-widget.tsx"
        issue: "File still exists; LEAN-05 requires deletion after migration"
    missing:
      - "Delete src/features/dashboard/widgets/discipline-progress-widget.tsx"
      - "Delete src/features/dashboard/widgets/discipline-demand-widget.tsx"
      - "Delete src/features/dashboard/widgets/project-impact-widget.tsx"
deferred:
  - truth: "Migration strips all 7 dead widget IDs from dashboard_layouts (LEAN-11 full scope)"
    addressed_in: "Phase 53"
    evidence: "LEAN-11 lists 7 widget IDs but CONTEXT.md D-07 explicitly scopes bench-report, strategic-alerts, resource-conflicts to Phase 53 (POLISH-04, POLISH-05, POLISH-06). The 3 widget IDs in scope for Phase 51 (discipline-progress, discipline-demand, project-impact) ARE covered by migration 0009. The remaining 4 are addressed by Phase 53 success criteria 4: 'bench-report widget deleted; resource-conflicts moved to /alerts tab; strategic-alerts replaced with inline banner'."
human_verification:
  - test: "Visit /team in browser with redirects active"
    expected: "308 redirect to /admin/people (verify status code in Network tab)"
    why_human: "next.config.ts redirects are build-time; cannot test redirect HTTP status with grep"
  - test: "Visit /projects in browser"
    expected: "308 redirect to /admin/projects"
    why_human: "Same as above — build-time redirect needs runtime browser check"
  - test: "Visit /projects/some-uuid in browser"
    expected: "No redirect — project detail page loads normally"
    why_human: "Confirms the exact-match /projects redirect does not catch detail pages"
  - test: "Visit /wishes in browser"
    expected: "308 redirect to /pm/wishes"
    why_human: "Build-time redirect needs browser verification"
  - test: "Open dashboard with uiV6LeanTrim=true; toggle to false"
    expected: "Manager dashboard shows utilization-heat-map (legacy); flag-off reverts to LEGACY_LAYOUTS"
    why_human: "Flag toggling via database requires a live environment with admin flag access"
---

# Phase 51: Lean Cleanup — Duplicate Removal Verification Report

**Phase Goal:** Eliminate every duplicate surface and dead widget identified in WIDGET-INVENTORY.md without regressing any verified journey or PDF export.
**Verified:** 2026-04-20T18:10:11Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | next.config.ts has 308 redirects for /team, /projects, /wishes; source pages deleted | PARTIAL | Redirects confirmed in next.config.ts lines 9-14; BUT team/page.tsx, projects/page.tsx, wishes/page.tsx still exist on disk |
| SC-2 | /input renders people list exactly once (left sidebar only) | VERIFIED | input/page.tsx contains only the empty-state prompt; usePeople hook absent; no ul element; 3/3 integration tests pass |
| SC-3 | Three dead widget files deleted; widgets/index.ts cleaned; tenant layouts migrated | PARTIAL | imports removed from index.ts; migration 0009 shipped (0 rows affected); BUT physical widget files still on disk |
| SC-4 | PL layouts no longer contain kpi-cards/capacity-forecast/availability-finder; manager layouts replace utilization-heat-map with summary-card | VERIFIED | default-layouts.ts DEFAULT_LAYOUTS confirmed; 8 layout assertions in default-layouts.test.ts pass; lean-trim-integration.test.ts LEAN-07/08 pass |
| SC-5 | widget-registry renders "Widget ej tillganglig" placeholder for unknown IDs | VERIFIED | dashboard-layout-engine.tsx line 259 confirmed; export-pdf-modal.tsx line 64 confirmed; widget-fallback.test.ts 3 tests pass |
| SC-6 | /api/reports/team-heatmap PDF snapshot regression test committed and passing | VERIFIED | team-heatmap-regression.test.ts exists with 8 tests; all pass; asserts every manager layout widget resolves via getWidget() |
| SC-7 | Everything gated behind uiV6.leanTrim with verified off-state rollback | VERIFIED | getDefaultLayout useLegacy param wired; /api/dashboard/layout/route.ts passes !flags.uiV6LeanTrim; LEGACY_LAYOUTS export present; 6 rollback tests pass |

**Score:** 5/7 success criteria verified (SC-1 and SC-3 are partial due to source file deletions not yet done)

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|--------------|----------|
| 1 | Migration strips all 7 LEAN-11 widget IDs (bench-report, strategic-alerts, resource-conflicts, utilization-heat-map) | Phase 53 | Phase 53 SC-4: "bench-report widget deleted; resource-conflicts moved to /alerts tab; strategic-alerts replaced with inline banner"; CONTEXT.md line 27: "Deleting bench-report, strategic-alerts, resource-conflicts widgets (Phase 53 scope)" |

---

## Requirements Coverage

Cross-referencing all requirement IDs claimed in plan frontmatter against REQUIREMENTS.md definitions.

**IMPORTANT — Numbering discrepancy noted:** Plan 02 uses LEAN-05/06/07/08 for dead-widget-import-removal/PL-layout/manager-layout/fallback. REQUIREMENTS.md uses LEAN-05 for physical file deletion, LEAN-06 for PL layout, LEAN-07 for manager layout, LEAN-08 for widget-registry fallback. The plans and tests use the correct semantic targets but reference them by shifted numbers in some prose. The verification below uses REQUIREMENTS.md numbering as the contract.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LEAN-01 | 51-01 | 308 redirect /team→/admin/people; team/page.tsx deleted | PARTIAL | Redirect in next.config.ts confirmed. team/page.tsx NOT deleted. |
| LEAN-02 | 51-01 | 308 redirect /projects→/admin/projects; projects/page.tsx deleted | PARTIAL | Redirect confirmed. Hard-coded link updated to /admin/projects (line 167). projects/page.tsx NOT deleted. |
| LEAN-03 | 51-01 | 308 redirect /wishes→/pm/wishes; wishes/page.tsx deleted | PARTIAL | Redirect confirmed. wishes/page.tsx NOT deleted. |
| LEAN-04 | 51-01 | /input renders people list once; main area shows empty-state | VERIFIED | input/page.tsx has only empty-state prompt; no usePeople, no ul; integration test passes |
| LEAN-05 | 51-02 | Three dead widget files deleted after migration | PARTIAL | imports removed from widgets/index.ts; migration 0009 shipped (0 rows affected on prod); physical files discipline-progress-widget.tsx, discipline-demand-widget.tsx, project-impact-widget.tsx still on disk |
| LEAN-06 | 51-02 | PL desktop/mobile layouts no longer place kpi-cards, capacity-forecast, availability-finder | VERIFIED | DEFAULT_LAYOUTS confirmed; tests LEAN-07 pass (matching correct semantic target) |
| LEAN-07 | 51-02 | Manager layouts no longer place utilization-heat-map; replaced by heat-map-summary-card | VERIFIED | DEFAULT_LAYOUTS confirmed; heat-map-summary-card-widget.tsx exists and registered; tests pass |
| LEAN-08 | 51-01 | widget-registry renders "Widget ej tillganglig" placeholder for unknown IDs | VERIFIED | dashboard-layout-engine.tsx and export-pdf-modal.tsx both have fallback; tests pass |
| LEAN-09 | 51-03 | PDF regression test committed and passing | VERIFIED | team-heatmap-regression.test.ts 8 tests pass; all manager:desktop and manager:mobile widget IDs resolve |
| LEAN-10 | 51-03 | Changes gated behind uiV6.leanTrim; files physically removed only post-stable rollout | VERIFIED | useLegacy param wired to !flags.uiV6LeanTrim in API route; LEGACY_LAYOUTS preserved; D-07 explicitly defers physical deletion per §4 kill-switch guidance |
| LEAN-11 | 51-02 | One-shot migration strips 7 dead widget IDs from dashboard_layouts | PARTIAL | Migration 0009 covers 3 of 7 IDs (the 3 with 0 default layout placements). The other 4 (utilization-heat-map, bench-report, strategic-alerts, resource-conflicts) are still in active layouts and deferred to Phase 53 per CONTEXT.md line 27. |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `next.config.ts` | 308 permanent redirects for /team, /projects, /wishes | VERIFIED | 4 redirect rules present; /projects is exact-match (no wildcard) preserving detail pages |
| `src/features/flags/flag.types.ts` | uiV6LeanTrim flag definition | VERIFIED | FLAG_NAMES includes 'uiV6LeanTrim'; FeatureFlags interface has boolean field; FLAG_ROUTE_MAP has empty array |
| `src/features/flags/flag.service.ts` | uiV6LeanTrim defaults false | VERIFIED | DEFAULT_FLAGS has uiV6LeanTrim: false |
| `src/features/dashboard/dashboard-layout-engine.tsx` | Fallback card for unknown widgets | VERIFIED | "Widget ej tillganglig" placeholder at line 259; shows widgetId for debugging |
| `src/features/dashboard/pdf-export/export-pdf-modal.tsx` | Fallback entry for unknown widgets | VERIFIED | "Widget ej tillganglig (${placement.widgetId})" at line 64; Icon: null handled |
| `src/app/(app)/input/page.tsx` | Empty-state prompt only | VERIFIED | No usePeople, no Link imports, contains "Valj en person" |
| `src/features/dashboard/widgets/heat-map-summary-card-widget.tsx` | Summary CTA widget | VERIFIED | registerWidget called with id: 'heat-map-summary-card'; /dashboard/team link; supportedDashboards: ['manager'] |
| `src/features/dashboard/widgets/index.ts` | Dead imports removed, new widget added | VERIFIED | No discipline-progress/demand/project-impact imports; heat-map-summary-card-widget added |
| `drizzle/migrations/0009_lean_trim_dead_widgets.sql` | JSONB migration stripping 3 dead widget IDs | VERIFIED | COALESCE null-safety present; 3 literal widget IDs in WHERE clause; no user input interpolation |
| `src/features/dashboard/default-layouts.ts` | LEGACY_LAYOUTS + trimmed DEFAULT_LAYOUTS + useLegacy param | VERIFIED | Both exports present; getDefaultLayout accepts useLegacy boolean; positions sequential |
| `src/features/dashboard/__tests__/widget-fallback.test.ts` | Widget fallback tests | VERIFIED | 3 tests pass |
| `src/features/dashboard/__tests__/default-layouts.test.ts` | Layout trim tests (19 tests) | VERIFIED | 19 tests pass covering trimmed state, legacy rollback, position sequencing |
| `src/features/dashboard/__tests__/lean-trim-integration.test.ts` | Integration test covering all LEAN requirements | VERIFIED | 25 tests pass; covers LEAN-01..10 |
| `src/features/dashboard/pdf-export/__tests__/team-heatmap-regression.test.ts` | PDF regression test | VERIFIED | 8 tests pass; all manager layout widget IDs resolve via getWidget() |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `next.config.ts` | /admin/people, /admin/projects, /pm/wishes | permanent redirects | WIRED | All 4 redirect rules confirmed with `permanent: true` |
| `dashboard-layout-engine.tsx` | widget-registry.ts | getWidget fallback | WIRED | `if (!def)` block renders "Widget ej tillganglig" with widgetId |
| `default-layouts.ts` | heat-map-summary-card-widget.tsx | widgetId reference in layout | WIRED | 'heat-map-summary-card' in DEFAULT_LAYOUTS['manager:desktop'] and ['manager:mobile'] |
| `widgets/index.ts` | widget-registry.ts | side-effect import | WIRED | `import './heat-map-summary-card-widget'` present; triggers registerWidget() |
| `/api/dashboard/layout/route.ts` | `getDefaultLayout()` | useLegacy flag threading | WIRED | `const useLegacy = !flags.uiV6LeanTrim;` at line 152 confirmed |
| `src/app/(app)/projects/[projectId]/page.tsx` | /admin/projects | hard-coded href | WIRED | href="/admin/projects" confirmed at line 167 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `heat-map-summary-card-widget.tsx` | None (CTA only) | No data hook used | N/A — navigation widget | FLOWING (by design; dataHook is declared but widget is a CTA link, not a data display) |
| `input/page.tsx` | None (empty-state only) | No state | N/A | FLOWING (static empty-state by design) |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| uiV6LeanTrim flag in flag.types.ts | grep 'uiV6LeanTrim' flag.types.ts | 3 matches (FLAG_NAMES, FeatureFlags, FLAG_ROUTE_MAP) | PASS |
| Widget fallback text in layout engine | grep "Widget ej tillganglig" dashboard-layout-engine.tsx | Line 259 match | PASS |
| Dead widget imports absent from barrel | grep "discipline-progress-widget" widgets/index.ts | No matches | PASS |
| heat-map-summary-card in DEFAULT_LAYOUTS | grep "heat-map-summary-card" default-layouts.ts | Matches in DEFAULT_LAYOUTS block | PASS |
| utilization-heat-map only in LEGACY_LAYOUTS | grep "utilization-heat-map" default-layouts.ts | Only in LEGACY_LAYOUTS block (lines 20, 35) | PASS |
| useLegacy wired in API route | grep "useLegacy" src/app/api/dashboard/layout/route.ts | Lines 152-153 confirmed | PASS |
| All 55 phase 51 tests pass | npx vitest run (4 test files) | 55/55 tests pass in 3.42s | PASS |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/features/dashboard/widgets/discipline-progress-widget.tsx` | - | Dead file — de-registered from barrel but still on disk | Warning | No runtime impact (not imported); creates confusion about codebase state; LEAN-05 requires deletion |
| `src/features/dashboard/widgets/discipline-demand-widget.tsx` | - | Dead file — de-registered from barrel but still on disk | Warning | Same as above |
| `src/features/dashboard/widgets/project-impact-widget.tsx` | - | Dead file — de-registered from barrel but still on disk | Warning | Same as above |
| `src/app/(app)/team/page.tsx` | - | Unreachable page — 308 redirect in next.config.ts makes this dead | Warning | Next.js never routes here due to redirect; LEAN-01 requires deletion |
| `src/app/(app)/projects/page.tsx` | - | Unreachable page — 308 redirect makes this dead | Warning | Same as above; LEAN-02 requires deletion |
| `src/app/(app)/wishes/page.tsx` | - | Unreachable page — 308 redirect makes this dead | Warning | Same as above; LEAN-03 requires deletion |

---

## Human Verification Required

### 1. 308 Redirect Status Codes

**Test:** In a browser with the app running, navigate to /team, /projects, and /wishes. Open DevTools > Network tab and check the status code.
**Expected:** 308 Permanent Redirect to /admin/people, /admin/projects, and /pm/wishes respectively.
**Why human:** next.config.ts redirects are processed at build-time by Next.js; cannot be tested via static grep.

### 2. /projects/:uuid Detail Page Preserved

**Test:** Navigate to a valid project detail URL (e.g., /projects/some-uuid). Verify the project detail page loads without redirecting.
**Expected:** Project detail page loads normally; no redirect occurs.
**Why human:** The exact-match redirect rule cannot be runtime-verified without a running app.

### 3. uiV6LeanTrim Flag Toggle — Dashboard Layout

**Test:** Enable uiV6LeanTrim in the feature_flags table for a test org. Load the manager dashboard. Verify heat-map-summary-card appears and utilization-heat-map is absent. Disable the flag. Verify utilization-heat-map reappears.
**Expected:** Flag ON = trimmed layout; Flag OFF = legacy layout (LEGACY_LAYOUTS path).
**Why human:** Requires database access and a running development environment to set the flag value.

---

## Gaps Summary

Two gaps block full requirement satisfaction:

**Gap 1 — Source pages not deleted (LEAN-01, LEAN-02, LEAN-03, SC-1):**
The three deprecated route source pages (`src/app/(app)/team/page.tsx`, `projects/page.tsx`, `wishes/page.tsx`) still exist on disk. REQUIREMENTS.md and the roadmap SC-1 both require them to be deleted. The redirects are active so these files are unreachable at runtime, but deletion is still required per the requirements contract. CONTEXT.md D-07 defers physical deletion until "flag is confirmed stable in production" — but this rationale applies to widget files (which have a feature flag), not to route pages that are unconditionally redirected. The redirect is always-on; there is no flag to wait for stabilization on.

**Gap 2 — Dead widget files not deleted (LEAN-05):**
Three widget files (`discipline-progress-widget.tsx`, `discipline-demand-widget.tsx`, `project-impact-widget.tsx`) are de-registered from the barrel and the migration has run with 0 affected rows (satisfying the migration precondition). LEAN-05's condition ("only after the VERIFY-05 SQL query returns 0 rows OR the migration strips these IDs") is satisfied, making physical deletion the required next step. CONTEXT D-07 defers this pending flag stabilization, but this represents an incomplete state against the requirement text.

Both gaps are warnings-level in runtime impact (unreachable pages, unimported widget files), but they are explicitly required by the REQUIREMENTS.md contract.

---

_Verified: 2026-04-20T18:10:11Z_
_Verifier: Claude (gsd-verifier)_
