import { NextResponse } from 'next/server';

import { endImpersonation } from '@/features/platform/platform-impersonation.service';
import { handleApiError } from '@/lib/api-utils';
import { logPlatformAction } from '@/lib/platform-audit';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { sessionId } = await params;

    await endImpersonation(sessionId, admin.adminId);

    await logPlatformAction({
      adminId: admin.adminId,
      action: 'impersonation.end',
      impersonationSessionId: sessionId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
