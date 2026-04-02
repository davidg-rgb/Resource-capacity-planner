# Person Input -- Spec vs Implementation Audit

**Audited:** 2026-03-29
**Spec files:**
- `creative-direction/04-person-input-form.html` (main spreadsheet form)
- `creative-direction/08-person-input-sidebar.html` (people sidebar variant)

**Implementation files audited:**
- `src/components/person/person-header.tsx`
- `src/components/person/person-sidebar.tsx`
- `src/components/grid/allocation-grid.tsx`
- `src/components/grid/grid-config.ts`
- `src/components/grid/cell-renderers/project-cell.tsx`
- `src/components/grid/cell-renderers/status-cell.tsx`
- `src/components/layout/top-nav.tsx`
- `src/components/layout/side-nav.tsx`
- `src/components/layout/app-shell.tsx`
- `src/app/(app)/input/[personId]/page.tsx`
- `src/app/(app)/input/layout.tsx`
- `src/app/(app)/input/page.tsx`
- `src/lib/capacity.ts`
- `src/app/globals.css`

---

## MATCHES (things that already align with specs)

### Sidebar (spec 08)
1. **Search input** -- matches spec: `bg-surface-container-lowest`, `rounded-sm`, `py-2 pl-9 text-xs shadow-sm`, `focus:ring-primary` (`person-sidebar.tsx:52-53`)
2. **Department group headings** -- matches spec: `font-headline text-outline mb-3 px-2 text-[10px] tracking-widest uppercase` (`person-sidebar.tsx:67`)
3. **Status dots** -- correct `h-2 w-2 rounded-full` with dynamic color (`person-sidebar.tsx:86`)
4. **Person name styling** -- matches: `font-body text-on-surface text-xs` (`person-sidebar.tsx:88`)
5. **Active person highlighting** -- uses `bg-surface-variant text-primary font-semibold shadow-sm`, close to spec's `bg-[#d9e4e8]` (same color token) (`person-sidebar.tsx:80`)
6. **Discipline badge on active** -- matches: `bg-primary text-on-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold` (`person-sidebar.tsx:95`)
7. **Inactive badge** -- matches: `bg-secondary-container text-on-secondary-fixed rounded-full px-1.5 py-0.5 text-[10px] font-semibold` (`person-sidebar.tsx:97`)
8. **Sidebar width** -- `w-72` matches spec 08's `w-72` (`person-sidebar.tsx:156`)
9. **Background color** -- `bg-surface-container-low` matches spec's `bg-[#f0f4f6]` (same value) (`person-sidebar.tsx:156`)
10. **People list spacing** -- `space-y-6` for groups, `space-y-1` for items matches spec (`person-sidebar.tsx:64,70`)

### Person Header (spec 04)
11. **Person name** -- `font-headline text-on-surface text-2xl font-semibold` matches spec 04 line 275 (`person-header.tsx:96`)
12. **Nav buttons** -- `hover:bg-surface-container-low text-outline rounded-sm p-1` matches spec 04 line 271-272 (`person-header.tsx:85`)
13. **Discipline/department badges** -- `bg-secondary-container text-on-secondary-fixed rounded-full px-2.5 py-0.5 text-xs font-semibold` matches spec 04 line 286-288 (`person-header.tsx:100`)
14. **Monthly target label** -- `text-outline text-[10px] font-semibold tracking-widest uppercase` matches spec 04 line 296 (`person-header.tsx:112`)
15. **Target value** -- `font-headline text-primary text-xl font-bold` matches spec 04 line 299 (`person-header.tsx:115`)

