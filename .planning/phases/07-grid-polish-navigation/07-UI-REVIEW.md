# Phase 7 — UI Review (Post-Fix Verification)

**Audited:** 2026-03-29
**Baseline:** creative-direction/04-person-input-form.html, creative-direction/08-person-input-sidebar.html
**Screenshots:** not captured (no dev server)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All labels match spec; empty/error states present |
| 2. Visuals | 3/4 | Analytics bento grid uses equal thirds instead of spec's 4/5/3 column split |
| 3. Color | 3/4 | Status dot colors correct; no "CURRENT" month header treatment |
| 4. Typography | 4/4 | Font families, sizes, weights match spec |
| 5. Spacing | 4/4 | Spacing classes consistent with spec |
| 6. Experience Design | 3/4 | Loading/error/empty states present; status threshold at 100% conflicts with visual spec |

**Overall: 21/24**

---

## Top 3 Priority Fixes

1. **Analytics bento grid column proportions** — Spec uses 4/5/3 column split (grid-cols-12 with col-span-4, col-span-5, col-span-3) but code uses equal `md:grid-cols-3` — the Capacity Insight card should be narrower and the Project Distribution card wider. **Fix:** Change PersonAnalytics outer div to `grid grid-cols-12 gap-6` and apply `col-span-12 md:col-span-4`, `col-span-12 md:col-span-5`, `col-span-12 md:col-span-3` to the three cards respectively.

2. **Missing "CURRENT" month header indicator** — Spec shows a `<span class="text-primary/60 text-[9px] font-medium">CURRENT</span>` sub-label beneath the current month's header text. AG Grid's built-in headerName only renders a single string. **Fix:** Add a custom `headerComponent` to the current-month column definition in `grid-config.ts` that renders the month string plus a small "CURRENT" label below it.

3. **Status threshold at exactly 100%** — The visual spec (04-person-input-form.html) treats SUMMA=Target (100%) as green/healthy, but `calculateStatus()` in `capacity.ts` returns `'overloaded'` for ratio >= 1.0. ARCHITECTURE.md defines >= 100% as overloaded, creating a spec conflict. **Fix:** Decide authoritative source. If the creative direction is correct, change threshold to `ratio > 1.0` for overloaded (strictly over, not at). If ARCHITECTURE.md is correct, accept the visual difference.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

All copy aligns with the spec:
- "Add project..." placeholder row present (`project-cell.tsx:25`)
- "SUMMA", "Target", "Status" pinned row labels (`grid-config.ts:142-144`)
- "New Entry" button in sidebar footer (`person-sidebar.tsx:51`)
- "Help" and "Archive" footer links (`person-sidebar.tsx:56-68`)
- "Search people..." placeholder (`person-sidebar.tsx:81`)
- Loading state: "Loading allocations..." (`page.tsx:32`)
- Error state: "Person not found" (`page.tsx:36`)
- Empty search state: "No people match your search." (`person-sidebar.tsx:139`)
- GridFooter: "Discard Changes" and "Save Worksheet" match spec exactly (`grid-footer.tsx:37-44`)
- Status legend labels: "On Track", "Warning", "Over Capacity" (`grid-footer.tsx:15-29`)

### Pillar 2: Visuals (3/4)

**Matching spec:**
- Person header with prev/next navigation arrows (`person-header.tsx:81-129`)
- Discipline and department badge pills (`person-header.tsx:97-104`)
- Monthly target display with h/month suffix (`person-header.tsx:109-117`)
- Grid container with rounded border and shadow (`allocation-grid.tsx:221`)
- Sidebar with search, grouped departments, status dots, discipline badges (`person-sidebar.tsx`)
- Mobile sidebar with overlay and toggle button (`person-sidebar.tsx:148-181`)
- Analytics section with trend bars, distribution bars, insight card (`person-analytics.tsx`)

**Gap:**
- `person-analytics.tsx:10` — Uses `grid-cols-1 md:grid-cols-3` (equal thirds). Spec uses `grid-cols-12` with `md:col-span-4`, `md:col-span-5`, `md:col-span-3` giving 33%/42%/25% proportions. The Project Distribution card should be wider than the others.

### Pillar 3: Color (3/4)

**Matching spec:**
- Status dot colors: `bg-on-secondary-container` (healthy), `bg-outline-variant` (warning), `bg-error` (overloaded) — matches spec exactly (`capacity.ts:38-43`)
- Status cell background fills: `bg-green-50`, `bg-amber-50`, `bg-error-container/10` (`status-cell.tsx:8-12`)
- Primary accent on focused cell: `outline: 2px solid #496173` (`grid-theme.css:36`)
- Current month column tint: `bg-primary-container/5` (`grid-config.ts:101`)
- Past month dimming: `bg-surface-container-low text-outline opacity-60` (`grid-config.ts:99`)

