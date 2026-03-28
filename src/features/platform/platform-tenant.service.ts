import { eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { organizations } from '@/db/schema';
import { NotFoundError } from '@/lib/errors';

export interface TenantListItem {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  subscriptionStatus: string;
  userCount: number;
  createdAt: Date;
}

export interface TenantDetail {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  subscriptionStatus: string;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  trialEndsAt: Date | null;
  creditBalanceCents: number;
  platformNotes: string | null;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List all tenants with people count.
 */
export async function listTenants(): Promise<TenantListItem[]> {
  const rows = await db
    .select({
      id: organizations.id,
      clerkOrgId: organizations.clerkOrgId,
      name: organizations.name,
      slug: organizations.slug,
      subscriptionStatus: organizations.subscriptionStatus,
      createdAt: organizations.createdAt,
      userCount:
        sql<number>`(SELECT COUNT(*) FROM people WHERE people.organization_id = ${organizations.id})`.mapWith(
          Number,
        ),
    })
    .from(organizations)
    .orderBy(sql`${organizations.createdAt} DESC`);

  return rows;
}

/**
 * Get full tenant details including people count.
 */
export async function getTenantDetail(orgId: string): Promise<TenantDetail> {
  const [org] = await db
    .select({
      id: organizations.id,
      clerkOrgId: organizations.clerkOrgId,
      name: organizations.name,
      slug: organizations.slug,
      subscriptionStatus: organizations.subscriptionStatus,
      suspendedAt: organizations.suspendedAt,
      suspendedReason: organizations.suspendedReason,
      trialEndsAt: organizations.trialEndsAt,
      creditBalanceCents: organizations.creditBalanceCents,
      platformNotes: organizations.platformNotes,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
      userCount:
        sql<number>`(SELECT COUNT(*) FROM people WHERE people.organization_id = ${organizations.id})`.mapWith(
          Number,
        ),
    })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) throw new NotFoundError('Organization', orgId);
  return org;
}

/**
 * Create a new tenant organization.
 */
export async function createTenant(data: { name: string; slug: string }): Promise<{ id: string }> {
  const [org] = await db
    .insert(organizations)
    .values({
      clerkOrgId: `pending_${data.slug}_${Date.now()}`,
      name: data.name,
      slug: data.slug,
      subscriptionStatus: 'active',
    })
    .returning({ id: organizations.id });

  return { id: org.id };
}

/**
 * Suspend a tenant organization.
 */
export async function suspendTenant(orgId: string, reason: string): Promise<void> {
  const result = await db
    .update(organizations)
    .set({
      subscriptionStatus: 'suspended',
      suspendedAt: new Date(),
      suspendedReason: reason,
    })
    .where(eq(organizations.id, orgId))
    .returning({ id: organizations.id });

  if (result.length === 0) throw new NotFoundError('Organization', orgId);
}

/**
 * Reactivate a suspended tenant organization.
 */
export async function reactivateTenant(orgId: string): Promise<void> {
  const result = await db
    .update(organizations)
    .set({
      subscriptionStatus: 'active',
      suspendedAt: null,
      suspendedReason: null,
    })
    .where(eq(organizations.id, orgId))
    .returning({ id: organizations.id });

  if (result.length === 0) throw new NotFoundError('Organization', orgId);
}

/**
 * Delete a tenant organization (cascades via FK constraints).
 */
export async function deleteTenant(orgId: string): Promise<void> {
  const result = await db
    .delete(organizations)
    .where(eq(organizations.id, orgId))
    .returning({ id: organizations.id });

  if (result.length === 0) throw new NotFoundError('Organization', orgId);
}

/**
 * Update subscription details for a tenant.
 */
export async function updateSubscription(
  orgId: string,
  data: { subscriptionStatus?: string; trialEndsAt?: string; platformNotes?: string },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.subscriptionStatus) updates.subscriptionStatus = data.subscriptionStatus;
  if (data.trialEndsAt) updates.trialEndsAt = new Date(data.trialEndsAt);
  if (data.platformNotes !== undefined) updates.platformNotes = data.platformNotes;

  if (Object.keys(updates).length === 0) return;

  const result = await db
    .update(organizations)
    .set(updates)
    .where(eq(organizations.id, orgId))
    .returning({ id: organizations.id });

  if (result.length === 0) throw new NotFoundError('Organization', orgId);
}
