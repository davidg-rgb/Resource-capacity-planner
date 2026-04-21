'use client';

/**
 * v5.0 — Phase 37-02: PlanVsActualDrawer (ACT-04).
 *
 * Drill-down drawer showing the daily plan-vs-actual breakdown for a single
 * (person, project, month) tuple. Reads from the getDailyCellBreakdown
 * server action (which wraps getDailyRows from 37-01 + the per-day plan
 * derived via lib/time.distribute).
 *
 * Closes on Esc, Close button, or backdrop click.
 *
 * All strings via useTranslations('v5.drawer'); no JSX text literals
 * (eslint nordic v5 no-restricted-syntax guard).
 */

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';
import { FocusTrap } from 'focus-trap-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { usePlanVsActualDrawer, type DrawerContext } from './usePlanVsActualDrawer';

import styles from './PlanVsActualDrawer.module.css';

// v6.0 — Phase 52 / Plan 52-05 (SHARED-01 / D-11): the query-param trio that
// deep-links / strips when the drawer opens/closes. Exported so page-level
// effects in /pm/projects/[projectId] and /rd can share the same key list
// without drifting.
export const DRAWER_DEEP_LINK_PARAMS = ['drawer', 'personId', 'month'] as const;

export type DailyBreakdownRow = {
  date: string;
  planned: number;
  actual: number;
  delta: number;
};

/** Phase 42 / Plan 42-04 (D-17): R&D project-person-breakdown row. */
export type ProjectPersonRow = {
  personId: string;
  personName: string;
  planned: number;
  actual: number;
  delta: number;
};

export interface PlanVsActualDrawerProps {
  orgId: string;
  /** Optional fetcher injection (tests). Defaults to the server action. */
  fetcher?: (
    orgId: string,
    args: { personId: string; projectId: string; monthKey: string },
  ) => Promise<DailyBreakdownRow[]>;
  /** Optional project-person-breakdown fetcher (mode='project-person-breakdown'). */
  projectPersonFetcher?: (
    orgId: string,
    args: { projectId: string; monthKey: string },
  ) => Promise<ProjectPersonRow[]>;
  /** Override context (e.g. controlled outside the provider). */
  contextOverride?: DrawerContext | null;
}

async function defaultFetcher(
  orgId: string,
  args: { personId: string; projectId: string; monthKey: string },
): Promise<DailyBreakdownRow[]> {
  const mod = await import('@/features/actuals/actuals.cell.actions');
  const rows = await mod.getDailyCellBreakdown(orgId, args);
  return rows.map((r) => ({
    date: r.date,
    planned: r.planned,
    actual: r.actual,
    delta: r.delta,
  }));
}

async function defaultProjectPersonFetcher(
  orgId: string,
  args: { projectId: string; monthKey: string },
): Promise<ProjectPersonRow[]> {
  const mod = await import('@/features/actuals/actuals.cell.actions');
  const rows = await mod.getProjectPersonBreakdownAction(orgId, args);
  return rows.map((r) => ({
    personId: r.personId,
    personName: r.personName,
    planned: r.planned,
    actual: r.actual,
    delta: r.delta,
  }));
}

function formatHours(value: number): string {
  return value.toFixed(2);
}

