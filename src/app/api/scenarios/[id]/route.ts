import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { getScenario, updateScenario, deleteScenario } from '@/features/scenarios/scenario.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/scenarios/:id — get a single scenario */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
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
    const orgId = await getTenantId();
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const scenario = await updateScenario(orgId, id, userId, body);
    return NextResponse.json({ scenario });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/scenarios/:id — delete a scenario */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    await deleteScenario(orgId, id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
