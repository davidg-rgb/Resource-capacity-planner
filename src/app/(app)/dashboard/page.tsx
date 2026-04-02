import { Suspense } from 'react';

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
    </>
  );
}
