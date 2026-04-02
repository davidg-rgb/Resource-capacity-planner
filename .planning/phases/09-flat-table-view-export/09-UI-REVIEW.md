# Phase 9 -- UI Review (Post-Fix Verification)

**Audited:** 2026-03-29
**Baseline:** creative-direction/09-resource-data-export.html (Stitch prototype)
**Screenshots:** Not captured (code-only audit)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All labels, headings, and filter placeholders match spec exactly |
| 2. Visuals | 3/4 | Discipline badge rendering correct; export button placement differs from spec |
| 3. Color | 4/4 | All design tokens used correctly, no hardcoded colors |
| 4. Typography | 4/4 | Font sizes, weights, and tracking match spec |
| 5. Spacing | 4/4 | Padding, gap, and margin classes match spec |
| 6. Experience Design | 3/4 | Loading/empty states present; export missing Discipline column |

**Overall: 22/24**

---

## Top 3 Priority Fixes

1. **Excel export omits Discipline column** -- Users exporting data lose the discipline field they can see in the table -- Add `'Discipline'` to export headers array and `r.discipline` to export data rows in `allocation.service.ts` lines 313-322
2. **Export button position differs from spec** -- Spec places Export button in the page header next to the title; implementation places it next to the filter bar -- Move the export `<a>` tag into the header `<div>` in `data/page.tsx` alongside the title/subtitle block
3. **No monthTo filter UI exposed** -- Spec shows a single "Date Range" dropdown (Q3, Q4, Full Year); implementation only exposes monthFrom as a date input with no monthTo -- Consider adding a second month input or a preset quarter selector to match spec intent

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

All copy matches spec:
- Page title: "Resource Data Export" -- MATCH (`data/page.tsx:13`)
- Subtitle: "Review and filter detailed allocation data for engineering programs." -- MATCH (`data/page.tsx:16`)
- Export button: "Export to Excel" -- MATCH (`flat-table.tsx:81`)
- Filter labels: Person, Discipline, Dept, Project, Date Range -- MATCH (`flat-table-filters.tsx`)
- Placeholder text: "All Personnel", "All Disciplines", etc. -- MATCH
- Footer stats: "Total Estimated Hours:" -- MATCH (`flat-table-pagination.tsx:80`)
- Empty state: "No allocations found. Try adjusting your filters." -- Good UX copy (`flat-table.tsx:101`)

### Pillar 2: Visuals (3/4)

Discipline badge:
- `flat-table-columns.ts:22-24` uses DOM-based cellRenderer creating a `<span>` with classes `bg-secondary-container text-on-secondary-fixed rounded-full px-2 py-0.5 text-[10px] font-bold uppercase` -- Exact match to spec prototype badge styling.
- DOM element return is valid for AG Grid cellRenderer (not React component renderer) -- CORRECT approach.

Export button placement:
- Spec: Button sits in the header section, right-aligned next to the page title.
- Implementation: Button sits next to the filter bar in `flat-table.tsx:75-83`.
- Minor visual deviation but functionally equivalent.

Column headers:
- Spec columns: Person, Discipline, Department, Project, Month, Hours
- Implementation columns: Person, Discipline, Department, Project, Program, Month, Hours
- Extra "Program" column is additive (not a gap), comes from the programs JOIN.

### Pillar 3: Color (4/4)

All color usage via design tokens:
- `bg-primary`, `text-on-primary` on export button -- CORRECT
- `bg-surface-container-lowest` on filter bar and table container -- CORRECT
- `text-outline` on filter labels and footer -- CORRECT
- `bg-secondary-container text-on-secondary-fixed` on discipline badge -- CORRECT
- `border-outline-variant/10` on container borders -- CORRECT
- No hardcoded hex colors found in any component file.

### Pillar 4: Typography (4/4)

- Page title: `text-3xl font-bold tracking-tight font-headline` -- MATCH
- Subtitle: `text-sm text-on-surface-variant font-body` -- MATCH
- Filter labels: `text-[10px] font-bold tracking-wider uppercase` -- MATCH
- Table text: `text-xs` via AG Grid default sizing -- MATCH
- Footer stats: `text-[11px] font-bold tracking-wider uppercase` -- MATCH
- Hours column: `tabular-nums font-bold` -- MATCH

### Pillar 5: Spacing (4/4)

- Header margin: `mb-8` -- MATCH
- Filter bar: `p-5 gap-4` -- MATCH
- Filter inputs: `min-w-[140px] flex-1` -- MATCH
- Table container: `rounded-sm border shadow-sm` -- MATCH
- Footer: `mt-4 px-2` -- MATCH
- All spacing values from the Tailwind scale, no arbitrary values.

### Pillar 6: Experience Design (3/4)

State coverage:
- Loading state: Suspense fallback "Loading allocations..." (`data/page.tsx:27`) + AG Grid `loading={isLoading}` (`flat-table.tsx:100`) -- GOOD
- Empty state: `overlayNoRowsTemplate` with helpful message (`flat-table.tsx:101`) -- GOOD
- Error handling: `handleApiError` in both API routes, React Query error propagation -- GOOD
- Pagination: Full prev/next/page-size controls with disabled states -- EXCEEDS spec

Functional gap:
- **Export missing Discipline column**: `exportAllocationsFlat` at `allocation.service.ts:313` defines headers as `['Person Name', 'Department', 'Project Name', 'Program', 'Month', 'Hours']`. The `Discipline` field is available on each row (since `listAllocationsFlat` returns it) but is not included in the export data mapping at line 316. Users see discipline in the table but it disappears in the exported file.

Data layer verification:
- SQL JOIN chain: allocations -> people -> departments, disciplines, projects -> programs -- ALL CORRECT
- `disciplines.abbreviation` selected as `discipline` field -- CORRECT
- `disciplineId` filter applied via `eq(schema.people.disciplineId, filters.disciplineId)` -- CORRECT
- Count and sum queries include all necessary JOINs for filter consistency -- CORRECT
- `totalHours` computed via `COALESCE(SUM(...), 0)` preventing null -- CORRECT

---

## Functional Gap: Export Discipline Column

**File:** `src/features/allocations/allocation.service.ts`
**Lines:** 313-322

Current:
```typescript
const headers = ['Person Name', 'Department', 'Project Name', 'Program', 'Month', 'Hours'];
const data = [
  headers,
  ...rows.map((r) => [
    r.personName,
    r.departmentName,
    r.projectName,
    r.programName ?? '',
    r.month,
    r.hours,
  ]),
];
```

Should be:
```typescript
const headers = ['Person Name', 'Discipline', 'Department', 'Project Name', 'Program', 'Month', 'Hours'];
const data = [
  headers,
  ...rows.map((r) => [
    r.personName,
    r.discipline,
    r.departmentName,
    r.projectName,
    r.programName ?? '',
    r.month,
    r.hours,
  ]),
];
```

Also update `ws['!cols']` to include a column width for Discipline:
```typescript
ws['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 8 }];
```

---

## Files Audited

- `src/app/(app)/data/page.tsx`
- `src/components/flat-table/flat-table.tsx`
- `src/components/flat-table/flat-table-filters.tsx`
- `src/components/flat-table/flat-table-columns.ts`
- `src/components/flat-table/flat-table-pagination.tsx`
- `src/features/allocations/allocation.types.ts`
- `src/features/allocations/allocation.service.ts`
- `src/app/api/allocations/flat/route.ts`
- `src/app/api/allocations/export/route.ts`
- `src/hooks/use-flat-allocations.ts`
- `src/db/schema.ts` (disciplines table, people.disciplineId reference)
- `creative-direction/09-resource-data-export.html` (spec prototype)
