# Phase 7: Grid Polish & Navigation - Research

**Researched:** 2026-03-26
**Domain:** AG Grid Community keyboard navigation, custom clipboard paste, custom drag-to-fill, optimistic locking, person sidebar navigation
**Confidence:** HIGH

## Summary

This phase adds spreadsheet-grade interactions to the Person Input Form built in Phase 6. Six requirements span three distinct technical domains: (1) AG Grid Community keyboard navigation using built-in callbacks (`tabToNextCell`, `navigateToNextCell`) and `suppressKeyboardEvent` -- these are Community features and well-documented; (2) custom implementations for clipboard paste and drag-to-fill because both are Enterprise-only features in AG Grid; (3) a person sidebar with department grouping and prev/next navigation, plus optimistic locking for conflict detection on concurrent edits.

The existing Phase 6 codebase provides a solid foundation: `AllocationGrid` component with `onCellValueChanged`, `useGridAutosave` hook with debounced batch upsert, `gridRef` storing the AG Grid API, and `FlatAllocation`/`GridRow` types. The `allocations` table already has `updatedAt` timestamps for optimistic locking. The `listPeople` service returns people with `departmentId` for grouping. The creative direction prototype (`08-person-input-sidebar.html`) shows the exact sidebar design: people grouped by department name (uppercase heading), each person with a status dot (green/amber/red) and discipline abbreviation badge.

**Critical finding:** AG Grid clipboard (copy/paste) and fill handle are **Enterprise-only** features. The project uses Community Edition (locked decision). Both must be implemented as custom handlers: clipboard via browser `paste` event listener on the grid container, and drag-to-fill via a custom React overlay with mousedown/mousemove/mouseup handlers on a corner handle element.

**Primary recommendation:** Implement keyboard navigation via AG Grid's built-in `tabToNextCell`/`navigateToNextCell` callbacks (Community). Build a `clipboard-handler.ts` utility that parses tab-delimited paste data and maps to grid cells. Build a `DragToFillHandle` React component as a positioned overlay on the focused cell. Add `updatedAt` to the batch upsert response and compare on subsequent saves for conflict detection.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INPUT-06 | Person sidebar lists all people grouped by department with status dots | Use `usePeople` hook + `useDepartments` for grouping; compute aggregate status per person via sum of current-month allocations vs target; prototype 08 shows exact design |
| INPUT-07 | Prev/next arrows navigate between people | Implement `getAdjacentPerson` service function (ARCHITECTURE.md spec); use Next.js router `push` to `/app/input/[nextPersonId]`; respect current filter context |
| INPUT-09 | Drag-to-fill custom implementation | AG Grid Enterprise feature -- build custom `DragToFillHandle` React overlay; mousedown on corner handle, mousemove to extend selection, mouseup to fill values via batch upsert |
| INPUT-10 | Keyboard navigation: Tab, Enter, Arrow keys, Escape | AG Grid Community `tabToNextCell` and `navigateToNextCell` callbacks; `suppressKeyboardEvent` for custom Enter behavior; all Community features |
| INPUT-11 | Custom clipboard paste handler | AG Grid clipboard is Enterprise-only; build `clipboard-handler.ts` using browser `paste` event + `navigator.clipboard.readText()`; parse tab-delimited Excel data, map to grid cells, batch upsert |
| INPUT-14 | Conflict detection -- warn if another user modified the same cell | Optimistic locking via `updatedAt` timestamp; return `updatedAt` from batch upsert; compare on next save; show ConflictError toast with option to overwrite or refetch |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ag-grid-community | 35.2.0 | Grid engine -- keyboard nav callbacks are Community | Already installed from Phase 6 |
| ag-grid-react | 35.2.0 | React wrapper | Already installed from Phase 6 |
| @tanstack/react-query | 5.95.2 | Server state for people list, allocations | Already installed; sidebar uses `usePeople` |
| next | 16.x | Router for person navigation (`push`) | Already installed |
| zod | 4.x | Validation for paste data, conflict payloads | Already installed |
| drizzle-orm | 0.45.x | `getAdjacentPerson` query, conflict detection query | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new dependencies | -- | -- | Phase 7 requires zero new npm packages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom paste handler | AG Grid Enterprise Clipboard | $2K+/year license; Community is a locked decision |
| Custom drag-to-fill overlay | AG Grid Enterprise Fill Handle | Same license issue; custom is ~2-3 days work per ARCHITECTURE.md risk R1 |
| Browser `paste` event | `navigator.clipboard.read()` | `read()` requires user permission prompt; `paste` event already has text -- simpler |

