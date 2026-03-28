import { Suspense } from 'react';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { DashboardContent } from './dashboard-content';

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

      <Suspense
        fallback={
          <div className="mt-6 space-y-6">
            {/* KPI skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-lg border border-outline-variant/30 bg-surface-container-low"
                />
              ))}
            </div>
            {/* Chart skeleton */}
            <div className="grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[380px] animate-pulse rounded-lg border border-outline-variant/30 bg-surface-container-low"
                />
              ))}
            </div>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>

      {/* Team Overview link card */}
      <div className="mt-6">
        <Link
          href="/dashboard/team"
          className="block rounded-lg border border-outline-variant/30 p-4 transition-colors hover:bg-surface-variant"
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
