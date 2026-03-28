# Creative Direction Audit Report

**Generated**: 2026-03-27
**Scope**: Comparison of creative-direction HTML prototypes vs. built code in src/

---

## 1. GLOBAL DESIGN SYSTEM MISMATCHES

These affect every screen and component across the app.

### 1.1 Color Palette Divergence (globals.css vs. creative-direction)

The creative direction HTML files define a consistent Material Design 3-style color system. The built `globals.css` diverges on multiple key tokens.

| Token | Creative Direction (HTML) | Built (globals.css) | Impact |
|---|---|---|---|
| `on-primary` | `#f3f8ff` (soft blue-white) | `#ffffff` (pure white) | Button text tone differs |
| `primary-container` | `#cce6fb` | `#cde5ff` | Slight hue shift on containers |
| `surface` | `#f8fafb` | `#fafcff` | Background tone is cooler/bluer in built |
| `surface-container` | `#e8eff1` | `#eef1f6` | Container chrome slightly different |
| `surface-container-low` | `#f0f4f6` | `#f3f5fa` | Sidebar/input backgrounds differ |
| `surface-container-high` | `#e1eaec` | `#e8eaf0` | Active state backgrounds differ |
| `on-surface` | `#2a3437` (warm dark teal) | `#1a1c1e` (neutral near-black) | **Major**: All body text is darker/cooler than intended |
| `on-surface-variant` | `#566164` (muted teal) | `#43474e` (neutral dark gray) | **Major**: Secondary text tone differs significantly |
| `error` | `#9f403d` (muted brick red) | `#ba1a1a` (vivid red) | Error states are more aggressive than designed |
| `outline` | `#727d80` (teal-gray) | `#73777f` (neutral gray) | Subtle but affects borders everywhere |
| `outline-variant` | `#a9b4b7` (light teal-gray) | `#c3c7cf` (light neutral gray) | **Major**: All borders/dividers are lighter than designed |
| `on-secondary-fixed` | `#394045` | `#1a1c1e` | Badge text is much darker in built |
| `error-container` | `#fe8983` | `#fe8983` | Matches |
| `on-error-container` | `#752121` | `#752121` | Matches |
| `surface-container-highest` | `#d9e4e8` | `#d9e4e8` | Matches |
| `surface-dim` | `#cfdce0` | `#cfdce0` | Matches |
| `secondary` | `#586065` | `#586065` | Matches |
| `secondary-container` | `#dce4e9` | `#dce4e9` | Matches |

**Missing tokens in globals.css** (defined in creative direction but absent from built CSS):
- `surface-variant`: `#d9e4e8`
- `inverse-primary`: `#cce6fb`
- `surface-tint`: `#496173`
- `inverse-surface`: `#0b0f10`
- `primary-fixed`: `#cce6fb`
- `primary-fixed-dim`: `#bed8ed`
- `on-primary-fixed`: `#2a4253`
- `on-primary-fixed-variant`: `#465e70`
- `surface-bright`: `#f8fafb`
- `tertiary`: `#5b6063`
- `tertiary-container`: `#eaeef2`
- `tertiary-fixed`: `#eaeef2`
- `tertiary-fixed-dim`: `#dce0e3`
- `on-tertiary`: `#f5f9fd`
- `on-tertiary-fixed`: `#42474a`
- `on-tertiary-fixed-variant`: `#5e6366`
- `on-tertiary-container`: `#54595c`
- `inverse-on-surface`: `#9a9d9e`
- `secondary-dim`: `#4c5459`
- `secondary-fixed`: `#dce4e9`
- `secondary-fixed-dim`: `#ced5db`
- `on-secondary-fixed-variant`: `#555d61`
- `on-secondary-container`: `#4b5358`
- `primary-dim`: `#3d5567`
- `tertiary-dim`: `#4f5457`
- `error-dim`: `#4e0309`
- `on-error`: `#fff7f6`
- `background`: `#f8fafb`
- `on-background`: `#2a3437`

**Fix**: Align all tokens in `globals.css` to the creative-direction values. Add all missing tokens.

### 1.2 Border Radius System

| Context | Creative Direction | Built (globals.css) |
|---|---|---|
| DEFAULT | `0.125rem` (2px) | `--radius-sm: 2px` (but Tailwind v4 uses `rounded-sm` = varies) |
| lg | `0.25rem` (4px) | `--radius-md: 6px` |
| xl | `0.5rem` (8px) | Not defined |
| full | `0.75rem` (12px) | Not defined |

**Issue**: The creative direction defines very tight border radii (2px default, 4px lg) to achieve the "spreadsheet-precise" aesthetic. The built `--radius-md: 6px` is 50% larger than the intended `0.25rem` (4px).

**Fix**: Set `--radius-md: 4px` and add `--radius-lg: 8px`, `--radius-full: 12px` in globals.css. All components should use `rounded-sm` (2px) by default.

### 1.3 Font System

