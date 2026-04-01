import { NextRequest, NextResponse } from 'next/server';

import { getDisciplineDemand, validateMonthRange } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    const departmentId = params.get('departmentId') ?? undefined;

    const result = await getDisciplineDemand(orgId, from, to, { departmentId });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
