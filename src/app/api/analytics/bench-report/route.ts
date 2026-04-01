import { NextRequest, NextResponse } from 'next/server';

import { getBenchReport, validateMonthRange } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    const thresholdParam = params.get('threshold');
    let threshold = 80;
    if (thresholdParam) {
      const parsed = Number(thresholdParam);
      if (!isNaN(parsed)) {
        threshold = Math.max(0, Math.min(100, parsed));
      }
    }

    const result = await getBenchReport(orgId, from, to, threshold);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
