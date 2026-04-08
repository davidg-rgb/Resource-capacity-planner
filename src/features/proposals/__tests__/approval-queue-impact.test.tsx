/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 41 / Plan 41-04 (UX-V5-06): Approval queue impact preview
 * wording update. Tests TC-PR-004..009 using the extended ProposalImpactDTO
 * (currentUtilizationPct / projectedUtilizationPct) shipped in Wave 0.
 *
 * The rendered impact phrase follows REQUIREMENTS L45:
 *   "${personName}'s ${monthLabel} utilization ${current}% → ${projected}%"
 *
 * Using the English locale keeps the literal "40% → 90%" assertion simple.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import en from '@/messages/en.json';

import { ApprovalQueue } from '../ui/approval-queue';
import type { ProposalDTO } from '../proposal.types';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="en" messages={en as Record<string, unknown>}>
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

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}
function fail(status: number) {
  return { ok: false, status, json: async () => ({ error: 'boom' }) };
}

describe('ApprovalQueue impact preview (Plan 41-04 / UX-V5-06)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('TC-PR-004: wish card shows "40% → 90%" utilization format', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.startsWith('/api/v5/proposals?')) {
        return ok({ proposals: [proposalA] });
      }
      if (method === 'GET' && url === '/api/v5/proposals/p-a/impact') {
        return ok({
          personMonthPlannedBefore: 40,
          personMonthPlannedAfter: 90,
          currentUtilizationPct: 40,
          projectedUtilizationPct: 90,
          proposedHours: 90,
          personName: 'Sara',
          month: '2026-06',
        });
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(<ApprovalQueue departmentId="dept-1" />, { wrapper: makeWrapper() });

    const impact = await screen.findByTestId('wish-card-impact');
    expect(impact.textContent).toContain('Sara');
    expect(impact.textContent).toContain('June');
    expect(impact.textContent).toContain('utilization');
    // Literal "40% → 90%" per REQUIREMENTS L45.
    expect(impact.textContent).toMatch(/40%\s*→\s*90%/);
  });

  it('TC-PR-005: Approve button calls /approve mutation with proposalId', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.startsWith('/api/v5/proposals?')) {
        return ok({ proposals: [proposalA] });
      }
      if (method === 'GET' && url === '/api/v5/proposals/p-a/impact') {
        return ok({
          personMonthPlannedBefore: 40,
          personMonthPlannedAfter: 90,
          currentUtilizationPct: 40,
          projectedUtilizationPct: 90,
          proposedHours: 90,
          personName: 'Sara',
          month: '2026-06',
        });
      }
      if (method === 'POST' && url === '/api/v5/proposals/p-a/approve') {
        return ok({ ok: true });
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    const user = userEvent.setup();
    render(<ApprovalQueue departmentId="dept-1" />, { wrapper: makeWrapper() });
    const cards = await screen.findAllByTestId('wish-card');
    await user.click(within(cards[0]).getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/v5/proposals/p-a/approve' && init?.method === 'POST',
      );
      expect(call).toBeDefined();
    });
  });

  it('TC-PR-006: Reject button opens the reject modal', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.startsWith('/api/v5/proposals?')) {
        return ok({ proposals: [proposalA] });
      }
      if (method === 'GET' && url === '/api/v5/proposals/p-a/impact') {
        return ok({
          personMonthPlannedBefore: 40,
          personMonthPlannedAfter: 90,
          currentUtilizationPct: 40,
          projectedUtilizationPct: 90,
          proposedHours: 90,
          personName: 'Sara',
          month: '2026-06',
        });
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    const user = userEvent.setup();
    render(<ApprovalQueue departmentId="dept-1" />, { wrapper: makeWrapper() });
    const cards = await screen.findAllByTestId('wish-card');
    await user.click(within(cards[0]).getByRole('button', { name: /^reject$/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('TC-PR-007: Counter-proposal button is absent from the queue', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.startsWith('/api/v5/proposals?')) {
        return ok({ proposals: [proposalA] });
      }
      if (method === 'GET' && url === '/api/v5/proposals/p-a/impact') {
        return ok({
          personMonthPlannedBefore: 40,
          personMonthPlannedAfter: 90,
          currentUtilizationPct: 40,
          projectedUtilizationPct: 90,
          proposedHours: 90,
          personName: 'Sara',
          month: '2026-06',
        });
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(<ApprovalQueue departmentId="dept-1" />, { wrapper: makeWrapper() });
    await screen.findAllByTestId('wish-card');
    // Counter-proposal is explicitly out of scope (UX-V5-06 / REQUIREMENTS L99).
    expect(screen.queryByRole('button', { name: /counter[- ]?proposal/i })).toBeNull();
  });

  it('TC-PR-008: impact loading shows skeleton before data resolves', async () => {
    let resolveImpact: (v: unknown) => void = () => {};
    const impactPromise = new Promise((resolve) => {
      resolveImpact = resolve;
    });
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.startsWith('/api/v5/proposals?')) {
        return ok({ proposals: [proposalA] });
      }
      if (method === 'GET' && url === '/api/v5/proposals/p-a/impact') {
        return impactPromise;
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(<ApprovalQueue departmentId="dept-1" />, { wrapper: makeWrapper() });
    expect(await screen.findByTestId('wish-card-impact-skeleton')).toBeInTheDocument();
    resolveImpact(
      ok({
        personMonthPlannedBefore: 40,
        personMonthPlannedAfter: 90,
        currentUtilizationPct: 40,
        projectedUtilizationPct: 90,
        proposedHours: 90,
        personName: 'Sara',
        month: '2026-06',
      }),
    );
    await waitFor(() => {
      expect(screen.queryByTestId('wish-card-impact-skeleton')).toBeNull();
    });
  });

  it('TC-PR-009: impact error hides impact line but keeps approve/reject', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.startsWith('/api/v5/proposals?')) {
        return ok({ proposals: [proposalA] });
      }
      if (method === 'GET' && url === '/api/v5/proposals/p-a/impact') {
        return fail(500);
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    render(<ApprovalQueue departmentId="dept-1" />, { wrapper: makeWrapper() });
    const card = await screen.findByTestId('wish-card');
    await waitFor(() => {
      expect(within(card).queryByTestId('wish-card-impact')).toBeNull();
      expect(within(card).queryByTestId('wish-card-impact-skeleton')).toBeNull();
    });
    expect(within(card).getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /^reject$/i })).toBeInTheDocument();
  });
});
