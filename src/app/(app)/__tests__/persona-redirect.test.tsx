/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 50 / Plan 50-01: PersonaRedirect component tests (NAV-01).
 *
 * Mocks:
 *   - next/navigation → useRouter with controllable replace spy
 *   - @/features/personas/persona.context → usePersona with controllable persona
 *   - @/features/flags/flag.context → useFlags with controllable flags
 *   - @/features/personas/persona.routes → getLandingRoute with controllable return
 *
 * Asserts:
 *   1. Flag on + PM persona → router.replace('/pm')
 *   2. Flag on + line-manager persona → router.replace('/line-manager')
 *   3. Flag off → router.replace('/dashboard') (fallback)
 *   4. Component renders null (no visible UI)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import type { Persona } from '@/features/personas/persona.types';
import type { FeatureFlags } from '@/features/flags/flag.types';

/* ── controllable mocks ─────────────────────────────────────────── */

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const defaultPmPersona: Persona = {
  kind: 'pm',
  personId: 'p-anna',
  displayName: 'Anna PM',
  homeDepartmentId: 'dept-A',
};

const mockUsePersona = vi.fn().mockReturnValue({
  persona: defaultPmPersona,
  setPersona: vi.fn(),
  departments: [],
});
vi.mock('@/features/personas/persona.context', () => ({
  usePersona: () => mockUsePersona(),
}));

const DEFAULT_FLAGS: FeatureFlags = {
  dashboards: false,
  pdfExport: false,
  alerts: false,
  onboarding: false,
  scenarios: false,
  uiV6Landing: true,
};

const mockUseFlags = vi.fn().mockReturnValue(DEFAULT_FLAGS);
vi.mock('@/features/flags/flag.context', () => ({
  useFlags: () => mockUseFlags(),
}));

vi.mock('@/features/personas/persona.routes', () => ({
  getLandingRoute: (p: Persona) => {
    switch (p.kind) {
      case 'pm':
        return '/pm';
      case 'line-manager':
        return '/line-manager';
      case 'staff':
        return '/staff';
      case 'rd':
        return '/rd';
      case 'admin':
        return '/admin';
    }
  },
}));

/* ── lazy import so mocks are installed first ───────────────────── */

let PersonaRedirect: typeof import('../home/page').default;

beforeEach(async () => {
  vi.clearAllMocks();
  mockReplace.mockClear();
  mockUsePersona.mockReturnValue({
    persona: defaultPmPersona,
    setPersona: vi.fn(),
    departments: [],
  });
  mockUseFlags.mockReturnValue({ ...DEFAULT_FLAGS, uiV6Landing: true });

  const mod = await import('../home/page');
  PersonaRedirect = mod.default;
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ── tests ──────────────────────────────────────────────────────── */

describe('PersonaRedirect (NAV-01)', () => {
  it('redirects PM persona to /pm when uiV6Landing is on', async () => {
    render(<PersonaRedirect />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/pm');
    });
  });

  it('redirects line-manager persona to /line-manager when uiV6Landing is on', async () => {
    const lmPersona: Persona = {
      kind: 'line-manager',
      departmentId: 'dept-B',
      displayName: 'Erik LM',
    };
    mockUsePersona.mockReturnValue({
      persona: lmPersona,
      setPersona: vi.fn(),
      departments: [],
    });

    render(<PersonaRedirect />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/line-manager');
    });
  });

  it('redirects to /dashboard when uiV6Landing is off (fallback)', async () => {
    mockUseFlags.mockReturnValue({ ...DEFAULT_FLAGS, uiV6Landing: false });

    render(<PersonaRedirect />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('renders null (no visible UI)', () => {
    const { container } = render(<PersonaRedirect />);
    expect(container.innerHTML).toBe('');
  });
});
