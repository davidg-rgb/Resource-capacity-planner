import { NextRequest, NextResponse } from 'next/server';

import { exportAllocationsFlat } from '@/features/allocations/allocation.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

import type { FlatTableFilters } from '@/features/allocations/allocation.types';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const filters: FlatTableFilters = {
      personId: params.get('personId') ?? undefined,
      projectId: params.get('projectId') ?? undefined,
      departmentId: params.get('departmentId') ?? undefined,
      monthFrom: params.get('monthFrom') ?? undefined,
      monthTo: params.get('monthTo') ?? undefined,
    };

    const format = params.get('format') === 'csv' ? 'csv' : 'xlsx';
    const buffer = await exportAllocationsFlat(orgId, filters, format);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `allocations-${date}.${format}`;
    const contentType =
      format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