The creative direction consistently uses:
- **Headline font**: `Manrope` (for titles, nav items, section headers)
- **Body/Label font**: `Inter` (for data, form labels, body text)

**Built code**: Font families are correctly defined in globals.css. However, the built code inconsistently applies them. Many components use default font stacks instead of explicitly applying `font-headline` or `font-body` classes.

---

## 2. PERSON INPUT FORM (04-person-input-form.html)

### Corresponding built files:
- `src/app/(app)/input/[personId]/page.tsx`
- `src/app/(app)/input/layout.tsx`
- `src/components/grid/allocation-grid.tsx`
- `src/components/grid/grid-config.ts`
- `src/components/person/person-header.tsx`

### 2.1 Overall Layout Structure

| Aspect | Creative Direction | Built Code | Mismatch |
|---|---|---|---|
| Layout | Fixed sidebar (w-64) + main content area with topnav | AppShell with TopNav + PersonSidebar in layout.tsx | Structural match, but sidebar is w-72 in built vs w-64 in creative direction |
| Main area padding | `p-8` | `p-6` | Less padding in built |
| Max width | `max-w-[calc(1440px-256px)]` | No max-width constraint on content | Content can stretch wider than intended |
| Content vertical spacing | `space-y-6` | `space-y-4` | Tighter spacing in built |

**File**: `src/app/(app)/input/layout.tsx`
- **What**: Content padding
- **Expected**: `p-8` (32px padding)
- **Actual**: `p-6` (24px padding)
- **Fix**: Change `<div className="flex-1 overflow-auto p-6">` to `<div className="flex-1 overflow-auto p-8">`

### 2.2 Person Header

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Layout | Person name + prev/next arrows inline, then discipline/dept badges, then target hours right-aligned | Person name with prev/next arrows, target below name, no badges |
| Name size | `text-2xl font-semibold` | `text-2xl font-semibold tracking-tight` | Close match |
| Discipline badges | `bg-secondary-container text-on-secondary-fixed rounded-full px-2.5 py-0.5 text-xs font-semibold` (e.g., "SW", "Drivetrain") | **Missing entirely** |
| Target hours display | Right-aligned with label "Monthly Target" and `font-headline text-primary text-xl font-bold` value like "150 h/month" | Inline below name as plain text `text-sm text-on-surface-variant` "Target: 150h/month" |
| Arrow buttons | Icon-only, `hover:bg-surface-container-low` | Bordered buttons with `border border-outline-variant` |

**File**: `src/components/person/person-header.tsx`
- **What**: Missing discipline/department badges alongside person name
- **Expected**: Badges like `<span class="bg-secondary-container text-on-secondary-fixed rounded-full px-2.5 py-0.5 text-xs font-semibold">SW</span>` after the name
- **Actual**: No badges rendered
- **Fix**: Add discipline and department props; render Material badge spans after the name

**File**: `src/components/person/person-header.tsx`
- **What**: Target hours display is plain text instead of prominent right-aligned display
- **Expected**: Right side: label `text-outline text-[10px] font-semibold tracking-widest uppercase` "MONTHLY TARGET" + value `font-headline text-primary text-xl font-bold` "150 h/month"
- **Actual**: Below name: `text-sm text-on-surface-variant` "Target: 150h/month"
- **Fix**: Add `justify-between` to outer flex, create right-aligned target hours block

**File**: `src/components/person/person-header.tsx`
- **What**: Navigation arrows have visible borders, not icon-only
- **Expected**: `hover:bg-surface-container-low text-outline rounded-sm p-1` (no border, subtle bg on hover)
- **Actual**: `rounded-sm border border-outline-variant text-on-surface` (visible border)
- **Fix**: Remove `border border-outline-variant`, add `hover:bg-surface-container-low text-outline`

### 2.3 Allocation Grid (AG Grid)

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Grid implementation | HTML table with custom styling | AG Grid (ag-grid-react) |
| Container | `bg-surface-container-lowest border-outline-variant/15 rounded-sm border shadow-sm` | `div` with `h-[600px]` only |
| Header row bg | `bg-surface-container-low` | AG Grid default theme |
| Project column | Sticky left, `w-64 min-w-[256px]`, `text-on-surface font-semibold` | Pinned left, `width: 200` |
| Month column width | `min-w-[100px]` | `width: 90` |
| Current month highlight | `bg-primary-container/10` column tint + `text-primary font-bold` header + "CURRENT" sub-label | `ring-1 ring-inset ring-primary/20` (subtle ring only) |
| Cell padding | `px-4 py-2` | AG Grid default |
| Cell text | `text-right tabular-nums` (text-sm from tbody) | `text-right tabular-nums` + classes from grid-config |
| Row hover | `hover:bg-surface-container-low` with group | AG Grid default hover |
| Border between cells | `border-outline-variant/15 border-r` on every cell | AG Grid default borders |
| SUMMA row | `bg-surface-container-low font-bold` with matching bg on project cell | Pinned bottom row with `font-semibold` class |
| Target row | `text-outline` with Target values | Pinned bottom row |
| Status row | Color-coded dots (green/amber/red) with tinted cell backgrounds (bg-green-50, bg-amber-50, bg-error-container/10) | statusCellRenderer component (need to check) |
| "Add project..." row | Italic text in project cell `text-outline-variant font-normal italic` | createAddProjectRow with `isAddRow: true` |
| Footer area | Status legend (On Track/Warning/Over Capacity dots) + "Discard Changes"/"Save Worksheet" buttons | Not present |
| Bento analytics preview | 3-column grid below main grid (trend chart, project distribution, capacity insight card) | **Not implemented** |

