# Bulk Import Flow -- UI Review

**Audited:** 2026-03-29
**Baseline:** creative-direction/03-bulk-import-validation.html, creative-direction/05-bulk-import-mapping.html
**Screenshots:** Not captured (code-only audit)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Generic button labels ("Next: Validate", "Back") vs spec's contextual copy |
| 2. Visuals | 1/4 | Validation view uses a data table instead of spec's rich issue log cards |
| 3. Color | 2/4 | Uses Tailwind green/amber/red instead of design system tokens for status colors |
| 4. Typography | 2/4 | Missing Manrope headline font on headings, missing tabular-nums on counters |
| 5. Spacing | 2/4 | Compressed spacing (space-y-4) vs spec's generous mb-10 rhythm |
| 6. Experience Design | 3/4 | Good state coverage (loading, error, empty, fuzzy fix) but missing toast overlay |

**Overall: 12/24**

---

## Top 3 Priority Fixes

1. **Validation view is a data table, spec shows a card-based issue log** -- Users cannot scan issues quickly in a dense table; the spec uses rich cards with icons, suggestion boxes, and per-row actions -- Rebuild StepValidate to use the card-based layout from 03-bulk-import-validation.html
2. **Mapping view missing file info header, breadcrumbs, and step progress indicator** -- Users lack context about what file they are mapping and where they are in the flow -- Add file info bar (filename + row count badge) to StepMap header area, wire breadcrumbs to show "Data Management > Bulk Import"
3. **Status colors use Tailwind defaults instead of design tokens** -- Inconsistent with design system; green-600/700, amber-500/700, red-600/700 should use spec's #d1a03e for warnings and `text-error`/`border-error` for errors -- Replace all hardcoded Tailwind status colors with design token classes

---

## Detailed Findings

---

### VIEW 1: Column Mapping (05-bulk-import-mapping.html vs step-map.tsx)

#### MATCHES

1. **Grid-based column layout**: Both spec and implementation use a table with "Source Column", "Maps To", and "Sample Data / Preview" columns
2. **Select dropdown for target field**: Both use a `<select>` element with bottom-border-only styling
3. **"Matched" badge**: Both show a green pill badge with checkmark icon and "Matched" text using `bg-secondary-container text-on-secondary-container rounded-full` styling
4. **Auto-detection indicator**: Both note when columns were auto-detected
5. **Design token colors**: Both use `bg-surface-container-lowest`, `bg-surface-container-low`, `text-outline`, `text-on-surface`, `text-on-surface-variant` correctly

#### DISCREPANCIES

