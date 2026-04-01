import { NextRequest, NextResponse } from 'next/server';

import { getPersonSummary } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();

    const params = request.nextUrl.searchParams;
    const personId = params.get('personId');

    if (!personId) {
      return NextResponse.json(
        { error: 'ERR_VALIDATION', message: 'Missing required parameter: personId' },
        { status: 400 },
      );
    }

    const result = await getPersonSummary(orgId, personId);

    if (!result) {
      return NextResponse.json(
        { error: 'ERR_NOT_FOUND', message: 'Person not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
