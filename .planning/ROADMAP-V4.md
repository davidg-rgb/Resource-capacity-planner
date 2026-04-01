# v4.0 Roadmap — Dashboard Visualizations & Customization

**Created:** 2026-04-01
**Milestone:** v4.0
**Spec:** DASHBOARD-VISUALIZATIONS-SPEC.md (v2.0, 2020 lines)
**UX Review:** V13-SCENARIO-UX-REVIEW.md (all 6 open questions resolved)

## Milestone Goal

Transform the dashboard from a static KPI view into a fully customizable, persona-driven analytics hub with 13 new visualizations, drag-and-drop layout editing, enhanced PDF export, and isolated What-If scenario planning.

**Success metric:** Line managers and project leaders each get a tailored default dashboard they can customize. The app becomes irreplaceable vs Excel through decision-support visualizations.

---

## Phase Map

| # | Phase | Name | Goal | Depends On | Key Deliverables |
|---|-------|------|------|------------|------------------|
| 23 | A | Dashboard Framework + V7 Person Card | Foundation: widget registry, layout engine, edit mode, DB persistence, person 360 overlay | — | Widget registry, dnd-kit layout engine, edit mode UX, `dashboard_layouts` migration, layout API (3 endpoints), V7 Person 360 slide-out, existing widgets wrapped |
| 24 | B | Full Data Layer | All 11 new API endpoints + React Query hooks | — (parallel with 23) | `capacity-forecast`, `availability-timeline`, `availability`, `utilization-trends`, `capacity-distribution`, `person-summary`, `bench-report`, `conflicts`, `program-rollup`, `period-comparison`, `discipline-demand` |
| 25 | C1 | Gauges + Sparklines | Simplest visualizations — smoke test the framework | 24 | V6 Department Capacity Gauges, V4 Utilization Trend Sparklines |
| 26 | C2a | Forecast + Stacked Area | Recharts-heavy chart components | 24 | V1 Capacity Forecast Line Chart, V5 Stacked Area Chart |
| 27 | C2b | Bench + Discipline Demand | Table-style analytical views | 24 | V8 Bench & Idle Cost Report, V12 Discipline Demand Heatmap |
| 28 | C3 | Availability Finder + Conflicts | Interactive views with actions (assign, resolve) | 24 | V3 Availability Finder Panel, V9 Resource Conflict Matrix |
| 29 | C4 | Timeline + Program + Comparison | Most complex visualization components | 24 | V2 Resource Availability Timeline, V10 Program Roll-up, V11 Period Comparison |
| 30 | D | Integration & Wiring | Register all widgets, cross-linking, project leader route | 23 + 25-29 | Widget registration, cross-linking actions, quick-assign modal, `/dashboard/projects` route, mobile defaults |
| 31 | E | PDF Export Enhancement | Multi-widget PDF export with selection UI | 25-29 | Pre-export checkbox modal, SVG snapshot capture, multi-widget PDF layout, single-widget export, cover page |
| 32 | F | What-If Scenarios | Isolated scenario planning mode | UX review (done) | ~31 new files, `/scenarios` route, 3 new DB tables, scenario CRUD + promote flow, comparison view, feature-flagged |

## Parallelism

```
Phase 23 (Framework) ──────────────────────────┐
                                                ├── Phase 30 (Integration)
Phase 24 (Data Layer) ─┬── 25 (C1) ────────────┤
                       ├── 26 (C2a) ───────────┤
                       ├── 27 (C2b) ───────────┤
                       ├── 28 (C3) ────────────┤
                       └── 29 (C4) ────────────┘
                                                ├── Phase 31 (PDF Export)
Phase 32 (Scenarios) ──────────────────── independent

Phases 23+24 run in parallel (no shared deps).
Phases 25-29 can run in parallel after 24 completes.
Phase 30 requires 23 + all of 25-29.
Phase 31 requires all of 25-29.
Phase 32 is fully independent (zero modifications to existing files).
```

## Requirements Traceability

### Phase 23 — Dashboard Framework + V7 Person Card
- R23-01: Widget registry with `WidgetDefinition` interface (id, name, component, category, defaultColSpan, supportedDashboards)
- R23-02: Layout engine using 12-column CSS Grid with dnd-kit drag-and-drop
- R23-03: Edit mode toggle (pencil icon) with widget drawer, resize handles, remove buttons
- R23-04: `dashboard_layouts` DB table with JSONB layout, unique index on (org, user, dashboard, device)
- R23-05: Layout API: GET/PUT `/api/dashboard/layout`, PUT `/api/dashboard/layout/default` (admin)
- R23-06: 4-tier layout resolution: personal → cloned from other device → tenant default → built-in persona default
- R23-07: V7 Person 360 Card as global overlay (React portal slide-out) triggered from any person name
- R23-08: Person summary endpoint + hook for V7 data
- R23-09: Wrap existing widgets (KPI Cards, Department Bar, Discipline Chart, Alerts, Allocation Trends) in registry format
- R23-10: Global time range selector + per-widget override (clock icon in edit mode)
- R23-11: Install @dnd-kit/core + @dnd-kit/sortable

**Plans:** 4 plans

Plans:
- [ ] 23-01-PLAN.md — Types, widget registry, DB migration, dnd-kit install, time range context
- [ ] 23-02-PLAN.md — Layout engine, edit mode UX, layout API (3 endpoints), 4-tier resolution
- [ ] 23-03-PLAN.md — V7 Person 360 Card overlay, person summary endpoint + hook
- [ ] 23-04-PLAN.md — Wrap 7 existing widgets in registry format, refactor dashboard page

