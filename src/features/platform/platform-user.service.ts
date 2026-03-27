import { clerkClient } from '@clerk/nextjs/server';

export async function searchUsers(query: string, limit = 20) {
  const client = await clerkClient();
  const users = await client.users.getUserList({ query, limit });

  return users.data.map((user) => ({
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt,
    lastSignInAt: user.lastSignInAt,
  }));
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const client = await clerkClient();
  await client.users.updateUser(userId, { password: newPassword });
  return { success: true as const };
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
