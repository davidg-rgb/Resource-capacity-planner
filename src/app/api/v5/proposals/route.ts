// v5.0 — Phase 39 / Plan 39-05: POST (create) + GET (list) /api/v5/proposals
// Reqs: PROP-04 (list for approval queue), PROP-06 (list for My Wishes), PROP-07 (live dept join)
//
// Authorization model (trade-off):
//   Clerk has no 'lineManager' role — roles are viewer < planner < admin < owner.
//   We therefore gate every proposal route with requireRole('planner'). The
//   server cannot prove "user IS THE line manager of dept X"; it can only
//   prove "user has planner+ role AND the departmentId they claim matches
//   the target person's LIVE people.department_id". For create/list this is
//   tenant-scoped by orgId only — the departmentId query param is supplied
//   by the client (persona.departmentId) and is not re-authorized here. Per
//   ADR-004 personas are UX-only; this is an accepted v5.0 trade-off.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createProposal, listProposals } from '@/features/proposals/proposal.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const createBodySchema = z.object({
  personId: z.string().uuid(),
  projectId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  proposedHours: z.number().min(0).max(999.99),
  note: z.string().max(1000).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireRole('planner');
    const raw = (await request.json().catch(() => ({}))) as unknown;
    const body = createBodySchema.parse(raw);
    const result = await createProposal({
      orgId,
      personId: body.personId,
      projectId: body.projectId,
      month: body.month,
      proposedHours: body.proposedHours,
      note: body.note ?? null,
      requestedBy: userId,
      actorPersonaId: userId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

const proposalStatusEnum = z.enum(['proposed', 'approved', 'rejected', 'withdrawn', 'superseded']);

const listQuerySchema = z.object({
  status: z.string().optional(), // 'proposed' or 'proposed,approved'
  departmentId: z.string().uuid().optional(),
  proposerId: z.string().optional(),
  personId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const parsed = listQuerySchema.parse(raw);
    const statusList = parsed.status
      ? parsed.status
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => proposalStatusEnum.parse(s))
      : undefined;
    const result = await listProposals({
      orgId,
      status:
        statusList && statusList.length === 1
          ? statusList[0]
          : statusList && statusList.length > 1
            ? statusList
            : undefined,
      departmentId: parsed.departmentId,
      proposerId: parsed.proposerId,
      personId: parsed.personId,
      projectId: parsed.projectId,
    });
    return NextResponse.json({ proposals: result }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
