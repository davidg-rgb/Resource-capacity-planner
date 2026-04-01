---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Dashboard Visualizations & Customization
status: executing phase 23
stopped_at: Completed 23-04-PLAN.md (Widget Wrappers + Dashboard Refactor)
last_updated: "2026-04-01T12:58:00Z"
last_activity: 2026-04-01
progress:
  total_phases: 10
  completed_phases: 0
  total_plans: 0
  completed_plans: 7
  percent: 35
---

# Nordic Capacity -- Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)
Spec: .planning/DASHBOARD-VISUALIZATIONS-SPEC.md (v2.0)
UX Review: .planning/V13-SCENARIO-UX-REVIEW.md
Roadmap: .planning/ROADMAP-V4.md

**Core value:** Customizable dashboard with 13 visualizations that make the tool irreplaceable vs Excel
**Current focus:** v4.0 build — Phase 23 (Dashboard Framework) + Phase 24 (Data Layer) in parallel

## Current Position

Phase: 23 (executing)
Plan: 23-04 complete, next 23-05 (if exists) or Phase 25
Status: All 7 widgets wrapped in registry, dashboard uses layout engine
Last activity: 2026-04-01

Progress: [▓▓▓▓▓▓▓░░░] 35% (v4.0)

## Phase Status

| Phase | Name | Status | Started | Completed |
| ----- | ---- | ------ | ------- | --------- |
| 23 | Dashboard Framework + V7 Person Card | In Progress | 2026-04-01 | - |
| 24 | Full Data Layer (11 endpoints) | Complete | 2026-04-01 | 2026-04-01 |
| 25 | Gauges + Sparklines (C1) | Pending | - | - |
| 26 | Forecast + Stacked Area (C2a) | Pending | - | - |
| 27 | Bench + Discipline Demand (C2b) | Pending | - | - |
| 28 | Availability Finder + Conflicts (C3) | Pending | - | - |
| 29 | Timeline + Program + Comparison (C4) | Pending | - | - |
| 30 | Integration & Wiring (D) | Pending | - | - |
| 31 | PDF Export Enhancement (E) | Pending | - | - |
| 32 | What-If Scenarios (F) | Pending | - | - |

## Previous Milestones

| Milestone | Phases | Status | Shipped |
| --------- | ------ | ------ | ------- |
| v1.0 Core Platform | 1-10 | Complete | 2026-03-27 |
| v2.0 Visibility & Insights | 11-17 | Complete | 2026-03-28 |
| v3.0 Switch from Excel | 18-22 | Complete | 2026-03-30 |

## Performance Metrics

**Velocity:**
- v1.0: 26 plans across 10 phases
- v2.0: 16 plans across 7 phases
- v3.0: 5 plans across 5 phases (lighter UX-focused phases)

## Accumulated Context

### Decisions

Key architectural decisions for v4.0:
- Widget IDs in wrappers match default-layouts.ts exactly (e.g., 'utilization-heat-map')
- Widget Registry Pattern: central registry, adding widget = create component + register
- Persona-based defaults: Line Manager + Project Leader get different layouts
- Layout persistence: DB-backed JSONB, 4-tier resolution (personal → device clone → tenant → built-in)
- Scenario isolation: ~31 new files, 0 modifications, separate DB tables/API routes/cache keys
- Person 360: global overlay (React portal), not a widget
- New dependency: @dnd-kit/core + @dnd-kit/sortable
- dnd-kit chosen over react-beautiful-dnd (lighter, more accessible, actively maintained)
- Sentinel value '__tenant_default__' for clerk_user_id in dashboard_layouts (NULL uniqueness workaround)
- Module-level Map singleton for widget registry (no class/context needed)
- Default time range: 3 months from current month, URL param overridable
- Person 360 capacity thresholds: <80% available, >=80% fully-allocated, >100% overloaded
- Person summary email returns null (people table has no email column, field kept for future)
- v4 PersonSummaryResponse renamed to PersonDetailResponse to avoid collision with Phase 23 type

### Pending Todos

None.

### Blockers/Concerns

- SVG snapshot for chart-to-PDF needs prototyping (Phase 31)
- dnd-kit CSS Grid integration: resolved with strategy={() => null} and inline translate3d

## Session Continuity

Last session: 2026-04-01
Stopped at: Completed 23-04-PLAN.md (Widget Wrappers + Dashboard Refactor)
Resume file: .planning/phases/23-dashboard-framework/23-04-SUMMARY.md

---

_Last updated: 2026-04-01_
