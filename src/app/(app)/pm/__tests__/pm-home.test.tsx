/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 40 / Plan 40-05 Wave 4: TC-UI-001 PM Home page render smoke.
 * v6.0 — Phase 49 / Plan 49-02: Guard-reorder tests (UNBREAK-03).
 *
 * Mocks:
 *   - @clerk/nextjs → useAuth returns loaded + userId (controllable)
 *   - @/features/personas/persona.context → usePersona with controllable persona
 *   - global fetch → /api/v5/planning/pm-home JSON
 *
 * Asserts (TC-UI-001):
 *   1. Overview card renders with project name + pending wishes count
 *   2. Link to /pm/projects/[id] and /pm/wishes present
 *   3. Empty-state renders when projects: []
 *
 * Asserts (UNBREAK-03):
 *   4. No PM selected (admin persona) → empty state, NOT perpetual loading
 *   5. PM selected, query loading → loading state (regression)
 *   6. PM selected, query error → error state (regression)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

/* ── controllable mocks ─────────────────────────────────────────── */

const mockUseAuth = vi.fn(() => ({ isLoaded: true, userId: 'clerk-anna' }));
vi.mock('@clerk/nextjs', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

const mockUsePersona = vi.fn(() => ({
  persona: {
    kind: 'pm' as const,
    personId: 'p-anna',
    displayName: 'Anna',
    homeDepartmentId: 'dept-A',
  },
  setPersona: vi.fn(),
}));
vi.mock('@/features/personas/persona.context', () => ({
  usePersona: (...args: unknown[]) => mockUsePersona(...args),
}));

// Import after vi.mock so the page picks them up.
const { default: PmHomePage } = await import('../page');

/* ── helpers ─────────────────────────────────────────────────────── */

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

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

/* ── tests ───────────────────────────────────────────────────────── */

describe('PM Home page (TC-UI-001)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    // Reset to default PM persona
    mockUseAuth.mockReturnValue({ isLoaded: true, userId: 'clerk-anna' });
    mockUsePersona.mockReturnValue({
      persona: {
        kind: 'pm' as const,
        personId: 'p-anna',
        displayName: 'Anna',
        homeDepartmentId: 'dept-A',
      },
      setPersona: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders overview card with project link + pending wishes count + My Wishes link', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.startsWith('/api/v5/planning/pm-home')) {
        return ok({
          projects: [
            {
              project: { id: 'p1', name: 'Alpha', code: null },
              burn: { plannedTotalHours: 100, actualTotalHours: 80, deltaHours: -20 },
              pendingWishes: 2,
            },
          ],
          defaultProjectId: 'p1',
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<PmHomePage />, { wrapper: makeWrapper() });

    // Loads
    await waitFor(() => expect(screen.getByRole('link', { name: 'Alpha' })).toBeInTheDocument());

    // Project link href
    const projectLink = screen.getByRole('link', { name: 'Alpha' });
    expect(projectLink.getAttribute('href')).toBe('/pm/projects/p1');

    // pendingWishes count text: sv "{count} väntande önskemål"
    expect(screen.getByText(/2 väntande önskemål/i)).toBeInTheDocument();

    // My wishes link (sv "Mina önskemål")
    const myWishes = screen.getByRole('link', { name: /mina önskemål/i });
    expect(myWishes.getAttribute('href')).toBe('/pm/wishes');

    // Verify the fetch URL carried the PM personId
    expect(fetchMock).toHaveBeenCalled();
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('personId=p-anna');
  });

  it('renders empty state when projects: []', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.startsWith('/api/v5/planning/pm-home')) {
        return ok({ projects: [], defaultProjectId: null });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<PmHomePage />, { wrapper: makeWrapper() });

    // Wait for load, then verify no project link exists.
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /alpha/i })).not.toBeInTheDocument();
    });
    // The "Mina projekt" heading is now rendered even in the empty state.
    expect(screen.getByRole('heading', { name: /mina projekt/i })).toBeInTheDocument();
  });
});

describe('PM Home guard reorder (UNBREAK-03)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    // Reset to default PM persona
    mockUseAuth.mockReturnValue({ isLoaded: true, userId: 'clerk-anna' });
    mockUsePersona.mockReturnValue({
      persona: {
        kind: 'pm' as const,
        personId: 'p-anna',
        displayName: 'Anna',
        homeDepartmentId: 'dept-A',
      },
      setPersona: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Test 1: no PM selected (admin persona) → renders empty state, NOT loading', async () => {
    mockUsePersona.mockReturnValue({
      persona: {
        kind: 'admin' as const,
        displayName: 'Administratör',
      },
      setPersona: vi.fn(),
    });

    render(<PmHomePage />, { wrapper: makeWrapper() });

    // Should show the empty-state text, NOT the loading text
    await waitFor(() => {
      const emptyText = sv.v5.screens.pmHome.empty;
      expect(screen.getByText(emptyText)).toBeInTheDocument();
    });

    // Must NOT show loading text
    const loadingText = sv.v5.screens.pmHome.loading;
    expect(screen.queryByText(loadingText)).not.toBeInTheDocument();

    // fetch should NOT have been called (query disabled)
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Test 2: PM selected, query loading → renders loading state', async () => {
    // fetch never resolves — simulates loading state
    fetchMock.mockImplementation(() => new Promise(() => {}));

    render(<PmHomePage />, { wrapper: makeWrapper() });

    // Should show loading text
    await waitFor(() => {
      const loadingText = sv.v5.screens.pmHome.loading;
      expect(screen.getByText(loadingText)).toBeInTheDocument();
    });
  });

  it('Test 3: PM selected, query returned empty array → renders empty state', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.startsWith('/api/v5/planning/pm-home')) {
        return ok({ projects: [], defaultProjectId: null });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<PmHomePage />, { wrapper: makeWrapper() });

    await waitFor(() => {
      const emptyText = sv.v5.screens.pmHome.empty;
      expect(screen.getByText(emptyText)).toBeInTheDocument();
    });
  });

  it('Test 4: PM selected, query returned projects → renders project list', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.startsWith('/api/v5/planning/pm-home')) {
        return ok({
          projects: [
            {
              project: { id: 'pr1', name: 'Demo', code: null },
              burn: { plannedTotalHours: 10, actualTotalHours: 5, deltaHours: -5 },
              pendingWishes: 0,
            },
          ],
          defaultProjectId: 'pr1',
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<PmHomePage />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Demo' })).toBeInTheDocument();
    });

    // Verify the project list <ul> is rendered
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });

  it('Test 5: PM selected, query error → renders error state', async () => {
    fetchMock.mockImplementation(async () => {
      return { ok: false, status: 500, json: async () => ({}) };
    });

    render(<PmHomePage />, { wrapper: makeWrapper() });

    await waitFor(() => {
      const errorText = sv.v5.screens.pmHome.error;
      expect(screen.getByText(errorText)).toBeInTheDocument();
    });
  });
});
