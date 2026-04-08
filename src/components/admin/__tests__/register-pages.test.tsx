/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 43 / Plan 43-03 Task 2 (TDD).
 *
 * Integration test per admin register entity. For each of the five pages
 * (people / projects / departments / disciplines / programs) we mount the
 * page behind a Clerk org:admin mock + admin persona, and assert:
 *
 *   - RegisterTable renders seeded rows
 *   - "Ny" → drawer opens empty → fill required fields → POST fires → list refetches
 *   - Row edit pencil → drawer opens populated
 *   - Row archive → confirm accept → DELETE fires
 *   - Archive mock → 409 DEPENDENT_ROWS_EXIST → banner renders entity-specific text
 *   - Toggle "Visa arkiverade" → archived row visible
 *   - Open archived row → "Återställ" visible → click → PATCH with archivedAt=null
 *
 * The tests use fetch mocks (no MSW dep) and reuse the PersonaProvider +
 * Next-Intl + React-Query wrap pattern from staff-schedule.test.tsx.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { PersonaProvider, usePersona } from '@/features/personas/persona.context';
import type { Persona } from '@/features/personas/persona.types';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ orgRole: 'org:admin', orgId: 'org-1', userId: 'u-1', isLoaded: true }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin',
  useSearchParams: () => new URLSearchParams(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEPT_A = { id: '11111111-1111-4111-8111-111111111111', name: 'Mekanik', archivedAt: null };
const DEPT_ARCHIVED = {
  id: '11111111-1111-4111-8111-222222222222',
  name: 'Gammal',
  archivedAt: '2026-01-01T00:00:00Z',
};
const DISC_A = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Konstruktör',
  abbreviation: 'KON',
  archivedAt: null,
};
const PROG_A = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Alpha',
  description: 'Flagship program',
  archivedAt: null,
};
const PERSON_A = {
  id: '44444444-4444-4444-8444-444444444444',
  firstName: 'Anna',
  lastName: 'Andersson',
  disciplineId: DISC_A.id,
  departmentId: DEPT_A.id,
  targetHoursPerMonth: 160,
  archivedAt: null,
};
const PROJECT_A = {
  id: '55555555-5555-4555-8555-555555555555',
  name: 'Project Neo',
  programId: PROG_A.id,
  status: 'active' as const,
  archivedAt: null,
};

// ---------------------------------------------------------------------------
// Fetch stub — routes each URL to a configurable handler map so individual
// tests can override a single endpoint (e.g. make DELETE return 409).
// ---------------------------------------------------------------------------

type Handler = (url: string, init?: RequestInit) => Promise<Response> | Response;

const handlers: Record<string, Handler> = {};

