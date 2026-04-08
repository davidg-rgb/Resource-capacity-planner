// v5.0 — Phase 39 / Plan 39-05: POST /api/v5/proposals/[id]/approve
// Req: PROP-05 (approve endpoint).
//
// Authorization trade-off (orchestrator directive):
//   Clerk has no 'lineManager' role. The gate is requireRole('planner'), which
//   passes for planner/admin/owner. The request body carries a claimed
//   departmentId; the proposal.service.approveProposal() re-reads the target
//   person's LIVE people.department_id inside the tx and throws ForbiddenError
//   if it does not match. Conclusion: the server proves
//   "caller has planner+ role AND the proposal's live target dept matches the
//   claim", not "caller IS THE line manager of dept X". This is acceptable per
//   ADR-004 (personas are UX-only).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { approveProposal } from '@/features/proposals/proposal.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const bodySchema = z.object({
  departmentId: z.string().uuid(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId } = await requireRole('planner');
    const { id } = await params;
    const raw = (await request.json().catch(() => ({}))) as unknown;
    const body = bodySchema.parse(raw);
    const result = await approveProposal({
      orgId,
      proposalId: id,
      callerUserId: userId,
      callerClaimedDepartmentId: body.departmentId,
      actorPersonaId: userId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