**File**: `src/components/grid/allocation-grid.tsx`
- **What**: Grid container missing creative direction container styling
- **Expected**: Wrapper `bg-surface-container-lowest border-outline-variant/15 rounded-sm border shadow-sm overflow-hidden`
- **Actual**: `div` with only `h-[600px] w-full outline-none`
- **Fix**: Add container classes: `bg-surface-container-lowest border-outline-variant/15 rounded-sm border shadow-sm overflow-hidden`

**File**: `src/components/grid/grid-config.ts`
- **What**: Project column width is 200px instead of 256px
- **Expected**: `width: 256` (or min-width 256 as in creative direction)
- **Actual**: `width: 200`
- **Fix**: Change to `width: 256`

**File**: `src/components/grid/grid-config.ts`
- **What**: Month column width is 90px instead of 100px
- **Expected**: `width: 100` (min-w-[100px] in creative direction)
- **Actual**: `width: 90`
- **Fix**: Change to `width: 100`

**File**: `src/components/grid/grid-config.ts`
- **What**: Current month highlight uses ring instead of background tint
- **Expected**: Column tint `bg-primary-container/5` on cells + `bg-primary-container/10` on header
- **Actual**: `ring-1 ring-inset ring-primary/20`
- **Fix**: Change current month class to `bg-primary-container/5` (or equivalent background tint)

**File**: `src/app/(app)/input/[personId]/page.tsx`
- **What**: Missing footer with status legend and action buttons
- **Expected**: Bottom bar with status dots legend (On Track green, Warning amber, Over Capacity red) + "Discard Changes" + "Save Worksheet" buttons
- **Actual**: No footer bar
- **Fix**: Add sticky footer bar below the grid

**File**: Not implemented
- **What**: Missing "Dashboard Analytics Preview" bento grid below the main grid
- **Expected**: 3-column grid (Total Allocation Trend chart, Project Distribution bars, Capacity Insight card with primary bg)
- **Actual**: Not implemented at all
- **Fix**: Implement analytics preview section below the grid (could be Phase 2)

---

## 3. PERSON INPUT SIDEBAR (08-person-input-sidebar.html)

### Corresponding built file:
- `src/components/person/person-sidebar.tsx`

### 3.1 Sidebar Structure

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Width | `w-72` (288px) | `w-72` (288px) | **Match** |
| Background | `bg-[#f0f4f6]` (surface-container-low) | `bg-surface-container-low` | Matches if token is correct (see 1.1) |
| Border | `border-r border-[#a9b4b7]/15` | `border-r border-outline-variant/15` | Effectively same if token is aligned |
| Footer section | "New Entry" button + Help/Archive links at bottom with border-t | **Missing** - no footer section |
| Search icon | Material Symbols `search` icon | SVG inline search icon | Different icon style |

**File**: `src/components/person/person-sidebar.tsx`
- **What**: Missing sidebar footer section with "New Entry" button and Help/Archive links
- **Expected**: `border-t border-[#a9b4b7]/15 p-4` footer with `bg-primary text-on-primary mb-4 w-full rounded-sm py-2 text-xs font-bold` "New Entry" button + Help/Archive links
- **Actual**: Only `sidebarContent` is rendered, no footer
- **Fix**: Add footer section below the scrollable area

**File**: `src/components/person/person-sidebar.tsx`
- **What**: Search icon is an inline SVG instead of matching the design system icon style
- **Expected**: Material Symbols Outlined `search` icon (or at minimum a Lucide Search icon matching the TopNav)
- **Actual**: Inline SVG path
- **Fix**: Use `<Search size={14} />` from lucide-react to match the rest of the app

### 3.2 People List Items

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Active item bg | `bg-[#d9e4e8] font-semibold text-[#496173] shadow-sm` | `bg-surface-variant text-primary font-semibold shadow-sm` | Close, depends on token alignment |
| Active item badge | `bg-primary text-on-primary` | `bg-primary text-on-primary` | **Match** |
| Inactive item hover | `hover:bg-[#d9e4e8]/50` | `hover:bg-surface-variant/50` | **Match** (if tokens align) |
| Inactive badge | `bg-secondary-container text-on-secondary-fixed` | `bg-secondary-container text-on-secondary-fixed` | **Match** |
| Status dot | `h-2 w-2 rounded-full` with color variants | `h-2 w-2 rounded-full` with getStatusColor() | **Match** |
| Department heading | `font-headline text-outline mb-3 px-2 text-[10px] tracking-widest uppercase` | Same classes | **Match** |

