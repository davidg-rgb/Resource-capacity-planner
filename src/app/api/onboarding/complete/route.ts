import { NextResponse } from 'next/server';

import { markOnboarded } from '@/features/onboarding/onboarding.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

export async function POST() {
  try {
    const orgId = await getTenantId();
    await markOnboarded(orgId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
