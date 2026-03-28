import { and, count, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';

import type { OnboardingStatus } from './onboarding.types';

/**
 * Check whether an organization has completed onboarding.
 * Returns true if onboardingCompletedAt is set (non-null).
 */
export async function isOrgOnboarded(orgId: string): Promise<boolean> {
  const [org] = await db
    .select({ onboardingCompletedAt: schema.organizations.onboardingCompletedAt })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);

  return org?.onboardingCompletedAt != null;
}

/**
 * Mark an organization as having completed onboarding.
 * Sets onboardingCompletedAt to the current timestamp.
 */
export async function markOnboarded(orgId: string): Promise<void> {
  await db
    .update(schema.organizations)
    .set({ onboardingCompletedAt: new Date() })
    .where(
      and(eq(schema.organizations.id, orgId), isNull(schema.organizations.onboardingCompletedAt)),
    );
}

/**
 * Get the full onboarding status for an organization.
 * Returns whether onboarded plus counts of departments, disciplines, and people.
 */
export async function getOnboardingStatus(orgId: string): Promise<OnboardingStatus> {
  const [org] = await db
    .select({ onboardingCompletedAt: schema.organizations.onboardingCompletedAt })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);

  const [[deptResult], [discResult], [personResult]] = await Promise.all([
    db
      .select({ value: count() })
      .from(schema.departments)
      .where(eq(schema.departments.organizationId, orgId)),
    db
      .select({ value: count() })
      .from(schema.disciplines)
      .where(eq(schema.disciplines.organizationId, orgId)),
    db
      .select({ value: count() })
      .from(schema.people)
      .where(eq(schema.people.organizationId, orgId)),
  ]);

  return {
    isOnboarded: org?.onboardingCompletedAt != null,
    departmentCount: deptResult?.value ?? 0,
    disciplineCount: discResult?.value ?? 0,
    personCount: personResult?.value ?? 0,
  };
}
