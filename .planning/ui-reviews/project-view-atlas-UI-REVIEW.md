# Project View Atlas -- UI Review

**Audited:** 2026-03-29
**Baseline:** `creative-direction/02-project-view-atlas.html` (Stitch prototype)
**Screenshots:** Not captured (no dev server detected on port 3000)

---

## Summary

The current implementation is a **minimal functional skeleton** compared to the rich, polished design in the spec. The spec defines a full project detail view with a header hero section, stat cards, a styled data grid with sticky columns and summary row, and two visualization panels (bar chart + progress bars). The implementation has a basic table with plain text and almost none of the visual treatment specified.

---

## MATCHES (things that already match the spec)

| # | Aspect | Details |
|---|--------|---------|
| 1 | Color tokens | `globals.css` defines the full M3-style palette matching the spec's Tailwind config exactly (primary `#496173`, surface `#f8fafb`, etc.) |
| 2 | Font families | Manrope (headline) and Inter (body) are configured in the theme, matching the spec |
| 3 | Border radius scale | `--radius-sm: 2px` matches spec's `DEFAULT: 0.125rem` (2px) |
| 4 | Side nav "New Entry" button | Both use `bg-primary text-on-primary w-full rounded-sm py-2 text-xs font-semibold` -- nearly identical |
| 5 | Side nav structure | Implementation has the same header (icon + "Resource Planner" + "Nordic Precision") pattern |
| 6 | Top nav brand text | Both use `font-headline text-primary text-xl font-semibold tracking-tighter` for "Nordic Capacity" |
| 7 | Top nav search bar | Both use `bg-surface-container-low rounded-sm` with search icon |
| 8 | Loading state | Implementation has a spinner (spec is static HTML, no loading state) -- this is a positive addition |
| 9 | Error state | Implementation has error container -- another positive addition |
| 10 | Empty state | `ProjectStaffingGrid` handles zero-people case with helpful copy |

---

## DISCREPANCIES (every visual difference)

### A. Project Header Section

| # | Spec | Implementation | File:Line |
|---|------|----------------|-----------|
| A1 | **Program badge**: Shows "Program" label + "P-Series" badge (`text-primary bg-primary-container rounded-sm px-2 py-0.5 text-xs font-bold`) above the title | **Missing entirely** -- no program badge or "Program" label | `src/app/(app)/projects/[projectId]/page.tsx:27-30` |
| A2 | **Title**: `text-4xl font-extrabold` with Manrope | `text-3xl font-semibold` -- smaller and lighter weight | `src/app/(app)/projects/[projectId]/page.tsx:27` |
| A3 | **Description**: Full project description paragraph below title (`text-on-surface-variant mt-2 max-w-2xl`) | Generic subtitle "Allocated people and hours per month" -- not project-specific | `src/app/(app)/projects/[projectId]/page.tsx:30` |
| A4 | **Stat cards row**: Three cards (Total Hours, Assigned, Disciplines) with `min-w-[160px] rounded-sm p-5 shadow-[0_4px_20px_-4px_rgba(42,52,55,0.06)]` | **Missing entirely** -- no stat cards | `src/app/(app)/projects/[projectId]/page.tsx` |
| A5 | **Section padding**: `px-8 py-8` on header section | `p-4 sm:p-6 lg:p-8` via AppShell -- close but wraps with max-width container | `src/components/layout/app-shell.tsx:25` |
| A6 | **Layout**: Spec uses `flex-col md:flex-row md:items-end` to align header left + stats right | Implementation is purely vertical, no flex row layout | `src/app/(app)/projects/[projectId]/page.tsx:26-31` |

### B. Data Grid / Table

