import { NextRequest, NextResponse } from 'next/server';

import { getUtilizationTrends } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const groupByParam = params.get('groupBy');
    const groupBy = groupByParam === 'person' ? 'person' : 'department';

    const limitParam = params.get('limit');
    const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10) || 10)) : 10;

    const result = await getUtilizationTrends(orgId, groupBy, limit);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
