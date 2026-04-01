import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getScenarioAllocations,
  upsertScenarioAllocations,
} from '@/features/scenarios/scenario.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const allocationItemSchema = z.object({
  personId: z.string().uuid().optional(),
  tempEntityId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  tempProjectName: z.string().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
  hours: z.number().int().min(0).max(744),
});

const putAllocationsSchema = z.object({
  allocations: z.array(allocationItemSchema),
});

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
    const body = putAllocationsSchema.parse(await request.json());
    const results = await upsertScenarioAllocations(orgId, id, body.allocations);
    return NextResponse.json({ results });
  } catch (error) {
    return handleApiError(error);
  }
}
