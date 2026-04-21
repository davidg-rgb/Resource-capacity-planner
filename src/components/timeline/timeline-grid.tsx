'use client';

// v5.0 — Phase 40 / Plan 40-04 (Wave 3): thin ag-grid wrapper for the PM
// project timeline. Mirrors `src/components/grid/allocation-grid.tsx` bootstrap
// (ModuleRegistry + AllCommunityModule + AgGridReact). Rows = people,
// columns = months (from monthRange), cell renderer = PmTimelineCell.

import { useCallback, useMemo } from 'react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type GridReadyEvent,
  type ICellRendererParams,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

import type { CellView, PmTimelineView } from '@/features/planning/planning.read';
import { PmTimelineCell } from './pm-timeline-cell';
import { PlanVsActualCell } from './PlanVsActualCell';
import { buildTimelineColumns, type TimelineZoom } from './timeline-columns';

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
  /** v5.0 Phase 42 Plan 42-03: month (default) | quarter | year. Re-renders columns
   *  client-side by re-aggregating month-grain data from row state. */
  zoom?: TimelineZoom;
  /**
   * v6.0 — Phase 52 / Plan 52-04 (STAFF-01 / D-10): defensive read-only variant.
   * When true:
   *   - no cell `onClick` handler wired
   *   - no hover edit affordances (no `cursor-pointer`, no hover border)
   *   - cells render as a static `<div>` (no inline input, no `<button>`)
   *   - plan/actual values still display
   * Default: false (current behavior preserved).
   * /staff currently uses its own HTML <table> (see `src/app/(app)/staff/page.tsx`)
   * so this prop is a defensive hook for a future migration; the E2E assertion
   * surface for STAFF-01 today is `data-editable="false"` on PlanVsActualCell.
   */
  readOnly?: boolean;
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
  readOnly: boolean;
}

function PmTimelineCellRenderer(params: ICellRendererParams<TimelineRow, CellView>) {
  const cell = params.value;
  const row = params.data;
  const ctx = params.context as TimelineGridContext | undefined;
  if (!cell || !row || !ctx) return null;
  // v6.0 — Phase 52 / Plan 52-04 (STAFF-01 / D-10): when readOnly,
  // render PlanVsActualCell directly (no PmTimelineCell wrapper → no
  // edit-gate wiring, no proposal popover, no historic dialog). The cell
  // surfaces `data-editable="false"` via PlanVsActualCell's read-only
  // branch because no `onCellEdit` prop is passed.
  if (ctx.readOnly) {
    const delta = cell.actualHours === null ? null : cell.actualHours - cell.plannedHours;
    return (
      <PlanVsActualCell
        planned={cell.plannedHours}
        actual={cell.actualHours}
        delta={delta}
        personId={row.personId}
        projectId={ctx.projectId}
        monthKey={cell.monthKey}
        aggregate={cell.aggregate}
      />
    );
  }
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
  const { view, currentMonth, onAllocationPatch, zoom = 'month', readOnly = false } = props;

  const columnDefs = useMemo(
    () => buildTimelineColumns(view.monthRange, zoom),
    [view.monthRange, zoom],
  );

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
    () => ({ projectId: view.project.id, currentMonth, onAllocationPatch, readOnly }),
    [view.project.id, currentMonth, onAllocationPatch, readOnly],
  );

  /** TC-UI-007: scroll the current month column into view on first render. */
  const handleGridReady = useCallback(
    (event: GridReadyEvent) => {
      if (!currentMonth) return;
      const colId = `m_${currentMonth}`;
      // ensureColumnVisible is a no-op if the column doesn't exist.
      try {
        event.api.ensureColumnVisible(colId, 'middle');
      } catch {
        // Column may not be in the current month range — ignore silently.
      }
    },
    [currentMonth],
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
        onGridReady={handleGridReady}
        getRowId={(params) => params.data.personId}
        rowHeight={100}
        defaultColDef={{ sortable: false, filter: false, resizable: true }}
      />
    </div>
  );
}
