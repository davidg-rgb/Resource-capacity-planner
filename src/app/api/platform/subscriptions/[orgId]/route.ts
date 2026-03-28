import { NextRequest, NextResponse } from 'next/server';

import { getTenantDetail, updateSubscription } from '@/features/platform/platform-tenant.service';
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

    // Fetch current values before update for audit trail
    const current = await getTenantDetail(orgId);
    const oldValues: Record<string, unknown> = {};
    if (data.subscriptionStatus !== undefined)
      oldValues.subscriptionStatus = current.subscriptionStatus;
    if (data.trialEndsAt !== undefined) oldValues.trialEndsAt = current.trialEndsAt;
    if (data.platformNotes !== undefined) oldValues.platformNotes = current.platformNotes;

    await updateSubscription(orgId, data);
    await logPlatformAction({
      adminId: admin.adminId,
      action: 'subscription.update',
      targetOrgId: orgId,
      details: { old: oldValues, new: data },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
