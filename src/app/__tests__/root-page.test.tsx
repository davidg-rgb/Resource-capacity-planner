/**
 * @vitest-environment node
 *
 * v6.0 — Round 1 audit CONS-P0-01: regression test for the server root
 * `src/app/page.tsx` flag-aware redirect path.
 *
 * Asserts:
 *   1. Flag ON + signed-in + org resolves → redirect('/home')
 *   2. Flag OFF + signed-in (admin role) → redirect('/dashboard')
 *   3. Flag OFF + signed-in (planner role) → redirect('/dashboard/team')
 *   4. getTenantId throws (signed-out) → falls through to orgRole routing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}));

const mockRedirect = vi.fn((url: string) => {
  // Mimic Next.js's NEXT_REDIRECT throw so callers stop executing.
  const err = new Error(`NEXT_REDIRECT:${url}`);
  (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307;`;
  throw err;
});
vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}));

const mockGetTenantId = vi.fn();
vi.mock('@/lib/auth', () => ({
  getTenantId: () => mockGetTenantId(),
}));

const mockGetOrgFlags = vi.fn();
vi.mock('@/features/flags/flag.service', () => ({
  getOrgFlags: (orgId: string) => mockGetOrgFlags(orgId),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const FLAGS_OFF = {
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

describe('Root / page (CONS-P0-01)', () => {
  it('redirects to /home when uiV6Landing flag is on', async () => {
    mockAuth.mockResolvedValue({ orgRole: 'org:planner' });
    mockGetTenantId.mockResolvedValue('org-123');
    mockGetOrgFlags.mockResolvedValue({ ...FLAGS_OFF, uiV6Landing: true });

    const { default: Home } = await import('../page');

    await expect(Home()).rejects.toThrow(/NEXT_REDIRECT:\/home/);
    expect(mockRedirect).toHaveBeenCalledWith('/home');
  });

  it('falls back to /dashboard for admin when flag is off', async () => {
    mockAuth.mockResolvedValue({ orgRole: 'org:admin' });
    mockGetTenantId.mockResolvedValue('org-123');
    mockGetOrgFlags.mockResolvedValue({ ...FLAGS_OFF, uiV6Landing: false });

    const { default: Home } = await import('../page');

    await expect(Home()).rejects.toThrow(/NEXT_REDIRECT:\/dashboard/);
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('falls back to /dashboard/team for planner when flag is off', async () => {
    mockAuth.mockResolvedValue({ orgRole: 'org:planner' });
    mockGetTenantId.mockResolvedValue('org-123');
    mockGetOrgFlags.mockResolvedValue({ ...FLAGS_OFF, uiV6Landing: false });

    const { default: Home } = await import('../page');

    await expect(Home()).rejects.toThrow(/NEXT_REDIRECT:\/dashboard\/team/);
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard/team');
  });

  it('falls through to orgRole routing when getTenantId throws (signed-out)', async () => {
    mockAuth.mockResolvedValue({ orgRole: null });
    mockGetTenantId.mockRejectedValue(new Error('Not authenticated'));

    const { default: Home } = await import('../page');

    await expect(Home()).rejects.toThrow(/NEXT_REDIRECT:\/dashboard\/team/);
    expect(mockGetOrgFlags).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard/team');
  });
});