Overall the person sidebar list items are well-matched to the creative direction.

---

## 4. BULK IMPORT VALIDATION (03-bulk-import-validation.html)

### Corresponding built files:
- `src/components/import/step-validate.tsx`
- `src/components/import/import-wizard.tsx`

### 4.1 Summary Cards

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Card layout | 3-column grid with `border-l-4` colored accent, `p-6`, `shadow-sm`, `hover:shadow-md` | Simple `rounded-md bg-green-50/bg-amber-50/bg-red-50 px-4 py-3 text-center` |
| Ready card | White bg + green left border (`border-primary rounded-lg border-l-4`) + icon | Flat green-50 background |
| Count size | `text-4xl font-bold tabular-nums` | `text-2xl font-semibold tabular-nums` |
| Subtitle | "Rows validated successfully" below count | Single word "Ready" below count |
| Icon | Material symbol icon top-right (`opacity-50`) | No icon |
| Status label | `text-outline text-xs font-semibold tracking-wider uppercase` above count | `text-xs font-medium` below count |

**File**: `src/components/import/step-validate.tsx`
- **What**: Summary cards are flat colored boxes instead of white cards with colored left border and icons
- **Expected**: White background cards (`bg-surface-container-lowest`) with `border-l-4` colored accent (primary/amber/error), large count (`text-4xl font-bold`), subtitle text, and a faded icon in the top-right
- **Actual**: Flat tinted backgrounds (green-50/amber-50/red-50) with smaller count (`text-2xl font-semibold`), centered layout, no icons, no subtitles
- **Fix**: Redesign cards to match creative direction: white bg, colored left border, top-aligned icon, larger count, descriptive subtitle

### 4.2 Validation Log / Issue List

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Container | Rounded card (`bg-surface-container-lowest rounded-lg border shadow-sm overflow-hidden`) with header bar | Plain bordered table `rounded-md border` |
| Header bar | `bg-surface-container-low px-6 py-4` with title + filter/export buttons | Sticky table header row |
| Entry layout | Full-width rows with icon + severity badge + row number + description + suggestion card | Table rows with status icon, text columns |
| Error suggestion | Highlighted card: `bg-surface-container-low border-primary border-l-2 p-4` with lightbulb icon + "Apply Fix" button | Inline dropdown "Did you mean:" |
| Warning entry | Descriptive text with "Ignore" and "Edit Row" action buttons | Inline text in Issues column |
| Severity badge | `bg-error-container/20 text-error rounded px-2 py-0.5 text-xs font-bold uppercase` for errors, `bg-[#fff3cd] text-[#8a6a2a]` for warnings | No severity badge styling |

**File**: `src/components/import/step-validate.tsx`
- **What**: Validation log is a data table instead of a rich entry list with suggestion cards
- **Expected**: Card-based log entries with: severity icon, colored badge (ERROR/WARNING), row number, descriptive text, and for errors a suggestion card with `bg-surface-container-low border-primary border-l-2` containing a lightbulb icon and "Apply Fix" button
- **Actual**: Plain table with columns for Row, Person, Project, Month, Hours, Status, Issues
- **Fix**: Restyle as a stacked entry list within a card container. Add severity badges, suggestion cards with primary left-border and lightbulb icon. Note: the built version is more functional (inline editing); keep the fix dropdown but wrap it in the creative-direction suggestion card styling.

### 4.3 Action Footer

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Layout | `border-t mt-12 py-6` with "Back to mapping" left + "Cancel Import" + "Import N rows" right | Simple flex with error count + "Next: Import" button |
| Back button | `text-primary` with arrow icon + "Back to mapping" | Generic "Back" in wizard footer |
| Import button | `bg-primary text-on-primary shadow-primary/20 px-8 py-2.5 font-bold shadow-lg` with row count + chevron icon | `bg-primary text-on-primary px-5 py-2 text-sm font-medium` |
| Cancel button | `border-outline-variant text-on-surface-variant px-6 py-2.5 font-semibold` | Not present in step |

**File**: `src/components/import/step-validate.tsx`
- **What**: Action buttons are minimal vs. creative direction's prominent footer
- **Expected**: Prominent import button with shadow, row count in text, cancel option
- **Actual**: Small "Next: Import" button
- **Fix**: Add row count to button text (e.g., "Import {ready} rows"), increase padding and add shadow, add cancel option

### 4.4 Contextual Alert Toast

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Toast overlay | `fixed right-8 bottom-8` dark overlay card with blur + info icon + dismiss | Not implemented |

**File**: Not implemented
- **What**: Missing bottom-right toast notification after validation completes
- **Expected**: `bg-inverse-surface text-inverse-on-surface` toast with info text and close button
- **Actual**: No toast notification
- **Fix**: Add toast component for validation completion message

