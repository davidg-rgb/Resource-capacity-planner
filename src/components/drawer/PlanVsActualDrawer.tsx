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
import { useEffect } from 'react';

import { usePlanVsActualDrawer, type DrawerContext } from './usePlanVsActualDrawer';

import styles from './PlanVsActualDrawer.module.css';

export type DailyBreakdownRow = {
  date: string;
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

function formatHours(value: number): string {
  return value.toFixed(2);
}

export function PlanVsActualDrawer(props: PlanVsActualDrawerProps) {
  const { orgId, fetcher, contextOverride } = props;
  const t = useTranslations('v5.drawer');
  const store = usePlanVsActualDrawer();
  const context = contextOverride !== undefined ? contextOverride : store.context;
  const isOpen = context !== null;
  const fetchFn = fetcher ?? defaultFetcher;

  const query = useQuery({
    queryKey: [
      'drawer-daily',
      orgId,
      context?.personId ?? '',
      context?.projectId ?? '',
      context?.monthKey ?? '',
    ],
    queryFn: () =>
      fetchFn(orgId, {
        personId: context!.personId,
        projectId: context!.projectId,
        monthKey: context!.monthKey,
      }),
    enabled: isOpen,
  });

  // Esc to close.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') store.close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, store]);

  if (!isOpen || !context) return null;

  const titleText = t('title', {
    person: context.personName,
    project: context.projectName,
    month: context.monthLabel,
  });

  const rows = query.data ?? [];
  const showEmpty = !query.isLoading && !query.error && rows.length === 0;

  return (
    <div
      className={styles.backdrop}
      data-testid="drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) store.close();
      }}
    >
      <aside className={styles.panel} role="dialog" aria-label={titleText}>
        <header className={styles.header}>
          <h2 className={styles.title}>{titleText}</h2>
          <button
            type="button"
            className={styles.closeBtn}
            data-testid="drawer-close"
            onClick={store.close}
            aria-label={t('close')}
          >
            {t('close')}
          </button>
        </header>

        {query.isLoading && <p className={styles.status}>{t('loading')}</p>}
        {query.error && <p className={styles.status}>{t('error')}</p>}
        {showEmpty && (
          <p className={styles.status} data-testid="drawer-empty">
            {t('empty')}
          </p>
        )}

        {rows.length > 0 && (
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
              {rows.map((r) => (
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
      </aside>
    </div>
  );
}
