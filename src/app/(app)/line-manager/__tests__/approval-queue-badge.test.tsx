/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 52 / Plan 52-04 (LM-01 / D-06):
 * Tests 5-7 for the /line-manager home approval-queue badge.
 *
 * 5. flag=OFF → no badge (Phase 51 parity)
 * 6. flag=ON  + count=0 → no badge (suppressed when zero)
 * 7. flag=ON  + count=3 → badge with /line-manager/approval-queue href and
 *                         `data-clicks="true"`
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

import LineManagerHomePage from '../page';
import { FlagProvider } from '@/features/flags/flag.context';
import { PersonaProvider } from '@/features/personas/persona.context';
import type { FeatureFlags } from '@/features/flags/flag.types';

const defaultFlags: FeatureFlags = {
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

const LM_PERSONA_JSON = JSON.stringify({
  kind: 'line-manager',
  departmentId: 'dept-electronics',
  displayName: 'Line Manager',
});

function renderPage(opts: { flag: boolean; count: number }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/v5/proposals/queue/count')) {
      return new Response(
        JSON.stringify({ count: opts.count, departmentId: 'dept-electronics' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('/api/v5/capacity')) {
      return new Response(JSON.stringify({ cells: [], people: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/api/departments')) {
      return new Response(JSON.stringify({ departments: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 200 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  // Seed LM persona via localStorage so PersonaProvider hydrates to it.
  window.localStorage.setItem('nc:persona', LM_PERSONA_JSON);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
        <QueryClientProvider client={queryClient}>
          <FlagProvider flags={{ ...defaultFlags, uiV6PerJourney: opts.flag }}>
            <PersonaProvider>{children}</PersonaProvider>
          </FlagProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  }

  return {
    ...render(<LineManagerHomePage />, { wrapper: Wrapper }),
    fetchMock,
  };
}

describe('LM-01 /line-manager approval-queue badge', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    vi.restoreAllMocks();
  });

  it('flag OFF → no badge', async () => {
    renderPage({ flag: false, count: 3 });
    // Give persona hydration + query a chance
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId('lm-approval-queue-badge')).toBeNull();
  });

  it('flag ON + count=0 → no badge', async () => {
    renderPage({ flag: true, count: 0 });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId('lm-approval-queue-badge')).toBeNull();
  });

  it('flag ON + count=3 → badge renders with href + data-clicks', async () => {
    renderPage({ flag: true, count: 3 });
    await waitFor(() => {
      const badge = screen.getByTestId('lm-approval-queue-badge');
      expect(badge.getAttribute('href')).toBe('/line-manager/approval-queue');
      expect(badge.getAttribute('data-clicks')).toBe('true');
      expect(badge.textContent ?? '').toContain('3');
    });
  });
});
