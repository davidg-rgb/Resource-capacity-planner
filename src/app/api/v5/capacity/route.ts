// v5.0 — Phase 41 / Plan 41-01: GET /api/v5/capacity (UX-V5-04, D-15).
//
// Returns { cells, people } for the LM heatmap. Department-scoped, capped at
// 24 months to keep payload bounded.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getPersonMonthUtilization } from '@/features/capacity/capacity.read';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';

const MONTH_KEY = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM');

const Query = z.object({
  departmentId: z.string().min(1, 'departmentId is required'),
  startMonth: MONTH_KEY,
  endMonth: MONTH_KEY,
});

function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const url = new URL(request.url);
    const parsed = Query.parse(Object.fromEntries(url.searchParams));

    const span = monthsBetween(parsed.startMonth, parsed.endMonth);
    if (span < 1 || span > 24) {
      throw new ValidationError('monthRange must be between 1 and 24 months', {
        fields: [{ field: 'monthRange', message: `span ${span} not in [1,24]` }],
      });
    }

    const result = await getPersonMonthUtilization({
      orgId,
      departmentId: parsed.departmentId,
      monthRange: { start: parsed.startMonth, end: parsed.endMonth },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
