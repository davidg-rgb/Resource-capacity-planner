// v5.0 — §6.11: GET /api/v5/capacity/breakdown
//
// "Why is this cell red?" — returns contributing projects/people for a
// single (scope, scopeId, monthKey) drill-down.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCapacityBreakdown } from '@/features/capacity/capacity.read';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const MONTH_KEY = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM');

const Query = z.object({
  scope: z.enum(['person', 'project', 'department']),
  scopeId: z.string().uuid('scopeId must be a UUID'),
  monthKey: MONTH_KEY,
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const url = new URL(request.url);
    const parsed = Query.parse(Object.fromEntries(url.searchParams));

    const rows = await getCapacityBreakdown({
      orgId,
      scope: parsed.scope,
      scopeId: parsed.scopeId,
      monthKey: parsed.monthKey,
    });

    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
