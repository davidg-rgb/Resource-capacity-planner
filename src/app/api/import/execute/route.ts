import { NextRequest, NextResponse } from 'next/server';

import { executeRequestSchema } from '@/features/import/import.schema';
import { executeImport } from '@/features/import/import.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

/**
 * POST /api/import/execute
 *
 * Executes a bulk import of validated allocations in a single DB transaction.
 * Supports up to 5,000 rows. Rolls back completely on any error.
 *
 * Requires planner role minimum.
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');

    const body = await request.json();
    const parsed = executeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await executeImport(orgId, parsed.data.rows);
    if (result.error) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
