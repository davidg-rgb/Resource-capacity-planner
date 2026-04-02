# Management Dashboard -- Visual Spec Audit

**Audited:** 2026-03-29
**Spec file:** `creative-direction/06-management-dashboard.html`
**Screenshots:** Not captured (no dev server detected on ports 3000, 5173, 8080)
**Audit method:** Code-only comparison against HTML spec

---

## Summary

The spec describes a rich management dashboard with a utilization heat map table, KPI cards with status badges, discipline utilization progress bars, strategic alerts, and a project impact sidebar. The current implementation takes a fundamentally different approach: it uses Recharts bar charts instead of the spec's heat map table, has simpler KPI cards without status badges, and is missing multiple entire sections. The gap is structural, not cosmetic.

---

## MATCHES -- Things That Already Align With The Spec

1. **Design token parity.** `globals.css` defines the exact same color tokens as the spec's Tailwind config: `primary: #496173`, `error: #9f403d`, `surface: #f8fafb`, `on-surface: #2a3437`, etc. All M3-style token names match.

2. **Font families.** Both spec and implementation use `Manrope` for headlines and `Inter` for body text, correctly mapped via `--font-headline` and `--font-body`.

3. **Side nav structure.** The `SideNav` component (`src/components/layout/side-nav.tsx`) has the same overall skeleton as the spec: fixed left sidebar at `w-64`, logo block with `bg-primary` icon square, "Resource Planner" / "Nordic Precision" branding, and a "New Entry" CTA button at the bottom.

4. **Top nav header.** `TopNav` (`src/components/layout/top-nav.tsx`) matches the spec's header bar: "Nordic Capacity" title with `text-primary text-xl font-semibold tracking-tighter`, horizontal nav links with `border-b-2` active indicator, search input with icon, notification and settings icons, and user avatar area.

5. **Page title block.** The dashboard page title uses `font-headline text-on-surface text-3xl font-semibold` which is close to the spec's `text-2xl`. Both have a subtitle in `text-on-surface-variant text-sm`.

6. **KPI card count.** Both spec and implementation show 4 KPI cards in a responsive grid (`grid-cols-4`).

7. **Background color.** Main content area uses `bg-surface` matching the spec.

8. **Max width constraint.** Both use `max-w-[1440px]` on the content area.

---

## DISCREPANCIES -- Every Visual Difference

### D1: MISSING -- Departmental Utilization Heat Map Table (CRITICAL)

**Spec shows:** A full HTML table with department names as rows (Electronics, Drivetrain, Testing, Software) and months as columns (Apr-Sep). Each cell contains a colored block (`h-10 rounded-sm`) with percentage text, color-coded by threshold:
- `bg-error` (>95%): red blocks with white text
- `bg-primary` (85-95%): blue-grey blocks with white text
- `bg-primary/60` and `bg-primary/40` (60-85%): lighter variants
- `bg-surface-container-high text-outline-variant` (<60%): grey blocks

The table has a left border accent (`border-l-4 border-primary`), legend dots in the header, and `hover:bg-surface-container-low` row transitions.

**Code currently does:** `DepartmentBarChart` (`src/components/charts/department-bar-chart.tsx`) renders a Recharts horizontal bar chart -- a completely different visualization type. No heat map table exists on the main dashboard page.

**File:** `src/app/(app)/dashboard/dashboard-content.tsx:112-131`

---

### D2: MISSING -- Discipline Utilization Progress Bars (CRITICAL)

**Spec shows:** A sidebar panel (`col-span-4`) with individual discipline sections (SW, HW, Mek). Each has:
- A dot indicator (`h-2 w-2 rounded-full`) color-coded (primary/error/outline)
- Label like "SW (Software)" in `text-xs font-semibold`
- Percentage value in `text-xs font-bold tabular-nums`
- A thin progress bar (`h-1.5 rounded-full`) with track in `bg-surface-container-highest`
- Sub-stats: "84 Available" / "76.4 Assigned" in `text-[10px]`
- Container with `border-t-2 border-primary/20` accent

**Code currently does:** `DisciplineChart` (`src/components/charts/discipline-chart.tsx`) renders a Recharts horizontal bar chart showing total hours. No progress bar UI, no available/assigned breakdown, no dot indicators.

**File:** `src/components/charts/discipline-chart.tsx`

---

### D3: MISSING -- Strategic Alerts Section (CRITICAL)

**Spec shows:** A "Strategic Alerts" section below the heat map with two alert cards:
1. Critical alert: `bg-error-container/10 border-error/10` border, warning icon in `text-error`, bold title, descriptive text mentioning specific milestones
2. Info alert: `bg-surface-container-high`, trending_down icon, title about under-utilization, descriptive text

