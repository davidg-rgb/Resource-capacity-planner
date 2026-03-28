import { cache } from 'react';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { featureFlags } from '@/db/schema';

import type { FeatureFlags, FlagName } from './flag.types';

const DEFAULT_FLAGS: FeatureFlags = {
  dashboards: false,
  pdfExport: false,
  alerts: false,
  onboarding: false,
};

/**
 * Load all feature flags for an organization in a single DB query.
 * Wrapped with React `cache()` for request-scope deduplication.
 */
export const getOrgFlags = cache(async function getOrgFlags(
  organizationId: string,
): Promise<FeatureFlags> {
  const rows = await db
    .select({
      flagName: featureFlags.flagName,
      enabled: featureFlags.enabled,
    })
    .from(featureFlags)
    .where(eq(featureFlags.organizationId, organizationId));

  const flags: FeatureFlags = { ...DEFAULT_FLAGS };

  for (const row of rows) {
    if (row.flagName in flags) {
      flags[row.flagName as FlagName] = row.enabled;
    }
  }

  return flags;
});
