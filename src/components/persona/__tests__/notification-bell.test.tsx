/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 53 / Plan 53-02 (POLISH-01): NotificationBell per-persona
 * rendering + flag-off null + badge rules + rd hook enabled-gate.
 *
 * Tests:
 *   1. uiV6Polish=false                      → null
 *   2. persona=staff, flag=on                → null
 *   3. persona=pm,   rejected=2              → href=/pm/wishes?tab=rejected,
 *                                              badge "2", aria-label from pm key
 *   4. persona=line-manager, pending=3       → href=/line-manager/approval-queue,
 *                                              badge "3"
 *   5. persona=rd,   overcommit=2            → href=/alerts, badge "2"
 *   6. persona=admin, alertCount=5           → href=/alerts, badge "5"
 *   7. count=0                               → no badge; count=120 → "99+"
 *   8. useRdOvercommitCount(false)           → no fetch to /capacity/overcommit/count
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';
import type { Persona } from '@/features/personas/persona.types';

// --------------------------------------------------------------------------
// Mocks — feature flag, persona, auth, and the 4 count hooks
// --------------------------------------------------------------------------

const flagState: { uiV6Polish: boolean } = { uiV6Polish: true };
const personaState: { persona: Persona } = {
  persona: { kind: 'admin', displayName: 'Admin' },
};
const authState: { userId: string | null } = { userId: 'clerk-user' };

const pmData: { rejected: number; pending: number } = { rejected: 0, pending: 0 };
const lmData: { count: number | null } = { count: null };
const rdData: { count: number | null } = { count: null };
const adminAlertData: { count: number | null } = { count: null };

