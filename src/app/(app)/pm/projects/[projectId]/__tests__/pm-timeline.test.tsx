/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 40 / Plan 40-05 Wave 4: TC-UI-002 PM project timeline page smoke.
 *
 * The real <TimelineGrid> uses ag-grid which is awkward in jsdom. We mock it
 * with a lightweight stub that exposes `data-testid="pm-cell"` per cell so the
 * test can assert the row×column cross-product (people × monthRange) — this
 * is the "alternative lighter assertion" documented in the plan's Task 1a #2.
 *
 * Mocks:
 *   - next/navigation useParams → { projectId: 'p1' }
 *   - @/features/personas/persona.context → PM persona
 *   - @/components/timeline/timeline-grid → stub that emits pm-cell testids
 *   - global fetch → /api/v5/planning/allocations?scope=pm JSON
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';
import type { PmTimelineView } from '@/features/planning/planning.read';

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'p1' }),
}));

vi.mock('@/features/personas/persona.context', () => ({
  usePersona: () => ({
    persona: {
      kind: 'pm',
      personId: 'p-anna',
      displayName: 'Anna',
      homeDepartmentId: 'dept-A',
    },
    setPersona: vi.fn(),
  }),
}));

// Stub TimelineGrid so we don't pull in ag-grid in jsdom. The stub renders
// one `<div data-testid="pm-cell" data-person=... data-month=... />` per
// (person, monthKey) tuple — the row×column cross-product TC-UI-002 asserts
// (see plan 40-05 Task 1a #2 — columnheader OR pm-cell path).
vi.mock('@/components/timeline/timeline-grid', () => ({
  TimelineGrid: (props: { view: PmTimelineView }) => (
    <div data-testid="pm-timeline-grid-stub">
      {props.view.people.flatMap((person) =>
        props.view.monthRange.map((monthKey) => (
          <div
            key={`${person.id}::${monthKey}`}
            data-testid="pm-cell"
            data-person={person.id}
            data-month={monthKey}
          />
        )),
      )}
    </div>
  ),
}));

const { default: PmProjectTimelinePage } = await import('../page');

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

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function buildView(): PmTimelineView {
  const people = [
    { id: 'sara', name: 'Sara Staff', departmentId: 'dept-A' },
    { id: 'ben', name: 'Ben Staff', departmentId: 'dept-B' },
  ];
  // 13 months starting 2026-05 (matches the page's default window intent).
  const monthRange = Array.from({ length: 13 }, (_, i) => {
    const m = ((4 + i) % 12) + 1;
    const y = 2026 + Math.floor((4 + i) / 12);
    return `${y}-${String(m).padStart(2, '0')}`;
  });
  const cells = people.flatMap((p) =>
    monthRange.map((monthKey) => ({
      personId: p.id,
      monthKey,
      allocationId: null,
      plannedHours: 0,
      actualHours: null,
      pendingProposal: null,
    })),
  );
  return {
    project: { id: 'p1', name: 'Alpha' },
    people,
    monthRange,
    cells,
  };
}

describe('PM project timeline page (TC-UI-002)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders one pm-cell per person×month (2 people × 13 months = 26)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.startsWith('/api/v5/planning/allocations')) {
        return ok(buildView());
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<PmProjectTimelinePage />, { wrapper: makeWrapper() });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument());

    const cells = screen.getAllByTestId('pm-cell');
    expect(cells).toHaveLength(2 * 13);

    // Sanity: at least one cell per person per month
    expect(cells.filter((c) => c.getAttribute('data-person') === 'sara')).toHaveLength(13);
    expect(cells.filter((c) => c.getAttribute('data-person') === 'ben')).toHaveLength(13);
  });
});
