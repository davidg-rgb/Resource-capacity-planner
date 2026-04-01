import { NextRequest, NextResponse } from 'next/server';

import { getScenarioDashboardKPIs } from '@/features/scenarios/scenario-analytics.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/scenarios/:id/analytics/dashboard — scenario KPIs */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'ERR_VALIDATION', message: 'from and to query params required (YYYY-MM)' },
        { status: 400 },
      );
    }

    const kpis = await getScenarioDashboardKPIs(orgId, id, from, to);
    return NextResponse.json(kpis);
  } catch (error) {
    return handleApiError(error);
  }
}