**Code currently does:** Alerts exist as a separate `/alerts` page (`src/components/alerts/alert-list.tsx`) behind a feature flag, not inline on the dashboard. The alert styling uses Tailwind red/amber classes instead of the spec's design-system tokens (`error-container`, `on-error-container`).

**File:** `src/app/(app)/dashboard/dashboard-content.tsx` (section missing entirely)

---

### D4: MISSING -- Project Impact Sidebar (CRITICAL)

**Spec shows:** A "Project Impact" card in the right sidebar with clickable project rows. Each row has:
- `border-l-2 border-outline-variant/20` left accent
- Project name in `text-xs font-semibold`
- Subtitle like "Resource Heavy - Priority 1" in `text-[10px] text-outline`
- Chevron right icon
- `hover:bg-surface-container-low` transition

**Code currently does:** No project impact section exists anywhere on the dashboard.

**File:** `src/app/(app)/dashboard/dashboard-content.tsx` (not implemented)

---

### D5: MISSING -- System Visual / Hero Image (MINOR)

**Spec shows:** A decorative image block at bottom of sidebar with:
- `h-40 overflow-hidden rounded-sm` container
- Full-bleed image with `object-cover`
- Overlay: `bg-primary/20` with `group-hover:bg-primary/10` transition
- "Precision Core" badge: `bg-primary text-on-primary rounded-full px-2 py-1 text-[10px] uppercase`

**Code currently does:** Not implemented.

---

### D6: KPI Card Styling Mismatch

**Spec shows:** KPI cards with:
- `bg-surface-container-lowest` (white) background
- `border-b-2 border-primary/10` bottom border accent (or `border-error/20` for overloaded card)
- No side/top borders
- Label: `text-outline-variant text-xs font-semibold tracking-wider uppercase`
- Value: `text-primary text-3xl font-bold tabular-nums` (or `text-error` for overloaded)
- Status badges: `bg-secondary-container rounded-full px-2 py-0.5 text-[10px]` like "+4 New", "Optimal Range", "High Priority", "Available Bench"

**Code currently does:** KPI card (`src/components/charts/kpi-card.tsx`):
- Uses `bg-surface-container-low` (NOT `surface-container-lowest/white`)
- Has `border border-outline-variant/30 rounded-lg` (full border, not just bottom)
- Uses `rounded-lg` (8px) instead of spec's `rounded-sm` (2px)
- Value is `text-on-surface` instead of `text-primary`
- No `tabular-nums` on values
- No status badges at all
- No differentiated border colors per card type
- Title uses `text-outline` instead of `text-outline-variant`

**File:** `src/components/charts/kpi-card.tsx:12-19`

---

### D7: Layout Grid Mismatch

**Spec shows:** Below KPI cards, a `grid grid-cols-12 gap-8` layout with:
- Heat map in `col-span-8`
- Discipline bars + Project Impact + Hero image in `col-span-4`

**Code currently does:** Uses `grid gap-6 lg:grid-cols-2` -- a 50/50 split instead of the spec's 8/4 (67/33) split.

**File:** `src/app/(app)/dashboard/dashboard-content.tsx:112`

---

### D8: Dashboard Page Title Text

**Spec shows:** Title is "Management Overview" in `text-2xl`. Subtitle is "Operational capacity and resource health for Q2-Q3 2024."

**Code currently does:** Title is "Dashboard" in `text-3xl`. Subtitle is "Key capacity metrics and departmental overview."

**File:** `src/app/(app)/dashboard/page.tsx:11-15`

---

### D9: Side Nav Items Mismatch

**Spec shows:** Nav items with Material Symbols icons:
- Resources (group icon)
- Allocations (event_available)
- **Capacity** (bar_chart) -- active state
- Milestones (flag)
- Reports (description)
- Help and Archive footer links

Active state: `bg-[#d9e4e8] text-primary font-semibold`
Inactive: `text-slate-600 hover:bg-[#d9e4e8]/50`

**Code currently does:** Side nav items are context-dependent (changes per route) with different labels. Dashboard section shows only "Overview". Uses Lucide icons instead of Material Symbols. No Help/Archive footer links.

Active state: `bg-surface-container-high text-primary font-semibold` (close but not the exact `#d9e4e8` hex)
Note: `surface-container-highest` IS `#d9e4e8` in the tokens, but code uses `surface-container-high` which is `#e1eaec`.

**File:** `src/components/layout/side-nav.tsx:66-128`

---

### D10: Side Nav Logo Subtitle Styling

**Spec shows:** "Nordic Precision" in `text-outline text-[10px] tracking-widest uppercase`

