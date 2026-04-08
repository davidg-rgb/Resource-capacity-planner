'use client';

// v5.0 — Phase 40 / Plan 40-04 (Wave 3): persona-agnostic historic-edit dialog.
//
// Soft warning shown before any edit that targets a month earlier than the
// server-now month. Persona-agnostic: reused by PM (Phase 40) and Line Mgr
// (Phase 41) direct-edit historic warnings (40-CONTEXT.md D-16).
//
// D-14 post-research: uses the hand-rolled `<div role="dialog" fixed inset-0>`
// pattern matching `reject-modal.tsx` / `my-wishes-panel.tsx`. There is no
// shadcn Dialog primitive in the codebase; do NOT import `@/components/ui/dialog`.

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export interface HistoricEditDialogProps {
  open: boolean;
  /** 'YYYY-MM' — month the caller wants to edit. */
  targetMonthKey: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HistoricEditDialog(props: HistoricEditDialogProps) {
  const t = useTranslations('v5.historicEdit');

  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onCancel();
      if (e.key === 'Enter') props.onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.open, props.onCancel, props.onConfirm, props]);

  if (!props.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      data-testid="historic-edit-dialog"
    >
      <div className="bg-surface max-w-md rounded-lg p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">{t('title')}</h2>
        <p className="mb-4 text-sm">{t('body', { month: props.targetMonthKey })}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={props.onCancel}
            className="rounded border px-3 py-1 text-sm"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            className="rounded bg-amber-600 px-3 py-1 text-sm text-white"
          >
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
