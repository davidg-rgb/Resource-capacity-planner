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
} from 'ag-grid-community';

/**
 * Tab/Shift+Tab navigation callback.
 * Moves to the next editable cell, skipping pinned rows (SUMMA, Target, Status).
 * Returns false at grid boundaries to prevent wrapping.
 */
export function tabToNextCell(
  params: TabToNextCellParams,
): CellPosition | boolean {
  const { nextCellPosition } = params;

  // At grid boundary -- stop
  if (!nextCellPosition) return false;

  // Skip pinned rows (SUMMA, Target, Status)
  if (nextCellPosition.rowPinned != null) return false;

  return nextCellPosition;
}

/**
 * Arrow key navigation callback.
 * Moves to the adjacent cell, staying put at grid boundaries
 * and skipping pinned rows.
 */
export function navigateToNextCell(
  params: NavigateToNextCellParams,
): CellPosition | null {
  const { previousCellPosition, nextCellPosition } = params;

  // At grid boundary -- stay put
  if (!nextCellPosition) return previousCellPosition;

  // Skip pinned rows -- stay put
  if (nextCellPosition.rowPinned != null) return previousCellPosition;

  return nextCellPosition;
}
