'use client';

// v5.0 — Phase 39 / Plan 39-07 (PROP-04): Reject modal with REQUIRED reason.
// PROP-04 truth: "Reject opens a modal with a REQUIRED reason textarea
// (1..1000 chars); Cancel closes, Confirm fires POST /[id]/reject".

import { useState } from 'react';

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  pending?: boolean;
}

// Reset state on close is handled by the parent: when `open` becomes false the
// component returns null and unmounts, so the next open starts fresh without
// needing a set-state-in-effect.
export function RejectModal({ open, onClose, onConfirm, pending }: RejectModalProps) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  const trimmedLen = reason.trim().length;
  const valid = trimmedLen >= 1 && reason.length <= 1000;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Reject proposal"
    >
      <div className="bg-surface w-full max-w-md rounded-lg p-4 shadow-lg">
        <h2 className="text-lg font-semibold">Reject proposal</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          A reason is required and visible to the proposer.
        </p>
        <textarea
          className="mt-3 w-full rounded border px-2 py-1 text-sm"
          rows={4}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Rejection reason"
          autoFocus
          disabled={pending}
        />
        <div className="text-muted-foreground text-right text-xs">{reason.length}/1000</div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (valid) void onConfirm(reason);
            }}
            disabled={!valid || pending}
            className="bg-destructive text-destructive-foreground rounded px-3 py-1 text-sm disabled:opacity-50"
          >
            {pending ? '…' : 'Confirm reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
