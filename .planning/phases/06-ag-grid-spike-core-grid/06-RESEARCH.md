# Phase 6: AG Grid Spike & Core Grid - Research

**Researched:** 2026-03-26
**Domain:** AG Grid Community React, allocation data model, auto-save patterns
**Confidence:** HIGH

## Summary

This phase implements the core product value: a Person Input Form with AG Grid displaying months as columns, projects as rows, and editable hour cells. The allocation data model already exists in the Drizzle schema (`allocations` table with unique constraint on org+person+project+month). AG Grid Community 35.2.0 (current npm) supports all required features natively: cell editing, pinned rows (for SUMMA/Target/Status), column pinning (sticky project name), conditional editability via callbacks, and `onCellValueChanged` events. The main implementation work is: (1) allocation service + API routes, (2) AG Grid configuration with dynamic month columns, (3) pinned summary rows with real-time recalculation, (4) auto-save hook with debounced batch upsert and optimistic updates via TanStack Query.

**Key architectural insight:** The grid is a "view" over the flat `allocations` table. `GET /api/allocations?view=person&personId=X` returns raw allocation rows; the client transforms them into AG Grid rowData (one row per project, months as fields). Pinned rows (SUMMA, Target, Status) are computed client-side from the row data and never persisted.

**Primary recommendation:** Use AG Grid Community 35.x with `pinnedBottomRowData` for SUMMA/Target/Status rows, `editable` callback to enforce past-month read-only, and a `useGridAutosave` hook that debounces cell changes into `POST /api/allocations/batch`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INPUT-01 | AG Grid with months as columns, projects as rows, hours as cells | AG Grid `AgGridReact` with dynamic `columnDefs` generated from month range; `rowData` transformed from flat allocations; project name column pinned left |
| INPUT-02 | Click cell, type hours (0-999), save on blur within 500ms | AG Grid `editable: true` on month columns, `onCellValueChanged` fires on blur, `useGridAutosave` hook debounces 300ms then calls batch upsert API |
| INPUT-03 | SUMMA row calculates sum per month in real time | `pinnedBottomRowData` with computed sums; recalculated on every `onCellValueChanged` via `useMemo` or direct computation |
| INPUT-04 | Target row shows configurable capacity target per person (default 160h) | `pinnedBottomRowData` row populated from `person.targetHoursPerMonth`; same value repeated across all month columns |
| INPUT-05 | Status row with color-coded indicators (green/amber/red/gray) | `pinnedBottomRowData` with custom `cellRenderer` that computes status from SUMMA/Target ratio using `capacity.ts` utilities |
| INPUT-08 | Dynamic "Add project..." row at bottom | Last regular row with italic placeholder text; clicking opens project selector dropdown; on selection, adds new row to `rowData` |
| INPUT-12 | Past months read-only, current + future editable | `editable` callback compares column's month string against `getCurrentMonth()`; past months return `false` + distinct visual styling via `cellClass` callback |
| INPUT-13 | Auto-save on cell blur with debounced batch upsert | `useGridAutosave` hook: collect changes, debounce 300ms, `POST /api/allocations/batch`, optimistic TanStack Query cache update, rollback on error |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ag-grid-community | 35.2.0 | Grid engine with cell editing, pinned rows, column pinning | MIT license, handles virtualization, editing, events natively |
| ag-grid-react | 35.2.0 | React wrapper for AG Grid | Official React binding with React 19 support (since AG Grid 34.3) |
| @tanstack/react-query | 5.95.2 | Server state management for allocations | Already in project; optimistic updates for auto-save |
| zod | 4.3.6 | Validation for allocation upsert schemas | Already in project |
| drizzle-orm | 0.45.1 | Database queries for allocation service | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | not needed | Month arithmetic | Use native Date or simple string math for YYYY-MM -- no library needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AG Grid Community | TanStack Table | TanStack Table lacks built-in cell editing, pinned rows, keyboard nav -- would require 2-3 months of custom work |
| AG Grid Community | Handsontable | GPL license incompatible with SaaS; commercial license $5K+/year |
| pinnedBottomRowData | Custom footer component | Loses AG Grid column alignment, horizontal scroll sync, and cell rendering integration |

