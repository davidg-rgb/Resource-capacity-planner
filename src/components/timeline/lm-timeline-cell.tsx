'use client';

// v5.0 — Phase 41 / Plan 41-03: LM timeline cell.
//
// Two concerns:
//   1. "person-name" column cell renderer: for `kind: 'person'` rows, shows
//      a `<button aria-expanded>` disclosure triangle that calls
//      `context.onToggleExpand(personId)`. For `kind: 'project'` rows, shows
//      the project name indented (no triangle).
//   2. Month value cell renderer: wraps PlanVsActualCell and routes edits
//      through `resolveEditGate`. In-department people on a non-historic
//      month take the `direct` branch and call `context.onPatchAllocation`.
//      Historic direct edits open HistoricEditDialog first. Child rows
//      (`kind: 'project'`) are read-only — child rows are a breakdown, all
//      edits happen on the aggregate person row.

import { useState } from 'react';

import { PlanVsActualCell } from '@/components/timeline/PlanVsActualCell';
import { HistoricEditDialog } from '@/components/dialogs/historic-edit-dialog';
import { resolveEditGate } from '@/features/proposals/edit-gate';
import { usePersona } from '@/features/personas/persona.context';

import type { LmPersonRow, LmProjectRow, LmRow } from './line-manager-timeline-grid';

// ---------------------------------------------------------------------------
// Person column cell (disclosure triangle for person rows)
// ---------------------------------------------------------------------------

export interface LmPersonColumnCellProps {
  row: LmRow;
  expanded: boolean;
  onToggleExpand: (personId: string) => void;
}

export function LmPersonColumnCell(props: LmPersonColumnCellProps) {
  const { row, expanded, onToggleExpand } = props;

  if (row.kind === 'project') {
    return (
      <span
        data-testid={`lm-project-label-${row.personId}-${row.projectId}`}
        className="pl-8 text-sm text-neutral-700 dark:text-neutral-300"
      >
        {row.projectName}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        aria-expanded={expanded}
        data-testid={`lm-expand-toggle-${row.personId}`}
        onClick={() => onToggleExpand(row.personId)}
        className="text-on-surface-variant inline-flex h-6 w-6 items-center justify-center rounded-sm"
      >
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
      </button>
      <span className="font-medium">{row.personName}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Month value cell (direct-edit for person rows, read-only for project rows)
// ---------------------------------------------------------------------------

export interface LmTimelineCellProps {
  row: LmRow;
  monthKey: string;
  currentMonth: string;
  onPatchAllocation: (args: {
    allocationId: string;
    personId: string;
    projectId: string;
    monthKey: string;
    hours: number;
    confirmHistoric?: boolean;
  }) => Promise<void>;
}

type PendingHistoric = { hours: number; projectId: string; allocationId: string } | null;

export function LmTimelineCell(props: LmTimelineCellProps) {
  const { row, monthKey, currentMonth, onPatchAllocation } = props;
  const { persona } = usePersona();
  const [pendingHistoric, setPendingHistoric] = useState<PendingHistoric>(null);

  // Project (child) rows render the per-project value read-only.
  if (row.kind === 'project') {
    const projectRow = row as LmProjectRow;
    const hours = projectRow.months[monthKey] ?? 0;
    return (
      <div
        data-testid={`lm-project-cell-${projectRow.personId}-${projectRow.projectId}-${monthKey}`}
        className="text-on-surface-variant px-2 py-1 text-right text-xs tabular-nums"
      >
        {hours.toFixed(1)}
      </div>
    );
  }

  // Person (parent) rows render the aggregate as an editable PlanVsActualCell.
  const personRow = row as LmPersonRow;
  const aggregate = personRow.monthTotals[monthKey] ?? 0;
  // Choose the first project with a real allocationId for THIS month as the
  // edit target. If none exists (person has projects but not this month) the
  // cell is effectively read-only — editing a newly empty cell requires a
  // create-allocation path that is out of scope for Phase 41-03.
  const editTarget = personRow.projects
    .map((p) => ({ projectId: p.projectId, allocationId: p.allocationIds[monthKey] }))
    .find((t) => !!t.allocationId) ?? { projectId: '', allocationId: '' };
  const editProjectId = editTarget.projectId;
  const editAllocationId = editTarget.allocationId;

  async function runDirectPatch(
    hours: number,
    confirmHistoric: boolean,
    projectId: string,
    allocationId: string,
  ) {
    if (!projectId || !allocationId) return;
    await onPatchAllocation({
      allocationId,
      personId: personRow.personId,
      projectId,
      monthKey,
      hours,
      confirmHistoric,
    });
  }

  async function handleEdit(nextHours: number) {
    if (!editProjectId || !editAllocationId) return;
    const decision = resolveEditGate({
      persona,
      targetPerson: {
        id: personRow.personId,
        departmentId: personRow.departmentId ?? '',
      },
      month: monthKey,
      currentMonth,
    });

    if (decision === 'blocked') return;
    if (decision === 'direct') {
      await runDirectPatch(nextHours, false, editProjectId, editAllocationId);
      return;
    }
    if (decision === 'historic-warn-direct') {
      setPendingHistoric({
        hours: nextHours,
        projectId: editProjectId,
        allocationId: editAllocationId,
      });
      return;
    }
    // 'proposal' / 'historic-warn-proposal' should not occur for in-dept LM.
  }

  async function handleHistoricConfirm() {
    if (!pendingHistoric) return;
    await runDirectPatch(
      pendingHistoric.hours,
      true,
      pendingHistoric.projectId,
      pendingHistoric.allocationId,
    );
    setPendingHistoric(null);
  }

  return (
    <div
      className="relative"
      data-testid={`lm-person-cell-${personRow.personId}-${monthKey}`}
    >
      <PlanVsActualCell
        planned={aggregate}
        actual={null}
        delta={null}
        personId={personRow.personId}
        projectId={editProjectId}
        monthKey={monthKey}
        onCellEdit={handleEdit}
      />
      {pendingHistoric && (
        <HistoricEditDialog
          open
          targetMonthKey={monthKey}
          onCancel={() => setPendingHistoric(null)}
          onConfirm={() => {
            void handleHistoricConfirm();
          }}
        />
      )}
    </div>
  );
}
