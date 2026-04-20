---
phase: "28"
plan: "01"
name: "Availability Finder + Resource Conflicts"
subsystem: dashboard-widgets
tags: [visualization, availability, conflicts, actions, modal]
dependency-graph:
  requires: [Phase 23 widget-registry, Phase 24 data-layer]
  provides: [availability-finder-widget, resource-conflict-widget, quick-assign-modal]
  affects: [widget-registry, dashboard-layouts]
tech-stack:
  added: []
  patterns: [widget-registration, shared-modal, localStorage-dismiss, batch-mutation]
key-files:
  created:
    - src/features/dashboard/widgets/availability-finder-widget.tsx
    - src/features/dashboard/widgets/resource-conflict-widget.tsx
    - src/features/dashboard/widgets/quick-assign-modal.tsx
  modified:
    - src/features/dashboard/widgets/index.ts
key-decisions:
  - Quick-assign modal is a shared component, not embedded in either widget
  - Conflict dismiss state stored in localStorage (not server-side)
  - Redistribute modal validates total <= target before allowing save
  - Both widgets in alerts-actions category, available on both dashboards
metrics:
  duration: ~15min
  completed: "2026-04-01"
---

# Phase 28 Plan 01: Availability Finder + Resource Conflicts Summary

Interactive search/filter availability panel and conflict resolution matrix with batch allocation actions.

## What Was Built

### V3: Availability Finder Widget (308 lines)
- **Filter bar** with discipline dropdown (useDisciplines), department dropdown (useDepartments), minimum available hours selector (Any/40h/80h/120h), and sort options (Most available/Least utilized/Name)
- **Ranked results list** showing person name (clickable for Person 360 Card), discipline abbreviation, department name
- **Per-month mini utilization bars** showing allocated portion (blue) vs available (green tinted empty) with "Xh free" label
- **Total available hours** summary per person across the date range
- **"Assign" button** per person opens QuickAssignModal pre-filled with person and time range
- **Empty state** with guidance to widen filters
- **Count badge** header: "Found X people with >=Yh available"
- Registered as `availability-finder` (alerts-actions, both dashboards, 12-col default)

### V9: Resource Conflict Matrix Widget (614 lines)
- **View toggle**: Current month vs Next 3 months
- **Conflict cards** sorted by severity (most overallocated first, capped at 3 with "Show more")
- **Per-project horizontal bars** showing allocation against target, with red overflow indicators
- **Target line indicator** showing the capacity boundary
- **Suggested resolution** display with auto-generated text and one-click "Apply Suggestion" button
- **"Redistribute Manually" modal** with per-project number inputs, live total validation (must be <= target)
- **"Dismiss" button** stores acknowledgement in localStorage, dismissed conflicts shown in collapsible section
- **History footer**: "X conflicts resolved this month, Y pending"
- **Person names** trigger Person 360 Card via usePersonCard hook
- Registered as `resource-conflicts` (alerts-actions, both dashboards, 12-col default)

### Quick-Assign Modal (shared, 291 lines)
- Project dropdown populated via useProjects hook
- Month range selector (from/to) with `<input type="month">`
- Uniform hours input with "Apply to all" button
- Per-month breakdown with individual hour inputs
- Saves via `POST /api/allocations/batch` (AllocationUpsert payload)
- Invalidates: availability-search, conflicts, allocations, alerts, alert-count, dashboard-kpis
- Error display and loading state during save

## Commits

- `328eb2c`: feat - availability finder, resource conflict, quick-assign modal, widget registry updates (committed as part of batch)

## Deviations from Plan

None - plan executed as written. Files were created and registered following the established widget wrapper pattern.

## Known Stubs

None - all components wire to real data hooks and the existing batch allocation API.

## Self-Check: PASSED
