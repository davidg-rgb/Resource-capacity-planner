import { NextRequest, NextResponse } from 'next/server';

import {
  countAllocationsFlat,
  listAllocationsFlat,
} from '@/features/allocations/allocation.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

import type { FlatTableFilters } from '@/features/allocations/allocation.types';

export async function GET(request: NextRequest) {
  try {
    // All authenticated org members can read/export (including viewers)
    const orgId = await getTenantId();
    const params = request.nextUrl.searchParams;

    const filters: FlatTableFilters = {
      personName: params.get('personName') ?? undefined,
      projectId: params.get('projectId') ?? undefined,
      departmentId: params.get('departmentId') ?? undefined,
      monthFrom: params.get('monthFrom') ?? undefined,
      monthTo: params.get('monthTo') ?? undefined,
    };

    const page = Math.max(1, Number(params.get('page') ?? '1'));
    const requestedSize = Number(params.get('pageSize') ?? '50');
    const pageSize = [25, 50, 100].includes(requestedSize) ? requestedSize : 50;

    const [rows, total] = await Promise.all([
      listAllocationsFlat(orgId, filters, { page, pageSize }),
      countAllocationsFlat(orgId, filters),
    ]);

    return NextResponse.json({
      rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
