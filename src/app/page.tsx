import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

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
  redirect(getRoleLandingPage(orgRole));
}
