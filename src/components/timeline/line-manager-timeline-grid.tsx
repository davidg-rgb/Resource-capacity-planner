'use client';

// v5.0 — Phase 41 / Plan 41-03 (UX-V5-05): Line Manager group timeline grid.
//
// ag-grid community flat-row master/detail override (CONTEXT D-12 /
// 41-RESEARCH § ag-grid Master/Detail Risk).
//
//   ag-grid-community ^35 does NOT ship master/detail (enterprise-only).
//   Instead we model the group timeline as a flat row array interleaved
//   with synthetic per-project child rows:
//
//     rowData: Array<
//       | { kind: 'person'; personId; personName; departmentId; monthTotals; projects }
//       | { kind: 'project'; personId; projectId; projectName; months }
//     >
//
//   Expand state is `useState<Set<string>>(personId set)`. Toggling
//   recomputes rowData; ag-grid diffs via `getRowId` which uses disjoint
//   namespaces to avoid row-id collisions:
//
//     person rows  → 'person:<personId>'
//     project rows → 'project:<personId>:<projectId>'
//
//   Child rows get a `lm-child-row` class via rowClassRules (visual indent
//   only — NOT ag-grid tree mode).
//
// Rendering: the person-name column's cellRenderer is LmPersonColumnCell
// (disclosure triangle for person rows, indented project name for child
// rows). Each month column renders LmTimelineCell which:
//   - on person rows: shows an editable PlanVsActualCell that routes
//     through resolveEditGate → direct patch for in-dept LM
//   - on project rows: renders read-only per-project hours

import { useCallback, useMemo, useState } from 'react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ICellRendererParams,
  type RowClassRules,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

import type { GroupTimelineView } from '@/features/planning/planning.read';

import { LmPersonColumnCell, LmTimelineCell } from './lm-timeline-cell';

ModuleRegistry.registerModules([AllCommunityModule]);

const modules = [AllCommunityModule];

// ---------------------------------------------------------------------------
// Row shape
// ---------------------------------------------------------------------------

export interface LmPersonRow {
  kind: 'person';
  personId: string;
  personName: string;
  departmentId: string | null;
  /** monthKey → summed hours across all projects */
  monthTotals: Record<string, number>;
  projects: Array<{
    projectId: string;
    projectName: string;
    months: Record<string, number>;
    allocationIds: Record<string, string>;
  }>;
}

export interface LmProjectRow {
  kind: 'project';
  personId: string;
  projectId: string;
  projectName: string;
  months: Record<string, number>;
  allocationIds: Record<string, string>;
}

export type LmRow = LmPersonRow | LmProjectRow;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LmPatchArgs {
  allocationId: string;
  personId: string;
  projectId: string;
  monthKey: string;
  hours: number;
  confirmHistoric?: boolean;
}

export interface LineManagerTimelineGridProps {
  view: GroupTimelineView;
  departmentId: string | null;
  /** 'YYYY-MM' from getCurrentMonth() — used by LmTimelineCell for historic gating. */
  currentMonth: string;
  onPatchAllocation: (args: LmPatchArgs) => Promise<void>;
}

interface LmGridContext {
  currentMonth: string;
  expanded: Set<string>;
  onToggleExpand: (personId: string) => void;
  onPatchAllocation: LineManagerTimelineGridProps['onPatchAllocation'];
}

// ---------------------------------------------------------------------------
// Cell renderers (registered with ag-grid by name)
// ---------------------------------------------------------------------------

function LmPersonColumnRenderer(params: ICellRendererParams<LmRow>) {
  const row = params.data;
  const ctx = params.context as LmGridContext | undefined;
  if (!row || !ctx) return null;
  const expanded =
    row.kind === 'person' ? ctx.expanded.has(row.personId) : ctx.expanded.has(row.personId);
  return (
    <LmPersonColumnCell row={row} expanded={expanded} onToggleExpand={ctx.onToggleExpand} />
  );
}

interface MonthCellParams extends ICellRendererParams<LmRow> {
  monthKey?: string;
}

