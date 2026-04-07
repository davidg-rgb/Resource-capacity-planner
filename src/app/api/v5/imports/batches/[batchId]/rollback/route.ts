// v5.0 — Phase 38 / Plan 38-02 (TC-API-033, TC-API-034): POST rollback

import { NextRequest, NextResponse } from 'next/server';

import { rollbackBatch } from '@/features/import/actuals-import.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const { orgId, userId } = await requireRole('planner');
    const { batchId } = await params;
    const result = await rollbackBatch({
      orgId,
      batchId,
      actorPersonaId: userId,
      rolledBackBy: userId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
