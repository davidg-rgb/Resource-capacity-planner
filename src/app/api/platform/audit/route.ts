import { NextRequest, NextResponse } from 'next/server';

import { queryAuditLog } from '@/features/platform/platform-audit.service';
import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();
    void admin; // auth check only

    const searchParams = request.nextUrl.searchParams;

    const result = await queryAuditLog({
      adminId: searchParams.get('adminId') ?? undefined,
      action: searchParams.get('action') ?? undefined,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      page: searchParams.has('page') ? Number(searchParams.get('page')) : undefined,
      pageSize: searchParams.has('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