| # | Spec | Implementation | File:Line |
|---|------|----------------|-----------|
| B1 | **Table container**: `bg-surface-container-lowest overflow-hidden rounded-sm border border-[#a9b4b7]/15` | No container wrapper, just `overflow-x-auto` div | `src/app/(app)/projects/[projectId]/page.tsx:46` |
| B2 | **Header row bg**: `bg-surface-container-low` on `<tr>` | `border-b` only, no background color on header row | `src/app/(app)/projects/[projectId]/page.tsx:48-49` |
| B3 | **Header text style**: `text-[11px] font-bold tracking-wider uppercase text-outline` | `font-headline font-medium text-on-surface-variant` -- wrong font family, wrong size, not uppercase, not bold | `src/app/(app)/projects/[projectId]/page.tsx:50` |
| B4 | **Sticky first column**: Spec has `sticky left-0 z-10 w-64 border-r border-[#a9b4b7]/10` on the "Team Member" column | No sticky column behavior | `src/app/(app)/projects/[projectId]/page.tsx:50` |
| B5 | **Column header "Team Member"**: Label text in spec | "Person" in implementation | `src/app/(app)/projects/[projectId]/page.tsx:50` |
| B6 | **Month headers alignment**: `text-right` in spec | `text-center` in implementation | `src/app/(app)/projects/[projectId]/page.tsx:54` |
| B7 | **Cell padding**: `px-6 py-3` in spec | `px-2 py-2` in implementation -- significantly less padding | `src/components/project-view/project-staffing-grid.tsx:43` |
| B8 | **Row hover**: Spec uses `group hover:bg-surface-container-low transition-colors` | `hover:bg-surface-variant/30` -- different color and no transition class | `src/components/project-view/project-staffing-grid.tsx:29` |
| B9 | **Person name style**: `text-sm font-semibold text-on-surface` as plain text | Rendered as a `<Link>` with `text-primary font-medium hover:underline` -- different color and weight | `src/components/project-view/project-staffing-grid.tsx:31-35` |
| B10 | **Name format**: Spec shows "Lars Andersson" (first last) | Implementation shows "Andersson, Lars" (last, first) | `src/components/project-view/project-staffing-grid.tsx:34` |
| B11 | **Discipline badge per person**: Spec shows colored badge under each name (`bg-secondary-container text-on-secondary-fixed rounded-full px-1.5 py-0.5 text-[10px] font-bold`) | **Missing entirely** -- no discipline badge | `src/components/project-view/project-staffing-grid.tsx:30-36` |
| B12 | **Data cell text**: Spec uses `font-tabular text-on-surface-variant text-right text-sm` | `text-center tabular-nums` with conditional `text-on-surface font-medium` / `text-on-surface-variant/50` | `src/components/project-view/project-staffing-grid.tsx:43-46` |
| B13 | **Total column**: Spec has a distinct "Total" column with `bg-primary/5 text-primary font-bold` styling | **Missing entirely** -- no total column per person | `src/components/project-view/project-staffing-grid.tsx` |
| B14 | **Total column header**: Spec header has `bg-primary/5` background tint | Not implemented | `src/app/(app)/projects/[projectId]/page.tsx` |
| B15 | **Row borders**: Spec uses `divide-y divide-[#a9b4b7]/10` on tbody | `divide-outline-variant divide-y` + individual `border-t border-outline-variant` -- slightly different color treatment | `src/app/(app)/projects/[projectId]/page.tsx:61`, `project-staffing-grid.tsx:29` |
| B16 | **First column border-right**: Spec has `border-r border-[#a9b4b7]/10` on data cells | No right border on first column | `src/components/project-view/project-staffing-grid.tsx:30` |

### C. Summary Row

| # | Spec | Implementation | File:Line |
|---|------|----------------|-----------|
| C1 | **Summary row label**: "Monthly Project Total" with `text-xs tracking-widest uppercase` | Just "Total" with `font-bold` | `src/components/project-view/project-summary-row.tsx:19` |
| C2 | **Summary row bg**: `bg-surface-container-high` with `border-t-2` | `bg-surface-container-low` with no special top border | `src/components/project-view/project-summary-row.tsx:18` |
| C3 | **Summary row position**: In `<tbody>` in spec (last row) | In `<tfoot>` in implementation | `src/app/(app)/projects/[projectId]/page.tsx:64-66` |
| C4 | **Grand total cell**: `bg-primary text-on-primary` solid primary background | No grand total cell exists | `src/components/project-view/project-summary-row.tsx` |
| C5 | **Summary cell padding**: `px-6 py-4` | `px-2 py-2` | `src/components/project-view/project-summary-row.tsx:39` |
| C6 | **Understaffed warning**: Implementation adds amber dashed-border cells for zero-allocation months | Not in spec -- this is an implementation addition (acceptable) | `src/components/project-view/project-summary-row.tsx:24-32` |

