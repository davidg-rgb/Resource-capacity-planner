import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { platformAdmins } from '@/db/schema';
import { AuthError } from '@/lib/errors';

export async function verifyPlatformLogin(
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string }> {
  const [admin] = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.email, email))
    .limit(1);

  if (!admin) {
    throw new AuthError('Invalid credentials');
  }

  if (!admin.isActive) {
    throw new AuthError('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new AuthError('Invalid credentials');
  }

  // Update last login timestamp
  await db
    .update(platformAdmins)
    .set({ lastLoginAt: new Date() })
    .where(eq(platformAdmins.id, admin.id));

  return { id: admin.id, email: admin.email, name: admin.name };
}