function LmMonthCellRenderer(params: MonthCellParams) {
  const row = params.data;
  const ctx = params.context as LmGridContext | undefined;
  const colIdRaw = (params.colDef as { colId?: string } | undefined)?.colId;
  const monthKey = params.monthKey ?? (colIdRaw ? colIdRaw.replace(/^m_/, '') : undefined);
  if (!row || !ctx || !monthKey) return null;
  return (
    <LmTimelineCell
      row={row}
      monthKey={monthKey}
      currentMonth={ctx.currentMonth}
      onPatchAllocation={ctx.onPatchAllocation}
    />
  );
}

// ---------------------------------------------------------------------------
// Flat row builder
// ---------------------------------------------------------------------------

export function buildLmRows(
  view: GroupTimelineView,
  departmentId: string | null,
  expanded: Set<string>,
): LmRow[] {
  const out: LmRow[] = [];
  for (const person of view.persons) {
    const monthTotals: Record<string, number> = {};
    for (const mk of view.monthRange) monthTotals[mk] = 0;
    for (const proj of person.projects) {
      for (const mk of view.monthRange) {
        monthTotals[mk] = (monthTotals[mk] ?? 0) + (proj.months[mk] ?? 0);
      }
    }
    const personRow: LmPersonRow = {
      kind: 'person',
      personId: person.personId,
      personName: person.personName,
      departmentId,
      monthTotals,
      projects: person.projects,
    };
    out.push(personRow);
    if (expanded.has(person.personId)) {
      for (const proj of person.projects) {
        out.push({
          kind: 'project',
          personId: person.personId,
          projectId: proj.projectId,
          projectName: proj.projectName,
          months: proj.months,
          allocationIds: proj.allocationIds,
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Grid component
// ---------------------------------------------------------------------------

export function LineManagerTimelineGrid(props: LineManagerTimelineGridProps) {
  const { view, departmentId, currentMonth, onPatchAllocation } = props;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const onToggleExpand = useCallback((personId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }, []);

  const rowData = useMemo(
    () => buildLmRows(view, departmentId, expanded),
    [view, departmentId, expanded],
  );

  const columnDefs = useMemo<ColDef<LmRow>[]>(() => {
    const personCol: ColDef<LmRow> = {
      colId: 'personName',
      headerName: 'Person',
      pinned: 'left',
      width: 240,
      cellRenderer: 'lmPersonColumnRenderer',
    };
    const monthCols: ColDef<LmRow>[] = view.monthRange.map((month) => ({
      colId: `m_${month}`,
      headerName: month,
      width: 140,
      cellRenderer: 'lmMonthCellRenderer',
      cellRendererParams: { monthKey: month },
    }));
    return [personCol, ...monthCols];
  }, [view.monthRange]);

  const components = useMemo(
    () => ({
      lmPersonColumnRenderer: LmPersonColumnRenderer,
      lmMonthCellRenderer: LmMonthCellRenderer,
    }),
    [],
  );

  const gridContext = useMemo<LmGridContext>(
    () => ({
      currentMonth,
      expanded,
      onToggleExpand,
      onPatchAllocation,
    }),
    [currentMonth, expanded, onToggleExpand, onPatchAllocation],
  );

  const rowClassRules = useMemo<RowClassRules<LmRow>>(
    () => ({
      'lm-child-row': (params) => params.data?.kind === 'project',
    }),
    [],
  );

  return (
    <div
      className="ag-theme-custom border-outline-variant/15 bg-surface-container-lowest overflow-hidden rounded-sm border shadow-sm"
      style={{ width: '100%', height: 600 }}
      data-testid="lm-timeline-grid"
    >
      <AgGridReact
        modules={modules}
        rowData={rowData}
        columnDefs={columnDefs}
        components={components}
        context={gridContext}
        getRowId={(params) =>
          params.data.kind === 'person'
            ? `person:${params.data.personId}`
            : `project:${params.data.personId}:${params.data.projectId}`
        }
        rowHeight={100}
        rowClassRules={rowClassRules}
        defaultColDef={{ sortable: false, filter: false, resizable: true }}
      />
    </div>
  );
}
