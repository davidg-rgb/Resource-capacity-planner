// v5.0 — Phase 39 / Plan 39-05: POST /api/v5/proposals/[id]/resubmit
// Req: PROP-06 (resubmit endpoint). Proposer-only; enforced by the service.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resubmitProposal } from '@/features/proposals/proposal.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const bodySchema = z.object({
  proposedHours: z.number().min(0).max(999.99).optional(),
  note: z.string().max(1000).nullable().optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId } = await requireRole('planner');
    const { id } = await params;
    const raw = (await request.json().catch(() => ({}))) as unknown;
    const body = bodySchema.parse(raw);
    const result = await resubmitProposal({
      orgId,
      rejectedProposalId: id,
      proposedHours: body.proposedHours,
      note: body.note,
      month: body.month,
      requestedBy: userId,
      actorPersonaId: userId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
