/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 53 / Plan 53-04 (POLISH-06): StrategicAlertsBanner.
 *
 * Tests:
 *   1. useAlerts=[] → returns null (no DOM presence)
 *   2. useAlerts has 3 alerts → renders title "3 kritiska varningar" + CTA link to /alerts
 *   3. useAlerts has 1 alert → ICU {count} interpolates correctly ("1 kritiska varningar")
 *   4. dashboard-content, flag OFF → banner not mounted (no data-testid found)
 *   5. dashboard-content, flag ON → banner rendered (component import side-effect observable)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';
import type { CapacityAlert } from '@/features/analytics/analytics.types';

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------

const flagState: { uiV6Polish: boolean } = { uiV6Polish: true };
const alertsState: { alerts: CapacityAlert[] } = { alerts: [] };

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
  useAlerts: (_from: string, _to: string) => ({ data: alertsState.alerts }),
  useAlertCount: (_from: string, _to: string) => ({ data: alertsState.alerts.length }),
}));

vi.mock('@/lib/date-utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/date-utils')>(
    '@/lib/date-utils',
  );
  return {
    ...actual,
    getCurrentMonth: () => '2026-04',
    generateMonthRange: (from: string, _count: number) => [from, '2026-05', '2026-06', '2026-07'],
  };
});

// Stub DashboardGrid + TimeRangeProvider so we can render dashboard-content without
// wiring the entire widget registry / TanStack Query context.
vi.mock('@/features/dashboard/dashboard-layout-engine', () => ({
  DashboardGrid: ({ dashboardId }: { dashboardId: string }) => (
    <div data-testid={`dashboard-grid-${dashboardId}`} />
  ),
}));
vi.mock('@/features/dashboard/dashboard-time-range', () => ({
  TimeRangeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
// Side-effect widget registrations — no-op under test.
vi.mock('@/features/dashboard/widgets', () => ({}));

// --------------------------------------------------------------------------
// Harness
// --------------------------------------------------------------------------

const { StrategicAlertsBanner } = await import('../strategic-alerts-banner');
const { DashboardContent } = await import('@/app/(app)/dashboard/dashboard-content');

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      {children}
    </NextIntlClientProvider>
  );
}

function makeAlert(id: string, severity: CapacityAlert['severity']): CapacityAlert {
  return {
    personId: id,
    firstName: 'Foo',
    lastName: 'Bar',
    departmentName: 'Dept',
    totalTarget: 160,
    totalAllocated: severity === 'overloaded' ? 200 : 48,
    utilizationRatio: severity === 'overloaded' ? 1.2 : 0.3,
    severity,
  };
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('StrategicAlertsBanner (POLISH-06)', () => {
  beforeEach(() => {
    flagState.uiV6Polish = true;
    alertsState.alerts = [];
  });

  afterEach(() => cleanup());

  it('Test 1: returns null when alerts=[]', () => {
    alertsState.alerts = [];
    const { container } = render(
      <Wrapper>
        <StrategicAlertsBanner />
      </Wrapper>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('Test 2: renders title with count + CTA link to /alerts when 3 alerts', () => {
    alertsState.alerts = [
      makeAlert('a', 'overloaded'),
      makeAlert('b', 'overloaded'),
      makeAlert('c', 'underutilized'),
    ];
    render(
      <Wrapper>
        <StrategicAlertsBanner />
      </Wrapper>,
    );

    // Title with ICU count interpolation — sv.json: "{count} kritiska varningar"
    expect(screen.getByText('3 kritiska varningar')).toBeTruthy();

    // CTA link
    const cta = screen.getByTestId('strategic-alerts-banner-cta') as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/alerts');
    expect(cta.textContent).toBe('Se alla →');

    // role=alert for a11y
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('Test 3: ICU {count} interpolates correctly for count=1', () => {
    alertsState.alerts = [makeAlert('a', 'overloaded')];
    render(
      <Wrapper>
        <StrategicAlertsBanner />
      </Wrapper>,
    );
    expect(screen.getByText('1 kritiska varningar')).toBeTruthy();
  });
});

// --------------------------------------------------------------------------
// Mount-point tests: dashboard-content.tsx flag gating
// --------------------------------------------------------------------------

describe('DashboardContent — StrategicAlertsBanner mount point (POLISH-06)', () => {
  beforeEach(() => {
    alertsState.alerts = [makeAlert('a', 'overloaded')];
  });

  afterEach(() => cleanup());

  it('Test 4: uiV6Polish=false → banner NOT rendered', () => {
    flagState.uiV6Polish = false;
    render(
      <Wrapper>
        <DashboardContent />
      </Wrapper>,
    );

    expect(screen.queryByTestId('strategic-alerts-banner-cta')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    // Dashboard grid still renders
    expect(screen.getByTestId('dashboard-grid-manager')).toBeTruthy();
  });

  it('Test 5: uiV6Polish=true + alerts > 0 → banner rendered above dashboard grid', () => {
    flagState.uiV6Polish = true;
    const { container } = render(
      <Wrapper>
        <DashboardContent />
      </Wrapper>,
    );

    const banner = screen.getByTestId('strategic-alerts-banner-cta');
    const grid = screen.getByTestId('dashboard-grid-manager');
    expect(banner).toBeTruthy();
    expect(grid).toBeTruthy();

    // Banner appears BEFORE grid in document order
    const bannerEl = container.querySelector('[role="alert"]');
    expect(bannerEl).not.toBeNull();
    expect(
      bannerEl!.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
