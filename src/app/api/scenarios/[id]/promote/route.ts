import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { promoteAllocations } from '@/features/scenarios/scenario.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const promoteSchema = z.object({
  allocationIds: z.array(z.string().uuid()).min(1),
  confirmation: z.literal(true),
});

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/scenarios/:id/promote — promote selected allocations to actual */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Only admin and owner can promote
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    const body = promoteSchema.parse(await request.json());

    const result = await promoteAllocations(orgId, id, {
      allocationIds: body.allocationIds,
      confirmation: body.confirmation,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
