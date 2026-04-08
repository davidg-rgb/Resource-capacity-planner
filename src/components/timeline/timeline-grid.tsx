'use client';

// v5.0 — Phase 40 / Plan 40-04 (Wave 3): thin ag-grid wrapper for the PM
// project timeline. Mirrors `src/components/grid/allocation-grid.tsx` bootstrap
// (ModuleRegistry + AllCommunityModule + AgGridReact). Rows = people,
// columns = months (from monthRange), cell renderer = PmTimelineCell.

import { useMemo } from 'react';
import { AllCommunityModule, ModuleRegistry, type ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

import type { CellView, PmTimelineView } from '@/features/planning/planning.read';
import { PmTimelineCell } from './pm-timeline-cell';
import { buildTimelineColumns } from './timeline-columns';

ModuleRegistry.registerModules([AllCommunityModule]);

const modules = [AllCommunityModule];

export interface TimelineGridProps {
  view: PmTimelineView;
  /** 'YYYY-MM' from getCurrentMonth() — used by PmTimelineCell for historic gating. */
  currentMonth: string;
  onAllocationPatch: (args: {
    allocationId: string;
    hours: number;
    confirmHistoric?: boolean;
  }) => Promise<void>;
}

interface TimelineRow {
  personId: string;
  personName: string;
  departmentId: string | null;
  // Cell columns keyed as `m_${monthKey}` — value is the CellView.
  [monthField: string]: CellView | string | null;
}

interface TimelineGridContext {
  projectId: string;
  currentMonth: string;
  onAllocationPatch: TimelineGridProps['onAllocationPatch'];
}

function PmTimelineCellRenderer(params: ICellRendererParams<TimelineRow, CellView>) {
  const cell = params.value;
  const row = params.data;
  const ctx = params.context as TimelineGridContext | undefined;
  if (!cell || !row || !ctx) return null;
  return (
    <PmTimelineCell
      cell={cell}
      projectId={ctx.projectId}
      currentMonth={ctx.currentMonth}
      targetPerson={{ id: row.personId, departmentId: row.departmentId }}
      onAllocationPatch={ctx.onAllocationPatch}
    />
  );
}

export function TimelineGrid(props: TimelineGridProps) {
  const { view, currentMonth, onAllocationPatch } = props;

  const columnDefs = useMemo(() => buildTimelineColumns(view.monthRange), [view.monthRange]);

  const rowData = useMemo<TimelineRow[]>(() => {
    // Index cells by `${personId}::${monthKey}` for O(1) pivot.
    const byKey = new Map<string, CellView>();
    for (const c of view.cells) {
      byKey.set(`${c.personId}::${c.monthKey}`, c);
    }
    return view.people.map((person) => {
      const row: TimelineRow = {
        personId: person.id,
        personName: person.name,
        departmentId: person.departmentId,
      };
      for (const monthKey of view.monthRange) {
        row[`m_${monthKey}`] = byKey.get(`${person.id}::${monthKey}`) ?? null;
      }
      return row;
    });
  }, [view.cells, view.people, view.monthRange]);

  const components = useMemo(() => ({ pmTimelineCellRenderer: PmTimelineCellRenderer }), []);

  const gridContext = useMemo<TimelineGridContext>(
    () => ({ projectId: view.project.id, currentMonth, onAllocationPatch }),
    [view.project.id, currentMonth, onAllocationPatch],
  );

  return (
    <div
      className="ag-theme-custom border-outline-variant/15 bg-surface-container-lowest overflow-hidden rounded-sm border shadow-sm"
      style={{ width: '100%', height: 600 }}
      data-testid="pm-timeline-grid"
    >
      <AgGridReact
        modules={modules}
        rowData={rowData}
        columnDefs={columnDefs}
        components={components}
        context={gridContext}
        getRowId={(params) => params.data.personId}
        rowHeight={100}
        defaultColDef={{ sortable: false, filter: false, resizable: true }}
      />
    </div>
  );
}
