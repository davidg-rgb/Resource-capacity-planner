import { NextRequest } from 'next/server';

import { exportTenantData } from '@/features/platform/platform-tenant-data.service';
import { handleApiError } from '@/lib/api-utils';
import { logPlatformAction } from '@/lib/platform-audit';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { orgId } = await params;

    const data = await exportTenantData(orgId);

    await logPlatformAction({
      adminId: admin.adminId,
      action: 'tenant.export',
      targetOrgId: orgId,
    });

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tenant-export-${orgId}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
