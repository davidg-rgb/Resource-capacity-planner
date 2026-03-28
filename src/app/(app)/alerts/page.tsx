'use client';

import { AlertList } from '@/components/alerts/alert-list';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { useAlerts } from '@/hooks/use-alerts';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';

export default function AlertsPage() {
  const monthFrom = getCurrentMonth();
  const monthTo = generateMonthRange(monthFrom, 3).at(-1)!;

  const { data, isLoading, isError, error } = useAlerts(monthFrom, monthTo);

  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-on-surface text-3xl font-semibold tracking-tight">
        Capacity Alerts
      </h1>
      <p className="text-on-surface-variant mt-2 text-sm">
        People with allocation levels outside healthy thresholds.
      </p>

      <div className="mt-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load alerts: {error?.message ?? 'Unknown error'}
          </div>
        )}

        {data && <AlertList alerts={data} />}
      </div>
    </>
  );
}
