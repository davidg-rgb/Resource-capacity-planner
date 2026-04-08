'use client';

// v5.0 — Phase 39 / Plan 39-07 (PROP-04): Line Manager approval queue component.
// Lists pending proposals for the active persona's department with impact
// preview, approve, and reject-with-reason. Optimistic removal via react-query
// invalidation on success.
//
// Impact phrase format from REQUIREMENTS PROP-04:
//   "Sara's June utilization 40% → 90%"
// We render hours (40h → 90h) rather than percentages because the impact
// endpoint returns raw hours; Plan 39-09 may revisit wording during the i18n
// sweep.

import { useState } from 'react';

import {
  useApproveProposal,
  useListProposals,
  useProposalImpact,
  useRejectProposal,
} from '../use-proposals';
import type { ProposalDTO } from '../proposal.types';
import { RejectModal } from './reject-modal';
import { WishCard } from './wish-card';

interface ApprovalQueueProps {
  departmentId: string;
}

export function ApprovalQueue({ departmentId }: ApprovalQueueProps) {
  const { data, isLoading, error } = useListProposals({ status: 'proposed', departmentId });
  const approve = useApproveProposal();
  const reject = useRejectProposal();
  const [rejectTarget, setRejectTarget] = useState<ProposalDTO | null>(null);

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading…</div>;
  }
  if (error) {
    return <div className="text-destructive text-sm">Failed to load: {String(error)}</div>;
  }

  const proposals = data?.proposals ?? [];
  if (proposals.length === 0) {
    return <div className="text-muted-foreground text-sm">No pending wishes.</div>;
  }

  return (
    <div className="space-y-2" data-testid="approval-queue">
      {proposals.map((p) => (
        <QueueRow
          key={p.id}
          proposal={p}
          onApprove={() => approve.mutateAsync({ proposalId: p.id, departmentId })}
          onReject={() => setRejectTarget(p)}
          disabled={approve.isPending || reject.isPending}
        />
      ))}
      {rejectTarget && (
        <RejectModal
          key={rejectTarget.id}
          open
          pending={reject.isPending}
          onClose={() => setRejectTarget(null)}
          onConfirm={async (reason) => {
            await reject.mutateAsync({ proposalId: rejectTarget.id, departmentId, reason });
            setRejectTarget(null);
          }}
        />
      )}
    </div>
  );
}

interface QueueRowProps {
  proposal: ProposalDTO;
  onApprove: () => void;
  onReject: () => void;
  disabled: boolean;
}

function QueueRow({ proposal, onApprove, onReject, disabled }: QueueRowProps) {
  const { data: impact } = useProposalImpact(proposal.id);
  // Matches REQUIREMENTS phrase pattern: "Sara's June utilization 40% → 90%".
  const impactText = impact
    ? `${impact.personName}'s ${formatMonthLabel(impact.month)} utilization ${impact.personMonthPlannedBefore}h → ${impact.personMonthPlannedAfter}h`
    : undefined;

  return (
    <WishCard
      proposal={proposal}
      impactText={impactText}
      onApprove={onApprove}
      onReject={onReject}
      disabled={disabled}
    />
  );
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatMonthLabel(month: string): string {
  // 'YYYY-MM' → 'Month name'; Plan 39-09 will i18n properly.
  const [, m] = month.split('-');
  const idx = Number(m) - 1;
  return MONTH_NAMES[idx] ?? month;
}