export function PlanVsActualDrawer(props: PlanVsActualDrawerProps) {
  const { orgId, fetcher, projectPersonFetcher, contextOverride } = props;
  const t = useTranslations('v5.drawer');
  const store = usePlanVsActualDrawer();
  const context = contextOverride !== undefined ? contextOverride : store.context;
  const isOpen = context !== null;
  const fetchFn = fetcher ?? defaultFetcher;
  const projectPersonFn = projectPersonFetcher ?? defaultProjectPersonFetcher;
  const isDaily = context?.mode === 'daily';
  const isProjectPersonBreakdown = context?.mode === 'project-person-breakdown';

  // v6.0 — Phase 52 / Plan 52-05 (SHARED-01 / D-11): when the drawer closes,
  // strip the deep-link params (drawer, personId, month) so the URL no longer
  // advertises an "open drawer" state. router.replace keeps the history stack
  // clean — back-navigation returns to the timeline without re-triggering the
  // open effect.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handleClose = useCallback(() => {
    store.close();
    // Only mutate the URL if at least one of the drawer params is present;
    // this spares flag-OFF / non-deep-link callers from a no-op replace.
    const current = searchParams ?? new URLSearchParams();
    const hasAny = DRAWER_DEEP_LINK_PARAMS.some((k) => current.get(k) !== null);
    if (!hasAny) return;
    const next = new URLSearchParams(current.toString());
    for (const key of DRAWER_DEEP_LINK_PARAMS) next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [store, searchParams, router, pathname]);

  const query = useQuery({
    queryKey: [
      'drawer-daily',
      orgId,
      context?.personId ?? '',
      context?.projectId ?? '',
      context?.monthKey ?? '',
    ],
    queryFn: () => {
      // Phase 42 D-17: daily mode invariant — non-null personId required.
      if (context!.mode !== 'daily' || context!.personId === null) {
        throw new Error(
          `PlanVsActualDrawer: daily fetch requires mode='daily' with non-null personId (got mode='${context!.mode}')`,
        );
      }
      return fetchFn(orgId, {
        personId: context!.personId,
        projectId: context!.projectId,
        monthKey: context!.monthKey,
      });
    },
    enabled: isOpen && isDaily,
  });

  const projectPersonQuery = useQuery({
    queryKey: ['drawer-project-person', orgId, context?.projectId ?? '', context?.monthKey ?? ''],
    queryFn: () =>
      projectPersonFn(orgId, {
        projectId: context!.projectId,
        monthKey: context!.monthKey,
      }),
    enabled: isOpen && isProjectPersonBreakdown,
  });

  // Esc to close. v6.0 — Plan 52-05: routes through handleClose so the ESC
  // path also strips the deep-link query params (SHARED-01 / D-11).
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  if (!isOpen || !context) return null;

  const titleText = t('title', {
    person: context.personName,
    project: context.projectName,
    month: context.monthLabel,
  });

  const dailyRows = query.data ?? [];
  const personRows = projectPersonQuery.data ?? [];
  const activeQuery = isProjectPersonBreakdown ? projectPersonQuery : query;
  const activeRowsLen = isProjectPersonBreakdown ? personRows.length : dailyRows.length;
  const showEmpty = !activeQuery.isLoading && !activeQuery.error && activeRowsLen === 0;

  // v6.0 — Phase 52 / Plan 52-05 (SHARED-01 / D-11 / Q5): FocusTrap ensures
  // Tab cycling stays inside the drawer. `allowOutsideClick` lets the
  // backdrop-click handler fire (otherwise the trap swallows the click and
  // the drawer never closes). `fallbackFocus` points at the close button so
  // the trap stays activated even when the body is transiently empty
  // (loading state has no tabbable element).
  return (
    <FocusTrap
      focusTrapOptions={{
        allowOutsideClick: true,
        clickOutsideDeactivates: false,
        fallbackFocus: '[data-testid="drawer-close"]',
      }}
    >
      <div
        className={styles.backdrop}
        data-testid="drawer-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <aside className={styles.panel} role="dialog" aria-label={titleText}>
          <header className={styles.header}>
            <h2 className={styles.title}>{titleText}</h2>
            <button
              type="button"
              className={styles.closeBtn}
              data-testid="drawer-close"
              onClick={handleClose}
              aria-label={t('close')}
            >
              {t('close')}
            </button>
          </header>

        {activeQuery.isLoading && <p className={styles.status}>{t('loading')}</p>}
        {activeQuery.error && <p className={styles.status}>{t('error')}</p>}
        {showEmpty && (
          <p className={styles.status} data-testid="drawer-empty">
            {t('empty')}
          </p>
        )}

        {isDaily && dailyRows.length > 0 && (
          <table className={styles.table} data-testid="drawer-table">
            <thead>
              <tr>
                <th>{t('dateColumn')}</th>
                <th>{t('plannedColumn')}</th>
                <th>{t('actualColumn')}</th>
                <th>{t('deltaColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map((r) => (
                <tr key={r.date} data-testid="drawer-row">
                  <td>{r.date}</td>
                  <td>{formatHours(r.planned)}</td>
                  <td>{formatHours(r.actual)}</td>
                  <td>{formatHours(r.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {isProjectPersonBreakdown && personRows.length > 0 && (
          <table className={styles.table} data-testid="drawer-project-person-table">
            <thead>
              <tr>
                <th>{t('dateColumn')}</th>
                <th>{t('plannedColumn')}</th>
                <th>{t('actualColumn')}</th>
                <th>{t('deltaColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {personRows.map((r) => (
                <tr key={r.personId} data-testid="drawer-person-row">
                  <td>{r.personName}</td>
                  <td>{formatHours(r.planned)}</td>
                  <td>{formatHours(r.actual)}</td>
                  <td>{formatHours(r.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </aside>
      </div>
    </FocusTrap>
  );
}
