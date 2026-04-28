// v6.0 — Phase 52 / Plan 52-02 (LM-03 / D-05): GET /api/v5/proposals/queue/count
//
// Response shape: { count: number, departmentId: string }
//
// Threat-model mitigations (52-02-PLAN.md <threat_model>):
//   - T-52-01 Spoofing:            requireRole('planner') — Clerk gate
//   - T-52-02 Tampering:           Zod z.string().uuid() on departmentId
//   - T-52-04 Info Disclosure DB:  service filters by organizationId (tenant isolation)
//   - T-52-05 Info Disclosure Log: no departmentId logged in plaintext;
//                                  handleApiError wraps ZodError without
//                                  echoing the attempted value beyond
//                                  the zod issue message (which names the
//                                  field, not the value).
//
// This endpoint is NOT feature-flag-gated (per open_questions Q6 in
// 52-CONTEXT.md): only UI consumption reads uiV6PerJourney.
//
// Authorization model note (mirrors src/app/api/v5/proposals/route.ts):
// Clerk has no 'lineManager' role; every proposal route is gated with
// requireRole('planner'). The server cannot prove "user IS THE line
// manager of dept X" — that UX-level concept is persona.departmentId,
// supplied by the client. Tenant scoping (orgId from Clerk) is
// enforced in the service WHERE clause.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getQueueCount } from '@/features/proposals/proposal.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const Query = z.object({ departmentId: z.string().uuid() });

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const url = new URL(request.url);
    const parsed = Query.parse(Object.fromEntries(url.searchParams.entries()));
    const count = await getQueueCount(orgId, parsed.departmentId);
    return NextResponse.json({ count, departmentId: parsed.departmentId }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
