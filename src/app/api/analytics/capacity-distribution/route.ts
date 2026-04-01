import { NextRequest, NextResponse } from 'next/server';

import {
  getCapacityDistribution,
  validateMonthRange,
} from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

const VALID_GROUP_BY = ['project', 'department', 'discipline'] as const;
type GroupBy = (typeof VALID_GROUP_BY)[number];

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    const groupByParam = params.get('groupBy') ?? 'project';
    const groupBy: GroupBy = VALID_GROUP_BY.includes(groupByParam as GroupBy)
      ? (groupByParam as GroupBy)
      : 'project';

    const limitParam = params.get('limit');
    const limit = limitParam ? Math.max(1, Math.min(20, parseInt(limitParam, 10) || 8)) : 8;

    const result = await getCapacityDistribution(orgId, from, to, groupBy, limit);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