| # | Aspect | Spec Shows | Code Does | File:Line |
|---|--------|-----------|-----------|-----------|
| M1 | **Page heading** | `text-3xl font-semibold` "Column Mapping" with Manrope | `text-2xl` "Import Data" in import-wizard.tsx, not specific to mapping step | `import-wizard.tsx:211` |
| M2 | **Breadcrumbs** | "Data Management > Bulk Import" with chevron_right icon, `text-outline text-xs font-medium` | Generic pathname-based breadcrumbs showing "data / import" with "/" separator | `breadcrumbs.tsx:10-18` |
| M3 | **File info bar** | Shows file icon + "Allocation_Data_Q1_2026.xlsx" + "1,200 rows" badge (`bg-surface-container-high text-outline rounded px-1.5 py-0.5 text-xs`) | No file info displayed on mapping step at all | `step-map.tsx` (missing entirely) |
| M4 | **Step progress indicator** | Horizontal stepper with circles (completed=check, active=number with `bg-primary`, future=gray with opacity-40), connecting lines (`h-[2px] w-12`), and uppercase 10px labels below | Stepper exists but: uses `bg-surface-container` for future steps instead of `bg-surface-container-highest`, no `opacity-40` on future steps, line is `h-0.5` which is correct, uses `text-on-surface-variant` for future labels instead of `text-outline` | `wizard-stepper.tsx:33-48` |
| M5 | **Stepper connecting line color (completed)** | `bg-primary` for completed segments | `bg-primary` for completed -- MATCHES. But uses `bg-outline-variant` for incomplete instead of spec's `bg-surface-container-highest` | `wizard-stepper.tsx:55` |
| M6 | **Step labels** | "Upload", "Mapping", "Validate", "Import" -- uses `text-[10px] font-bold tracking-widest uppercase` | Labels are "Upload", "Map", "Validate", "Import" -- "Map" instead of "Mapping" | `wizard-stepper.tsx:8` |
| M7 | **Mapping table header** | `grid grid-cols-12` with `bg-surface-container-low border-b`, column headers "Your Column (Source)", "Maps To (System)", "Data Preview" | Uses `<table>` with `bg-surface-container` header, column headers "Source Column", "Maps To", "Sample Data" | `step-map.tsx:82-90` |
| M8 | **Mapping table header text style** | `text-outline text-xs font-semibold tracking-wider uppercase` | `text-on-surface-variant px-4 py-2.5 text-left font-medium` -- wrong color token, not uppercase, not semibold, no tracking | `step-map.tsx:83-89` |
| M9 | **Source column icons** | Each row has a Material Symbols icon (format_list_bulleted, category, schedule, calendar_month, corporate_fare) | No icons at all next to source column names | `step-map.tsx:104-105` |
| M10 | **Select styling** | `border-b` only (no other borders), `bg-surface-container-lowest`, full width with `appearance-none` and custom expand_more icon | Has `border-b` only styling but uses `bg-transparent`, custom classes differ, and uses native browser dropdown arrow (no custom icon) | `step-map.tsx:117-120` |
| M11 | **Data preview text** | `text-on-surface-variant text-xs italic` for preview values like "Andersson, Erik..." | `text-on-surface-variant px-4 py-2.5 text-xs` -- missing `italic` on preview text | `step-map.tsx:137` |
| M12 | **Mapping card container** | `bg-surface-container-lowest ring-outline-variant/15 ring-1 rounded-sm` | `border-outline-variant rounded-sm border` -- uses border instead of ring, missing lowest background | `step-map.tsx:79` |
| M13 | **Footer info bar** | Blue info icon (filled, `text-primary`) + explanatory text about auto-matching in `bg-surface border-t p-4` | No info bar exists in mapping step | `step-map.tsx` (missing entirely) |
| M14 | **Action buttons layout** | "Back to Upload" (left, text+icon, `text-primary`), "Save as Draft" (center-right, `bg-surface-variant`), "Continue to Validation" (right, `bg-primary text-on-primary` with arrow_forward icon) | Only "Next: Validate" button on right, no "Save as Draft", no "Back to Upload" in mapping step (back is in parent wizard as generic "Back") | `step-map.tsx:158-167` |
| M15 | **Primary CTA text** | "Continue to Validation" with arrow_forward icon | "Next: Validate" with no icon | `step-map.tsx:164` |
| M16 | **Back button style** | `text-primary hover:bg-surface-container-high flex items-center gap-2 rounded-sm px-6 py-2.5 text-sm font-semibold` with arrow_back icon | Generic bordered button: `border-outline-variant text-on-surface hover:bg-surface-container rounded-md border px-4 py-2 text-sm font-medium` with Lucide ArrowLeft | `import-wizard.tsx:265-269` |
| M17 | **Table row hover** | `hover:bg-surface-container-low/50` | No row hover effect on table rows | `step-map.tsx:99` -- has it but via class on `<tr>`, though the opacity was set via className |
| M18 | **Missing "Save as Draft" button** | Spec has a secondary action `bg-surface-variant text-on-surface-variant` | Not implemented | `step-map.tsx` (missing) |
| M19 | **Action footer spacing** | `mt-12` gap between card and actions | `flex justify-end` with no top margin beyond `space-y-4` parent | `step-map.tsx:158` |
| M20 | **Mapping row dividers** | `divide-outline-variant/5 divide-y` (very subtle) | `border-outline-variant border-t` (full opacity, heavier) | `step-map.tsx:99` |

---

### VIEW 2: Bulk Import Validation (03-bulk-import-validation.html vs step-validate.tsx)

#### MATCHES

1. **Three summary cards** at top with border-left accent color
2. **"Ready" card** uses `border-primary` left border
3. **"Errors" card** uses `border-error` left border
4. **Summary card label style**: `text-outline text-xs font-semibold tracking-wider uppercase`
5. **Large number display**: `text-4xl font-bold tabular-nums`
6. **Card background**: `bg-surface-container-lowest`

#### DISCREPANCIES

