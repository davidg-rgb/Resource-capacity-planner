'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

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

  // Idle: confirmation screen
  if (importStatus === 'idle') {
    return (
      <div className="flex flex-col items-center py-10">
        <p className="text-on-surface text-lg font-medium">
          Ready to import {readyCount} allocation{readyCount !== 1 ? 's' : ''}
        </p>
        <p className="text-on-surface-variant mt-2 text-sm">
          This will create or update allocation records in a single transaction.
        </p>
        <button
          type="button"
          onClick={onExecute}
          className="bg-primary text-on-primary hover:bg-primary/90 mt-6 rounded-md px-6 py-2.5 text-sm font-medium transition-colors"
        >
          Import
        </button>
      </div>
    );
  }

  // Importing: progress indicator
  if (importStatus === 'importing') {
    return (
      <div className="flex flex-col items-center py-10">
        <Loader2 className="text-primary h-10 w-10 animate-spin" />
        <p className="text-on-surface mt-4 text-lg font-medium">
          Importing allocations...
        </p>
        <p className="text-on-surface-variant mt-1 text-sm">
          Please don&apos;t close this page.
        </p>
      </div>
    );
  }

  // Success: results summary
  if (importStatus === 'success' && importResult) {
    return (
      <div className="flex flex-col items-center py-10">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <p className="text-on-surface mt-4 text-xl font-semibold">Import Complete</p>
        <p className="text-on-surface mt-2 text-3xl font-bold tabular-nums">
          {importResult.imported} rows imported
        </p>
        {importResult.skipped > 0 && (
          <p className="text-on-surface-variant mt-1 text-sm">
            {importResult.skipped} skipped
          </p>
        )}
        {importResult.warnings.length > 0 && (
          <div className="mt-4 w-full max-w-md">
            <p className="text-xs font-medium text-amber-600">
              {importResult.warnings.length} warning{importResult.warnings.length !== 1 ? 's' : ''}:
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
        <button
          type="button"
          onClick={() => router.push('/data')}
          className="bg-primary text-on-primary hover:bg-primary/90 mt-6 rounded-md px-6 py-2.5 text-sm font-medium transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  // Error: rollback message
  if (importStatus === 'error') {
    return (
      <div className="flex flex-col items-center py-10">
        <XCircle className="h-12 w-12 text-red-600" />
        <p className="text-on-surface mt-4 text-xl font-semibold">Import Failed</p>
        {importResult?.error && (
          <p className="text-error mt-2 text-sm">{importResult.error}</p>
        )}
        <p className="text-on-surface-variant mt-2 text-sm">
          The import was rolled back. No data was changed.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="border-outline-variant text-on-surface hover:bg-surface-container rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onExecute}
            className="bg-primary text-on-primary hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