vi.mock('@/features/flags/flag.context', () => ({
  useFlags: () => ({
    dashboards: false,
    pdfExport: false,
    alerts: false,
    onboarding: false,
    scenarios: false,
    uiV6Landing: false,
    uiV6LeanTrim: false,
    uiV6PerJourney: false,
    uiV6Polish: flagState.uiV6Polish,
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

vi.mock('@/features/proposals/use-pm-wish-counts', () => ({
  usePmWishCounts: (_clerkUserId: string, _enabled: boolean) => ({
    data: { pending: pmData.pending, rejected: pmData.rejected },
  }),
}));

vi.mock('@/features/proposals/use-lm-queue-count', () => ({
  useLmQueueCount: (_deptId: string | null, _enabled: boolean) => ({
    data: lmData.count,
  }),
}));

vi.mock('@/features/proposals/use-rd-overcommit-count', () => ({
  useRdOvercommitCount: (_enabled: boolean) => ({
    data: rdData.count,
  }),
}));

vi.mock('@/hooks/use-alerts', () => ({
  useAlertCount: (_from: string, _to: string) => ({ data: adminAlertData.count }),
}));

// --------------------------------------------------------------------------
// Harness
// --------------------------------------------------------------------------

const { NotificationBell } = await import('../notification-bell');

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

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('NotificationBell (POLISH-01)', () => {
  beforeEach(() => {
    flagState.uiV6Polish = true;
    personaState.persona = { kind: 'admin', displayName: 'Admin' };
    authState.userId = 'clerk-user';
    pmData.rejected = 0;
    pmData.pending = 0;
    lmData.count = null;
    rdData.count = null;
    adminAlertData.count = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('Test 1: renders nothing when uiV6Polish=false', () => {
    flagState.uiV6Polish = false;
    const { container } = render(<NotificationBell />, { wrapper: makeWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it('Test 2: renders nothing when persona=staff (bell hidden for Staff)', () => {
    personaState.persona = { kind: 'staff', personId: 'p-1', displayName: 'Staff' };
    const { container } = render(<NotificationBell />, { wrapper: makeWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it('Test 3: persona=pm, rejected=2 → href=/pm/wishes?tab=rejected, badge "2"', () => {
    personaState.persona = {
      kind: 'pm',
      personId: 'p-anna',
      displayName: 'Anna',
      homeDepartmentId: 'dept-A',
    };
    pmData.rejected = 2;
    pmData.pending = 5;
    render(<NotificationBell />, { wrapper: makeWrapper() });
    const bell = screen.getByTestId('notification-bell');
    expect(bell.getAttribute('href')).toBe('/pm/wishes?tab=rejected');
    expect(bell.textContent).toContain('2');
    // aria-label should match the sv v6.polish.bell.pmRejectedLabel key
    // "Avvisade önskemål: {count}"
    expect(bell.getAttribute('aria-label')).toContain('Avvisade');
    expect(bell.getAttribute('aria-label')).toContain('2');
  });

  it('Test 4: persona=line-manager, pending=3 → href=/line-manager/approval-queue, badge "3"', () => {
    personaState.persona = {
      kind: 'line-manager',
      departmentId: 'dept-A',
      displayName: 'Per',
    };
    lmData.count = 3;
    render(<NotificationBell />, { wrapper: makeWrapper() });
    const bell = screen.getByTestId('notification-bell');
    expect(bell.getAttribute('href')).toBe('/line-manager/approval-queue');
    expect(bell.textContent).toContain('3');
    expect(bell.getAttribute('aria-label')).toContain('Väntande');
  });

  it('Test 5: persona=rd, overcommit=2 → href=/alerts, badge "2"', () => {
    personaState.persona = { kind: 'rd', displayName: 'R&D' };
    rdData.count = 2;
    render(<NotificationBell />, { wrapper: makeWrapper() });
    const bell = screen.getByTestId('notification-bell');
    expect(bell.getAttribute('href')).toBe('/alerts');
    expect(bell.textContent).toContain('2');
    expect(bell.getAttribute('aria-label')).toContain('överbokningar');
  });

  it('Test 6: persona=admin, alertCount=5 → href=/alerts, badge "5"', () => {
    personaState.persona = { kind: 'admin', displayName: 'Admin' };
    adminAlertData.count = 5;
    render(<NotificationBell />, { wrapper: makeWrapper() });
    const bell = screen.getByTestId('notification-bell');
    expect(bell.getAttribute('href')).toBe('/alerts');
    expect(bell.textContent).toContain('5');
    expect(bell.getAttribute('aria-label')).toContain('Varningar');
  });

  it('Test 7: count=0 → no badge span; count=120 → "99+"', () => {
    // count = 0: admin, alertCount null → count resolves to 0
    personaState.persona = { kind: 'admin', displayName: 'Admin' };
    adminAlertData.count = 0;
    const { rerender, container } = render(<NotificationBell />, { wrapper: makeWrapper() });
    const bell = screen.getByTestId('notification-bell');
    // No VISIBLE badge span when count === 0. The sr-only live-region span
    // (UI-01) is always present for screen-reader announcements, so filter
    // it out before asserting.
    const visibleSpans = Array.from(bell.querySelectorAll('span')).filter(
      (s) => !s.classList.contains('sr-only'),
    );
    expect(visibleSpans).toHaveLength(0);
    void container;

    // count = 120 → "99+"
    adminAlertData.count = 120;
    rerender(<NotificationBell />);
    const bell2 = screen.getByTestId('notification-bell');
    expect(bell2.textContent).toContain('99+');
  });

  it('Test 9: UI-01 — live region announces label updates politely', () => {
    // Admin persona, count changes from 0 → 5. The visually-hidden
    // aria-live="polite" span must carry the same label so screen readers
    // announce the new count without requiring focus.
    personaState.persona = { kind: 'admin', displayName: 'Admin' };
    adminAlertData.count = 0;
    const { rerender } = render(<NotificationBell />, { wrapper: makeWrapper() });
    const live = screen.getByTestId('notification-bell-live');
    expect(live.getAttribute('role')).toBe('status');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.getAttribute('aria-atomic')).toBe('true');
    expect(live.textContent).toContain('0');

    adminAlertData.count = 5;
    rerender(<NotificationBell />);
    const live2 = screen.getByTestId('notification-bell-live');
    expect(live2.textContent).toContain('5');
    expect(live2.textContent).toContain('Varningar');
  });

  it('Test 8: useRdOvercommitCount(false) → TanStack skips the fetch', async () => {
    // Re-import the REAL hook (not the mock) via vi.importActual so we can
    // observe that `enabled:false` prevents a network call.
    const actual = await vi.importActual<
      typeof import('@/features/proposals/use-rd-overcommit-count')
    >('@/features/proposals/use-rd-overcommit-count');
    const fetchMock = vi.fn(
      () => Promise.resolve({ ok: true, status: 200, json: async () => ({ count: 42 }) }) as never,
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => actual.useRdOvercommitCount(false), { wrapper });
    // Give react-query a tick. Since enabled=false, fetchStatus stays 'idle'.
    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
