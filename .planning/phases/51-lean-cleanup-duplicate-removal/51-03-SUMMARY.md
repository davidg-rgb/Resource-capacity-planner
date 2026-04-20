---
phase: 51-lean-cleanup-duplicate-removal
plan: 03
subsystem: dashboard, pdf-export, testing
tags: [regression-test, integration-test, lean-validation, rollback-verification]
dependency_graph:
  requires: [uiV6LeanTrim-flag, widget-fallback, dead-widget-migration, heat-map-summary-card, trimmed-layouts, legacy-rollback]
  provides: [lean-phase-validation, pdf-regression-guard]
  affects: []
tech_stack:
  added: []
  patterns: [structural-regression-test, fs-based-config-assertion]
key_files:
  created:
    - src/features/dashboard/pdf-export/__tests__/team-heatmap-regression.test.ts
    - src/features/dashboard/__tests__/lean-trim-integration.test.ts
  modified: []
decisions:
  - "Used structural widget-resolution approach for PDF regression (not pixel comparison) — validates no blank tiles from unregistered widget references"
  - "Redirect assertions use fs.readFileSync on next.config.ts since build-time config cannot be imported in vitest"
  - "LEAN-09 cross-referenced to widget-fallback.test.ts rather than duplicating"
metrics:
  duration: ~3min
  completed: "2026-04-20"
  tasks: 1/1
  files_modified: 0
  files_created: 2
  tests_added: 33
---

# Phase 51 Plan 03: PDF Regression + Lean-Trim Integration Test Summary

**Structural PDF regression test proving no unresolvable widget references in manager layouts, plus comprehensive integration test covering all 10 LEAN requirements with LEGACY_LAYOUTS rollback verification**

## Task Results

### Task 1: PDF regression test + lean-trim integration test + rollback verification

- **team-heatmap-regression.test.ts** (8 tests): Verifies every widgetId in manager:desktop and manager:mobile layouts resolves via `getWidget()`. Asserts `heat-map-summary-card` is present and `utilization-heat-map` is absent. Proves PDF export cannot produce blank tiles from deleted widget references.

- **lean-trim-integration.test.ts** (25 tests): Covers all LEAN requirements:
  - LEAN-01..03: Reads next.config.ts and asserts all 4 redirect rules with permanent:true
  - LEAN-04: Reads input/page.tsx and confirms no usePeople, no `<ul>`, contains "Valj en person"
  - LEAN-06: Confirms discipline-progress, discipline-demand, project-impact return undefined from getWidget
  - LEAN-07: Confirms PL layouts have no kpi-cards/capacity-forecast/availability-finder
  - LEAN-08: Confirms manager layouts have heat-map-summary-card, no utilization-heat-map
  - LEAN-09: Cross-references widget-fallback.test.ts contract
  - LEAN-10: Verifies LEGACY_LAYOUTS has all 4 keys, preserves original widgets, getDefaultLayout(useLegacy=true) returns legacy layout

- **Commit:** d362b90

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored Plan 01 source changes lost in worktree merge**
- **Found during:** Task 1 (read_first phase)
- **Issue:** The merge commit ea71d70 did not carry over changes to next.config.ts, input/page.tsx, flag files, and dashboard-layout-engine from commits 158c0b9..81ec93a
- **Fix:** Cherry-picked file state from commit 81ec93a
- **Files modified:** next.config.ts, src/app/(app)/input/page.tsx, flag.service.ts, flag.types.ts, dashboard-layout-engine.tsx, export-pdf-modal.tsx, projects/[projectId]/page.tsx
- **Commit:** eb124fb

## Known Stubs

None - all test assertions target real production code.

## Self-Check: PASSED

- src/features/dashboard/pdf-export/__tests__/team-heatmap-regression.test.ts exists
- src/features/dashboard/__tests__/lean-trim-integration.test.ts exists
- Commit eb124fb found in git log (deviation fix)
- Commit d362b90 found in git log (task commit)
- 33 tests pass across both files
