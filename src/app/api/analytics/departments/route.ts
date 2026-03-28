import { NextRequest, NextResponse } from 'next/server';

import {
  getDepartmentUtilization,
  validateMonthRange,
} from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    const result = await getDepartmentUtilization(orgId, from, to);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
