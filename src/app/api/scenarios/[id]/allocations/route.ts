import { NextRequest, NextResponse } from 'next/server';

import {
  getScenarioAllocations,
  upsertScenarioAllocations,
} from '@/features/scenarios/scenario.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/scenarios/:id/allocations — list scenario allocations */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const allocations = await getScenarioAllocations(orgId, id);
    return NextResponse.json({ allocations });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PUT /api/scenarios/:id/allocations — upsert scenario allocations */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const body = await request.json();
    const results = await upsertScenarioAllocations(orgId, id, body.allocations);
    return NextResponse.json({ results });
  } catch (error) {
    return handleApiError(error);
  }
}
