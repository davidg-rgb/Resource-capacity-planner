'use client';

// v5.0 — Phase 39 / Plan 39-07 (PROP-04): Line Manager approval queue route.
// Guarded by the active persona kind; non line-manager personas see a hint.

import { ApprovalQueue } from '@/features/proposals/ui/approval-queue';
import { usePersona } from '@/features/personas/persona.context';

export default function ApprovalQueuePage() {
  const { persona } = usePersona();

  if (persona.kind !== 'line-manager') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Approval queue</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Switch to the Line Manager persona to view the queue.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-semibold">Approval queue</h1>
      <ApprovalQueue departmentId={persona.departmentId} />
    </div>
  );
}