### Phase 24 — Full Data Layer
- R24-01: `GET /api/analytics/capacity-forecast` — demand vs supply lines with hiring trigger
- R24-02: `GET /api/analytics/availability-timeline` — Gantt-style allocation blocks per person
- R24-03: `GET /api/analytics/availability` — ranked available people for finder
- R24-04: `GET /api/analytics/utilization-trends` — 6-month trend per department/person
- R24-05: `GET /api/analytics/capacity-distribution` — stacked hours by grouping dimension
- R24-06: `GET /api/analytics/person-summary` — Person 360 card data
- R24-07: `GET /api/analytics/bench-report` — bench/idle capacity with FTE equivalents
- R24-08: `GET /api/analytics/conflicts` — over-allocated people with resolution suggestions
- R24-09: `GET /api/analytics/program-rollup` — program-level aggregation
- R24-10: `GET /api/analytics/period-comparison` — two-period delta analysis
- R24-11: `GET /api/analytics/discipline-demand` — per-discipline supply vs demand with hiring signals
- R24-12: React Query hooks for all 11 endpoints following existing patterns (useXxx naming)

**Plans:** 3 plans

Plans:
- [ ] 24-01-PLAN.md — Types + Supply vs Demand endpoints (capacity-forecast, capacity-distribution, discipline-demand)
- [ ] 24-02-PLAN.md — Person-Level Utilization endpoints (availability-timeline, availability, bench-report, conflicts)
- [ ] 24-03-PLAN.md — Trends + Entity endpoints (utilization-trends, person-summary, program-rollup, period-comparison)


### Phase 25 — Gauges + Sparklines (C1)
- R25-01: V6 Department Capacity Gauges — radial/semicircular gauge per department
- R25-02: V4 Utilization Trend Sparklines — mini line chart per department with trend arrow
- R25-03: Both components implement `WidgetProps` interface for registry compatibility

### Phase 26 — Forecast + Stacked Area (C2a)
- R26-01: V1 Capacity Forecast Line Chart — demand/supply lines, gap shading, hiring trigger line
- R26-02: V5 Stacked Area Chart — hours by project/department/discipline with "Other" bucket
- R26-03: Recharts 3.x based with responsive containers

### Phase 27 — Bench + Discipline Demand (C2b)
- R27-01: V8 Bench & Idle Cost Report — summary KPIs + department/discipline breakdown tables
- R27-02: V12 Discipline Demand Heatmap — month × discipline grid with status colors
- R27-03: Hiring trigger indicators for sustained deficits

### Phase 28 — Availability Finder + Conflicts (C3)
- R28-01: V3 Availability Finder — search/filter panel with ranked results, quick-assign action
- R28-02: V9 Resource Conflict Matrix — overloaded people with resolution sliders
- R28-03: Quick-assign modal (shared component for V3 and cross-linking)

### Phase 29 — Timeline + Program + Comparison (C4)
- R29-01: V2 Resource Availability Timeline — Gantt-style bars (custom HTML table, not AG Grid)
- R29-02: V10 Program Portfolio Roll-up — program aggregation with discipline coverage
- R29-03: V11 Period-over-Period Comparison — two-column metric comparison with delta signals

### Phase 30 — Integration & Wiring (D)
- R30-01: Register all 13 new widgets + existing widgets in central registry
- R30-02: Wire cross-linking actions (forecast→finder, timeline→assign, conflict→resolve)
- R30-03: Project leader dashboard route `/dashboard/projects` with default layout
- R30-04: Mobile layout defaults for both personas
- R30-05: Widget drawer categorization and search

### Phase 31 — PDF Export Enhancement (E)
- R31-01: Pre-export checkbox modal for widget selection
- R31-02: SVG snapshot capture for chart-based widgets
- R31-03: Multi-widget PDF page layout engine
- R31-04: Single-widget export from widget ⋯ menu
- R31-05: Cover page template with date, org name, selected widgets

### Phase 32 — What-If Scenarios (F)
- R32-01: DB migration: `scenarios`, `scenario_allocations`, `scenario_temp_entities` tables
- R32-02: `scenarios` feature flag (disabled by default)
- R32-03: Scenario CRUD API (9 endpoints under `/api/scenarios/`)
- R32-04: Scenario editor page at `/scenarios/:id` with amber banner
- R32-05: Impact preview reusing dashboard widgets with scenario data source
- R32-06: Side-by-side comparison view (actual vs scenario)
- R32-07: Promote-to-actual flow (admin gated, row-level selective)
- R32-08: Zero cache contamination (separate query keys, separate services)
- R32-09: Temp entities (hypothetical people/projects within scenario only)

## New Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| `@dnd-kit/core` | Drag-and-drop for widget reordering | Phase 23 |
| `@dnd-kit/sortable` | Sortable preset for widget lists | Phase 23 |

## New DB Tables

| Table | Phase | Purpose |
|-------|-------|---------|
| `dashboard_layouts` | 23 | User/tenant dashboard layout preferences |
| `scenarios` | 32 | Named what-if scenarios per user |
| `scenario_allocations` | 32 | Hypothetical allocations (isolated from actual) |
| `scenario_temp_entities` | 32 | Hypothetical people/projects in scenarios |

## New Feature Flags

| Flag | Default | Phase | Gates |
|------|---------|-------|-------|
| `scenarios` | disabled | 32 | `/scenarios` route + nav item |

---

_Created: 2026-04-01_
