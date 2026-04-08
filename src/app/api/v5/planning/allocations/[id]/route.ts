// v5.0 — Phase 40 / Plan 40-01: PATCH /api/v5/planning/allocations/[id]
// Req: UX-V5-11 + HIST-01 (historic-edit soft-warn) + TC-API-004.
//
// Thin HTTP wrapper around patchAllocation. All historic-period logic lives
// in the service (D-15 / ARCHITECTURE §616-627). The route only:
//   1. Enforces planner+ auth via requireRole.
//   2. Parses the body with zod.
//   3. Delegates to the service and maps AppError -> HTTP via handleApiError.
//
// Response shape on success:
//   { allocation: { id, personId, projectId, monthKey, hours }, changeLogAction }
// Response shape on historic-edit rejection (409):
//   { error: 'HISTORIC_EDIT_NOT_CONFIRMED', message, details: { targetMonthKey, nowMonthKey } }

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { patchAllocation } from '@/features/allocations/allocation.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const PatchBody = z.object({
  hours: z.number().int().min(0),
  confirmHistoric: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId } = await requireRole('planner');
    const { id } = await params;
    const raw = (await request.json().catch(() => ({}))) as unknown;
    const body = PatchBody.parse(raw);

    const result = await patchAllocation({
      orgId,
      actorPersonId: userId,
      allocationId: id,
      hours: body.hours,
      confirmHistoric: body.confirmHistoric,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
