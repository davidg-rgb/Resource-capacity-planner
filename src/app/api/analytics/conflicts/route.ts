import { NextRequest, NextResponse } from 'next/server';

import { getConflicts } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    // month defaults to current month on the server side
    const monthParam = params.get('month') ?? undefined;
    const month = monthParam && MONTH_RE.test(monthParam) ? monthParam : undefined;

    const monthsParam = params.get('months');
    let months = 1;
    if (monthsParam) {
      const parsed = Number(monthsParam);
      if (!isNaN(parsed)) {
        months = Math.max(1, Math.min(12, parsed));
      }
    }

    const result = await getConflicts(orgId, month, months);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
