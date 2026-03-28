'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowDownRight } from 'lucide-react';

import type { CapacityAlert } from '@/features/analytics/analytics.types';

interface AlertListProps {
  alerts: CapacityAlert[];
}

/**
 * Alert list grouped by severity: overloaded (red) and underutilized (amber).
 * Each person name links to their input form for quick remediation.
 */
export function AlertList({ alerts }: AlertListProps) {
  const overloaded = alerts.filter((a) => a.severity === 'overloaded');
  const underutilized = alerts.filter((a) => a.severity === 'underutilized');

  if (overloaded.length === 0 && underutilized.length === 0) {
    return (
      <div className="border-outline-variant/30 bg-surface-container-low rounded-lg border p-8 text-center">
        <p className="text-on-surface-variant">No capacity alerts for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {overloaded.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-headline text-on-surface text-lg font-semibold">Overloaded</h2>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {overloaded.length}
            </span>
          </div>
          <div className="divide-outline-variant/30 border-outline-variant/30 bg-surface-container-low divide-y rounded-lg border">
            {overloaded.map((alert) => (
              <AlertItem key={alert.personId} alert={alert} accent="red" />
            ))}
          </div>
        </section>
      )}

      {underutilized.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <ArrowDownRight size={18} className="text-amber-500" />
            <h2 className="font-headline text-on-surface text-lg font-semibold">Underutilized</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {underutilized.length}
            </span>
          </div>
          <div className="divide-outline-variant/30 border-outline-variant/30 bg-surface-container-low divide-y rounded-lg border">
            {underutilized.map((alert) => (
              <AlertItem key={alert.personId} alert={alert} accent="amber" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AlertItem({ alert, accent }: { alert: CapacityAlert; accent: 'red' | 'amber' }) {
  const percentage = Math.round(alert.utilizationRatio * 100);
  const barWidth = Math.min(percentage, 200); // cap visual at 200%

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Link
          href={`/input/${alert.personId}`}
          className="text-primary font-medium hover:underline"
        >
          {alert.firstName} {alert.lastName}
        </Link>
        <p className="text-on-surface-variant text-xs">{alert.departmentName}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-24">
          <div className="bg-surface-container-high h-1.5 rounded-full">
            <div
              className={`h-1.5 rounded-full ${accent === 'red' ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min((barWidth / 200) * 100, 100)}%` }}
            />
          </div>
        </div>
        <span
          className={`min-w-[3.5rem] text-right text-sm font-semibold tabular-nums ${
            accent === 'red' ? 'text-red-600' : 'text-amber-600'
          }`}
        >
          {percentage}%
        </span>
      </div>
    </div>
  );
}
