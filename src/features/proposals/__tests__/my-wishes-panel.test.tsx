/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 39 / Plan 39-08 (PROP-06): MyWishesPanel RTL test.
 * Mocks the fetch layer and exercises tabs, resubmit modal prefill, and
 * the POST to /api/v5/proposals/[id]/resubmit with edited hours.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { MyWishesPanel } from '../ui/my-wishes-panel';
import type { ProposalDTO, ProposalStatus } from '../proposal.types';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

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

const proposedRow = makeProposal({ id: 'p-prop', proposedHours: 40, note: 'draft plan' });
const approvedRow = makeProposal({
  id: 'p-appr',
  status: 'approved',
  proposedHours: 50,
});
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

function installFetchMock(fetchMock: ReturnType<typeof vi.fn>) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET' && url.startsWith('/api/v5/proposals?')) {
      const parsed = new URL(url, 'http://localhost');
      const status = parsed.searchParams.get('status') as ProposalStatus | null;
      const proposerId = parsed.searchParams.get('proposerId');
      expect(proposerId).toBe('u1');
      if (status === 'proposed') return ok({ proposals: [proposedRow] });
      if (status === 'approved') return ok({ proposals: [approvedRow] });
      if (status === 'rejected') return ok({ proposals: [rejectedRow] });
      return ok({ proposals: [] });
    }
    if (method === 'POST' && url === '/api/v5/proposals/p-rej/resubmit') {
      return ok({ ...rejectedRow, id: 'p-new', status: 'proposed' });
    }
    throw new Error(`Unexpected fetch: ${method} ${url}`);
  });
}

describe('MyWishesPanel (PROP-06)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    installFetchMock(fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders three tabs and the proposed tab by default', async () => {
    render(<MyWishesPanel proposerId="u1" />, { wrapper: makeWrapper() });

    const tabs = await screen.findAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => t.textContent)).toEqual(['Proposed', 'Approved', 'Rejected']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    await waitFor(() => {
      const cards = screen.getAllByTestId('wish-card');
      expect(cards).toHaveLength(1);
      expect(cards[0].getAttribute('data-status')).toBe('proposed');
    });
  });

  it('switching to Rejected tab shows rejected cards with Edit & resubmit button', async () => {
    const user = userEvent.setup();
    render(<MyWishesPanel proposerId="u1" />, { wrapper: makeWrapper() });

    await user.click(screen.getByRole('tab', { name: 'Rejected' }));

    await waitFor(() => {
      const cards = screen.getAllByTestId('wish-card');
      expect(cards).toHaveLength(1);
      expect(cards[0].getAttribute('data-status')).toBe('rejected');
    });
    expect(screen.getByRole('button', { name: /edit.*resubmit/i })).toBeInTheDocument();
  });

  it('Edit & resubmit opens modal prefilled with hours and note', async () => {
    const user = userEvent.setup();
    render(<MyWishesPanel proposerId="u1" />, { wrapper: makeWrapper() });

    await user.click(screen.getByRole('tab', { name: 'Rejected' }));
    await screen.findAllByTestId('wish-card');
    await user.click(screen.getByRole('button', { name: /edit.*resubmit/i }));

    const dialog = await screen.findByRole('dialog');
    const hours = within(dialog).getByLabelText('Proposed hours') as HTMLInputElement;
    const note = within(dialog).getByLabelText('Note') as HTMLTextAreaElement;
    expect(hours.value).toBe('80');
    expect(note.value).toBe('Need Sara for Alpha');
  });

  it('editing hours and clicking Resubmit POSTs to /resubmit with new hours', async () => {
    const user = userEvent.setup();
    render(<MyWishesPanel proposerId="u1" />, { wrapper: makeWrapper() });

    await user.click(screen.getByRole('tab', { name: 'Rejected' }));
    await screen.findAllByTestId('wish-card');
    await user.click(screen.getByRole('button', { name: /edit.*resubmit/i }));

    const dialog = await screen.findByRole('dialog');
    const hours = within(dialog).getByLabelText('Proposed hours') as HTMLInputElement;
    await user.clear(hours);
    await user.type(hours, '60');

    await user.click(within(dialog).getByRole('button', { name: /^resubmit$/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/v5/proposals/p-rej/resubmit' && init?.method === 'POST',
      );
      expect(call).toBeDefined();
      const body = JSON.parse(call![1].body);
      expect(body.proposedHours).toBe(60);
      expect(body.note).toBe('Need Sara for Alpha');
    });
  });

  it('empty proposed list shows an empty-state message', async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/api/v5/proposals?')) return ok({ proposals: [] });
      throw new Error(`Unexpected ${url}`);
    });

    render(<MyWishesPanel proposerId="u1" />, { wrapper: makeWrapper() });

    expect(await screen.findByText(/no proposed wishes/i)).toBeInTheDocument();
  });
});
