'use client';

// v6.0 Phase 53 Plan 04 POLISH-06 — inline strategic-alerts banner that replaces
// the `strategic-alerts` widget on the manager dashboard. Mounted above the
// dashboard grid when `uiV6Polish=true`. Returns null when no alerts exist so
// there is no empty-frame UI artifact.

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ALERTS_WINDOW_MONTHS } from '@/features/alerts/constants';
import { useAlerts } from '@/hooks/use-alerts';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';

/**
 * Inline banner that summarises the current count of active capacity alerts
 * and links to the full `/alerts` page. Re-uses the existing `useAlerts` hook
 * (no new endpoint) and the shared `ALERTS_WINDOW_MONTHS` window so the
 * banner, /alerts page and NotificationBell all query the same cache.
 *
 * Renders nothing when the count is 0 (empty-state short-circuit).
 */
export function StrategicAlertsBanner() {
  const t = useTranslations('v6.polish.banner');
  const monthFrom = getCurrentMonth();
  const monthTo = generateMonthRange(monthFrom, ALERTS_WINDOW_MONTHS).at(-1) ?? monthFrom;
  const { data: alerts } = useAlerts(monthFrom, monthTo);

  const count = alerts?.length ?? 0;
  if (count === 0) return null;

  return (
    <div
      role="alert"
      className="mb-6 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-600" />
        <span className="font-medium">{t('title', { count })}</span>
      </div>
      <Link
        href="/alerts"
        data-testid="strategic-alerts-banner-cta"
        // UI-MN-04: px-3 py-2 (with negative margins to keep the visual size
        // stable) brings the tap target ≥44x44px per WCAG 2.5.5.
        className="text-primary -mx-3 -my-2 rounded px-3 py-2 text-sm font-semibold hover:underline"
      >
        {t('cta')}
      </Link>
    </div>
  );
}