### Allocation Grid (spec 04)
16. **Grid container** -- `bg-surface-container-lowest border-outline-variant/15 rounded-sm border shadow-sm` matches spec 04 line 306 (`allocation-grid.tsx:220`)
17. **Project column width** -- 256px matches spec's `w-64 min-w-[256px]` (`grid-config.ts:83`)
18. **Month column width** -- 100px matches spec's `min-w-[100px]` (`grid-config.ts:89`)
19. **Current month highlighting** -- `bg-primary-container/5` matches spec 04 line 321 (`grid-config.ts:102`)
20. **Past month styling** -- `bg-surface-container-low text-outline opacity-60` directionally matches spec's dim styling (`grid-config.ts:99`)
21. **Tabular nums** -- applied to month cells, matching spec (`grid-config.ts:94`)
22. **Pinned rows (SUMMA/Target/Status)** -- conceptually match spec 04 lines 519-643 (`grid-config.ts:137-154`)
23. **Status dots** -- `h-3 w-3 rounded-full` matches spec 04 line 596 (`status-cell.tsx:23`)
24. **Add project row** -- "Add project..." placeholder matches spec 04 line 487 (`project-cell.tsx:24-26`, `grid-config.ts:162`)

### Color Tokens
25. **All M3 color tokens** -- `globals.css` defines the complete Material 3 palette matching both specs' Tailwind config blocks

---

## DISCREPANCIES

### D1 -- Missing Footer / Action Bar
**Spec 04 lines 723-758:** Shows a sticky footer with status legend (On Track / Warning / Over Capacity dots) and action buttons ("Discard Changes", "Save Worksheet").
**Code:** No footer component exists. The page (`[personId]/page.tsx`) has no footer. Autosave replaces explicit save, but the status legend is missing entirely.
**Files:** `src/app/(app)/input/[personId]/page.tsx`

### D2 -- Missing Bento Analytics Section
**Spec 04 lines 649-720:** Shows a 3-panel bento grid below the spreadsheet with "Total Allocation Trend" bar chart, "Project Distribution" progress bars, and "Capacity Insight" callout card.
**Code:** None of these components exist in the person input page. No allocation trend chart, no project distribution bars, no insight card.
**Files:** `src/app/(app)/input/[personId]/page.tsx`

### D3 -- Side Nav Structure Differs from Spec 04
**Spec 04 lines 129-217:** Shows a left sidebar with NP logo icon + "Resource Planner / Nordic Precision" header, then nav links with Material Symbols icons (Resources, Allocations, Capacity, Milestones, Reports), footer with "New Entry" button + Help/Archive links.
**Code:** `side-nav.tsx` has a different structure: LayoutDashboard icon instead of "NP" text badge, section headings change by route, no Help/Archive links, no Material Symbols icons (uses no icons at all for nav items in text-only links).
**Files:** `src/components/layout/side-nav.tsx:71-128`

### D4 -- SideNav Logo Badge Missing
**Spec 04 line 136-138:** `bg-primary text-on-primary font-headline flex h-8 w-8 items-center justify-center rounded-sm font-bold` containing "NP" text.
**Code:** Uses `LayoutDashboard` Lucide icon inside the same-sized box, not the text "NP".
**Files:** `src/components/layout/side-nav.tsx:74-75`

### D5 -- SideNav Nav Items Missing Icons
**Spec 04 lines 152-191:** Each nav item has a Material Symbols icon (`group`, `event_available`, `bar_chart`, `flag`, `description`).
**Code:** `side-nav.tsx` nav items are text-only with no icons.
**Files:** `src/components/layout/side-nav.tsx:95-109`

### D6 -- SideNav Active Item Styling
**Spec 04 line 160:** Active item uses `bg-[#d9e4e8] text-[#496173] font-semibold` (equals `bg-surface-variant text-primary`).
**Code:** Uses `bg-surface-container-high text-primary font-semibold` -- the background color is `#e1eaec` instead of spec's `#d9e4e8`.
**Files:** `src/components/layout/side-nav.tsx:103`

### D7 -- SideNav Footer Missing Help and Archive Links
**Spec 04 lines 200-215 and spec 08 lines 296-308:** Both specs show Help and Archive links in the sidebar footer.
**Code:** `side-nav.tsx` footer only has "New Entry" button, no Help or Archive.
**Files:** `src/components/layout/side-nav.tsx:117-125`

