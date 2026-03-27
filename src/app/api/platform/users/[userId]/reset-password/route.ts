import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resetUserPassword } from '@/features/platform/platform-user.service';
import { handleApiError } from '@/lib/api-utils';
import { logPlatformAction } from '@/lib/platform-audit';
import { requirePlatformAdmin } from '@/lib/platform-auth';

const resetSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { userId } = await params;
    const body = resetSchema.parse(await request.json());

    await resetUserPassword(userId, body.newPassword);

    await logPlatformAction({
      adminId: admin.adminId,
      action: 'user.reset_password',
      targetUserId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
