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
});
