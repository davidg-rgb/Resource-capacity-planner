// v5.0 — Phase 39 / PROP-06: PATCH /api/v5/proposals/[id]
// In-place edit of a proposal in 'proposed' state. Rejected proposals
// must use POST /resubmit (clone-on-rejected). Proposer-only; enforced
// by editProposal service (requestedBy must match row).
// ARCHITECTURE §8 line 1338, TC-API-013.

import { NextRequest, NextResponse } from 'next/server';

import { editProposal } from '@/features/proposals/proposal.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId } = await requireRole('planner');
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      proposedHours?: number;
      note?: string | null;
    };
    const result = await editProposal({
      orgId,
      proposalId: id,
      proposedHours: body.proposedHours,
      note: body.note,
      requestedBy: userId,
      actorPersonaId: userId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
