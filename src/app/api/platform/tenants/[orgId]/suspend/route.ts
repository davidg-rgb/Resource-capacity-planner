import { NextRequest, NextResponse } from 'next/server';

import { suspendTenant } from '@/features/platform/platform-tenant.service';
import { suspendSchema } from '@/features/platform/platform-tenant.schema';
import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { logPlatformAction } from '@/lib/platform-audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { orgId } = await params;
    const body = suspendSchema.parse(await request.json());
    await suspendTenant(orgId, body.reason);
    await logPlatformAction({
      adminId: admin.adminId,
      action: 'tenant.suspend',
      targetOrgId: orgId,
      details: { reason: body.reason },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
