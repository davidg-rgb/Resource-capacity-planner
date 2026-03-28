import { NextRequest, NextResponse } from 'next/server';

import { getCapacityAlerts, validateMonthRange } from '@/features/analytics/analytics.service';
import { getOrgFlags } from '@/features/flags/flag.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();

    const flags = await getOrgFlags(orgId);
    if (!flags.alerts) {
      return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    const result = await getCapacityAlerts(orgId, from, to);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
