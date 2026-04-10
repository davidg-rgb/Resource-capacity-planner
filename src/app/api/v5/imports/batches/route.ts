// v5.0 — GET /api/v5/imports/batches: list committed import batches

import { NextRequest, NextResponse } from 'next/server';

import { listBatches } from '@/features/import/actuals-import.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200) : 50;

    const batches = await listBatches({ orgId, limit });
    return NextResponse.json(batches);
  } catch (error) {
    return handleApiError(error);
  }
}
