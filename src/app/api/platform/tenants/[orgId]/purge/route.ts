import { NextRequest, NextResponse } from 'next/server';

import { purgeTenantData } from '@/features/platform/platform-tenant-data.service';
import { getTenantDetail } from '@/features/platform/platform-tenant.service';
import { handleApiError } from '@/lib/api-utils';
import { ValidationError } from '@/lib/errors';
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
      throw new ValidationError('Confirmation name is required');
    }

    const tenant = await getTenantDetail(orgId);

    if (confirmName !== tenant.name) {
      throw new ValidationError('Confirmation name does not match');
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
