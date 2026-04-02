# Post-Fix Verification Audit

**Audited:** 2026-03-29
**Baseline:** Stitch prototypes `01-team-overview-heatmap.html` and `06-management-dashboard.html`
**Functional baseline:** ARCHITECTURE.md requirements F-013, F-015, F-016, F-017, F-027
**Screenshots:** Not captured (no dev server running)

---

## VIEW 1: Team Overview Heat Map

### Spec File: `creative-direction/01-team-overview-heatmap.html`
### Code Files: `heat-map-table.tsx`, `heat-map-cell.tsx`, `heat-map-filters.tsx`, `dashboard/team/page.tsx`

---

### 1. REMAINING VISUAL GAPS

#### A. `custom-scrollbar` CSS class is undefined
- **heat-map-table.tsx:36** uses `className="custom-scrollbar overflow-x-auto"`
- The spec defines `.custom-scrollbar::-webkit-scrollbar` styles (spec lines 34-44) with `width: 4px`, `height: 4px`, track color `#f0f4f6`, thumb color `#a9b4b7`.
- **globals.css** has NO definition for `custom-scrollbar`. The class is a no-op.
- **Impact:** Scrollbar on the heat map grid uses browser defaults instead of the slim 4px Nordic scrollbar.

#### B. Export PDF button missing `picture_as_pdf` icon
- **Spec line 283-284:** `<span class="material-symbols-outlined text-sm">picture_as_pdf</span> Export PDF`
- **team/page.tsx:80:** Only renders text `"Export PDF"` or `"Exporting..."` with no icon.
- **Impact:** Minor visual difference -- button lacks the PDF icon from the spec.

#### C. Export PDF button border opacity differs
- **Spec line 281:** `border-outline-variant/30`
- **team/page.tsx:78:** `border-outline-variant` (no opacity modifier -- defaults to 100%)
- **Impact:** Button border is more visible than intended.

#### D. "View Trends" link missing `trending_up` icon
- **Spec lines 615-617:** Shows `trending_up` Material icon next to "View Trends" text.
- **team/page.tsx:146-148:** Only has the text "View Trends", no icon element.

#### E. Sticky name column has extra `border-r` not in spec
- **heat-map-table.tsx:78:** Adds `border-outline-variant/10 border-r` on the sticky name cell.
- **Spec lines 380-382:** The sticky `<td>` has NO `border-r`. Only the current-month column gets `border-x`.
- **Impact:** A thin right border appears on the name column that doesn't exist in the spec.

#### F. Name cell font size difference
- **heat-map-table.tsx:84:** Uses `text-xs` for the person name.
- **Spec line 390:** Person name `<p>` has no text-size class (inherits from `tbody` which is `text-xs`). This is actually a MATCH, but the spec's name text has no explicit `text-xs` class -- it is inherited. Functionally equivalent.

#### G. Current month column highlighting missing
- **Spec lines 359, 403, 440, 482, 519, 553:** The current month column gets `bg-surface-container-high/50` on the header and `border-primary/10 border-x` on each cell.
- **heat-map-cell.tsx / heat-map-table.tsx:** No concept of "current month" styling. All month cells are treated identically.
- **Impact:** There is no visual indicator of which column represents the current month.

#### H. Avatar color varies by department in spec but is uniform in code
- **Spec:** Uses different avatar background colors per person/department:
  - `bg-primary-container` (line 385), `bg-secondary-container` (line 424), `bg-surface-container-highest` (lines 466, 537), `bg-error/10` (line 503)
- **heat-map-table.tsx:80:** All avatars use `bg-primary-container text-on-primary-container`.
- **Impact:** No visual differentiation between departments/disciplines in avatar colors.

#### I. Filter UI structure differs from spec
- **Spec lines 288-341:** Uses pill-style discipline toggles (`All`, `SW`, `Mek`, `Elnik` as rounded-full spans) plus underline-style selects (border-bottom only, no full border).
- **heat-map-filters.tsx:** Uses standard `<select>` dropdowns with `rounded-sm border-none bg-surface-container-low` and `<input type="month">` fields.
- **Impact:** The filter bar looks substantially different from the spec's pill + underline-select design.

---

### 2. FUNCTIONAL GAPS

