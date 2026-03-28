'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { DEPARTMENT_SUGGESTIONS } from '@/features/onboarding/onboarding.constants';
import type { Department } from './onboarding-wizard';

interface StepDepartmentsProps {
  existingDepartments: Department[];
  onAdd: (dept: Department) => void;
  onNext: () => void;
  onSkipAll: () => void;
}

export function StepDepartments({
  existingDepartments,
  onAdd,
  onNext,
  onSkipAll,
}: StepDepartmentsProps) {
  const [customName, setCustomName] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const existingNames = new Set(existingDepartments.map((d) => d.name.toLowerCase()));

  async function createDepartment(name: string) {
    if (adding) return;
    setInlineError(null);
    setAdding(name);

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        if (res.status === 409 || res.status === 400) {
          const data = await res.json().catch(() => null);
          const msg = data?.error ?? 'Already exists';
          setInlineError(msg);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      onAdd(data.department);
    } catch {
      toast.error(`Failed to create department "${name}"`);
    } finally {
      setAdding(null);
    }
  }

  async function handleAddCustom() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    if (existingNames.has(trimmed.toLowerCase())) {
      setInlineError('Already exists');
      return;
    }
    await createDepartment(trimmed);
    setCustomName('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-on-surface mb-1 text-lg font-medium">Add departments</h2>
        <p className="text-on-surface-variant text-sm">
          Click suggestions to add them, or type your own.
        </p>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {DEPARTMENT_SUGGESTIONS.map((name) => {
          const isExisting = existingNames.has(name.toLowerCase());
          const isAdding = adding === name;

          return (
            <button
              key={name}
              type="button"
              disabled={isExisting || isAdding}
              onClick={() => createDepartment(name)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                isExisting
                  ? 'border-outline-variant text-on-surface-variant cursor-default opacity-50'
                  : isAdding
                    ? 'border-primary text-primary animate-pulse cursor-wait'
                    : 'border-primary text-primary hover:bg-primary hover:text-on-primary cursor-pointer'
              }`}
            >
              {isExisting ? `${name} (added)` : name}
            </button>
          );
        })}
      </div>

      {/* Already-added list */}
      {existingDepartments.length > 0 && (
        <p className="text-on-surface-variant text-sm">
          {existingDepartments.length} department{existingDepartments.length !== 1 ? 's' : ''} added
        </p>
      )}

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customName}
          onChange={(e) => {
            setCustomName(e.target.value);
            setInlineError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
          placeholder="Custom department name"
          className="bg-surface text-on-surface placeholder:text-on-surface-variant border-outline-variant focus:border-primary flex-1 rounded border px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={!customName.trim() || !!adding}
          className="bg-primary text-on-primary hover:bg-primary/90 disabled:bg-surface-container disabled:text-on-surface-variant flex items-center gap-1 rounded px-3 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {inlineError && <p className="text-error text-sm">{inlineError}</p>}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onSkipAll}
          className="text-on-surface-variant hover:text-on-surface text-sm underline"
        >
          Skip setup
        </button>
        <button
          type="button"
          onClick={onNext}
          className="bg-primary text-on-primary hover:bg-primary/90 rounded px-6 py-2 text-sm font-medium transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