**Code currently does:** "Nordic Precision" in `text-on-surface-variant text-xs` -- wrong color token, wrong size (12px vs 10px), missing uppercase and tracking-widest.

**File:** `src/components/layout/side-nav.tsx:81`

---

### D11: Side Nav "New Entry" Button Styling

**Spec shows:** Button with `mb-6`, icon (`add` Material Symbol), `gap-2`, `py-2.5`

**Code currently does:** No icon, uses `px-4 py-2` instead of `py-2.5`, no `mb-6` margin below, uses `hover:opacity-90` which spec doesn't have.

**File:** `src/components/layout/side-nav.tsx:119-124`

---

### D12: Top Nav Search Input

**Spec shows:** `w-48` width, `placeholder="Search system..."`, Material Symbol search icon with `text-sm`

**Code currently does:** `w-64` width (wider), `placeholder="Search..."` (shorter text), Lucide Search icon at `size={14}`

**File:** `src/components/layout/top-nav.tsx:94-100`

---

### D13: Top Nav Height and Padding

**Spec shows:** Header with `px-8 py-4` -- 32px horizontal padding, taller

**Code currently does:** Header with `h-14 px-4 md:px-6` -- fixed 56px height, narrower padding

**File:** `src/components/layout/top-nav.tsx:53`

---

### D14: Side Nav Position Relative to Top Nav

**Spec shows:** Sidebar is full-height (`h-screen`, `top-0`), sits alongside main content which has `ml-64`. No top nav overlaps the sidebar.

**Code currently does:** Sidebar starts below the top nav (`top-14`, `h-[calc(100vh-3.5rem)]`). Different architectural choice.

**File:** `src/components/layout/side-nav.tsx:71`

---

### D15: Time Range Selector (Not in Spec)

**Spec shows:** No time range toggle. The dashboard shows fixed Q2-Q3 2024 data.

**Code currently does:** Has a 3/6/12 month toggle control with segmented button styling. This is an additive feature, not a discrepancy per se, but worth noting.

**File:** `src/app/(app)/dashboard/dashboard-content.tsx:54-70`

---

### D16: Team Overview Link Card (Not in Spec)

**Spec shows:** No "Team Overview" link card at the bottom.

**Code currently does:** Adds a link card to `/dashboard/team` at the bottom of the page.

**File:** `src/app/(app)/dashboard/page.tsx:46-56`

---

### D17: Heat Map Color System Mismatch

**Spec shows:** Heat map uses design-system tokens for cell colors:
- `bg-error` for >95%
- `bg-primary` for 85-95%
- `bg-primary/60` and `bg-primary/40` for 60-85%
- `bg-surface-container-high` for <60%

**Code currently does:** The team heat map page (`/dashboard/team`) uses a completely different color system:
- `bg-red-500/80` for over 100%
- `bg-green-500/60` for 80-100%
- `bg-amber-400/60` for 50-79%
- `bg-gray-200` for under 50%

These are generic Tailwind colors, not the spec's M3 design tokens.

**File:** `src/lib/capacity.ts:67-72`

---

### D18: Chart Section Headers

**Spec shows:** Heat map title "Departmental Utilization Heat Map" in `font-headline text-sm font-semibold` (sentence case, no uppercase)

**Code currently does:** Chart headers use `font-headline text-outline text-sm font-semibold tracking-widest uppercase` -- adds uppercase treatment and tracking-widest that the spec doesn't have for this particular heading.

**File:** `src/app/(app)/dashboard/dashboard-content.tsx:115-116`

---

### D19: Icon Library Mismatch

**Spec shows:** Material Symbols Outlined throughout (google fonts icon font). Icons like `group`, `event_available`, `bar_chart`, `flag`, `description`, `warning`, `trending_down`, `chevron_right`, `search`, `notifications`, `settings`, `add`, `help_outline`, `archive`.

**Code currently does:** Uses Lucide React icons (`LayoutDashboard`, `Search`, `Bell`, `Settings`, `FileInput`, `Users`, `FolderKanban`, `Database`, `ChevronDown`, `ChevronRight`, `AlertTriangle`, `ArrowDownRight`). Visually different icon style.

**Files:** `src/components/layout/top-nav.tsx`, `src/components/layout/side-nav.tsx`

---

### D20: Border Radius System

**Spec shows:** Custom border radius scale:
- DEFAULT: `0.125rem` (2px)
- lg: `0.25rem` (4px)
- xl: `0.5rem` (8px)
- full: `0.75rem` (12px)

So `rounded-sm` = 2px, `rounded` = 2px, `rounded-lg` = 4px.