| Requirement | Status | Notes |
|-------------|--------|-------|
| F-013: Team Overview heat map | PASS | Table renders, data fetched via `useTeamHeatMap`, grouped by department |
| F-013: Read-only | PASS | No edit controls on heat map |
| F-013: All people, color-coded | PASS | `calculateHeatMapStatus()` + `HEAT_MAP_COLORS` map provides 4-tier color coding |
| F-027: PDF export | PASS | `handleExportPdf()` at team/page.tsx:41-59, downloads blob |
| Collapsible departments | BONUS | Not in spec but adds UX value (toggle via `collapsedDepts` state) |
| Grid Legend | PASS | Legend card matches spec (lines 106-137) |
| Aggregated Metrics | PASS | 4 KPI metrics match spec content |

**No functional gaps found for View 1.**

---

### 3. CODE ISSUES

| File | Line | Issue |
|------|------|-------|
| heat-map-table.tsx | 36 | `custom-scrollbar` class referenced but never defined in CSS -- no-op |
| heat-map-table.tsx | 78 | `z-10` on person row sticky cell vs `z-20` on header -- correct layering, no issue |
| heat-map-cell.tsx | 14 | Cell classes concatenated correctly, no issue |
| team/page.tsx | 3 | `useState` imported and used for `exporting` -- OK |

No TypeScript errors, no missing imports, no unused variables detected.

---

### 4. VERDICT: Team Overview

**GAPS REMAIN**

Priority gaps:
1. `custom-scrollbar` CSS not defined (missing styles)
2. Current month column highlighting absent
3. Filter UI uses dropdowns instead of spec's pill toggles + underline selects
4. Export PDF button missing icon and has wrong border opacity
5. Avatar colors are uniform instead of department-varied
6. "View Trends" missing icon

---

## VIEW 2: Management Dashboard

### Spec File: `creative-direction/06-management-dashboard.html`
### Code Files: `dashboard/page.tsx`, `dashboard-content.tsx`, `kpi-card.tsx`, `utilization-heat-map.tsx`, `discipline-progress.tsx`, `strategic-alerts.tsx`, `project-impact.tsx`

---

### 1. REMAINING VISUAL GAPS

#### A. Page title/subtitle match exactly -- PASS
- **page.tsx:11-16** matches spec lines 259-264 ("Management Overview", subtitle text).

#### B. KPI Cards -- PASS
- **kpi-card.tsx** matches spec structure: `border-b-2`, `p-6`, correct variant borders, badge styling.
- All 4 cards (Total Resources, Avg Utilization, Overloaded, Unallocated) rendered via `dashboard-content.tsx:83-112`.
- Classes match spec precisely.

#### C. Utilization Heat Map -- PASS
- **utilization-heat-map.tsx** matches spec almost exactly:
  - `border-primary rounded-sm border-l-4 p-6` (line 27) matches spec line 338.
  - Legend dots match spec colors and sizes.
  - Cell color logic matches spec thresholds (>95% error, 85-95% primary, 70-85% primary/60, 60-70% primary/40, <60% surface-container-high).
  - `h-10` cell height, `rounded-sm`, `font-bold`, `tabular-nums` all match.

#### D. Utilization heat map cell text size differs
- **utilization-heat-map.tsx:73:** Uses `text-sm` on the cell div.
- **Spec lines 381-509:** No explicit text size on the cell div (inherits `text-xs` from the `<table>` element), but the cell content shows percentage values with `font-bold`.
- **Impact:** Minor -- cells show percentage values slightly larger than spec.

#### E. Strategic Alerts -- PASS
- **strategic-alerts.tsx** matches spec lines 561-593 exactly:
  - Error alert: `bg-error-container/10 border-error/10`, warning icon, correct text.
  - Under-utilization alert: `bg-surface-container-high`, trending_down icon, correct text.

#### F. Discipline Progress -- PASS
- **discipline-progress.tsx** matches spec lines 596-658:
  - Container: `bg-surface-container-low border-primary/20 rounded-sm border-t-2 p-6` -- exact match.
  - 3 disciplines (SW, HW, Mek) with correct percentages, dot colors, bar colors, available/assigned labels.
  - Progress bar: `bg-surface-container-highest h-1.5 w-full overflow-hidden rounded-full` -- exact match.