**Installation:**
```bash
# No new packages needed -- all dependencies from Phase 6
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    grid/
      allocation-grid.tsx         # MODIFY: add paste handler, keyboard callbacks, fill handle
      grid-config.ts              # MODIFY: add tabToNextCell, navigateToNextCell
      cell-renderers/             # existing
      drag-to-fill-handle.tsx     # NEW: custom fill handle overlay
    person/
      person-sidebar.tsx          # NEW: people list grouped by department
      person-header.tsx           # NEW: person name, nav arrows, discipline tag
  hooks/
    use-allocations.ts            # MODIFY: return updatedAt for conflict detection
    use-grid-autosave.ts          # MODIFY: track updatedAt, detect conflicts
    use-keyboard-nav.ts           # NEW: AG Grid keyboard nav configuration
    use-people.ts                 # existing -- used by sidebar
  lib/
    clipboard-handler.ts          # NEW: parse tab-delimited paste data
    capacity.ts                   # existing -- used for sidebar status dots
  features/
    allocations/
      allocation.service.ts       # MODIFY: return updatedAt in responses
      allocation.types.ts         # MODIFY: add updatedAt to FlatAllocation
    people/
      person.service.ts           # MODIFY: add getAdjacentPerson function
  app/
    api/
      people/
        [id]/
          adjacent/
            route.ts              # NEW: GET prev/next person
    (app)/
      input/
        [personId]/
          page.tsx                # MODIFY: add sidebar, header, paste listener
        layout.tsx                # NEW or MODIFY: sidebar layout for input section
```

### Pattern 1: Custom Clipboard Paste Handler
**What:** Intercept browser `paste` event on the grid container, parse tab-delimited text from Excel, map to grid cells based on focused cell position, batch upsert.
**When to use:** When user presses Ctrl+V / Cmd+V while the grid is focused.
**Example:**
```typescript
// src/lib/clipboard-handler.ts
// Source: ARCHITECTURE.md Section 6.23

export type PasteCell = {
  projectId: string;
  month: string;
  hours: number;
};

export type PasteResult = {
  cells: PasteCell[];
  rowCount: number;
  colCount: number;
};

export type PasteError = {
  row: number;
  col: number;
  value: string;
  reason: string;
};

export function parseClipboardText(
  text: string,
): { rows: string[][]; rowCount: number; colCount: number } {
  // Split by newline, then by tab
  const rows = text
    .split('\n')
    .map((line) => line.split('\t').map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell !== ''));

  const colCount = Math.max(...rows.map((r) => r.length));
  return { rows, rowCount: rows.length, colCount };
}

export function parseNumericValue(value: string): number | null {
  if (value === '') return 0; // empty = delete
  // Handle European comma decimal: "120,5" -> 120.5
  const normalized = value.replace(',', '.');
  const num = Number(normalized);
  if (isNaN(num) || num < 0 || num > 744) return null;
  return Math.round(num); // hours are integers
}

export function mapPasteToGridCells(
  parsed: { rows: string[][] },
  focusedRowIndex: number,
  focusedColIndex: number, // index into month columns (0-based)
  gridRows: Array<{ projectId: string }>,
  months: string[],
): { cells: PasteCell[]; errors: PasteError[] } {
  const cells: PasteCell[] = [];
  const errors: PasteError[] = [];

  for (let r = 0; r < parsed.rows.length; r++) {
    const targetRowIdx = focusedRowIndex + r;
    if (targetRowIdx >= gridRows.length) break; // out of bounds
    const row = gridRows[targetRowIdx];
    if (!row.projectId || row.projectId.startsWith('__')) continue; // skip special rows

    for (let c = 0; c < parsed.rows[r].length; c++) {
      const targetColIdx = focusedColIndex + c;
      if (targetColIdx >= months.length) break; // out of bounds

      const value = parseNumericValue(parsed.rows[r][c]);
      if (value === null) {
        errors.push({
          row: r, col: c,
          value: parsed.rows[r][c],
          reason: 'Non-numeric or out of range (0-744)',
        });
        continue;
      }
      cells.push({
        projectId: row.projectId,
        month: months[targetColIdx],
        hours: value,
      });
    }
  }
  return { cells, errors };
}
```

