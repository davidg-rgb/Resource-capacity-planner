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

// Mock useFlags so we can toggle uiV6Landing per test
const mockFlags = vi.fn();
vi.mock('@/features/flags/flag.context', () => ({
  useFlags: () => mockFlags(),
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
    // Default: flag OFF (legacy mode)
    mockFlags.mockReturnValue({
      dashboards: false,
      pdfExport: false,
      alerts: false,
      onboarding: false,
      scenarios: false,
      uiV6Landing: false,
    });
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

  // ── Legacy mode (uiV6Landing OFF) ─────────────────────────────────────
  describe('legacy mode (uiV6Landing OFF)', () => {
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
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
      const selects = screen.getAllByRole('combobox');
      await user.selectOptions(selects[0], 'pm');
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/pm'));
      expect(screen.getByTestId('kind').textContent).toBe('pm');
    });

    it('TC-PSN-010: renders old two-select approach when flag off', async () => {
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
        </Wrapper>,
      );

      // Legacy mode: should NOT have optgroups
      const select = screen.getByRole('combobox');
      const optgroups = select.querySelectorAll('optgroup');
      expect(optgroups).toHaveLength(0);
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

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        const kindSelect = screen.getAllByRole('combobox')[0];
        await user.selectOptions(kindSelect, 'line-manager');
        await waitFor(() => expect(screen.getByTestId('kind').textContent).toBe('line-manager'));

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

        await waitFor(() => expect(screen.getByTestId('persona-switcher-department')).toBeTruthy());
        const deptSelect = screen.getByTestId('persona-switcher-department');
        await user.selectOptions(deptSelect, 'b');

        await waitFor(() => {
          expect(window.localStorage.getItem('persona.line-manager.departmentId')).toBe('b');
        });
      });
    });
  });

  // ── Grouped select mode (uiV6Landing ON) ──────────────────────────────
  describe('grouped select mode (uiV6Landing ON)', () => {
    beforeEach(() => {
      mockFlags.mockReturnValue({
        dashboards: false,
        pdfExport: false,
        alerts: false,
        onboarding: false,
        scenarios: false,
        uiV6Landing: true,
      });
    });

    it('Test 1: renders a single select with 5 optgroup elements', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({ people: [{ id: 'p1', firstName: 'Anna', lastName: 'PM' }] }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'd1', name: 'Konstruktion' }] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(
        <Wrapper>
          <PersonaSwitcher />
        </Wrapper>,
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const select = screen.getByRole('combobox');
      const optgroups = select.querySelectorAll('optgroup');
      expect(optgroups).toHaveLength(5);

      // Verify only ONE select, not two
      const allSelects = screen.getAllByRole('combobox');
      expect(allSelects).toHaveLength(1);
    });

    it('Test 2: PM optgroup contains person options; Staff optgroup contains same person options', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({
            people: [
              { id: 'p1', firstName: 'Anna', lastName: 'PM' },
              { id: 'p2', firstName: 'Erik', lastName: 'Staff' },
            ],
          }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'd1', name: 'Konstruktion' }] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(
        <Wrapper>
          <PersonaSwitcher />
        </Wrapper>,
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const select = screen.getByRole('combobox');
      const optgroups = select.querySelectorAll('optgroup');

      // PM optgroup (first)
      const pmGroup = optgroups[0];
      expect(pmGroup.getAttribute('label')).toBe('Projektledare');
      const pmOptions = pmGroup.querySelectorAll('option');
      expect(pmOptions).toHaveLength(2);
      expect(pmOptions[0].value).toBe('pm:p1');
      expect(pmOptions[1].value).toBe('pm:p2');

      // Staff optgroup (third)
      const staffGroup = optgroups[2];
      expect(staffGroup.getAttribute('label')).toBe('Medarbetare');
      const staffOptions = staffGroup.querySelectorAll('option');
      expect(staffOptions).toHaveLength(2);
      expect(staffOptions[0].value).toBe('staff:p1');
      expect(staffOptions[1].value).toBe('staff:p2');
    });

    it('Test 3: LM optgroup contains department options', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({ people: [{ id: 'p1', firstName: 'A', lastName: 'B' }] }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'd1', name: 'Konstruktion' }, { id: 'd2', name: 'Elteknik' }] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(
        <Wrapper>
          <PersonaSwitcher />
        </Wrapper>,
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const select = screen.getByRole('combobox');
      const optgroups = select.querySelectorAll('optgroup');
      // LM optgroup (second)
      const lmGroup = optgroups[1];
      expect(lmGroup.getAttribute('label')).toBe('Linjechef');
      const lmOptions = lmGroup.querySelectorAll('option');
      expect(lmOptions).toHaveLength(2);
      expect(lmOptions[0].value).toBe('line-manager:d1');
      expect(lmOptions[0].textContent).toBe('Konstruktion');
      expect(lmOptions[1].value).toBe('line-manager:d2');
      expect(lmOptions[1].textContent).toBe('Elteknik');
    });

    it('Test 4: R&D optgroup has single option; Admin optgroup has single option', async () => {
      render(
        <Wrapper>
          <PersonaSwitcher />
        </Wrapper>,
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const select = screen.getByRole('combobox');
      const optgroups = select.querySelectorAll('optgroup');

      // R&D optgroup (fourth)
      const rdGroup = optgroups[3];
      expect(rdGroup.getAttribute('label')).toBe('FoU-chef');
      const rdOptions = rdGroup.querySelectorAll('option:not([disabled])');
      expect(rdOptions).toHaveLength(1);
      expect((rdOptions[0] as HTMLOptionElement).value).toBe('rd:');

      // Admin optgroup (fifth)
      const adminGroup = optgroups[4];
      expect(adminGroup.getAttribute('label')).toBe('Administratör');
      const adminOptions = adminGroup.querySelectorAll('option:not([disabled])');
      expect(adminOptions).toHaveLength(1);
      expect((adminOptions[0] as HTMLOptionElement).value).toBe('admin:');
    });

    it('Test 5: PM and Staff optgroups disabled when 0 people returned', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({ people: [] }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'd1', name: 'Konstruktion' }] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(
        <Wrapper>
          <PersonaSwitcher />
        </Wrapper>,
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const select = screen.getByRole('combobox');
      const optgroups = select.querySelectorAll('optgroup');

      // PM and Staff optgroups should be disabled
      expect(optgroups[0].disabled).toBe(true); // PM
      expect(optgroups[2].disabled).toBe(true); // Staff
    });

    it('Test 6: auto-selects PM when exactly 1 person returned (select value is pm:{personId})', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({ people: [{ id: 'p-solo', firstName: 'Solo', lastName: 'PM' }] }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'd1', name: 'Konstruktion' }] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      // Start with PM persona but no personId yet — will be defaulted to admin on initial load
      // The auto-select effect should pick the single person
      render(
        <Wrapper>
          <PersonaSwitcher />
        </Wrapper>,
      );

      // The select should show pm:p-solo as the available PM option
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        const pmGroup = select.querySelectorAll('optgroup')[0];
        const pmOptions = pmGroup.querySelectorAll('option');
        expect(pmOptions).toHaveLength(1);
        expect(pmOptions[0].value).toBe('pm:p-solo');
      });
    });

    it('Test 7: when >1 people, last selected person persisted to localStorage', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({
            people: [
              { id: 'p1', firstName: 'Anna', lastName: 'PM' },
              { id: 'p2', firstName: 'Erik', lastName: 'Staff' },
            ],
          }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'd1', name: 'Konstruktion' }] }) };
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

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'pm:p2');

      await waitFor(() => {
        expect(window.localStorage.getItem('persona.pm.personId')).toBe('p2');
      });
    });

    it('Test 8: selecting an option calls setPersona + router.push(getLandingRoute)', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({
            people: [{ id: 'p1', firstName: 'Anna', lastName: 'PM' }],
          }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'd1', name: 'Konstruktion' }] }) };
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

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'pm:p1');

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pm');
        expect(screen.getByTestId('kind').textContent).toBe('pm');
      });
    });

    it('Test 9: LM department auto-select when 1 dept — preserved from Phase 49 logic', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.startsWith('/api/people')) {
          return { ok: true, status: 200, json: async () => ({ people: [{ id: 'p1', firstName: 'A', lastName: 'B' }] }) };
        }
        if (typeof url === 'string' && url.startsWith('/api/departments')) {
          return { ok: true, status: 200, json: async () => ({ departments: [{ id: 'd-solo', name: 'Konstruktion' }] }) };
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

      // Select line-manager
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'line-manager:d-solo');

      await waitFor(() => {
        expect(screen.getByTestId('kind').textContent).toBe('line-manager');
        expect(mockPush).toHaveBeenCalledWith('/line-manager');
      });

      // localStorage should have the department
      await waitFor(() => {
        expect(window.localStorage.getItem('persona.line-manager.departmentId')).toBe('d-solo');
      });
    });
  });
});
