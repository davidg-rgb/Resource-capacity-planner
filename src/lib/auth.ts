import { auth } from '@clerk/nextjs/server';

import { AuthError, ForbiddenError } from './errors';

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
 * The returned orgId is the Clerk org ID -- use it with withTenant() for DB queries.
 */
export async function getTenantId(): Promise<string> {
  const { userId, orgId } = await auth();
  if (!userId) throw new AuthError('Not authenticated');
  if (!orgId) throw new ForbiddenError('No organization membership');
  return orgId;
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
  const { userId, orgId, orgRole } = await auth();
  if (!userId) throw new AuthError('Not authenticated');
  if (!orgId) throw new ForbiddenError('No organization membership');

  const role = CLERK_ROLE_MAP[orgRole ?? ''];
  if (!role) throw new ForbiddenError('Unknown role');
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minimumRole]) {
    throw new ForbiddenError(`${minimumRole} role required for this action`);
  }

  return { orgId, userId, role };
}