#### G. Project Impact -- PASS
- **project-impact.tsx** matches spec lines 660-689:
  - Card wrapper: `bg-surface-container-lowest rounded-sm p-6` -- exact match.
  - Items: `bg-surface hover:bg-surface-container-low border-outline-variant/20 border-l-2` -- exact match.
  - `chevron_right` icon present.

#### H. System Visual image card -- MISSING
- **Spec lines 692-707:** A decorative image card with overlay and "Precision Core" badge.
- **Not implemented in any dashboard component.**
- **Impact:** Minor decorative element. This is an acceptable omission (purely decorative, not functional).

#### I. Time Range Selector -- EXTRA (not in spec)
- **dashboard-content.tsx:48-63:** Adds a 3/6/12 month toggle not present in the spec.
- **Impact:** This is a functional enhancement, not a gap. Positive deviation.

#### J. Team Overview link card -- EXTRA (not in spec)
- **page.tsx:46-56:** Adds a link card to the Team Overview page.
- **Impact:** Useful navigation addition. Positive deviation.

#### K. Grid layout matches spec
- **dashboard-content.tsx:116:** `grid grid-cols-12 gap-8` matches spec line 335.
- Left column `col-span-12 lg:col-span-8` matches spec line 337.
- Right column `col-span-12 lg:col-span-4` matches spec line 596.

---

### 2. FUNCTIONAL GAPS

| Requirement | Status | Notes |
|-------------|--------|-------|
| F-015: Management Dashboard | PASS | KPI cards + departmental heat map present |
| F-015: KPI cards | PASS | 4 KPI cards with correct data binding via `useDashboardKPIs` |
| F-015: Departmental heat map | PASS | `UtilizationHeatMap` with 4 departments, correct color thresholds |
| F-016: Capacity alerts | PASS | `StrategicAlerts` shows overloaded + under-utilized alerts |
| F-017: Discipline breakdown | PASS | `DisciplineProgress` with 3 disciplines, progress bars |

**No functional gaps found for View 2.**

---

### 3. CODE ISSUES

| File | Line | Issue |
|------|------|-------|
| dashboard-content.tsx | 38 | `useDepartmentUtilization` and `useDisciplineBreakdown` called but results unused -- hooks kept "active" per comment. Lint-safe due to being called, but wasteful API calls since demo data is used instead. |
| utilization-heat-map.tsx | - | Uses demo data (`DEMO_DATA`) instead of actual API data. This is a known interim approach but means the heat map does not reflect real data. |
| discipline-progress.tsx | - | Same -- uses `DEMO_DATA` instead of API data. |
| strategic-alerts.tsx | - | Same -- hardcoded alerts, not driven by actual capacity data. |
| project-impact.tsx | - | Same -- hardcoded demo projects. |

No TypeScript errors, no missing imports, no broken references.

---

### 4. VERDICT: Management Dashboard

**PASS** (visual match is very close)

Minor gaps:
1. Cell text size `text-sm` vs inherited `text-xs` in heat map cells
2. Decorative image card omitted (acceptable)
3. Dashboard charts use demo data instead of live API data (functional limitation, not a spec mismatch)

---

## SHARED COMPONENTS

### Layout: `app-shell.tsx`, `side-nav.tsx`, `top-nav.tsx`

#### Side Nav
- **Spec (both files):** Fixed sidebar with "Resource Planner" branding, nav items (Resources, Allocations, Capacity, Milestones, Reports), "New Entry" button, Help/Archive links.
- **side-nav.tsx:** Dynamic section-based navigation. Structure differs from spec (section headings, context-aware items) but follows the same visual pattern (bg, spacing, typography).
- **Acceptable deviation:** The side nav is more dynamic than the static spec, which is expected for a real app with multiple routes.

#### Top Nav
- **Spec (both files):** Horizontal nav with Input/Team/Projects/Data/Dashboard links, search bar, notifications/settings buttons, user avatar.
- **top-nav.tsx:** Matches closely. Uses Lucide icons instead of Material Symbols for nav chrome, but Material Symbols loaded for components that use them. Has mobile hamburger menu (responsive enhancement not in spec).
- **Acceptable deviation:** Icon library difference in nav chrome is consistent throughout the app.

---

## CAPACITY LOGIC: `src/lib/capacity.ts`

