import { NextRequest, NextResponse } from 'next/server';

import { updateSubscription } from '@/features/platform/platform-tenant.service';
import { subscriptionUpdateSchema } from '@/features/platform/platform-tenant.schema';
import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { logPlatformAction } from '@/lib/platform-audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { orgId } = await params;
    const data = subscriptionUpdateSchema.parse(await request.json());
    await updateSubscription(orgId, data);
    await logPlatformAction({
      adminId: admin.adminId,
      action: 'subscription.update',
      targetOrgId: orgId,
      details: data,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
