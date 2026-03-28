import { flag, dedupe } from 'flags/next';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';

import { getOrgFlags } from './flag.service';

/**
 * Dedupe'd identify function -- resolves the current Clerk session's orgId.
 * Returns undefined if no org membership (flags will use defaultValue).
 */
const identify = dedupe(async () => {
  const { orgId } = await auth();
  return orgId ? { clerkOrgId: orgId } : undefined;
});

/**
 * Dedupe'd resolver: Clerk orgId -> internal UUID.
 * Cached per request so multiple flag evaluations share one DB lookup.
 */
const resolveOrgId = dedupe(async (clerkOrgId: string): Promise<string | null> => {
  const [org] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.clerkOrgId, clerkOrgId))
    .limit(1);
  return org?.id ?? null;
});

/**
 * Shared decide helper: resolve org, load flags, return specific flag value.
 */
async function decideFlag(
  entities: { clerkOrgId: string } | undefined,
  flagName: 'dashboards' | 'pdfExport' | 'alerts' | 'onboarding',
): Promise<boolean> {
  if (!entities?.clerkOrgId) return false;
  const orgId = await resolveOrgId(entities.clerkOrgId);
  if (!orgId) return false;
  const flags = await getOrgFlags(orgId);
  return flags[flagName];
}

export const dashboardsFlag = flag<boolean, { clerkOrgId: string }>({
  key: 'dashboards',
  defaultValue: false,
  identify,
  decide: async ({ entities }) => decideFlag(entities, 'dashboards'),
  description: 'Gates access to the management dashboards feature',
  options: [
    { value: false, label: 'Disabled' },
    { value: true, label: 'Enabled' },
  ],
});

export const pdfExportFlag = flag<boolean, { clerkOrgId: string }>({
  key: 'pdfExport',
  defaultValue: false,
  identify,
  decide: async ({ entities }) => decideFlag(entities, 'pdfExport'),
  description: 'Gates access to PDF export from Team Overview',
  options: [
    { value: false, label: 'Disabled' },
    { value: true, label: 'Enabled' },
  ],
});

export const alertsFlag = flag<boolean, { clerkOrgId: string }>({
  key: 'alerts',
  defaultValue: false,
  identify,
  decide: async ({ entities }) => decideFlag(entities, 'alerts'),
  description: 'Gates access to the capacity alerts feature',
  options: [
    { value: false, label: 'Disabled' },
    { value: true, label: 'Enabled' },
  ],
});

export const onboardingFlag = flag<boolean, { clerkOrgId: string }>({
  key: 'onboarding',
  defaultValue: false,
  identify,
  decide: async ({ entities }) => decideFlag(entities, 'onboarding'),
  description: 'Gates access to the onboarding wizard',
  options: [
    { value: false, label: 'Disabled' },
    { value: true, label: 'Enabled' },
  ],
});
