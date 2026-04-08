'use client';

// v5.0 — Phase 39 / Plan 39-06: ag-grid custom cell editor for proposal mode (PROP-03).
// Direct auto-save is BLOCKED on this path — the user must click "Submit wish" to
// POST a proposal via useCreateProposal. See edit-gate.ts for the routing decision.

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { CustomCellEditorProps } from 'ag-grid-react';

import { useCreateProposal } from '@/features/proposals/use-proposals';

interface ProposalCellEditorContext {
  isOutOfDept: boolean;
  personId: string;
}

export const ProposalCellEditor = forwardRef(function ProposalCellEditor(
  props: CustomCellEditorProps,
  ref,
) {
  const ctx = (props.context ?? {}) as ProposalCellEditorContext;
  const initialHours = Number(props.value) || 0;
  const [hours, setHours] = useState<number>(initialHours);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const createProposal = useCreateProposal();
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    // Always return the ORIGINAL value — the proposal path never writes through
    // to the grid. The only way hours change on screen is via invalidation
    // after POST success (future: renderer consults useListProposals).
    getValue: () => props.value,
    isCancelBeforeStart: () => false,
    // Always cancel on normal "end edit" (tab/enter/blur). Submit wish is the
    // only way to persist a proposed change.
    isCancelAfterEnd: () => true,
  }));

  async function handleSubmit() {
    setError(null);
    try {
      const month = props.column.getColId(); // 'YYYY-MM'
      const row = props.data as { projectId?: string } | undefined;
      const projectId = row?.projectId;
      if (!projectId) {
        setError('Missing projectId');
        return;
      }
      await createProposal.mutateAsync({
        personId: ctx.personId,
        projectId,
        month,
        proposedHours: hours,
        note: note.trim() || null,
      });
      props.api.stopEditing(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submit wish failed';
      setError(msg);
      console.error('Submit wish failed', err);
    }
  }

  return (
    <div className="bg-surface min-w-[240px] rounded border-2 border-dashed border-amber-500 p-2 shadow-lg">
      <div className="mb-1 text-xs font-medium">Submit wish (out-of-department)</div>
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={999.99}
        step={0.25}
        value={hours}
        onChange={(e) => setHours(Number(e.target.value) || 0)}
        className="w-full rounded border px-2 py-1 text-sm"
        aria-label="Proposed hours"
        autoFocus
      />
      <textarea
        placeholder="Optional note"
        value={note}
        maxLength={1000}
        onChange={(e) => setNote(e.target.value)}
        className="mt-1 w-full resize-none rounded border px-2 py-1 text-xs"
        aria-label="Note"
        rows={2}
      />
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
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
          onClick={() => props.api.stopEditing(true)}
          className="rounded border px-2 py-1 text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
});
