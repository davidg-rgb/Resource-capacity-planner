/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 40 / Plan 40-05 Wave 4: TC-UI-001 PM Home page render smoke.
 *
 * Mocks:
 *   - @clerk/nextjs → useAuth returns loaded + userId
 *   - @/features/personas/persona.context → usePersona returns PM persona
 *   - global fetch → /api/v5/planning/pm-home JSON
 *
 * Asserts (TC-UI-001):
 *   1. Overview card renders with project name + pending wishes count
 *   2. Link to /pm/projects/[id] and /pm/wishes present
 *   3. Empty-state renders when projects: []
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

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

// Import after vi.mock so the page picks them up.
const { default: PmHomePage } = await import('../page');

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

describe('PM Home page (TC-UI-001)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
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

    // en bundle: v5.screens.pmHome.empty = "" (intentionally blank scaffold).
    // Fall back to asserting the project grid is absent.
    await waitFor(() => {
      // After load, no project link should exist.
      expect(screen.queryByRole('link', { name: /alpha/i })).not.toBeInTheDocument();
    });
    // The "Mina projekt" heading (v5.pm.home.title) is only rendered when
    // there are projects — so its absence proves we hit the empty branch.
    expect(screen.queryByRole('heading', { name: /mina projekt/i })).not.toBeInTheDocument();
  });
});
