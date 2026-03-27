import { count, gte, sql } from 'drizzle-orm';

import { db } from '@/db';
import { allocations, organizations, people } from '@/db/schema';

export interface DashboardMetrics {
  totalOrgs: number;
  totalUsers: number;
  totalAllocations: number;
  totalPeople: number;
  orgsByStatus: Record<string, number>;
  recentlyActive: Array<{
    id: string;
    name: string;
    slug: string;
    subscriptionStatus: string;
    updatedAt: Date;
  }>;
}

/**
 * Aggregate dashboard metrics across all tenants.
 * - totalOrgs: count of all organizations
 * - totalUsers: count of all people records (not Clerk users)
 * - orgsByStatus: count of orgs grouped by subscription status
 * - recentlyActive: orgs updated in the last 7 days
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [orgCountResult] = await db.select({ value: count() }).from(organizations);
  const totalOrgs = orgCountResult?.value ?? 0;

  const [peopleCountResult] = await db.select({ value: count() }).from(people);
  const totalPeople = peopleCountResult?.value ?? 0;

  const [allocationCountResult] = await db.select({ value: count() }).from(allocations);
  const totalAllocations = allocationCountResult?.value ?? 0;

  // totalUsers here is the people count (DB records), not Clerk users
  const totalUsers = totalPeople;

  const statusCounts = await db
    .select({
      status: organizations.subscriptionStatus,
      count: count(),
    })
    .from(organizations)
    .groupBy(organizations.subscriptionStatus);

  const orgsByStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    orgsByStatus[row.status] = row.count;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentlyActive = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      subscriptionStatus: organizations.subscriptionStatus,
      updatedAt: organizations.updatedAt,
    })
    .from(organizations)
    .where(gte(organizations.updatedAt, sevenDaysAgo))
    .orderBy(sql`${organizations.updatedAt} DESC`)
    .limit(10);

  return { totalOrgs, totalUsers, totalAllocations, totalPeople, orgsByStatus, recentlyActive };
}
