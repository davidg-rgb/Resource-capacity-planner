import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createTempEntity,
  listTempEntities,
  deleteTempEntity,
} from '@/features/scenarios/scenario.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createTempEntitySchema = z.object({
  entityType: z.enum(['person', 'project']),
  name: z.string().min(1).max(200),
  departmentId: z.string().uuid().optional(),
  disciplineId: z.string().uuid().optional(),
  targetHoursPerMonth: z.number().int().min(0).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/scenarios/:id/temp-entities — list temp entities */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const entities = await listTempEntities(orgId, id);
    return NextResponse.json({ entities });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/scenarios/:id/temp-entities — create a temp entity */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const body = createTempEntitySchema.parse(await request.json());
    const entity = await createTempEntity(orgId, id, body);
    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/scenarios/:id/temp-entities — delete a temp entity */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const entityId = request.nextUrl.searchParams.get('entityId');

    if (!entityId) {
      return NextResponse.json(
        { error: 'ERR_VALIDATION', message: 'entityId query param required' },
        { status: 400 },
      );
    }

    z.string().uuid().parse(entityId);

    await deleteTempEntity(orgId, id, entityId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
