import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { logPlatformAction } from '@/lib/platform-audit';
import { PLATFORM_COOKIE, requirePlatformAdmin } from '@/lib/platform-auth';

export async function POST() {
  try {
    const admin = await requirePlatformAdmin();

    await logPlatformAction({ adminId: admin.adminId, action: 'admin.logout' });

    const cookieStore = await cookies();
    cookieStore.set(PLATFORM_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