**Installation:**
```bash
pnpm add ag-grid-community@35.2.0 ag-grid-react@35.2.0
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  features/
    allocations/
      allocation.service.ts       # Allocation CRUD and query logic
      allocation.schema.ts        # Zod schemas for validation
      allocation.types.ts         # TypeScript types
  components/
    grid/
      allocation-grid.tsx         # AG Grid wrapper for person input
      grid-config.ts              # Column definitions, pinned row computation
      cell-renderers/
        hours-cell.tsx            # Numeric cell with tabular-nums
        status-cell.tsx           # Color-coded status dot
        summa-cell.tsx            # Bold summary cell
        project-cell.tsx          # Project name + "Add project..." row
  hooks/
    use-allocations.ts            # TanStack Query hook for allocations
    use-grid-autosave.ts          # Auto-save on cell change
  lib/
    capacity.ts                   # calculateStatus, getStatusColor
    date-utils.ts                 # generateMonthRange, getCurrentMonth
  app/
    api/
      allocations/
        route.ts                  # GET (person view), POST (upsert)
        batch/
          route.ts                # POST (batch upsert)
        [id]/
          route.ts                # DELETE
    (app)/
      input/
        page.tsx                  # Server component: fetch person + allocations
        [personId]/
          page.tsx                # Dynamic route for person input form
```

### Pattern 1: Flat-to-Grid Data Transformation
**What:** Transform flat allocation rows into AG Grid row data where each row is a project and each month is a field.
**When to use:** When loading allocations for the Person Input Form.
**Example:**
```typescript
// Source: ARCHITECTURE.md Section 9 Flow 1
// Input: flat allocation rows from API
type FlatAllocation = {
  id: string;
  personId: string;
  projectId: string;
  projectName: string;
  month: string; // "2026-01"
  hours: number;
};

// Output: AG Grid row data
type GridRow = {
  projectId: string;
  projectName: string;
  [month: string]: number | string; // "2026-01": 120
};

function transformToGridRows(
  allocations: FlatAllocation[],
  months: string[]
): GridRow[] {
  const byProject = new Map<string, GridRow>();
  for (const alloc of allocations) {
    if (!byProject.has(alloc.projectId)) {
      byProject.set(alloc.projectId, {
        projectId: alloc.projectId,
        projectName: alloc.projectName,
      });
    }
    byProject.get(alloc.projectId)![alloc.month] = alloc.hours;
  }
  return Array.from(byProject.values());
}
```

### Pattern 2: Dynamic Month Column Generation
**What:** Generate AG Grid column definitions from a month range, with conditional editability.
**When to use:** When configuring the grid columns.
**Example:**
```typescript
// Source: AG Grid docs — column definitions + editable callback
import type { ColDef } from 'ag-grid-community';

function buildMonthColumns(
  months: string[],
  currentMonth: string
): ColDef[] {
  return months.map((month) => ({
    field: month,
    headerName: month, // format as needed
    editable: (params) => {
      // INPUT-12: past months read-only
      return month >= currentMonth && !params.node?.isRowPinned();
    },
    cellClass: (params) => {
      const classes = ['text-right', 'tabular-nums'];
      if (month < currentMonth) classes.push('bg-surface-container-low', 'text-outline');
      if (month === currentMonth) classes.push('bg-primary-container/10');
      return classes;
    },
    valueParser: (params) => {
      const val = Number(params.newValue);
      if (isNaN(val) || val < 0 || val > 999) return params.oldValue;
      return val;
    },
    width: 100,
  }));
}
```