### D8 -- Person Sidebar Missing Footer Section
**Spec 08 lines 287-309:** Shows a footer area below the people list with "New Entry" button + Help/Archive links.
**Code:** `person-sidebar.tsx` has no footer section at all -- just the scrollable list content.
**Files:** `src/components/person/person-sidebar.tsx:46-116`

### D9 -- Top Nav Uses Lucide Icons Instead of Material Symbols
**Spec 04 lines 245-255:** Uses Material Symbols Outlined (`notifications`, `settings`) with `text-[#496173]` and notification red dot.
**Code:** Uses Lucide icons (`Bell`, `Settings`) with `text-on-surface-variant` and an `AlertBadge` component.
**Files:** `src/components/layout/top-nav.tsx:109-119`

### D10 -- Top Nav Font Family
**Spec 04 line 231:** Nav items use `font-['Manrope']` with `text-sm font-medium tracking-tight`.
**Code:** Uses `font-headline` (which is Manrope), `text-sm tracking-tight` -- this matches. But inactive items use `text-on-surface-variant` instead of spec's `text-slate-500`.
**Files:** `src/components/layout/top-nav.tsx:83`

### D11 -- Top Nav Active Item Border
**Spec 04 line 238-240:** Active nav item has `border-b-2 border-[#496173] pb-1 font-bold text-[#496173]`.
**Code:** Has `border-b-2 border-primary text-primary font-bold` but uses `py-4` for vertical spacing rather than `pb-1`. The visual effect differs -- spec has tight border close to text; code has the border at the bottom of a taller element.
**Files:** `src/components/layout/top-nav.tsx:80-81`

### D12 -- Top Nav Search Placeholder
**Spec 04:** "Global Search" (spec 08 line 152).
**Code:** "Search..." (shorter, less descriptive).
**Files:** `src/components/layout/top-nav.tsx:98`

### D13 -- Top Nav Profile Element
**Spec 04 line 256-261:** Uses `img` with `border-outline-variant/30 h-8 w-8 rounded-full border`.
**Code:** Uses Clerk's `<UserButton />` component -- completely different visual.
**Files:** `src/components/layout/top-nav.tsx:121`

### D14 -- PersonHeader Tracking-tight Missing
**Spec 04 line 275:** `text-2xl font-semibold` (no `tracking-tight`).
**Code:** Has `tracking-tight` added.
**Files:** `src/components/person/person-header.tsx:96` -- Minor, but not in spec.

### D15 -- PersonHeader Nav Arrows Use SVG Instead of Material Symbols
**Spec 04 lines 270-282:** Uses Material Symbols `chevron_left` / `chevron_right` with `data-icon` attributes.
**Code:** Uses inline SVG paths instead of Material Symbols icons.
**Files:** `src/components/person/person-header.tsx:88-90, 128-129`

### D16 -- PersonHeader Target Unit Formatting
**Spec 04 line 300:** Shows `150<span class="text-outline ml-1 text-sm font-medium">h/month</span>` -- number and unit are separate with different styling.
**Code:** Shows `{targetHours} h/month` as a single styled span -- the unit is not separately styled with smaller/lighter text.
**Files:** `src/components/person/person-header.tsx:116-117`

