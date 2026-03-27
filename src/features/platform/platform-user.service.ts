import { clerkClient } from '@clerk/nextjs/server';

export interface UserWithMemberships {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  createdAt: number;
  lastSignInAt: number | null;
  memberships: Array<{ orgName: string; orgSlug: string; role: string }>;
}

export async function searchUsers(query: string, limit = 20): Promise<UserWithMemberships[]> {
  const client = await clerkClient();
  const users = await client.users.getUserList({ query, limit });

  // Fetch org memberships for the displayed page of users
  const results: UserWithMemberships[] = [];
  for (const user of users.data) {
    let memberships: Array<{ orgName: string; orgSlug: string; role: string }> = [];
    try {
      const membershipList = await client.users.getOrganizationMembershipList({ userId: user.id });
      memberships = membershipList.data.map((m) => ({
        orgName: m.organization.name,
        orgSlug: m.organization.slug ?? '',
        role: m.role,
      }));
    } catch {
      // If membership fetch fails for a user, continue with empty memberships
    }

    results.push({
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      memberships,
    });
  }

  return results;
}

/**
 * Generate a cryptographically random temporary password.
 */
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

/**
 * Set a temporary password for a user. If newPassword is provided, use it.
 * Otherwise, generate a random temporary password and return it.
 * The user should be instructed to change this password on next login.
 */
export async function resetUserPassword(userId: string, newPassword?: string) {
  const client = await clerkClient();
  const tempPassword = newPassword || generateTemporaryPassword();
  await client.users.updateUser(userId, { password: tempPassword });
  return { success: true as const, generatedPassword: newPassword ? undefined : tempPassword };
}

export async function forceLogoutUser(userId: string) {
  const client = await clerkClient();
  const sessions = await client.sessions.getSessionList({ userId });

  let revokedCount = 0;
  for (const session of sessions.data) {
    if (session.status === 'active') {
      await client.sessions.revokeSession(session.id);
      revokedCount++;
    }
  }

  return { revokedCount };
}
