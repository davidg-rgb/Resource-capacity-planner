import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { loginSchema } from '@/features/platform/platform-auth.schema';
import { verifyPlatformLogin } from '@/features/platform/platform-auth.service';
import { handleApiError } from '@/lib/api-utils';
import { logPlatformAction } from '@/lib/platform-audit';
import { PLATFORM_COOKIE, signPlatformToken } from '@/lib/platform-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const admin = await verifyPlatformLogin(email, password);

    const token = await signPlatformToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
    });

    await logPlatformAction({ adminId: admin.id, action: 'admin.login' });

    const cookieStore = await cookies();
    cookieStore.set(PLATFORM_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return NextResponse.json({ admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (error) {
    return handleApiError(error);
  }
}