### Pattern 3: Pinned Summary Rows
**What:** Use AG Grid's `pinnedBottomRowData` for SUMMA, Target, and Status rows.
**When to use:** Always -- these rows are the primary capacity feedback.
**Example:**
```typescript
// Source: AG Grid Row Pinning docs
function computePinnedRows(
  rowData: GridRow[],
  months: string[],
  targetHours: number
): GridRow[] {
  const summa: Record<string, number | string> = { projectName: 'SUMMA' };
  const target: Record<string, number | string> = { projectName: 'Target' };
  const status: Record<string, string> = { projectName: 'Status' };

  for (const month of months) {
    const total = rowData.reduce(
      (sum, row) => sum + (Number(row[month]) || 0),
      0
    );
    summa[month] = total;
    target[month] = targetHours;
    status[month] = calculateStatus(total, targetHours);
  }

  return [summa, target, status] as GridRow[];
}
```

### Pattern 4: Auto-Save with Debounced Batch Upsert
**What:** Collect cell changes, debounce, batch upsert to server, optimistic TanStack Query cache update.
**When to use:** On every cell edit.
**Example:**
```typescript
// Source: ARCHITECTURE.md Section 8 Data Flow 1
// useGridAutosave hook pattern
function useGridAutosave(personId: string) {
  const queryClient = useQueryClient();
  const pendingRef = useRef<Map<string, AllocationUpsert>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const flush = useCallback(async () => {
    const batch = Array.from(pendingRef.current.values());
    pendingRef.current.clear();
    if (batch.length === 0) return;

    try {
      await fetch('/api/allocations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: batch }),
      });
      // Confirm optimistic update
    } catch {
      // Rollback optimistic update
      queryClient.invalidateQueries({ queryKey: ['allocations', personId] });
    }
  }, [personId, queryClient]);

  const handleCellChange = useCallback(
    (change: { projectId: string; month: string; hours: number }) => {
      const key = `${change.projectId}:${change.month}`;
      pendingRef.current.set(key, { personId, ...change });

      // Optimistic update in TanStack Query cache
      queryClient.setQueryData(['allocations', personId], (old) => {
        // update cache optimistically
      });

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 300);
    },
    [personId, flush, queryClient]
  );

  return { handleCellChange };
}
```

### Anti-Patterns to Avoid
- **Saving on every keystroke:** Use `onCellValueChanged` (fires on blur/Enter), NOT `onCellEditingStarted`. AG Grid handles this correctly.
- **Storing pinned row data in DB:** SUMMA/Target/Status rows are computed. Never persist them.
- **Custom grid instead of AG Grid:** The architecture locks AG Grid Community. Do not build a custom HTML table.
- **Individual POST per cell:** Always batch changes. Even a single cell change should go through the batch endpoint to keep the code path simple.
- **Mutating rowData directly:** Always use immutable updates and let AG Grid react to new props or use the Grid API.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spreadsheet cell editing | Custom contentEditable cells | AG Grid `editable: true` | Handles focus, selection, undo, keyboard events, value parsing |
| Row pinning / summary rows | Custom sticky footer | AG Grid `pinnedBottomRowData` | Stays in sync with horizontal scroll, column widths, resize |
| Column pinning (sticky project name) | CSS sticky positioning | AG Grid `pinned: 'left'` on colDef | Handles shadow, scroll sync, resize properly |
| Cell value formatting | Custom number formatter | AG Grid `valueFormatter` / `valueParser` | Consistent with edit mode, copy/paste, screen readers |
| Month range generation | Manual date arithmetic | `generateMonthRange()` utility in `date-utils.ts` | Handles month overflow (Dec -> Jan+1) correctly |
| Status color mapping | Inline conditionals | `getStatusColor()` from `capacity.ts` | Single source of truth for the design system colors |

## Common Pitfalls

