import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProjectStaffing, validateMonthRange } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const projectId = z.string().uuid().parse(params.get('projectId'));
    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    const result = await getProjectStaffing(orgId, projectId, from, to);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
