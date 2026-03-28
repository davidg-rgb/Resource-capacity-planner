import { NextResponse } from 'next/server';

import { getSystemHealth } from '@/features/platform/platform-health.service';
import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requirePlatformAdmin();
    const health = await getSystemHealth();
    return NextResponse.json(health);
  } catch (error) {
    return handleApiError(error);
  }
}
