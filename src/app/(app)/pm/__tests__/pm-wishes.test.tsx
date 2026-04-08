/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 40 / Plan 40-05 Wave 4 (B1 gap closure): UX-V5-03 /pm/wishes
 * page mounts MyWishesPanel with proposed/approved/rejected filter tabs and
 * a resubmit affordance on rejected cards.
 *
 * Selector strategy:
 *   - MyWishesPanel mount   → data-testid="my-wishes-panel" (existing)
 *   - Three filter tabs     → role="tab" × 3 with sv labels "Föreslagna"
 *                             (proposed), "Godkända" (approved), "Avvisade"
 *                             (rejected). Matches the i18n keys
 *                             v5.proposals.tabs.proposed|approved|rejected
 *                             resolved at render time by NextIntlClientProvider.
 *   - Resubmit affordance   → after clicking the "Avvisade" tab, the rejected
 *                             wish card exposes a button whose accessible
 *                             name matches /redigera.*skicka igen/i
 *                             (sv) or /edit.*resubmit/i (en). Matches the
 *                             WishCard onResubmit handler wired by
 *                             MyWishesPanel (see ui/wish-card.tsx).
 *
 * Mocks:
 *   - @clerk/nextjs             → useAuth loaded + userId 'clerk-anna'
 *   - @/features/personas/...   → PM persona (kept for symmetry though
 *                                  the wishes page only reads Clerk userId)
 *   - global fetch              → GET /api/v5/proposals?status=... returns
 *                                  per-tab fixtures; POST resubmit is not hit
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';
import type { ProposalDTO, ProposalStatus } from '@/features/proposals/proposal.types';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isLoaded: true, userId: 'clerk-anna' }),
}));

vi.mock('@/features/personas/persona.context', () => ({
  usePersona: () => ({
    persona: {
      kind: 'pm',
      personId: 'p-anna',
      displayName: 'Anna',
      homeDepartmentId: 'dept-A',
    },
    setPersona: vi.fn(),
  }),
}));

const { default: PmWishesPage } = await import('../wishes/page');

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
    id: 'w-default',
    personId: 's1',
    projectId: 'p1',
    month: '2026-06',
    proposedHours: 40,
    note: null,
    status: 'proposed',
    rejectionReason: null,
    requestedBy: 'clerk-anna',
    decidedBy: null,
    decidedAt: null,
    parentProposalId: null,
    targetDepartmentId: 'dept-A',
    liveDepartmentId: 'dept-A',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

const proposedRow = makeProposal({ id: 'w1', status: 'proposed', proposedHours: 40 });
const approvedRow = makeProposal({ id: 'w2', status: 'approved', proposedHours: 50 });
const rejectedRow = makeProposal({
  id: 'w3',
  status: 'rejected',
  proposedHours: 80,
  rejectionReason: 'no',
});

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe('/pm/wishes page (UX-V5-03)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && typeof url === 'string' && url.startsWith('/api/v5/proposals?')) {
        const parsed = new URL(url, 'http://localhost');
        const status = parsed.searchParams.get('status') as ProposalStatus | null;
        // MyWishesPanel queries via useListProposals({ proposerId }) — the
        // proposerId should flow through from PmWishesPage → useAuth().userId.
        expect(parsed.searchParams.get('proposerId')).toBe('clerk-anna');
        if (status === 'proposed') return ok({ proposals: [proposedRow] });
        if (status === 'approved') return ok({ proposals: [approvedRow] });
        if (status === 'rejected') return ok({ proposals: [rejectedRow] });
        return ok({ proposals: [] });
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mounts MyWishesPanel with three filter tabs for proposed / approved / rejected', async () => {
    render(<PmWishesPage />, { wrapper: makeWrapper() });

    // MyWishesPanel root is exposed via data-testid for mount assertion.
    await waitFor(() => {
      expect(screen.getByTestId('my-wishes-panel')).toBeInTheDocument();
    });

    // Three filter tabs, one per status, labelled via
    // v5.proposals.tabs.{proposed,approved,rejected}.
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => t.textContent)).toEqual(['Föreslagna', 'Godkända', 'Avvisade']);

    // Default tab is "proposed" — its wish card renders.
    await waitFor(() => {
      expect(screen.getAllByTestId('wish-card')).toHaveLength(1);
    });
  });

  it('switching to rejected tab exposes a resubmit affordance on the rejected card', async () => {
    const user = userEvent.setup();
    render(<PmWishesPage />, { wrapper: makeWrapper() });

    // Wait for the default proposed tab to load so the panel is ready.
    await waitFor(() => expect(screen.getByTestId('my-wishes-panel')).toBeInTheDocument());

    // Click the "Avvisade" (rejected) tab.
    const rejectedTab = screen.getByRole('tab', { name: /avvisade/i });
    await user.click(rejectedTab);

    // The rejected wish card is present.
    await waitFor(() => {
      const cards = screen.getAllByTestId('wish-card');
      expect(cards).toHaveLength(1);
      expect(cards[0].getAttribute('data-status')).toBe('rejected');
    });

    // Resubmit affordance: WishCard onResubmit button. Accessible name is the
    // sv label "Redigera & skicka igen" (v5.proposals.actions.editResubmit).
    const resubmitBtn = screen.getByRole('button', { name: /redigera.*skicka igen/i });
    expect(resubmitBtn).toBeInTheDocument();
  });
});