**Gap:**
- No "CURRENT" label styling on the current month column header. Spec uses `text-primary` for current month header vs `text-outline-variant` for others.

### Pillar 4: Typography (4/4)

Font usage matches spec:
- `font-headline` (Manrope) for person name, section headers
- `font-body` (Inter) for body text, sidebar names
- `tabular-nums` on numeric cells
- `text-2xl font-semibold` for person name (`person-header.tsx:94`)
- `text-[10px] font-bold tracking-widest uppercase` for labels (`person-header.tsx:110`)
- `text-xs font-bold` for sidebar department headers (`person-sidebar.tsx:94`)

### Pillar 5: Spacing (4/4)

Spacing is consistent:
- Grid cells: `padding: 0.5rem 1rem` (`grid-theme.css:23`)
- Sidebar padding: `p-4` (`person-sidebar.tsx:74`)
- Page content padding: `p-8` (`layout.tsx:23`)
- Card padding: `p-6` on analytics cards (`person-analytics.tsx`)
- Gap between analytics cards: `gap-6` matches spec's `gap-4` at a slightly larger value (acceptable)
- No arbitrary `[Npx]` spacing values found in components

### Pillar 6: Experience Design (3/4)

**Present:**
- Loading state on page (`page.tsx:31-33`)
- Loading state in sidebar (`person-sidebar.tsx:88`)
- Error state for missing person (`page.tsx:35-37`)
- Empty state for search (`person-sidebar.tsx:137-142`)
- Disabled state on nav buttons (`person-header.tsx:83, 122`)
- Auto-save on cell blur via `useGridAutosave` hook (`page.tsx:20`)
- Conflict detection seeding (`page.tsx:23-25`)
- Clipboard paste handling (`allocation-grid.tsx:147-207`)
- Drag-to-fill handle (`allocation-grid.tsx:247-254`)
- Keyboard navigation: Tab and arrow key handlers (`allocation-grid.tsx:233-234`)
- Past months are read-only (`grid-config.ts:92`)
- Value validation: 0-999, NaN rejected (`grid-config.ts:108`)

**Gap:**
- Status threshold: `calculateStatus()` returns `'overloaded'` at exactly 100% utilization (`capacity.ts:29`). The creative direction spec shows 100% as green (healthy). This means users will see a red dot when perfectly at target, which could be confusing.
- GridFooter "Save Worksheet" and "Discard Changes" buttons have no `onClick` handlers — they are purely visual (`grid-footer.tsx:35-45`). The actual save happens via auto-save, so these buttons may be decorative, but they set user expectations incorrectly.

---

## Verification of Specific Fix Items

| Check | Status | Evidence |
|-------|--------|----------|
| grid-theme.css imported in allocation-grid.tsx | PASS | Line 25: `import '@/components/grid/grid-theme.css'` |
| ag-theme-custom class on grid container | PASS | Line 220: `className="ag-theme-custom relative w-full..."` |
| GridFooter imported and rendered | PASS | page.tsx lines 9, 83 |
| PersonAnalytics imported and rendered | PASS | page.tsx lines 11, 85 |
| StatusCell renderer registered | PASS | allocation-grid.tsx line 214 |
| StatusCell uses getStatusColor | PASS | status-cell.tsx line 24 |
| Status cell background fill colors | PASS | status-cell.tsx lines 8-12 |
| ProjectCell handles pinned/add/data rows | PASS | project-cell.tsx lines 13-33 |
| Pinned rows: SUMMA, Target, Status | PASS | grid-config.ts lines 142-144 |
| cellRendererSelector routes Status row | PASS | grid-config.ts lines 115-123 |
| PersonSidebar in input layout | PASS | layout.tsx line 22 |
| Sidebar mobile responsive toggle | PASS | person-sidebar.tsx lines 148-155 |

---

## Files Audited

- `src/app/(app)/input/[personId]/page.tsx`
- `src/app/(app)/input/layout.tsx`
- `src/components/person/person-header.tsx`
- `src/components/person/person-sidebar.tsx`
- `src/components/person/person-analytics.tsx`
- `src/components/grid/allocation-grid.tsx`
- `src/components/grid/grid-config.ts`
- `src/components/grid/grid-footer.tsx`
- `src/components/grid/grid-theme.css`
- `src/components/grid/cell-renderers/project-cell.tsx`
- `src/components/grid/cell-renderers/status-cell.tsx`
- `src/components/grid/drag-to-fill-handle.tsx`
- `src/lib/capacity.ts`
- `creative-direction/04-person-input-form.html`
- `creative-direction/08-person-input-sidebar.html`
