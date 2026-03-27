import { NextRequest, NextResponse } from 'next/server';

import { createTenant, listTenants } from '@/features/platform/platform-tenant.service';
import { createTenantSchema } from '@/features/platform/platform-tenant.schema';
import { handleApiError } from '@/lib/api-utils';
import { logPlatformAction } from '@/lib/platform-audit';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export async function GET() {
  try {
    await requirePlatformAdmin();
    const tenants = await listTenants();
    return NextResponse.json(tenants);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();
    const body = createTenantSchema.parse(await request.json());
    const org = await createTenant(body);
    await logPlatformAction({
      adminId: admin.adminId,
      action: 'tenant.create',
      targetOrgId: org.id,
      details: { name: body.name, slug: body.slug },
    });
    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
