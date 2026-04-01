import { NextRequest, NextResponse } from 'next/server';

import { getPeriodComparison, validateMonthRange } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    // Validate both period ranges independently
    const { from: fromA, to: toA } = validateMonthRange(params.get('fromA'), params.get('toA'));
    const { from: fromB, to: toB } = validateMonthRange(params.get('fromB'), params.get('toB'));

    const result = await getPeriodComparison(orgId, fromA, toA, fromB, toB);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