### Pitfall 1: AG Grid Module Registration (v32+ breaking change)
**What goes wrong:** AG Grid 32+ uses a modular architecture. Importing `AgGridReact` without registering modules causes "module not registered" errors.
**Why it happens:** AG Grid moved from a monolithic import to tree-shakeable modules in v32.
**How to avoid:** Import `AllCommunityModule` from `ag-grid-community` and pass it via the `modules` prop or use `AgGridProvider`.
**Warning signs:** Console error about unregistered modules; grid renders but features don't work.

### Pitfall 2: Pinned Row Editability
**What goes wrong:** Pinned rows (SUMMA/Target/Status) become editable if `editable: true` is set at column level.
**Why it happens:** AG Grid applies column-level `editable` to all rows including pinned.
**How to avoid:** Use `editable` callback: `(params) => !params.node?.isRowPinned() && month >= currentMonth`.
**Warning signs:** User can click into SUMMA row and type values.

### Pitfall 3: Stale Pinned Row Data After Cell Edit
**What goes wrong:** SUMMA row doesn't update when a cell value changes because `pinnedBottomRowData` was set once.
**Why it happens:** AG Grid doesn't automatically recalculate pinned rows when regular row data changes.
**How to avoid:** Recompute `pinnedBottomRowData` in `onCellValueChanged` handler and pass new array to the grid (or use `api.setGridOption('pinnedBottomRowData', newData)`).
**Warning signs:** SUMMA shows old totals until page refresh.

### Pitfall 4: Month String Comparison for Past/Future
**What goes wrong:** Lexicographic comparison of "2026-01" < "2026-02" works for YYYY-MM format, but breaks if month format varies.
**Why it happens:** Inconsistent date format usage across the application.
**How to avoid:** Enforce YYYY-MM format everywhere. The `date('month', { mode: 'string' })` in schema stores as YYYY-MM-DD; normalize to YYYY-MM by slicing first 7 chars.
**Warning signs:** Past months are editable, or current month is marked read-only.

### Pitfall 5: Zero-Hour Allocations
**What goes wrong:** User clears a cell (types 0 or deletes content), but the allocation row persists in DB with hours=0.
**Why it happens:** Forgetting the "hours=0 means DELETE" business rule from ARCHITECTURE.md.
**How to avoid:** In `upsertAllocation`, if hours is 0, DELETE the row instead of UPDATE. In the grid, treat empty/0 cells as "no allocation."
**Warning signs:** Database fills with zero-hour rows; performance degrades over time.

### Pitfall 6: Status Threshold Discrepancy
**What goes wrong:** REQUIREMENTS.md (INPUT-05) specifies green <90%, amber 90-100%, red >100%. ARCHITECTURE.md `capacity.ts` specifies healthy <85%, warning 85-100%, overloaded >=100%.
**Why it happens:** The two documents use different threshold values.
**How to avoid:** Use the REQUIREMENTS.md thresholds (INPUT-05) as the authoritative source: green (<90% of target), amber (90-100%), red (>100%), gray (no allocations). Update the `calculateStatus` implementation to match.
**Warning signs:** Status dots show wrong colors at boundary values (e.g., 89% shows amber instead of green).

## Code Examples

### AG Grid Setup with AllCommunityModule
```typescript
// Source: AG Grid v35 Getting Started docs
'use client';

import { AllCommunityModule } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

// Register once at module level or in a provider
const modules = [AllCommunityModule];

export function AllocationGrid({ rowData, columnDefs, pinnedBottomRowData, onCellValueChanged }) {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <AgGridReact
        modules={modules}
        rowData={rowData}
        columnDefs={columnDefs}
        pinnedBottomRowData={pinnedBottomRowData}
        onCellValueChanged={onCellValueChanged}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        defaultColDef={{
          sortable: false,
          filter: false,
          resizable: true,
        }}
      />
    </div>
  );
}
```

