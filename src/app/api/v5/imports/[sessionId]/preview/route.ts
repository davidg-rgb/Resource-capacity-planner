// v5.0 — Phase 38 / Plan 38-02 (TC-API-031): GET /api/v5/imports/{sessionId}/preview

import { NextRequest, NextResponse } from 'next/server';

import { previewStagedBatch } from '@/features/import/actuals-import.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { orgId } = await requireRole('planner');
    const { sessionId } = await params;
    const preview = await previewStagedBatch(orgId, sessionId);
    return NextResponse.json(preview);
  } catch (error) {
    return handleApiError(error);
  }
}
