'use client';

// v5.0 — Phase 39 / Plan 39-07 (PROP-04): WishCard presentational component.
// Reused by the Line Manager approval queue (this plan) and the PM "My Wishes"
// panel (Plan 39-08). Status-aware action buttons, impact preview passthrough.
// i18n: inline strings for now; Plan 39-09 does the sweep.

import type { ProposalDTO } from '../proposal.types';

interface WishCardProps {
  proposal: ProposalDTO;
  /** Pre-formatted impact phrase, e.g. "Sara's June utilization 40h → 90h". */
  impactText?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onResubmit?: () => void;
  disabled?: boolean;
}

export function WishCard(props: WishCardProps) {
  const { proposal, impactText, onApprove, onReject, onResubmit, disabled } = props;
  return (
    <div
      className="bg-surface rounded-lg border p-3"
      data-testid="wish-card"
      data-status={proposal.status}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {proposal.proposedHours}h · {proposal.month}
          </div>
          <div className="text-muted-foreground text-xs">Status: {proposal.status}</div>
          {impactText && (
            <div className="mt-1 text-xs italic" data-testid="wish-card-impact">
              {impactText}
            </div>
          )}
          {proposal.note && <div className="mt-1 text-xs">&quot;{proposal.note}&quot;</div>}
          {proposal.rejectionReason && (
            <div className="text-destructive mt-1 text-xs">
              Rejected: {proposal.rejectionReason}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {onApprove && proposal.status === 'proposed' && (
            <button
              type="button"
              onClick={onApprove}
              disabled={disabled}
              className="bg-primary text-primary-foreground rounded px-2 py-1 text-xs disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {onReject && proposal.status === 'proposed' && (
            <button
              type="button"
              onClick={onReject}
              disabled={disabled}
              className="rounded border px-2 py-1 text-xs disabled:opacity-50"
            >
              Reject
            </button>
          )}
          {onResubmit && proposal.status === 'rejected' && (
            <button
              type="button"
              onClick={onResubmit}
              disabled={disabled}
              className="rounded border px-2 py-1 text-xs disabled:opacity-50"
            >
              Edit &amp; resubmit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
