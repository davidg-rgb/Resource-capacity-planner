# v4.0 Build Context — Dashboard Visualizations & Customization

**Created:** 2026-04-01
**Purpose:** Bootstrap document for fresh context window. Read this first, then the referenced specs.

## What to Build

13 new visualizations + customizable dashboard framework + enhanced PDF export + What-If scenario mode. Full spec in `DASHBOARD-VISUALIZATIONS-SPEC.md`. UX review for scenarios in `V13-SCENARIO-UX-REVIEW.md`.

## Build Order (10 Phases)

| Phase | What | Can Parallel With | Key Deliverables |
|-------|------|-------------------|------------------|
| **A** | Dashboard Framework + V7 Person Card | B | Widget registry, layout engine (dnd-kit), edit mode, DB migration (`dashboard_layouts`), person 360 slide-out overlay |
| **B** | Full Data Layer (11 API endpoints) | A | `capacity-forecast`, `availability-timeline`, `availability`, `utilization-trends`, `capacity-distribution`, `person-summary`, `bench-report`, `conflicts`, `program-rollup`, `period-comparison`, `discipline-demand` |
| **C1** | V6 Gauges + V4 Sparklines | After B | Simplest viz — good smoke test |
| **C2a** | V1 Forecast + V5 Stacked Area | After B | Recharts-heavy |
| **C2b** | V8 Bench + V12 Discipline Demand | After B | Table-style views |
| **C3** | V3 Availability Finder + V9 Conflicts | After B | Interactive with actions (assign, resolve) |
| **C4** | V2 Timeline + V10 Program + V11 Comparison | After B | Most complex components |
| **D** | Integration & Wiring | After A + all C | Register widgets, cross-linking actions, quick-assign modal, project leader route, mobile defaults |
| **E** | PDF Export Enhancement | After all C | Pre-export checkbox modal, SVG snapshot, multi-widget PDF |
| **F** | What-If Scenarios | After UX review (done) | ~31 new files, 0 modifications to existing. Separate route `/scenarios`, separate DB tables, separate API routes, feature-flagged |

## New Dependencies

- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop for dashboard widget reordering

## New DB Tables

1. `dashboard_layouts` — user/tenant dashboard preferences (JSONB layout, device class, persona)
2. `scenarios` — named what-if scenarios per user
3. `scenario_allocations` — hypothetical allocations (completely separate from `allocations`)
4. `scenario_temp_entities` — hypothetical people/projects that exist only in a scenario

## New Feature Flag

- `scenarios` (default: disabled) — gates `/scenarios` route and nav item

## Key Architecture Decisions

1. **Widget Registry Pattern** — all widgets (existing + new) register in a central registry. Adding a future widget = create component + register = done.
2. **Persona-based defaults** — Line Manager (`/dashboard`) and Project Leader (`/dashboard/projects`) get different default widget layouts. Users customize via drag-and-drop edit mode.
3. **Layout persistence** — DB-backed, survives devices/browsers. Two-tier: tenant default (admin-set) + personal override. Separate layouts for desktop/mobile.
4. **Scenario isolation** — V13 adds ~31 new files, modifies 0 existing files. Separate query keys, separate API routes, separate DB tables. Non-dismissible amber banner. Zero cache contamination risk.
5. **Person 360 Card** — global overlay (not a widget), triggered from any person name anywhere in the app. Reduces navigation by ~80%.

## Files to Read for Full Context

1. `.planning/DASHBOARD-VISUALIZATIONS-SPEC.md` — Full spec (2020 lines): all 13 viz specs, API contracts, DB schema, build order, extensibility architecture
2. `.planning/V13-SCENARIO-UX-REVIEW.md` — Scenario UX decisions: visual design, entry/exit flows, promotion flow, comparison view, technical isolation
3. `.planning/PROJECT.md` — Product vision, tech stack, shipped milestones
4. `src/db/schema.ts` — Current DB schema (to understand existing tables before adding new ones)
5. `src/features/analytics/analytics.service.ts` — Existing analytics query patterns (CTE + generate_series)
6. `src/components/charts/` — Existing chart components (Recharts patterns to follow)
7. `src/components/heat-map/` — Existing heat map (custom HTML table pattern to follow for V2 timeline)
8. `src/hooks/` — Existing React Query hooks (patterns for new hooks)

## How to Start

Use GSD workflow. Suggested approach:
```
/gsd:new-milestone   → Define v4.0 milestone from this spec
/gsd:plan-phase      → Plan Phase A (Dashboard Framework) first
/gsd:execute-phase   → Build Phase A
```

Phases A and B can run in parallel if using workstreams.
