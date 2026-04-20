# Widget & Page Inventory — Lean Optimization Audit

**Date:** 2026-04-15
**Method:** Every top-nav route, every persona sub-route, and every registered dashboard widget visited in browser and cross-referenced with `src/features/dashboard/default-layouts.ts` and `widget-registry`.
**Scope:** 22 routes, 21 registered widgets, ~35 distinct UI panels.

---

## 1. Widget Usage Matrix

All widgets registered in `src/features/dashboard/widgets/index.ts`. Count = number of dashboard layouts that place this widget (desktop + mobile combined).

| Widget | Manager desktop | Manager mobile | PL desktop | PL mobile | Total | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `kpi-cards` | ✓ | ✓ | ✓ | ✓ | **4** | Same 4 KPIs across every dashboard |
| `capacity-forecast` | ✓ | ✓ | ✓ | ✓ | **4** | Supply/demand line chart |
| `utilization-heat-map` | ✓ | ✓ | — | — | 2 | Mini version; full-page clone at `/dashboard/team` |
| `capacity-gauges` | ✓ | ✓ | — | — | 2 | "Avdelningshälsa" rings |
| `department-bar-chart` | ✓ | ✓ | — | — | 2 | "Avdelningsbeläggning" |
| `discipline-chart` | ✓ | ✓ | — | — | 2 | Donut/bar by discipline |
| `availability-finder` | ✓ | — | ✓ | ✓ | **3** | List of people w/ month bars + Tilldela CTA |
| `resource-conflicts` | — | ✓ | ✓ | ✓ | **3** | Over/underbooked drilldown |
| `capacity-distribution` | — | — | ✓ | ✓ | 2 | Stacked area |
| `availability-timeline` | — | — | ✓ | — | 1 | People × months timeline |
| `allocation-trends` | — | — | ✓ | — | 1 | |
| `discipline-distribution` | — | — | ✓ | — | 1 | Donut — overlaps `discipline-chart` |
| `program-rollup` | — | — | ✓ | ✓ | 2 | |
| `period-comparison` | — | — | ✓ | — | 1 | |
| `utilization-sparklines` | ✓ | — | — | — | 1 | Per-person sparklines |
| `bench-report` | ✓ | — | — | — | 1 | Underbooked list — overlaps `availability-finder` |
| `strategic-alerts` | — | ✓ | — | — | 1 | Alert rollup — overlaps `/alerts` page |
| `discipline-progress` | — | — | — | — | **0** | **Dead code** — registered but no layout uses it |
| `discipline-demand` | — | — | — | — | **0** | **Dead code** |
| `project-impact` | — | — | — | — | **0** | **Dead code** |

**Findings:** 3 widgets ship in the bundle but are never rendered. Another ~5 pairs semantically overlap (see §3).

---

## 2. Pages × Primary Content

What actually renders on each top-level URL and how many distinct "panels" the user scrolls through.

| Route | Title (UI) | Primary panels | Secondary / filters |
|---|---|---|---|
| `/dashboard` | Management Overview | kpi-cards, utilization-heat-map, capacity-gauges, department-bar, utilization-sparklines, discipline-chart, capacity-forecast, bench-report, availability-finder (9 widgets) | PDF export + Edit mode |
| `/dashboard/projects` | Project Dashboard | kpi-cards, capacity-distribution, availability-timeline, capacity-forecast, allocation-trends, discipline-distribution, program-rollup, resource-conflicts, availability-finder, period-comparison (10 widgets) | Project dropdown + PDF + Edit |
| `/dashboard/team` | Teambelastning | Full-page heat-map table + filters + summary banner | Discipline + Department + date range |
| `/team` | Team (People) | CRUD table: Name / Dept / Disc / Target h/mo / Actions | "+ Add Person" |
| `/projects` | Projects | CRUD table: Name / Program / Status / View / Actions | "+ Add Project" |
| `/input` | Personplanering | Two-pane: people picker (left) + flat people list (right) | New Entry / Help / Archive |
| `/input/[personId]` | Planning grid | AG Grid per-person planning editor | — |
| `/scenarios` | Scenarier | 3 scenario cards (Utkast / Aktiv) | "+ Skapa nytt scenario" |
| `/alerts` | Capacity Alerts | AlertList (over/under thresholds) | Date range 3-month default |
| `/data` | Resursdata och export | FlatTable (allocations) | — |
| `/admin` | Ändringslogg (change log) | Type + period filters, log table (errors out) | — |
| `/admin/disciplines` | CRUD table | disciplines | — |
| `/admin/departments` | CRUD table | departments | — |
| `/admin/programs` | CRUD table | programs | — |
| `/admin/people` | Personer (errors) | Archive-aware people table | "+ Ny" + Visa arkiverade |
| `/admin/projects` | Projekt (same pattern) | Archive-aware projects table | — |
| `/admin/members` | Clerk members CRUD | — | — |
| `/pm` | Mina projekt | Project overview cards (spinner-stuck) | Link to My Wishes |
| `/pm/wishes` | Mina önskemål | 3-tab: Föreslagna / Godkända / Avvisade | — |
| `/pm/projects/[id]` | Per-project timeline | Editable grid + approval gating | — |
| `/line-manager` | Linjechef – Översikt | Legend + **raw i18n key** (missing dept picker) | — |
| `/line-manager/approval-queue` | Godkännandekö | Pending wish cards | — |
| `/line-manager/timeline` | Gruppschema | **raw i18n key** (missing dept picker) | Month/Quarter/Year zoom |
| `/line-manager/import-actuals` | Importera utfall | Dropzone + template download | — |
| `/staff` | Mitt schema | Projects × months grid with plan/actual/delta | Month/Quarter/Year zoom |
| `/rd` | FoU-portfölj | Projects × months matrix | Project/Department toggle + Overcommit filter + zoom |
| `/wishes` | Mina önskemål (same component) | Same MyWishesPanel as /pm/wishes | — |

