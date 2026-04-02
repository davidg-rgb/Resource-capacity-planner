# Spec-vs-Implementation Visual Audit

**Audited:** 2026-03-29
**Baseline:** `creative-direction/07-resource-capacity-prd.html` (PRD text spec) + `creative-direction/09-resource-data-export.html` (Data Export HTML prototype)
**Screenshots:** Not captured (no dev server running)

---

## Summary

Two creative-direction specs were compared against the current codebase. The PRD (07) is a text-only spec defining principles and screen descriptions. The Data Export (09) is a fully styled HTML prototype with exact Tailwind classes, Material Symbols icons, color tokens, layout, and typography. The audit below compares every visual detail.

---

## MATCHES (things already correct)

### Color System
- **Tailwind color tokens match exactly.** `globals.css` defines the same Material Design 3 token set as the spec: `primary: #496173`, `surface: #f8fafb`, `on-surface: #2a3437`, `outline: #727d80`, `outline-variant: #a9b4b7`, all secondary/tertiary tokens, etc.
- **Font families match.** Both spec and code use Manrope (headline) and Inter (body).
- **Border radius scale matches.** Spec: `0.125rem / 0.25rem / 0.5rem / 0.75rem`. Code: `--radius-sm: 2px, --radius-md: 4px, --radius-lg: 8px, --radius-full: 12px`.

### Data Page Header
- **Page title uses `font-headline text-on-surface text-3xl font-bold tracking-tight`** -- matches spec exactly.
- **Subtitle uses `text-on-surface-variant mt-1 text-sm`** -- matches spec.

### Filter Bar
- **Container styling matches:** `bg-surface-container-lowest border-outline-variant/10 rounded-sm border p-5 shadow-sm`.
- **Filter labels match:** `text-outline mb-1.5 text-[10px] font-bold tracking-wider uppercase`.
- **Filter inputs match:** `bg-surface-container-low focus:ring-primary rounded-sm border-none px-3 py-2 text-xs focus:ring-1`.

### Data Table Container
- **Table wrapper matches:** `bg-surface-container-lowest border-outline-variant/10 overflow-hidden rounded-sm border shadow-sm`.

### Sidebar (SideNav)
- **Width matches:** `w-64` (256px) -- spec uses `w-64` (256px).
- **Background color close:** Code uses `bg-surface-container-low` (`#f0f4f6`), spec uses `bg-[#f0f4f6]` -- same color.
- **"Resource Planner" branding present** with icon box and subtitle.
- **"New Entry" button present** with `bg-primary text-on-primary` styling.
- **Position:** `fixed top-14 left-0` -- correct fixed positioning below header.

### Top Navigation
- **"Nordic Capacity" branding** with `font-headline text-primary text-xl font-semibold tracking-tighter`.
- **Active nav item uses `border-primary text-primary font-bold`** border-bottom style.
- **Search input present** with correct styling.

### Person Input Form (Screen 1)
- **PersonHeader** has prev/next navigation arrows -- matches spec screen 1.
- **Discipline and Department badges** using `bg-secondary-container text-on-secondary-fixed rounded-full`.
- **Target hours display** with uppercase label and primary-colored value.
- **AllocationGrid** uses AG Grid with pinned project column, month columns, SUMMA/Target/Status rows -- matches spec.
- **Tabular digits** (`tabular-nums`) used on number cells.
- **Current month highlighting** via `bg-primary-container/5`.
- **Past months read-only** with `bg-surface-container-low text-outline opacity-60`.

### Heat Map (Team Overview)
- **Color-coded cells** with over/healthy/under/idle status -- matches spec screen 3.
- **Department grouping** with collapsible rows.
- **Sticky left column** for names.

### Capacity Status Colors
- **Green/Amber/Red/Gray** for healthy/warning/overloaded/empty -- matches spec component reference.

---

## DISCREPANCIES

