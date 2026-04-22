/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 53 / Plan 53-02 (POLISH-02, D-03 LITERAL): visibleFor + Help nav
 * item + NotificationBell mount in TopNav.
 *
 * Matrix (7 tests):
 *   1. flag off, persona=staff                → visibleItems = current filter
 *      (NAV_ITEMS.filter(item => !item.flag || flags[item.flag])); no Help item
 *      in list (Help has visibleFor=undefined but visibleFor is a no-op when
 *      flag off — and Help is still in NAV_ITEMS, so it IS visible even with
 *      flag off; assert on Help presence accordingly)
 *   2. flag on,  persona=staff                → only Help in center nav;
 *      NotificationBell mount present (internally renders null for Staff —
 *      assert on mount, not DOM output)
 *   3. flag on,  persona=pm                   → overview + projects +
 *      projectDashboard + planHours + teamLoad + help
 *   4. flag on,  persona=line-manager         → overview + planHours +
 *      teamLoad + projects + warnings + help
 *   5. flag on,  persona=rd                   → overview + teamLoad +
 *      projects + warnings + help
 *   6. flag on,  persona=admin                → every item incl. help
 *   7. flag on,  dashboards=false            → items gated by 'dashboards'
 *      are filtered BEFORE visibleFor (flag check precedes visibleFor)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';
import type { Persona } from '@/features/personas/persona.types';
import type { FeatureFlags } from '@/features/flags/flag.types';

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------

const flagState: { flags: FeatureFlags } = {
  flags: {
    dashboards: true,
    pdfExport: false,
    alerts: true,
    onboarding: false,
    scenarios: true,
    uiV6Landing: false,
    uiV6LeanTrim: false,
    uiV6PerJourney: false,
    uiV6Polish: false,
  },
};
const personaState: { persona: Persona } = {
  persona: { kind: 'admin', displayName: 'Admin' },
};
const authState: { userId: string | null } = { userId: 'clerk-user' };

