'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ImportResult } from '@/features/import/import.types';

type StepImportProps = {
  importStatus: 'idle' | 'importing' | 'success' | 'error';
  importResult: ImportResult | null;
  readyCount: number;
  onExecute: () => void;
  onBack: () => void;
};

export function StepImport({
  importStatus,
  importResult,
  readyCount,
  onExecute,
  onBack,
}: StepImportProps) {
  const router = useRouter();
  const t = useTranslations('import');

  // Idle: confirmation screen
  if (importStatus === 'idle') {
    return (
      <div className="flex flex-col items-center py-10">
        <p className="text-on-surface text-lg font-medium">
          {t('readyToImport', { count: readyCount })}
        </p>
        <p className="text-on-surface-variant mt-2 text-sm">{t('transactionNote')}</p>
        <button
          type="button"
          onClick={onExecute}
          className="bg-primary text-on-primary hover:bg-primary/90 mt-6 rounded-md px-6 py-2.5 text-sm font-medium transition-colors"
        >
          {t('importButton')}
        </button>
      </div>
    );
  }

  // Importing: progress indicator
  if (importStatus === 'importing') {
    return (
      <div className="flex flex-col items-center py-10">
        <Loader2 className="text-primary h-10 w-10 animate-spin" />
        <p className="text-on-surface mt-4 text-lg font-medium">{t('importing')}</p>
        <p className="text-on-surface-variant mt-1 text-sm">{t('doNotClose')}</p>
      </div>
    );
  }

  // Success: results summary with redirect to heat map
  if (importStatus === 'success' && importResult) {
    return (
      <div className="flex flex-col items-center py-10">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <p className="text-on-surface mt-4 text-xl font-semibold">{t('success')}</p>
        <p className="text-on-surface mt-2 text-3xl font-bold tabular-nums">
          {t('rowsImported', { count: importResult.imported })}
        </p>
        {importResult.skipped > 0 && (
          <p className="text-on-surface-variant mt-1 text-sm">
            {t('skipped', { count: importResult.skipped })}
          </p>
        )}
        {importResult.warnings.length > 0 && (
          <div className="mt-4 w-full max-w-md">
            <p className="text-xs font-medium text-amber-600">
              {t('warningCount', { count: importResult.warnings.length })}:
            </p>
            <ul className="mt-1 space-y-0.5">
              {importResult.warnings.map((w, i) => (
                <li key={i} className="text-on-surface-variant text-xs">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-on-surface-variant mt-4 text-sm">{t('seeResult')}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/team?imported=${importResult.imported}&source=import`)
            }
            className="bg-primary text-on-primary hover:bg-primary/90 rounded-md px-6 py-2.5 text-sm font-medium transition-colors"
          >
            {t('viewTeamLoad')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/data')}
            className="border-outline-variant text-on-surface hover:bg-surface-container rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >
            {t('stayOnDataPage')}
          </button>
        </div>
      </div>
    );
  }

  // Error: rollback message
  if (importStatus === 'error') {
    return (
      <div className="flex flex-col items-center py-10">
        <XCircle className="h-12 w-12 text-red-600" />
        <p className="text-on-surface mt-4 text-xl font-semibold">{t('failed')}</p>
        {importResult?.error && <p className="text-error mt-2 text-sm">{importResult.error}</p>}
        <p className="text-on-surface-variant mt-2 text-sm">{t('rolledBack')}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="border-outline-variant text-on-surface hover:bg-surface-container rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={onExecute}
            className="bg-primary text-on-primary hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