---

## 5. BULK IMPORT MAPPING (05-bulk-import-mapping.html)

### Corresponding built files:
- `src/components/import/step-map.tsx`
- `src/components/import/wizard-stepper.tsx`

### 5.1 Step Progress Indicator

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Step circles | `h-8 w-8 rounded-full` with completed=dark bg + check, active=primary bg + number, future=gray bg + number with opacity-40 | `h-8 w-8 rounded-full` with similar logic | Close match |
| Step labels | `text-[10px] font-bold tracking-widest uppercase` | `text-xs font-medium` | Built is larger, less spaced |
| Connecting line | `h-[2px] w-12` with `bg-primary` completed / `bg-surface-container-highest` incomplete, `mb-6` to vertically center | `h-0.5 w-12 sm:w-20` | Similar height, different widths |
| Position | Right-aligned in header alongside breadcrumbs | Standalone nav above content | Different placement |

**File**: `src/components/import/wizard-stepper.tsx`
- **What**: Step labels are `text-xs font-medium` instead of `text-[10px] font-bold tracking-widest uppercase`
- **Expected**: `text-[10px] font-bold tracking-widest uppercase`
- **Actual**: `text-xs font-medium`
- **Fix**: Change label `span` className to include `text-[10px] font-bold tracking-widest uppercase`

### 5.2 Mapping Table

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Container | `bg-surface-container-lowest ring-outline-variant/15 rounded-sm ring-1` | `border-outline-variant rounded-md border` |
| Header row | `bg-surface-container-low grid grid-cols-12 px-6 py-3` with 3 columns (4+4+4) | HTML table with `bg-surface-container` header |
| Header labels | `text-outline text-xs font-semibold tracking-wider uppercase` | `text-on-surface-variant px-4 py-2.5 font-medium` |
| Header text | "Your Column (Source)" / "Maps To (System)" / "Data Preview" | "Source Column" / "Maps To" / "Sample Data" |
| Row layout | Grid-based with icons, `px-6 py-4`, hover states | Table rows with `px-4 py-2.5` |
| Select styling | Underline-style: `border-outline-variant border-b` (no full border) with custom arrow | Full border: `border-outline-variant border rounded-md` |
| Match status badge | `bg-secondary-container text-on-secondary-container rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tighter uppercase` with filled check_circle icon + "Matched" text | Small green CheckCircle2 icon only |
| Column icon | Material symbols icon per column type (list, category, schedule, calendar, corporate) | No column icons |
| Footer info | `bg-surface border-t p-4` info banner with filled info icon + explanatory text | Not present |
| Border radius | `rounded-sm` (2px) | `rounded-md` (6px) | Too rounded |

**File**: `src/components/import/step-map.tsx`
- **What**: Mapping table uses full-border selects instead of underline-style dropdowns
- **Expected**: `border-outline-variant border-b` only (underline style) with custom expand_more arrow
- **Actual**: `border-outline-variant border rounded-md px-2 py-1.5`
- **Fix**: Change select styling to bottom-border-only style

**File**: `src/components/import/step-map.tsx`
- **What**: Match status shown as plain green icon instead of styled badge
- **Expected**: Rounded pill badge: `bg-secondary-container text-on-secondary-container rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tighter uppercase` with check icon + "Matched" text
- **Actual**: Just `<CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />`
- **Fix**: Wrap in badge component with text label

**File**: `src/components/import/step-map.tsx`
- **What**: Missing footer info banner explaining auto-mapping
- **Expected**: `bg-surface border-outline-variant/10 border-t p-4` with filled info icon + text about auto-matching
- **Actual**: Not present
- **Fix**: Add info footer below the mapping table

**File**: `src/components/import/step-map.tsx`
- **What**: Missing column-type icons next to source column names
- **Expected**: Material symbol icons like `format_list_bulleted`, `category`, `schedule`, `calendar_month`, `corporate_fare`
- **Actual**: Plain text only
- **Fix**: Add appropriate Lucide icons based on detected column type

### 5.3 Action Buttons

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Back button | `text-primary` with arrow_back icon + "Back to Upload" | In wizard footer: bordered button with ArrowLeft icon + "Back" |
| Continue button | `bg-primary text-on-primary px-8 py-2.5 font-semibold shadow-sm` + arrow_forward icon + "Continue to Validation" | `bg-primary text-on-primary px-5 py-2 font-medium` + "Next: Validate" |
| Save as Draft | `bg-surface-variant text-on-surface-variant px-6 py-2.5` | Not implemented |

**File**: `src/components/import/step-map.tsx`
- **What**: "Next: Validate" button is smaller and lacks forward arrow icon
- **Expected**: `px-8 py-2.5 text-sm font-semibold shadow-sm` with arrow_forward icon
- **Actual**: `px-5 py-2 text-sm font-medium`
- **Fix**: Increase padding, add weight, add ChevronRight icon, rename to "Continue to Validation"

