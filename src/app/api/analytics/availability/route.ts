import { NextRequest, NextResponse } from 'next/server';

import { getAvailabilitySearch, validateMonthRange } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

const VALID_SORTS = ['available', 'utilization', 'name'] as const;
type SortOption = (typeof VALID_SORTS)[number];

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    const disciplineId = params.get('disciplineId') ?? undefined;
    const departmentId = params.get('departmentId') ?? undefined;
    const minHours = params.get('minHours') ? Number(params.get('minHours')) : undefined;
    const sortParam = params.get('sort') ?? 'available';
    const sort: SortOption = VALID_SORTS.includes(sortParam as SortOption)
      ? (sortParam as SortOption)
      : 'available';

    const result = await getAvailabilitySearch(orgId, from, to, {
      disciplineId,
      departmentId,
      minHours: minHours && !isNaN(minHours) ? minHours : undefined,
      sort,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
