import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { getOrgFlags } from '@/features/flags/flag.service';
import { getTenantId } from '@/lib/auth';

/**
 * Map Clerk organization role to the appropriate landing page.
 * Planners/viewers → heat map (primary value view)
 * Admins/owners → KPI dashboard (management overview)
 */
function getRoleLandingPage(orgRole: string | null | undefined): string {
  switch (orgRole) {
    case 'org:owner':
    case 'org:admin':
      return '/dashboard';
    case 'org:planner':
    case 'org:viewer':
    default:
      return '/dashboard/team';
  }
}

/**
 * v6.0 — Phase 50 / Plan 50-01 (NAV-01) + Round 1 audit CONS-P0-01:
 *
 * Server root checks the `uiV6Landing` feature flag. When the flag is enabled
 * for the org, redirect to `/home`, where a client-side PersonaRedirect reads
 * persona context and navigates to the persona's landing page.
 *
 * When the flag is off (or org/auth lookup fails — signed-out, no org), fall
 * through to the legacy role-based routing. This preserves the v1.0 behavior
 * verbatim for orgs that haven't opted into v6.0 personas yet.
 */
export default async function Home() {
  const { orgRole } = await auth();

  let landingFlagOn = false;
  try {
    const orgId = await getTenantId();
    const flags = await getOrgFlags(orgId);
    landingFlagOn = flags.uiV6Landing;
  } catch {
    // Not authenticated or no org — fall through to orgRole routing below.
  }

  if (landingFlagOn) {
    redirect('/home');
  }

  redirect(getRoleLandingPage(orgRole));
}
