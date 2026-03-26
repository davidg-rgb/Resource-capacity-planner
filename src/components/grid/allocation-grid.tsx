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
  personId,
  addedProjects,
  onCellChange,
  onAddProject,
}: AllocationGridProps) {
  const gridRef = useRef<GridApi | null>(null);

  // Generate 12 months: 6 months back + current + 5 months forward
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
    return generateMonthRange(startMonth, 12);
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
    <div className="h-[600px] w-full">
      <AgGridReact
        modules={modules}
        rowData={localRowData}
        columnDefs={columnDefs}
        pinnedBottomRowData={pinnedBottomRowData}
        onCellValueChanged={handleCellValueChanged}
        components={components}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        onGridReady={(params: GridReadyEvent) => {
          gridRef.current = params.api;
        }}
        getRowId={(params) => params.data.projectId}
        defaultColDef={{
          sortable: false,
          filter: false,
          resizable: true,
        }}
        domLayout="autoHeight"
      />
    </div>
  );
}