| # | Aspect | Spec Shows | Code Does | File:Line |
|---|--------|-----------|-----------|-----------|
| V1 | **Page heading** | "Bulk Import Validation" `text-2xl font-semibold tracking-tight` with subtitle "Step 3 of 4: Reviewing data integrity and mapping accuracy." | No per-step heading; parent shows "Import Data" for all steps | `import-wizard.tsx:211` |
| V2 | **Phase badge** | `bg-primary-container text-primary rounded-full px-3 py-1 text-xs font-semibold` showing "Phase: Verification" | No phase badge | `step-validate.tsx` (missing) |
| V3 | **Summary card layout** | `grid-cols-3 gap-6` with `rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow` | `grid-cols-3 gap-3` with `rounded-sm p-6 shadow-sm` -- smaller gap, rounded-sm instead of rounded-lg, no hover shadow transition | `step-validate.tsx:162-163` |
| V4 | **Summary card icons** | Each card has a Material Symbols icon (check_circle, warning, error) at `text-3xl opacity-50` top-right | No icons on summary cards | `step-validate.tsx:163-174` |
| V5 | **Summary card "Ready" label** | "Ready to Process" | "Ready" | `step-validate.tsx:164` |
| V6 | **Summary card sublabel** | "Rows validated successfully" under the number | No sublabel text | `step-validate.tsx:165` |
| V7 | **Summary card number colors** | Ready: `text-primary`, Warnings: `text-[#d1a03e]`, Errors: `text-error` | Ready: `text-green-700`, Warnings: `text-amber-700`, Errors: `text-red-700` | `step-validate.tsx:165,169,173` |
| V8 | **Warnings border color** | `border-left-color: #d1a03e` (inline style, amber/gold) | `border-amber-500` (Tailwind default amber) | `step-validate.tsx:167` |
| V9 | **Warnings number color** | `text-[#d1a03e]` | `text-amber-700` | `step-validate.tsx:169` |
| V10 | **Validation log structure** | Card-based issue log with: header bar ("Validation Log" title + "Filter: Errors Only" + "Export Log" buttons), then card entries per issue with icon + badge + row number + description + suggestion box | Tabular data table with columns: Row, Person, Project, Month, Hours, Status, Issues | `step-validate.tsx:196-284` |
| V11 | **Error entry layout** | Full-width card with: error icon left, badge ("ERROR" in red), row number, description text, and a **suggestion box** (`bg-surface-container-low border-primary border-l-2 rounded-sm p-4`) with lightbulb icon and "Apply Fix" button | Table row with inline fuzzy dropdown; no suggestion styling, no lightbulb icon, no "Apply Fix" button style | `step-validate.tsx:218-224` |
| V12 | **Warning entry layout** | Full-width card with: warning icon left, badge ("WARNING" in amber), row number, description, detail text, and right-aligned "Ignore" / "Edit Row" action buttons | Table row with error/warning text in Issues column; no per-row actions | `step-validate.tsx:263-271` |
| V13 | **Filter buttons** | `bg-surface-container-highest text-on-surface-variant hover:bg-surface-dim rounded-sm px-3 py-1 text-xs font-medium` styled as pill buttons | Tab-style underline buttons at full border-b width | `step-validate.tsx:178-193` |
| V14 | **"Export Log" button** | Present in spec header bar | Not implemented | `step-validate.tsx` (missing) |
| V15 | **Validation log header** | `bg-surface-container-low border-b px-6 py-4` with `font-headline font-semibold` title | No section header; tabs are inline | `step-validate.tsx:178` |
| V16 | **Additional notifications row** | "28 additional notifications (Filtered for brevity)" in `text-outline bg-surface/50 text-center text-xs italic` | Scrollable table showing all rows; empty state shows "No rows match this filter." | `step-validate.tsx:275-280` |
| V17 | **Action footer** | Full-width `border-t mt-12 py-6` with: "Back to mapping" button (left, with arrow_back icon), "Cancel Import" (center-right, bordered), "Import 820 rows, skip errors" (right, `bg-primary shadow-lg` with chevron_right icon) | Simple `flex items-center justify-between` with error count message left and "Next: Import" right | `step-validate.tsx:287-304` |
| V18 | **Primary CTA text** | "Import 820 rows, skip errors" (dynamic count, descriptive action) | "Next: Import" (generic) | `step-validate.tsx:300` |
| V19 | **"Cancel Import" button** | `border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-sm border px-6 py-2.5 font-semibold` | Not implemented | `step-validate.tsx` (missing) |
| V20 | **Back button text** | "Back to mapping" with arrow_back icon, `text-primary font-semibold` | Generic "Back" in parent wizard | `import-wizard.tsx:269` |
| V21 | **Contextual toast overlay** | Fixed bottom-right toast: `bg-inverse-surface text-inverse-on-surface` with backdrop blur, info icon, "Validation complete." message, close button | Not implemented | `step-validate.tsx` (missing) |
| V22 | **Summary card width** | `gap-6 md:grid-cols-3` responsive grid with `mb-10` below | `gap-3 grid-cols-3` non-responsive, only `space-y-4` separation from parent | `step-validate.tsx:162` |
| V23 | **Table max-height** | Not in spec (uses cards, not table) | `max-h-[400px] overflow-auto` -- arbitrary pixel constraint | `step-validate.tsx:196` |
| V24 | **Suggestion box styling** | `bg-surface-container-low border-primary mt-4 border-l-2 rounded-sm p-4` with lightbulb icon + "Apply Fix" text button | Inline `<select>` dropdown with "Did you mean:" label, no visual card treatment | `step-validate.tsx:132-149` |
| V25 | **Error badge style** | `text-error bg-error-container/20 rounded px-2 py-0.5 text-xs font-bold uppercase` | No badge; errors shown as plain `text-error text-xs` text | `step-validate.tsx:265` |
| V26 | **Warning badge style** | `rounded bg-[#fff3cd] px-2 py-0.5 text-xs font-bold text-[#8a6a2a] uppercase` | No badge; warnings shown as plain `text-xs text-amber-600` text | `step-validate.tsx:269` |
| V27 | **Row number display** | `text-outline text-xs font-medium tabular-nums` as inline span next to badge | Table cell `text-on-surface-variant tabular-nums` | `step-validate.tsx:215` |

