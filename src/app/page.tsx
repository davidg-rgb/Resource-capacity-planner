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

export default async function Home() {
  const { orgRole } = await auth();

  // v6.0 persona-aware landing (NAV-01, per D-01)
  try {
    const orgId = await getTenantId();
    const flags = await getOrgFlags(orgId);
    if (flags.uiV6Landing) {
      redirect('/home');
    }
  } catch {
    // Not authenticated or no org — fall through to role-based routing
  }

  redirect(getRoleLandingPage(orgRole));
}
