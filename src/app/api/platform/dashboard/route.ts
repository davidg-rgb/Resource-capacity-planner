import { NextResponse } from 'next/server';

import { getDashboardMetrics } from '@/features/platform/platform-dashboard.service';
import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export async function GET() {
  try {
    await requirePlatformAdmin();
    const metrics = await getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    return handleApiError(error);
  }
}
