---
phase: 51-lean-cleanup-duplicate-removal
plan: 01
subsystem: flags, routing, dashboard
tags: [feature-flag, redirects, widget-fallback, cleanup]
dependency_graph:
  requires: []
  provides: [uiV6LeanTrim-flag, 308-redirects, widget-fallback]
  affects: [next.config.ts, flag-system, dashboard-layout-engine, input-page]
tech_stack:
  added: []
  patterns: [next-config-redirects, defensive-widget-rendering]
key_files:
  created:
    - src/features/dashboard/__tests__/widget-fallback.test.ts
  modified:
    - src/features/flags/flag.types.ts
    - src/features/flags/flag.service.ts
    - next.config.ts
    - src/app/(app)/projects/[projectId]/page.tsx
    - src/features/dashboard/dashboard-layout-engine.tsx
    - src/features/dashboard/pdf-export/export-pdf-modal.tsx
    - src/app/(app)/input/page.tsx
decisions:
  - "308 redirects are always-on (build-time), not flag-gated — rollback = revert next.config.ts"
  - "/projects redirect is exact-match only (no wildcard) to preserve /projects/[projectId] detail pages"
  - "Widget fallback is always-on safety net, not flag-gated"
metrics:
  duration: ~4min
  completed: "2026-04-20"
  tasks: 2/2
  files_modified: 7
  files_created: 1
  tests_added: 3
---

# Phase 51 Plan 01: Feature Flag + Redirects + Widget Fallback Summary

**uiV6LeanTrim flag registered, 308 permanent redirects for 3 deprecated routes, widget fallback placeholder for unknown IDs, /input duplicate people list removed**

## Task Results

### Task 1: Feature flag + 308 redirects + hard-coded link fix
- Registered `uiV6LeanTrim` flag (defaults `false`) in flag.types.ts and flag.service.ts
- Added 4 redirect rules in next.config.ts: `/team` + `/team/:path*` -> `/admin/people`, `/projects` -> `/admin/projects`, `/wishes` -> `/pm/wishes`
- Fixed hard-coded `/projects` link in project detail page to `/admin/projects`
- All 799 existing tests pass
- **Commit:** 158c0b9

### Task 2: Widget fallback placeholder + /input empty-state
- Unknown widget IDs now render "Widget ej tillganglig" placeholder card in dashboard grid (shows widget ID for debugging)
- PDF export modal renders fallback entry with null Icon handled gracefully
- `/input` page replaced with empty-state prompt (removed usePeople hook and Link imports)
- Created widget-fallback.test.ts with 3 tests verifying registry contract
- **Commit:** 81ec93a

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all implementations are fully wired with real data sources.

## Self-Check: PASSED

- All 7 modified/created files exist on disk
- Both commits (158c0b9, 81ec93a) found in git log
- uiV6LeanTrim appears 3 times in flag.types.ts
- "Widget ej tillganglig" present in dashboard-layout-engine.tsx
- usePeople absent from input/page.tsx (0 matches)
- "Valj en person" present in input/page.tsx (1 match)
