/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 39 / Plan 39-07 (PROP-04): Approval queue RTL test.
 * Mocks the fetch layer (list + impact + approve + reject) and exercises the
 * full operator flow — render, approve, and reject-with-reason.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

import { ApprovalQueue } from '../ui/approval-queue';
import type { ProposalDTO } from '../proposal.types';

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

function makeProposal(overrides: Partial<ProposalDTO> = {}): ProposalDTO {
  return {
    id: 'p-1',
    personId: 'person-1',
    projectId: 'project-1',
    month: '2026-06',
    proposedHours: 90,
    note: null,
    status: 'proposed',
    rejectionReason: null,
    requestedBy: 'user-pm-1',
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

const proposalA = makeProposal({ id: 'p-a', personId: 'person-a', proposedHours: 90 });
const proposalB = makeProposal({ id: 'p-b', personId: 'person-b', proposedHours: 60 });

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function installFetchMock(fetchMock: ReturnType<typeof vi.fn>) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET' && url.startsWith('/api/v5/proposals?')) {
      return ok({ proposals: [proposalA, proposalB] });
    }
    if (method === 'GET' && url === '/api/v5/proposals/p-a/impact') {
      return ok({
        personMonthPlannedBefore: 40,
        personMonthPlannedAfter: 90,
        proposedHours: 90,
        personName: 'Sara',
        month: '2026-06',
      });
    }
    if (method === 'GET' && url === '/api/v5/proposals/p-b/impact') {
      return ok({
        personMonthPlannedBefore: 20,
        personMonthPlannedAfter: 60,
        proposedHours: 60,
        personName: 'Lars',
        month: '2026-06',
      });
    }
    if (method === 'POST' && url === '/api/v5/proposals/p-a/approve') {
      return ok({ ok: true });
    }
    if (method === 'POST' && url === '/api/v5/proposals/p-b/reject') {
      return ok({ ok: true });
    }
    throw new Error(`Unexpected fetch: ${method} ${url}`);
  });
}

describe('ApprovalQueue (PROP-04)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    installFetchMock(fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders pending wishes with impact preview phrase', async () => {
    render(<ApprovalQueue departmentId="dept-1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTestId('wish-card')).toHaveLength(2);
    });

    // Impact phrase mirrors REQUIREMENTS PROP-04 — Swedish locale rendering:
    // "Saras juni-beläggning 40h → 90h".
    const impacts = await screen.findAllByTestId('wish-card-impact');
    expect(impacts[0].textContent).toContain('beläggning');
    expect(impacts[0].textContent).toContain('Sara');
    expect(impacts[0].textContent).toContain('juni');
  });

  it('Approve posts to /approve with departmentId in body', async () => {
    const user = userEvent.setup();
    render(<ApprovalQueue departmentId="dept-1" />, { wrapper: makeWrapper() });

    const cards = await screen.findAllByTestId('wish-card');
    await user.click(within(cards[0]).getByRole('button', { name: /godkänn/i }));

    await waitFor(() => {
      const approveCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/v5/proposals/p-a/approve' && init?.method === 'POST',
      );
      expect(approveCall).toBeDefined();
      expect(JSON.parse(approveCall![1].body)).toEqual({ departmentId: 'dept-1' });
    });
  });

  it('Reject opens a modal with required reason; empty reason disables Confirm', async () => {
    const user = userEvent.setup();
    render(<ApprovalQueue departmentId="dept-1" />, { wrapper: makeWrapper() });

    const cards = await screen.findAllByTestId('wish-card');
    await user.click(within(cards[1]).getByRole('button', { name: /^avvisa$/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const confirm = within(dialog).getByRole('button', { name: /bekräfta avvisning/i });
    expect(confirm).toBeDisabled();

    const textarea = within(dialog).getByLabelText('Avvisningsanledning');
    await user.type(textarea, 'Not enough evidence for 60h this month');
    expect(confirm).not.toBeDisabled();

    await user.click(confirm);

    await waitFor(() => {
      const rejectCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/v5/proposals/p-b/reject' && init?.method === 'POST',
      );
      expect(rejectCall).toBeDefined();
      const body = JSON.parse(rejectCall![1].body);
      expect(body).toEqual({
        departmentId: 'dept-1',
        reason: 'Not enough evidence for 60h this month',
      });
    });
  });
});