### Pattern 2: Custom Drag-to-Fill Overlay
**What:** A small square handle positioned at the bottom-right corner of the focused cell. User drags horizontally to extend the fill range across months.
**When to use:** When user wants to replicate an hour value across multiple months.
**Example:**
```typescript
// src/components/grid/drag-to-fill-handle.tsx
// Source: ARCHITECTURE.md Risk R1 + ADR-003

// The handle is positioned absolutely relative to the focused cell.
// Implementation approach:
// 1. On cell focus, compute the cell's bounding rect via gridApi
// 2. Render a 10x10px handle at bottom-right corner
// 3. mousedown starts drag mode
// 4. mousemove extends highlight (CSS overlay) across adjacent month columns
// 5. mouseup fills all highlighted cells with the source cell's value
// 6. Calls batch upsert with the filled values

// Key AG Grid APIs used:
// - gridApi.getFocusedCell() -> { rowIndex, column }
// - gridApi.getCellRendererInstances() for positioning
// - gridApi.getDisplayedRowAtIndex(idx) -> rowNode
// - gridApi.setFocusedCell(rowIndex, colKey) after fill

// The fill is HORIZONTAL ONLY (across months for same project).
// Vertical fill (across projects) is not required per INPUT-09.
```

### Pattern 3: AG Grid Keyboard Navigation Callbacks
**What:** Configure `tabToNextCell` and `navigateToNextCell` for spreadsheet-like behavior.
**When to use:** Always -- this is the primary keyboard interaction model.
**Example:**
```typescript
// src/hooks/use-keyboard-nav.ts or inline in grid-config.ts
// Source: AG Grid Keyboard Navigation docs (Community)

import type {
  NavigateToNextCellParams,
  TabToNextCellParams,
  CellPosition,
} from 'ag-grid-community';

/**
 * Tab moves to the next editable cell (skipping pinned/read-only).
 * Shift+Tab moves backward. At end of row, wraps to next row.
 */
export function tabToNextCell(params: TabToNextCellParams): CellPosition | boolean {
  const { backwards, editing, nextCellPosition } = params;
  if (!nextCellPosition) return false; // at grid boundary

  // Skip pinned rows and the add-project row
  if (nextCellPosition.rowPinned) return false;

  return nextCellPosition;
}

/**
 * Arrow keys move between cells. Enter moves down (like Excel).
 * Escape cancels editing.
 */
export function navigateToNextCell(
  params: NavigateToNextCellParams,
): CellPosition | null {
  const { key, nextCellPosition, previousCellPosition } = params;

  // Enter key: move down one row (Excel behavior)
  if (key === 'Enter' || key === 'ArrowDown') {
    if (!nextCellPosition) return previousCellPosition;
    // Skip pinned rows
    if (nextCellPosition.rowPinned) return previousCellPosition;
    return nextCellPosition;
  }

  return nextCellPosition;
}
```

### Pattern 4: Optimistic Locking for Conflict Detection
**What:** Track `updatedAt` per allocation cell. On save, compare the `updatedAt` from the last fetch. If it changed, another user modified the cell.
**When to use:** Every batch upsert operation.
**Example:**
```typescript
// Conflict detection flow:
// 1. GET /api/allocations?personId=X returns { allocations: [...], updatedAt per cell }
// 2. Client stores updatedAt in a Map<"projectId:month", Date>
// 3. On batch upsert, include expectedUpdatedAt per cell
// 4. Server compares: if DB updatedAt > expectedUpdatedAt, return ConflictError
// 5. Client shows toast: "Cell was modified by another user. Overwrite or Refresh?"
// 6. If overwrite: re-send with force=true flag
// 7. If refresh: invalidate TanStack Query cache

// Server-side check in allocation.service.ts batchUpsertAllocations:
// Before each upsert, SELECT updatedAt WHERE matching conditions
// If existing.updatedAt > expected, collect conflict info
// Return { ...result, conflicts: [{ projectId, month, serverValue, serverUpdatedAt }] }
```

