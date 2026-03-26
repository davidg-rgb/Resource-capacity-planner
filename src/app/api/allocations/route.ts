import { NextRequest, NextResponse } from 'next/server';

import { listAllocationsForPerson } from '@/features/allocations/allocation.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const personId = request.nextUrl.searchParams.get('personId');

    if (!personId) {
      return NextResponse.json(
        { error: 'ERR_VALIDATION', message: 'personId query param required' },
        { status: 400 },
      );
    }

    const allocations = await listAllocationsForPerson(orgId, personId);
    return NextResponse.json({ allocations });
  } catch (error) {
    return handleApiError(error);
  }
}