---

## 6. RESOURCE DATA EXPORT / FLAT TABLE (09-resource-data-export.html)

### Corresponding built files:
- `src/components/flat-table/flat-table.tsx`
- `src/components/flat-table/flat-table-filters.tsx`
- `src/components/flat-table/flat-table-columns.ts`
- `src/app/(app)/data/page.tsx`

### 6.1 Page Header

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Title | `text-3xl font-bold tracking-tight` | `text-3xl font-semibold tracking-tight` | Weight differs |
| Subtitle | "Review and filter detailed allocation data for engineering programs." | "View, filter, and export allocation data." | Different copy |
| Export button | `bg-primary text-on-primary flex items-center gap-2 rounded-sm px-5 py-2.5 text-xs font-semibold shadow-md` with download icon + "Export to Excel" | Dropdown button with `border-outline-variant` border, "Export" label | Completely different style |

**File**: `src/app/(app)/data/page.tsx`
- **What**: Title weight is `font-semibold` instead of `font-bold`
- **Expected**: `font-bold`
- **Actual**: `font-semibold`
- **Fix**: Change to `font-bold`

**File**: `src/components/flat-table/flat-table.tsx`
- **What**: Export button is a bordered dropdown instead of a prominent primary button
- **Expected**: `bg-primary text-on-primary rounded-sm px-5 py-2.5 text-xs font-semibold shadow-md` with download icon + "Export to Excel" text
- **Actual**: `border-outline-variant text-on-surface rounded-md border px-3 py-1.5 text-sm` with dropdown for format selection
- **Fix**: Make the primary export button use primary bg/color styling. Keep dropdown for format but make the main button prominent.

### 6.2 Filter Bar

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Container | `bg-surface-container-lowest border-outline-variant/10 rounded-sm border p-5 shadow-sm` card | No container - bare flex |
| Filter layout | 5 equal `flex-1 min-w-[140px]` columns with labels + selects inside a card | `flex-wrap gap-3` with individual flex-col items |
| Labels | `text-outline mb-1.5 block text-[10px] font-bold tracking-wider uppercase` | `text-on-surface-variant text-xs font-medium` |
| Select styling | `bg-surface-container-low rounded-sm border-none px-3 py-2 text-xs focus:ring-primary focus:ring-1` | `border-outline-variant bg-surface rounded-md border px-2 py-1.5 text-sm` |
| Reset button | Icon button `filter_list_off` Material symbol | Text link "Clear filters" |
| Filter fields | Person (select), Discipline (select), Dept (select), Project (select), Date Range (select) | Person (text input), Project (select), Department (select), From month (month input), To month (month input) |
| Border radius | `rounded-sm` (2px) | `rounded-md` (6px) | Too rounded |

**File**: `src/components/flat-table/flat-table-filters.tsx`
- **What**: Filter bar lacks card container, uses wrong label styling, and different input styles
- **Expected**: Card container with `bg-surface-container-lowest border-outline-variant/10 rounded-sm border p-5 shadow-sm`, labels `text-outline text-[10px] font-bold tracking-wider uppercase`, inputs `bg-surface-container-low rounded-sm border-none px-3 py-2 text-xs`
- **Actual**: Bare flex with `text-on-surface-variant text-xs font-medium` labels, bordered inputs `border-outline-variant bg-surface rounded-md`
- **Fix**: Wrap in card container, update label classes, change inputs to `bg-surface-container-low border-none rounded-sm`

**File**: `src/components/flat-table/flat-table-filters.tsx`
- **What**: Missing Discipline filter
- **Expected**: Discipline select filter (SW, Mek, Elnik)
- **Actual**: Not present
- **Fix**: Add discipline filter

### 6.3 Data Table

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Implementation | HTML table with custom styling | AG Grid |
| Container | `bg-surface-container-lowest border-outline-variant/10 rounded-sm border shadow-sm` | No container styling on AG Grid wrapper |
| Header | `bg-surface-container-low border-b` with `text-primary font-bold tracking-wider uppercase` + sort indicators | AG Grid default header |
| Header text color | `text-primary` | AG Grid default (neutral) |
| Discipline column | Styled badge: `bg-secondary-container text-on-secondary-fixed rounded-full px-2 py-0.5 text-[10px] font-bold uppercase` | Not present as column |
| Row hover | `hover:bg-surface-container-low/30` | AG Grid default hover |
| Cell padding | `px-6 py-3.5` | AG Grid default padding |
| Person column | `font-medium` | Default AG Grid text |
| Hours column | `text-right font-bold tabular-nums` | `tabular-nums text-right` (no bold) |
| Footer stats | `text-outline text-[11px] font-bold tracking-wider uppercase` showing item count + total hours | Pagination component only |

