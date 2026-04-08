'use client';

// v5.0 — Phase 39 / Plan 39-07 (PROP-04): WishCard presentational component.
// Reused by the Line Manager approval queue and the PM "My Wishes" panel.
// Status-aware action buttons, impact preview passthrough.
// i18n: all user-facing strings via useTranslations('v5.proposals') (Plan 39-09 sweep).

import { useTranslations } from 'next-intl';

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
  const t = useTranslations('v5.proposals');
  return (
    <div
      className="bg-surface rounded-lg border p-3"
      data-testid="wish-card"
      data-status={proposal.status}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {t('card.hoursMonth', { hours: proposal.proposedHours, month: proposal.month })}
          </div>
          <div className="text-muted-foreground text-xs">
            {t('card.status', { status: proposal.status })}
          </div>
          {impactText && (
            <div className="mt-1 text-xs italic" data-testid="wish-card-impact">
              {impactText}
            </div>
          )}
          {proposal.note && <div className="mt-1 text-xs">&quot;{proposal.note}&quot;</div>}
          {proposal.rejectionReason && (
            <div className="text-destructive mt-1 text-xs">
              {t('card.rejected', { reason: proposal.rejectionReason })}
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
              {t('actions.approve')}
            </button>
          )}
          {onReject && proposal.status === 'proposed' && (
            <button
              type="button"
              onClick={onReject}
              disabled={disabled}
              className="rounded border px-2 py-1 text-xs disabled:opacity-50"
            >
              {t('actions.reject')}
            </button>
          )}
          {onResubmit && proposal.status === 'rejected' && (
            <button
              type="button"
              onClick={onResubmit}
              disabled={disabled}
              className="rounded border px-2 py-1 text-xs disabled:opacity-50"
            >
              {t('actions.editResubmit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
