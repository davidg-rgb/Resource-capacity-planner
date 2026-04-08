'use client';

// v5.0 — Phase 40 / Plan 40-04 (Wave 3): PM timeline cell orchestrator.
//
// Wraps PlanVsActualCell (which owns its own internal 600ms debounce per
// 40-RESEARCH Pitfall 7) and routes edits through `resolveEditGate`:
//
//   'direct'                 → PATCH /api/v5/planning/allocations/[id] (confirmHistoric: false)
//   'proposal'               → open ProposalCell popover (submit-wish button)
//   'historic-warn-direct'   → HistoricEditDialog → confirm → PATCH (confirmHistoric: true)
//   'historic-warn-proposal' → HistoricEditDialog → confirm → ProposalCell popover
//   'blocked'                → no-op (staff persona only)
//
// All 7 edit-gate branches from D-11 are handled here.

import { useState } from 'react';

import { PlanVsActualCell } from '@/components/timeline/PlanVsActualCell';
import { ProposalCell } from '@/features/proposals/ui/proposal-cell';
import { HistoricEditDialog } from '@/components/dialogs/historic-edit-dialog';
import { resolveEditGate } from '@/features/proposals/edit-gate';
import { usePersona } from '@/features/personas/persona.context';
import type { CellView } from '@/features/planning/planning.read';

export interface PmTimelineCellProps {
  cell: CellView;
  projectId: string;
  /** 'YYYY-MM' from getCurrentMonth() — used by resolveEditGate to determine historic-ness. */
  currentMonth: string;
  targetPerson: { id: string; departmentId: string | null };
  onAllocationPatch: (args: {
    allocationId: string;
    hours: number;
    confirmHistoric?: boolean;
  }) => Promise<void>;
}

type PendingHistoric = { hours: number; nextStep: 'direct' | 'proposal' } | null;
type ShowProposal = { hours: number } | null;

export function PmTimelineCell(props: PmTimelineCellProps) {
  const { persona } = usePersona();
  const [pendingHistoric, setPendingHistoric] = useState<PendingHistoric>(null);
  const [showProposalPopover, setShowProposalPopover] = useState<ShowProposal>(null);

  const delta =
    props.cell.actualHours === null ? null : props.cell.actualHours - props.cell.plannedHours;

  async function runDirectPatch(hours: number, confirmHistoric: boolean) {
    if (!props.cell.allocationId) return;
    await props.onAllocationPatch({
      allocationId: props.cell.allocationId,
      hours,
      confirmHistoric,
    });
  }

  async function handleEdit(nextHours: number) {
    const decision = resolveEditGate({
      persona,
      targetPerson: {
        id: props.targetPerson.id,
        departmentId: props.targetPerson.departmentId ?? '',
      },
      month: props.cell.monthKey,
      currentMonth: props.currentMonth,
    });

    if (decision === 'blocked') return;
    if (decision === 'direct') {
      await runDirectPatch(nextHours, false);
      return;
    }
    if (decision === 'proposal') {
      setShowProposalPopover({ hours: nextHours });
      return;
    }
    if (decision === 'historic-warn-direct') {
      setPendingHistoric({ hours: nextHours, nextStep: 'direct' });
      return;
    }
    if (decision === 'historic-warn-proposal') {
      setPendingHistoric({ hours: nextHours, nextStep: 'proposal' });
      return;
    }
  }

  async function handleHistoricConfirm() {
    if (!pendingHistoric) return;
    if (pendingHistoric.nextStep === 'direct') {
      await runDirectPatch(pendingHistoric.hours, true);
    } else {
      setShowProposalPopover({ hours: pendingHistoric.hours });
    }
    setPendingHistoric(null);
  }

  return (
    <div className="relative">
      <PlanVsActualCell
        planned={props.cell.plannedHours}
        actual={props.cell.actualHours}
        delta={delta}
        personId={props.targetPerson.id}
        projectId={props.projectId}
        monthKey={props.cell.monthKey}
        onCellEdit={handleEdit}
      />
      {pendingHistoric && (
        <HistoricEditDialog
          open
          targetMonthKey={props.cell.monthKey}
          onCancel={() => setPendingHistoric(null)}
          onConfirm={() => {
            void handleHistoricConfirm();
          }}
        />
      )}
      {showProposalPopover && (
        <div className="absolute top-full left-0 z-40">
          <ProposalCell
            personId={props.targetPerson.id}
            projectId={props.projectId}
            month={props.cell.monthKey}
            initialHours={showProposalPopover.hours}
            onSubmitted={() => setShowProposalPopover(null)}
            onCancelled={() => setShowProposalPopover(null)}
          />
        </div>
      )}
    </div>
  );
}
