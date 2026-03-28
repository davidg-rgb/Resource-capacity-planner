import { NextRequest, NextResponse } from 'next/server';

import { deleteTenant, getTenantDetail } from '@/features/platform/platform-tenant.service';
import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { logPlatformAction } from '@/lib/platform-audit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { orgId } = await params;
    const tenant = await getTenantDetail(orgId);
    return NextResponse.json(tenant);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { orgId } = await params;

    // Server-side confirmation: require org name match
    const body = await request.json().catch(() => ({}));
    const confirmation = typeof body.confirmation === 'string' ? body.confirmation : '';
    const tenant = await getTenantDetail(orgId);
    if (confirmation !== tenant.name) {
      return NextResponse.json(
        { error: 'Confirmation does not match organization name' },
        { status: 400 },
      );
    }

    await deleteTenant(orgId);
    await logPlatformAction({
      adminId: admin.adminId,
      action: 'tenant.delete',
      targetOrgId: orgId,
      details: { orgName: tenant.name },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
