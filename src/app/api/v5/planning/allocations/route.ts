// v5.0 — Phase 40 / Plan 40-02: GET /api/v5/planning/allocations
// Req: UX-V5-02 (PM project timeline data source).
//
// Thin HTTP wrapper around planning.read.getPmTimeline. All business logic
// lives in planning.read.ts. NotFoundError maps to 404 via handleApiError.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getPmTimeline } from '@/features/planning/planning.read';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const MONTH_KEY = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM');

const Query = z.object({
  scope: z.literal('pm'),
  projectId: z.string().uuid(),
  startMonth: MONTH_KEY,
  endMonth: MONTH_KEY,
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const parsed = Query.parse(Object.fromEntries(request.nextUrl.searchParams));

    const result = await getPmTimeline({
      orgId,
      projectId: parsed.projectId,
      monthRange: { from: parsed.startMonth, to: parsed.endMonth },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
