// v5.0 — Phase 40 / Plan 40-02: GET /api/v5/planning/pm-home
// Req: UX-V5-02 (PM Home data source).
//
// Thin HTTP wrapper around planning.read.getPmOverview. All business logic
// lives in planning.read.ts; this route only:
//   1. Enforces planner+ auth via requireRole.
//   2. Parses query params with zod (personId = the PM persona identity).
//   3. Defaults to a 13-month window (current - 1 .. current + 11).
//   4. Delegates to getPmOverview and maps AppError -> HTTP via handleApiError.
//
// Persona note (ADR-004): personas are UX scopes, not security boundaries —
// the caller supplies `personId` to identify which PM's overview to return.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getPmOverview } from '@/features/planning/planning.read';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const MONTH_KEY = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM');

const Query = z.object({
  personId: z.string().uuid(),
  startMonth: MONTH_KEY.optional(),
  endMonth: MONTH_KEY.optional(),
});

function defaultMonthRange(): { from: string; to: string } {
  // 13-month window: current - 1 .. current + 11.
  const current = getCurrentMonth();
  const [y, m] = current.split('-').map(Number);
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const range = generateMonthRange(prevMonth, 13);
  return { from: range[0]!, to: range[range.length - 1]! };
}

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const parsed = Query.parse(Object.fromEntries(request.nextUrl.searchParams));

    const fallback = defaultMonthRange();
    const from = parsed.startMonth ?? fallback.from;
    const to = parsed.endMonth ?? fallback.to;

    const result = await getPmOverview({
      orgId,
      leadPmPersonId: parsed.personId,
      monthRange: { from, to },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
