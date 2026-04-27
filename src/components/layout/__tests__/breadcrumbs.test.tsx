/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';

import en from '@/messages/en.json';
import { PersonaProvider } from '@/features/personas/persona.context';

/* ── Mocks ──────────────────────────────────────────────────────── */

let mockPathname = '/pm/wishes';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

let mockFlags = { uiV6Landing: true };
vi.mock('@/features/flags/flag.context', () => ({
  useFlags: () => mockFlags,
}));

vi.mock('@/features/personas/persona.routes', () => ({
  getLandingRoute: () => '/pm',
  PERSONA_KINDS: ['pm', 'line-manager', 'staff', 'rd', 'admin'],
}));

// Import after mocks
import { Breadcrumbs } from '../breadcrumbs';

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

function renderBreadcrumbs() {
  return render(
    <Wrapper>
      <Breadcrumbs />
    </Wrapper>,
  );
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('Breadcrumbs', () => {
  describe('uiV6Landing ON', () => {
    beforeEach(() => {
      mockFlags = { uiV6Landing: true };
      window.localStorage.clear();
    });

    it('snapshot: flag on, path /pm/wishes', () => {
      mockPathname = '/pm/wishes';
      const { container } = renderBreadcrumbs();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('snapshot: flag on, path /line-manager/timeline', () => {
      mockPathname = '/line-manager/timeline';
      const { container } = renderBreadcrumbs();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders Home link with correct href', () => {
      mockPathname = '/pm/wishes';
      renderBreadcrumbs();
      const homeLink = screen.getByText('Home');
      expect(homeLink).toBeInTheDocument();
      expect(homeLink.closest('a')).toHaveAttribute('href', '/pm');
    });

    it('renders intermediate segments as clickable Links', () => {
      // audit-r2 / D-CR-110: persona acronyms render via LABEL_MAP
      // ("pm" -> "PM") instead of relying on CSS capitalize.
      mockPathname = '/pm/wishes';
      renderBreadcrumbs();
      const pmLink = screen.getByText('PM');
      expect(pmLink.closest('a')).toHaveAttribute('href', '/pm');
    });

    it('renders last segment as plain text (not a link)', () => {
      mockPathname = '/pm/wishes';
      renderBreadcrumbs();
      const wishesText = screen.getByText('wishes');
      expect(wishesText.tagName).toBe('SPAN');
      expect(wishesText.closest('a')).toBeNull();
    });

    it('has aria-label Breadcrumb on nav', () => {
      mockPathname = '/pm';
      renderBreadcrumbs();
      expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    });
  });

  describe('uiV6Landing OFF', () => {
    beforeEach(() => {
      mockFlags = { uiV6Landing: false };
      window.localStorage.clear();
    });

    it('snapshot: flag off, path /dashboard/team', () => {
      mockPathname = '/dashboard/team';
      const { container } = renderBreadcrumbs();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('does not render Home link', () => {
      mockPathname = '/dashboard/team';
      renderBreadcrumbs();
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('has aria-label Breadcrumb on nav', () => {
      mockPathname = '/dashboard';
      renderBreadcrumbs();
      expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    });
  });
});