**File**: `src/components/flat-table/flat-table-columns.ts`
- **What**: Missing Discipline column with badge cell renderer
- **Expected**: Discipline column between Person and Department with badge rendering
- **Actual**: Column not defined
- **Fix**: Add discipline column with custom cell renderer for badge styling

**File**: `src/components/flat-table/flat-table-columns.ts`
- **What**: Hours column missing `font-bold`
- **Expected**: `cellClass: 'tabular-nums text-right font-bold'`
- **Actual**: `cellClass: 'tabular-nums text-right'`
- **Fix**: Add `font-bold` to cellClass

**File**: `src/components/flat-table/flat-table.tsx`
- **What**: Missing footer stats bar showing "Showing X of Y items" and "Total Estimated Hours: Z"
- **Expected**: `text-outline text-[11px] font-bold tracking-wider uppercase` bar below table
- **Actual**: Only pagination component
- **Fix**: Add summary stats bar between table and pagination

**File**: `src/components/flat-table/flat-table.tsx`
- **What**: AG Grid wrapper lacks creative-direction container styling
- **Expected**: `bg-surface-container-lowest border-outline-variant/10 rounded-sm border shadow-sm overflow-hidden`
- **Actual**: Plain `div` with `style={{ height: '600px' }}`
- **Fix**: Add container styling to the wrapper div

---

## 7. TOP NAVIGATION BAR

### Corresponding built file:
- `src/components/layout/top-nav.tsx`

### 7.1 Comparison

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Position | `fixed top-0` or `sticky top-0` | `sticky top-0` | Match |
| Height | Implicit ~57px (py-3 + content) | `h-14` (56px) | Close |
| Background | `bg-[#f8fafb]` with `border-b border-[#a9b4b7]/15` | `bg-surface border-b border-outline-variant/15` | Close (depends on token) |
| Brand text | `text-xl font-semibold tracking-tighter text-[#496173]` as plain text | `text-2xl font-semibold tracking-tighter text-primary` as Link | Built is larger (2xl vs xl) |
| Nav font | `font-['Manrope'] text-sm font-medium tracking-tight` | `font-headline text-sm tracking-tight` with Lucide icons | Icons added (not in creative direction) |
| Active nav item | `border-b-2 border-[#496173] pb-1 font-bold text-[#496173]` | `border-b-2 border-primary text-primary font-semibold` + icon | Close, but bold vs semibold |
| Inactive nav item | `text-slate-500 hover:text-[#496173]` | `text-on-surface-variant hover:text-primary border-transparent` | Different color tokens |
| Nav links | Input, Team, Projects, Data, Dashboard (5 items) | Input, Team, Projects, Data, Dashboard, Admin, Members (7 items) | Extra admin items (expected for app) |
| Search bar | `bg-surface-container-low w-64 rounded-sm border-none py-1.5 text-xs` with search icon | Same dimensions and styling | **Match** |
| Notification icon | Material Symbol `notifications` in rounded-full p-2 button | Lucide `Bell` size 18 | Different icon system |
| Settings icon | Material Symbol `settings` in rounded-full p-2 button | Lucide `Settings` size 18 | Different icon system |
| User avatar | `h-8 w-8 rounded-full` img | Clerk `UserButton` component | Different implementation |
| Global search | Hidden on small with `hidden sm:block` | `hidden md:block` | Different breakpoint |

**File**: `src/components/layout/top-nav.tsx`
- **What**: Brand text is `text-2xl` instead of `text-xl`
- **Expected**: `text-xl font-semibold tracking-tighter`
- **Actual**: `text-2xl font-semibold tracking-tighter`
- **Fix**: Change `text-2xl` to `text-xl`

**File**: `src/components/layout/top-nav.tsx`
- **What**: Nav items include Lucide icons which are not in the creative direction
- **Expected**: Text-only nav links in Manrope font
- **Actual**: Icon + text for each nav item
- **Fix**: Consider removing icons from desktop nav (keep for mobile drawer). Creative direction shows text-only top nav with icons only in the side navigation.

**File**: `src/components/layout/top-nav.tsx`
- **What**: Active nav font-weight is `font-semibold` instead of `font-bold`
- **Expected**: `font-bold`
- **Actual**: `font-semibold`
- **Fix**: Change to `font-bold`

---

## 8. STEP UPLOAD (Creative Direction implied from 03/05 flow)

### Corresponding built file:
- `src/components/import/step-upload.tsx`

The upload step is not directly shown in the creative direction HTML files as a standalone screen, but the mapping and validation screens imply a file upload zone as Step 1.

| Aspect | Creative Direction (implied) | Built Code |
|---|---|---|
| Drop zone border | Should use design system border radius `rounded-sm` (2px) | `rounded-md` (6px) |
| Drop zone border style | `border-outline-variant` dashed | `border-outline-variant` dashed | **Match** |
| Button styling | Should use `rounded-sm` | `rounded-md` | Wrong radius |
| Error container | Should use design system tokens | Uses `bg-error-container text-on-error-container rounded-md` | Radius should be `rounded-sm` |