---

## 3. Duplicates & Overlaps

Ranked by severity.

### 🔴 Severe (same component / same data in two places)

1. **KPI Cards — 2 placements, identical 4 KPIs**
   - `/dashboard` (position 0) + `/dashboard/projects` (position 0)
   - Totala Resurser / Genomsnittlig Beläggning / Överbelastade / Oallokerade — identical numbers.
   - **Lean:** keep on `/dashboard` (the "org overview"). Remove from `/dashboard/projects`, replace with project-scoped KPIs (e.g., project count active vs planned, total committed hours, staffing gap).

2. **Capacity Forecast — 2 placements, same supply/demand line chart**
   - `/dashboard` + `/dashboard/projects`.
   - **Lean:** keep on `/dashboard`. On `/dashboard/projects`, replace with **period-comparison** (which is unique to the project view) promoted higher in the layout.

3. **Availability Finder — 2 placements, identical list of people**
   - `/dashboard` + `/dashboard/projects`.
   - **Lean:** move to a single dedicated tab (e.g. inside `/team` or a new "Free capacity" tab). Link from both dashboards instead of embedding.

4. **Utilization Heat Map — widget + full page**
   - Mini version at `/dashboard` + full version at `/dashboard/team`.
   - **Lean:** keep the full page. Replace the widget with a **single KPI + CTA** (`3 departments red → View heat map`).

5. **People registry — two CRUD pages doing the same job**
   - `/team` (Personal in top-nav) and `/admin/people` (admin subroute).
   - Both list people, both offer add/edit/delete. `/admin/people` adds archive semantics; `/team` does not.
   - **Lean:** delete `/team` route. Make "Personal" in top-nav link to `/admin/people`. Saves a page, saves confusion.

6. **Project registry — same pattern**
   - `/projects` (Projekt in top-nav) and `/admin/projects`.
   - **Lean:** same as above — delete `/projects` list; top-nav "Projekt" → `/admin/projects`. Keep `/projects/[id]` for the detail page.

7. **My Wishes — same component, two routes**
   - `/wishes` and `/pm/wishes` both render `<MyWishesPanel proposerId={userId} />`.
   - **Lean:** keep `/pm/wishes` (it sits inside the PM persona surface). 301 `/wishes` → `/pm/wishes`.

8. **People list duplicated on the SAME page**
   - `/input` shows the same 19 people twice — once as a styled left-sidebar picker, once as a flat right-side list. Clicking either navigates to the same `/input/[personId]`.
   - **Lean:** remove the right-side flat list; leave the styled picker as the only people list and use the main area for the planning grid itself (or the empty-state prompt).

### 🟡 Moderate (semantic overlap, different visualizations)

9. **`strategic-alerts` widget vs `/alerts` full page**
   - Both surface capacity threshold violations.
   - **Lean:** keep `/alerts` as the source of truth; replace the widget with an inline banner + link (already partially implemented as an alert badge on `/dashboard/team`).

