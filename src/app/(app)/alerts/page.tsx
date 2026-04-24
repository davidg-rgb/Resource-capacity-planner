'use client';

// v6.0 — Phase 53 / Plan 53-05 (POLISH-05): tabbed /alerts surface.
//
// When `uiV6Polish` is ON, /alerts becomes a two-tab view with query-param
// state: `?tab=warnings` (default) renders the existing AlertList; and
// `?tab=conflicts` renders <ResourceConflictsPanel/> (extracted from the
// legacy resource-conflict-widget in this plan).
//
// When `uiV6Polish` is OFF, the tab UI is hidden and the page renders the
// Phase-52 AlertList exactly as before (flag-off parity — see the POLISH-
// FLAG invariant in e2e/_invariants/flag-off-parity.spec.ts).
//
// Query-param pattern mirrors Phase 52 PM-02's PendingWishChip →
// /pm/wishes?tab=rejected deep-link: useSearchParams + router.replace
// (both require 'use client' — Pitfall 2 in 53-RESEARCH).

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { AlertList } from '@/components/alerts/alert-list';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import {
  ResourceConflictsPanel,
  defaultConflictsTimeRange,
} from '@/components/alerts/resource-conflicts-panel';
import { ALERTS_WINDOW_MONTHS } from '@/features/alerts/constants';
import { useFlags } from '@/features/flags/flag.context';
import { useAlerts } from '@/hooks/use-alerts';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';

// Phase 53 REVIEW-FIX WR-03: single source of truth for the tab allowlist.
// Deriving the AlertsTab type from the tuple keeps parseTab() + setTab()
// call sites in lock-step — adding a tab is one line here and TypeScript
// enforces the rest.
const ALERTS_TABS = ['warnings', 'conflicts'] as const;
type AlertsTab = (typeof ALERTS_TABS)[number];

function parseTab(raw: string | null): AlertsTab {
  // T-53-21: narrow client-controlled tab param to the allowlist; any
  // other value falls through to the default 'warnings' tab.
  return (ALERTS_TABS as readonly string[]).includes(raw ?? '') ? (raw as AlertsTab) : 'warnings';
}

export default function AlertsPage() {
  const flags = useFlags();
  const t = useTranslations('v6.polish.alerts.tabs');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tab: AlertsTab = parseTab(searchParams.get('tab'));

  const monthFrom = getCurrentMonth();
  const monthTo = generateMonthRange(monthFrom, ALERTS_WINDOW_MONTHS).at(-1) ?? monthFrom;
  const { data, isLoading, isError, error } = useAlerts(monthFrom, monthTo);

  const conflictsTimeRange = useMemo(() => defaultConflictsTimeRange(), []);

  function setTab(next: AlertsTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-on-surface text-3xl font-semibold tracking-tight">
        Capacity Alerts
      </h1>
      <p className="text-on-surface-variant mt-2 text-sm">
        People with allocation levels outside healthy thresholds.
      </p>

      {flags.uiV6Polish && (
        <div role="tablist" className="mt-6 flex gap-4 border-b">
          <button
            role="tab"
            aria-selected={tab === 'warnings'}
            onClick={() => setTab('warnings')}
            data-testid="alerts-tab-warnings"
            className={
              tab === 'warnings'
                ? 'border-primary text-primary border-b-2 pb-2 font-semibold'
                : 'text-on-surface-variant pb-2'
            }
          >
            {t('warnings')}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'conflicts'}
            onClick={() => setTab('conflicts')}
            data-testid="alerts-tab-conflicts"
            className={
              tab === 'conflicts'
                ? 'border-primary text-primary border-b-2 pb-2 font-semibold'
                : 'text-on-surface-variant pb-2'
            }
          >
            {t('conflicts')}
          </button>
        </div>
      )}

      <div className="mt-6">
        {/* Conflicts tab only renders when the polish flag is ON AND tab=conflicts.
            Flag-off always falls through to the warnings view (parity). */}
        {flags.uiV6Polish && tab === 'conflicts' ? (
          <ResourceConflictsPanel timeRange={conflictsTimeRange} />
        ) : (
          <>
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
          </>
        )}
      </div>
    </>
  );
}