### D. Visualization Panels (Below Table)

| # | Spec | Implementation | File:Line |
|---|------|----------------|-----------|
| D1 | **Allocation Trends chart**: Bar chart with `bg-surface-container-low rounded-sm p-6`, 8 bars with hover tooltips | **Missing entirely** | N/A |
| D2 | **Discipline Distribution panel**: Progress bars for SW/Mek/Elnik with percentages, `bg-surface-container-low rounded-sm p-6` | **Missing entirely** | N/A |
| D3 | **Grid layout**: `grid grid-cols-1 gap-8 md:grid-cols-2` for the two panels | **Missing entirely** | N/A |

### E. Side Navigation Differences

| # | Spec | Implementation | File:Line |
|---|------|----------------|-----------|
| E1 | **Nav icons**: Spec uses Material Symbols (`group`, `event_available`, `bar_chart`, `flag`, `description`) | Implementation uses Lucide icons (`LayoutDashboard`) | `src/components/layout/side-nav.tsx:3` |
| E2 | **Nav items**: Spec shows Resources, Allocations, Capacity, Milestones, Reports | Implementation shows context-dependent sections (All Projects, etc.) | `src/components/layout/side-nav.tsx:17-58` |
| E3 | **Nav item style**: Spec has `gap-3` with icon + text, `text-xs font-medium text-slate-600` | Implementation uses text-only links without icons | `src/components/layout/side-nav.tsx:100-108` |
| E4 | **Help/Archive footer links**: Spec has Help and Archive links in bottom section | **Missing** | `src/components/layout/side-nav.tsx` |
| E5 | **Side nav header padding**: Spec uses `px-6 py-8` | Implementation uses `px-6 py-6` | `src/components/layout/side-nav.tsx:73` |
| E6 | **Brand subtitle style**: Spec uses `text-[10px] font-medium tracking-widest uppercase text-outline` | Implementation uses `text-on-surface-variant text-xs` -- no uppercase, no tracking | `src/components/layout/side-nav.tsx:81` |

### F. Top Navigation Differences

| # | Spec | Implementation | File:Line |
|---|------|----------------|-----------|
| F1 | **Header height**: Spec implies taller header with `py-4` | Implementation uses `h-14` fixed height | `src/components/layout/top-nav.tsx:53` |
| F2 | **Nav link active style**: Spec uses `border-b-2 border-[#496173] pb-1 font-bold text-[#496173]` | Implementation uses `border-b-2 border-primary text-primary font-bold px-3 py-4` -- close match but wrapped in different padding | `src/components/layout/top-nav.tsx:80-84` |
| F3 | **Search placeholder**: Spec says "Search projects..." | Implementation says "Search..." | `src/components/layout/top-nav.tsx:98` |
| F4 | **Search input width**: Spec uses `w-64` | Implementation also uses `w-64` -- match | `src/components/layout/top-nav.tsx:99` |
| F5 | **Notification/Settings buttons**: Spec uses `rounded-full p-2` with Material Symbols | Implementation uses `rounded-sm p-1.5` with Lucide icons at `size={18}` | `src/components/layout/top-nav.tsx:107-119` |
| F6 | **User avatar**: Spec shows `<img>` with `h-8 w-8 rounded-full border` | Implementation uses Clerk's `<UserButton />` component | `src/components/layout/top-nav.tsx:121` |
| F7 | **Nav gap**: Spec uses `gap-6` between nav links | Implementation uses `gap-1` -- much tighter | `src/components/layout/top-nav.tsx:73` |

### G. Typography and Spacing

