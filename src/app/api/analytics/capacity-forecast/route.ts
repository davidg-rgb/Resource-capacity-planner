import { NextRequest, NextResponse } from 'next/server';

import { getCapacityForecast, validateMonthRange } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    const projectId = params.get('projectId') ?? undefined;
    const departmentId = params.get('departmentId') ?? undefined;

    const result = await getCapacityForecast(orgId, from, to, { projectId, departmentId });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