### D1 -- Export Button: Text and Icon Mismatch
**Spec:** `Export to Excel` with `download` Material Symbol icon, `shadow-md`
**Code:** `Export` with Lucide `Download` icon + `ChevronDown` dropdown indicator
- File: `src/components/flat-table/flat-table.tsx:87-91`
- The spec shows a single "Export to Excel" action button. The code shows a dropdown with "Export" label that opens XLSX/CSV options.

### D2 -- Missing "Discipline" Column in Flat Table
**Spec:** Table has 6 columns: Person, Discipline, Department, Project, Month, Hours
**Code:** Table has 6 columns: Person Name, Department, Project Name, Program, Month, Hours
- File: `src/components/flat-table/flat-table-columns.ts:5-48`
- **Discipline column is missing** -- replaced by Program column which is not in the spec.
- Spec shows discipline as a badge (`SW`, `Mek`, `Elnik`) with `bg-secondary-container text-on-secondary-fixed rounded-full px-2 py-0.5 text-[10px] font-bold uppercase`.

### D3 -- Missing "Discipline" Filter in Filter Bar
**Spec:** Filter bar has 5 filters: Person, Discipline, Dept, Project, Date Range
**Code:** Filter bar has 5 filters: Person, Project, Department, From month, To month
- File: `src/components/flat-table/flat-table-filters.tsx:20-134`
- **Discipline filter is missing entirely.**
- Date Range is implemented as two separate month inputs instead of a single quarter-based select.

### D4 -- Missing Filter Reset Icon Button
**Spec:** Filter bar has a `filter_list_off` Material Symbol icon button to reset filters, styled `text-outline hover:text-primary p-2`
**Code:** Uses an underlined text link "Clear filters" that only shows when filters are active
- File: `src/components/flat-table/flat-table-filters.tsx:119-133`
- The spec shows an always-visible icon button; the code shows conditional text.

### D5 -- Table Uses AG Grid Instead of Native HTML Table
**Spec:** Native `<table>` with specific cell padding (`px-6 py-3.5`), hover rows (`hover:bg-surface-container-low/30`), custom header styling with sort icons (`unfold_more` Material Symbol)
**Code:** AG Grid component with default AG Grid styling
- File: `src/components/flat-table/flat-table.tsx:117-134`
- AG Grid does not render the exact Tailwind classes from the spec. The spec's precise cell padding, hover colors, header text styling (`text-primary font-bold tracking-wider uppercase`), and sort indicator icons are all lost to AG Grid's default theme.

### D6 -- Table Header Styling Differences
**Spec:** Headers use `text-primary hover:bg-surface-container-high/50 cursor-pointer px-6 py-4 font-bold tracking-wider uppercase` with `unfold_more` Material Symbol sort indicators that fade on hover (`opacity-30 group-hover:opacity-100`)
**Code:** AG Grid default headers -- no custom header component specified
- File: `src/components/flat-table/flat-table-columns.ts`
- The interactive sort icon behavior from the spec is not replicated.

### D7 -- Table Row Styling Not Applied
**Spec:** Rows use `hover:bg-surface-container-low/30 transition-colors`, cells use `px-6 py-3.5`, person name is `font-medium`, hours are `font-bold tabular-nums text-right`
**Code:** AG Grid with default row/cell styling. Only `hours` column has `cellClass: 'tabular-nums text-right font-bold'`
- File: `src/components/flat-table/flat-table-columns.ts:46-47`
- Person name column missing `font-medium`. Department/Project/Month columns missing `text-on-surface-variant`.

### D8 -- Table Footer Stats Bar Missing
**Spec:** Below the table: `"Showing 8 of 145 items"` on the left, `"Total Estimated Hours: 2,812.5"` with a small primary dot on the right. Styled `text-outline mt-4 text-[11px] font-bold tracking-wider uppercase`
**Code:** Uses `FlatTablePagination` component with different styling (`text-on-surface-variant text-sm`) and includes page navigation controls + page size selector. No "Total Estimated Hours" summary.
- File: `src/components/flat-table/flat-table-pagination.tsx:26-76`