10. **`bench-report` vs `availability-finder`**
    - Both list underbooked people.
    - **Lean:** drop `bench-report`. `availability-finder` has the same data plus the assign CTA.

11. **`discipline-chart` vs `discipline-distribution`**
    - Same data (hours per discipline), different chart types.
    - **Lean:** one variant with a segment-type toggle. Delete the other widget.

12. **`resource-conflicts` widget vs `/alerts` page**
    - `resource-conflicts` surfaces overbooked people with conflict details; `/alerts` covers the same threshold violations.
    - **Lean:** move the conflict-drilldown into `/alerts` as a tab; remove the dashboard widget.

### 🟢 Dead widgets (registered but never rendered)

13. **`discipline-progress`, `discipline-demand`, `project-impact`** — in the registry but not in any default layout.
    - **Lean:** delete from `widgets/index.ts` and remove the source files unless a custom-dashboard user layout is known to use them. Run `grep WidgetId '<id>'` against `layout_versions` in the DB first.

---

## 4. Page-Fit Scores

Scale **1 (broken) → 5 (perfect)**. "Fit" = does the page deliver the user job it's named for, without duplicate or irrelevant content?

| Route | Score | Rationale |
|---|:---:|---|
| `/dashboard/team` (Teambelastning) | **5** | Single-purpose heat-map with filters + summary banner. Fastest path to "who's red?". Keep. |
| `/staff` (Mitt schema) | **5** | Exactly the minimal view the journey asks for. Keep as-is. |
| `/line-manager/import-actuals` | **5** | One job, dropzone + template. Clean. |
| `/scenarios` | **4** | Cards + create CTA, tight. No duplicates. |
| `/alerts` | **4** | Focused list, but partially duplicated by strategic-alerts widget. |
| `/admin/disciplines` / `/departments` / `/programs` | **4** | Small focused CRUD tables. |
| `/pm/wishes` | **4** | Tab layout for status filter is clean. Only flaw: empty state could be richer (inline "submit a wish" CTA). |
| `/rd` (FoU-portfölj) | **4** | Rich matrix with project/dept toggle + overcommit filter. Minor column overflow on narrow screens. |
| `/line-manager/approval-queue` | **4** | Clean empty state; loses a point because it's orphaned from nav. |
| `/data` (Exportera) | **3** | Flat table is functional but has no filter affordance and no empty state. |
| `/projects` | **3** | Works but duplicates `/admin/projects`. |
| `/dashboard` (Management Overview) | **3** | Nine widgets is *a lot* of vertical scroll. Remove widget 1 (utilization-heat-map), widget 8 (bench-report → redundant with availability-finder) and KPI card bloat. |
| `/team` (Personal) | **2** | Duplicates `/admin/people`. Department/Discipline columns show "--" for every row (the columns are in the schema but no row has values). |
| `/dashboard/projects` | **2** | 10 widgets, 3 of which are byte-for-byte copies from `/dashboard`. Strongest candidate for consolidation. |
| `/input` | **2** | Same people list rendered twice on the same page. |
| `/admin/people` | **2** | API errors on load. Valuable page behind a broken call. |
| `/wishes` | **2** | Redundant — identical to `/pm/wishes`. |
| `/pm` | **1** | Empty-state never fires; stuck on "Laddar…" spinner. |
| `/line-manager` | **1** | Raw i18n key `v5.lineManager.home.selectDepartment` renders as text; missing picker; can't complete any LM journey from here. |
| `/line-manager/timeline` | **1** | Same raw-key regression. |
| `/admin` (Ändringslogg) | **1** | API errors; wrong PersonaGate i18n; landing page should be the strongest admin surface but it's the weakest. |

**Average score: 3.1 / 5.** Remove the 7 duplicated / broken surfaces and the mean jumps to ~4.

---

## 5. Top-Nav Recount

Current top-nav (11 items) and what they actually lead to:

| Label | URL | What it is | Keep? |
|---|---|---|---|
| Teambelastning | `/dashboard/team` | Heat map | ✅ Keep — primary value |
| Planera timmar | `/input` | People picker | ✅ Keep |
| Projekt | `/projects` | Project CRUD | ❌ Merge into Admin/Projects |
| Översikt | `/dashboard` | Manager dashboard | ✅ Keep |
| Projektvy | `/dashboard/projects` | Project-leader dashboard | ⚠️ Trim to unique widgets only |
| Scenarier | `/scenarios` | Scenario list | ✅ Keep |
| Personal | `/team` | People CRUD | ❌ Merge into Admin/People |
| Exportera | `/data` | Flat table | ✅ Keep (rename "Rådata") |
| Admin | `/admin/disciplines` | Reference data CRUD | ⚠️ Retarget to `/admin` (change log) |
| Medlemmar | `/admin/members` | Clerk users | ✅ Keep |

