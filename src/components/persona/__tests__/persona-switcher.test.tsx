/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import sv from '@/messages/sv.json';

import { PersonaProvider, usePersona } from '@/features/personas/persona.context';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Import AFTER vi.mock so the switcher picks up the mocked router.
import { PersonaSwitcher } from '../persona-switcher';

// Plan 40-03 added useQueryClient() to PersonaProvider (D-20). The switcher's
// tests must therefore be wrapped in a QueryClientProvider (Rule 1 fix —
// pre-existing tests broke silently until Plan 40-05 forced a full rerun).
function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      <QueryClientProvider client={qc}>
        <PersonaProvider>{children}</PersonaProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}

function ContextProbe() {
  const { persona } = usePersona();
  return <span data-testid="kind">{persona.kind}</span>;
}

describe('PersonaSwitcher', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    mockPush.mockReset();
    window.localStorage.clear();
    // Phase 40: persona-switcher now loads real people via GET /api/people.
    // Stub a single-person response so handleKindChange has a defaultPersonId
    // and can finalize the 'pm'/'staff' persona build.
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.startsWith('/api/people')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            people: [{ id: 'p-anna', firstName: 'Anna', lastName: 'PM' }],
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('TC-PSN-005: dropdown lists all 5 persona kinds', () => {
    render(
      <Wrapper>
        <PersonaSwitcher />
      </Wrapper>,
    );
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(['pm', 'line-manager', 'staff', 'rd', 'admin']);
  });

  it('TC-PSN-006: selecting a persona calls setPersona AND router.push(landingRoute)', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <PersonaSwitcher />
        <ContextProbe />
      </Wrapper>,
    );
    // Wait for the /api/people query to resolve so handleKindChange has a
    // defaultPersonId to attach to the built Persona.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const selects = screen.getAllByRole('combobox');
    // First combobox is the kind picker.
    await user.selectOptions(selects[0], 'pm');
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/pm'));
    expect(screen.getByTestId('kind').textContent).toBe('pm');
  });

  describe('department sub-picker (UNBREAK-01/02/08)', () => {
    it('shows department dropdown when >1 departments and persona is line-manager', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({ people: [{ id: 'p1', firstName: 'A', lastName: 'B' }] }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'a', name: 'Konstruktion' }, { id: 'b', name: 'Elteknik' }] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(
        <Wrapper>
          <PersonaSwitcher />
          <ContextProbe />
        </Wrapper>,
      );

      // Switch to line-manager
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const kindSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(kindSelect, 'line-manager');
      await waitFor(() => expect(screen.getByTestId('kind').textContent).toBe('line-manager'));

      // Wait for departments to load and department picker to appear
      await waitFor(() => {
        const deptSelect = screen.getByTestId('persona-switcher-department');
        expect(deptSelect).toBeTruthy();
        const options = Array.from(deptSelect.querySelectorAll('option'));
        expect(options).toHaveLength(2);
        expect(options[0].textContent).toBe('Konstruktion');
        expect(options[1].textContent).toBe('Elteknik');
      });
    });

    it('auto-selects when exactly 1 department', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({ people: [{ id: 'p1', firstName: 'A', lastName: 'B' }] }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'a', name: 'Konstruktion' }] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(
        <Wrapper>
          <PersonaSwitcher />
          <ContextProbe />
        </Wrapper>,
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const kindSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(kindSelect, 'line-manager');
      await waitFor(() => expect(screen.getByTestId('kind').textContent).toBe('line-manager'));

      // With 1 department, auto-select should fire - the department picker should show with the single dept selected
      await waitFor(() => {
        const deptSelect = screen.getByTestId('persona-switcher-department');
        expect(deptSelect).toBeTruthy();
        expect((deptSelect as HTMLSelectElement).value).toBe('a');
      });
    });

    it('shows no-department hint when 0 departments', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({ people: [{ id: 'p1', firstName: 'A', lastName: 'B' }] }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(
        <Wrapper>
          <PersonaSwitcher />
          <ContextProbe />
        </Wrapper>,
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      // With 0 departments, the line-manager option should be disabled
      await waitFor(() => {
        const kindSelect = screen.getAllByRole('combobox')[0];
        const lmOption = kindSelect.querySelector('option[value="line-manager"]') as HTMLOptionElement;
        expect(lmOption.disabled).toBe(true);
      });
    });

    it('persists department selection in localStorage', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({ people: [{ id: 'p1', firstName: 'A', lastName: 'B' }] }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'a', name: 'Konstruktion' }, { id: 'b', name: 'Elteknik' }] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(
        <Wrapper>
          <PersonaSwitcher />
          <ContextProbe />
        </Wrapper>,
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const kindSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(kindSelect, 'line-manager');
      await waitFor(() => expect(screen.getByTestId('kind').textContent).toBe('line-manager'));

      // Wait for department picker, then select 'b'
      await waitFor(() => expect(screen.getByTestId('persona-switcher-department')).toBeTruthy());
      const deptSelect = screen.getByTestId('persona-switcher-department');
      await user.selectOptions(deptSelect, 'b');

      await waitFor(() => {
        expect(window.localStorage.getItem('persona.line-manager.departmentId')).toBe('b');
      });
    });
  });
});