### Pattern 5: Person Sidebar with Department Grouping
**What:** Left sidebar listing all people, grouped by department name, each with a status dot based on their overall allocation status.
**When to use:** Always visible when on the Input page.
**Example:**
```typescript
// src/components/person/person-sidebar.tsx
// Source: creative-direction/08-person-input-sidebar.html

// Data flow:
// 1. usePeople() fetches all people (already returns departmentId)
// 2. useDepartments() fetches department names
// 3. Group people by departmentId, map to department name
// 4. For each person, compute aggregate status:
//    - Need person's total allocations for current month vs targetHoursPerMonth
//    - Option A: fetch all allocations (expensive) -- NOT recommended
//    - Option B: add a summary endpoint GET /api/people/status that returns
//      [{ personId, currentMonthSum, targetHours, status }]
//    - Option C: compute status client-side from already-fetched data
//      (only feasible if we fetch summaries, not all allocation rows)
// 5. RECOMMENDED: Add GET /api/people?withStatus=true that JOINs allocations
//    and computes sum for current month, returning status per person

// Sidebar design (from prototype 08):
// - Search input at top
// - Department groups with uppercase heading (10px, tracking-widest)
// - Each person: status dot (h-2 w-2) + name (xs) + discipline badge (rounded-full)
// - Active person has highlighted background (bg-surface-variant)
// - Click navigates to /app/input/[personId]
```

### Anti-Patterns to Avoid
- **Using AG Grid Enterprise clipboard/fill features with Community license:** Will throw license errors in production. Must use custom implementations.
- **Fetching all allocations for all people for sidebar status:** N+1 query problem. Use a single aggregation query.
- **Handling paste synchronously without validation:** Always validate all pasted values before updating the grid. Show errors for invalid cells.
- **Storing drag-to-fill range in React state during drag:** Use refs for performance -- mousemove fires 60+ times/second. Only commit to state on mouseup.
- **Implementing conflict detection with polling:** Use optimistic locking on write, not periodic polling. WebSocket-based real-time conflicts are deferred to Phase 3 per Risk R5.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard cell navigation | Custom keyboard event handler | AG Grid `tabToNextCell` + `navigateToNextCell` callbacks | Community feature; handles edge cases (row boundaries, pinned rows, column groups) |
| Cell focus management | Manual `document.activeElement` tracking | AG Grid `gridApi.setFocusedCell()`, `gridApi.getFocusedCell()` | Grid manages its own focus state correctly |
| Paste text parsing | Regex-based parser | Structured `split('\n').split('\t')` with validation | Tab-delimited is the universal clipboard format from Excel/Sheets |
| Department grouping | Manual sort + reduce | `Object.groupBy()` or `Map` grouping with department lookup | Clean, readable, single-pass |
| Status dot colors | Inline color conditionals | `getStatusColor()` from existing `capacity.ts` | Already implemented in Phase 6 |

## Common Pitfalls

### Pitfall 1: Browser Clipboard Permission Denied
**What goes wrong:** `navigator.clipboard.readText()` throws `NotAllowedError` when the page is not focused or in an iframe.
**Why it happens:** Clipboard API requires secure context (HTTPS) and user gesture.
**How to avoid:** Use the `paste` event's `clipboardData.getData('text/plain')` instead of the async Clipboard API. The paste event already contains the text data and does not require permission.
**Warning signs:** Paste works in dev (localhost is secure context) but fails in iframe embeds.

### Pitfall 2: Drag-to-Fill Handle Positioning After Grid Scroll
**What goes wrong:** The fill handle stays at the old cell position after the grid scrolls horizontally or vertically.
**Why it happens:** The handle is positioned based on the cell's bounding rect at render time, but AG Grid virtualizes cells during scroll.
**How to avoid:** Recalculate handle position on AG Grid's `onBodyScroll` event. Use `gridApi.getCellRendererInstances()` or `gridApi.getDisplayedRowAtIndex()` for current positions. Consider hiding the handle during scroll and re-showing after `scrollEnd`.
**Warning signs:** Handle floats over the wrong cell after horizontal scrolling.

### Pitfall 3: Paste Overwrites Read-Only Cells
**What goes wrong:** Pasting a block of data that spans past and future months writes values into past (read-only) months.
**Why it happens:** The paste handler maps data positionally without checking editability.
**How to avoid:** In `mapPasteToGridCells`, check `month >= currentMonth` for each target cell. Skip read-only cells and log them in the error list. Show a toast: "X cells skipped (past months are read-only)".
**Warning signs:** Past-month cells get values that disappear on refresh (server rejects them) -- or worse, they persist.

