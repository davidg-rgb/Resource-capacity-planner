import { NextRequest, NextResponse } from 'next/server';

import { validateRequestSchema } from '@/features/import/import.schema';
import { validateImportRows } from '@/features/import/import.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

/**
 * POST /api/import/validate
 *
 * Validates mapped import rows by fuzzy-matching person/project names
 * against existing data in the organization.
 *
 * Requires planner role minimum.
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');

    const body = await request.json();
    const parsed = validateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await validateImportRows(orgId, parsed.data.rows);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
