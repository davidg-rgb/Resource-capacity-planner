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
 *
 * HI-02: passes Clerk userId as actorPersonaId for the change_log row;
 * relies on handleApiError for the canonical AppError shape (the previous
 * hand-rolled `{error, details}` 400 + `{...result, error}` 500 returns
 * diverged from the v5 envelope).
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireRole('planner');

    const body = await request.json();
    const parsed = executeRequestSchema.parse(body);

    const result = await executeImport(orgId, parsed.rows, userId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