### Pitfall 4: Conflict Detection False Positives
**What goes wrong:** Every save triggers a conflict warning because `updatedAt` is always different.
**Why it happens:** The `$onUpdate(() => new Date())` on the schema auto-updates `updatedAt` on every upsert, including the user's own saves.
**How to avoid:** After a successful save, update the client's `updatedAt` map with the returned `updatedAt` values from the server response. Only compare against the `updatedAt` that was fetched before the user started editing.
**Warning signs:** User sees "Another user modified this cell" after their own save.

### Pitfall 5: Sidebar Status Dots Require Allocation Aggregation
**What goes wrong:** The sidebar shows no status dots (or gray for everyone) because individual allocation data is not available.
**Why it happens:** The `listPeople` endpoint returns person metadata but no allocation summary.
**How to avoid:** Create a dedicated endpoint or modify `GET /api/people?withStatus=true` that JOINs allocations, groups by person, sums hours for the current month, and returns status alongside person data. This is a single SQL query with `GROUP BY`.
**Warning signs:** All dots are gray; fixing requires N+1 queries client-side.

### Pitfall 6: Enter Key Behavior Conflict with AG Grid Default
**What goes wrong:** Pressing Enter while editing a cell both commits the edit AND starts editing the next cell, causing double-entry.
**Why it happens:** AG Grid's default Enter behavior is to stop editing. Adding a `navigateToNextCell` handler that moves down creates a race condition.
**How to avoid:** Use `enterNavigatesAfterEdit: true` grid option. This makes Enter commit the edit AND move to the next row (Excel behavior). Do not also handle Enter in `navigateToNextCell`.
**Warning signs:** Pressing Enter commits value then immediately opens editor on next cell with cursor issues.

## Code Examples

### Paste Event Handler on Grid Container
```typescript
// Source: ARCHITECTURE.md Section 6.23 + Browser Clipboard API

// In allocation-grid.tsx, add a paste listener to the grid container div:
const gridContainerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const container = gridContainerRef.current;
  if (!container) return;

  const handlePaste = async (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;
    e.preventDefault(); // prevent AG Grid default (which does nothing in Community)

    const api = gridRef.current;
    if (!api) return;

    const focusedCell = api.getFocusedCell();
    if (!focusedCell) return;

    // Get the focused cell's row index and column index
    const rowIndex = focusedCell.rowIndex;
    const colId = focusedCell.column.getColId();
    const monthIndex = months.indexOf(colId);
    if (monthIndex === -1) return; // focused on project name column

    const parsed = parseClipboardText(text);
    const { cells, errors } = mapPasteToGridCells(
      parsed,
      rowIndex,
      monthIndex,
      localRowData.filter((r) => !r.isAddRow),
      months.filter((m) => m >= currentMonth), // only editable months
    );

    if (errors.length > 0) {
      // Show toast with error count
    }

    if (cells.length > 0) {
      // Update local grid state for immediate feedback
      // Then trigger batch upsert via handleCellChange for each cell
      for (const cell of cells) {
        handleCellChange({ projectId: cell.projectId, month: cell.month, hours: cell.hours });
      }
    }
  };

  container.addEventListener('paste', handlePaste);
  return () => container.removeEventListener('paste', handlePaste);
}, [gridRef, months, currentMonth, localRowData, handleCellChange]);
```

### Person Sidebar Component Structure
```typescript
// src/components/person/person-sidebar.tsx
// Source: creative-direction/08-person-input-sidebar.html

type PersonWithStatus = {
  id: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  departmentName: string;
  disciplineAbbreviation: string;
  status: CapacityStatus; // from capacity.ts
};

// Group people by department
function groupByDepartment(
  people: PersonWithStatus[],
): Map<string, PersonWithStatus[]> {
  const grouped = new Map<string, PersonWithStatus[]>();
  for (const person of people) {
    const dept = person.departmentName;
    if (!grouped.has(dept)) grouped.set(dept, []);
    grouped.get(dept)!.push(person);
  }
  return grouped;
}

// Sidebar renders:
// <aside className="w-72 border-r ...">
//   <input placeholder="Search people..." />
//   {departments.map(([deptName, people]) => (
//     <div>
//       <h3 className="font-headline text-[10px] uppercase tracking-widest">{deptName}</h3>
//       {people.map(person => (
//         <Link href={`/app/input/${person.id}`}>
//           <div className={cn("flex items-center gap-3 p-2 rounded-sm",
//             person.id === activePersonId && "bg-surface-variant font-semibold"
//           )}>
//             <div className={cn("h-2 w-2 rounded-full", getStatusColor(person.status))} />
//             <span className="text-xs">{person.firstName} {person.lastName}</span>
//             <span className="ml-auto rounded-full bg-secondary-container px-1.5 py-0.5 text-[10px]">
//               {person.disciplineAbbreviation}
//             </span>
//           </div>
//         </Link>
//       ))}
//     </div>
//   ))}
// </aside>
```

