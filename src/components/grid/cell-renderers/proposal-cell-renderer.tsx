'use client';

// v5.0 — Phase 39 / Plan 39-06: visual shell for out-of-department cells (PROP-03).
// Dashed amber border + optional "Pending" badge when a proposed proposal overlaps
// this cell. The hasPendingProposal flag is threaded via ag-grid `context`.

import type { ICellRendererParams } from 'ag-grid-community';

interface ProposalCellRendererContext {
  hasPendingProposal?: boolean;
}

export function ProposalCellRenderer(params: ICellRendererParams) {
  const ctx = (params.context ?? {}) as ProposalCellRendererContext;
  const hasPending = Boolean(ctx.hasPendingProposal);
  const display =
    params.value == null || params.value === '' || params.value === 0 ? '' : String(params.value);

  return (
    <div
      className="relative flex h-full w-full items-center justify-end rounded border border-dashed border-amber-500 px-1"
      data-testid="proposal-cell-renderer"
    >
      <span className="text-sm tabular-nums">{display}</span>
      {hasPending && (
        <span
          className="absolute top-0 right-0 rounded-bl bg-amber-500 px-1 text-[9px] text-white"
          title="Pending approval"
        >
          Pending
        </span>
      )}
    </div>
  );
}