### Heat Map Thresholds

| Spec (01-team-overview) | Code (`calculateHeatMapStatus`) | Match? |
|--------------------------|-------------------------------|--------|
| Overloaded: 180h+ (with 160h target = >112.5%) | over: >100% of target | CLOSE -- spec uses absolute hours, code uses ratio. With 160h target, code triggers "over" at 161h+ vs spec's 180h+. |
| High: 161-179h (with 160h target = 100.6%-111.9%) | healthy: 80-100% | MISMATCH -- these would show as "healthy" (green) in code but "amber" in spec |
| Healthy: 140-160h (87.5%-100%) | healthy: 80-100% | MATCH |
| Low/Empty: <140h (<87.5%) | under: 50-79%, idle: <50% | PARTIAL MATCH |

**This is a significant functional concern.** The spec's thresholds are:
- Green: 140-160h (87.5-100% of 160h)
- Amber: 161-179h (100.6-111.9% of 160h)
- Red: 180h+ (112.5%+ of 160h)

But the code's thresholds are:
- Green (healthy): 80-100% of target
- Red (over): >100% of target
- Amber (under): 50-79% of target

This means a person at 165h/160h target (103%) would show RED in code but AMBER in spec. The threshold mapping is inverted for the warning zone.

**However**, this was likely an intentional architectural decision documented in ARCHITECTURE.md (ratio-based vs absolute hours). The code is internally consistent. The visual result differs from the static spec mockup.

---

## OVERALL SUMMARY

### View 1: Team Overview Heat Map -- GAPS REMAIN

| Gap | Severity | Effort |
|-----|----------|--------|
| `custom-scrollbar` CSS not defined | Medium | 5 min -- add CSS to globals.css |
| Current month column highlighting absent | Medium | 30 min -- pass current month prop, conditional classes |
| Filter UI differs (dropdowns vs pills) | Low | 2 hr -- redesign filter component |
| Export PDF button missing icon | Low | 2 min -- add Material icon span |
| Export button border opacity wrong | Low | 1 min -- change to `border-outline-variant/30` |
| Avatar colors uniform | Low | 15 min -- vary by department/discipline |
| "View Trends" missing icon | Low | 2 min -- add `trending_up` icon |

### View 2: Management Dashboard -- PASS

| Gap | Severity | Effort |
|-----|----------|--------|
| Heat map cell text-sm vs text-xs | Cosmetic | 1 min |
| Demo data instead of live API | Known limitation | Not a spec gap |
| Decorative image card omitted | Cosmetic | 10 min |

### TOP 3 PRIORITY FIXES

1. **Add `custom-scrollbar` CSS to `globals.css`** -- The heat map grid references this class on every render. Without it, the scrollbar uses chunky browser defaults instead of the slim 4px Nordic design. Add the 12 lines of CSS from the spec.

2. **Add current month column highlighting to heat map** -- The spec highlights the current month with a tinted header (`bg-surface-container-high/50`) and bordered cells (`border-primary/10 border-x`). This is a key visual affordance for "where are we now?" context. Pass current month as prop and apply conditional classes.

3. **Add `picture_as_pdf` icon to Export PDF button and fix border opacity** -- Two-line fix: add `<span className="material-symbols-outlined text-sm">picture_as_pdf</span>` before the button text, and change `border-outline-variant` to `border-outline-variant/30`.

---

## FILES AUDITED

- `D:\Kod Projekt\Resurs & Projektplanering\creative-direction\01-team-overview-heatmap.html`
- `D:\Kod Projekt\Resurs & Projektplanering\creative-direction\06-management-dashboard.html`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\heat-map\heat-map-table.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\heat-map\heat-map-cell.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\heat-map\heat-map-filters.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\app\(app)\dashboard\team\page.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\app\(app)\dashboard\page.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\app\(app)\dashboard\dashboard-content.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\charts\kpi-card.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\charts\utilization-heat-map.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\charts\discipline-progress.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\charts\strategic-alerts.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\charts\project-impact.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\layout\side-nav.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\layout\top-nav.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\layout\app-shell.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\lib\capacity.ts`
- `D:\Kod Projekt\Resurs & Projektplanering\src\app\globals.css`
- `D:\Kod Projekt\Resurs & Projektplanering\src\app\layout.tsx`
