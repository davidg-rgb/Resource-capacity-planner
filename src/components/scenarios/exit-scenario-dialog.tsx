'use client';

import { X } from 'lucide-react';

interface ExitScenarioDialogProps {
  open: boolean;
  onClose: () => void;
  onSaveAndExit: () => void;
  onDiscardAndExit: () => void;
}

/**
 * Confirmation dialog when leaving a scenario with unsaved changes.
 */
export function ExitScenarioDialog({
  open,
  onClose,
  onSaveAndExit,
  onDiscardAndExit,
}: ExitScenarioDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-surface-container-lowest relative z-10 w-full max-w-sm rounded-lg p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-headline text-lg font-semibold text-slate-900">Avsluta scenario</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <hr className="mb-4 border-slate-200" />

        <p className="mb-6 text-sm text-slate-600">Du har osparade ändringar.</p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onSaveAndExit}
            className="w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Spara och avsluta
          </button>
          <button
            type="button"
            onClick={onDiscardAndExit}
            className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Kassera ändringar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
          >
            Fortsätt redigera
          </button>
        </div>
      </div>
    </div>
  );
}
