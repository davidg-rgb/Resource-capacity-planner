# Team Overview Heatmap -- UI Review

**Audited:** 2026-03-29
**Baseline:** `creative-direction/01-team-overview-heatmap.html` (design spec)
**Screenshots:** Not captured (no dev server running)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Page title, subtitle, legend labels, and filter labels all differ from spec |
| 2. Visuals | 1/4 | Missing avatar initials, discipline badges, department group headers, footer summary cards, and aggregated metrics |
| 3. Color | 2/4 | Heatmap cell colors use opaque fills instead of spec's subtle tinted backgrounds |
| 4. Typography | 2/4 | Font sizes, weights, and tracking values diverge from spec across headers, cells, and labels |
| 5. Spacing | 2/4 | Cell padding, table padding, and overall content padding are smaller than spec |
| 6. Experience Design | 3/4 | Loading, error, and empty states handled; missing current-month highlight and hover states |

**Overall: 12/24**

---

## Top 3 Priority Fixes

1. **Missing person avatar + discipline badge in table rows** -- Users cannot visually identify team members or their discipline at a glance -- Add avatar circle with initials (`bg-primary-container text-on-primary-container h-7 w-7 rounded-full`) and discipline badge (`bg-secondary-container/50 rounded-full px-1.5 py-0.5 text-[9px]`) in `heat-map-table.tsx` person name cell
2. **Missing footer summary section (legend card + aggregated metrics)** -- Key context (legend, avg utilization, critical risk, hiring gap, project coverage) is absent -- Build a new `HeatMapSummary` component matching the spec's `grid-cols-4` footer with legend card and metrics card
3. **Heatmap cell colors are too saturated (opaque fills vs spec's subtle tints)** -- Current `bg-red-500/80`, `bg-green-500/60`, `bg-amber-400/60` look nothing like spec's `bg-green-50/60`, `bg-amber-50`, `bg-error/10` -- Update `HEAT_MAP_COLORS` in `src/lib/capacity.ts` to match spec palette

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

| Element | Spec | Implementation | File:Line |
|---------|------|----------------|-----------|
| Page title | "Team Capacity Heatmap" | "Team Overview" | `src/app/(app)/dashboard/team/page.tsx:68` |
| Page subtitle | "Visualizing workload distribution across technical disciplines for FY2026." | "Capacity heat map across all team members and months" | `page.tsx:70` |
| Export button label | "Export PDF" (with icon `picture_as_pdf`) | "Export PDF" (no icon) | `page.tsx:78` |
| Export button style | Outlined border style (`border px-4 py-2 text-xs`) | Filled primary (`bg-primary text-on-primary`) | `page.tsx:77` |
| Column header "Resource Name" | "Resource Name" | "Name" | `heat-map-table.tsx:35` |
| Legend label "Low/Empty (<140h)" | Uses hour-based thresholds | Uses percentage thresholds ("Over 100%", "80-100%", etc.) | `page.tsx:106-118` |
| Legend label "Healthy (140-160h)" | Spec uses "Healthy" | Code uses no label text, just "80-100%" | `page.tsx:111` |
| Legend label "High (161-179h)" | Spec uses "High" | Code uses "50-79%" | `page.tsx:114` |
| Legend label "Overloaded (180h+)" | Spec uses "Overloaded" | Code uses "Over 100%" | `page.tsx:108` |
| Filter labels | "Discipline" with pill chips (All/SW/Mek/Elnik) + underline selects | Standard `<select>` dropdowns with "All Departments"/"All Disciplines" | `heat-map-filters.tsx:24-48` |
| Department group header | "SOFTWARE DEVELOPMENT" (uppercase, tracking-widest) | "{dept.departmentName} (N)" with chevron icon | `heat-map-table.tsx:57-67` |
| Search placeholder | "Search resources..." | "Search..." | `top-nav.tsx:98` |

### Pillar 2: Visuals (1/4)

**Major missing components:**

1. **Person avatar initials** -- Spec shows colored circle with 2-letter initials (e.g., `EL`, `MS`) with varying background colors per person. Implementation shows plain text name as a link. (`heat-map-table.tsx:76-82`)

2. **Discipline badge** -- Spec shows a small pill badge below each name (e.g., `SW`, `Mek`, `Elnik`). Not present in implementation.

3. **Filter bar design** -- Spec has a white card container (`bg-surface-container-lowest border shadow-sm rounded-sm p-4`) with discipline pill chips and underline-style selects. Implementation uses plain `<select>` elements with rounded-md borders floating without a container. (`heat-map-filters.tsx:22`)

4. **Footer summary section** -- Spec has a full 4-column footer area with:
   - Grid Legend card (left, 1-col) with color swatches and labels
   - Aggregated Team Health Metrics card (right, 3-col) with 4 KPI blocks: Avg. Utilization, Critical Risk, Hiring Gap, Project Coverage
   - Implementation has only an inline horizontal legend strip. (`page.tsx:106-118`)

5. **Current month highlight** -- Spec highlights the current month column with `bg-surface-container-high/50` header and `border-primary/10 border-x` on data cells. Not implemented.

6. **Table container** -- Spec wraps table in `bg-surface-container-lowest border-outline-variant/10 overflow-hidden rounded-sm border shadow-sm`. Implementation uses `border-outline overflow-x-auto rounded-lg border`. (`heat-map-table.tsx:31`)

7. **Department group row styling** -- Spec uses `bg-surface-container-low/30` with `text-outline-variant text-[10px] font-bold tracking-widest uppercase`. Implementation uses `bg-surface-dim` with `font-semibold` and includes a collapse chevron icon. (`heat-map-table.tsx:54-59`)

8. **Row hover effect** -- Spec uses `hover:bg-surface-container-low group transition-colors` with the sticky name cell also changing background on group-hover. Implementation uses `hover:bg-surface-variant/30`. (`heat-map-table.tsx:74`)

9. **Sticky column background** -- Spec applies `bg-surface-container-lowest group-hover:bg-surface-container-low` to the sticky name cell. Implementation applies `bg-surface`. (`heat-map-table.tsx:76`)

10. **Top nav active state** -- Spec uses `border-b-2 border-[#496173] pb-1 font-bold` for active tab. Implementation uses `border-b-2 border-primary text-primary font-bold` (close but with `px-3 py-4` instead of separate `pb-1`). (`top-nav.tsx:80-83`)

11. **Side nav icons** -- Spec uses Material Symbols (group, event_available, bar_chart, flag, description). Implementation uses Lucide icons and has a different nav structure (no icons in side-nav items, just text links). (`side-nav.tsx:94-109`)

12. **Side nav bottom section** -- Spec has "Help" and "Archive" links at the bottom. Implementation has only "New Entry" button. (`side-nav.tsx:118-125`)

### Pillar 3: Color (2/4)

**Heatmap cell colors (critical divergence):**

| Status | Spec Colors | Implementation Colors | File |
|--------|------------|----------------------|------|
| Healthy/green | `bg-green-50/60` or `bg-green-100/60` with `text-emerald-800` or `text-emerald-900` | `bg-green-500/60 text-green-950` | `src/lib/capacity.ts:69` |
| Warning/amber | `bg-amber-50` or `bg-amber-100` with `text-amber-800` or `text-amber-900` | `bg-amber-400/60 text-amber-950` | `capacity.ts:70` |
| Overloaded/red | `bg-error/10 text-error` or `bg-error/5 text-error` | `bg-red-500/80 text-white` | `capacity.ts:68` |
| Low/idle | `bg-surface-container-low` (neutral) | `bg-gray-200 text-gray-500` | `capacity.ts:71` |

The spec uses very subtle, tinted backgrounds (50-level with opacity) while the implementation uses saturated mid-tone fills. The visual impact is dramatic -- spec looks like a sophisticated data visualization; implementation looks like a traffic light grid.

**Table header colors:**
- Spec: `bg-surface-container-low text-outline` (`#f0f4f6` bg, `#727d80` text)
- Implementation: `bg-surface-variant` (`#d9e4e8` -- noticeably darker)
- File: `heat-map-table.tsx:34`

**Filter select styling:**
- Spec: Underline-only bottom border (`border-x-0 border-t-0 border-b border-outline-variant/50`)
- Implementation: Full border with `border-outline` and `rounded-md`
- File: `heat-map-filters.tsx:11-12`

### Pillar 4: Typography (2/4)

| Element | Spec | Implementation |
|---------|------|----------------|
| Page title | `text-2xl font-semibold` (Manrope) | `text-3xl font-semibold tracking-tight` | `page.tsx:68` |
| Table header | `text-[11px] font-bold tracking-wider uppercase` | `font-medium` (no uppercase, no tracking, default text-sm) | `heat-map-table.tsx:35,41` |
| Table data cells | `text-xs tabular-nums` | `text-xs tabular-nums` (match) | `heat-map-cell.tsx:14` |
| Table overall | `text-left` with specific `text-center` on data cols | `text-sm` (larger than spec) | `heat-map-table.tsx:32` |
| Department group text | `text-[10px] font-bold tracking-widest uppercase` | `font-semibold` (no size specified, defaults larger) | `heat-map-table.tsx:59` |
| Person name | `text-xs font-semibold` (within cell) | Links with `text-primary hover:underline` | `heat-map-table.tsx:78-80` |
| Filter label "DISCIPLINE" | `text-[10px] font-bold tracking-widest uppercase` | Not present (standard select labels) | `heat-map-filters.tsx` |
| Filter selects | `text-xs font-medium` | `text-sm` | `heat-map-filters.tsx:12` |
| Legend item text | `text-[11px] font-medium` | `text-xs` | `page.tsx:107` |

### Pillar 5: Spacing (2/4)

| Element | Spec | Implementation |
|---------|------|----------------|
| Main content padding | `p-8` | `p-4 sm:p-6 lg:p-8` (responsive, but smaller on mobile) | `app-shell.tsx:25` |
| Max content width | `max-w-[1600px]` | `max-w-[1440px]` | `app-shell.tsx:25` |
| Table cell padding (data) | `px-4 py-3` | `px-2 py-1` (significantly smaller) | `heat-map-cell.tsx:14` |
| Table cell padding (name) | `px-6 py-3` | `px-3 py-1` (half the padding) | `heat-map-table.tsx:76` |
| Table header padding | `px-6 py-4` | `px-3 py-2` (half the padding) | `heat-map-table.tsx:35` |
| Name column width | `w-64` (256px) | `min-w-[200px]` (smaller) | `heat-map-table.tsx:35` |
| Filter bar gap | `gap-4` within a `p-4` card | `gap-3` without card container | `heat-map-filters.tsx:22` |
| Header to filters gap | `mb-8` with `gap-6` | `mt-4` | `page.tsx:85` |
| Filters to table gap | Implicit via `mb-8` header block | `mt-4` | `page.tsx:100` |
| Footer margin | `mt-8` | `mt-3` (legend only) | `page.tsx:106` |
| Dept header padding | `px-6 py-2` | `px-3 py-1.5` | `heat-map-table.tsx:59` |
| Top nav padding | `px-6 py-3` | `px-4 md:px-6` with `h-14` | `top-nav.tsx:52` |
| Side nav width | `w-64` | `w-64` (match) | `side-nav.tsx:71` |

### Pillar 6: Experience Design (3/4)

**Present (good):**
- Loading state: "Loading heat map..." text shown during fetch (`page.tsx:89`)
- Error state: "Failed to load heat map data" shown on error (`page.tsx:91`)
- Empty state: "No people found for the selected filters" when no data (`page.tsx:93-96`)
- PDF export with loading state (`exporting` flag, disabled button) (`page.tsx:41-59`)
- Department collapse/expand with chevron icons (`heat-map-table.tsx:16-28`)
- URL-synced filters via search params (`page.tsx:28-36`)
- Suspense boundary wrapping (`page.tsx:124-129`)

**Missing:**
- No current-month column highlight (spec highlights March 2026 with `bg-surface-container-high/50` header and `border-primary/10 border-x` cells)
- No "View Trends" link in footer metrics
- No progress bar for project coverage KPI
- No person-level hover interaction showing detail (spec implies this with group hover)
- No skeleton/loading placeholder (just text "Loading heat map...")
- Custom scrollbar styling from spec (`custom-scrollbar` class with 4px scrollbar) not implemented

---

## Discrepancy Summary by Severity

### Critical (visual identity breaks)

1. **Heatmap cell colors** -- `bg-red-500/80` vs `bg-error/10`; `bg-green-500/60` vs `bg-green-50/60` -- Cells look completely different from spec
2. **Missing avatar initials** -- No visual person identification beyond text name
3. **Missing footer summary** -- 50% of the page's visual content is absent (legend card + 4 KPI metrics)

### Major (layout/structure deviations)

4. **Filter bar** -- Standard selects vs spec's discipline chips + underline selects in a card container
5. **Table cell padding** -- `px-2 py-1` vs `px-4 py-3` -- table feels cramped
6. **Table header styling** -- Missing uppercase, tracking, correct bg color
7. **Department group row** -- Different bg, text styling, has collapse toggle (spec does not)
8. **Export button** -- Filled primary vs outlined border style
9. **Page title** -- `text-3xl` vs `text-2xl`; "Team Overview" vs "Team Capacity Heatmap"
10. **Max content width** -- `1440px` vs `1600px`

### Minor (polish items)

11. **Person name as link** -- Spec shows plain text, implementation makes it a `text-primary` link
12. **Table text size** -- `text-sm` vs spec's implicit smaller sizing
13. **Legend layout** -- Horizontal strip vs dedicated card
14. **Search placeholder** -- "Search..." vs "Search resources..."
15. **Side nav bottom items** -- Missing Help/Archive links
16. **Current month column** -- No visual highlight
17. **Table border radius** -- `rounded-lg` vs `rounded-sm`
18. **Table border color** -- `border-outline` vs `border-outline-variant/10`

---

## Files Audited

- `D:\Kod Projekt\Resurs & Projektplanering\creative-direction\01-team-overview-heatmap.html` (spec)
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\heat-map\heat-map-cell.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\heat-map\heat-map-filters.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\heat-map\heat-map-table.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\app\(app)\dashboard\team\page.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\layout\top-nav.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\layout\side-nav.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\components\layout\app-shell.tsx`
- `D:\Kod Projekt\Resurs & Projektplanering\src\lib\capacity.ts`
- `D:\Kod Projekt\Resurs & Projektplanering\src\features\analytics\analytics.types.ts`
- `D:\Kod Projekt\Resurs & Projektplanering\src\hooks\use-team-heatmap.ts`
- `D:\Kod Projekt\Resurs & Projektplanering\src\app\globals.css`
