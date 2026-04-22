// v6.0 — Phase 53 / Plan 53-02 (POLISH-01 / D-01): GET /api/v5/capacity/overcommit/count
//
// Response shape: { count: number }
//
// Threat-model mitigations (53-02-PLAN.md <threat_model>):
//   - T-53-06 Elevation:           requireRole('planner') — Clerk gate + tenant
//                                  derivation via orgId from Clerk session.
//                                  Note: personas are UX shortcuts (ADR-004);
//                                  Clerk has no 'rd' role, so 'planner' is
//                                  used here — mirrors LM-03 (`/queue/count`
//                                  is gated by 'planner' even though it's a
//                                  line-manager surface). Admin / owner
//                                  pass the role hierarchy check too.
//   - T-53-07 Info Disclosure DB:  service filters by organizationId
//                                  (tenant isolation); integration test
//                                  (`tenant isolation`) asserts zero leak.
//
// This endpoint is NOT feature-flag-gated: only UI consumption reads
// uiV6Polish. No user-provided query params beyond auth (per D-01).

import { NextRequest, NextResponse } from 'next/server';

import { getOvercommitCount } from '@/features/capacity/capacity.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const count = await getOvercommitCount(orgId);
    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
