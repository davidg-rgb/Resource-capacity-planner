import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listScenarios, createScenario } from '@/features/scenarios/scenario.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  baseScenarioId: z.string().uuid().optional(),
});

/** GET /api/scenarios — list all scenarios for the current org */
export async function GET() {
  try {
    // HI-04: scenarios are planning inputs; gating reads at viewer keeps the
    // bar low while still requiring a real role assignment.
    const { orgId, userId } = await requireRole('viewer');
    const scenarios = await listScenarios(orgId, userId);
    return NextResponse.json({ scenarios });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/scenarios — create a new scenario */
export async function POST(request: NextRequest) {
  try {
    // HI-04: write requires planner+ — viewers must not be able to manipulate
    // scenarios (planning inputs for other roles) or exhaust the per-org quota.
    const { orgId, userId } = await requireRole('planner');
    const body = createScenarioSchema.parse(await request.json());
    const scenario = await createScenario(orgId, userId, {
      name: body.name,
      description: body.description,
      baseScenarioId: body.baseScenarioId,
    });
    return NextResponse.json({ scenario }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
