import { NextRequest, NextResponse } from 'next/server';

import {
  getAvailabilityTimeline,
  validateMonthRange,
} from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    const departmentId = params.get('departmentId') ?? undefined;
    const disciplineId = params.get('disciplineId') ?? undefined;
    const availableOnly = params.get('availableOnly') === 'true';

    const result = await getAvailabilityTimeline(orgId, from, to, {
      departmentId,
      disciplineId,
      availableOnly,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
