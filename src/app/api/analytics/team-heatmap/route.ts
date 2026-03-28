import { NextRequest, NextResponse } from 'next/server';

import { getTeamHeatMap, validateMonthRange } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    const dept = params.get('dept') ?? undefined;
    const disc = params.get('disc') ?? undefined;

    const result = await getTeamHeatMap(orgId, from, to, {
      departmentId: dept,
      disciplineId: disc,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
