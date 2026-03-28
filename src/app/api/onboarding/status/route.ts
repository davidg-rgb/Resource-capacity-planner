import { NextResponse } from 'next/server';

import { getOnboardingStatus } from '@/features/onboarding/onboarding.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

export async function GET() {
  try {
    const orgId = await getTenantId();
    const status = await getOnboardingStatus(orgId);
    return NextResponse.json(status);
  } catch (error) {
    return handleApiError(error);
  }
}
