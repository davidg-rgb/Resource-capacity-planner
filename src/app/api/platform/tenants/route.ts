import { NextResponse } from 'next/server';

import { listTenants } from '@/features/platform/platform-tenant.service';
import { handleApiError } from '@/lib/api-utils';
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
