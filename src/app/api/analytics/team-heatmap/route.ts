import { NextRequest, NextResponse } from 'next/server';

import { getTeamHeatMap } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const from = params.get('from');
    const to = params.get('to');

    if (!from || !to || !MONTH_RE.test(from) || !MONTH_RE.test(to)) {
      return NextResponse.json(
        { error: 'Invalid parameters. Required: from (YYYY-MM), to (YYYY-MM)' },
        { status: 400 },
      );
    }

    const dept = params.get('dept') ?? undefined;
    const disc = params.get('disc') ?? undefined;

    const result = await getTeamHeatMap(orgId, from, to, {
      departmentId: dept,
      disciplineId: disc,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[team-heatmap] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