**Result:** 10 → 7 items. Also add **persona-scoped "Home"** as first item (auto-computes `getLandingRoute(persona)`).

---

## 6. Lean Consolidation Plan

Ordered by impact × cost. One-sitting changes up top.

### Round 1 — Remove waste (1 day)

1. **Delete `/team` and `/projects` top-level pages**; update top-nav to point "Personal" → `/admin/people` and "Projekt" → `/admin/projects`. Add redirect routes for bookmarks.
2. **Redirect `/wishes` → `/pm/wishes`** (or inline the route under the PM persona surface).
3. **Strip duplicate widgets from `project-leader:desktop` layout:** remove `kpi-cards`, `capacity-forecast`, `availability-finder` from `default-layouts.ts:43`. Replace with project-scoped KPIs (staffing gap, active project count, etc.).
4. **Remove the right-side flat list from `/input`**; keep only the left sidebar picker.
5. **Delete dead widgets** `discipline-progress-widget.tsx`, `discipline-demand-widget.tsx`, `project-impact-widget.tsx` (and their `@/components/charts/*` counterparts if no other import remains). Verify no tenant custom layouts reference them first.
6. **Replace the `utilization-heat-map` dashboard widget** with a two-line summary card linking to `/dashboard/team`.

### Round 2 — Repair broken surfaces (2 days)

7. **Line Manager department picker** — wire Phase 41's picker so `/line-manager` and `/line-manager/timeline` stop rendering raw i18n keys.
8. **PM Home empty-state fix** — stop sticking on `isLoading` when `data.projects.length === 0`. Show an explicit "Du saknar projekt" + CTA to request staffing.
9. **Admin change-log and admin/people API errors** — triage the two failing endpoints. They're the *landing page* of the admin surface and every admin journey starts here.
10. **Fix PersonaGate i18n** — error message must name the persona kind from the `allowed` prop, not a hardcoded "line manager".

### Round 3 — Re-scope the dashboards (3–5 days)

11. **Manager dashboard**: drop `utilization-heat-map` (→ link), `bench-report` (→ rolled into availability-finder). Reorganize remaining 7 widgets into one-screen-no-scroll on 1440px.
12. **Project-leader dashboard**: after Round 1's trim, it should be ~7 unique widgets. Validate each one against a PM journey; drop any widget that doesn't map to a concrete question Anna asks.
13. **Strategic-alerts widget**: delete; cover with a top-right notification badge that deep-links to `/alerts`.
14. **`discipline-chart` + `discipline-distribution`**: merge into a single component with a chart-type toggle (bar/donut).
15. **`resource-conflicts` widget**: fold into `/alerts` as a tab; remove the dashboard placement.

### Round 4 — Persona-scoped navigation (1 week)

16. Build out `SECTION_NAV` entries for `/pm`, `/line-manager`, `/staff`, `/rd`, `/admin` (see `UX-AUDIT-PERSONAS.md`).
17. Filter top-nav by `visibleFor: PersonaKind[]` per item — e.g., Staff sees only Home + maybe Help.
18. Persona-scoped notification badge (LM→approvals, PM→rejected wishes, R&D→overcommits).

---

## 7. Summary Numbers

- **Widgets registered:** 21
- **Widgets actually rendered by default:** 18
- **Dead widgets:** 3 (≈14% of bundle)
- **Widgets appearing on ≥2 dashboards identically:** 4 (`kpi-cards`, `capacity-forecast`, `availability-finder`, `utilization-heat-map`)
- **Top-level routes:** 22
- **Routes that semantically duplicate another:** 4 (`/team`, `/projects`, `/wishes`, `/dashboard` utilization mini)
- **Pages rendering the same content twice on one page:** 1 (`/input`)
- **Pages currently broken (score 1):** 4 (`/pm`, `/line-manager`, `/line-manager/timeline`, `/admin`)
- **Pages scoring 5:** 3 (`/dashboard/team`, `/staff`, `/line-manager/import-actuals`)

Applying Round 1 alone removes **2 top-nav items, 4 duplicate widgets, 3 dead widgets, 1 duplicate page-internal list** — a ~20 % surface-area reduction with no feature loss.
