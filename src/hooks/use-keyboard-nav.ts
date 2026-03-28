/**
 * AG Grid keyboard navigation callbacks.
 * Pure functions -- no React hooks or side effects.
 *
 * Note: Enter key behavior is handled by the `enterNavigatesAfterEdit` grid prop,
 * NOT in navigateToNextCell. This avoids double-move issues (Pitfall 6).
 */

import type {
  TabToNextCellParams,
  NavigateToNextCellParams,
  CellPosition,
  Column,
} from 'ag-grid-community';

import { getCurrentMonth } from '@/lib/date-utils';

/**
 * Returns true if a month column field is editable (current or future month).
 */
function isEditableMonth(field: string | undefined, currentMonth: string): boolean {
  if (!field) return false;
  // Month columns are YYYY-MM format; non-month columns (e.g. projectName) won't match
  if (!/^\d{4}-\d{2}$/.test(field)) return false;
  return field >= currentMonth;
}

/**
 * Tab/Shift+Tab navigation callback.
 * Moves to the next editable cell, skipping pinned rows and read-only (past) cells.
 * Wraps across rows when reaching grid boundaries.
 */
export function tabToNextCell(params: TabToNextCellParams): CellPosition | boolean {
  const { previousCellPosition, nextCellPosition, backwards, api } = params;
  const currentMonth = getCurrentMonth();

  // If AG Grid provides a next position that is valid, check if it's editable
  if (nextCellPosition && nextCellPosition.rowPinned == null) {
    const field = nextCellPosition.column.getColId();
    if (isEditableMonth(field, currentMonth)) {
      return nextCellPosition;
    }
  }

  // Need to find the next editable cell ourselves (boundary or read-only cell hit)
  const allColumns = api.getAllDisplayedColumns();
  const editableColumns = allColumns.filter((col: Column) =>
    isEditableMonth(col.getColId(), currentMonth),
  );
  if (editableColumns.length === 0) return false;

  const currentColId = previousCellPosition.column.getColId();
  const currentIdx = editableColumns.findIndex((col: Column) => col.getColId() === currentColId);
  const rowCount = api.getDisplayedRowCount();

  if (!backwards) {
    // Forward tab: try next editable column, or wrap to first editable column of next row
    const nextIdx = currentIdx + 1;
    if (nextIdx < editableColumns.length) {
      return {
        rowIndex: previousCellPosition.rowIndex,
        column: editableColumns[nextIdx],
        rowPinned: null,
      };
    }
    // Wrap to next row
    const nextRow = previousCellPosition.rowIndex + 1;
    if (nextRow < rowCount) {
      const node = api.getDisplayedRowAtIndex(nextRow);
      if (node && node.rowPinned != null) return false; // don't enter pinned rows
      return {
        rowIndex: nextRow,
        column: editableColumns[0],
        rowPinned: null,
      };
    }
    return false; // last row, last column -- stop
  } else {
    // Backward tab: try previous editable column, or wrap to last editable column of previous row
    const prevIdx = currentIdx >= 0 ? currentIdx - 1 : editableColumns.length - 1;
    if (prevIdx >= 0) {
      return {
        rowIndex: previousCellPosition.rowIndex,
        column: editableColumns[prevIdx],
        rowPinned: null,
      };
    }
    // Wrap to previous row
    const prevRow = previousCellPosition.rowIndex - 1;
    if (prevRow >= 0) {
      const node = api.getDisplayedRowAtIndex(prevRow);
      if (node && node.rowPinned != null) return false;
      return {
        rowIndex: prevRow,
        column: editableColumns[editableColumns.length - 1],
        rowPinned: null,
      };
    }
    return false; // first row, first column -- stop
  }
}

/**
 * Arrow key navigation callback.
 * Moves to the adjacent cell, staying put at grid boundaries
 * and skipping pinned rows.
 */
export function navigateToNextCell(params: NavigateToNextCellParams): CellPosition | null {
  const { previousCellPosition, nextCellPosition } = params;

  // At grid boundary -- stay put
  if (!nextCellPosition) return previousCellPosition;

  // Skip pinned rows -- stay put
  if (nextCellPosition.rowPinned != null) return previousCellPosition;

  return nextCellPosition;
}
