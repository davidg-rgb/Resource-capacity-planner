/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 52 / Plan 52-04 (LM-01 / D-06):
 * Test 8 for PersonaSwitcher — LM option label is suffixed with `(N)` when
 * the active persona is line-manager, the flag is ON, and count > 0.
 *
 * Flag OFF or count=0 → no suffix (Phase 51 parity).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush, refresh: vi.fn() }),
}));

import { PersonaSwitcher } from '../persona-switcher';
import { FlagProvider } from '@/features/flags/flag.context';
import { PersonaProvider } from '@/features/personas/persona.context';
import type { FeatureFlags } from '@/features/flags/flag.types';

const flagsAllOff: FeatureFlags = {
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

const LM_PERSONA = JSON.stringify({
  kind: 'line-manager',
  departmentId: 'dept-electronics',
  displayName: 'Linjechef',
});

function setup(opts: { flag: boolean; count: number }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/v5/proposals/queue/count')) {
      return new Response(JSON.stringify({ count: opts.count, departmentId: 'dept-electronics' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/api/people') || url.includes('/api/departments')) {
      return new Response(JSON.stringify({ people: [], departments: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 200 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  window.localStorage.setItem('nc:persona', LM_PERSONA);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
        <QueryClientProvider client={qc}>
          <FlagProvider flags={{ ...flagsAllOff, uiV6PerJourney: opts.flag }}>
            <PersonaProvider>{children}</PersonaProvider>
          </FlagProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  }
  return render(<PersonaSwitcher />, { wrapper: Wrapper });
}

describe('PersonaSwitcher LM-option count suffix (LM-01 / D-06)', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    vi.restoreAllMocks();
  });

  it('flag ON + LM persona + count=3 → LM <option> label contains "(3)"', async () => {
    setup({ flag: true, count: 3 });
    await waitFor(() => {
      const opts = screen.getAllByRole('option');
      const lm = opts.find((o) => (o as HTMLOptionElement).value === 'line-manager')!;
      expect(lm).toBeTruthy();
      expect(lm.textContent ?? '').toContain('(3)');
    });
  });

  it('flag OFF → no suffix', async () => {
    setup({ flag: false, count: 3 });
    // Let hydration settle; no fetch should fire
    await new Promise((r) => setTimeout(r, 30));
    const opts = screen.getAllByRole('option');
    const lm = opts.find((o) => (o as HTMLOptionElement).value === 'line-manager')!;
    expect(lm.textContent ?? '').not.toContain('(');
  });

  it('flag ON + count=0 → no suffix', async () => {
    setup({ flag: true, count: 0 });
    await new Promise((r) => setTimeout(r, 30));
    const opts = screen.getAllByRole('option');
    const lm = opts.find((o) => (o as HTMLOptionElement).value === 'line-manager')!;
    expect(lm.textContent ?? '').not.toContain('(');
  });
});
