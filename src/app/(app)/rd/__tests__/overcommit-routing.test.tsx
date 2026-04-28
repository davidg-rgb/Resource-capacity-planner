/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 52 / Plan 52-04 (RD-02 / D-09):
 * /rd page integration — red-cell routing to OvercommitDialog.
 *
 * Tests 5-7 from 52-04-PLAN.md Task 4 <behavior>:
 *   T5 flag ON  + red cell click + groupBy='department' → OvercommitDialog opens
 *   T6 flag ON  + non-red cell click                    → drawer (no dialog)
 *   T7 flag OFF + red cell click                        → drawer (Phase 51 parity)
 *
 * Test is scoped to the RdPortfolioGrid behavior via the /rd page tree.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

// Clerk org context — returned from useAuth — is irrelevant for routing tests;
// stub it so the /rd imports don't fail.
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ orgId: 'org_test' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/rd',
  useSearchParams: () => new URLSearchParams(),
}));

import RdPage from '../page';
import { FlagProvider } from '@/features/flags/flag.context';
import { PersonaProvider } from '@/features/personas/persona.context';
import type { FeatureFlags } from '@/features/flags/flag.types';
import type { PortfolioGridResult } from '@/features/planning/planning.read';

const flagsAllOff: FeatureFlags = {
  dashboards: false,
  pdfExport: false,
  alerts: false,
  onboarding: false,
  scenarios: false,
  uiV6Landing: false,
  uiV6LeanTrim: false,
  uiV6PerJourney: false,
  uiV6Polish: false,
};

const RD_PERSONA = JSON.stringify({ kind: 'rd', displayName: 'FoU-chef' });

function makePortfolio(
  groupBy: 'project' | 'department',
  planned: number,
  actual: number,
): PortfolioGridResult {
  const monthRange = ['2026-06', '2026-07', '2026-08'];
  const months: Record<string, { plannedHours: number; actualHours: number }> = {};
  for (const m of monthRange) months[m] = { plannedHours: planned, actualHours: actual };
  return {
    groupBy,
    monthRange,
    rows: [
      {
        id: 'dept-electronics',
        label: 'Electronics',
        meta: { kind: groupBy === 'department' ? 'department' : 'project' },
        months,
      },
    ],
  };
}

function setup(opts: {
  flag: boolean;
  groupBy: 'project' | 'department';
  planned: number;
  actual: number;
}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const payload = makePortfolio(opts.groupBy, opts.planned, opts.actual);
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/v5/planning/allocations')) {
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/api/v5/capacity/breakdown')) {
      return new Response(JSON.stringify({ rows: [], projects: [], people: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/api/departments') || url.includes('/api/people')) {
      return new Response(JSON.stringify({ departments: [], people: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 200 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  window.localStorage.setItem('nc:persona', RD_PERSONA);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
        <QueryClientProvider client={qc}>
          <FlagProvider flags={{ ...flagsAllOff, uiV6PerJourney: opts.flag }}>
            <PersonaProvider>{children}</PersonaProvider>
          </FlagProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  }

  // /rd wraps itself in DesktopOnlyScreen which requires matchMedia. Provide a stub.
  if (!window.matchMedia) {
    // @ts-expect-error jsdom polyfill
    window.matchMedia = () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
  }

  return render(<RdPage />, { wrapper: Wrapper });
}

describe('/rd page — red-cell routing to OvercommitDialog (RD-02 / D-09)', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    vi.restoreAllMocks();
  });

  it('T5: flag ON + red cell (actual>planned) + groupBy=department → OvercommitDialog opens', async () => {
    // Set groupBy=department via the tab — the default /rd groupBy is 'project'.
    const { findByTestId } = setup({
      flag: true,
      groupBy: 'department',
      planned: 10,
      actual: 30, // actual >> planned → state='over' (ratio=2, > 0.1)
    });

    // Wait for grid render
    await findByTestId('rd-grid');
    // Switch groupBy to department
    const deptTab = await findByTestId('rd-groupby-department');
    await userEvent.click(deptTab);
    // Wait for re-fetch + re-render with department data + groupBy state committed
    await waitFor(() =>
      expect(screen.getByTestId('rd-groupby-department').getAttribute('aria-pressed')).toBe('true'),
    );
    // After userEvent switches groupBy, React commits the state; give the
    // subsequent TanStack refetch + grid re-render a microtask window before
    // clicking so the cell's onClick callback closes over the current groupBy.
    await new Promise((r) => setTimeout(r, 100));
    // Click the inner PlanVsActualCell <button> directly (it's the native
    // click target; our span wrapper is just for data-clicks annotation).
    const cell = await findByTestId('rd-cell-dept-electronics-2026-06');
    const innerButton = cell.querySelector('button');
    if (!innerButton) throw new Error('cell has no inner <button>');
    await userEvent.click(innerButton);
    // OvercommitDialog opens
    await waitFor(() => expect(screen.queryByTestId('overcommit-dialog')).not.toBeNull(), {
      timeout: 2000,
    });
  });

  it('T6: flag ON + non-red cell → drawer (no dialog)', async () => {
    const { findByTestId, queryByTestId } = setup({
      flag: true,
      groupBy: 'project',
      planned: 40,
      actual: 40, // on-plan, not over
    });

    await findByTestId('rd-grid');
    const cell = await findByTestId('rd-cell-dept-electronics-2026-06');
    await userEvent.click(cell);
    // Dialog NOT open
    await new Promise((r) => setTimeout(r, 50));
    expect(queryByTestId('overcommit-dialog')).toBeNull();
  });

  it('T7: flag OFF + red cell → drawer (no dialog) — Phase 51 parity', async () => {
    const { findByTestId, queryByTestId } = setup({
      flag: false,
      groupBy: 'department',
      planned: 10,
      actual: 30,
    });

    await findByTestId('rd-grid');
    const deptTab = await findByTestId('rd-groupby-department');
    await userEvent.click(deptTab);
    await waitFor(() =>
      expect(screen.getByTestId('rd-groupby-department').getAttribute('aria-pressed')).toBe('true'),
    );
    const cell = await findByTestId('rd-cell-dept-electronics-2026-06');
    await userEvent.click(cell);
    // Dialog does NOT open — flag off path stays on drawer
    await new Promise((r) => setTimeout(r, 50));
    expect(queryByTestId('overcommit-dialog')).toBeNull();
  });
});