### getAdjacentPerson Service Function
```typescript
// src/features/people/person.service.ts -- NEW function
// Source: ARCHITECTURE.md Section 6.2 getAdjacentPerson spec

import { and, eq, gt, lt, isNull, or } from 'drizzle-orm';

export async function getAdjacentPerson(
  orgId: string,
  currentPersonId: string,
  direction: 'next' | 'prev',
  filters: PersonFilter = {},
): Promise<{ id: string } | null> {
  // First get the current person's sort position
  const current = await getPersonById(orgId, currentPersonId);

  // Build the same filter conditions as listPeople
  const conditions = [
    eq(schema.people.organizationId, orgId),
    isNull(schema.people.archivedAt),
  ];
  if (filters.departmentId) {
    conditions.push(eq(schema.people.departmentId, filters.departmentId));
  }

  // Find the adjacent person by sort order
  // Order: sortOrder ASC, lastName ASC, firstName ASC
  // For "next": find first person > current in sort order
  // For "prev": find last person < current in sort order
  // This is a simplified approach; actual implementation should use
  // a cursor-based approach comparing (sortOrder, lastName, firstName) tuple

  const allPeople = await listPeople(orgId, filters);
  const currentIndex = allPeople.findIndex((p) => p.id === currentPersonId);
  if (currentIndex === -1) return null;

  const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  if (nextIndex < 0 || nextIndex >= allPeople.length) return null;

  return { id: allPeople[nextIndex].id };
}
```

