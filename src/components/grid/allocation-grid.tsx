'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AllCommunityModule,
  type CellValueChangedEvent,
  type GridApi,
  type GridReadyEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

import type { FlatAllocation, GridRow } from '@/features/allocations/allocation.types';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';
import {
  buildColumnDefs,
  computePinnedRows,
  transformToGridRows,
  createAddProjectRow,
} from '@/components/grid/grid-config';
import { StatusCell } from '@/components/grid/cell-renderers/status-cell';
import { ProjectCell } from '@/components/grid/cell-renderers/project-cell';
import { parseClipboardText, mapPasteToGridCells } from '@/lib/clipboard-handler';
import { tabToNextCell, navigateToNextCell } from '@/hooks/use-keyboard-nav';
import { DragToFillHandle } from '@/components/grid/drag-to-fill-handle';

type AllocationGridProps = {
  allocations: FlatAllocation[];
  targetHours: number;
  personId: string;
  addedProjects: { projectId: string; projectName: string }[];
  onCellChange: (change: { projectId: string; month: string; hours: number }) => void;
  onAddProject: () => void;
};

const modules = [AllCommunityModule];

export function AllocationGrid({
  allocations,
  targetHours,
  personId: _personId,
  addedProjects,
  onCellChange,
  onAddProject,
}: AllocationGridProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const localRowDataRef = useRef<GridRow[]>([]);

  // GridApi as state (not ref) so DragToFillHandle re-renders when API becomes available
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  // Generate 24 months: 6 months back + current + 17 months forward
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const months = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    let startY = y;
    let startM = m - 6;
    if (startM < 1) {
      startM += 12;
      startY--;
    }
    const startMonth = `${startY}-${String(startM).padStart(2, '0')}`;
    return generateMonthRange(startMonth, 24);
  }, [currentMonth]);

  const columnDefs = useMemo(
    () => buildColumnDefs(months, currentMonth),
    [months, currentMonth],
  );

  // BLOCKER 3 FIX: Local row data state for real-time SUMMA updates.
  // Server-derived rows (from allocations prop) seed localRowData.
  // Cell edits update localRowData synchronously so pinnedBottomRowData recomputes immediately.
  const serverRowData = useMemo(() => {
    const dataRows = transformToGridRows(allocations, months, addedProjects);
    return [...dataRows, createAddProjectRow()];
  }, [allocations, months, addedProjects]);

  const [localRowData, setLocalRowData] = useState<GridRow[]>(serverRowData);

  // Sync local state when server data changes (after save + invalidation)
  useEffect(() => {
    setLocalRowData(serverRowData);
  }, [serverRowData]);

  // Pinned rows computed from LOCAL row data (not server data) for real-time updates
  const pinnedBottomRowData = useMemo(
    () =>
      computePinnedRows(
        localRowData.filter((r) => !r.isAddRow),
        months,
        targetHours,
      ),
    [localRowData, months, targetHours],
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      if (event.node?.isRowPinned()) return;
      if (event.data?.isAddRow) return;
      const projectId = event.data?.projectId;
      const month = event.colDef?.field;
      if (!projectId || !month || month === 'projectName') return;
      const hours = Number(event.newValue) || 0;

      // BLOCKER 3 FIX: Update local state synchronously so SUMMA recomputes immediately
      setLocalRowData((prev) =>
        prev.map((row) =>
          row.projectId === projectId ? { ...row, [month]: hours } : row,
        ),
      );

      // Trigger debounced auto-save to server
      onCellChange({ projectId, month, hours });
    },
    [onCellChange],
  );

  // Keep ref in sync for stale-closure-safe paste handler
  useEffect(() => {
    localRowDataRef.current = localRowData;
  }, [localRowData]);

  // ---------------------------------------------------------------------------
  // Drag-to-fill callback: update local state and trigger autosave for each cell
  // ---------------------------------------------------------------------------
  const handleFill = useCallback(
    (cells: { projectId: string; month: string; hours: number }[]) => {
      // Batch update local state
      setLocalRowData((prev) => {
        const updated = [...prev];
        for (const cell of cells) {
          const idx = updated.findIndex((r) => r.projectId === cell.projectId);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], [cell.month]: cell.hours };
          }
        }
        return updated;
      });

      // Trigger autosave for each filled cell
      for (const cell of cells) {
        onCellChange({ projectId: cell.projectId, month: cell.month, hours: cell.hours });
      }
    },
    [onCellChange],
  );

  // ---------------------------------------------------------------------------
  // Clipboard paste handler
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    function handlePaste(e: ClipboardEvent) {
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;
      e.preventDefault();

      if (!gridApi) return;

      const focusedCell = gridApi.getFocusedCell();
      if (!focusedCell) return;

      const colId = focusedCell.column.getColId();
      const monthIndex = months.indexOf(colId);
      if (monthIndex === -1) return; // Focused on projectName column

      // Use ref to avoid stale closure
      const dataRows = localRowDataRef.current.filter((r) => !r.isAddRow);

      const parsed = parseClipboardText(text);
      const { cells, errors, skippedReadOnly } = mapPasteToGridCells(
        parsed,
        focusedCell.rowIndex,
        monthIndex,
        dataRows,
        months,
        currentMonth,
      );

      if (errors.length > 0) {
        console.warn(`Paste: ${errors.length} invalid value(s) skipped`, errors);
      }
      if (skippedReadOnly > 0) {
        console.info(`Paste: ${skippedReadOnly} cell(s) skipped (past months are read-only)`);
      }

      if (cells.length === 0) return;

      // Batch update local state
      setLocalRowData((prev) => {
        const updated = [...prev];
        for (const cell of cells) {
          const idx = updated.findIndex((r) => r.projectId === cell.projectId);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], [cell.month]: cell.hours };
          }
        }
        return updated;
      });

      // Trigger autosave for each pasted cell
      for (const cell of cells) {
        onCellChange({ projectId: cell.projectId, month: cell.month, hours: cell.hours });
      }
    }

    container.addEventListener('paste', handlePaste);
    return () => container.removeEventListener('paste', handlePaste);
  }, [months, currentMonth, onCellChange, gridApi]);

  // Custom components map
  const components = useMemo(
    () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projectCellRenderer: (params: any) => (
        <ProjectCell {...params} onAddProject={onAddProject} />
      ),
      statusCellRenderer: StatusCell,
    }),
    [onAddProject],
  );

  return (
    <div ref={gridContainerRef} className="relative h-[600px] w-full outline-none" tabIndex={0}>
      <AgGridReact
        modules={modules}
        rowData={localRowData}
        columnDefs={columnDefs}
        pinnedBottomRowData={pinnedBottomRowData}
        onCellValueChanged={handleCellValueChanged}
        components={components}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        enterNavigatesVertically={true}
        enterNavigatesVerticallyAfterEdit={true}
        tabToNextCell={tabToNextCell}
        navigateToNextCell={navigateToNextCell}
        onGridReady={(params: GridReadyEvent) => {
          setGridApi(params.api);
        }}
        getRowId={(params) => params.data.projectId}
        defaultColDef={{
          sortable: false,
          filter: false,
          resizable: true,
        }}
        domLayout="autoHeight"
      />
      <DragToFillHandle
        gridApi={gridApi}
        gridContainerRef={gridContainerRef}
        months={months}
        currentMonth={currentMonth}
        localRowData={localRowData}
        onFill={handleFill}
      />
    </div>
  );
}
