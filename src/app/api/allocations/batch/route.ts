import { NextRequest, NextResponse } from 'next/server';

import { batchUpsertSchema } from '@/features/allocations/allocation.schema';
import { batchUpsertAllocations } from '@/features/allocations/allocation.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const body = await request.json();
    const { allocations } = batchUpsertSchema.parse(body);
    const result = await batchUpsertAllocations(orgId, allocations);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
