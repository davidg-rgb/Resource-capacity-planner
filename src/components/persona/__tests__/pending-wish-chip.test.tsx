/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 52 Plan 03 (PM-02): PendingWishChip visibility + deep-link behaviour.
 *
 * Visibility rule:
 *   uiV6PerJourney ON + persona.kind === 'pm' + (pending + rejected > 0)
 *
 * Deep-link priority:
 *   rejected > 0 → /pm/wishes?tab=rejected
 *   else         → /pm/wishes?tab=proposed
 *
 * Tests:
 *   1. flag off                → null
 *   2. non-PM persona          → null
 *   3. pending=0, rejected=0   → null
 *   4. rejected > 0, pending>0 → href=/pm/wishes?tab=rejected, renders count
 *   5. rejected=0, pending>0   → href=/pm/wishes?tab=proposed
 *   6. data-clicks="true" attribute present (journey 1C click-counter wiring)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';
import type { Persona } from '@/features/personas/persona.types';

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------

const flagState: { uiV6PerJourney: boolean } = { uiV6PerJourney: false };
const personaState: { persona: Persona } = {
  persona: { kind: 'pm', personId: 'p-anna', displayName: 'Anna', homeDepartmentId: 'dept-A' },
};
const authState: { userId: string | null } = { userId: 'clerk-anna' };

vi.mock('@/features/flags/flag.context', () => ({
  useFlags: () => ({
    dashboards: false,
    pdfExport: false,
    alerts: false,
    onboarding: false,
    scenarios: false,
    uiV6Landing: false,
    uiV6LeanTrim: false,
    uiV6PerJourney: flagState.uiV6PerJourney,
  }),
  FlagProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/personas/persona.context', () => ({
  usePersona: () => ({
    persona: personaState.persona,
    setPersona: vi.fn(),
    departments: [],
  }),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isLoaded: true, userId: authState.userId }),
}));

const fetchMock = vi.fn();

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

// --------------------------------------------------------------------------
// Harness
// --------------------------------------------------------------------------

const { PendingWishChip } = await import('../pending-wish-chip');

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  };
}

// Queue response for /api/v5/proposals?...
function installProposalsFetch(rows: Array<{ status: string }>) {
  fetchMock.mockImplementation(async (url: string) => {
    if (typeof url === 'string' && url.startsWith('/api/v5/proposals')) {
      return ok({ proposals: rows });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('PendingWishChip (PM-02)', () => {
  beforeEach(() => {
    flagState.uiV6PerJourney = true;
    personaState.persona = {
      kind: 'pm',
      personId: 'p-anna',
      displayName: 'Anna',
      homeDepartmentId: 'dept-A',
    };
    authState.userId = 'clerk-anna';
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('Test 1: renders nothing when uiV6PerJourney flag is OFF', async () => {
    flagState.uiV6PerJourney = false;
    installProposalsFetch([{ status: 'proposed' }]);
    const { container } = render(<PendingWishChip />, { wrapper: makeWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it('Test 2: renders nothing for non-PM persona (line-manager)', async () => {
    personaState.persona = {
      kind: 'line-manager',
      departmentId: 'dept-A',
      displayName: 'Per',
    };
    installProposalsFetch([{ status: 'proposed' }, { status: 'rejected' }]);
    const { container } = render(<PendingWishChip />, { wrapper: makeWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it('Test 3: renders nothing when pending + rejected === 0', async () => {
    installProposalsFetch([]);
    const { container } = render(<PendingWishChip />, { wrapper: makeWrapper() });
    // Wait a tick for react-query resolution; the component early-returns null
    // so the container stays empty.
    await new Promise((r) => setTimeout(r, 0));
    expect(container.firstChild).toBeNull();
  });

  it('Test 4: rejected > 0 deep-links to /pm/wishes?tab=rejected', async () => {
    installProposalsFetch([
      { status: 'rejected' },
      { status: 'proposed' },
      { status: 'proposed' },
    ]);
    render(<PendingWishChip />, { wrapper: makeWrapper() });
    const chip = await screen.findByTestId('pending-wish-chip');
    expect(chip.getAttribute('href')).toBe('/pm/wishes?tab=rejected');
    // sv key: "{count, plural, one {1 avvisat} other {# avvisade}}"
    expect(chip.textContent).toMatch(/avvisat/i);
  });

  it('Test 5: rejected === 0 and pending > 0 deep-links to /pm/wishes?tab=proposed', async () => {
    installProposalsFetch([
      { status: 'proposed' },
      { status: 'proposed' },
      { status: 'proposed' },
    ]);
    render(<PendingWishChip />, { wrapper: makeWrapper() });
    const chip = await screen.findByTestId('pending-wish-chip');
    expect(chip.getAttribute('href')).toBe('/pm/wishes?tab=proposed');
    expect(chip.textContent).toMatch(/väntande/i);
  });

  it('Test 6: renders with data-clicks="true" attribute (journey 1C wiring)', async () => {
    installProposalsFetch([{ status: 'rejected' }]);
    render(<PendingWishChip />, { wrapper: makeWrapper() });
    const chip = await screen.findByTestId('pending-wish-chip');
    expect(chip.getAttribute('data-clicks')).toBe('true');
  });
});