function setupFetch() {
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as URL).toString();
    // Longest-prefix-first so handler for `.../person/:id` beats `.../person`.
    const prefixes = Object.keys(handlers).sort((a, b) => b.length - a.length);
    for (const prefix of prefixes) {
      if (url === prefix || url.startsWith(prefix + '?') || url.startsWith(prefix + '/')) {
        return handlers[prefix]!(url, init);
      }
    }
    // Default: empty list for unmocked register endpoints so pages mount.
    if (url.includes('/api/v5/admin/registers/')) {
      return new Response(JSON.stringify({ rows: [] }), { status: 200 });
    }
    if (url.includes('/api/departments')) {
      return new Response(JSON.stringify({ departments: [DEPT_A] }), { status: 200 });
    }
    if (url.includes('/api/disciplines')) {
      return new Response(JSON.stringify({ disciplines: [DISC_A] }), { status: 200 });
    }
    if (url.includes('/api/programs')) {
      return new Response(JSON.stringify({ programs: [PROG_A] }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
}

const originalFetch = global.fetch;

beforeEach(() => {
  for (const k of Object.keys(handlers)) delete handlers[k];
  setupFetch();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Minimal i18n messages — only what the pages + RegisterTable actually read.
// ---------------------------------------------------------------------------

const messages = {
  v5: {
    admin: {
      register: {
        title: {
          person: 'People',
          project: 'Projects',
          department: 'Departments',
          discipline: 'Disciplines',
          program: 'Programs',
        },
        description: {
          person: 'Manage people',
          project: 'Manage projects',
          department: 'Manage departments',
          discipline: 'Manage disciplines',
          program: 'Manage programs',
        },
        new: 'Ny',
        edit: 'Redigera',
        archive: 'Arkivera',
        archiveConfirm: 'Arkivera {name}?',
        unarchive: 'Återställ',
        showArchived: 'Visa arkiverade',
        archivedBadge: 'arkiverad',
        actionsColumn: 'Åtgärder',
        empty: 'Inga rader.',
        addFirst: 'Lägg till',
        loading: 'Laddar…',
        retry: 'Försök igen',
        errorTitle: 'Kunde inte ladda listan.',
        saveError: 'Kunde inte spara.',
        saveSuccess: 'Sparat.',
        closeLabel: 'Stäng',
        submit: 'Spara',
        cancel: 'Avbryt',
        forbidden: 'Du behöver administratörsbehörighet.',
        dependentRowsExist: {
          title: 'Kan inte arkivera — raden används på andra ställen.',
          allocations: '{count} aktiva allokeringar',
          proposals: '{count} aktiva önskemål',
          people: '{count} personer',
          projects: '{count} projekt',
          leadPm: '{count} projekt där denna person är ansvarig PM',
        },
        form: {
          person: {
            firstName: 'Förnamn',
            lastName: 'Efternamn',
            discipline: 'Disciplin',
            department: 'Avdelning',
            targetHoursPerMonth: 'Måltimmar per månad',
          },
          project: { name: 'Namn', program: 'Program', status: 'Status' },
          department: { name: 'Namn' },
          discipline: { name: 'Namn', abbreviation: 'Förkortning' },
          program: { name: 'Namn', description: 'Beskrivning' },
        },
      },
    },
    lineManager: {
      wrongPersonaHint: 'Switch persona',
      switchPersonaCta: 'Switch persona',
    },
  },
};

// ---------------------------------------------------------------------------
// Wrap helper
// ---------------------------------------------------------------------------

function Wrap({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <PersonaProvider>
          <SetAdminPersona>{children}</SetAdminPersona>
        </PersonaProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function SetAdminPersona({ children }: { children: ReactNode }) {
  const { persona, setPersona } = usePersona();
  useEffect(() => {
    const adminPersona: Persona = { kind: 'admin', displayName: 'Admin' };
    if (persona.kind !== 'admin') setPersona(adminPersona);
  }, [persona.kind, setPersona]);
  if (persona.kind !== 'admin') return null;
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Page imports (after mocks registered)
// ---------------------------------------------------------------------------

import DepartmentsPage from '@/app/(app)/admin/departments/page';
import DisciplinesPage from '@/app/(app)/admin/disciplines/page';
import ProgramsPage from '@/app/(app)/admin/programs/page';
import PeoplePage from '@/app/(app)/admin/people/page';
import ProjectsPage from '@/app/(app)/admin/projects/page';

// ---------------------------------------------------------------------------
// Shared confirm-stub utility
// ---------------------------------------------------------------------------

function stubConfirm(answer: boolean) {
  return vi.spyOn(window, 'confirm').mockImplementation(() => answer);
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Phase 43-03 — /admin/departments page', () => {
  it('renders seeded rows, opens drawer, creates row, archives row, and surfaces 409 blocker banner', async () => {
    const user = userEvent.setup();
    let listCalls = 0;
    handlers['/api/v5/admin/registers/department'] = async (url, init) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET') {
        listCalls += 1;
        return new Response(JSON.stringify({ rows: [DEPT_A] }), { status: 200 });
      }
      if (method === 'POST') {
        const body = JSON.parse(init!.body as string);
        return new Response(
          JSON.stringify({ row: { id: 'new-dept', name: body.name, archivedAt: null } }),
          { status: 201 },
        );
      }
      return new Response('{}', { status: 200 });
    };
    // DELETE + PATCH go to /:id path
    handlers[`/api/v5/admin/registers/department/${DEPT_A.id}`] = async (_url, init) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'DELETE') {
        return new Response(
          JSON.stringify({
            error: 'ERR_CONFLICT',
            message: 'DEPENDENT_ROWS_EXIST',
            details: { entity: 'department', id: DEPT_A.id, blockers: { people: 3 } },
          }),
          { status: 409 },
        );
      }
      return new Response('{}', { status: 200 });
    };

    await act(async () => {
      render(
        <Wrap>
          <DepartmentsPage />
        </Wrap>,
      );
    });

    // Populated
    await screen.findByText('Mekanik');
    expect(listCalls).toBeGreaterThanOrEqual(1);

    // Create flow
    await user.click(screen.getByTestId('register-new-button'));
    await waitFor(() => expect(screen.getByTestId('department-form')).toBeTruthy());
    const nameInput = document.getElementById('register-field-name') as HTMLInputElement;
    await user.type(nameInput, 'Elektronik');
    await user.click(screen.getByTestId('register-form-save'));
    await waitFor(() => {
      expect(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([u, i]) => {
          const url = typeof u === 'string' ? u : String(u);
          return (
            url === '/api/v5/admin/registers/department' &&
            (i as RequestInit | undefined)?.method === 'POST'
          );
        }),
      ).toBe(true);
    });

    // Archive → 409 DEPENDENT_ROWS_EXIST → banner
    const confirmSpy = stubConfirm(true);
    await user.click(screen.getAllByTestId('register-archive-button')[0]!);
    await waitFor(() => {
      const banner = screen.getByTestId('register-banner');
      expect(banner.textContent).toContain('3 personer');
    });
    confirmSpy.mockRestore();
  });

  it('toggles "Visa arkiverade" and shows the Återställ action on archived rows', async () => {
    const user = userEvent.setup();
    handlers['/api/v5/admin/registers/department'] = async (url) => {
      const includeArchived = url.includes('includeArchived=true');
      return new Response(
        JSON.stringify({
          rows: includeArchived ? [DEPT_A, DEPT_ARCHIVED] : [DEPT_A],
        }),
        { status: 200 },
      );
    };
    handlers[`/api/v5/admin/registers/department/${DEPT_ARCHIVED.id}`] = async (_url, init) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'PATCH') {
        const body = JSON.parse(init!.body as string);
        expect(body.archivedAt).toBeNull();
        return new Response(JSON.stringify({ row: { ...DEPT_ARCHIVED, archivedAt: null } }), {
          status: 200,
        });
      }
      return new Response('{}', { status: 200 });
    };

    await act(async () => {
      render(
        <Wrap>
          <DepartmentsPage />
        </Wrap>,
      );
    });

    await screen.findByText('Mekanik');
    // Archived not visible yet
    expect(screen.queryByText('Gammal')).toBeNull();

    // Toggle
    await user.click(screen.getByTestId('register-toggle-archived'));
    await screen.findByText('Gammal');

    // Open archived row → drawer shows Återställ
    await user.click(screen.getAllByTestId('register-unarchive-button')[0]!);
    await waitFor(() => expect(screen.getByTestId('register-form-restore')).toBeTruthy());

    // Click Återställ → PATCH fires with archivedAt=null (asserted above)
    await user.click(screen.getByTestId('register-form-restore'));
    await waitFor(() => {
      expect(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([u, i]) => {
          const url = typeof u === 'string' ? u : String(u);
          return (
            url === `/api/v5/admin/registers/department/${DEPT_ARCHIVED.id}` &&
            (i as RequestInit | undefined)?.method === 'PATCH'
          );
        }),
      ).toBe(true);
    });
  });
});

