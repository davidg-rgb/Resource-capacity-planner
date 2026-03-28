import { createHash } from 'crypto';

import { clerkClient } from '@clerk/nextjs/server';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { impersonationSessions, platformAdmins } from '@/db/schema';
import { env } from '@/lib/env';
import { ConflictError, NotFoundError } from '@/lib/errors';

export async function startImpersonation(
  adminId: string,
  targetUserId: string,
  targetOrgId: string,
) {
  // Prevent overlapping impersonation sessions for this admin
  const activeSessions = await listActiveSessions(adminId);
  if (activeSessions.length > 0) {
    throw new ConflictError(
      'You already have an active impersonation session. End it before starting a new one.',
      {
        activeSessionId: activeSessions[0].id,
      },
    );
  }

  const expiresAt = new Date(Date.now() + env.IMPERSONATION_MAX_DURATION_MINUTES * 60 * 1000);

  const client = await clerkClient();
  const actorToken = await client.actorTokens.create({
    userId: targetUserId,
    actor: { sub: `platform-admin:${adminId}` },
    expiresInSeconds: env.IMPERSONATION_MAX_DURATION_MINUTES * 60,
  });

  const tokenHash = createHash('sha256')
    .update(actorToken.token ?? '')
    .digest('hex');

  const [session] = await db
    .insert(impersonationSessions)
    .values({
      adminId,
      targetOrgId,
      targetUserId,
      tokenHash,
      expiresAt,
    })
    .returning({ id: impersonationSessions.id });

  return { sessionId: session.id, url: actorToken.url };
}

export async function endImpersonation(sessionId: string, adminId: string) {
  const result = await db
    .update(impersonationSessions)
    .set({ endedAt: new Date() })
    .where(
      and(
        eq(impersonationSessions.id, sessionId),
        eq(impersonationSessions.adminId, adminId),
        isNull(impersonationSessions.endedAt),
      ),
    )
    .returning({ id: impersonationSessions.id });

  if (result.length === 0) {
    throw new NotFoundError('Impersonation session', sessionId);
  }

  return true;
}

export async function listActiveSessions(adminId?: string) {
  const conditions = [
    isNull(impersonationSessions.endedAt),
    gt(impersonationSessions.expiresAt, new Date()),
  ];

  if (adminId) {
    conditions.push(eq(impersonationSessions.adminId, adminId));
  }

  const sessions = await db
    .select({
      id: impersonationSessions.id,
      adminId: impersonationSessions.adminId,
      adminName: platformAdmins.name,
      adminEmail: platformAdmins.email,
      targetOrgId: impersonationSessions.targetOrgId,
      targetUserId: impersonationSessions.targetUserId,
      startedAt: impersonationSessions.startedAt,
      expiresAt: impersonationSessions.expiresAt,
      actionCount: impersonationSessions.actionCount,
    })
    .from(impersonationSessions)
    .innerJoin(platformAdmins, eq(impersonationSessions.adminId, platformAdmins.id))
    .where(and(...conditions));

  return sessions;
}
