import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';

import { AuthError, ForbiddenError } from './errors';

export interface ActorInfo {
  /** The platform admin identifier from the actor token (e.g. "platform-admin:<id>") */
  actorId: string;
  /** Whether this session is an impersonation session */
  isImpersonation: true;
}

/**
 * Check if the current session is an impersonation session (Clerk actor token).
 * Returns actor info if impersonating, null otherwise.
 *
 * During impersonation, all actions are tracked by the impersonation session
 * (stored in impersonationSessions table with actionCount). The actor claim
 * contains the platform admin's identity as `{ sub: "platform-admin:<adminId>" }`.
 */
export async function getActorInfo(): Promise<ActorInfo | null> {
  const session = await auth();
  const actor = (session as Record<string, unknown>).actor as { sub?: string } | undefined;
  if (!actor?.sub) return null;
  return {
    actorId: actor.sub,
    isImpersonation: true,
  };
}

export type Role = 'viewer' | 'planner' | 'admin' | 'owner';

export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  planner: 1,
  admin: 2,
  owner: 3,
};

const CLERK_ROLE_MAP: Record<string, Role> = {
  'org:viewer': 'viewer',
  'org:planner': 'planner',
  'org:admin': 'admin',
  'org:owner': 'owner',
};

/**
 * Extract the tenant (organization) ID from the current Clerk session.
 * Throws AuthError if no session, ForbiddenError if no org membership.
 * Resolves the Clerk org ID to the internal UUID for DB queries.
 */
export async function getTenantId(): Promise<string> {
  const { userId, orgId } = await auth();
  if (!userId) throw new AuthError('Not authenticated');
  if (!orgId) throw new ForbiddenError('No organization membership');

  const [org] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.clerkOrgId, orgId))
    .limit(1);

  if (!org) throw new ForbiddenError('Organization not found in database');
  return org.id;
}

/**
 * Verify the current user has at least the specified role level.
 * Role hierarchy: viewer < planner < admin < owner.
 * requireRole('admin') allows admin AND owner.
 */
export async function requireRole(minimumRole: Role): Promise<{
  orgId: string;
  userId: string;
  role: Role;
}> {
  const { userId, orgId: clerkOrgId, orgRole } = await auth();
  if (!userId) throw new AuthError('Not authenticated');
  if (!clerkOrgId) throw new ForbiddenError('No organization membership');

  const role = CLERK_ROLE_MAP[orgRole ?? ''];
  if (!role) throw new ForbiddenError('Unknown role');
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minimumRole]) {
    throw new ForbiddenError(`${minimumRole} role required for this action`);
  }

  const [org] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.clerkOrgId, clerkOrgId))
    .limit(1);

  if (!org) throw new ForbiddenError('Organization not found in database');
  return { orgId: org.id, userId, role };
}
