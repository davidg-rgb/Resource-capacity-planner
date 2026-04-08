/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

import { PlanVsActualDrawer, type DailyBreakdownRow } from '../PlanVsActualDrawer';
import {
  PlanVsActualDrawerProvider,
  usePlanVsActualDrawer,
  type DrawerContext,
} from '../usePlanVsActualDrawer';

const ctx: DrawerContext = {
  personId: 'p1',
  projectId: 'pr1',
  monthKey: '2026-04',
  personName: 'Anna',
  projectName: 'Atlas',
  monthLabel: 'April 2026',
  mode: 'daily',
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      <QueryClientProvider client={client}>
        <PlanVsActualDrawerProvider>{children}</PlanVsActualDrawerProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}

function Opener({ context }: { context: DrawerContext }) {
  const { open } = usePlanVsActualDrawer();
  return (
    <button type="button" data-testid="open-btn" onClick={() => open(context)}>
      open
    </button>
  );
}

describe('PlanVsActualDrawer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders 5 daily rows from the fetcher', async () => {
    const rows: DailyBreakdownRow[] = [
      { date: '2026-04-01', planned: 8, actual: 8, delta: 0 },
      { date: '2026-04-02', planned: 8, actual: 7, delta: -1 },
      { date: '2026-04-03', planned: 8, actual: 9, delta: 1 },
      { date: '2026-04-06', planned: 8, actual: 8, delta: 0 },
      { date: '2026-04-07', planned: 8, actual: 6, delta: -2 },
    ];
    const fetcher = vi.fn().mockResolvedValue(rows);

    const user = userEvent.setup();
    render(
      <Wrapper>
        <Opener context={ctx} />
        <PlanVsActualDrawer orgId="org-1" fetcher={fetcher} />
      </Wrapper>,
    );

    await user.click(screen.getByTestId('open-btn'));

    await waitFor(() => expect(screen.getByTestId('drawer-table')).toBeTruthy());
    expect(screen.getAllByTestId('drawer-row')).toHaveLength(5);
    expect(fetcher).toHaveBeenCalledWith('org-1', {
      personId: 'p1',
      projectId: 'pr1',
      monthKey: '2026-04',
    });
  });

  it('shows the empty-state i18n string when fetcher returns []', async () => {
    const fetcher = vi.fn().mockResolvedValue([]);

    const user = userEvent.setup();
    render(
      <Wrapper>
        <Opener context={ctx} />
        <PlanVsActualDrawer orgId="org-1" fetcher={fetcher} />
      </Wrapper>,
    );

    await user.click(screen.getByTestId('open-btn'));

    await waitFor(() => expect(screen.getByTestId('drawer-empty')).toBeTruthy());
    expect(screen.getByTestId('drawer-empty').textContent).toContain(
      'Inga utfallsrader för denna period.',
    );
  });

  it('Close button closes the drawer (isOpen flips to false)', async () => {
    const fetcher = vi.fn().mockResolvedValue([]);

    function Probe() {
      const { isOpen } = usePlanVsActualDrawer();
      return <span data-testid="is-open">{String(isOpen)}</span>;
    }

    const user = userEvent.setup();
    render(
      <Wrapper>
        <Opener context={ctx} />
        <Probe />
        <PlanVsActualDrawer orgId="org-1" fetcher={fetcher} />
      </Wrapper>,
    );

    await user.click(screen.getByTestId('open-btn'));
    expect(screen.getByTestId('is-open').textContent).toBe('true');
    await user.click(screen.getByTestId('drawer-close'));
    expect(screen.getByTestId('is-open').textContent).toBe('false');
  });

  it('renders the title with i18n interpolation (sv)', async () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    const user = userEvent.setup();
    render(
      <Wrapper>
        <Opener context={ctx} />
        <PlanVsActualDrawer orgId="org-1" fetcher={fetcher} />
      </Wrapper>,
    );
    await user.click(screen.getByTestId('open-btn'));
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe(
      'Plan vs utfall — Anna, Atlas, April 2026',
    );
  });

  it('Esc key closes the drawer', async () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    function Probe() {
      const { isOpen } = usePlanVsActualDrawer();
      return <span data-testid="is-open">{String(isOpen)}</span>;
    }
    const user = userEvent.setup();
    render(
      <Wrapper>
        <Opener context={ctx} />
        <Probe />
        <PlanVsActualDrawer orgId="org-1" fetcher={fetcher} />
      </Wrapper>,
    );
    await user.click(screen.getByTestId('open-btn'));
    expect(screen.getByTestId('is-open').textContent).toBe('true');
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.getByTestId('is-open').textContent).toBe('false');
  });
});