### Allocation Upsert with ON CONFLICT
```typescript
// Source: ARCHITECTURE.md Section 6.1 + Drizzle ORM docs
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';

export async function upsertAllocation(
  orgId: string,
  data: { personId: string; projectId: string; month: string; hours: number }
) {
  if (data.hours === 0) {
    // Delete allocation when hours = 0
    await db.delete(schema.allocations).where(
      and(
        eq(schema.allocations.organizationId, orgId),
        eq(schema.allocations.personId, data.personId),
        eq(schema.allocations.projectId, data.projectId),
        eq(schema.allocations.month, data.month),
      )
    );
    return null;
  }

  const result = await db
    .insert(schema.allocations)
    .values({
      organizationId: orgId,
      personId: data.personId,
      projectId: data.projectId,
      month: data.month,
      hours: data.hours,
    })
    .onConflictDoUpdate({
      target: [
        schema.allocations.organizationId,
        schema.allocations.personId,
        schema.allocations.projectId,
        schema.allocations.month,
      ],
      set: { hours: data.hours, updatedAt: new Date() },
    })
    .returning();

  return result[0];
}
```

### Batch Upsert in Transaction
```typescript
// Source: ARCHITECTURE.md Section 6.1 batchUpsertAllocations
import { db } from '@/db';

export async function batchUpsertAllocations(
  orgId: string,
  allocations: Array<{ personId: string; projectId: string; month: string; hours: number }>
) {
  let created = 0, updated = 0, deleted = 0;

  await db.transaction(async (tx) => {
    for (const alloc of allocations) {
      if (alloc.hours === 0) {
        const result = await tx.delete(schema.allocations).where(
          and(
            eq(schema.allocations.organizationId, orgId),
            eq(schema.allocations.personId, alloc.personId),
            eq(schema.allocations.projectId, alloc.projectId),
            eq(schema.allocations.month, alloc.month),
          )
        );
        if (result.rowCount) deleted++;
      } else {
        // Use INSERT ... ON CONFLICT for upsert
        await tx.insert(schema.allocations)
          .values({ organizationId: orgId, ...alloc })
          .onConflictDoUpdate({
            target: [
              schema.allocations.organizationId,
              schema.allocations.personId,
              schema.allocations.projectId,
              schema.allocations.month,
            ],
            set: { hours: alloc.hours, updatedAt: new Date() },
          });
        // Determine created vs updated based on presence check or use RETURNING
      }
    }
  });

  return { created, updated, deleted, errors: [] };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import 'ag-grid-community/styles/ag-grid.css'` | `AllCommunityModule` modular import | AG Grid v32 (2024) | Must register modules; old CSS imports no longer needed with theming API |
| AG Grid `gridOptions` object | React props on `AgGridReact` | AG Grid v28+ | Pass everything as props; `gridOptions` still works but props preferred in React |
| `api.setPinnedTopRowData()` imperative | `pinnedBottomRowData` prop | AG Grid v31+ | Reactive prop preferred over imperative API in React |
| Separate CSS theme files | `themeQuartz` and `themeParams` JS API | AG Grid v32+ | Theming via JS; CSS imports optional |

## Open Questions

1. **Drizzle `onConflictDoUpdate` with composite unique constraint**
   - What we know: The allocations table has a unique constraint on `(organization_id, person_id, project_id, month)`. Drizzle supports `onConflictDoUpdate` with `target` array.
   - What's unclear: Need to verify the exact Drizzle 0.45 syntax for composite target on `onConflictDoUpdate` -- may need to reference the constraint name instead of columns.
   - Recommendation: Test during implementation; if `target` array doesn't work, use `.onConflictDoNothing()` + separate update, or reference constraint by name.

2. **AG Grid theming integration with Tailwind CSS 4**
   - What we know: AG Grid v35 uses a JS theming API (`themeQuartz.withParams()`). The project uses Tailwind CSS 4.
   - What's unclear: Whether AG Grid's built-in theme can be fully aligned with Nordic Precision design tokens without CSS overrides.
   - Recommendation: Start with AG Grid's default `themeQuartz`, apply minimal CSS overrides for fonts (Inter, tabular-nums), colors (Nordic Precision palette), and border-radius (2px).

