/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import en from '@/messages/en.json';
import { PersonaProvider } from '@/features/personas/persona.context';
import type { PersonaKind } from '@/features/personas/persona.types';
import { PERSONA_SECTION_NAV } from '../side-nav';

/* ── Mocks ──────────────────────────────────────────────────────── */

let mockPathname = '/pm';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

let mockFlags = { uiV6Landing: true };
vi.mock('@/features/flags/flag.context', () => ({
  useFlags: () => mockFlags,
}));

// Import after mocks
import { SideNav } from '../side-nav';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <NextIntlClientProvider locale="en" messages={en as Record<string, unknown>}>
      <QueryClientProvider client={qc}>
        <PersonaProvider>{children}</PersonaProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}

function renderSideNav() {
  return render(
    <Wrapper>
      <SideNav />
    </Wrapper>,
  );
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('SideNav', () => {
  describe('PERSONA_SECTION_NAV coverage', () => {
    it('has entries for all 5 persona kinds', () => {
      const kinds: PersonaKind[] = ['pm', 'line-manager', 'staff', 'rd', 'admin'];
      for (const kind of kinds) {
        expect(PERSONA_SECTION_NAV[kind]).toBeDefined();
        expect(PERSONA_SECTION_NAV[kind].length).toBeGreaterThan(0);
      }
    });
  });

  describe('uiV6Landing ON (persona-keyed)', () => {
    beforeEach(() => {
      mockFlags = { uiV6Landing: true };
      window.localStorage.clear();
    });

    it('renders admin section items by default (default persona is admin)', () => {
      mockPathname = '/admin';
      renderSideNav();
      // Default persona is admin, so we should see admin items
      expect(screen.getByText('Administration')).toBeInTheDocument();
      expect(screen.getByText('Change Log')).toBeInTheDocument();
      expect(screen.getByText('People')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('renders PM section when persona is pm', () => {
      // Set PM persona in localStorage before render
      window.localStorage.setItem(
        'nc:persona',
        JSON.stringify({ kind: 'pm', personId: 'p1', displayName: 'Test PM' }),
      );
      mockPathname = '/pm';
      renderSideNav();
      expect(screen.getByText('Project Manager')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('My Projects')).toBeInTheDocument();
      expect(screen.getByText('My Wishes')).toBeInTheDocument();
    });

    it('renders line-manager section when persona is line-manager', () => {
      window.localStorage.setItem(
        'nc:persona',
        JSON.stringify({ kind: 'line-manager', departmentId: 'd1', displayName: 'Test LM' }),
      );
      mockPathname = '/line-manager';
      renderSideNav();
      expect(screen.getByText('Line Manager')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Group Schedule')).toBeInTheDocument();
      expect(screen.getByText('Approval Queue')).toBeInTheDocument();
      expect(screen.getByText('Import Actuals')).toBeInTheDocument();
    });
  });

  describe('uiV6Landing OFF (legacy route-based)', () => {
    beforeEach(() => {
      mockFlags = { uiV6Landing: false };
      window.localStorage.clear();
    });

    it('renders legacy dashboard sections for /dashboard path', () => {
      mockPathname = '/dashboard';
      renderSideNav();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('KPI Dashboard')).toBeInTheDocument();
    });

    it('renders legacy admin sections for /admin path', () => {
      mockPathname = '/admin/disciplines';
      renderSideNav();
      expect(screen.getByText('Reference Data')).toBeInTheDocument();
      expect(screen.getByText('Disciplines')).toBeInTheDocument();
    });
  });
});