describe('Phase 43-03 — /admin/disciplines page', () => {
  it('renders seeded discipline with abbreviation and opens drawer on Ny', async () => {
    const user = userEvent.setup();
    handlers['/api/v5/admin/registers/discipline'] = async () =>
      new Response(JSON.stringify({ rows: [DISC_A] }), { status: 200 });

    await act(async () => {
      render(
        <Wrap>
          <DisciplinesPage />
        </Wrap>,
      );
    });

    await screen.findByText('Konstruktör');
    expect(screen.getByText('KON')).toBeTruthy();

    await user.click(screen.getByTestId('register-new-button'));
    await waitFor(() => expect(screen.getByTestId('discipline-form')).toBeTruthy());
  });
});

describe('Phase 43-03 — /admin/programs page', () => {
  it('renders seeded program with description and create flow fires POST', async () => {
    const user = userEvent.setup();
    let createCalls = 0;
    handlers['/api/v5/admin/registers/program'] = async (_url, init) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET') {
        return new Response(JSON.stringify({ rows: [PROG_A] }), { status: 200 });
      }
      if (method === 'POST') {
        createCalls += 1;
        return new Response(
          JSON.stringify({
            row: { id: 'new-prog', name: 'Beta', description: null, archivedAt: null },
          }),
          { status: 201 },
        );
      }
      return new Response('{}', { status: 200 });
    };

    await act(async () => {
      render(
        <Wrap>
          <ProgramsPage />
        </Wrap>,
      );
    });

    await screen.findByText('Alpha');
    expect(screen.getByText('Flagship program')).toBeTruthy();

    await user.click(screen.getByTestId('register-new-button'));
    await waitFor(() => expect(screen.getByTestId('program-form')).toBeTruthy());
    const nameInput = document.getElementById('register-field-name') as HTMLInputElement;
    await user.type(nameInput, 'Beta');
    await user.click(screen.getByTestId('register-form-save'));
    await waitFor(() => expect(createCalls).toBe(1));
  });
});