3. **"Add project..." row behavior**
   - What we know: The creative direction shows an italic "Add project..." row at the bottom of the data rows (above pinned summary rows).
   - What's unclear: Whether this should be a regular AG Grid row or a custom overlay. Clicking should open a project selector.
   - Recommendation: Implement as the last regular row in `rowData` with a special `isAddRow: true` flag. Use a custom cell renderer for the project name column that shows a dropdown selector when this row is clicked.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (not yet installed -- Wave 0 gap) |
| Config file | none -- see Wave 0 |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INPUT-01 | Grid renders with months as columns, projects as rows | unit | `vitest run src/components/grid/__tests__/allocation-grid.test.tsx` | Wave 0 |
| INPUT-02 | Cell edit saves value on blur | integration | `vitest run src/hooks/__tests__/use-grid-autosave.test.ts` | Wave 0 |
| INPUT-03 | SUMMA row sums all project hours per month | unit | `vitest run src/components/grid/__tests__/grid-config.test.ts` | Wave 0 |
| INPUT-04 | Target row shows person's capacity target | unit | `vitest run src/components/grid/__tests__/grid-config.test.ts` | Wave 0 |
| INPUT-05 | Status row shows correct color per threshold | unit | `vitest run src/lib/__tests__/capacity.test.ts` | Wave 0 |
| INPUT-08 | "Add project" row triggers project selector | unit | `vitest run src/components/grid/__tests__/allocation-grid.test.tsx` | Wave 0 |
| INPUT-12 | Past months reject edits | unit | `vitest run src/components/grid/__tests__/grid-config.test.ts` | Wave 0 |
| INPUT-13 | Auto-save batches and debounces | unit | `vitest run src/hooks/__tests__/use-grid-autosave.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run --reporter=verbose`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Install vitest + @testing-library/react + jsdom
- [ ] `vitest.config.ts` -- configure with path aliases matching tsconfig
- [ ] `src/lib/__tests__/capacity.test.ts` -- covers INPUT-05
- [ ] `src/components/grid/__tests__/grid-config.test.ts` -- covers INPUT-03, INPUT-04, INPUT-12
- [ ] `src/hooks/__tests__/use-grid-autosave.test.ts` -- covers INPUT-02, INPUT-13

## Sources

### Primary (HIGH confidence)
- AG Grid React Getting Started docs (v35) - https://www.ag-grid.com/react-data-grid/getting-started/
- AG Grid Row Pinning docs - https://www.ag-grid.com/react-data-grid/row-pinning/
- AG Grid Cell Editing docs - https://www.ag-grid.com/react-data-grid/cell-editing/
- AG Grid Column Properties Reference - https://www.ag-grid.com/react-data-grid/column-properties/
- ARCHITECTURE.md Sections 5 (file structure), 6.1 (allocation service), 6.14 (capacity utils), 6.15 (date utils), 7 (API contracts), 9 (data flows)
- Existing codebase: `src/db/schema.ts` (allocations table), `src/lib/tenant.ts` (withTenant pattern), `src/hooks/use-people.ts` (TanStack Query pattern), `src/features/people/person.service.ts` (service pattern)

### Secondary (MEDIUM confidence)
- npm registry: ag-grid-community@35.2.0, ag-grid-react@35.2.0 (verified current as of 2026-03-26)
- AG Grid React 19 compatibility confirmed since AG Grid 34.3 (October 2025) - https://www.ag-grid.com/react-data-grid/compatibility/

### Tertiary (LOW confidence)
- Drizzle `onConflictDoUpdate` with composite unique constraints -- needs implementation-time verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - AG Grid Community is locked in ADR-003, version verified on npm
- Architecture: HIGH - ARCHITECTURE.md provides complete API contracts, file structure, and data flows
- Pitfalls: HIGH - identified from AG Grid v32+ module system changes and domain-specific edge cases (zero-hours, threshold discrepancy)

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (AG Grid stable, architecture locked)
