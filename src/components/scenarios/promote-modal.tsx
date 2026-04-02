'use client';

import { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';

interface PromotableAllocation {
  id: string;
  personName: string;
  projectName: string;
  month: string;
  hours: number;
  isNew: boolean;
  isRemoved: boolean;
  isArchived: boolean;
  isPromoted: boolean;
}

interface PromoteModalProps {
  open: boolean;
  onClose: () => void;
  allocations: PromotableAllocation[];
  onPromote: (allocationIds: string[]) => void;
  isPromoting: boolean;
}

export function PromoteModal({
  open,
  onClose,
  allocations,
  onPromote,
  isPromoting,
}: PromoteModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'select' | 'review'>('select');
  const [confirmed, setConfirmed] = useState(false);

  if (!open) return null;

  const promotable = allocations.filter((a) => !a.isPromoted && !a.isArchived);
  const selectedAllocations = allocations.filter((a) => selected.has(a.id));

  const toggleSelection = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handlePromote = () => {
    onPromote(Array.from(selected));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="bg-surface-container-lowest relative z-10 w-full max-w-lg rounded-lg p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-headline text-lg font-semibold text-slate-900">
            {step === 'select' ? 'Tillämpa ändringar på verklig planering' : 'Granska ändringar'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <hr className="mb-4 border-slate-200" />

        {step === 'select' && (
          <>
            <p className="mb-3 text-sm text-slate-600">Välj vilka ändringar som ska tillämpas:</p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {promotable.map((alloc) => (
                <label
                  key={alloc.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(alloc.id)}
                    onChange={() => toggleSelection(alloc.id)}
                    className="accent-amber-500"
                  />
                  <span className="text-sm text-slate-700">
                    {alloc.personName} &mdash; {alloc.projectName}:{' '}
                    {alloc.isRemoved ? (
                      <span className="text-red-600">borttagen</span>
                    ) : alloc.isNew ? (
                      <span className="text-amber-600">
                        +{alloc.hours}h/mo {alloc.month}
                      </span>
                    ) : (
                      <span>
                        {alloc.hours}h/mo {alloc.month}
                      </span>
                    )}
                  </span>
                </label>
              ))}
              {allocations
                .filter((a) => a.isArchived)
                .map((alloc) => (
                  <div
                    key={alloc.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 opacity-50"
                  >
                    <input type="checkbox" disabled className="accent-slate-300" />
                    <span className="text-sm text-slate-400">
                      {alloc.personName} &mdash; arkiverad
                    </span>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                ))}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {selected.size} av {promotable.length} ändringar valda
            </p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => setStep('review')}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                Granska &#8594;
              </button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Dessa ändringar kommer att göras i verklig planering:
            </p>

            <div className="mb-4 max-h-48 overflow-y-auto rounded-md border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Person
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Projekt
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                      Månad
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">
                      Timmar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedAllocations.map((alloc) => (
                    <tr key={alloc.id}>
                      <td className="px-3 py-1.5 text-slate-700">{alloc.personName}</td>
                      <td className="px-3 py-1.5 text-slate-700">{alloc.projectName}</td>
                      <td className="px-3 py-1.5 text-slate-500">{alloc.month}</td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        {alloc.isRemoved ? (
                          <span className="text-red-600">Borttagen</span>
                        ) : (
                          <span>{alloc.hours}h</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="mb-4 flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-amber-500"
              />
              <span className="text-sm text-slate-700">
                Jag förstår att detta ändrar verklig planering
              </span>
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('select');
                  setConfirmed(false);
                }}
                className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                &#8592; Tillbaka
              </button>
              <button
                type="button"
                disabled={!confirmed || isPromoting}
                onClick={handlePromote}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {isPromoting ? 'Tillämpar...' : 'Tillämpa nu'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
