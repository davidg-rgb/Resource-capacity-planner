'use client';

// v5.0 — Phase 39 / Plan 39-08 (PROP-06): PM "My Wishes" panel.
// Tabs: proposed / approved / rejected. Rejected cards expose an
// edit-and-resubmit modal that POSTs to /api/v5/proposals/[id]/resubmit
// via useResubmitProposal. i18n via useTranslations('v5.proposals') (Plan 39-09 sweep).

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useListProposals, useResubmitProposal } from '../use-proposals';
import type { ProposalDTO, ProposalStatus } from '../proposal.types';
import { WishCard } from './wish-card';

type Tab = Extract<ProposalStatus, 'proposed' | 'approved' | 'rejected'>;

const TABS: Tab[] = ['proposed', 'approved', 'rejected'];

interface MyWishesPanelProps {
  proposerId: string;
}

export function MyWishesPanel({ proposerId }: MyWishesPanelProps) {
  const [tab, setTab] = useState<Tab>('proposed');
  const { data, isLoading } = useListProposals({ status: tab, proposerId });
  const resubmit = useResubmitProposal();
  const t = useTranslations('v5.proposals');

  const [editing, setEditing] = useState<ProposalDTO | null>(null);
  const [editHours, setEditHours] = useState<number>(0);
  const [editNote, setEditNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  function openResubmit(p: ProposalDTO) {
    setEditing(p);
    setEditHours(p.proposedHours);
    setEditNote(p.note ?? '');
    setError(null);
  }

  function closeResubmit() {
    setEditing(null);
    setError(null);
  }

  async function confirmResubmit() {
    if (!editing) return;
    try {
      await resubmit.mutateAsync({
        rejectedProposalId: editing.id,
        proposedHours: editHours,
        note: editNote.trim().length > 0 ? editNote : null,
      });
      closeResubmit();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('resubmit.resubmitFailed'));
    }
  }

  const proposals = data?.proposals ?? [];

  return (
    <div data-testid="my-wishes-panel">
      <div className="mb-3 flex gap-2 border-b" role="tablist" aria-label={t('tabs.tablistLabel')}>
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            role="tab"
            aria-selected={tab === tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-3 py-2 text-sm ${
              tab === tabKey ? 'border-primary border-b-2 font-medium' : 'text-muted-foreground'
            }`}
          >
            {t(`tabs.${tabKey}`)}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-muted-foreground text-sm">{t('page.loading')}</div>}

      <div className="space-y-2" data-testid="my-wishes-list">
        {proposals.map((p) => (
          <WishCard
            key={p.id}
            proposal={p}
            onResubmit={p.status === 'rejected' ? () => openResubmit(p) : undefined}
            disabled={resubmit.isPending}
          />
        ))}
        {!isLoading && proposals.length === 0 && (
          <div className="text-muted-foreground text-sm">
            {t('wishes.emptyForTab', { tab: t(`tabs.${tab}`) })}
          </div>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label={t('resubmit.dialogLabel')}
        >
          <div className="bg-surface w-full max-w-md rounded-lg border p-4 shadow-lg">
            <h2 className="text-lg font-semibold">{t('resubmit.title')}</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('resubmit.monthSummary', { month: editing.month, hours: editing.proposedHours })}
            </p>

            <label className="mt-3 block text-xs font-medium" htmlFor="resubmit-hours">
              {t('resubmit.hoursLabel')}
            </label>
            <input
              id="resubmit-hours"
              type="number"
              min={0}
              max={999.99}
              step={0.25}
              value={editHours}
              onChange={(e) => setEditHours(Number(e.target.value) || 0)}
              className="w-full rounded border px-2 py-1 text-sm"
              aria-label={t('resubmit.hoursAria')}
            />

            <label className="mt-3 block text-xs font-medium" htmlFor="resubmit-note">
              {t('resubmit.noteLabel')}
            </label>
            <textarea
              id="resubmit-note"
              value={editNote}
              maxLength={1000}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm"
              rows={3}
              aria-label={t('resubmit.noteAria')}
            />

            {error && (
              <div className="text-destructive mt-2 text-xs" role="alert">
                {error}
              </div>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeResubmit}
                className="rounded border px-3 py-1 text-sm"
                disabled={resubmit.isPending}
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmResubmit}
                disabled={resubmit.isPending || editHours <= 0}
                className="bg-primary text-primary-foreground rounded px-3 py-1 text-sm disabled:opacity-50"
              >
                {resubmit.isPending ? t('actions.pending') : t('actions.resubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
