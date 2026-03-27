import { cookies, headers } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

import { AuthError } from './errors';

export const PLATFORM_COOKIE = 'platform-token';

export interface PlatformAdmin {
  adminId: string;
  email: string;
  name: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.PLATFORM_ADMIN_SECRET;
  if (!secret) throw new Error('PLATFORM_ADMIN_SECRET is not set');
  return new TextEncoder().encode(secret);
}

/**
 * Sign a JWT for a platform admin session.
 */
export async function signPlatformToken(payload: PlatformAdmin): Promise<string> {
  const expiry = process.env.PLATFORM_ADMIN_TOKEN_EXPIRY ?? '8h';
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getSecret());
}

/**
 * Verify the platform admin JWT from the httpOnly cookie.
 * Throws AuthError if not authenticated.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_COOKIE)?.value;
  if (!token) throw new AuthError('Platform admin not authenticated');

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    throw new AuthError('Invalid or expired platform token');
  }
}

/**
 * Get request headers for audit logging (IP address, user agent).
 */
export async function getRequestMeta(): Promise<{ ipAddress: string; userAgent: string }> {
  const h = await headers();
  const ipAddress = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
  const userAgent = h.get('user-agent') ?? 'unknown';
  return { ipAddress, userAgent };
}
