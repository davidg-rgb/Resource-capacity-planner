// v5.0 — Phase 39 / Plan 39-05: GET /api/v5/proposals/[id]/impact
// Queue preview numbers for REQUIREMENTS line 45:
//   "Sara's June utilization 40% → 90%"
// Returns raw numbers — the UI assembles the sentence client-side in Plan 39-08.

import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';
import { getProposalImpact } from '@/features/proposals/proposal.read';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await requireRole('planner');
    const { id } = await params;

    const impact = await getProposalImpact(orgId, id);
    return NextResponse.json(impact, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