vi.mock('@/features/flags/flag.context', () => ({
  useFlags: () => flagState.flags,
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
  UserButton: () => <div data-testid="user-button" />,
  useUser: () => ({ isLoaded: true, user: null }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// Stub the children pieces so we isolate nav-filter behaviour
vi.mock('@/components/alerts/alert-badge', () => ({
  AlertBadge: () => <span data-testid="alert-badge-legacy" />,
}));
vi.mock('@/components/persona/persona-switcher', () => ({
  PersonaSwitcher: () => <div data-testid="persona-switcher" />,
}));
vi.mock('@/components/persona/pending-wish-chip', () => ({
  PendingWishChip: () => null,
}));
vi.mock('@/components/persona/notification-bell', () => ({
  NotificationBell: () => <div data-testid="notification-bell-mount" />,
}));

// --------------------------------------------------------------------------
// Harness
// --------------------------------------------------------------------------

const { TopNav } = await import('../top-nav');

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

// Collect center-nav link hrefs. The mobile drawer is not rendered (closed
// by default), so `getAllByRole('link')` ∪ filter-by-href picks up only the
// lg-visible links + the logo link.
function centerNavHrefs(): string[] {
  const links = screen.getAllByRole('link');
  return links
    .map((a) => a.getAttribute('href') ?? '')
    .filter((h) => h && h !== '/'); // exclude logo /
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('TopNav visibleFor matrix (POLISH-02 / D-03 LITERAL)', () => {
  beforeEach(() => {
    flagState.flags = {
      dashboards: true,
      pdfExport: false,
      alerts: true,
      onboarding: false,
      scenarios: true,
      uiV6Landing: false,
      uiV6LeanTrim: false,
      uiV6PerJourney: false,
      uiV6Polish: false,
    };
    personaState.persona = { kind: 'admin', displayName: 'Admin' };
    authState.userId = 'clerk-user';
  });

  afterEach(() => {
    cleanup();
  });

  it('Test 1: flag off + persona=staff → legacy filter result; visibleFor is a no-op', () => {
    flagState.flags.uiV6Polish = false;
    personaState.persona = { kind: 'staff', personId: 'p-1', displayName: 'Staff' };
    render(<TopNav />, { wrapper: makeWrapper() });
    const hrefs = centerNavHrefs();
    // Flag-off preserves the existing filter — every flag-enabled NAV_ITEM is
    // visible regardless of persona. Key items must be present:
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/projects');
    expect(hrefs).toContain('/alerts');
    // Help item IS in NAV_ITEMS so it appears — but its presence here is not
    // the POLISH-02 narrative; the flag-off parity only requires legacy set
    // to be preserved. We assert no filtering happened via visibleFor.
    expect(hrefs).toContain('/alerts'); // alerts is visibleFor=['line-manager','rd','admin'] but flag off = no-op
  });

  it('Test 2: flag on + persona=staff → only Help in center nav; bell mount present', () => {
    flagState.flags.uiV6Polish = true;
    personaState.persona = { kind: 'staff', personId: 'p-1', displayName: 'Staff' };
    render(<TopNav />, { wrapper: makeWrapper() });
    const hrefs = centerNavHrefs();
    expect(hrefs).toEqual(['/help']);
    // NotificationBell is mounted (its internal null-return for staff is its
    // own concern — tested in notification-bell.test.tsx).
    expect(screen.getByTestId('notification-bell-mount')).toBeTruthy();
  });

  it('Test 3: flag on + persona=pm → overview + projects + projectDashboard + planHours + teamLoad + help', () => {
    flagState.flags.uiV6Polish = true;
    personaState.persona = {
      kind: 'pm',
      personId: 'p-anna',
      displayName: 'Anna',
      homeDepartmentId: 'dept-A',
    };
    render(<TopNav />, { wrapper: makeWrapper() });
    const hrefs = centerNavHrefs();
    expect(hrefs).toEqual([
      '/dashboard/team',
      '/input',
      '/projects',
      '/dashboard',
      '/dashboard/projects',
      '/help',
    ]);
  });

  it('Test 4: flag on + persona=line-manager → teamLoad + planHours + projects + overview + warnings + help', () => {
    flagState.flags.uiV6Polish = true;
    personaState.persona = {
      kind: 'line-manager',
      departmentId: 'dept-A',
      displayName: 'Per',
    };
    render(<TopNav />, { wrapper: makeWrapper() });
    const hrefs = centerNavHrefs();
    expect(hrefs).toEqual([
      '/dashboard/team',
      '/input',
      '/projects',
      '/dashboard',
      '/alerts',
      '/help',
    ]);
  });

  it('Test 5: flag on + persona=rd → teamLoad + projects + overview + warnings + help', () => {
    flagState.flags.uiV6Polish = true;
    personaState.persona = { kind: 'rd', displayName: 'R&D' };
    render(<TopNav />, { wrapper: makeWrapper() });
    const hrefs = centerNavHrefs();
    expect(hrefs).toEqual([
      '/dashboard/team',
      '/projects',
      '/dashboard',
      '/alerts',
      '/help',
    ]);
  });

  it('Test 6: flag on + persona=admin → every item including help', () => {
    flagState.flags.uiV6Polish = true;
    personaState.persona = { kind: 'admin', displayName: 'Admin' };
    render(<TopNav />, { wrapper: makeWrapper() });
    const hrefs = centerNavHrefs();
    expect(hrefs).toEqual([
      '/dashboard/team',
      '/input',
      '/projects',
      '/dashboard',
      '/dashboard/projects',
      '/scenarios',
      '/alerts',
      '/team',
      '/data',
      '/admin/disciplines',
      '/admin/members',
      '/help',
    ]);
  });

  it('Test 7: flag on + dashboards=false → flag gate precedes visibleFor', () => {
    flagState.flags.uiV6Polish = true;
    flagState.flags.dashboards = false;
    personaState.persona = { kind: 'admin', displayName: 'Admin' };
    render(<TopNav />, { wrapper: makeWrapper() });
    const hrefs = centerNavHrefs();
    // Items with flag='dashboards' must be absent: teamLoad (/dashboard/team),
    // overview (/dashboard), projectDashboard (/dashboard/projects).
    expect(hrefs).not.toContain('/dashboard');
    expect(hrefs).not.toContain('/dashboard/team');
    expect(hrefs).not.toContain('/dashboard/projects');
    // Other admin items remain visible
    expect(hrefs).toContain('/projects');
    expect(hrefs).toContain('/help');
  });
});
