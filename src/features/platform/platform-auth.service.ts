import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { platformAdmins } from '@/db/schema';
import { AuthError } from '@/lib/errors';

// MED-10: a constant bcrypt hash compared against when the email is unknown
// or the admin is inactive. Without this, bcrypt.compare only runs for known
// emails, leaking the admin set via response-time timing analysis. Generated
// once at import (~100-300ms cost on first request); after that the cost is
// uniform across the unknown-email and known-email paths.
const DUMMY_HASH = bcrypt.hashSync('platform-auth-dummy-password', 10);

export async function verifyPlatformLogin(
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string }> {
  const [admin] = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.email, email))
    .limit(1);

  if (!admin || !admin.isActive) {
    // Run bcrypt anyway so the unknown/inactive path takes the same wall
    // time as the known-credentials-but-wrong-password path.
    await bcrypt.compare(password, DUMMY_HASH);
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
