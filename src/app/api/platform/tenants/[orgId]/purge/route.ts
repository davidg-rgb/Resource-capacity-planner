import { NextRequest, NextResponse } from 'next/server';

import { purgeTenantData } from '@/features/platform/platform-tenant-data.service';
import { getTenantDetail } from '@/features/platform/platform-tenant.service';
import { handleApiError } from '@/lib/api-utils';
import { logPlatformAction } from '@/lib/platform-audit';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { orgId } = await params;

    const body = await request.json();
    const confirmName = typeof body.confirmName === 'string' ? body.confirmName : '';

    if (!confirmName) {
      return NextResponse.json(
        { error: 'Confirmation name is required' },
        { status: 400 },
      );
    }

    const tenant = await getTenantDetail(orgId);

    if (confirmName !== tenant.name) {
      return NextResponse.json(
        { error: 'Confirmation name does not match' },
        { status: 400 },
      );
    }

    const { deletedCounts } = await purgeTenantData(orgId);

    await logPlatformAction({
      adminId: admin.adminId,
      action: 'tenant.purge',
      targetOrgId: orgId,
      details: { deletedCounts },
    });

    return NextResponse.json({ success: true, deletedCounts });
  } catch (error) {
    return handleApiError(error);
  }
}
