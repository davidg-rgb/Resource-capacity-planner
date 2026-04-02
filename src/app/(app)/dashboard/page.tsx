import { Suspense } from 'react';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { DashboardContent } from './dashboard-content';

export default function DashboardPage() {
  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-on-surface text-2xl font-semibold">Management Overview</h1>
      <p className="text-on-surface-variant font-body mt-1 text-sm">
        Operational capacity and resource health.
      </p>

      <Suspense
        fallback={
          <div className="mt-6 space-y-6">
            {/* KPI skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="border-outline-variant/30 bg-surface-container-low h-28 animate-pulse rounded-lg border"
                />
              ))}
            </div>
            {/* Chart skeleton */}
            <div className="grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="border-outline-variant/30 bg-surface-container-low h-[380px] animate-pulse rounded-lg border"
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
          className="border-outline-variant/30 hover:bg-surface-variant block rounded-lg border p-4 transition-colors"
        >
          <h2 className="text-on-surface font-semibold">Team Overview</h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            Capacity heat map across all team members
          </p>
        </Link>
      </div>
    </>
  );
}
