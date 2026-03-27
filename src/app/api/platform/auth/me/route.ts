import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export async function GET() {
  try {
    const admin = await requirePlatformAdmin();
    return NextResponse.json({ admin });
  } catch (error) {
    return handleApiError(error);
  }
}
