import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { listScenarios, createScenario } from '@/features/scenarios/scenario.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

/** GET /api/scenarios — list all scenarios for the current org */
export async function GET() {
  try {
    const orgId = await getTenantId();
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const scenarios = await listScenarios(orgId, userId);
    return NextResponse.json({ scenarios });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/scenarios — create a new scenario */
export async function POST(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
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
