'use client';

// v5.0 — Phase 39 / Plan 39-06: framework-agnostic proposal cell.
// Reused by Phase 40 PlanVsActualCell. Mirrors ProposalCellEditor logic but
// without any ag-grid coupling so it can be embedded in arbitrary timelines.

import { useState } from 'react';

import { useCreateProposal } from '../use-proposals';

export interface ProposalCellProps {
  personId: string;
  projectId: string;
  /** 'YYYY-MM' */
  month: string;
  initialHours: number;
  onSubmitted?: () => void;
  onCancelled?: () => void;
}

export function ProposalCell(props: ProposalCellProps) {
  const [hours, setHours] = useState<number>(props.initialHours);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const createProposal = useCreateProposal();

  async function handleSubmit() {
    setError(null);
    try {
      await createProposal.mutateAsync({
        personId: props.personId,
        projectId: props.projectId,
        month: props.month,
        proposedHours: hours,
        note: note.trim() || null,
      });
      props.onSubmitted?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submit wish failed';
      setError(msg);
    }
  }

  return (
    <div
      className="bg-surface min-w-[240px] rounded border-2 border-dashed border-amber-500 p-2 shadow-lg"
      data-testid="proposal-cell"
    >
      <div className="mb-1 text-xs font-medium">Submit wish (out-of-department)</div>
      <input
        type="number"
        min={0}
        max={999.99}
        step={0.25}
        value={hours}
        onChange={(e) => setHours(Number(e.target.value) || 0)}
        className="w-full rounded border px-2 py-1 text-sm"
        aria-label="Proposed hours"
      />
      <textarea
        placeholder="Optional note"
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-1 w-full resize-none rounded border px-2 py-1 text-xs"
        aria-label="Note"
        rows={2}
      />
      {error && (
        <div className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createProposal.isPending}
          className="bg-primary text-primary-foreground flex-1 rounded px-2 py-1 text-xs"
        >
          {createProposal.isPending ? '…' : 'Submit wish'}
        </button>
        <button
          type="button"
          onClick={() => props.onCancelled?.()}
          className="rounded border px-2 py-1 text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
