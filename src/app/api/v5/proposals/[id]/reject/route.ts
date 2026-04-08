// v5.0 — Phase 39 / Plan 39-05: POST /api/v5/proposals/[id]/reject
// Req: PROP-05 (reject endpoint).
//
// Authorization trade-off: see approve/route.ts. Gate is requireRole('planner')
// plus body.departmentId validated by the service against live people.department_id.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rejectProposal } from '@/features/proposals/proposal.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const bodySchema = z.object({
  departmentId: z.string().uuid(),
  reason: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId } = await requireRole('planner');
    const { id } = await params;
    const raw = (await request.json().catch(() => ({}))) as unknown;
    const body = bodySchema.parse(raw);
    const result = await rejectProposal({
      orgId,
      proposalId: id,
      callerUserId: userId,
      callerClaimedDepartmentId: body.departmentId,
      reason: body.reason,
      actorPersonaId: userId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
