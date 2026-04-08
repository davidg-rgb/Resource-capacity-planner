// v5.0 — Phase 39 / Plan 39-05: POST /api/v5/proposals/[id]/withdraw
// Proposer-only; enforced by withdrawProposal service (requestedBy must match row).

import { NextRequest, NextResponse } from 'next/server';

import { withdrawProposal } from '@/features/proposals/proposal.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId } = await requireRole('planner');
    const { id } = await params;
    const result = await withdrawProposal({
      orgId,
      proposalId: id,
      requestedBy: userId,
      actorPersonaId: userId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
