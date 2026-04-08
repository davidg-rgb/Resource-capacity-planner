'use client';

// v5.0 — Phase 39 / Plan 39-07 (PROP-04): Line Manager approval queue component.
// Lists pending proposals for the active persona's department with impact
// preview, approve, and reject-with-reason. Optimistic removal via react-query
// invalidation on success.
//
// Impact phrase format from REQUIREMENTS PROP-04 (rendered through
// t('queue.impactPhrase', { name, monthName, before, after })).

import { useState } from 'react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('v5.proposals');

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">{t('queue.loading')}</div>;
  }
  if (error) {
    return (
      <div className="text-destructive text-sm">
        {t('queue.loadFailed', { error: String(error) })}
      </div>
    );
  }

  const proposals = data?.proposals ?? [];
  if (proposals.length === 0) {
    return <div className="text-muted-foreground text-sm">{t('queue.empty')}</div>;
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
  const t = useTranslations('v5.proposals');
  const tMonths = useTranslations('v5.proposals.months');
  const impactText = impact
    ? t('queue.impactPhrase', {
        name: impact.personName,
        monthName: monthLabel(impact.month, tMonths),
        before: impact.personMonthPlannedBefore,
        after: impact.personMonthPlannedAfter,
      })
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

function monthLabel(month: string, tMonths: ReturnType<typeof useTranslations>): string {
  // 'YYYY-MM' → localized month name; falls back to the raw value.
  const [, m] = month.split('-');
  if (!m) return month;
  try {
    return tMonths(
      m as '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12',
    );
  } catch {
    return month;
  }
}
