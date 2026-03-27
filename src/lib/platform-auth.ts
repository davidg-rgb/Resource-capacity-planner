import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

import { env } from './env';
import { AuthError } from './errors';

export const PLATFORM_COOKIE = 'platform-token';

export interface PlatformAdmin {
  adminId: string;
  email: string;
  name: string;
}

function getSecret(): Uint8Array {
  if (!env.PLATFORM_ADMIN_SECRET) {
    throw new AuthError('Platform admin not configured');
  }
  return new TextEncoder().encode(env.PLATFORM_ADMIN_SECRET);
}

export async function signPlatformToken(payload: PlatformAdmin): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.PLATFORM_ADMIN_TOKEN_EXPIRY)
    .setIssuer('nordic-capacity-platform')
    .sign(getSecret());
}

export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_COOKIE)?.value;

  if (!token) {
    throw new AuthError('Platform authentication required');
  }

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: 'nordic-capacity-platform',
    });

    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    throw new AuthError('Invalid or expired platform token');
  }
}