**File**: `src/components/import/step-upload.tsx`
- **What**: Multiple elements use `rounded-md` instead of `rounded-sm`
- **Expected**: `rounded-sm` (2px) per the creative direction border radius system
- **Actual**: `rounded-md` (and `rounded-md` is 6px in built)
- **Fix**: Change all `rounded-md` to `rounded-sm` throughout the component

---

## 9. APP SHELL / LAYOUT STRUCTURE

### Corresponding built file:
- `src/components/layout/app-shell.tsx`

| Aspect | Creative Direction | Built Code |
|---|---|---|
| Side nav width | `w-64` (256px) | `w-64` via SideNav (but `lg:ml-64` on main) | **Match** |
| Side nav position | `fixed` | `hidden lg:block` (static, not fixed) | Different positioning model |
| Main content offset | `ml-64` from sidebar | `lg:ml-64` on main | **Match** on desktop |
| Content max-width | `max-w-[1440px]` | No max-width constraint | Content stretches on wide screens |
| Content padding | `p-8` | `px-4 py-6 sm:px-6 lg:px-8` | Less vertical padding on desktop |

**File**: `src/components/layout/app-shell.tsx`
- **What**: No max-width constraint on main content
- **Expected**: `max-w-[1440px] mx-auto` on the content area
- **Actual**: No max-width
- **Fix**: Add `max-w-[1440px] mx-auto` to the main content wrapper

**File**: `src/components/layout/app-shell.tsx`
- **What**: Content padding is responsive but smaller than creative direction
- **Expected**: `p-8` (32px all sides)
- **Actual**: `px-4 py-6 sm:px-6 lg:px-8` (asymmetric, smaller vertical)
- **Fix**: Change to `p-4 sm:p-6 lg:p-8` for consistent scaling up to creative-direction padding

---

## 10. SYSTEMATIC ISSUES ACROSS ALL COMPONENTS

### 10.1 Border Radius Inconsistency
Almost every built component uses `rounded-md` (6px) where the creative direction specifies `rounded-sm` (2px). This is a pervasive issue affecting:
- Import components (step-upload, step-map, step-validate, wizard-stepper)
- Flat table components (filters, export dropdown)
- Data page buttons and links
- Project selector in input page

The creative direction explicitly specifies tight border radii as part of the "Spreadsheet-Familiar, Not Spreadsheet-Ugly" aesthetic principle. The built code's larger radii give it a more generic SaaS look.

### 10.2 Icon System Mismatch
The creative direction uses **Material Symbols Outlined** icons throughout. The built code uses **Lucide React** icons. While functionally equivalent, the visual weight and style differ noticeably. This is a deliberate trade-off (Lucide is lighter-weight and tree-shakeable), but creates a visual gap.

### 10.3 Missing `font-label` Usage
The creative direction defines a `label` font family (Inter) and uses `font-label` class for form labels, table headers, and small UI text. The built code rarely uses this class, defaulting to implicit font inheritance.

### 10.4 `text-outline` Usage
The creative direction extensively uses `text-outline` (maps to `#727d80`) for subdued labels, breadcrumbs, and metadata text. The built code more commonly uses `text-on-surface-variant`, which maps to a different color (`#43474e` vs `#566164` in creative direction). This subtle but pervasive difference affects the overall visual tone.

---

## PRIORITY RANKING

### P0 - Critical (changes the overall feel)
1. **globals.css color token alignment** - `on-surface`, `on-surface-variant`, `surface`, `outline-variant`, `error` all differ
2. **Missing color tokens** - ~30 tokens from creative direction not in globals.css
3. **Border radius system** - `rounded-md` should be `rounded-sm` across all components
4. **Content max-width** - No `max-w-[1440px]` causes layout to stretch on wide screens

### P1 - High (specific component gaps)
5. **Person header** - Missing discipline badges, wrong target hours layout
6. **Flat table filter bar** - Missing card container, wrong input styling
7. **Validation summary cards** - Flat colored boxes vs. white cards with colored borders
8. **Export button styling** - Bordered dropdown vs. prominent primary button
9. **TopNav brand size** - `text-2xl` should be `text-xl`

### P2 - Medium (visual polish)
10. **Grid container styling** - Missing white bg, border, shadow
11. **Grid column widths** - 200px/90px vs. 256px/100px
12. **Current month highlight** - Ring vs. background tint
13. **Mapping table select styling** - Full border vs. underline
14. **Match status badges** - Icon-only vs. labeled pill badge
15. **Wizard step labels** - Wrong size/weight/spacing
16. **Missing sidebar footer** - No "New Entry" button or Help/Archive links

### P3 - Low (nice-to-have)
17. **Missing analytics bento grid** below allocation grid
18. **Missing toast notifications**
19. **Missing footer status legend** on input page
20. **Column icons** in mapping table
21. **Footer stats bar** on flat table
22. **Icon system** (Lucide vs Material Symbols - architectural decision)
