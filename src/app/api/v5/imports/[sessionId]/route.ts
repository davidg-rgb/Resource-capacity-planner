// v5.0 — DELETE /api/v5/imports/{sessionId}: cancel a staged import session

import { NextRequest, NextResponse } from 'next/server';

import { cancelStaged } from '@/features/import/actuals-import.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { orgId } = await requireRole('planner');
    const { sessionId } = await params;
    await cancelStaged({ orgId, sessionId });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
