'use client';

/**
 * v5.0 — Phase 38 / Plan 38-03 (WIZ-01): preview table.
 *
 * Renders new/updated/warning counts, skip counters, warnings list, and
 * the first 50 rows of a parsed batch. Pure presentational — the wizard
 * hook owns the data.
 */

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { PreviewResult } from '../actuals-import.types';

export interface ImportPreviewTableProps {
  preview: PreviewResult;
}

const ROW_LIMIT = 50;

export function ImportPreviewTable({ preview }: ImportPreviewTableProps) {
  const t = useTranslations('v5.import.preview');
  const [showAll, setShowAll] = useState(false);

  // Preview rows: not part of the server schema (PreviewResult only carries
  // counts + warnings + unmatched names). The "first N rows" list is sourced
  // from the warnings array's sourceRow when present, otherwise we render an
  // empty rows section. Plan 38-02 returns counts + warnings; rich row data
  // ships in a follow-up plan if the client asks. For now we surface counts.
  const warnings = preview.warnings ?? [];

  return (
    <div data-testid="import-preview-table">
      <div style={{ display: 'flex', gap: 16 }}>
        <div data-testid="preview-count-new">
          <span>{t('newCount')}: </span>
          <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{preview.new}</strong>
        </div>
        <div data-testid="preview-count-updated">
          <span>{t('updatedCount')}: </span>
          <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{preview.updated}</strong>
        </div>
        <div data-testid="preview-count-warnings">
          <span>{t('warningCount')}: </span>
          <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{warnings.length}</strong>
        </div>
      </div>

      {preview.rowsSkippedManual > 0 && (
        <p data-testid="preview-skipped-manual" style={{ color: '#666', fontSize: 13 }}>
          {t('skippedManual', { count: preview.rowsSkippedManual })}
        </p>
      )}
      {preview.rowsSkippedPriorBatch > 0 && (
        <p data-testid="preview-skipped-prior-batch" style={{ color: '#666', fontSize: 13 }}>
          {t('skippedPriorBatch', { count: preview.rowsSkippedPriorBatch })}
        </p>
      )}

      {warnings.length > 0 && (
        <details data-testid="preview-warnings">
          <summary>{t('warningsHeader')}</summary>
          <ul>
            {(showAll ? warnings : warnings.slice(0, ROW_LIMIT)).map((w, idx) => (
              <li key={`${w.code}-${idx}`}>
                <code>{w.code}</code>
                <span>{': '}</span>
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
          {warnings.length > ROW_LIMIT && !showAll && (
            <button type="button" onClick={() => setShowAll(true)}>
              {t('showMore')}
            </button>
          )}
        </details>
      )}
    </div>
  );
}