### Keyboard Navigation Grid Options
```typescript
// Applied to AgGridReact props:
<AgGridReact
  // ... existing props
  tabToNextCell={tabToNextCell}
  navigateToNextCell={navigateToNextCell}
  enterNavigatesAfterEdit={true}  // Enter commits edit + moves down
  enterNavigatesVertically={true} // Enter moves vertically (not horizontally)
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AG Grid Enterprise clipboard | Custom paste handler on Community | AG Grid has always gated clipboard behind Enterprise | Must implement browser-native paste parsing |
| AG Grid Enterprise Fill Handle | Custom drag-to-fill overlay | AG Grid has always gated fill handle behind Enterprise | ~2-3 days custom implementation per ARCHITECTURE.md |
| `enterMovesDown` (AG Grid <v30) | `enterNavigatesAfterEdit` + `enterNavigatesVertically` | AG Grid v30+ | New prop names; same behavior |
| WebSocket-based conflict detection | Optimistic locking via `updatedAt` | Design decision for MVP | Real-time via WebSocket deferred to Phase 3 |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (not yet installed -- Wave 0 gap from Phase 6, still outstanding) |
| Config file | none -- see Wave 0 |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INPUT-06 | Sidebar groups people by department with status dots | unit | `vitest run src/components/person/__tests__/person-sidebar.test.tsx` | Wave 0 |
| INPUT-07 | Prev/next navigates between people respecting filters | unit | `vitest run src/features/people/__tests__/person.service.test.ts` | Wave 0 |
| INPUT-09 | Drag-to-fill copies value across months | unit | `vitest run src/components/grid/__tests__/drag-to-fill.test.ts` | Wave 0 |
| INPUT-10 | Tab/Enter/Arrow/Escape navigate correctly | unit | `vitest run src/hooks/__tests__/use-keyboard-nav.test.ts` | Wave 0 |
| INPUT-11 | Clipboard paste parses tab-delimited data and maps to cells | unit | `vitest run src/lib/__tests__/clipboard-handler.test.ts` | Wave 0 |
| INPUT-14 | Conflict detected when updatedAt mismatch | unit | `vitest run src/hooks/__tests__/use-grid-autosave.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run --reporter=verbose`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Install vitest + @testing-library/react + jsdom (still needed from Phase 6)
- [ ] `vitest.config.ts` -- configure with path aliases matching tsconfig
- [ ] `src/lib/__tests__/clipboard-handler.test.ts` -- covers INPUT-11 (pure function, easy to unit test)
- [ ] `src/components/person/__tests__/person-sidebar.test.tsx` -- covers INPUT-06
- [ ] `src/features/people/__tests__/person.service.test.ts` -- covers INPUT-07 (getAdjacentPerson)
- [ ] `src/hooks/__tests__/use-grid-autosave.test.ts` -- covers INPUT-14 (conflict detection extension)

## Open Questions

1. **Sidebar allocation summary: endpoint design**
   - What we know: The sidebar needs a status dot per person showing their overall allocation status for the current month. The `listPeople` endpoint currently returns person metadata without allocation data.
   - What's unclear: Whether to add a `withStatus=true` query param to the existing `GET /api/people` endpoint, or create a separate `GET /api/people/status` endpoint.
   - Recommendation: Modify `listPeople` service to optionally LEFT JOIN allocations, GROUP BY person, SUM hours for current month, and return status alongside person data. Single endpoint, single query, no N+1.

2. **Drag-to-fill: vertical or horizontal only?**
   - What we know: INPUT-09 says "replicate value across months" which is horizontal. The ARCHITECTURE.md says "mousedown on corner handle, mousemove to extend selection, mouseup to fill."
   - What's unclear: Whether vertical fill (same month, across projects) is also needed.
   - Recommendation: Implement horizontal-only (across months for same project row) per INPUT-09 wording. Vertical fill is a v2 feature if needed.

3. **Conflict detection granularity**
   - What we know: `updatedAt` exists on every allocation row. The batch upsert updates it on every write.
   - What's unclear: Whether conflict detection should be per-cell (individual allocation) or per-person (any change to any allocation for the person triggers conflict).
   - Recommendation: Per-cell detection. Compare `updatedAt` for the specific `(personId, projectId, month)` tuple. This avoids false positives when two users edit different projects for the same person.

## Sources

### Primary (HIGH confidence)
- AG Grid Keyboard Navigation docs (Community) - https://www.ag-grid.com/react-data-grid/keyboard-navigation/
- AG Grid Clipboard docs (Enterprise-only confirmed) - https://www.ag-grid.com/react-data-grid/clipboard/
- AG Grid Cell Editing Start/Stop docs - https://www.ag-grid.com/javascript-data-grid/cell-editing-start-stop/
- ARCHITECTURE.md Sections 5 (file structure), 6.2 (getAdjacentPerson), 6.23 (clipboard-handler.ts), Risk R1 (drag-to-fill), Risk R2 (clipboard), Risk R5 (concurrent editing)
- Creative direction prototype `08-person-input-sidebar.html` -- exact sidebar design with department grouping
- Existing Phase 6 codebase: `allocation-grid.tsx`, `grid-config.ts`, `use-grid-autosave.ts`, `allocation.service.ts`, `capacity.ts`

### Secondary (MEDIUM confidence)
- AG Grid Community vs Enterprise comparison - https://www.ag-grid.com/react-data-grid/community-vs-enterprise/
- Browser Clipboard API (`paste` event) - standard Web API, well-documented

### Tertiary (LOW confidence)
- `enterNavigatesAfterEdit` prop name -- needs verification against AG Grid 35.x API reference at implementation time
- Drag-to-fill handle positioning via `getCellRendererInstances` -- may need alternative approach if AG Grid doesn't expose cell DOM positions reliably

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new deps; all Community features verified against AG Grid docs
- Architecture: HIGH - ARCHITECTURE.md provides file structure, service specs, clipboard handler spec, and risk mitigations
- Pitfalls: HIGH - clipboard Enterprise-only is confirmed; other pitfalls from codebase inspection and AG Grid docs
- Keyboard navigation: HIGH - `tabToNextCell` and `navigateToNextCell` are documented Community callbacks
- Clipboard paste: HIGH - confirmed Enterprise-only; custom handler spec in ARCHITECTURE.md Section 6.23
- Drag-to-fill: MEDIUM - custom implementation approach is clear but positioning details need implementation-time verification
- Conflict detection: MEDIUM - `updatedAt` infrastructure exists in schema; flow is straightforward but edge cases need testing

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (AG Grid stable, architecture locked)