### D17 -- Grid Uses AG Grid Instead of Native HTML Table
**Spec 04 lines 308-646:** Shows a native HTML `<table>` with sticky first column, cell borders (`border-outline-variant/15`), row hover effects (`hover:bg-surface-container-low`), and specific cell padding (`px-4 py-2` for data, `px-4 py-3` for headers/summary).
**Code:** Uses AG Grid React component, which renders its own DOM. The visual appearance depends on AG Grid's theme, not the spec's Tailwind classes. This affects:
- Cell padding (AG Grid default vs spec's `px-4 py-2`)
- Row hover colors
- Border styling between cells
- Header row background (`bg-surface-container-low` in spec)
- Sticky column appearance
**Files:** `src/components/grid/allocation-grid.tsx:221-244`

### D18 -- Grid Header Styling
**Spec 04 lines 311-366:** Table headers use `bg-surface-container-low` background, `font-label text-outline text-xs font-bold tracking-wider uppercase` for "Project Name", and `font-label text-outline-variant text-xs font-bold` for month headers. Current month has `text-primary` with "CURRENT" subtitle.
**Code:** AG Grid uses `headerName` with `formatMonthHeader()` -- no separate "CURRENT" label beneath the current month. No `font-label` or `tracking-wider uppercase` on headers.
**Files:** `src/components/grid/grid-config.ts:78-86, 88-89`

### D19 -- Grid Project Name Column Styling
**Spec 04 lines 373-376:** Project names use `text-on-surface font-semibold` with `bg-white` sticky background.
**Code:** `ProjectCell` renders `<span className="text-on-surface">` without `font-semibold` for regular rows.
**Files:** `src/components/grid/cell-renderers/project-cell.tsx:33`

### D20 -- Grid Row Borders
**Spec 04 line 370-371:** Each data row has `border-outline-variant/10 border-b` and `group` for hover states.
**Code:** AG Grid handles its own row borders. No `border-outline-variant/10` applied via Tailwind.
**Files:** `src/components/grid/allocation-grid.tsx:221-244`

### D21 -- Grid Cell Borders
**Spec 04:** Every cell has `border-outline-variant/15 border-r` creating a visible grid.
**Code:** AG Grid's default cell borders differ from the spec's border color/opacity.
**Files:** `src/components/grid/grid-config.ts`

### D22 -- Status Row Background Colors
**Spec 04 lines 601-642:** Status row cells have colored backgrounds: `bg-green-50` for healthy, `bg-amber-50` for warning, `bg-error-container/10` for overloaded.
**Code:** `StatusCell` only renders a colored dot, no background color on the cell.
**Files:** `src/components/grid/cell-renderers/status-cell.tsx:8-24`

### D23 -- SUMMA Row Styling
**Spec 04 lines 519-550:** SUMMA row has `bg-surface-container-low font-bold` with sticky left cell.
**Code:** AG Grid's pinned rows use `font-semibold` (from `grid-config.ts:97`) but the `bg-surface-container-low` background depends on AG Grid theme, not applied.
**Files:** `src/components/grid/grid-config.ts:96-97`

### D24 -- Empty Row Styling ("Add project...")
**Spec 04 lines 484-489:** Empty/add row shows `text-outline-variant font-normal italic`.
**Code:** Shows `text-on-surface-variant hover:text-primary italic` with "+ Add project..." (has extra "+" prefix not in spec).
**Files:** `src/components/grid/cell-renderers/project-cell.tsx:25`

### D25 -- Focus Cell Styling
**Spec 04 lines 112-117:** Defines `.focus-cell` with `outline: 2px solid #496173; outline-offset: -2px; background-color: #ffffff !important;`.
**Code:** No equivalent focus cell styling defined. AG Grid uses its own focus ring.
**Files:** No custom focus cell CSS exists.

### D26 -- Drag Handle
**Spec 04 lines 118-125:** Defines `.drag-handle` as a small 6x6px blue square at bottom-right of focused cell.
**Code:** Has `DragToFillHandle` component but it's a separate overlay, not styled as the spec's inline corner square.
**Files:** `src/components/grid/drag-to-fill-handle.tsx`

### D27 -- Main Content Area Layout
**Spec 04 line 220:** `ml-64 max-w-[calc(1440px-256px)]` -- content offset by sidebar width.
**Code:** `app-shell.tsx` skips SideNav for `/input` routes (line 13), so the PersonSidebar from `input/layout.tsx` is used instead. The content area has `flex-1 space-y-6 overflow-auto p-8`, which matches spec's `p-8` but lacks `max-w-[calc(1440px-256px)]`.
**Files:** `src/app/(app)/input/layout.tsx:21-22`, `src/components/layout/app-shell.tsx:13`

### D28 -- Content Vertical Spacing
**Spec 04 line 265:** Main content uses `space-y-6` between sections.
**Code:** Page uses `space-y-4` (`[personId]/page.tsx:62`), and layout adds `space-y-6` (`layout.tsx:22`). The stacking results in different effective spacing.
**Files:** `src/app/(app)/input/[personId]/page.tsx:62`

### D29 -- Project Selector UI
**Spec 04:** No project selector dropdown is shown -- just the "Add project..." row in the table.
**Code:** Has a separate dropdown `<select>` element below the grid (`[personId]/page.tsx:82-106`) with a bordered card container (`rounded-lg border p-4`) that doesn't match any spec element.
**Files:** `src/app/(app)/input/[personId]/page.tsx:82-106`

### D30 -- Grid Container Height
**Spec 04:** Table grows naturally with content, no fixed height.
**Code:** Grid container has `h-[600px]` fixed height with `domLayout="autoHeight"` (contradiction).
**Files:** `src/components/grid/allocation-grid.tsx:219`

### D31 -- Missing Breadcrumbs (Spec 08 Only)
**Spec 08 lines 315-318:** Shows breadcrumbs: "Resources / Allocations" with `text-[10px] font-medium tracking-widest uppercase`.
**Code:** No breadcrumb component on the person input page.
**Files:** `src/app/(app)/input/[personId]/page.tsx`

### D32 -- Missing Summary Stats Cards (Spec 08 Only)
**Spec 08 lines 346-385:** Shows 4 stat cards (Weekly Capacity, Allocated Q3, Billable Target, Utilization) with `bg-surface-container-lowest border-outline-variant/10 rounded-sm border p-4`.
**Code:** No stat cards exist on the person input page.
**Files:** `src/app/(app)/input/[personId]/page.tsx`

### D33 -- Missing Right Panel (Spec 08 Only)
**Spec 08 lines 572-612:** Shows a right sidebar with "Allocations Info" (milestones, resource notes) and "Status Tip" card.
**Code:** No right-side info panel exists.
**Files:** `src/app/(app)/input/[personId]/page.tsx`

### D34 -- Missing "Export PDF" Button (Spec 08 Only)
**Spec 08 lines 331-333:** Shows "Export PDF" button with `border-outline-variant/30 text-primary hover:bg-surface-container-low rounded-sm border px-4 py-2 text-xs font-semibold`.
**Code:** No Export PDF button exists on the person input page.
**Files:** `src/app/(app)/input/[personId]/page.tsx`

### D35 -- Missing "Save Changes" Button (Spec 08 Only)
**Spec 08 line 336-338:** Shows explicit "Save Changes" button with `bg-primary text-on-primary rounded-sm px-4 py-2 text-xs font-semibold shadow-md`.
**Code:** Uses autosave (no visible save button), which is a different UX paradigm.
**Files:** `src/app/(app)/input/[personId]/page.tsx`

### D36 -- PersonSidebar Mobile Toggle Icon
**Spec 08:** No mobile toggle specification (static sidebar).
**Code:** Uses `Users` Lucide icon in a `bg-primary text-on-primary` FAB button for mobile toggle. Functional but not from spec.
**Files:** `src/components/person/person-sidebar.tsx:122-128`

### D37 -- PersonSidebar Border Style
**Spec 08 line 180-181:** Sidebar uses `border-r border-[#a9b4b7]/15`.
**Code:** Uses `border-outline-variant/15 border-r` -- functionally identical since `outline-variant` is `#a9b4b7`. Match.
**Files:** `src/components/person/person-sidebar.tsx:156`

### D38 -- Notification Red Dot
**Spec 04 lines 250-251:** Notifications icon has `bg-error absolute top-0 right-0 h-2 w-2 rounded-full` red dot indicator.
**Code:** Uses `<AlertBadge />` component which may render differently.
**Files:** `src/components/layout/top-nav.tsx:111`

### D39 -- Status Color for "empty" State
**Spec 04 line 594-599:** Empty/current status dot uses `bg-on-secondary-container opacity-40`.
**Code:** Uses `bg-gray-300` for empty status.
**Files:** `src/components/grid/cell-renderers/status-cell.tsx:12`, `src/lib/capacity.ts:42`

### D40 -- Status Color Mapping Mismatch
**Spec 04:** Healthy = `bg-on-secondary-container` (dark green-gray), Warning = `bg-outline-variant`, Over = `bg-error`.
**Code:** Healthy = `bg-green-500`, Warning = `bg-amber-500`, Over = `bg-red-500` -- generic Tailwind colors instead of the M3 palette colors from the spec.
**Files:** `src/lib/capacity.ts:39-43`

---

## FIXES NEEDED

### Priority 1: Missing Page Sections (D1, D2, D32, D33)

**Fix D1 -- Add footer/action bar:**
Create `src/components/grid/grid-footer.tsx` with status legend (On Track/Warning/Over Capacity dots) and optional action buttons. Add to `src/app/(app)/input/[personId]/page.tsx` below AllocationGrid.

**Fix D2 -- Add analytics bento section (spec 04):**
Create `src/components/person/person-analytics.tsx` with three cards:
- Total Allocation Trend (bar chart)
- Project Distribution (progress bars)
- Capacity Insight (callout card)
Add below grid in `src/app/(app)/input/[personId]/page.tsx`.

**Fix D32/D33 -- Add summary stats and right panel (spec 08 concepts):**
These could be deferred if spec 04 is the primary target, but note the gap.

### Priority 2: AG Grid Visual Alignment (D17-D23)

**Fix D17/D20/D21 -- AG Grid theme customization:**
Add custom AG Grid CSS theme overrides in a new file `src/components/grid/grid-theme.css`:
```css
.ag-theme-custom .ag-header {
  background-color: var(--color-surface-container-low);
}
.ag-theme-custom .ag-header-cell-label {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-outline-variant);
}
.ag-theme-custom .ag-row {
  border-bottom: 1px solid rgba(169, 180, 183, 0.1);
}
.ag-theme-custom .ag-row:hover {
  background-color: var(--color-surface-container-low);
}
.ag-theme-custom .ag-cell {
  border-right: 1px solid rgba(169, 180, 183, 0.15);
  padding: 0.5rem 1rem;
}
.ag-theme-custom .ag-pinned-left-cols-container .ag-cell {
  background-color: #ffffff;
}
```

**Fix D18 -- Current month header "CURRENT" label:**
In `grid-config.ts:88-89`, update `headerName` for current month to include subtitle, or use `headerComponentParams` with a custom header component showing "CURRENT" below the month.

**Fix D19 -- Project name font-semibold:**
`src/components/grid/cell-renderers/project-cell.tsx:33` -- Change:
```tsx
// FROM:
return <span className="text-on-surface">{props.value}</span>;
// TO:
return <span className="text-on-surface font-semibold">{props.value}</span>;
```

**Fix D22 -- Status cell backgrounds:**
`src/components/grid/cell-renderers/status-cell.tsx` -- Add background color to the cell container:
```tsx
// Wrap with colored background div
const bgColors = { healthy: 'bg-green-50', warning: 'bg-amber-50', overloaded: 'bg-red-50/10' };
return (
  <div className={`flex h-full items-center justify-end ${bgColors[status] ?? ''}`}>
    <span className={`inline-block h-3 w-3 rounded-full ${dot}`} title={labels[status] ?? ''} />
  </div>
);
```

**Fix D23 -- SUMMA row background:**
AG Grid pinned row styling needs CSS: `.ag-theme-custom .ag-row-pinned { background-color: var(--color-surface-container-low); }`

### Priority 3: Icon System (D9, D15)

**Fix D9/D15 -- Switch to Material Symbols:**
The specs consistently use Material Symbols Outlined. The implementation uses Lucide icons throughout. To match specs:
1. Install `@material-symbols/font-400` or use Google Fonts link
2. Create a `<MaterialIcon>` component wrapper
3. Replace Lucide icons in `top-nav.tsx` and `person-header.tsx`

Alternatively, accept the Lucide deviation as an architectural decision and document it.

### Priority 4: Side Nav Alignment (D3-D7)

**Fix D4 -- Logo badge text:**
`src/components/layout/side-nav.tsx:74-75` -- Change:
```tsx
// FROM:
<LayoutDashboard size={16} className="text-on-primary" />
// TO:
<span className="font-headline text-on-primary text-xs font-bold">NP</span>
```

**Fix D5 -- Add icons to nav items:**
Add icon property to SECTION_NAV items and render them. Requires either Material Symbols or mapping Lucide equivalents.

**Fix D6 -- Active item background:**
`src/components/layout/side-nav.tsx:103` -- Change `bg-surface-container-high` to `bg-surface-variant`:
```tsx
// FROM:
'bg-surface-container-high text-primary font-semibold'
// TO:
'bg-surface-variant text-primary font-semibold'
```

**Fix D7/D8 -- Add Help/Archive footer links:**
Add to both `side-nav.tsx` and `person-sidebar.tsx` footer sections.

### Priority 5: Smaller Fixes

**Fix D10 -- Inactive nav text color:**
`src/components/layout/top-nav.tsx:83` -- Change `text-on-surface-variant` to `text-slate-500` for non-active items.

**Fix D11 -- Nav item vertical padding:**
`src/components/layout/top-nav.tsx:80` -- The `py-4` creates a tall click target. Spec uses `pb-1`. Consider `pb-1 pt-0` or restructuring.

**Fix D12 -- Search placeholder:**
`src/components/layout/top-nav.tsx:98` -- Change `"Search..."` to `"Global Search"`.

**Fix D16 -- Target unit separate styling:**
`src/components/person/person-header.tsx:116-117` -- Change:
```tsx
// FROM:
{targetHours} h/month
// TO:
{targetHours}<span className="text-outline ml-1 text-sm font-medium">h/month</span>
```

**Fix D24 -- Remove "+" prefix from add row:**
`src/components/grid/cell-renderers/project-cell.tsx:25` -- Change `"+ Add project..."` to `"Add project..."`.

**Fix D25 -- Focus cell styling:**
Add to `globals.css` or grid theme:
```css
.ag-theme-custom .ag-cell-focus {
  outline: 2px solid #496173;
  outline-offset: -2px;
  background-color: #ffffff !important;
}
```

**Fix D28 -- Content spacing:**
`src/app/(app)/input/[personId]/page.tsx:62` -- Change `space-y-4` to `space-y-6` to match spec.

**Fix D29 -- Project selector styling:**
`src/app/(app)/input/[personId]/page.tsx:82` -- Change `rounded-lg` to `rounded-sm` and match spec border style.

**Fix D30 -- Grid height:**
`src/components/grid/allocation-grid.tsx:219` -- Remove `h-[600px]` since `domLayout="autoHeight"` is set.

**Fix D39/D40 -- Status colors to match M3 palette:**
`src/lib/capacity.ts:39-43` -- Update:
```ts
healthy: { bg: 'bg-green-50', text: 'text-emerald-800', dot: 'bg-on-secondary-container' },
warning: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-outline-variant' },
overloaded: { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-error' },
empty: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-on-secondary-container opacity-40' },
```

---

## Summary

| Category | Count |
|----------|-------|
| Matches | 25 |
| Discrepancies | 40 |
| Missing page sections | 6 (footer, analytics, stats, right panel, breadcrumbs, export) |
| Icon system mismatch | 3 (nav, header arrows, notifications) |
| AG Grid vs native table gaps | 7 |
| Side nav structural gaps | 5 |
| Minor styling differences | 9+ |

The implementation captures the core data model and interaction pattern (sidebar with people list, person header with nav, spreadsheet grid with SUMMA/Target/Status rows). However, it diverges significantly in:
1. **Missing sections** -- footer, analytics bento, summary stats, right info panel
2. **Component library** -- AG Grid vs native table changes all visual details
3. **Icon system** -- Lucide vs Material Symbols throughout
4. **Side navigation** -- simplified structure compared to spec