**Code currently does:** KPI cards and chart containers use `rounded-lg` which in the default Tailwind scale is 8px. The `globals.css` does define `--radius-lg: 8px` which matches Tailwind's default but NOT the spec's 4px for `lg`.

The spec intentionally uses very tight radii for a "Nordic precision" feel. The implementation uses standard Tailwind radii which are rounder.

**File:** `src/app/globals.css:22-25` defines custom radii but they may not override Tailwind v4's built-in radius scale properly.

---

## FIXES NEEDED -- Exact Changes Required

### Priority 1: Implement the Heat Map Table (replaces bar chart)

Create a new component `src/components/charts/utilization-heat-map.tsx` that renders an HTML table matching the spec:
- Department name column + month columns
- Each cell: `div` with `h-10 rounded-sm flex items-center justify-center font-bold tabular-nums`
- Color logic: `bg-error` (>95%), `bg-primary` (85-95%), `bg-primary/60` (70-84%), `bg-primary/40` (60-69%), `bg-surface-container-high text-outline-variant` (<60%)
- Container: `bg-surface-container-lowest border-l-4 border-primary rounded-sm p-6`
- Legend header with colored dots

Replace the `DepartmentBarChart` usage in `dashboard-content.tsx:112-131` with this new component.

### Priority 2: Implement Discipline Progress Bars (replaces bar chart)

Create `src/components/charts/discipline-progress.tsx`:
- For each discipline: dot indicator, label, percentage, thin `h-1.5` progress bar, available/assigned sub-stats
- Container: `bg-surface-container-low border-t-2 border-primary/20 rounded-sm p-6`
- Color-code the dot and bar by threshold (primary for normal, error for overloaded, outline for low)

Replace `DisciplineChart` usage in `dashboard-content.tsx:133-150`.

### Priority 3: Add Strategic Alerts Section

Add inline alerts below the heat map in `dashboard-content.tsx`:
- Title: "Strategic Alerts" in `font-headline text-sm font-semibold`
- Two-column grid of alert cards
- Critical: `bg-error-container/10 border border-error/10 rounded-sm p-4`, warning icon, `text-on-error-container` title, `text-error` description
- Info: `bg-surface-container-high rounded-sm p-4`, trending_down icon, `text-on-surface` title, `text-outline` description

### Priority 4: Add Project Impact Sidebar

Add to the right-side column in `dashboard-content.tsx`:
- Container: `bg-surface-container-lowest rounded-sm p-6`
- Title: "Project Impact" in `font-headline text-sm font-semibold`
- Clickable rows with `border-l-2 border-outline-variant/20 rounded p-3`
- `hover:bg-surface-container-low` transition
- Chevron right icon

### Priority 5: Fix KPI Card Styling

In `src/components/charts/kpi-card.tsx`:

```tsx
// Line 12: Change container classes
- <div className="border-outline-variant/30 bg-surface-container-low rounded-lg border p-6">
+ <div className="bg-surface-container-lowest border-b-2 border-primary/10 rounded-sm p-6">

// Line 13-14: Change title color
- <p className="font-headline text-outline text-xs font-semibold tracking-widest uppercase">
+ <p className="font-body text-outline-variant text-xs font-semibold tracking-wider uppercase">

// Line 16-18: Change value color, add tabular-nums
- <p className="font-headline text-on-surface mt-2 text-3xl font-bold tracking-tight">
+ <p className="font-headline text-primary mt-4 text-3xl leading-none font-bold tabular-nums">
```

Add a `badge` prop to KPICard for the status badges ("+4 New", "High Priority", etc.) and a `variant` prop to control border color (`primary`, `error`, `outline`).

### Priority 6: Fix Layout Grid

In `src/app/(app)/dashboard/dashboard-content.tsx`:

```tsx
// Line 112: Change grid layout
- <div className="grid gap-6 lg:grid-cols-2">
+ <div className="grid grid-cols-12 gap-8">

// Heat map container:
+ <div className="col-span-12 lg:col-span-8">

// Side rail:
+ <div className="col-span-12 lg:col-span-4 space-y-6">
```

### Priority 7: Fix Page Title

In `src/app/(app)/dashboard/page.tsx`:

```tsx
// Line 11-15:
- <h1 className="font-headline text-on-surface text-3xl font-semibold tracking-tight">
-   Dashboard
- </h1>
- <p className="text-on-surface-variant mt-2 text-sm">
-   Key capacity metrics and departmental overview.
+ <h1 className="font-headline text-on-surface text-2xl font-semibold">
+   Management Overview
+ </h1>
+ <p className="text-on-surface-variant font-body mt-1 text-sm">
+   Operational capacity and resource health for Q2-Q3 2024.
```