| # | Spec | Implementation | File:Line |
|---|------|----------------|-----------|
| G1 | **Number formatting**: Spec shows comma-separated numbers ("12,480", "1,140") | Implementation renders raw numbers without formatting | `src/components/project-view/project-staffing-grid.tsx:47` |
| G2 | **Font tabular-nums**: Spec uses custom `.font-tabular` class | Implementation uses `tabular-nums` Tailwind utility -- functionally equivalent | Match |
| G3 | **Main content padding**: Spec uses `px-8 pb-12` on the data section | Implementation uses `p-4 sm:p-6 lg:p-8` from AppShell | `src/components/layout/app-shell.tsx:25` |

---

## FIXES NEEDED (prioritized by visual impact)

### Priority 1: Project Header -- Add hero section with stat cards

**File:** `src/app/(app)/projects/[projectId]/page.tsx`

The entire header section needs to be rebuilt to match the spec. Current lines 26-31 should be replaced with:

1. **Line 27**: Change `text-3xl font-semibold` to `text-4xl font-extrabold`
2. **Lines 28-29**: Add program badge row above title:
   ```tsx
   <div className="mb-1 flex items-center gap-2">
     <span className="text-outline text-xs font-semibold tracking-widest uppercase">Program</span>
     <span className="text-primary bg-primary-container rounded-sm px-2 py-0.5 text-xs font-bold">
       {data?.programName ?? 'N/A'}
     </span>
   </div>
   ```
3. **Line 30**: Replace generic subtitle with project description from API data
4. **After line 31**: Add stat cards row with three cards (Total Hours, Assigned count, Disciplines) using `bg-surface-container-lowest min-w-[160px] rounded-sm p-5 shadow-[0_4px_20px_-4px_rgba(42,52,55,0.06)]`
5. Wrap header in `flex flex-col md:flex-row md:items-end justify-between gap-6`

### Priority 2: Table styling overhaul

**Files:** `src/app/(app)/projects/[projectId]/page.tsx`, `src/components/project-view/project-staffing-grid.tsx`, `src/components/project-view/project-summary-row.tsx`

#### page.tsx (table structure):
- **Line 47**: Wrap table in container div: `className="bg-surface-container-lowest overflow-hidden rounded-sm border border-[#a9b4b7]/15"`
- **Line 47**: Change `className="w-full text-left text-sm"` to `className="w-full border-collapse text-left"`
- **Line 48-49**: Add `bg-surface-container-low` to the thead `<tr>`
- **Line 50**: Change header cell to `className="text-outline bg-surface-container-low sticky left-0 z-10 w-64 border-r border-[#a9b4b7]/10 px-6 py-4 text-[11px] font-bold tracking-wider uppercase"` and change text from "Person" to "Team Member"
- **Lines 52-57**: Change month header cells to `className="text-outline px-6 py-4 text-right text-[11px] font-bold tracking-wider uppercase"`
- Add a "Total" column header: `className="text-outline bg-primary/5 px-6 py-4 text-right text-[11px] font-bold tracking-wider uppercase"`
- **Line 61**: Change tbody to `className="divide-y divide-[#a9b4b7]/10"`

#### project-staffing-grid.tsx (row cells):
- **Line 29**: Change to `className="group hover:bg-surface-container-low transition-colors"`; remove `border-t border-outline-variant`
- **Line 30**: Add sticky first column: `className="bg-surface-container-lowest group-hover:bg-surface-container-low sticky left-0 z-10 border-r border-[#a9b4b7]/10 px-6 py-3"`
- **Lines 31-35**: Remove the `<Link>` wrapper. Render name as plain `<span className="text-on-surface text-sm font-semibold">` in "First Last" format
- **After name**: Add discipline badge: `<span className="text-on-secondary-fixed bg-secondary-container mt-0.5 w-fit rounded-full px-1.5 py-0.5 text-[10px] font-bold">{discipline}</span>`
- **Lines 43-46**: Change all data cells to `className="font-tabular text-on-surface-variant px-6 py-3 text-right text-sm"`
- **After month cells**: Add total cell per person: `className="font-tabular text-primary bg-primary/5 px-6 py-3 text-right text-sm font-bold"`
- Add number formatting with `toLocaleString()` for comma separation

