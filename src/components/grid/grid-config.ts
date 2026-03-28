/**
 * Grid configuration: pure functions for AG Grid column definitions,
 * data transformation, and pinned row computation.
 *
 * No React imports -- this module is framework-agnostic.
 */

import type {
  ColDef,
  EditableCallbackParams,
  CellClassParams,
  ValueParserParams,
  ValueFormatterParams,
  CellRendererSelectorResult,
} from 'ag-grid-community';

import { formatMonthHeader } from '@/lib/date-utils';
import { calculateStatus } from '@/lib/capacity';
import type { FlatAllocation, GridRow } from '@/features/allocations/allocation.types';

// ---------------------------------------------------------------------------
// Data transformation
// ---------------------------------------------------------------------------

/**
 * Transform flat allocations into AG Grid row data.
 * Groups by projectId, with each month as a dynamic field.
 * Merges addedProjectIds (from "Add project" flow) as zero-hour rows.
 */
export function transformToGridRows(
  allocations: FlatAllocation[],
  months: string[],
  addedProjectIds?: { projectId: string; projectName: string }[],
): GridRow[] {
  const map = new Map<string, GridRow>();

  // Initialize rows from allocation data
  for (const alloc of allocations) {
    let row = map.get(alloc.projectId);
    if (!row) {
      row = { projectId: alloc.projectId, projectName: alloc.projectName };
      map.set(alloc.projectId, row);
    }
    row[alloc.month] = alloc.hours;
  }

  // Merge added projects that are not already in the map (INPUT-08)
  if (addedProjectIds) {
    for (const added of addedProjectIds) {
      if (!map.has(added.projectId)) {
        const row: GridRow = {
          projectId: added.projectId,
          projectName: added.projectName,
        };
        // Initialize all months to 0 so cells are editable
        for (const month of months) {
          row[month] = 0;
        }
        map.set(added.projectId, row);
      }
    }
  }

  // Sort by project name
  return Array.from(map.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

/**
 * Build AG Grid column definitions: pinned project name column + month columns.
 * Past months are non-editable with distinct styling (INPUT-12).
 * Status pinned row uses cellRendererSelector for color dots (INPUT-05).
 */
export function buildColumnDefs(months: string[], currentMonth: string): ColDef[] {
  const projectCol: ColDef = {
    field: 'projectName',
    headerName: 'Project',
    pinned: 'left' as const,
    width: 256,
    editable: false,
    cellRenderer: 'projectCellRenderer',
  };

  const monthCols: ColDef[] = months.map((month) => ({
    field: month,
    headerName: formatMonthHeader(month),
    width: 100,
    editable: (params: EditableCallbackParams) =>
      !params.node?.isRowPinned() && month >= currentMonth,
    cellClass: (params: CellClassParams) => {
      const classes = ['text-right', 'tabular-nums'];
      if (params.node?.isRowPinned()) {
        classes.push('font-semibold');
      }
      if (month < currentMonth) {
        classes.push('bg-surface-container-low', 'text-outline', 'opacity-60');
      }
      if (month === currentMonth) {
        classes.push('bg-primary-container/5');
      }
      return classes;
    },
    valueParser: (params: ValueParserParams) => {
      const val = Number(params.newValue);
      if (isNaN(val) || val < 0 || val > 999) return params.oldValue;
      return val;
    },
    valueFormatter: (params: ValueFormatterParams) => {
      if (params.value == null || params.value === '' || params.value === 0) return '';
      return String(params.value);
    },
    cellRendererSelector: (params: {
      node?: { isRowPinned: () => boolean } | null;
      data?: GridRow;
    }): CellRendererSelectorResult | undefined => {
      if (params.node?.isRowPinned() && params.data?.projectId === '__status__') {
        return { component: 'statusCellRenderer' };
      }
      return undefined;
    },
  }));

  return [projectCol, ...monthCols];
}

// ---------------------------------------------------------------------------
// Pinned row computation
// ---------------------------------------------------------------------------

/**
 * Compute SUMMA, Target, and Status pinned bottom rows from current grid data.
 * Uses local row data (not server data) so SUMMA updates in real time.
 */
export function computePinnedRows(
  rowData: GridRow[],
  months: string[],
  targetHours: number,
): GridRow[] {
  const summaRow: GridRow = { projectId: '__summa__', projectName: 'SUMMA' };
  const targetRow: GridRow = { projectId: '__target__', projectName: 'Target' };
  const statusRow: GridRow = { projectId: '__status__', projectName: 'Status' };

  for (const month of months) {
    const sum = rowData.reduce((acc, row) => acc + (Number(row[month]) || 0), 0);
    summaRow[month] = sum;
    targetRow[month] = targetHours;
    statusRow[month] = calculateStatus(sum, targetHours);
  }

  return [summaRow, targetRow, statusRow];
}

// ---------------------------------------------------------------------------
// Add-project row factory
// ---------------------------------------------------------------------------

/** Create the "Add project..." placeholder row displayed at the bottom of data rows. */
export function createAddProjectRow(): GridRow {
  return { projectId: '__add__', projectName: 'Add project...', isAddRow: true };
}
