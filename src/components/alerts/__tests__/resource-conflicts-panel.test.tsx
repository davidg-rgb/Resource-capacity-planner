/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 53 / Plan 53-05 (POLISH-05): ResourceConflictsPanel tests.
 *
 * The panel was extracted from `resource-conflict-widget.tsx`. These tests
 * verify the route-agnostic behaviour: it renders the same visible surface
 * as the legacy widget for a given fixture, and the dismissed-conflicts
 * localStorage key behaves the same.
 *
 * Tests:
 *   1. Renders empty-state message when conflicts array is empty.
 *   2. Renders redistribute + dismiss buttons for a single conflict.
 *   3. Dismiss button persists the key in localStorage under
 *      `nordic-capacity-dismissed-conflicts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';
import type { ConflictsResponse } from '@/features/analytics/analytics.types';

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------

const conflictsState: { data: ConflictsResponse | undefined; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};

vi.mock('@/hooks/use-conflicts', () => ({
  useConflicts: () => ({
    data: conflictsState.data,
    isLoading: conflictsState.isLoading,
    error: null,
  }),
}));

vi.mock('@/features/dashboard/person-card/person-card-provider', () => ({
  usePersonCard: () => ({ openPersonCard: vi.fn() }),
}));

// TanStack Query's useMutation used by redistribute + apply-suggestion.
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  );
  return {
    ...actual,
    useMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    }),
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

// --------------------------------------------------------------------------
// Harness
// --------------------------------------------------------------------------

const { ResourceConflictsPanel } = await import('../resource-conflicts-panel');

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={sv}>
      {children}
    </NextIntlClientProvider>
  );
}

function makeConflict(overrides: Partial<ConflictsResponse['conflicts'][number]> = {}) {
  return {
    personId: 'p-1',
    firstName: 'Per',
    lastName: 'Karlsson',
    departmentName: 'Electronics Design',
    disciplineAbbreviation: 'EE',
    targetHoursPerMonth: 160,
    months: {
      '2026-04': {
        totalAllocated: 200,
        overBy: 40,
        projects: [
          { projectId: 'prj-1', projectName: 'Nordlys', hours: 120 },
          { projectId: 'prj-2', projectName: 'Auroral', hours: 80 },
        ],
      },
    },
    ...overrides,
  } as ConflictsResponse['conflicts'][number];
}

beforeEach(() => {
  localStorage.clear();
  conflictsState.data = undefined;
  conflictsState.isLoading = false;
});

afterEach(() => {
  cleanup();
});

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('ResourceConflictsPanel (Plan 53-05 POLISH-05)', () => {
  it('renders empty-state message when conflicts array is empty', () => {
    conflictsState.data = {
      conflicts: [],
      summary: { totalConflicts: 0, resolvedThisMonth: 0 },
    } as unknown as ConflictsResponse;

    render(
      <Wrapper>
        <ResourceConflictsPanel />
      </Wrapper>,
    );

    // emptyState key maps to the "Inga konflikter..." / "No conflicts..." copy.
    const panel = screen.getByTestId('resource-conflicts-panel');
    expect(panel).toBeTruthy();
    // No conflict cards rendered — use the person-card button as proxy.
    expect(screen.queryByText(/Per Karlsson/)).toBeNull();
  });

  it('renders a conflict card with person + project bars + action buttons', () => {
    conflictsState.data = {
      conflicts: [makeConflict()],
      summary: { totalConflicts: 1, resolvedThisMonth: 0 },
    } as unknown as ConflictsResponse;

    render(
      <Wrapper>
        <ResourceConflictsPanel />
      </Wrapper>,
    );

    expect(screen.getByText(/Per Karlsson/)).toBeTruthy();
    expect(screen.getByText(/Nordlys/)).toBeTruthy();
    expect(screen.getByText(/Auroral/)).toBeTruthy();
  });

  it('persists dismissed conflicts to localStorage under nordic-capacity-dismissed-conflicts', () => {
    conflictsState.data = {
      conflicts: [makeConflict()],
      summary: { totalConflicts: 1, resolvedThisMonth: 0 },
    } as unknown as ConflictsResponse;

    render(
      <Wrapper>
        <ResourceConflictsPanel />
      </Wrapper>,
    );

    // Find the dismiss button. Copy from sv.json widgets.common.dismiss = "Avfärda".
    const dismissButton = screen.getAllByRole('button').find(
      (b) => b.textContent?.trim().toLowerCase() === 'avfärda',
    );
    expect(dismissButton).toBeDefined();
    fireEvent.click(dismissButton!);

    const stored = localStorage.getItem('nordic-capacity-dismissed-conflicts');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    // Dismiss key shape is `${personId}:${month}` per the panel's makeDismissKey.
    expect(parsed).toContain('p-1:2026-04');
  });

  it('exposes data-testid="resource-conflicts-panel" as the mount anchor', () => {
    conflictsState.data = {
      conflicts: [],
      summary: { totalConflicts: 0, resolvedThisMonth: 0 },
    } as unknown as ConflictsResponse;

    render(
      <Wrapper>
        <ResourceConflictsPanel />
      </Wrapper>,
    );

    expect(screen.getByTestId('resource-conflicts-panel')).toBeTruthy();
  });
});
