import { NextRequest, NextResponse } from 'next/server';

import { getCapacityAlerts } from '@/features/analytics/analytics.service';
import { getOrgFlags } from '@/features/flags/flag.service';
import { getTenantId } from '@/lib/auth';

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();

    const flags = await getOrgFlags(orgId);
    if (!flags.alerts) {
      return NextResponse.json(
        { error: 'Feature not enabled' },
        { status: 403 },
      );
    }

    const params = request.nextUrl.searchParams;
    const from = params.get('from');
    const to = params.get('to');

    if (!from || !to || !MONTH_RE.test(from) || !MONTH_RE.test(to)) {
      return NextResponse.json(
        { error: 'Invalid parameters. Required: from (YYYY-MM), to (YYYY-MM)' },
        { status: 400 },
      );
    }

    const result = await getCapacityAlerts(orgId, from, to);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[analytics-alerts] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
