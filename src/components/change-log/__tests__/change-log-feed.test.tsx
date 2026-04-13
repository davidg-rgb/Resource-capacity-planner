/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 41 / Plan 41-04 (UX-V5-10): ChangeLogFeed RTL tests.
 * Covers render, expand-row diff, filter change (refetch + URL update),
 * "Load more" pagination, and initialFilter application on first render.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import { ChangeLogFeed } from '../change-log-feed';
import type { FeedFilter } from '@/features/change-log/change-log.types';
import sv from '@/messages/sv.json';

// Mock next/navigation — jsdom has no Next router.
const routerReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  };
}

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

const entry1 = {
  id: '11111111-1111-1111-1111-111111111111',
  organizationId: 'org-1',
  actorPersonaId: 'pm:abc',
  entity: 'allocation',
  entityId: '22222222-2222-2222-2222-222222222222',
  action: 'update',
  previousValue: { hours: 20 },
  newValue: { hours: 40 },
  context: null,
  createdAt: '2026-04-01T10:00:00.000Z',
};

const entry2 = {
  id: '33333333-3333-3333-3333-333333333333',
  organizationId: 'org-1',
  actorPersonaId: 'line-manager:dept-a',
  entity: 'allocation_proposal',
  entityId: '44444444-4444-4444-4444-444444444444',
  action: 'approve',
  previousValue: { status: 'proposed' },
  newValue: { status: 'approved' },
  context: null,
  createdAt: '2026-04-01T11:00:00.000Z',
};

describe('ChangeLogFeed (Plan 41-04 / UX-V5-10)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    routerReplace.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders fetched rows and applies initialFilter on first fetch', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      // initialFilter pre-selects personIds — assert it reaches the URL.
      expect(url).toContain('/api/v5/change-log');
      expect(url).toContain('personIds=person-1');
      return ok({ entries: [entry1, entry2], nextCursor: null });
    });

    const initialFilter: FeedFilter = { personIds: ['person-1'] };
    render(<ChangeLogFeed initialFilter={initialFilter} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTestId('change-log-row')).toHaveLength(2);
    });
  });

  it('expanding a row shows previousValue and newValue JSON diff', async () => {
    fetchMock.mockImplementation(async () => ok({ entries: [entry1], nextCursor: null }));
    const user = userEvent.setup();
    render(<ChangeLogFeed initialFilter={{}} />, { wrapper: makeWrapper() });

    const row = await screen.findByTestId('change-log-row');
    await user.click(row);

    const diff = await screen.findByTestId('change-log-row-diff');
    expect(diff.textContent).toContain('previousValue');
    expect(diff.textContent).toContain('newValue');
    expect(diff.textContent).toContain('"hours": 20');
    expect(diff.textContent).toContain('"hours": 40');
  });

  it('changing the entity filter triggers refetch and URL update via router.replace', async () => {
    const calls: string[] = [];
    fetchMock.mockImplementation(async (url: string) => {
      calls.push(url);
      return ok({ entries: [entry1], nextCursor: null });
    });

    const user = userEvent.setup();
    render(<ChangeLogFeed initialFilter={{}} />, { wrapper: makeWrapper() });
    await screen.findByTestId('change-log-row');

    const select = screen.getByTestId('change-log-filter-entity') as HTMLSelectElement;
    await user.selectOptions(select, 'allocation');

    await waitFor(() => {
      expect(calls.some((u) => u.includes('entity=allocation'))).toBe(true);
    });
    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalled();
      const lastCall = routerReplace.mock.calls.at(-1)?.[0] as string;
      expect(lastCall).toContain('entity=allocation');
    });
  });

  it('"Load more" fetches the next page using nextCursor', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('cursor=')) {
        return ok({ entries: [entry2], nextCursor: null });
      }
      return ok({ entries: [entry1], nextCursor: 'CURSOR_ABC' });
    });

    const user = userEvent.setup();
    render(<ChangeLogFeed initialFilter={{}} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTestId('change-log-row')).toHaveLength(1);
    });

    await user.click(screen.getByTestId('change-log-load-more'));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([u]) => String(u).includes('cursor=CURSOR_ABC'))).toBe(
        true,
      );
    });
    await waitFor(() => {
      expect(screen.getAllByTestId('change-log-row')).toHaveLength(2);
    });
  });
});
