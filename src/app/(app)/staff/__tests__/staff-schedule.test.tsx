/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 42 / Plan 42-02 Task 2.
 *
 * Staff "My Schedule" RTL test. Covers:
 *  - PersonaGate gates non-staff/admin/rd personas
 *  - Grid renders project rows + summary strip from mocked query
 *  - TC-UI read-only gating: no editable <input> inside cells
 *  - Clicking a cell opens the PlanVsActualDrawer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { PersonaProvider, usePersona } from '@/features/personas/persona.context';
import type { Persona } from '@/features/personas/persona.types';
import type { StaffScheduleResult } from '@/features/planning/planning.read';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ orgId: 'org-1', userId: 'u-1', isLoaded: true }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/staff',
  useSearchParams: () => new URLSearchParams(),
}));

// Stub the cell-breakdown server action the drawer calls on open.
vi.mock('@/features/actuals/actuals.cell.actions', () => ({
  getDailyCellBreakdown: vi.fn(async () => []),
}));

const SARA = 'b2222222-2222-4222-8222-222222222222';
const PROJ_X = 'c1111111-1111-4111-8111-111111111111';

const FIXTURE: StaffScheduleResult = {
  person: { id: SARA, name: 'Sara Staff' },
  monthRange: ['2026-06', '2026-07', '2026-08'],
  projects: [
    {
      projectId: PROJ_X,
      projectName: 'Project X',
      months: {
        '2026-06': {
          personId: SARA,
          monthKey: '2026-06',
          allocationId: 'a-1',
          plannedHours: 40,
          actualHours: 30,
          pendingProposal: null,
        },
        '2026-07': {
          personId: SARA,
          monthKey: '2026-07',
          allocationId: 'a-2',
          plannedHours: 50,
          actualHours: null,
          pendingProposal: null,
        },
        '2026-08': {
          personId: SARA,
          monthKey: '2026-08',
          allocationId: null,
          plannedHours: 0,
          actualHours: null,
          pendingProposal: null,
        },
      },
    },
  ],
  summaryStrip: {
    '2026-06': { plannedHours: 40, actualHours: 30, utilizationPct: 40 },
    '2026-07': { plannedHours: 50, actualHours: 0, utilizationPct: 50 },
    '2026-08': { plannedHours: 0, actualHours: 0, utilizationPct: 0 },
  },
};

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : (input as URL).toString();
    if (url.includes('/api/v5/planning/allocations') && url.includes('scope=staff')) {
      return new Response(JSON.stringify(FIXTURE), { status: 200 });
    }
    if (url.includes('/api/departments')) {
      return new Response(JSON.stringify({ departments: [] }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

const messages = {
  v5: {
    staff: {
      title: 'My schedule',
      empty: 'No approved allocations in this range.',
      noPersonaHint: 'Switch to the Staff persona to view your schedule.',
      summaryStrip: {
        planned: 'Planned',
        actual: 'Actual',
        utilization: 'Utilization',
      },
    },
    lineManager: {
      wrongPersonaHint: 'Switch persona',
      switchPersonaCta: 'Switch persona',
      desktopOnlyMessage: 'Desktop only',
    },
    cell: {
      planned: 'Planned',
      actual: 'Actual',
      delta: 'Delta',
      noActual: '—',
      hoursSuffix: 'h',
      onPlan: 'on plan',
      overBy: 'over by {hours}h',
      underBy: 'under by {hours}h',
    },
    timeline: {
      zoom: { month: 'Month', quarter: 'Quarter', year: 'Year' },
    },
    drawer: {
      title: '{person} · {project} · {month}',
      close: 'Close',
      loading: 'Loading…',
      error: 'Error',
      empty: 'No entries',
      dateColumn: 'Date',
      plannedColumn: 'Plan',
      actualColumn: 'Actual',
      deltaColumn: 'Δ',
    },
  },
};

function Wrap({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <PersonaProvider>{children}</PersonaProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function SetPersona({ persona, children }: { persona: Persona; children: ReactNode }) {
  const { persona: active, setPersona } = usePersona();
  useEffect(() => {
    if (active.kind !== persona.kind) setPersona(persona);
  }, [active.kind, persona, setPersona]);
  if (active.kind !== persona.kind) return null;
  return <>{children}</>;
}

// Import after mocks are registered.
import StaffPage from '../page';

describe('Phase 42-02: /staff page', () => {
  it('renders grid + summary strip + read-only cells for staff persona', async () => {
    const staffPersona: Persona = { kind: 'staff', personId: SARA, displayName: 'Sara' };

    await act(async () => {
      render(
        <Wrap>
          <SetPersona persona={staffPersona}>
            <StaffPage />
          </SetPersona>
        </Wrap>,
      );
    });

    // Persona gate allows staff
    expect(screen.getByTestId('persona-gate-allowed')).toBeTruthy();

    // Wait for data to appear
    await screen.findByTestId('staff-grid');

    // Summary strip present
    expect(screen.getByTestId('staff-summary-strip')).toBeTruthy();
    expect(screen.getByTestId('staff-summary-2026-06').textContent).toContain('40');
    expect(screen.getByTestId('staff-summary-2026-06').textContent).toContain('30');
    expect(screen.getByTestId('staff-summary-2026-06').textContent).toContain('40%');

    // Project row rendered
    expect(screen.getByTestId(`staff-row-${PROJ_X}`)).toBeTruthy();

    // TC-UI read-only gating: no editable <input> inside the grid
    const grid = screen.getByTestId('staff-grid');
    expect(grid.querySelectorAll('input').length).toBe(0);

    // Cells are buttons (read-only PlanVsActualCell renders a <button>)
    const cells = grid.querySelectorAll('[data-testid="plan-vs-actual-cell"]');
    expect(cells.length).toBe(3);
    for (const c of Array.from(cells)) {
      expect(c.tagName.toLowerCase()).toBe('button');
    }
  });

  it('PM persona is blocked — sees switch-persona hint, not the grid', async () => {
    const pmPersona: Persona = { kind: 'pm', personId: 'pm-1', displayName: 'PM' };

    await act(async () => {
      render(
        <Wrap>
          <SetPersona persona={pmPersona}>
            <StaffPage />
          </SetPersona>
        </Wrap>,
      );
    });

    expect(screen.queryByTestId('staff-grid')).toBeNull();
    expect(screen.getByTestId('persona-gate-hint')).toBeTruthy();
  });

  it('clicking a cell opens the PlanVsActualDrawer', async () => {
    const staffPersona: Persona = { kind: 'staff', personId: SARA, displayName: 'Sara' };

    await act(async () => {
      render(
        <Wrap>
          <SetPersona persona={staffPersona}>
            <StaffPage />
          </SetPersona>
        </Wrap>,
      );
    });

    await screen.findByTestId('staff-grid');

    const cell = screen.getAllByTestId('plan-vs-actual-cell')[0]!;
    await act(async () => {
      cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Drawer backdrop appears
    expect(screen.getByTestId('drawer-backdrop')).toBeTruthy();
  });
});
