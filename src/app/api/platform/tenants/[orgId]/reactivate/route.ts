import { NextRequest, NextResponse } from 'next/server';

import { reactivateTenant } from '@/features/platform/platform-tenant.service';
import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { logPlatformAction } from '@/lib/platform-audit';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { orgId } = await params;
    await reactivateTenant(orgId);
    await logPlatformAction({
      adminId: admin.adminId,
      action: 'tenant.reactivate',
      targetOrgId: orgId,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
