import Link from 'next/link';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export default function DashboardPage() {
  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
        Dashboard
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Key capacity metrics and departmental overview.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/team"
          className="rounded-lg border border-outline p-4 hover:bg-surface-variant transition-colors"
        >
          <h2 className="font-semibold text-on-surface">Team Overview</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Capacity heat map across all team members
          </p>
        </Link>
      </div>
    </>
  );
}