### D9 -- Pagination Style Mismatch
**Spec:** No pagination -- just a simple item count bar
**Code:** Full pagination with prev/next buttons, page indicator, and rows-per-page selector using `rounded-md` borders (should be `rounded-sm` per the spec's design system)
- File: `src/components/flat-table/flat-table-pagination.tsx:34-56`

### D10 -- Page Title Text Mismatch
**Spec:** `"Resource Data Export"`
**Code:** `"Data Management"`
- File: `src/app/(app)/data/page.tsx:15`

### D11 -- Page Subtitle Text Mismatch
**Spec:** `"Review and filter detailed allocation data for engineering programs."`
**Code:** `"View, filter, and export allocation data."`
- File: `src/app/(app)/data/page.tsx:18`

### D12 -- Extra Action Buttons Not in Spec
**Spec:** Only has "Export to Excel" button in the header area
**Code:** Has "Import" button + "Flat template" download link + "Pivot template" download link
- File: `src/app/(app)/data/page.tsx:23-46`
- These may be legitimate features, but they deviate from the spec's clean single-action header.

### D13 -- Top Nav: Icon Library Mismatch
**Spec:** Uses Material Symbols Outlined (`notifications`, `settings`, `search`) via Google Fonts
**Code:** Uses Lucide icons (`Bell`, `Settings`, `Search`) -- different visual style
- File: `src/components/layout/top-nav.tsx:9-11`
- Material Symbols have a distinct visual weight and style from Lucide. The spec explicitly loads Material Symbols.

### D14 -- Top Nav: Missing User Avatar
**Spec:** Shows a circular user avatar image (`bg-surface-container-highest ml-2 h-8 w-8 overflow-hidden rounded-full`) with an `<img>` tag
**Code:** Uses Clerk's `<UserButton />` component which renders its own avatar
- File: `src/components/layout/top-nav.tsx:121`
- While functionally equivalent, Clerk's button may not match the spec's exact size/styling.

### D15 -- Top Nav: Header Height and Positioning
**Spec:** `fixed` positioning with `px-6 py-3` and explicit font `font-['Manrope']`
**Code:** `sticky` positioning with `h-14 px-4 md:px-6`, no explicit Manrope on the header element
- File: `src/components/layout/top-nav.tsx:53`
- `sticky` vs `fixed` changes scroll behavior. The `py-3` in spec vs `h-14` in code may produce different heights.

### D16 -- Top Nav: Search Placeholder Text
**Spec:** `"Global Search"` with `w-64 rounded-sm`
**Code:** `"Search..."` with `w-64 rounded-sm`
- File: `src/components/layout/top-nav.tsx:98`

### D17 -- Top Nav: Navigation Spacing
**Spec:** Nav links use `gap-6` with simple text links and hover transitions
**Code:** Nav links use `gap-1` with `border-b-2 px-3 py-4` -- tab-style with bottom border on every link (transparent when inactive)
- File: `src/components/layout/top-nav.tsx:73,80`
- Spec nav items are spaced further apart (`gap-6` vs `gap-1`) and don't show borders on inactive items.

### D18 -- Top Nav: Notification/Settings Button Shape
**Spec:** `rounded-full p-2 hover:bg-[#f0f4f6]`
**Code:** `rounded-sm p-1.5 hover:bg-surface-container-high`
- File: `src/components/layout/top-nav.tsx:107,117`
- Spec uses fully round buttons, code uses slightly rounded.

### D19 -- Sidebar: Missing Nav Icons
**Spec sidebar nav items:** Each has a Material Symbol icon (`group`, `event_available`, `bar_chart`, `flag`, `description`) with `text-lg`
**Code sidebar nav items:** Plain text links without icons
- File: `src/components/layout/side-nav.tsx:94-113`
- The spec's sidebar has icon+text navigation items; the code only shows text.

### D20 -- Sidebar: Different Navigation Items
**Spec:** Resources, Allocations, Capacity, Milestones, Reports (with Reports as active)
**Code:** Context-sensitive sections (People/Team/Projects/Data/Dashboard headings with sub-items)
- File: `src/components/layout/side-nav.tsx:17-58`
- Entirely different sidebar content structure.

### D21 -- Sidebar: Missing Bottom Links
**Spec:** Has "Help" and "Archive" links below the "New Entry" button, with Material Symbol icons
**Code:** Only has the "New Entry" button in the footer area
- File: `src/components/layout/side-nav.tsx:117-125`

### D22 -- Sidebar: Header Subtitle Styling
**Spec:** `text-outline text-[10px] tracking-widest uppercase` -- reads "Nordic Precision"
**Code:** `text-on-surface-variant text-xs` -- reads "Nordic Precision"
- File: `src/components/layout/side-nav.tsx:81-82`
- Different text color class and font size.

### D23 -- Sidebar: Padding Differences
**Spec:** Header area uses `px-6 py-8`, nav area uses `px-4`, bottom section uses `p-4 mb-6`
**Code:** Header uses `px-6 py-6`, nav uses `px-3`, bottom uses `p-3`
- File: `src/components/layout/side-nav.tsx:73,86,118`

### D24 -- Heat Map Filters: Styling Mismatch
**Spec (from PRD screen 3):** Filter pills and search in a top bar with the same surface/token styling
**Code:** Uses `rounded-md border border-outline bg-surface px-3 py-1.5` which uses `rounded-md` and visible `border-outline` borders
- File: `src/components/heat-map/heat-map-filters.tsx:11-15`
- Should use `rounded-sm border-none bg-surface-container-low` to match the filter styling pattern.

### D25 -- Heat Map Table: Border Styling
**Spec (PRD):** Subtle borders with `border-outline-variant/15` dividers
**Code:** Uses `border-outline rounded-lg border` -- full opacity outline border with large radius
- File: `src/components/heat-map/heat-map-table.tsx:31`
- Should be `border-outline-variant/10 rounded-sm border`.

### D26 -- Project View: Missing Program Badge and Metrics
**Spec (PRD screen 4):** Header has project name, program badge, metrics (total hours, people count)
**Code:** Only shows project name and subtitle text
- File: `src/app/(app)/projects/[projectId]/page.tsx:27-31`

### D27 -- Breadcrumbs Component Not in Spec
**Spec:** No breadcrumbs shown anywhere in the design
**Code:** `<Breadcrumbs />` component appears on every page
- File: `src/components/layout/breadcrumbs.tsx`
- Not necessarily wrong, but it adds visual noise not present in the spec.

### D28 -- Person Header: Font Weight Difference
**Spec (PRD):** Person name should be prominent, the spec implies bold (`font-bold`)
**Code:** Uses `font-semibold` instead of `font-bold`
- File: `src/components/person/person-header.tsx:96`

### D29 -- Main Content Area: Missing `pt-[57px]` Offset
**Spec:** Uses `pt-[57px]` to offset for the fixed header
**Code:** Uses `sticky` header so no offset needed, but the sidebar is `fixed top-14` (56px) which is 1px less than spec's 57px
- File: `src/components/layout/app-shell.tsx:17-29`

### D30 -- Discipline Badge Style Differences in Flat Table
**Spec:** Discipline shown as `<span class="bg-secondary-container text-on-secondary-fixed rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">SW</span>`
**Code:** No discipline badges in the flat table at all (AG Grid renders plain text)
- File: `src/components/flat-table/flat-table-columns.ts`

---

## FIXES NEEDED

### Priority 1: Add Missing Discipline Column to Flat Table
**File:** `src/components/flat-table/flat-table-columns.ts`
**Change:** Add a `discipline` column after `personName` with a custom cell renderer that renders the badge styling. Either add it alongside Program or replace Program.
```ts
{
  field: 'disciplineName',
  headerName: 'Discipline',
  sortable: true,
  flex: 1,
  minWidth: 90,
  cellClass: 'flex items-center',
  // Add cellRenderer for badge styling
},
```
**Also requires:** Adding `disciplineName` to the `FlatTableRow` type and API response.

### Priority 2: Fix Page Title and Subtitle Copy
**File:** `src/app/(app)/data/page.tsx:15,18`
**Change:**
- Line 15: `"Data Management"` --> `"Resource Data Export"`
- Line 18: `"View, filter, and export allocation data."` --> `"Review and filter detailed allocation data for engineering programs."`

### Priority 3: Fix Export Button to Match Spec
**File:** `src/components/flat-table/flat-table.tsx:87-91`
**Change:** Replace dropdown export button with single action button:
```tsx
<button className="bg-primary text-on-primary flex items-center gap-2 rounded-sm px-5 py-2.5 text-xs font-semibold shadow-md transition-opacity hover:opacity-90">
  <Download className="h-4 w-4" />
  Export to Excel
</button>
```

### Priority 4: Add Discipline Filter
**File:** `src/components/flat-table/flat-table-filters.tsx`
**Change:** Add a discipline filter select between Person and Project filters, loading disciplines from `useDisciplines()`. Match spec label "Discipline" with same styling.

### Priority 5: Replace Clear Filters with Icon Button
**File:** `src/components/flat-table/flat-table-filters.tsx:119-133`
**Change:** Replace the text "Clear filters" with a Material Symbol or Lucide `FilterX` icon button:
```tsx
<button className="text-outline hover:text-primary p-2 transition-colors" title="Reset Filters">
  <FilterX className="h-5 w-5" />
</button>
```

### Priority 6: Fix Top Nav Positioning
**File:** `src/components/layout/top-nav.tsx:53`
**Change:** `sticky` --> `fixed` and add `right-0 left-0` to match spec. Update AppShell to add `pt-14` to offset content.

### Priority 7: Fix Top Nav Search Placeholder
**File:** `src/components/layout/top-nav.tsx:98`
**Change:** `"Search..."` --> `"Global Search"`

### Priority 8: Fix Top Nav Link Spacing
**File:** `src/components/layout/top-nav.tsx:73`
**Change:** `gap-1` --> `gap-6` and remove `border-b-2` from inactive items (only active item should have bottom border).

### Priority 9: Fix Notification/Settings Button Shape
**File:** `src/components/layout/top-nav.tsx:107,117`
**Change:** `rounded-sm p-1.5` --> `rounded-full p-2` and `hover:bg-surface-container-high` --> `hover:bg-[#f0f4f6]`

### Priority 10: Add Icons to Sidebar Navigation
**File:** `src/components/layout/side-nav.tsx:94-113`
**Change:** Add Lucide icons (or Material Symbols) to each nav item matching the spec's icon set (Users, CalendarCheck, BarChart, Flag, FileText).

### Priority 11: Fix Sidebar Padding
**File:** `src/components/layout/side-nav.tsx:73,86,118`
**Change:**
- Header: `py-6` --> `py-8`
- Nav: `px-3` --> `px-4`
- Footer: `p-3` --> `p-4`, add `mb-6` to the button

### Priority 12: Fix Sidebar Subtitle Styling
**File:** `src/components/layout/side-nav.tsx:81-82`
**Change:** `text-on-surface-variant text-xs` --> `text-outline text-[10px] tracking-widest uppercase`

### Priority 13: Add Help and Archive Links to Sidebar Footer
**File:** `src/components/layout/side-nav.tsx:117-125`
**Change:** Add "Help" and "Archive" links below the New Entry button with icon + text.

### Priority 14: Fix Table Footer to Match Spec
**File:** `src/components/flat-table/flat-table-pagination.tsx`
**Change:** Replace full pagination with a simpler stats bar:
```tsx
<div className="text-outline mt-4 flex items-center justify-between px-2 text-[11px] font-bold tracking-wider uppercase">
  <div>Showing {count} of {total} items</div>
  <div className="flex items-center gap-2">
    <span className="bg-primary h-1.5 w-1.5 rounded-full" />
    Total Estimated Hours: <span className="text-on-surface ml-1 tabular-nums">{totalHours}</span>
  </div>
</div>
```
Or keep pagination but restyle to match spec tokens.

### Priority 15: Fix Heat Map Table Borders
**File:** `src/components/heat-map/heat-map-table.tsx:31`
**Change:** `border-outline rounded-lg border` --> `border-outline-variant/10 rounded-sm border`

### Priority 16: Fix Heat Map Filter Styling
**File:** `src/components/heat-map/heat-map-filters.tsx:11-15`
**Change:** `rounded-md border border-outline bg-surface` --> `rounded-sm border-none bg-surface-container-low focus:ring-primary focus:ring-1`

### Priority 17: Add Program Badge and Metrics to Project View Header
**File:** `src/app/(app)/projects/[projectId]/page.tsx:27-31`
**Change:** Add program badge and aggregate metrics (total hours, people count) to the header section.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Page title, subtitle, button labels, and placeholder text all differ from spec |
| 2. Visuals | 2/4 | AG Grid replaces spec's carefully styled native table; icon library mismatch throughout |
| 3. Color | 3/4 | Token system matches perfectly; minor issues with border opacity and button hover colors |
| 4. Typography | 3/4 | Font families and most weights correct; minor weight differences (semibold vs bold) |
| 5. Spacing | 2/4 | Sidebar padding, nav gap, button padding, and cell padding all differ from spec values |
| 6. Experience Design | 3/4 | Loading/error/empty states well covered; missing table footer summary and discipline filter |

**Overall: 15/24**

---

## Top 3 Priority Fixes

1. **Missing Discipline column in flat table** -- Users cannot see or filter by discipline, which is a core data dimension in the spec. Add `disciplineName` to the flat table column definitions and API response, with badge rendering matching `bg-secondary-container text-on-secondary-fixed rounded-full text-[10px] font-bold uppercase`.

2. **Page title and copy mismatches** -- "Data Management" vs "Resource Data Export" changes the perceived purpose of the page. Update title, subtitle, search placeholder, and export button label to match spec copy exactly.

3. **AG Grid vs native table styling gap** -- The spec defines precise cell padding (`px-6 py-3.5`), hover colors, header styling with interactive sort icons, and discipline badge rendering. AG Grid's default theme does not replicate these. Either apply comprehensive AG Grid theme customization or consider whether a native table (with virtual scrolling if needed) would better match the design intent.

---

## Files Audited

- `src/app/(app)/data/page.tsx`
- `src/components/flat-table/flat-table.tsx`
- `src/components/flat-table/flat-table-filters.tsx`
- `src/components/flat-table/flat-table-columns.ts`
- `src/components/flat-table/flat-table-pagination.tsx`
- `src/components/layout/top-nav.tsx`
- `src/components/layout/side-nav.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/layout/breadcrumbs.tsx`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/team/page.tsx`
- `src/app/(app)/projects/[projectId]/page.tsx`
- `src/app/(app)/input/[personId]/page.tsx`
- `src/components/heat-map/heat-map-table.tsx`
- `src/components/heat-map/heat-map-filters.tsx`
- `src/components/heat-map/heat-map-cell.tsx`
- `src/components/grid/allocation-grid.tsx`
- `src/components/grid/grid-config.ts`
- `src/components/person/person-header.tsx`
- `src/components/project-view/project-staffing-grid.tsx`
- `src/lib/capacity.ts`
- `src/app/globals.css`
- `creative-direction/07-resource-capacity-prd.html`
- `creative-direction/09-resource-data-export.html`
