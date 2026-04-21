/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 52 Plan 03 (PM-02 Q4 + PM-04 Q2 split):
 *  1. MyWishesPanel honors `?tab=` query param (tests 7-8).
 *  2. Rejected-wish-card snapshot lives here (cell test file covers draft/
 *     proposed/approved; rejected has no cell visual per Q2 split).
 *
 * Note: the panel itself already has PROP-06 tests colocated at
 * src/features/proposals/__tests__/my-wishes-panel.test.tsx — those cover
 * tabs, resubmit modal, etc. This file is additive for Phase 52 Plan 03.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';
import type { ProposalDTO } from '@/features/proposals/proposal.types';

// --------------------------------------------------------------------------
// Mocks — useSearchParams is stubbed so individual tests control the query.
// --------------------------------------------------------------------------

const searchParamsState: { tab: string | null } = { tab: null };

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'tab' ? searchParamsState.tab : null),
  }),
}));

const { MyWishesPanel } = await import('@/features/proposals/ui/my-wishes-panel');

function makeProposal(overrides: Partial<ProposalDTO> = {}): ProposalDTO {
  return {
    id: 'p-1',
    personId: 'person-1',
    projectId: 'project-1',
    month: '2026-06',
    proposedHours: 40,
    note: null,
    status: 'proposed',
    rejectionReason: null,
    requestedBy: 'u1',
    decidedBy: null,
    decidedAt: null,
    parentProposalId: null,
    targetDepartmentId: 'dept-1',
    liveDepartmentId: 'dept-1',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

const proposedRow = makeProposal({ id: 'p-prop', status: 'proposed', proposedHours: 40 });
const approvedRow = makeProposal({ id: 'p-appr', status: 'approved', proposedHours: 50 });
const rejectedRow = makeProposal({
  id: 'p-rej',
  status: 'rejected',
  proposedHours: 80,
  note: 'Need Sara for Alpha',
  rejectionReason: 'Not enough evidence',
});

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

const fetchMock = vi.fn();
function installFetch() {
  fetchMock.mockImplementation(async (url: string) => {
    if (typeof url === 'string' && url.startsWith('/api/v5/proposals?')) {
      const parsed = new URL(url, 'http://localhost');
      const status = parsed.searchParams.get('status');
      if (status === 'proposed') return ok({ proposals: [proposedRow] });
      if (status === 'approved') return ok({ proposals: [approvedRow] });
      if (status === 'rejected') return ok({ proposals: [rejectedRow] });
      return ok({ proposals: [] });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

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

describe('MyWishesPanel — ?tab= plumbing (PM-02 Q4)', () => {
  beforeEach(() => {
    searchParamsState.tab = null;
    fetchMock.mockReset();
    installFetch();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('Test 7: ?tab=rejected activates the rejected tab', async () => {
    searchParamsState.tab = 'rejected';
    render(<MyWishesPanel proposerId="u1" />, { wrapper: makeWrapper() });

    const tabs = await screen.findAllByRole('tab');
    const rejectedTab = tabs.find((t) => /avvisade/i.test(t.textContent ?? ''));
    expect(rejectedTab).toBeDefined();
    expect(rejectedTab!.getAttribute('aria-selected')).toBe('true');
  });

  it('Test 8: no ?tab= param defaults to proposed', async () => {
    searchParamsState.tab = null;
    render(<MyWishesPanel proposerId="u1" />, { wrapper: makeWrapper() });

    const tabs = await screen.findAllByRole('tab');
    const proposedTab = tabs.find((t) => /föreslagna/i.test(t.textContent ?? ''));
    expect(proposedTab).toBeDefined();
    expect(proposedTab!.getAttribute('aria-selected')).toBe('true');
  });
});

// --------------------------------------------------------------------------
// PM-04 Q2 split — rejected wish card snapshot lives in the panel.
// (draft / proposed / approved snapshots live in pm-timeline-cell.test.tsx)
// --------------------------------------------------------------------------

describe('MyWishesPanel — rejected wish-card snapshot (PM-04 Q2 split)', () => {
  beforeEach(() => {
    searchParamsState.tab = 'rejected';
    fetchMock.mockReset();
    installFetch();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('renders a single rejected wish card that matches snapshot', async () => {
    const { container } = render(<MyWishesPanel proposerId="u1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTestId('wish-card')).toHaveLength(1);
    });

    const card = container.querySelector('[data-testid="wish-card"][data-status="rejected"]');
    expect(card).not.toBeNull();
    expect(card).toMatchSnapshot();
  });
});
