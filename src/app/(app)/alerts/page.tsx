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

import { useRef } from 'react';
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
  const tPage = useTranslations('v6.polish.alerts.page');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tab: AlertsTab = parseTab(searchParams.get('tab'));

  const monthFrom = getCurrentMonth();
  const monthTo = generateMonthRange(monthFrom, ALERTS_WINDOW_MONTHS).at(-1) ?? monthFrom;
  const { data, isLoading, isError, error } = useAlerts(monthFrom, monthTo);

  const conflictsTimeRange = defaultConflictsTimeRange();

  // UI-02: roving-focus refs for ArrowLeft/ArrowRight tab keyboard nav (APG).
  const tabRefs = useRef<Record<AlertsTab, HTMLButtonElement | null>>({
    warnings: null,
    conflicts: null,
  });

  function setTab(next: AlertsTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function onTablistKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // APG tabs pattern: ArrowLeft/ArrowRight cycles through tabs, focus + activate.
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const currentIndex = ALERTS_TABS.indexOf(tab);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + delta + ALERTS_TABS.length) % ALERTS_TABS.length;
    const nextTab = ALERTS_TABS[nextIndex];
    setTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  }

  function tabButtonId(key: AlertsTab) {
    return `alerts-tab-${key}`;
  }
  function tabPanelId(key: AlertsTab) {
    return `alerts-panel-${key}`;
  }

  const activePanel: AlertsTab = flags.uiV6Polish && tab === 'conflicts' ? 'conflicts' : 'warnings';

  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-on-surface text-3xl font-semibold tracking-tight">
        {tPage('title')}
      </h1>
      <p className="text-on-surface-variant mt-2 text-sm">{tPage('subtitle')}</p>

      {flags.uiV6Polish && (
        <div
          role="tablist"
          aria-label={t('warnings') + ' / ' + t('conflicts')}
          onKeyDown={onTablistKeyDown}
          className="mt-6 flex gap-4 border-b"
        >
          {ALERTS_TABS.map((key) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                ref={(el) => {
                  tabRefs.current[key] = el;
                }}
                type="button"
                role="tab"
                id={tabButtonId(key)}
                aria-controls={tabPanelId(key)}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setTab(key)}
                data-testid={`alerts-tab-${key}`}
                className={
                  // UI-MN-04: px-4 py-3 gives a ≥44px tap target per WCAG 2.5.5.
                  // -mb-px keeps the border-b-2 selection underline flush.
                  isActive
                    ? 'border-primary text-primary -mb-px border-b-2 px-4 py-3 font-semibold'
                    : 'text-on-surface-variant -mb-px px-4 py-3'
                }
              >
                {t(key)}
              </button>
            );
          })}
        </div>
      )}

      <div
        className="mt-6"
        id={tabPanelId(activePanel)}
        role={flags.uiV6Polish ? 'tabpanel' : undefined}
        aria-labelledby={flags.uiV6Polish ? tabButtonId(activePanel) : undefined}
        tabIndex={flags.uiV6Polish ? 0 : undefined}
      >
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
