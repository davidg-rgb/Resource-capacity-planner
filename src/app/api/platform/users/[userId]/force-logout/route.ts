import { NextResponse } from 'next/server';

import { forceLogoutUser } from '@/features/platform/platform-user.service';
import { handleApiError } from '@/lib/api-utils';
import { logPlatformAction } from '@/lib/platform-audit';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export async function POST(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requirePlatformAdmin();
    const { userId } = await params;

    const result = await forceLogoutUser(userId);

    await logPlatformAction({
      adminId: admin.adminId,
      action: 'user.force_logout',
      targetUserId: userId,
    });

    return NextResponse.json({ success: true, revokedCount: result.revokedCount });
  } catch (error) {
    return handleApiError(error);
  }
}
