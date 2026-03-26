import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';
import { withTenant } from '@/lib/tenant';

export async function GET() {
  try {
    const orgId = await getTenantId();
    const disciplines = await withTenant(orgId).disciplines();
    return NextResponse.json({ disciplines });
  } catch (error) {
    return handleApiError(error);
  }
}