### Priority 8: Fix Heat Map Colors to Use Design Tokens

In `src/lib/capacity.ts:67-72`:

```tsx
- export const HEAT_MAP_COLORS: Record<HeatMapStatus, string> = {
-   over: 'bg-red-500/80 text-white',
-   healthy: 'bg-green-500/60 text-green-950',
-   under: 'bg-amber-400/60 text-amber-950',
-   idle: 'bg-gray-200 text-gray-500',
- };
+ export const HEAT_MAP_COLORS: Record<HeatMapStatus, string> = {
+   over: 'bg-error text-white',
+   healthy: 'bg-primary text-white',
+   under: 'bg-primary/40 text-white',
+   idle: 'bg-surface-container-high text-outline-variant',
+ };
```

### Priority 9: Fix Side Nav Logo Subtitle

In `src/components/layout/side-nav.tsx:81`:

```tsx
- <p className="text-on-surface-variant text-xs">Nordic Precision</p>
+ <p className="text-outline text-[10px] tracking-widest uppercase">Nordic Precision</p>
```

### Priority 10: Fix Border Radius Consistency

Verify that `globals.css` radius tokens are being picked up by Tailwind v4. If the project uses Tailwind v4 `@theme`, the radius values need to align:

```css
--radius-sm: 2px;   /* rounded-sm */
--radius-md: 4px;   /* rounded / rounded-md */
--radius-lg: 8px;   /* rounded-lg -- spec says 4px but 8px is acceptable */
```

Audit all `rounded-lg` usage on dashboard components and change to `rounded-sm` where the spec uses `rounded-sm` (KPI cards, heat map container, alert cards, discipline panel, project impact card).

---

## Files Audited

| File | Role |
|------|------|
| `creative-direction/06-management-dashboard.html` | Design spec |
| `src/app/globals.css` | Design tokens |
| `src/components/charts/chart-colors.ts` | Chart color constants |
| `src/components/charts/department-bar-chart.tsx` | Department visualization |
| `src/components/charts/discipline-chart.tsx` | Discipline visualization |
| `src/components/charts/kpi-card.tsx` | KPI metric cards |
| `src/app/(app)/dashboard/page.tsx` | Dashboard page |
| `src/app/(app)/dashboard/dashboard-content.tsx` | Dashboard client content |
| `src/app/(app)/dashboard/team/page.tsx` | Team heat map page |
| `src/components/layout/side-nav.tsx` | Sidebar navigation |
| `src/components/layout/top-nav.tsx` | Top navigation bar |
| `src/components/layout/app-shell.tsx` | App layout shell |
| `src/app/(app)/layout.tsx` | App route layout |
| `src/components/heat-map/heat-map-table.tsx` | Team heat map table |
| `src/components/heat-map/heat-map-cell.tsx` | Heat map cell component |
| `src/components/alerts/alert-list.tsx` | Alert list component |
| `src/lib/capacity.ts` | Capacity calculation + colors |

---

## Discrepancy Summary

| ID | Category | Severity | Description |
|----|----------|----------|-------------|
| D1 | Missing component | CRITICAL | Heat map table replaced by bar chart |
| D2 | Missing component | CRITICAL | Discipline progress bars replaced by bar chart |
| D3 | Missing section | CRITICAL | Strategic alerts not on dashboard |
| D4 | Missing section | CRITICAL | Project impact sidebar not implemented |
| D5 | Missing section | MINOR | Decorative hero image not implemented |
| D6 | Styling | MAJOR | KPI card styling diverges significantly |
| D7 | Layout | MAJOR | Grid uses 50/50 instead of 67/33 split |
| D8 | Copy | MODERATE | Page title and subtitle differ |
| D9 | Navigation | MODERATE | Side nav items and icons differ |
| D10 | Styling | MINOR | Side nav subtitle styling wrong |
| D11 | Styling | MINOR | New Entry button missing icon and spacing |
| D12 | Styling | MINOR | Search input width and placeholder differ |
| D13 | Styling | MINOR | Top nav height and padding differ |
| D14 | Architecture | INFO | Sidebar position relative to top nav differs |
| D15 | Feature | INFO | Time range selector added (not in spec) |
| D16 | Feature | INFO | Team overview link card added (not in spec) |
| D17 | Color system | MAJOR | Heat map uses generic colors, not design tokens |
| D18 | Typography | MINOR | Chart headers have uppercase not in spec |
| D19 | Icons | MODERATE | Lucide icons instead of Material Symbols |
| D20 | Spacing/Radius | MODERATE | Border radius values don't match spec's tight system |
