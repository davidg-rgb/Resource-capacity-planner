---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Dashboard Visualizations & Customization
status: executing phase 29
stopped_at: Completed 29-01-PLAN.md (Timeline + Program + Comparison)
last_updated: "2026-04-01T13:11:00Z"
last_activity: 2026-04-01
progress:
  total_phases: 10
  completed_phases: 7
  total_plans: 11
  completed_plans: 11
  percent: 70
---

# Nordic Capacity -- Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)
Spec: .planning/DASHBOARD-VISUALIZATIONS-SPEC.md (v2.0)
UX Review: .planning/V13-SCENARIO-UX-REVIEW.md
Roadmap: .planning/ROADMAP-V4.md

**Core value:** Customizable dashboard with 13 visualizations that make the tool irreplaceable vs Excel
**Current focus:** v4.0 build — Phase 29 (Timeline + Program + Comparison) complete, next Phase 30

## Current Position

Phase: 29 (complete)
Plan: 29-01 complete, next Phase 30
Status: V2 Timeline + V10 Program Roll-up + V11 Period Comparison built and registered
Last activity: 2026-04-01

Progress: [▓▓▓▓▓▓▓░░░] 70% (v4.0)

## Phase Status

| Phase | Name | Status | Started | Completed |
| ----- | ---- | ------ | ------- | --------- |
| 23 | Dashboard Framework + V7 Person Card | In Progress | 2026-04-01 | - |
| 24 | Full Data Layer (11 endpoints) | Complete | 2026-04-01 | 2026-04-01 |
| 25 | Gauges + Sparklines (C1) | Complete | 2026-04-01 | 2026-04-01 |
| 26 | Forecast + Stacked Area (C2a) | Complete | 2026-04-01 | 2026-04-01 |
| 27 | Bench + Discipline Demand (C2b) | Complete | 2026-04-01 | 2026-04-01 |
| 28 | Availability Finder + Conflicts (C3) | Complete | 2026-04-01 | 2026-04-01 |
| 29 | Timeline + Program + Comparison (C4) | Complete | 2026-04-01 | 2026-04-01 |
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
- Quick-assign modal is shared component, not embedded in widgets
- Conflict dismiss state in localStorage (key: nordic-capacity-dismissed-conflicts)
- Redistribute modal validates total <= target before save
- V2 uses custom HTML table with allocation bars (same pattern as heat-map-table)
- V10 staffing gauge: inline SVG donut, no external chart lib
- V10 program selector via config.programId (no program list endpoint yet)
- V11 defaults to quarter-over-quarter with preset buttons

### Pending Todos

None.

### Blockers/Concerns

- SVG snapshot for chart-to-PDF needs prototyping (Phase 31)
- dnd-kit CSS Grid integration: resolved with strategy={() => null} and inline translate3d
- Recharts 3.x gap shading: range-type [min,max] tuples instead of baseLine prop (deprecated)
- MAX_GROUPS=8 for stacked area chart (top 7 + Other bucket per spec)

## Session Continuity

Last session: 2026-04-01
Stopped at: Completed 29-01-PLAN.md (Timeline + Program + Comparison)
Resume file: .planning/phases/29-timeline-program-comparison/29-01-SUMMARY.md

---

_Last updated: 2026-04-01_
