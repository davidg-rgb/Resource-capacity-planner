/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 53 / Plan 53-05 (POLISH-05): /alerts tabbed surface tests.
 *
 * Covers:
 *   3. /alerts (no query) → tab === 'warnings'; AlertList rendered;
 *      ResourceConflictsPanel NOT rendered.
 *   4. /alerts?tab=conflicts → tab === 'conflicts'; panel rendered;
 *      AlertList NOT rendered.
 *   5. Clicking the "Conflicts" tab calls
 *      router.replace('/alerts?tab=conflicts').
 *   6. Flag-off renders warnings-only (no tablist at all).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------

const flagState: { uiV6Polish: boolean } = { uiV6Polish: true };
const tabState: { current: string | null } = { current: null };

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(tabState.current ? `tab=${tabState.current}` : ''),
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/alerts',
}));

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

vi.mock('@/hooks/use-alerts', () => ({
  useAlerts: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/components/layout/breadcrumbs', () => ({
  Breadcrumbs: () => <nav data-testid="breadcrumbs-stub" />,
}));

vi.mock('@/components/alerts/alert-list', () => ({
  AlertList: ({ alerts }: { alerts: unknown[] }) => (
    <div data-testid="alert-list-stub">{alerts.length} alerts</div>
  ),
}));

vi.mock('@/components/alerts/resource-conflicts-panel', () => ({
  ResourceConflictsPanel: () => <div data-testid="resource-conflicts-panel-stub" />,
  defaultConflictsTimeRange: () => ({ from: '2026-04', to: '2026-07' }),
}));

// --------------------------------------------------------------------------
// Harness
// --------------------------------------------------------------------------

// Use the @/ alias since the route group (app) parentheses can trip vite's
// relative-path resolver.
const { default: AlertsPage } = await import('@/app/(app)/alerts/page');

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={sv}>
      {children}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  flagState.uiV6Polish = true;
  tabState.current = null;
  replaceMock.mockClear();
});

afterEach(() => {
  cleanup();
});

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('AlertsPage tabs (Plan 53-05 POLISH-05)', () => {
  it('defaults to tab=warnings when no query param present; renders AlertList', () => {
    tabState.current = null;

    render(
      <Wrapper>
        <AlertsPage />
      </Wrapper>,
    );

    expect(screen.getByTestId('alerts-tab-warnings').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('alert-list-stub')).toBeTruthy();
    expect(screen.queryByTestId('resource-conflicts-panel-stub')).toBeNull();
  });

  it('tab=conflicts renders ResourceConflictsPanel and suppresses AlertList', () => {
    tabState.current = 'conflicts';

    render(
      <Wrapper>
        <AlertsPage />
      </Wrapper>,
    );

    expect(screen.getByTestId('alerts-tab-conflicts').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('resource-conflicts-panel-stub')).toBeTruthy();
    expect(screen.queryByTestId('alert-list-stub')).toBeNull();
  });

  it('clicking the conflicts tab calls router.replace with ?tab=conflicts', () => {
    tabState.current = null;

    render(
      <Wrapper>
        <AlertsPage />
      </Wrapper>,
    );

    fireEvent.click(screen.getByTestId('alerts-tab-conflicts'));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock.mock.calls[0][0]).toBe('/alerts?tab=conflicts');
  });

  it('unknown tab values fall through to warnings (T-53-21 tampering guard)', () => {
    tabState.current = 'nonsense';

    render(
      <Wrapper>
        <AlertsPage />
      </Wrapper>,
    );

    expect(screen.getByTestId('alerts-tab-warnings').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('alert-list-stub')).toBeTruthy();
    expect(screen.queryByTestId('resource-conflicts-panel-stub')).toBeNull();
  });

  it('flag off hides the tablist and renders warnings view only (parity)', () => {
    flagState.uiV6Polish = false;
    tabState.current = 'conflicts'; // deep-link forced to conflicts

    render(
      <Wrapper>
        <AlertsPage />
      </Wrapper>,
    );

    // No tablist at all when flag is off.
    expect(screen.queryByTestId('alerts-tab-warnings')).toBeNull();
    expect(screen.queryByTestId('alerts-tab-conflicts')).toBeNull();
    // Even though tab=conflicts, the conflicts panel is NOT rendered:
    // flag-off forces the legacy warnings view.
    expect(screen.queryByTestId('resource-conflicts-panel-stub')).toBeNull();
    expect(screen.getByTestId('alert-list-stub')).toBeTruthy();
  });

  it('UI-02: tabs wire aria-controls + tabpanel + roving tabIndex (APG)', () => {
    tabState.current = null;
    render(
      <Wrapper>
        <AlertsPage />
      </Wrapper>,
    );

    const warningsTab = screen.getByTestId('alerts-tab-warnings');
    const conflictsTab = screen.getByTestId('alerts-tab-conflicts');
    expect(warningsTab.getAttribute('id')).toBe('alerts-tab-warnings');
    expect(warningsTab.getAttribute('aria-controls')).toBe('alerts-panel-warnings');
    expect(conflictsTab.getAttribute('aria-controls')).toBe('alerts-panel-conflicts');

    // Roving tabindex: active=0, inactive=-1.
    expect(warningsTab.getAttribute('tabindex')).toBe('0');
    expect(conflictsTab.getAttribute('tabindex')).toBe('-1');

    // Panel is labeled by the active tab.
    const panel = document.getElementById('alerts-panel-warnings');
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('tabpanel');
    expect(panel!.getAttribute('aria-labelledby')).toBe('alerts-tab-warnings');
  });

  it('UI-02: ArrowRight on the tablist moves selection + calls router.replace', () => {
    tabState.current = null;
    render(
      <Wrapper>
        <AlertsPage />
      </Wrapper>,
    );

    const warningsTab = screen.getByTestId('alerts-tab-warnings');
    fireEvent.keyDown(warningsTab, { key: 'ArrowRight' });

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock.mock.calls[0][0]).toBe('/alerts?tab=conflicts');
  });
});
