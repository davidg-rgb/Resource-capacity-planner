'use client';

// v5.0 — Phase 39 / Plan 39-07 (PROP-04): WishCard presentational component.
// Reused by the Line Manager approval queue and the PM "My Wishes" panel.
// Status-aware action buttons, impact preview passthrough.
// i18n: all user-facing strings via useTranslations('v5.proposals') (Plan 39-09 sweep).

import { useTranslations } from 'next-intl';

import type { ProposalDTO } from '../proposal.types';

interface WishCardProps {
  proposal: ProposalDTO;
  /** Pre-formatted impact phrase, e.g. "Sara's June utilization 40% → 90%".
   *  v5.0 Phase 41 / Plan 41-04 — UX-V5-06: rendered from
   *  `ProposalImpactDTO.currentUtilizationPct` / `projectedUtilizationPct`
   *  via the `v5.proposals.queue.impactPhrase` key. Counter-proposal button
   *  is intentionally absent (REQUIREMENTS L99). */
  impactText?: string;
  /** Phase 41 / Plan 41-04: show a skeleton while the impact query is
   *  loading — parent passes the `useProposalImpact` loading flag. */
  impactLoading?: boolean;
  /** Phase 41 / Plan 41-04: hide the impact line entirely on error so the
   *  approve/reject buttons stay usable (TC-PR-009). */
  impactError?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onResubmit?: () => void;
  disabled?: boolean;
}

export function WishCard(props: WishCardProps) {
  const {
    proposal,
    impactText,
    impactLoading,
    impactError,
    onApprove,
    onReject,
    onResubmit,
    disabled,
  } = props;
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
          {impactLoading && !impactError && (
            <div
              className="bg-muted/40 mt-1 h-3 w-48 animate-pulse rounded"
              data-testid="wish-card-impact-skeleton"
            />
          )}
          {impactText && !impactError && !impactLoading && (
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
