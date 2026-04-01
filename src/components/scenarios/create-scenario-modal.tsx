'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

import type { CreateScenarioRequest, ScenarioListItem } from '@/features/scenarios/scenario.types';

interface CreateScenarioModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateScenarioRequest) => void;
  isCreating: boolean;
  existingScenarios: ScenarioListItem[];
}

export function CreateScenarioModal({
  open,
  onClose,
  onCreate,
  isCreating,
  existingScenarios,
}: CreateScenarioModalProps) {
  const [name, setName] = useState('');
  const [baseType, setBaseType] = useState<'actual' | 'scenario'>('actual');
  const [baseScenarioId, setBaseScenarioId] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      baseScenarioId: baseType === 'scenario' ? baseScenarioId : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="bg-surface-container-lowest relative z-10 w-full max-w-md rounded-lg p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-headline text-lg font-semibold text-slate-900">
            Skapa nytt scenario
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <hr className="mb-4 border-slate-200" />

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="scenario-name"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Namn
            </label>
            <input
              id="scenario-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lagg till Scania Fas 2"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Baserat pa:</p>
            <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="radio"
                name="baseType"
                value="actual"
                checked={baseType === 'actual'}
                onChange={() => setBaseType('actual')}
                className="accent-amber-500"
              />
              Nuvarande planering
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="radio"
                name="baseType"
                value="scenario"
                checked={baseType === 'scenario'}
                onChange={() => setBaseType('scenario')}
                className="accent-amber-500"
              />
              Befintligt scenario:
            </label>
            {baseType === 'scenario' && (
              <select
                value={baseScenarioId}
                onChange={(e) => setBaseScenarioId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Valj scenario...</option>
                {existingScenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <p className="mb-4 text-xs text-slate-500">
            Andringar du gor har paverkar inte verklig data. Du kan jamfora, spara, eller kassera
            nar som helst.
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating || (baseType === 'scenario' && !baseScenarioId)}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? 'Skapar...' : 'Skapa scenario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
