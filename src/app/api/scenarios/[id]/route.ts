import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getScenario, updateScenario, deleteScenario } from '@/features/scenarios/scenario.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const updateScenarioSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'archived']).optional(),
  visibility: z
    .enum(['private', 'shared_readonly', 'shared_collaborative', 'published'])
    .optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/scenarios/:id — get a single scenario */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    // HI-04: viewer can read; same gate as the list endpoint.
    const { orgId } = await requireRole('viewer');
    const { id } = await params;
    const scenario = await getScenario(orgId, id);
    return NextResponse.json({ scenario });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/scenarios/:id — update a scenario */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // HI-04: write requires planner+; same reasoning as POST /api/scenarios.
    const { orgId, userId } = await requireRole('planner');
    const { id } = await params;
    const body = updateScenarioSchema.parse(await request.json());
    const scenario = await updateScenario(orgId, id, userId, body);
    return NextResponse.json({ scenario });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/scenarios/:id — delete a scenario */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    // HI-04: delete requires planner+.
    const { orgId, userId } = await requireRole('planner');
    const { id } = await params;
    await deleteScenario(orgId, id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
