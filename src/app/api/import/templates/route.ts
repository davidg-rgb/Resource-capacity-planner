import { NextRequest, NextResponse } from 'next/server';

import {
  generateFlatTemplate,
  generatePivotTemplate,
} from '@/features/import/import.templates';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

/**
 * GET /api/import/templates?format=flat|pivot
 *
 * Downloads a pre-filled .xlsx import template.
 * Default format is 'flat' (one row per person/project/month).
 * 'pivot' format has month columns (grid layout).
 *
 * Requires planner role minimum.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole('planner');

    const format = request.nextUrl.searchParams.get('format');
    const buffer =
      format === 'pivot' ? generatePivotTemplate() : generateFlatTemplate();
    const filename =
      format === 'pivot' ? 'import-mall-pivot.xlsx' : 'import-mall.xlsx';

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
