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
    personId: string;
    projectId: string;
    monthKey: string;
    hours: number;
    confirmHistoric?: boolean;
  }) => Promise<void>;
}

type PendingHistoric = { hours: number; projectId: string } | null;

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
  const firstProject = personRow.projects[0];
  // Use the first project's id as the edit target. If the person has no
  // projects we fall back to a synthetic sentinel so the cell still renders
  // (onCellEdit will be a no-op because there is nothing to patch).
  const editProjectId = firstProject?.projectId ?? '';

  async function runDirectPatch(hours: number, confirmHistoric: boolean, projectId: string) {
    if (!projectId) return;
    await onPatchAllocation({
      personId: personRow.personId,
      projectId,
      monthKey,
      hours,
      confirmHistoric,
    });
  }

  async function handleEdit(nextHours: number) {
    if (!editProjectId) return;
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
      await runDirectPatch(nextHours, false, editProjectId);
      return;
    }
    if (decision === 'historic-warn-direct') {
      setPendingHistoric({ hours: nextHours, projectId: editProjectId });
      return;
    }
    // 'proposal' / 'historic-warn-proposal' should not occur for in-dept LM.
    // LM viewing only their own department means every target is in-dept.
  }

  async function handleHistoricConfirm() {
    if (!pendingHistoric) return;
    await runDirectPatch(pendingHistoric.hours, true, pendingHistoric.projectId);
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
