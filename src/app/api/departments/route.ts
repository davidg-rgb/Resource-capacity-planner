import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';
import { withTenant } from '@/lib/tenant';

export async function GET() {
  try {
    const orgId = await getTenantId();
    const departments = await withTenant(orgId).departments();
    return NextResponse.json({ departments });
  } catch (error) {
    return handleApiError(error);
  }
}
