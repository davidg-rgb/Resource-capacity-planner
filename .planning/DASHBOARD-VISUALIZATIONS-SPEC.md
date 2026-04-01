# Dashboard Visualizations & Customization Spec

**Version:** 2.0
**Date:** 2026-04-01
**Status:** Draft — Blueprint for Build
**Scope:** 13 visualizations (6 core + 7 advanced) + customizable dashboard framework + PDF export enhancements

---

## Table of Contents

1. [Persona Mapping](#1-persona-mapping)
2. [Dashboard Customization Framework](#2-dashboard-customization-framework)
3. [Core Visualization Specs](#3-core-visualization-specs)
   - [V1: Capacity Forecast Line Chart](#v1-capacity-forecast-line-chart)
   - [V2: Resource Availability Timeline](#v2-resource-availability-timeline)
   - [V3: Availability Finder Panel](#v3-availability-finder-panel)
   - [V4: Utilization Trend Sparklines](#v4-utilization-trend-sparklines)
   - [V5: Stacked Area Chart](#v5-stacked-area-chart)
   - [V6: Department Capacity Gauges](#v6-department-capacity-gauges)
4. [Advanced Visualization Specs](#4-advanced-visualization-specs)
   - [V7: Person 360 Profile Card](#v7-person-360-profile-card)
   - [V8: Bench & Idle Cost Report](#v8-bench--idle-cost-report)
   - [V9: Resource Conflict Matrix](#v9-resource-conflict-matrix)
   - [V10: Program Portfolio Roll-up](#v10-program-portfolio-roll-up)
   - [V11: Period-over-Period Comparison](#v11-period-over-period-comparison)
   - [V12: Discipline Demand Heatmap](#v12-discipline-demand-heatmap)
   - [V13: What-If Scenario Mode](#v13-what-if-scenario-mode) *(UX review required)*
5. [PDF Export Enhancement](#5-pdf-export-enhancement)
6. [Database Schema](#6-database-schema)
7. [API Contracts](#7-api-contracts)
8. [Dependencies & Build Order](#8-dependencies--build-order)
9. [Extensibility Architecture](#9-extensibility-architecture)

---

## 1. Persona Mapping

Two primary users, two default dashboard configurations. Each user can customize from this baseline.

### Line Manager View — `/dashboard`

**Goal:** "Is my team healthy? Who's overloaded? Who's available?"

| Widget | Default Position | Why Here |
|--------|-----------------|----------|
| KPI Cards (existing) | Row 1, full width | Instant health snapshot |
| **V1: Capacity Forecast** | Row 2, full width | Shows demand vs supply trend — are we heading toward a crunch? |
| **V6: Department Gauges** | Row 3, left half | Per-department health at a glance |
| **V4: Sparklines** | Row 3, right half | Which departments are trending up/down |
| **V3: Availability Finder** | Row 4, full width | "I need someone for a new project — who's free?" |
| Department Bar Chart (existing) | Row 5, left half | Detailed utilization comparison |
| Discipline Chart (existing) | Row 5, right half | Skill distribution |
| Strategic Alerts (existing) | Row 6, full width | Action items |

### Project Leader View — `/dashboard/projects` (new route)

**Goal:** "How is my project staffed? Do I have the right people? Where are the gaps?"

| Widget | Default Position | Why Here |
|--------|-----------------|----------|
| Project Selector | Row 1, top bar | Dropdown to pick active project (or "All Projects" aggregate) |
| Project KPI Cards | Row 1, full width | Total hours, headcount, discipline count, utilization % |
| **V5: Stacked Area Chart** | Row 2, full width | How project load is distributed over time across team members |
| **V2: Availability Timeline** | Row 3, full width | Gantt-style: who is assigned when, where are the gaps |
| **V1: Capacity Forecast** | Row 4, full width | Project-scoped: allocated vs budgeted hours over time |
| Allocation Trends (existing) | Row 5, left half | Monthly hour trend for this project |
| Discipline Distribution (existing) | Row 5, right half | Skill mix on this project |
| **V3: Availability Finder** | Row 6, full width | Find people to fill gaps — filtered to needed disciplines |

### Widget Availability Matrix

| Widget | Line Manager | Project Leader | Both |
|--------|:---:|:---:|:---:|
| KPI Cards (existing) | ✓ | ✓ | ✓ |
| V1: Capacity Forecast | ✓ | ✓ | ✓ |
| V2: Availability Timeline | — | ✓ (default) | ✓ (opt-in) |
| V3: Availability Finder | ✓ | ✓ | ✓ |
| V4: Sparklines | ✓ (default) | — | ✓ (opt-in) |
| V5: Stacked Area | — | ✓ (default) | ✓ (opt-in) |
| V6: Department Gauges | ✓ (default) | — | ✓ (opt-in) |
| V7: Person 360 Card | ✓ (global) | ✓ (global) | ✓ (global overlay, not a widget) |
| V8: Bench Report | ✓ (default) | — | ✓ (opt-in) |
| V9: Conflict Matrix | ✓ (default) | ✓ (default) | ✓ |
| V10: Program Roll-up | — | ✓ (default) | ✓ (opt-in) |
| V11: Period Comparison | ✓ (default) | — | ✓ (opt-in) |
| V12: Discipline Demand | ✓ (default) | — | ✓ (opt-in) |
| V13: What-If Scenarios | — (separate tab) | — (separate tab) | Isolated route `/scenarios` |
| Department Bar Chart (existing) | ✓ | — | ✓ (opt-in) |
| Discipline Chart (existing) | ✓ | — | ✓ (opt-in) |
| Strategic Alerts (existing) | ✓ | — | ✓ (opt-in) |
| Allocation Trends (existing) | — | ✓ | ✓ (opt-in) |
| Discipline Distribution (existing) | — | ✓ | ✓ (opt-in) |

Any widget can be added to any dashboard by the user through the customization panel.
V7 (Person 360) is a global overlay triggered from any person name — not a dashboard widget.
V13 (What-If) lives on its own route to prevent any interference with actual data.

---

## 2. Dashboard Customization Framework

### 2.1 Edit Mode UX

**Entry:** "Customize" button (pencil icon) in the dashboard toolbar, visible to all roles.

**Edit Mode Behavior:**
1. Dashboard enters edit mode — all widgets get a subtle dashed border and drag handle (top-left grip icon)
2. A collapsible **Widget Drawer** slides in from the right edge:
   - Lists all available widgets as cards with:
     - Widget name
     - Thumbnail preview (static SVG icon representing the chart type)
     - Checkbox: checked = visible on dashboard, unchecked = hidden
     - Brief one-line description
   - Grouped into sections:
     - **Health & Capacity:** KPI Cards, Capacity Forecast, Department Gauges, Sparklines, Bench Report
     - **Timelines & Planning:** Availability Timeline, Availability Finder, Discipline Demand
     - **Breakdowns:** Stacked Area, Department Bar Chart, Discipline Chart, Program Roll-up, Period Comparison
     - **Alerts & Actions:** Strategic Alerts, Conflict Matrix
3. **Drag-and-drop reordering:** Users drag widgets by their grip handle to reposition within the grid
4. **Resize:** Widgets snap to column grid — full width, half width (left/right), or third width. Drag the right edge to resize.
5. **Remove:** X button on each widget in edit mode (equivalent to unchecking in drawer)
6. **Save/Cancel toolbar** appears at top: "Save Layout" (primary button) and "Cancel" (text button) and "Reset to Default" (outline button)

**Grid System:**
- 12-column CSS grid on desktop (≥1024px)
- Widgets snap to: 12-col (full), 6-col (half), 4-col (third)
- 1-column stack on mobile (<768px) — all widgets full width, order preserved
- Tablet (768–1023px): 2-column, widgets snap to full or half

### 2.2 Persistence Model

**Storage:** Database table `dashboard_layouts` (see Schema §5)

**Two-tier persistence:**
1. **Tenant default layout** — set by org admins. New users and users who haven't customized see this.
2. **User personal layout** — overrides tenant default when saved. Per-device-class (desktop vs mobile).

**Device class detection:**
- Desktop: viewport ≥ 1024px
- Mobile: viewport < 1024px
- Stored as separate layout records (`deviceClass: 'desktop' | 'mobile'`)
- On first load, if no layout exists for current device class, clone from the other device class or fall back to tenant default, then persona default

**Layout data structure:**
```typescript
interface DashboardLayout {
  dashboardId: string;          // 'manager' | 'project-leader' | future dashboards
  widgets: WidgetPlacement[];
  version: number;              // Schema version for forward-compat migrations
}

interface WidgetPlacement {
  widgetId: string;             // Registry key, e.g. 'capacity-forecast'
  position: number;             // Sort order (0-based)
  colSpan: 4 | 6 | 12;         // Grid columns occupied
  config?: Record<string, unknown>;  // Widget-specific settings (e.g. project filter)
  timeRangeOverride?: {         // Per-widget time range (null = use global)
    from: string;               // YYYY-MM
    to: string;
  } | null;
}
```

### 2.3 Widget Registry Architecture

All widgets (existing and new) register through a central registry. This is the extensibility point for future releases.

```typescript
interface WidgetDefinition {
  id: string;                           // Unique key: 'capacity-forecast'
  name: string;                         // Display: 'Capacity Forecast'
  description: string;                  // One-liner for the drawer
  category: WidgetCategory;             // Grouping in drawer
  icon: LucideIcon;                     // Thumbnail in drawer
  component: React.ComponentType<WidgetProps>;  // The actual widget
  defaultColSpan: 4 | 6 | 12;          // Default width
  minColSpan: 4 | 6;                    // Minimum allowed width
  supportedDashboards: string[];        // Which dashboards can use this
  requiredFeatureFlag?: FlagName;       // Gate behind feature flag
  dataHook: string;                     // Hook name for data fetching (documentation)
}

type WidgetCategory =
  | 'health-capacity'     // KPIs, gauges, forecasts
  | 'timelines-planning'  // Gantt, sparklines, trends
  | 'breakdowns'          // Bar charts, pie charts, distributions
  | 'alerts-actions';     // Alerts, availability finder

interface WidgetProps {
  timeRange: { from: string; to: string };  // Global or overridden
  config?: Record<string, unknown>;
  isEditMode: boolean;
}
```

**Adding a new widget in a future release:**
1. Create the component
2. Add one entry to the widget registry
3. It automatically appears in the Widget Drawer for users to enable

### 2.4 Time Range Behavior

**Global time range selector** (already exists on `/dashboard`):
- Dropdown: 3 months, 6 months, 12 months, 18 months, Custom
- Applies to all widgets by default

**Per-widget override:**
- In edit mode, each widget shows a small clock icon button
- Click opens a mini date-range picker (month from / month to)
- When a widget has a local override, it shows a small indicator badge
- "Use global" button to reset back to shared range

---

## 3. Core Visualization Specs

### V1: Capacity Forecast Line Chart

**Purpose:** Show the gap between available capacity (supply) and allocated hours (demand) over time. The single most important "big picture" chart for resource planning.

**Location:** Line Manager dashboard (row 2), Project Leader dashboard (row 4, project-scoped)

**Visual Design:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Capacity Forecast                                    ⚙️ 🕐    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Hours                                                          │
│  8000 ┤                                                         │
│       │          ╭──────╮                                       │
│  7000 ┤    ╭─────╯      ╰──── Supply (target hours)            │
│       │   ╱                    ─────────────────                │
│  6000 ┤──╱   ╭─────────────── Demand (allocated hours)         │
│       │      │  ████████████   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                │
│  5000 ┤─────╯  ████████████   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                │
│       │         ████ GAP █████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                 │
│  4000 ┤         ████████████  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                 │
│       │                                                         │
│       └──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──→                │
│         Apr May Jun Jul Aug Sep Oct Nov Dec Jan Feb Mar         │
│                                                                 │
│  ● Supply ── Demand    ███ Surplus    ▓▓▓ Deficit              │
│                                                                 │
│  Summary: 3 months surplus, 2 months balanced, 7 months deficit │
└─────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Supply line | Sum of `targetHoursPerMonth` for all active (non-archived) people in scope, per month. Org-wide for manager, project-filtered for project leader. |
| F2 | Demand line | Sum of all `allocations.hours` in scope, per month. |
| F3 | Gap shading | Area between lines shaded: green (#22C55E @ 20% opacity) when supply > demand, red (#EF4444 @ 20% opacity) when demand > supply. |
| F4 | Tooltip | Hover on any month: "April 2026 — Supply: 6,400h / Demand: 5,800h / Surplus: 600h (9.4%)" |
| F5 | Summary bar | Below chart: count of surplus/balanced/deficit months. Balanced = within ±5%. |
| F6 | Filters | Inherits dashboard filters. On project leader view, scoped to selected project. |
| F7 | Action | Click a deficit month → opens Availability Finder pre-filtered to that month. |

**Data Source:**
New API endpoint: `GET /api/analytics/capacity-forecast`

**Recharts Components:** `<AreaChart>`, `<Line>`, `<Area>`, `<Tooltip>`, `<ReferenceLine>`

---

### V2: Resource Availability Timeline (Gantt-style)

**Purpose:** Horizontal swimlane view showing who is assigned to what, and when. White space = availability. Answers "who's free in Q3?" at a glance.

**Location:** Project Leader dashboard (row 3, default). Available opt-in for Line Manager.

**Visual Design:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  Resource Availability Timeline                          ⚙️ 🕐 🔍  │
│  Filters: [Department ▾] [Discipline ▾]  Show: ● All  ○ Available  │
│  ────────────────────────────────────────────────────────────────    │
│                  Apr    May    Jun    Jul    Aug    Sep    Oct       │
│  ┌────────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐   │
│  │            │      │      │      │      │      │      │      │   │
│  │ ▾ Mech Eng │      │      │      │      │      │      │      │   │
│  │────────────│──────│──────│──────│──────│──────│──────│──────│   │
│  │ A. Svensson│██████████████ Volvo XC90 ███████│      │      │   │
│  │  Mek 160h  │██████████████████████████████████│░░░░░░│░░░░░░│   │
│  │────────────│──────│──────│──────│──────│──────│──────│──────│   │
│  │ B. Lindqvist│█████ Atlas │░░░░░░░░░░░░░░░░░░░│██████ Scania │   │
│  │  Mek 160h  │█████████████│░░░░░░░░░░░░░░░░░░│████████████████   │
│  │────────────│──────│──────│──────│──────│──────│──────│──────│   │
│  │ C. Eriksson│██ XC90 █│██ Atlas ██│░░░░░░│░░░░░░│██ Scania ██│   │
│  │  Mek 160h  │█80h████│█120h██████│░░░░░░│░░░░░░│█160h████████   │
│  │            │        │           │      │      │              │   │
│  │ ▾ Software │      │      │      │      │      │      │      │   │
│  │────────────│──────│──────│──────│──────│──────│──────│──────│   │
│  │ D. Johansson│████████████████████ ADAS Platform ████████████│   │
│  │  SW 160h   │████████████████████████████████████████████████│   │
│  └────────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘   │
│                                                                      │
│  Legend: ███ Allocated  ░░░ Available  ▊▊▊ >100% (overloaded)       │
│                                                                      │
│  💡 3 people have 320+ available hours in Jun–Jul                    │
└──────────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Swimlanes | One row per person, grouped by department (collapsible). Each row shows person name, discipline abbreviation, target hours. |
| F2 | Project bars | Colored horizontal bars per project assignment. Bar width = months allocated. Bar color = from `chart-colors.palette` mapped to project. Hours shown on bar if space permits. |
| F3 | Availability gaps | Months where person has < 80% allocation shown as light dotted/striped pattern (`░`). Completely unallocated months = white. |
| F4 | Overload indicator | Months where total allocation > target hours: bar turns red with `▊▊▊` pattern. |
| F5 | Stacking | If a person is on multiple projects in one month, bars stack vertically within the swimlane (proportional height). |
| F6 | Filter: Available Only | Toggle to hide fully-allocated people, showing only those with gaps. |
| F7 | Department collapse | Click department header to collapse/expand all people in that department. |
| F8 | Tooltip | Hover on a bar: "A. Svensson — Volvo XC90 — Apr 2026: 120h / 160h target (75%)" |
| F9 | Action: Assign | Click an availability gap → opens quick-assign modal: select project, enter hours, save. Calls existing `POST /api/allocations` endpoint. |
| F10 | Action: View person | Click person name → navigates to `/input/{personId}` |
| F11 | Horizontal scroll | Month columns scroll horizontally, person name column sticky on left. |
| F12 | Current month | Highlighted with a vertical dashed line or column background tint. |
| F13 | Insight bar | Bottom summary: "X people have Y+ available hours in [selected range]" |

**Data Source:**
Reuses `GET /api/analytics/team-heatmap` (already returns person × month × hours grouped by department). Extended with project breakdown via new endpoint `GET /api/analytics/availability-timeline`.

**Implementation:** Custom HTML/CSS table (same approach as existing heat map — not a Recharts chart). Horizontal bars rendered as absolutely-positioned `<div>` elements within table cells.

---

### V3: Availability Finder Panel

**Purpose:** Answer "I need 2 mechanical engineers in June — who's available?" with a ranked, actionable list.

**Location:** Both dashboards (row 4 on manager, row 6 on project leader). Also accessible as standalone modal from the Capacity Forecast (click deficit month) and Availability Timeline (click gap).

**Visual Design:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Availability Finder                                      ⚙️ 🕐   │
│  ──────────────────────────────────────────────────────────────     │
│  Month: [Jun 2026 ▾]  to  [Aug 2026 ▾]   Discipline: [Mek ▾]     │
│  Department: [All ▾]    Min available: [40h ▾]                      │
│  ──────────────────────────────────────────────────────────────     │
│                                                                     │
│  Found 5 people with ≥40h available in Jun–Aug 2026 (Mek)          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. B. Lindqvist          Mek · Mech Eng Dept              │   │
│  │     ┌──────────────────────────────────────────┐            │   │
│  │     │ Jun: ████████░░░░  120h free / 160h      │  [Assign] │   │
│  │     │ Jul: ████░░░░░░░░   40h free / 160h      │           │   │
│  │     │ Aug: ░░░░░░░░░░░░  160h free / 160h      │           │   │
│  │     └──────────────────────────────────────────┘            │   │
│  │     Total available: 320h across 3 months                   │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  2. C. Eriksson           Mek · Mech Eng Dept              │   │
│  │     ┌──────────────────────────────────────────┐            │   │
│  │     │ Jun: ░░░░░░░░░░░░  160h free / 160h      │  [Assign] │   │
│  │     │ Jul: ░░░░░░░░░░░░  160h free / 160h      │           │   │
│  │     │ Aug: ████████████    0h free / 160h       │           │   │
│  │     └──────────────────────────────────────────┘            │   │
│  │     Total available: 320h across 3 months                   │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  3. E. Nyström            Mek · Production Dept             │   │
│  │     ...                                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Sort by: ● Most available  ○ Least utilized  ○ Name               │
└─────────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Filters | Month range (from/to), discipline (dropdown), department (dropdown), minimum available hours (40h / 80h / 120h / custom). |
| F2 | Results list | People sorted by total available hours (descending). Each card shows: name, discipline, department, per-month mini bar chart (allocated vs target), total available. |
| F3 | Mini bars | Horizontal bars per month: filled portion = allocated hours (blue), empty portion = available (light green). Bar width proportional to target hours. |
| F4 | Sort options | "Most available" (default), "Least utilized" (lowest % across range), "Name" (alphabetical). |
| F5 | Action: Assign | "Assign" button per person → opens quick-assign modal with person pre-selected, month range pre-filled. Select project, enter hours per month, save. |
| F6 | Action: View | Click person name → navigates to `/input/{personId}` |
| F7 | Empty state | "No one matching your filters has availability in this period. Try widening the date range or removing the discipline filter." |
| F8 | Count badge | "Found X people with ≥Yh available in [range]" header. |
| F9 | Cross-linking | When opened from Capacity Forecast deficit click: month pre-filled. When opened from Timeline gap click: person + month pre-filled. |
| F10 | Standalone modal | Can also be triggered from a floating action button on both dashboards: 🔍 "Find Available Resources" |

**Data Source:**
New API endpoint: `GET /api/analytics/availability` — returns people with their available hours per month, pre-filtered and sorted.

---

### V4: Utilization Trend Sparklines

**Purpose:** Tiny inline line charts showing the direction of utilization over recent months. Turns a static number into a trend — "this department's load is increasing."

**Location:** Line Manager dashboard (row 3 right half). Also injectable into the existing heat map rows and department bar chart.

**Visual Design:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Utilization Trends                                    ⚙️ 🕐   │
│  ──────────────────────────────────────────────────────────     │
│  View: ● Departments  ○ People (top 10)                        │
│                                                                 │
│  Department          6-month trend        Current   Direction   │
│  ─────────────────────────────────────────────────────────────  │
│  Mechanical Eng      ╱‾‾╲__╱‾‾↗          87%       ▲ +12%     │
│                      ▔▔▔▔▔▔▔▔▔▔                               │
│  Software Eng        ╱‾‾‾‾‾‾‾‾↗          104%      ▲ +8%  ⚠️ │
│                      ▔▔▔▔▔▔▔▔▔▔                               │
│  Electrical Eng      ‾‾╲__╱╲__↘          62%       ▼ -15%     │
│                      ▔▔▔▔▔▔▔▔▔▔                               │
│  Production          ─────────→           78%       → 0%       │
│                      ▔▔▔▔▔▔▔▔▔▔                               │
│  Test & Validation   __╱‾‾‾╲__↘          71%       ▼ -5%      │
│                      ▔▔▔▔▔▔▔▔▔▔                               │
│                                                                 │
│  ⚠️ = currently overloaded (>100%)                              │
│  Trend period: last 6 months vs current month                   │
└─────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Sparkline | SVG line, 80×24px, showing utilization % over last 6 months. No axes, no labels — just the line shape. Color: primary (#496173). Red if current value > 100%. |
| F2 | Current value | Percentage with one decimal. Color-coded: green (<85%), amber (85–100%), red (>100%). |
| F3 | Direction indicator | Arrow (▲ ▼ →) plus percentage change (current month vs 6 months ago). Green for improving toward healthy, red for trending toward overload. |
| F4 | View toggle | "Departments" shows all departments. "People (top 10)" shows the 10 most-changed individuals. |
| F5 | Warning badge | ⚠️ icon next to any row currently > 100% utilization. |
| F6 | Action | Click department name → navigates to `/dashboard/team?dept={id}`. Click person → `/input/{personId}`. |
| F7 | Inline variant | A compact sparkline-only version (no table, just the spark + arrow) that can be injected next to department names in the existing Department Bar Chart and heat map group headers. |

**Data Source:**
New API endpoint: `GET /api/analytics/utilization-trends` — returns per-entity utilization % for each of the last 6 months plus current.

**Implementation:** Custom SVG `<path>` element (no Recharts needed for the sparkline itself — keeps it lightweight). The table wrapper uses standard Tailwind.

---

### V5: Stacked Area Chart — Capacity by Project

**Purpose:** Show how total allocated hours are distributed across projects (or departments) over time. Makes it obvious when one project dominates capacity.

**Location:** Project Leader dashboard (row 2). Available opt-in for Line Manager.

**Visual Design:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Capacity Distribution                                 ⚙️ 🕐   │
│  Group by: ● Project  ○ Department  ○ Discipline               │
│  ──────────────────────────────────────────────────────────     │
│                                                                 │
│  Hours                                                          │
│  8000 ┤ ┌──────────────────────────────────────────────┐        │
│       │ │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│        │
│  7000 ┤ │░░░░░░░░ Volvo XC90 ░░░░░░░░░░░░░░░░░░░░░░░░│        │
│       │ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│        │
│  6000 ┤ │▒▒▒▒▒▒▒▒ ADAS Platform ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│        │
│       │ │████████████████████████████████████████████████        │
│  5000 ┤ │████████ Scania R-series ██████████████████████        │
│       │ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│        │
│  4000 ┤ │▓▓▓▓▓▓▓▓ Atlas Copco ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│        │
│       │ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│        │
│       │ └──────────────────────────────────────────────┘        │
│       └──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──→               │
│         Apr May Jun Jul Aug Sep Oct Nov Dec Jan Feb Mar         │
│                                                                 │
│  ░ Volvo XC90 (32%)  ▒ ADAS (28%)  █ Scania (22%)  ▓ Atlas (18%) │
│                                                      ── Supply  │
│                                                                 │
│  ⚠️ ADAS Platform grows from 22% → 35% of capacity by Q4       │
└─────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Stacked areas | One colored area per project/department/discipline (selectable via toggle). Areas stacked to show total. Colors from `chart-colors.palette`. |
| F2 | Supply overlay | Dashed line showing total supply (sum of target hours). When stacked total exceeds supply line, the area above turns red-tinted. |
| F3 | Group by toggle | Switch between Project, Department, and Discipline grouping. Default: Project on project leader, Department on line manager. |
| F4 | Legend | Below chart, interactive: click a legend item to hide/show that series. Shows percentage of total. |
| F5 | Tooltip | Hover on month: breakdown popup showing each project's hours + percentage for that month. |
| F6 | Insight callout | Auto-generated text below chart highlighting the most significant trend: "X grows from Y% → Z% of capacity by [month]". |
| F7 | Top N + Other | If > 8 projects, show top 7 by total hours + "Other" aggregated area. |
| F8 | Action | Click a project area → navigates to `/projects/{projectId}`. |

**Data Source:**
New API endpoint: `GET /api/analytics/capacity-distribution` — returns per-group-per-month hours breakdown.

**Recharts Components:** `<AreaChart>`, `<Area>` (stacked), `<Line>` (supply overlay), `<Tooltip>`, `<Legend>`

---

### V6: Department Capacity Gauges

**Purpose:** Per-department donut/gauge showing current-month utilization at a glance. Quick visual health check per department.

**Location:** Line Manager dashboard (row 3 left half). Available opt-in for Project Leader.

**Visual Design:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Department Health                                     ⚙️ 🕐   │
│  Month: April 2026                                              │
│  ──────────────────────────────────────────────────────────     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   ╭──────╮   │  │   ╭──────╮   │  │   ╭──────╮   │          │
│  │  ╱ ██████ ╲  │  │  ╱ ▓▓▓▓▓▓ ╲  │  │  ╱ ░░░░░░ ╲  │          │
│  │ │ ████████ │ │  │ │ ▓▓▓▓▓▓▓▓ │ │  │ │ ░░░░░░░░ │ │          │
│  │ │ ██ 87% █ │ │  │ │ ▓▓104% ▓ │ │  │ │ ░░ 62% ░ │ │          │
│  │  ╲ ██████ ╱  │  │  ╲ ▓▓▓▓▓▓ ╱  │  │  ╲ ░░░░░░ ╱  │          │
│  │   ╰──────╯   │  │   ╰──────╯   │  │   ╰──────╯   │          │
│  │  Mech. Eng   │  │  Software  ⚠️ │  │  Electrical  │          │
│  │  14 people   │  │  8 people     │  │  6 people     │          │
│  │  ▲ +5% trend │  │  ▲ +12% ⚠️   │  │  ▼ -8%       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   ╭──────╮   │  │   ╭──────╮   │                             │
│  │ │ ██ 78% █ │ │  │ │ ░░ 71% ░ │ │                             │
│  │  Production  │  │  Test & Val  │                             │
│  │  10 people   │  │  5 people    │                             │
│  │  → 0% trend  │  │  ▼ -3%      │                             │
│  └──────────────┘  └──────────────┘                             │
│                                                                 │
│  Color: 🟢 <85%  🟡 85-100%  🔴 >100%                          │
└─────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Donut gauge | 3/4 circle (270°) donut per department. Fill = utilization %. Color: green (<85%), amber (85–100%), red (>100%). Unfilled portion = surface-container color. |
| F2 | Center label | Large percentage number centered inside the donut. Bold, tabular-nums. |
| F3 | Department name | Below donut: department name, headcount ("X people"). |
| F4 | Trend indicator | Small arrow + percentage change vs previous month. Same color coding as sparklines. |
| F5 | Warning badge | ⚠️ on departments > 100%. |
| F6 | Layout | Flex-wrap grid: 3 per row on desktop, 2 on tablet, 1 on mobile. |
| F7 | Action | Click a gauge → navigates to `/dashboard/team?dept={id}` (filtered heat map). |
| F8 | Month selector | Shows current month by default. Small month picker to view other months. |

**Data Source:**
Reuses existing `GET /api/analytics/departments` (already returns `departmentId, departmentName, utilizationPercent`). Enhanced with headcount + trend data via new fields.

**Recharts Components:** `<PieChart>`, `<Pie>` (with startAngle/endAngle for 270° gauge), custom center label via `<text>`.

---

## 4. Advanced Visualization Specs

---

### V7: Person 360 Profile Card

**Purpose:** Eliminate unnecessary page navigation. When a person's name appears anywhere in the app — heat map, availability finder, timeline, alerts, conflict matrix — the user should be able to get the full picture without leaving the page.

**Type:** Global overlay (not a dashboard widget). Triggered from any clickable person name across the entire application.

**Visual Design:**

```
┌─────────────────────────────────────────┐
│  Anna Svensson                  [✕]     │
│  Mek · Mechanical Engineering Dept      │
│  Target: 160h / month                   │
│  ────────────────────────────────────   │
│                                         │
│  Current Month (Apr 2026)               │
│  ╭──────╮                               │
│  │ 87%  │  140h allocated / 160h target │
│  ╰──────╯  Status: 🟢 Healthy          │
│                                         │
│  6-Month Trend                          │
│  ╱‾‾╲__╱‾‾↗   ▲ +12% vs Oct 2025      │
│                                         │
│  ────────────────────────────────────   │
│  Active Projects              Hours  %  │
│  ■ Volvo XC90 Facelift         80h  50% │
│  ■ Atlas Copco Compressor      40h  25% │
│  ░ Available                   40h  25% │
│                                         │
│  ╭─────────────────────────────────╮    │
│  │ ■■■■■■■■■■▒▒▒▒▒░░░░░           │    │
│  │ Volvo     Atlas  Free           │    │
│  ╰─────────────────────────────────╯    │
│                                         │
│  ────────────────────────────────────   │
│  Upcoming Availability                  │
│  Jun: 40h free  Jul: 120h free          │
│  Aug: 160h free (no allocations)        │
│                                         │
│  ────────────────────────────────────   │
│  [Assign to Project]  [View Full →]     │
│  [Edit Allocations →]                   │
└─────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Trigger | Click any person name in: heat map, availability finder, timeline, alerts, conflict matrix, project staffing, flat table. Consistent hover cursor + underline style indicates clickability. |
| F2 | Slide-out panel | 360px wide panel slides in from the right edge. Overlay on top of current page (does not navigate away). Closes on ✕, Escape key, or click outside. |
| F3 | Mini donut | Small donut (48px) showing current month utilization breakdown by project. Color-coded per project from palette. |
| F4 | Sparkline | 6-month trend line (same as V4) showing utilization direction. |
| F5 | Project list | All active projects with hours and percentage for current month. Sorted by hours descending. "Available" shown as last item in muted style. |
| F6 | Stacked bar | Horizontal bar showing project allocation proportions visually. |
| F7 | Availability preview | Next 3 months with available hours. Highlights months with > 80h free in green. |
| F8 | Action: Assign | "Assign to Project" button → opens quick-assign modal with person pre-selected. |
| F9 | Action: View | "View Full" → navigates to `/input/{personId}`. |
| F10 | Action: Edit | "Edit Allocations" → navigates to `/input/{personId}`. |
| F11 | Loading state | Skeleton shimmer while data loads. Card should appear within 200ms (data may load progressively). |
| F12 | Context preservation | Opening the card does NOT change URL or browser history. Closing returns to exact scroll position. |

**Data Source:**
Composite of existing endpoints: `usePersonDetail(personId)` + `useAllocations(personId)` + new lightweight endpoint `GET /api/analytics/person-summary` that returns the pre-computed card data in a single call.

**Implementation:** React portal-based slide-out panel. Shared `<PersonCard>` component importable anywhere. Uses `@floating-ui` or simple CSS transform for positioning.

---

### V8: Bench & Idle Cost Report

**Purpose:** Reframe underutilization in business language. "480 idle hours" means nothing to a department head in a meeting. "3.0 FTE equivalent sitting on the bench" triggers action.

**Location:** Line Manager dashboard (default). Opt-in for Project Leader.

**Visual Design:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Bench Report                                           ⚙️ 🕐   │
│  Period: [Apr 2026 ▾] to [Jun 2026 ▾]                           │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  1,840h     │  │  3.8 FTE    │  │  8 people   │              │
│  │  bench hours │  │  equivalent │  │  below 80%  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  By Department                          Bench Hours    FTE Eq.  │
│  ─────────────────────────────────────────────────────────────   │
│  Electrical Eng   ████████████████████   720h          1.5      │
│  Test & Val       ████████████           480h          1.0      │
│  Mechanical Eng   ██████████             400h          0.8      │
│  Software         ████                   240h          0.5      │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  By Discipline                          Bench Hours    FTE Eq.  │
│  ─────────────────────────────────────────────────────────────   │
│  Elnik            ████████████████████   720h          1.5      │
│  Test             ████████████           480h          1.0      │
│  Mek              ██████████             400h          0.8      │
│  SW               ████                   240h          0.5      │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  People with Most Available Capacity                             │
│  ─────────────────────────────────────────────────────────────   │
│  1. E. Nyström    Elnik · Electrical    40% util   96h/mo free  │
│  2. F. Berg       Test  · Test & Val    35% util  104h/mo free  │
│  3. G. Holm       Elnik · Electrical    45% util   88h/mo free  │
│  4. H. Nilsson    Mek   · Mechanical    50% util   80h/mo free  │
│  5. I. Larsson    Test  · Test & Val    55% util   72h/mo free  │
│                                                         [More →] │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  Trend: Bench hours ▼ -22% vs previous quarter (was 2,360h)    │
│                                                                  │
│  💡 Electrical has 1.5 FTE on bench. Consider:                  │
│     · Cross-department lending to Software (at 104%)            │
│     · New project intake for Elnik discipline                   │
└──────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | KPI cards | Three summary cards: total bench hours, FTE equivalent (bench hours ÷ avg target hours), count of people below 80% utilization. |
| F2 | Department breakdown | Horizontal bars sorted by bench hours descending. Shows hours + FTE equivalent. |
| F3 | Discipline breakdown | Same layout grouped by discipline instead of department. |
| F4 | People list | Top 5 (expandable) people with most available capacity. Shows name, discipline, department, utilization %, free hours/month. Click name → Person 360 Card (V7). |
| F5 | Trend line | Comparison vs previous period of same length. Shows direction arrow + percentage change. |
| F6 | Insight callout | Auto-generated suggestion: identifies the most bench-heavy department and the most overloaded department, suggests cross-lending. |
| F7 | FTE calculation | FTE equivalent = total bench hours in period ÷ (months in period × average target hours across all people). Displayed to 1 decimal. |
| F8 | Action: Find work | Click a benched person → opens Availability Finder (V3) pre-filtered to their discipline. |
| F9 | Threshold | "Bench" = any person below 80% utilization in the selected period. Configurable in widget settings (50%, 60%, 70%, 80%). |

**Data Source:**
New API endpoint: `GET /api/analytics/bench-report` — returns department/discipline grouped bench hours with FTE calculations and trend comparison.

---

### V9: Resource Conflict Matrix

**Purpose:** Make resource conflicts between projects explicit and resolvable. The heat map shows a person is overloaded, but not *which projects are fighting over them*. This view answers "who decides which project gets the hours?"

**Location:** Both dashboards (default). High value for both line managers (who resolve conflicts) and project leaders (who need to see competing claims).

**Visual Design:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  Resource Conflicts                                        ⚙️ 🕐   │
│  Month: [Apr 2026 ▾]   Show: ● Current month  ○ Next 3 months     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  4 people overallocated across competing projects                   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  A. Svensson          Mek · Mechanical Eng                    │ │
│  │  Target: 160h         Total: 200h          Over by: 40h       │ │
│  │  ──────────────────────────────────────────────────────────── │ │
│  │  ████████████████████████████░░░░░░░░  Volvo XC90    120h  ◀▶│ │
│  │  ██████████████████░░░░░░░░░░░░░░░░░░  Atlas Copco    80h  ◀▶│ │
│  │  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔   │ │
│  │  │◄──────────── 160h target ─────────────►│                   │ │
│  │                                                                │ │
│  │  Suggested resolution: Reduce Atlas to 40h (→ 160h total)    │ │
│  │  [Apply Suggestion]  [Redistribute Manually]  [Dismiss]       │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  D. Johansson         SW · Software Eng                       │ │
│  │  Target: 160h         Total: 180h          Over by: 20h       │ │
│  │  ──────────────────────────────────────────────────────────── │ │
│  │  ██████████████████████████████████████  ADAS Platform 160h ◀▶│ │
│  │  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Scania R       20h ◀▶│ │
│  │                                                                │ │
│  │  [Redistribute Manually]  [Dismiss]                           │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  ... 2 more conflicts                                  [Show] │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  History: 6 conflicts resolved this month, 4 pending               │
└──────────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Conflict detection | Any person where `SUM(allocations.hours)` for a given month > `targetHoursPerMonth`. Shows each competing project's claim. |
| F2 | Visual bars | Per-project horizontal bar, stacked against the target line. Overflow portion (beyond target) colored red. Bars are proportional to hours. |
| F3 | Drag sliders | Each bar has a ◀▶ drag handle. Dragging reduces/increases that project's hours. Total updates live. When total ≤ target, the red overflow disappears. |
| F4 | Suggested resolution | Auto-generated: identifies the project with the smallest allocation and suggests reducing it to bring total to target. Simple heuristic, not AI. |
| F5 | Apply suggestion | One-click applies the suggested reallocation. Calls `POST /api/allocations/batch` with updated hours. |
| F6 | Redistribute manually | Opens a modal with number inputs per project. User manually enters new hours. Validates total ≤ target before save. |
| F7 | Dismiss | Marks the conflict as "acknowledged" for this month (stored in localStorage). Does not change hours. Dismissed conflicts appear in a collapsed "Acknowledged" section. |
| F8 | Multi-month view | "Next 3 months" toggle shows conflicts across upcoming months. Groups by person, shows which months have conflicts. |
| F9 | Severity sorting | Sorted by overallocation amount (highest first). |
| F10 | History footer | "X conflicts resolved this month, Y pending." Links to a simple log of resolved conflicts. |
| F11 | Person card | Click person name → opens Person 360 Card (V7). |
| F12 | Count badge | Total conflict count shown in the widget header badge and optionally in the top nav alongside the existing alert bell. |

**Data Source:**
New API endpoint: `GET /api/analytics/conflicts` — returns people with total allocation > target, broken down by project with hours.

---

### V10: Program Portfolio Roll-up

**Purpose:** Unlock the existing `programs` table as a business-level grouping. Engineering orgs think in programs/contracts (e.g., "the Volvo program"), not individual projects. This view shows staffing completeness and discipline coverage at the program level.

**Location:** Project Leader dashboard (default). Opt-in for Line Manager.

**Visual Design:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Program Overview                                       ⚙️ 🕐   │
│  Program: [Volvo Vehicle Platform ▾]                             │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  3 projects  │  │  18 people   │  │  2,640h/mo   │           │
│  │  active      │  │  assigned    │  │  peak load   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  Staffing Completeness                                           │
│  ╭──────────╮                                                    │
│  │   85%    │  Based on allocation vs target across all projects │
│  ╰──────────╯                                                    │
│                                                                  │
│  Discipline Coverage                                             │
│  ─────────────────────────────────────────────────────────────   │
│  SW     ████████████████████  100%   8 people                   │
│  Mek    ███████████████░░░░░   78%   6 people  ⚠️ need +1      │
│  Elnik  ██████████░░░░░░░░░░   55%   3 people  ⚠️ need +2      │
│  Test   ██████░░░░░░░░░░░░░░   40%   2 people  ⚠️ need +3      │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  Monthly Load Across Program                                     │
│  ─────────────────────────────────────────────────────────────   │
│  Apr ██████████████████      2,400h                              │
│  May ████████████████████    2,640h  ← peak                     │
│  Jun ████████████████████    2,880h  ← peak                     │
│  Jul ██████████████████      2,400h                              │
│  Aug ████████████████        2,160h                              │
│  Sep ██████████████          1,920h                              │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  Projects in Program                                             │
│  ─────────────────────────────────────────────────────────────   │
│  ■ Volvo XC90 Facelift    12 people  1,200h/mo  Status: Active  │
│  ■ Volvo EX90 Platform     8 people    880h/mo  Status: Active  │
│  ■ Volvo Safety Systems    4 people    520h/mo  Status: Planned │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  ⚠️ Discipline Gap Alert                                        │
│  Test discipline at 40% coverage. 3 additional test engineers    │
│  needed by June to meet program allocation targets.              │
│  [Find Available Test Engineers →]                               │
└──────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Program selector | Dropdown listing all programs with active projects. "All Programs" option shows aggregate across everything. |
| F2 | KPI cards | Project count, total people assigned, peak monthly hours. |
| F3 | Staffing gauge | Donut gauge (same style as V6) showing overall staffing completeness = (total allocated / total needed based on project plans). |
| F4 | Discipline coverage | Horizontal bars per discipline. Percentage = allocated hours for that discipline / total hours across the program. "Need +X" shown when < 80%. |
| F5 | Monthly load chart | Horizontal bars showing total program hours per month. Peak month highlighted. |
| F6 | Project list | All projects in the selected program with headcount, monthly hours, and status badge. Click project → `/projects/{projectId}`. |
| F7 | Gap alert | Auto-generated callout when any discipline is below 80% coverage. Shows how many additional people are needed (calculated from deficit hours ÷ avg target). |
| F8 | Action: Find people | "Find Available X Engineers" button → opens Availability Finder (V3) pre-filtered to that discipline. |
| F9 | Cross-program comparison | If "All Programs" selected, shows a comparison table with one row per program: total hours, headcount, completeness %. |

**Data Source:**
New API endpoint: `GET /api/analytics/program-rollup` — aggregates across all projects in a program, returns discipline coverage and monthly load.

---

### V11: Period-over-Period Comparison

**Purpose:** Answer the meta-question: "is our resource planning getting better or worse?" Powers quarterly business reviews with concrete delta numbers.

**Location:** Line Manager dashboard (default). Opt-in for Project Leader.

**Visual Design:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Period Comparison                                      ⚙️ 🕐   │
│  Comparing: [Q1 2026 ▾] vs [Q2 2026 ▾]                         │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  Key Metrics                                                     │
│  ─────────────────────────────────────────────────────────────   │
│  Metric                 Q1 2026    Q2 2026    Delta    Signal   │
│  ─────────────────────────────────────────────────────────────   │
│  Avg Utilization         78%        84%      ▲ +6%      🟢     │
│  Overloaded People        3          5       ▲ +2       🔴     │
│  Underutilized            7          4       ▼ -3       🟢     │
│  Bench Hours           3,400h     1,840h     ▼ -46%     🟢     │
│  Total Allocated      14,200h    16,800h     ▲ +18%            │
│  Active Projects          8         11       ▲ +3              │
│  Conflicts (>100%)        2          4       ▲ +2       🔴     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  Department Shifts                                               │
│  ─────────────────────────────────────────────────────────────   │
│  Department        Period A → Period B    Change     Signal     │
│  ─────────────────────────────────────────────────────────────   │
│  Mechanical Eng     72%  →  87%          ▲ +15%                │
│  Software           95%  →  104%         ▲ +9%      ⚠️ over   │
│  Electrical         68%  →  62%          ▼ -6%      still low  │
│  Production         78%  →  78%          → 0%       stable     │
│  Test & Val         74%  →  71%          ▼ -3%                 │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  Notable Changes                                                 │
│  ─────────────────────────────────────────────────────────────   │
│  · 3 new projects started (Scania R, Atlas Phase 2, ADAS v2)   │
│  · Net headcount +2 (2 added, 0 archived)                      │
│  · Software dept crossed 100% threshold — first time in 6 mos  │
│  · Bench hours halved — good sign, but watch for overcorrection │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  [Export Comparison as PDF →]                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Period selectors | Two dropdowns: Period A (baseline) and Period B (comparison). Options: individual months, quarters (Q1–Q4), half-years (H1/H2), custom range. |
| F2 | Key metrics table | Side-by-side values with absolute delta and percentage change. Color-coded signal: 🟢 = improving, 🔴 = worsening, based on whether the metric moved toward or away from healthy (context-aware — e.g., higher utilization is good until it passes 100%). |
| F3 | Department shifts | Per-department utilization in each period with delta and contextual note. Sorted by absolute change descending. |
| F4 | Notable changes | Auto-generated bullet points based on data deltas: new projects (appeared in B but not A), headcount changes (archived/added people), threshold crossings (dept went over/under 100%). |
| F5 | Signal logic | The 🟢/🔴 signal is context-aware: utilization going from 78%→87% is 🟢, but 95%→104% is 🔴. Bench going down is 🟢. Conflicts going up is 🔴. |
| F6 | Drill-down | Click any department row → navigates to heat map filtered to that department. |
| F7 | Export | "Export Comparison as PDF" → generates a standalone comparison report (not the full dashboard export — a focused document for meetings). |
| F8 | Presets | Quick-select buttons: "This month vs last month", "This quarter vs last quarter", "YTD vs same period last year". |

**Data Source:**
New API endpoint: `GET /api/analytics/period-comparison` — takes two date ranges, returns all metrics for each with computed deltas and signal.

---

### V12: Discipline Demand Heatmap

**Purpose:** Show demand for each skill type across time. This is the *hiring trigger view* — when a department head needs to justify opening a new position to HR, they point at this chart.

**Location:** Line Manager dashboard (default). Opt-in for Project Leader.

**Visual Design:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Discipline Demand Forecast                            ⚙️ 🕐    │
│  ─────────────────────────────────────────────────────────────   │
│                Apr    May    Jun    Jul    Aug    Sep    Oct     │
│  ─────────────────────────────────────────────────────────────   │
│  SW                                                              │
│    Demand:    1280   1360   1440   1440   1280   1280   1200    │
│    Supply:    1280   1280   1280   1280   1280   1280   1280    │
│    Gap:         0    -80   -160   -160      0      0    +80     │
│    Status:     🟢     🟡     🔴     🔴     🟢     🟢     🟢    │
│  ─────────────────────────────────────────────────────────────   │
│  Mek                                                             │
│    Demand:     960    960   1120   1120   1040    960    800    │
│    Supply:     960    960    960    960    960    960    960     │
│    Gap:          0      0   -160   -160    -80      0   +160    │
│    Status:     🟢     🟢     🔴     🔴     🟡     🟢     🟢    │
│  ─────────────────────────────────────────────────────────────   │
│  Elnik                                                           │
│    Demand:     480    480    640    640    640    480    480     │
│    Supply:     640    640    640    640    640    640    640     │
│    Gap:       +160   +160      0      0      0   +160   +160    │
│    Status:     🟢     🟢     🟢     🟢     🟢     🟢     🟢    │
│  ─────────────────────────────────────────────────────────────   │
│  Test                                                            │
│    Demand:     320    400    480    480    400    320    320     │
│    Supply:     480    480    480    480    480    480    480     │
│    Gap:       +160    +80      0      0    +80   +160   +160    │
│    Status:     🟢     🟢     🟢     🟢     🟢     🟢     🟢    │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  Summary: SW and Mek both hit deficit Jun–Jul                    │
│  Combined gap: 320h/mo = 2.0 FTE hiring need by June            │
│                                                                  │
│  Interpretation:                                                 │
│  · Deficit = more hours allocated than available people can      │
│    deliver at their target capacity                              │
│  · Surplus = people with that skill have unused capacity         │
│                                                                  │
│  [Find available SW engineers →]  [Find available Mek engineers →] │
└──────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Grid layout | Rows per discipline, columns per month. Three sub-rows: demand (sum of allocations for people with that discipline), supply (sum of target hours for people with that discipline), gap (supply – demand). |
| F2 | Cell coloring | Status row: 🟢 gap ≥ 0 (surplus/balanced), 🟡 gap between -5% and 0 (tight), 🔴 gap < -5% (deficit). Background tint matches. |
| F3 | FTE conversion | Summary section converts peak deficit hours into FTE equivalent: deficit hours ÷ average target hours per month. |
| F4 | Collapsible detail | Click a discipline row to expand and see which specific projects are driving the demand for that month. |
| F5 | Action: Find people | Button per deficit discipline → opens Availability Finder (V3) pre-filtered to that discipline and the deficit months. |
| F6 | Action: Hiring signal | When deficit persists for 3+ consecutive months, show a highlighted callout: "Sustained deficit — consider hiring." |
| F7 | Department filter | Optional filter: show demand/supply only for a specific department (useful when a dept has multiple disciplines). |

**Data Source:**
New API endpoint: `GET /api/analytics/discipline-demand` — returns per-discipline, per-month demand/supply/gap data.

---

### V13: What-If Scenario Mode

> **✅ UX REVIEW COMPLETE** — See [V13-SCENARIO-UX-REVIEW.md](V13-SCENARIO-UX-REVIEW.md) for the full review.
> All 6 open questions resolved. Key changes from original spec: dedicated route (not overlay), zero modifications to existing files, non-dismissible amber banner, row-level selective promotion, private-first sharing model. The review document is the authoritative design reference for V13 implementation.

**Purpose:** Transform the tool from a record-keeper into a decision-making engine. Every resource planning meeting includes "what if" questions that currently require making actual changes and hoping to undo them. This feature provides a safe sandbox for exploring alternatives.

**Isolation Strategy:** What-If lives on its own dedicated route (`/scenarios`) completely separate from the operational dashboards. It does **not** modify the `allocations` table. Scenario data is stored in a separate `scenario_allocations` table. There is zero risk of scenario data contaminating actuals.

#### 13.1 Architecture — Separation from Actuals

```
ACTUAL DATA PATH (existing):
  allocations table → analytics endpoints → dashboard widgets
  ↕ (read/write via /api/allocations)

SCENARIO DATA PATH (new, completely isolated):
  scenario_allocations table → scenario analytics endpoints → scenario view
  ↕ (read/write via /api/scenarios/:id/allocations)

  ┌──────────────────────────────────────────┐
  │  NO SHARED WRITE PATH                    │
  │  Scenario endpoints NEVER write to       │
  │  the allocations table.                  │
  │  Dashboard endpoints NEVER read from     │
  │  the scenario_allocations table.         │
  └──────────────────────────────────────────┘
```

**Key isolation rules:**
1. Separate DB table: `scenario_allocations` (not the `allocations` table)
2. Separate API routes: `/api/scenarios/*` (not `/api/allocations/*` or `/api/analytics/*`)
3. Separate page route: `/scenarios` (not `/dashboard`)
4. No shared React Query cache keys between scenario and actual data
5. Visual: persistent colored banner whenever in scenario context

#### 13.2 User Flow

```
Entry Points:
  1. Top nav: "Scenarios" tab (same level as Overview, Team Load, etc.)
  2. Any dashboard: "What if...?" floating button → redirects to /scenarios

On /scenarios page:
  ┌─────────────────────────────────────────────────────────────────┐
  │  ⚠️  SCENARIO MODE — Changes here do not affect actual data    │
  │  ─────────────────────────────────────────────────────────────  │
  │                                                                 │
  │  My Scenarios                                         [+ New]   │
  │  ┌──────────────────────────────────────────────────────┐      │
  │  │  📋 "Add Scania Phase 2"         Created Apr 1       │      │
  │  │  Based on: Current allocations    3 changes          │      │
  │  │  [Open]  [Compare to Actual]  [Duplicate]  [Delete]  │      │
  │  ├──────────────────────────────────────────────────────┤      │
  │  │  📋 "Svensson parental leave"    Created Mar 28      │      │
  │  │  Based on: Current allocations    1 change           │      │
  │  │  [Open]  [Compare to Actual]  [Duplicate]  [Delete]  │      │
  │  └──────────────────────────────────────────────────────┘      │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

#### 13.3 Scenario Editor

```
┌─────────────────────────────────────────────────────────────────────┐
│  ████████████████████████████████████████████████████████████████   │
│  ██  ⚠️  SCENARIO: "Add Scania Phase 2"  — NOT ACTUAL DATA  ██   │
│  ████████████████████████████████████████████████████████████████   │
│                                                                     │
│  Actions:                                                           │
│  [+ Add Hypothetical Project]  [- Remove Person]  [± Adjust Hours]  │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  Changes from actual:                                               │
│  ─────────────────────────────────────────────────────────────      │
│  ✚ Added project "Scania Phase 2" with 3 people                   │
│    · A. Svensson: 80h/mo Jun–Dec                                   │
│    · B. Lindqvist: 120h/mo Jun–Sep                                 │
│    · NEW: External contractor 160h/mo Jun–Dec                      │
│  ─ Reduced Atlas Copco allocation for A. Svensson by 40h/mo       │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  Impact Preview (scenario vs actual):                               │
│  ─────────────────────────────────────────────────────────────      │
│                                                                     │
│  [Capacity Forecast — showing scenario projections]                 │
│  [Supply vs demand chart with scenario overlay]                     │
│                                                                     │
│  Metric              Actual    Scenario    Delta                    │
│  ─────────────────────────────────────────────────                 │
│  Avg Utilization      84%       92%       ▲ +8%                    │
│  Overloaded People     5         7        ▲ +2    ⚠️               │
│  Bench Hours        1,840h      960h      ▼ -48%  🟢              │
│  New Conflicts         —         2        ▲ +2    ⚠️               │
│                                                                     │
│  Affected People:                                                   │
│  A. Svensson:  87% → 112%  ⚠️ Would become overloaded            │
│  B. Lindqvist: 62% → 95%   Healthy but near limit                 │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  [Save Scenario]  [Compare Side-by-Side]  [Promote to Actual →]    │
│                                                                     │
│  ⚠️ "Promote to Actual" will copy scenario allocations into the    │
│  real allocation table. This action requires confirmation.          │
└─────────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Scenario CRUD | Create, name, duplicate, delete scenarios. Each scenario starts as a snapshot of current actual allocations. |
| F2 | Add hypothetical project | Create a temporary project (exists only in scenario). Assign people with hours per month. |
| F3 | Remove person | Simulate someone leaving (parental leave, resignation, transfer). Zero out their allocations in the scenario. |
| F4 | Adjust hours | Change any allocation in the scenario. Same grid UX as the real allocation grid but writing to scenario table. |
| F5 | Add temporary person | Simulate a new hire or contractor. Create a temporary person (exists only in scenario) with discipline and target hours. |
| F6 | Change log | Visible diff: every change from actual is listed explicitly. User always knows what they've modified. |
| F7 | Impact preview | Same visualizations as the dashboard (capacity forecast, KPIs) but computed from scenario data. Uses dedicated scenario analytics endpoints. |
| F8 | Comparison table | Side-by-side: actual metrics vs scenario metrics with deltas. Same format as Period Comparison (V11). |
| F9 | Side-by-side view | Split screen: actual dashboard on left, scenario dashboard on right. Differences highlighted in amber. |
| F10 | Promote to actual | Copy scenario allocations into the real `allocations` table. Requires confirmation dialog: "This will update X allocations for Y people. This cannot be undone." Only available to `org:admin` and `org:owner` roles. |
| F11 | Visual isolation | Persistent banner across top of page (full width, high contrast amber/orange background) stating "SCENARIO MODE — Changes here do not affect actual data." Cannot be dismissed while in scenario context. |
| F12 | URL isolation | All scenario URLs start with `/scenarios/{scenarioId}/`. No shared routes with dashboard. |
| F13 | Data isolation | Scenario queries use `scenario_allocations` table. Dashboard queries use `allocations` table. No cross-contamination possible at the query layer. |
| F14 | Auto-staleness | If actual allocations change after a scenario was created, show a "Scenario may be outdated" notice with a "Refresh baseline" button that re-snapshots. |
| F15 | Limits | Max 10 scenarios per user. Max 500 allocation changes per scenario. Prevents unbounded storage. |

#### 13.4 Pending UX Decisions (for review round)

These questions must be answered during the UX review before build:

| # | Question | Options to Evaluate |
|---|----------|-------------------|
| 1 | How should "Promote to Actual" work for partial scenarios? | A) All-or-nothing B) Cherry-pick changes C) Only new project allocations |
| 2 | Should scenarios be shareable between users in the same org? | A) Private only B) Shareable read-only C) Collaborative editing |
| 3 | How to handle the scenario allocation grid? | A) Full AG Grid (same as actual) B) Simplified table C) Card-based per-change |
| 4 | Should the impact preview show all dashboard widgets or a curated subset? | A) All available B) Fixed set (forecast + KPIs + conflicts) C) User picks |
| 5 | How prominent should the nav entry be? | A) Top-level nav item B) Sub-item under Overview C) Floating button only |
| 6 | What happens when a scenario references a person who was archived in actuals? | A) Auto-remove from scenario B) Show warning C) Keep as-is (snapshot in time) |

#### 13.5 Database Schema for Scenarios

```sql
CREATE TABLE scenarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  clerk_user_id   TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  base_snapshot_at TIMESTAMPTZ NOT NULL,   -- when actuals were snapshotted
  is_stale        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scenario_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id     UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  person_id       UUID REFERENCES people(id),          -- null for temp people
  project_id      UUID REFERENCES projects(id),        -- null for temp projects
  temp_person_id  UUID,                                 -- for hypothetical people
  temp_project_id UUID,                                 -- for hypothetical projects
  month           DATE NOT NULL,
  hours           INTEGER NOT NULL,
  change_type     TEXT NOT NULL,  -- 'added' | 'modified' | 'removed'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scenario_temp_entities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id     UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL,  -- 'person' | 'project'
  name            TEXT NOT NULL,
  discipline_id   UUID REFERENCES disciplines(id),     -- for temp people
  department_id   UUID REFERENCES departments(id),     -- for temp people
  target_hours    INTEGER,                              -- for temp people
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Feature flag:** `scenarios` — gated behind a new feature flag, disabled by default. Enables `/scenarios` route and nav item.

---

## 5. PDF Export Enhancement

### Current State
- PDF exports only the team heat map (landscape A4, `@react-pdf/renderer`)
- Triggered from `/dashboard/team` via download button

### Enhanced Export Flow

**Trigger:** "Export PDF" button available on both dashboards (and individual widget ⋯ menus).

**Pre-export Modal:**

```
┌─────────────────────────────────────────────────────────────┐
│  Export Dashboard to PDF                              [✕]   │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  Select content to include:                                 │
│                                                             │
│  ☑ KPI Summary Cards                                       │
│  ☑ Capacity Forecast Chart                                 │
│  ☐ Resource Availability Timeline                          │
│  ☑ Availability Finder Results                             │
│  ☑ Utilization Trend Sparklines                            │
│  ☐ Capacity Distribution (Stacked Area)                    │
│  ☑ Department Health Gauges                                │
│  ☑ Bench & Idle Cost Report                                │
│  ☑ Resource Conflict Matrix                                │
│  ☐ Program Portfolio Roll-up                               │
│  ☑ Period Comparison                                       │
│  ☑ Discipline Demand Forecast                              │
│  ☐ Department Bar Chart                                    │
│  ☐ Discipline Chart                                        │
│  ☑ Team Heat Map                                           │
│  ☑ Strategic Alerts                                        │
│                                                             │
│  ────────────────────────────────────────────────────────   │
│  Options:                                                   │
│  Orientation: ● Landscape  ○ Portrait                      │
│  Time range:  [Use current dashboard range ▾]               │
│  Include cover page: ☑                                      │
│                                                             │
│  [Cancel]                            [Export PDF]           │
└─────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| # | Requirement | Detail |
|---|-------------|--------|
| F1 | Checkbox list | Every widget currently visible on the dashboard appears as a checkbox, pre-checked. Hidden widgets appear unchecked. User can toggle any combination. |
| F2 | Select all / none | "Select All" and "Clear All" links at top of list. |
| F3 | Orientation | Landscape (default for data-heavy) or Portrait. |
| F4 | Time range | Default: current dashboard time range. Can override with custom range. |
| F5 | Cover page | Optional first page with: org name, dashboard title, date range, generated timestamp, user name. |
| F6 | Page layout | Each widget gets its own section. Large widgets (timeline, stacked area) get full page. Small widgets (gauges, sparklines) pack 2–3 per page. Intelligent pagination. |
| F7 | Rendering | Charts rendered as static SVG snapshots captured from the live Recharts components. Heat map and tables rendered as `@react-pdf/renderer` table layouts. |
| F8 | Progress | "Generating PDF..." progress bar with estimated time. |
| F9 | Download | Auto-downloads as `{OrgName}-{DashboardType}-{Date}.pdf`. |
| F10 | Widget-level export | Each widget's ⋯ menu includes "Export as PDF" for single-widget export (no modal, direct download). |

---

## 6. Database Schema

### New Tables

```sql
-- User dashboard layout preferences
CREATE TABLE dashboard_layouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  clerk_user_id   TEXT,                -- NULL = tenant default
  dashboard_id    TEXT NOT NULL,       -- 'manager' | 'project-leader'
  device_class    TEXT NOT NULL DEFAULT 'desktop',  -- 'desktop' | 'mobile'
  layout          JSONB NOT NULL,      -- WidgetPlacement[]
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id, clerk_user_id, dashboard_id, device_class)
);

-- Index for fast lookup
CREATE INDEX idx_dashboard_layouts_lookup
  ON dashboard_layouts (organization_id, clerk_user_id, dashboard_id, device_class);
```

### Drizzle Schema Addition

```typescript
// In src/db/schema.ts

export const dashboardLayouts = pgTable(
  'dashboard_layouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clerkUserId: text('clerk_user_id'),         // null = tenant default
    dashboardId: text('dashboard_id').notNull(), // 'manager' | 'project-leader'
    deviceClass: text('device_class').notNull().default('desktop'),
    layout: jsonb('layout').notNull(),           // WidgetPlacement[]
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_dashboard_layout').on(
      table.organizationId,
      table.clerkUserId,
      table.dashboardId,
      table.deviceClass,
    ),
  ],
);
```

### Layout Resolution Order

```
1. User personal layout (org + userId + dashboard + deviceClass)
      ↓ if not found
2. User personal layout (org + userId + dashboard + OTHER deviceClass) → clone & adapt
      ↓ if not found
3. Tenant default layout (org + null userId + dashboard + deviceClass)
      ↓ if not found
4. Built-in persona default (hardcoded in widget registry)
```

---

## 7. API Contracts

### New Endpoints

#### `GET /api/analytics/capacity-forecast`

Returns supply vs demand per month.

**Query Params:** `from` (YYYY-MM), `to` (YYYY-MM), `projectId?` (UUID), `departmentId?` (UUID)

**Response:**
```typescript
interface CapacityForecastResponse {
  months: string[];                    // Ordered YYYY-MM array
  supply: Record<string, number>;      // YYYY-MM → total target hours
  demand: Record<string, number>;      // YYYY-MM → total allocated hours
  gap: Record<string, number>;         // YYYY-MM → supply - demand (negative = deficit)
  summary: {
    surplusMonths: number;
    balancedMonths: number;            // Within ±5%
    deficitMonths: number;
  };
  generatedAt: string;
}
```

**SQL approach:**
```sql
-- Supply: sum of targetHoursPerMonth for active people × months in range
-- Demand: sum of allocations.hours grouped by month
-- Uses generate_series for gapless months (same pattern as team-heatmap)
```

---

#### `GET /api/analytics/availability-timeline`

Returns per-person, per-month allocation broken down by project.

**Query Params:** `from`, `to`, `departmentId?`, `disciplineId?`, `availableOnly?` (boolean)

**Response:**
```typescript
interface AvailabilityTimelineResponse {
  departments: {
    departmentId: string;
    departmentName: string;
    people: {
      personId: string;
      firstName: string;
      lastName: string;
      disciplineAbbreviation: string;
      targetHoursPerMonth: number;
      months: Record<string, {          // YYYY-MM →
        totalAllocated: number;
        available: number;              // target - allocated (min 0)
        utilizationPercent: number;
        projects: {
          projectId: string;
          projectName: string;
          hours: number;
          color: string;                // Assigned from palette
        }[];
      }>;
    }[];
  }[];
  months: string[];
  summary: {
    totalAvailableHours: number;
    peopleWithAvailability: number;
  };
  generatedAt: string;
}
```

---

#### `GET /api/analytics/availability`

Returns ranked list of available people for the Availability Finder.

**Query Params:** `from`, `to`, `disciplineId?`, `departmentId?`, `minHours?` (number), `sort?` ('available' | 'utilization' | 'name')

**Response:**
```typescript
interface AvailabilitySearchResponse {
  results: {
    personId: string;
    firstName: string;
    lastName: string;
    disciplineAbbreviation: string;
    disciplineName: string;
    departmentName: string;
    targetHoursPerMonth: number;
    months: Record<string, {            // YYYY-MM →
      allocated: number;
      available: number;
      utilizationPercent: number;
    }>;
    totalAvailable: number;             // Sum across requested months
    avgUtilization: number;
  }[];
  total: number;                        // Total matching count
  generatedAt: string;
}
```

---

#### `GET /api/analytics/utilization-trends`

Returns 6-month utilization history per entity.

**Query Params:** `groupBy` ('department' | 'person'), `limit?` (number, default 10 for people)

**Response:**
```typescript
interface UtilizationTrendsResponse {
  entities: {
    id: string;
    name: string;
    type: 'department' | 'person';
    headcount?: number;                  // Only for departments
    months: Record<string, number>;      // YYYY-MM → utilization %
    currentUtilization: number;
    changePercent: number;               // vs 6 months ago
    direction: 'up' | 'down' | 'stable'; // ±2% threshold for stable
    isOverloaded: boolean;               // current > 100%
  }[];
  generatedAt: string;
}
```

---

#### `GET /api/analytics/capacity-distribution`

Returns stacked breakdown of hours by grouping dimension.

**Query Params:** `from`, `to`, `groupBy` ('project' | 'department' | 'discipline'), `limit?` (number, default 8)

**Response:**
```typescript
interface CapacityDistributionResponse {
  groups: {
    id: string;
    name: string;
    color: string;                       // From palette
    months: Record<string, number>;      // YYYY-MM → hours
    totalHours: number;
    percentOfTotal: number;
  }[];
  other?: {                              // Aggregated remainder if > limit
    months: Record<string, number>;
    totalHours: number;
    percentOfTotal: number;
  };
  supply: Record<string, number>;        // YYYY-MM → total supply
  months: string[];
  insight?: string;                      // Auto-generated trend insight
  generatedAt: string;
}
```

---

#### `GET /api/analytics/person-summary`

Returns pre-computed card data for the Person 360 Card.

**Query Params:** `personId` (UUID)

**Response:**
```typescript
interface PersonSummaryResponse {
  personId: string;
  firstName: string;
  lastName: string;
  disciplineAbbreviation: string;
  disciplineName: string;
  departmentName: string;
  targetHoursPerMonth: number;
  currentMonth: {
    month: string;
    totalAllocated: number;
    utilizationPercent: number;
    status: 'healthy' | 'warning' | 'overloaded' | 'empty';
    projects: {
      projectId: string;
      projectName: string;
      hours: number;
      percentOfTarget: number;
      color: string;
    }[];
    available: number;
  };
  trend: {
    months: Record<string, number>;    // Last 6 months utilization %
    changePercent: number;
    direction: 'up' | 'down' | 'stable';
  };
  upcomingAvailability: {
    month: string;
    available: number;
  }[];                                   // Next 3 months
  generatedAt: string;
}
```

---

#### `GET /api/analytics/bench-report`

Returns bench/idle capacity report.

**Query Params:** `from`, `to`, `threshold?` (number, default 80 — percent below which a person is "benched")

**Response:**
```typescript
interface BenchReportResponse {
  summary: {
    totalBenchHours: number;
    fteEquivalent: number;
    peopleCount: number;
    trendVsPrevious: {
      previousBenchHours: number;
      changePercent: number;
      direction: 'up' | 'down' | 'stable';
    };
  };
  byDepartment: {
    departmentId: string;
    departmentName: string;
    benchHours: number;
    fteEquivalent: number;
    peopleCount: number;
  }[];
  byDiscipline: {
    disciplineId: string;
    disciplineName: string;
    benchHours: number;
    fteEquivalent: number;
    peopleCount: number;
  }[];
  topAvailable: {
    personId: string;
    firstName: string;
    lastName: string;
    disciplineAbbreviation: string;
    departmentName: string;
    utilizationPercent: number;
    freeHoursPerMonth: number;
  }[];
  insight?: string;                      // Auto-generated suggestion
  generatedAt: string;
}
```

---

#### `GET /api/analytics/conflicts`

Returns resource conflicts (people allocated >100%).

**Query Params:** `month?` (YYYY-MM, default current), `months?` (number, default 1 — how many months forward to check)

**Response:**
```typescript
interface ConflictsResponse {
  conflicts: {
    personId: string;
    firstName: string;
    lastName: string;
    disciplineAbbreviation: string;
    departmentName: string;
    targetHoursPerMonth: number;
    months: Record<string, {              // YYYY-MM →
      totalAllocated: number;
      overBy: number;
      projects: {
        projectId: string;
        projectName: string;
        hours: number;
      }[];
      suggestedResolution?: {
        projectId: string;
        projectName: string;
        reduceBy: number;
        newHours: number;
      };
    }>;
  }[];
  summary: {
    totalConflicts: number;
    resolvedThisMonth: number;
  };
  generatedAt: string;
}
```

---

#### `GET /api/analytics/program-rollup`

Returns program-level aggregated capacity data.

**Query Params:** `programId?` (UUID, omit for all programs), `from`, `to`

**Response:**
```typescript
interface ProgramRollupResponse {
  program: {
    programId: string;
    programName: string;
    projectCount: number;
    totalPeople: number;
    peakMonthlyHours: number;
  } | null;                               // null when "All Programs"
  staffingCompleteness: number;           // Percentage
  disciplineCoverage: {
    disciplineId: string;
    disciplineName: string;
    abbreviation: string;
    coveragePercent: number;
    peopleCount: number;
    gapFte: number;                       // 0 if coverage >= 80%
  }[];
  monthlyLoad: Record<string, number>;   // YYYY-MM → total hours
  projects: {
    projectId: string;
    projectName: string;
    peopleCount: number;
    monthlyHours: number;                 // Average
    status: 'active' | 'planned' | 'archived';
  }[];
  gapAlert?: string;                     // Auto-generated
  generatedAt: string;
}
```

---

#### `GET /api/analytics/period-comparison`

Returns two periods compared with deltas and signals.

**Query Params:** `fromA`, `toA`, `fromB`, `toB` (all YYYY-MM)

**Response:**
```typescript
interface PeriodComparisonResponse {
  periodA: { from: string; to: string; label: string };
  periodB: { from: string; to: string; label: string };
  metrics: {
    name: string;
    valueA: number;
    valueB: number;
    delta: number;
    deltaPercent: number;
    signal: 'improving' | 'worsening' | 'neutral';
  }[];
  departments: {
    departmentId: string;
    departmentName: string;
    utilizationA: number;
    utilizationB: number;
    delta: number;
    note?: string;                        // e.g., "crossed 100%"
  }[];
  notableChanges: string[];              // Auto-generated bullet points
  generatedAt: string;
}
```

---

#### `GET /api/analytics/discipline-demand`

Returns per-discipline demand vs supply per month.

**Query Params:** `from`, `to`, `departmentId?` (UUID)

**Response:**
```typescript
interface DisciplineDemandResponse {
  disciplines: {
    disciplineId: string;
    disciplineName: string;
    abbreviation: string;
    months: Record<string, {              // YYYY-MM →
      demand: number;                     // Sum of allocations for people with this discipline
      supply: number;                     // Sum of target hours for people with this discipline
      gap: number;                        // supply - demand
      status: 'surplus' | 'balanced' | 'tight' | 'deficit';
    }>;
    peakDeficit: number;                  // Worst month gap
    peakDeficitMonth: string;
    sustainedDeficit: boolean;            // 3+ consecutive deficit months
  }[];
  summary: {
    combinedPeakDeficit: number;          // All disciplines combined
    fteHiringNeed: number;                // deficit ÷ avg target
  };
  generatedAt: string;
}
```

---

#### Scenario Endpoints (V13)

All scenario endpoints are under `/api/scenarios/` and gated by the `scenarios` feature flag.

**`GET /api/scenarios`** — List user's scenarios
**`POST /api/scenarios`** — Create new scenario (snapshots current allocations)
**`GET /api/scenarios/:id`** — Get scenario details + change log
**`PUT /api/scenarios/:id`** — Update scenario name/description
**`DELETE /api/scenarios/:id`** — Delete scenario + cascade allocations
**`GET /api/scenarios/:id/allocations`** — Get scenario allocations (merged: base + changes)
**`PUT /api/scenarios/:id/allocations`** — Upsert scenario allocation changes
**`GET /api/scenarios/:id/impact`** — Compute scenario KPIs/metrics (same shape as dashboard KPIs but from scenario data)
**`POST /api/scenarios/:id/promote`** — Copy scenario allocations to actual (admin only, requires confirmation token)

---

#### `GET /api/dashboard/layout`

Returns the resolved layout for current user.

**Query Params:** `dashboardId`, `deviceClass`

**Response:**
```typescript
interface DashboardLayoutResponse {
  layout: WidgetPlacement[];
  source: 'personal' | 'tenant-default' | 'built-in';
  version: number;
}
```

---

#### `PUT /api/dashboard/layout`

Saves user's layout.

**Body:**
```typescript
{
  dashboardId: string;
  deviceClass: 'desktop' | 'mobile';
  layout: WidgetPlacement[];
}
```

---

#### `PUT /api/dashboard/layout/default`

Saves tenant default layout (admin only).

**Body:** Same as above. Requires `org:admin` or `org:owner` role.

---

## 8. Dependencies & Build Order

### Phase Dependency Graph

```
Phase A: Dashboard Framework (foundation — must be first)
  ├── Widget registry
  ├── Dashboard layout engine (grid, drag-drop, resize)
  ├── Edit mode UX
  ├── Layout persistence (DB table + API)
  ├── Time range global/local system
  ├── Person 360 Card (V7) — global overlay, used everywhere
  └── Wrap existing widgets in registry format

Phase B: Core Data Layer (new API endpoints — can parallel with A)
  ├── capacity-forecast endpoint + hook
  ├── availability-timeline endpoint + hook
  ├── availability search endpoint + hook
  ├── utilization-trends endpoint + hook
  └── capacity-distribution endpoint + hook

Phase B2: Advanced Data Layer (can parallel with B)
  ├── person-summary endpoint + hook (V7)
  ├── bench-report endpoint + hook (V8)
  ├── conflicts endpoint + hook (V9)
  ├── program-rollup endpoint + hook (V10)
  ├── period-comparison endpoint + hook (V11)
  └── discipline-demand endpoint + hook (V12)

Phase C: Core Visualizations (depends on B)
  ├── V6: Department Gauges (simplest — good starter)
  ├── V4: Sparklines (lightweight, no new complex data)
  ├── V1: Capacity Forecast Chart (uses forecast endpoint)
  ├── V5: Stacked Area Chart (uses distribution endpoint)
  ├── V3: Availability Finder (uses availability endpoint)
  └── V2: Availability Timeline (most complex — last)

Phase C2: Advanced Visualizations (depends on B2)
  ├── V8: Bench Report (straightforward table + bars)
  ├── V9: Conflict Matrix (interactive sliders)
  ├── V10: Program Roll-up (aggregation view)
  ├── V11: Period Comparison (two-period analysis)
  └── V12: Discipline Demand Heatmap (grid view)

Phase D: Integration & Actions (depends on A + C + C2)
  ├── Register all widgets in registry
  ├── Wire cross-linking actions (forecast→finder, timeline→assign, conflict→resolve)
  ├── Quick-assign modal
  ├── Project leader dashboard route + default layout
  └── Mobile layout defaults

Phase E: PDF Export Enhancement (depends on C + C2)
  ├── Pre-export modal with checkbox UI
  ├── SVG snapshot capture for charts
  ├── PDF page layout engine for mixed content
  ├── Single-widget export from ⋯ menu
  └── Cover page template

Phase F: What-If Scenarios (independent — after UX review)
  ├── UX design review + prototyping
  ├── DB migration (scenarios, scenario_allocations, scenario_temp_entities)
  ├── Scenario CRUD API + feature flag
  ├── Scenario editor page (/scenarios/:id)
  ├── Impact preview (reuse dashboard widgets with scenario data)
  ├── Side-by-side comparison view
  └── Promote-to-actual flow (admin gated)
```

### Build Order (Sequential)

| Order | Phase | Est. Scope | Depends On |
|-------|-------|-----------|------------|
| 1 | A: Dashboard Framework + V7 Person Card | DB migration, registry, layout engine, edit mode, person overlay | Nothing |
| 2 | B + B2: Full Data Layer | 11 new API endpoints + hooks | Nothing (parallel with A) |
| 3 | C1: V6 Gauges + V4 Sparklines | 2 simpler visualizations | B |
| 4 | C2a: V1 Forecast + V5 Stacked Area | 2 chart-heavy visualizations | B |
| 5 | C2b: V8 Bench + V12 Discipline Demand | 2 table-style views | B2 |
| 6 | C3: V3 Availability Finder + V9 Conflicts | Search + conflict resolution | B + B2 |
| 7 | C4: V2 Timeline + V10 Program + V11 Comparison | 3 advanced views | B + B2 |
| 8 | D: Integration | Wire everything, project leader view, cross-links | A + C + C2 |
| 9 | E: PDF Export | Export modal + rendering | C + C2 |
| 10 | F: What-If Scenarios | Separate route, isolated DB, feature-flagged | UX review complete |

### Technology Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Recharts 3.x | ✅ Installed | Used for V1, V5, V6 |
| @react-pdf/renderer | ✅ Installed | PDF export enhancement |
| lucide-react | ✅ Installed | Icons for edit mode, widget drawer |
| Tailwind CSS 4 | ✅ Installed | Grid layout, styling |
| React DnD or similar | ❌ Needs install | Drag-and-drop for widget reordering. Options: `@dnd-kit/core` (recommended, lightweight, accessible) or `react-beautiful-dnd`. |
| Drizzle ORM | ✅ Installed | DB migration for dashboard_layouts |
| AG Grid | ✅ Installed | NOT used for new visualizations (custom HTML preferred) |

**New dependency needed:** `@dnd-kit/core` + `@dnd-kit/sortable` — lightweight drag-and-drop library (~14KB gzipped). Modern, accessible, works with CSS Grid.

---

## 9. Extensibility Architecture

### Adding a New Widget (Future Releases)

A developer adds a new visualization in 3 steps:

**Step 1: Create the component**
```typescript
// src/components/widgets/my-new-chart.tsx
export function MyNewChart({ timeRange, config }: WidgetProps) {
  const { data } = useMyData(timeRange.from, timeRange.to);
  return <div>...</div>;
}
```

**Step 2: Register in the widget registry**
```typescript
// src/features/dashboard/widget-registry.ts
registry.register({
  id: 'my-new-chart',
  name: 'My New Chart',
  description: 'Shows interesting data over time',
  category: 'breakdowns',
  icon: BarChart3,
  component: MyNewChart,
  defaultColSpan: 6,
  minColSpan: 4,
  supportedDashboards: ['manager', 'project-leader'],
});
```

**Step 3: Done.** The widget automatically:
- Appears in the Widget Drawer for users to enable
- Respects global/local time range
- Participates in drag-and-drop reordering
- Gets included in PDF export options
- Persists in saved layouts

### Widget Registry File Structure

```
src/features/dashboard/
├── widget-registry.ts          # Central registry + type definitions
├── widget-registry.types.ts    # WidgetDefinition, WidgetPlacement, etc.
├── dashboard-layout-engine.tsx # Grid renderer, drag-drop, resize
├── dashboard-edit-mode.tsx     # Edit mode overlay + widget drawer
├── dashboard-time-range.tsx    # Global + per-widget time range
├── use-dashboard-layout.ts     # Hook: load/save layout from API
├── default-layouts.ts          # Built-in persona defaults
└── pdf/
    ├── export-modal.tsx        # Pre-export checkbox modal
    ├── widget-snapshot.ts      # SVG capture utility
    └── dashboard-pdf.tsx       # Multi-widget PDF document
```

### Widget ID Convention

All widget IDs use kebab-case and are stable across releases (used as keys in saved layouts):

| Widget ID | Widget | Type |
|-----------|--------|------|
| `kpi-cards` | KPI Summary Cards (existing) | Widget |
| `department-bar-chart` | Department Bar Chart (existing) | Widget |
| `discipline-chart` | Discipline Chart (existing) | Widget |
| `strategic-alerts` | Strategic Alerts (existing) | Widget |
| `allocation-trends` | Allocation Trends (existing, project view) | Widget |
| `discipline-distribution` | Discipline Distribution (existing, project view) | Widget |
| `capacity-forecast` | V1: Capacity Forecast Line Chart | Widget |
| `availability-timeline` | V2: Resource Availability Timeline | Widget |
| `availability-finder` | V3: Availability Finder Panel | Widget |
| `utilization-sparklines` | V4: Utilization Trend Sparklines | Widget |
| `capacity-distribution` | V5: Stacked Area Chart | Widget |
| `department-gauges` | V6: Department Capacity Gauges | Widget |
| `person-360` | V7: Person 360 Profile Card | Global overlay (not a widget) |
| `bench-report` | V8: Bench & Idle Cost Report | Widget |
| `conflict-matrix` | V9: Resource Conflict Matrix | Widget |
| `program-rollup` | V10: Program Portfolio Roll-up | Widget |
| `period-comparison` | V11: Period-over-Period Comparison | Widget |
| `discipline-demand` | V12: Discipline Demand Heatmap | Widget |
| — | V13: What-If Scenarios | Standalone route (`/scenarios`) |

**Deprecation strategy:** If a widget ID is removed in a future version, the layout engine silently ignores unknown IDs during rendering (no crash, no error — the widget just doesn't appear). A migration can clean up stale IDs from saved layouts.

---

## Appendix A: Design Token Reference

All new visualizations use the existing design system tokens from `globals.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | #496173 | Chart lines, sparklines, primary series |
| `--color-on-surface` | #2a3437 | Text, labels |
| `--color-on-surface-variant` | #566164 | Secondary text, axis labels |
| `--color-surface-container` | #e8eff1 | Card backgrounds |
| `--color-surface-container-low` | #f0f4f6 | Dashboard background |
| `--color-outline-variant` | #a9b4b7 | Grid lines, borders |
| `--color-error` | #9f403d | Overload indicators |
| Chart Over | #EF4444 | >100% utilization |
| Chart Healthy | #22C55E | 80–100% utilization |
| Chart Under | #FBBF24 | 50–79% utilization |
| Chart Idle | #D1D5DB | <50% utilization |

---

## Appendix B: Responsive Breakpoints

| Breakpoint | Width | Grid Cols | Behavior |
|------------|-------|-----------|----------|
| Mobile | < 768px | 1 | All widgets full width, stacked. Simplified chart views (fewer data points, larger touch targets). |
| Tablet | 768–1023px | 2 | Widgets snap to 1 or 2 columns. Gauges: 2 per row. |
| Desktop | ≥ 1024px | 12 | Full grid. Widgets at 4, 6, or 12 column spans. |

---

## Appendix C: Acceptance Criteria Summary

| Widget | Key Acceptance Test |
|--------|-------------------|
| Customization Framework | User saves layout on desktop, logs out, logs in on same device → sees saved layout. Logs in on mobile → sees mobile layout or adapted clone. |
| V1 Capacity Forecast | Chart shows 12 months. Surplus months shaded green, deficit months shaded red. Hover shows exact numbers. Click deficit month opens Availability Finder. |
| V2 Availability Timeline | Shows department-grouped swimlanes. Project bars colored and labeled. Click empty gap opens quick-assign modal. Current month line visible. |
| V3 Availability Finder | Filter by discipline + month range → see ranked list sorted by available hours. "Assign" button opens modal, saves allocation, list refreshes. |
| V4 Sparklines | 6-month trend line renders for each department. Arrow shows direction. Red warning on > 100%. Click navigates to filtered heat map. |
| V5 Stacked Area | Toggle between project/department/discipline grouping. Supply line overlay visible. > 8 groups collapse into "Other". Legend items toggle series. |
| V6 Department Gauges | One gauge per department. Color matches utilization threshold. Headcount and trend shown. Click navigates to filtered team view. |
| V7 Person 360 Card | Click any person name in the app → slide-out panel shows current utilization, project breakdown, sparkline trend, upcoming availability, and action buttons. Panel closes on ✕/Escape without navigation. |
| V8 Bench Report | Shows total bench hours + FTE equivalent + people count. Department and discipline breakdowns with bars. Top 5 available people listed. Trend vs previous period shown. |
| V9 Conflict Matrix | Lists all people with >100% allocation for selected month. Per-person shows competing projects with visual bars. Drag sliders adjust hours. "Apply suggestion" resolves conflict in one click. |
| V10 Program Roll-up | Select a program → see aggregated KPIs, discipline coverage bars with gap indicators, monthly load chart, project list. Gap alert triggers when discipline < 80% with FTE count needed. |
| V11 Period Comparison | Select two periods → see side-by-side metrics with delta and 🟢/🔴 signals (context-aware). Department shifts table. Auto-generated notable changes. Export as standalone PDF. |
| V12 Discipline Demand | Grid shows demand/supply/gap per discipline per month. Deficit months highlighted red. FTE hiring need calculated. 3+ consecutive deficit months triggers "consider hiring" callout. |
| V13 What-If Scenarios | Create scenario → make changes (add project, remove person, adjust hours) → see impact preview with KPI comparison. Scenario data NEVER appears on actual dashboards. "Promote to Actual" requires admin + confirmation. Persistent visual banner in scenario mode. |
| PDF Export | Modal shows checkboxes for all visible widgets (including V8–V12). Export produces PDF with selected widgets. Cover page optional. Landscape/portrait toggle works. |
| Tenant Defaults | Admin saves a default layout. New user who has never customized sees the admin-set default. |

---

## Appendix D: Feature Flag Additions

| Flag Name | Default | Gates |
|-----------|---------|-------|
| `dashboards` | org-level | Existing — gates `/dashboard` routes. All V1–V12 widgets require this. |
| `scenarios` | disabled | New — gates `/scenarios` route and "What if...?" button. Enable per-org after UX review. |

---

## Appendix E: New Dependency Summary

| Package | Purpose | Size | Required By |
|---------|---------|------|-------------|
| `@dnd-kit/core` | Drag-and-drop for widget reordering | ~14KB gzipped | Phase A: Dashboard Framework |
| `@dnd-kit/sortable` | Sortable preset for dnd-kit | ~5KB gzipped | Phase A: Dashboard Framework |

All other features (V1–V13) are built with existing dependencies: Recharts, @react-pdf/renderer, Tailwind CSS, Drizzle ORM, Clerk.