---

### CROSS-CUTTING DISCREPANCIES (Both Views)

| # | Aspect | Spec Shows | Code Does | File:Line |
|---|--------|-----------|-----------|-----------|
| X1 | **Icon library** | Material Symbols Outlined throughout (check_circle, warning, error, arrow_back, chevron_right, lightbulb, info, etc.) | Lucide React icons throughout (CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Check, Loader2, etc.) | All component files |
| X2 | **Font family on headings** | `font-headline` (Manrope) on all headings and section titles | Only `font-headline` on main "Import Data" h1; step-level headings and section titles use default Inter | `step-validate.tsx`, `step-map.tsx` (throughout) |
| X3 | **Border radius** | Spec uses `rounded-lg` on cards, `rounded-sm` on buttons/inputs | Code uses `rounded-sm` everywhere (cards and buttons alike) | Multiple files |
| X4 | **Button border-radius** | Spec uses `rounded-sm` (2px) on all buttons | Code mixes `rounded-sm` and `rounded-md` on buttons | `import-wizard.tsx:267`, `step-import.tsx:38,89,109,115` |
| X5 | **Shadow on primary CTA** | Spec: `shadow-lg shadow-primary/20` on main action button | Code: no shadow on primary buttons | `step-map.tsx:162`, `step-validate.tsx:300` |
| X6 | **Content max-width** | Spec validation: `max-w-6xl`, Spec mapping: `max-w-5xl` | Code: `max-w-5xl` for all steps | `import-wizard.tsx:210` |
| X7 | **Content padding/spacing rhythm** | Spec uses `mb-10` between major sections, `p-8` canvas padding | Code uses `space-y-4` between sections, much tighter | `step-validate.tsx:160`, `step-map.tsx:73` |
| X8 | **Stepper future step opacity** | Spec: `opacity-40` on future steps | Code: no opacity on future steps | `wizard-stepper.tsx:33-48` |
| X9 | **Stepper current step border** | Spec: `border-primary border-2` ring on current step circle | Code: no border ring on current step, just solid `bg-primary` | `wizard-stepper.tsx:35-36` |
| X10 | **Stepper completed step circle** | Spec: `bg-on-secondary-container` (dark) with white check | Code: `bg-primary` with white check -- different color token | `wizard-stepper.tsx:35` |

---

## Files Audited

- `src/components/import/step-map.tsx` -- Column mapping view
- `src/components/import/step-validate.tsx` -- Validation view
- `src/components/import/import-wizard.tsx` -- Wizard container
- `src/components/import/wizard-stepper.tsx` -- Step progress indicator
- `src/components/import/step-upload.tsx` -- Upload step
- `src/components/import/step-import.tsx` -- Import execution step
- `src/components/layout/breadcrumbs.tsx` -- Breadcrumb navigation
- `src/app/(app)/data/import/page.tsx` -- Route page
- `src/app/globals.css` -- Design tokens
- `creative-direction/03-bulk-import-validation.html` -- Validation spec
- `creative-direction/05-bulk-import-mapping.html` -- Mapping spec