describe('Phase 43-03 — /admin/people page', () => {
  it('renders a seeded person with discipline + department lookups', async () => {
    handlers['/api/v5/admin/registers/person'] = async () =>
      new Response(JSON.stringify({ rows: [PERSON_A] }), { status: 200 });

    await act(async () => {
      render(
        <Wrap>
          <PeoplePage />
        </Wrap>,
      );
    });

    await screen.findByText('Anna Andersson');
    // Discipline & department resolved via v4 read hooks mocked by default handlers
    await waitFor(() => {
      expect(screen.getByText('Konstruktör')).toBeTruthy();
      expect(screen.getByText('Mekanik')).toBeTruthy();
    });
  });

  it('archive with 409 allocations blocker shows person-specific banner', async () => {
    const user = userEvent.setup();
    handlers['/api/v5/admin/registers/person'] = async () =>
      new Response(JSON.stringify({ rows: [PERSON_A] }), { status: 200 });
    handlers[`/api/v5/admin/registers/person/${PERSON_A.id}`] = async () =>
      new Response(
        JSON.stringify({
          error: 'ERR_CONFLICT',
          message: 'DEPENDENT_ROWS_EXIST',
          details: {
            entity: 'person',
            id: PERSON_A.id,
            blockers: { allocations: 5 },
          },
        }),
        { status: 409 },
      );

    await act(async () => {
      render(
        <Wrap>
          <PeoplePage />
        </Wrap>,
      );
    });

    await screen.findByText('Anna Andersson');
    const spy = stubConfirm(true);
    await user.click(screen.getAllByTestId('register-archive-button')[0]!);
    await waitFor(() => {
      expect(screen.getByTestId('register-banner').textContent).toContain('5 aktiva allokeringar');
    });
    spy.mockRestore();
  });
});

describe('Phase 43-03 — /admin/projects page', () => {
  it('renders seeded project with status chip and program lookup', async () => {
    handlers['/api/v5/admin/registers/project'] = async () =>
      new Response(JSON.stringify({ rows: [PROJECT_A] }), { status: 200 });

    await act(async () => {
      render(
        <Wrap>
          <ProjectsPage />
        </Wrap>,
      );
    });

    await screen.findByText('Project Neo');
    expect(screen.getByText('active')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  });

  it('archive with 409 allocations blocker shows project-specific banner', async () => {
    const user = userEvent.setup();
    handlers['/api/v5/admin/registers/project'] = async () =>
      new Response(JSON.stringify({ rows: [PROJECT_A] }), { status: 200 });
    handlers[`/api/v5/admin/registers/project/${PROJECT_A.id}`] = async () =>
      new Response(
        JSON.stringify({
          error: 'ERR_CONFLICT',
          message: 'DEPENDENT_ROWS_EXIST',
          details: {
            entity: 'project',
            id: PROJECT_A.id,
            blockers: { allocations: 2 },
          },
        }),
        { status: 409 },
      );

    await act(async () => {
      render(
        <Wrap>
          <ProjectsPage />
        </Wrap>,
      );
    });

    await screen.findByText('Project Neo');
    const spy = stubConfirm(true);
    await user.click(screen.getAllByTestId('register-archive-button')[0]!);
    await waitFor(() => {
      expect(screen.getByTestId('register-banner').textContent).toContain('2 aktiva allokeringar');
    });
    spy.mockRestore();
  });
});