#### project-summary-row.tsx:
- **Line 18**: Change to `className="bg-surface-container-high border-outline-variant/10 border-t-2 font-bold"`
- **Line 19**: Change label from "Total" to "Monthly Project Total" and style: `className="bg-surface-container-high text-on-surface sticky left-0 z-10 border-r border-[#a9b4b7]/10 px-6 py-4 text-xs tracking-widest uppercase"`
- **Line 39**: Change cell padding to `px-6 py-4 text-right text-sm`
- Add grand total cell at end: `className="font-tabular bg-primary text-on-primary px-6 py-4 text-right text-sm"`

### Priority 3: Add visualization panels

**New components needed:**

1. **`src/components/project-view/allocation-trends-chart.tsx`** -- Bar chart panel showing monthly allocation trends with `bg-surface-container-low rounded-sm p-6`, bars using `bg-primary/20` and `bg-primary/30`, month labels at bottom
2. **`src/components/project-view/discipline-distribution.tsx`** -- Progress bars panel showing percentage breakdown by discipline with colored bars (primary for SW, outline for Mek, tertiary for Elnik)
3. Add both panels to page.tsx in a `grid grid-cols-1 gap-8 md:grid-cols-2` layout after the table section

### Priority 4: Side nav polish

**File:** `src/components/layout/side-nav.tsx`

- **Line 73**: Change `py-6` to `py-8`
- **Line 81**: Change subtitle to `className="text-outline mt-1 text-[10px] font-medium tracking-widest uppercase"` (add uppercase, change size, change color)
- **Lines 100-108**: Add icons to nav items (either switch to Material Symbols or use appropriate Lucide icons with `size={18}`)
- Add Help and Archive links in a footer section below the "New Entry" button

### Priority 5: Top nav refinements

**File:** `src/components/layout/top-nav.tsx`

- **Line 73**: Change `gap-1` to `gap-6` for nav link spacing
- **Line 98**: Change placeholder from "Search..." to "Search projects..."
- **Line 107, 117**: Change button rounding from `rounded-sm` to `rounded-full` and padding from `p-1.5` to `p-2`

### Priority 6: Data formatting

**File:** `src/components/project-view/project-staffing-grid.tsx`

- **Line 47**: Format numbers with `toLocaleString()` to add comma separators for values >= 1,000
- **Line 34**: Change name format from `{person.lastName}, {person.firstName}` to `{person.firstName} {person.lastName}`

---

## Files Audited

| File | Purpose |
|------|---------|
| `creative-direction/02-project-view-atlas.html` | Design spec (660 lines) |
| `src/app/(app)/projects/[projectId]/page.tsx` | Project detail page (78 lines) |
| `src/components/project-view/project-staffing-grid.tsx` | Staffing grid rows (55 lines) |
| `src/components/project-view/project-summary-row.tsx` | Summary/total row (49 lines) |
| `src/components/layout/side-nav.tsx` | Side navigation (128 lines) |
| `src/components/layout/top-nav.tsx` | Top navigation (178 lines) |
| `src/components/layout/app-shell.tsx` | App shell wrapper (32 lines) |
| `src/components/layout/breadcrumbs.tsx` | Breadcrumbs (19 lines) |
| `src/app/(app)/layout.tsx` | App layout (38 lines) |
| `src/app/globals.css` | Theme tokens (79 lines) |
| `src/hooks/use-project-staffing.ts` | Data fetching hook (30 lines) |

---

## Discrepancy Count

- **Total discrepancies found:** 42
- **Missing features:** 6 (stat cards, program badge, discipline badges, total column, bar chart, distribution panel)
- **Styling mismatches:** 28 (colors, padding, font sizes, weights, borders, rounding, spacing)
- **Content differences:** 5 (label text, name format, placeholder text, number formatting)
- **Structural differences:** 3 (sticky columns, table container, summary row position)
