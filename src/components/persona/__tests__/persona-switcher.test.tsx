/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';

import sv from '@/messages/sv.json';

import { PersonaProvider, usePersona } from '@/features/personas/persona.context';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Import AFTER vi.mock so the switcher picks up the mocked router.
import { PersonaSwitcher } from '../persona-switcher';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      <PersonaProvider>{children}</PersonaProvider>
    </NextIntlClientProvider>
  );
}

function ContextProbe() {
  const { persona } = usePersona();
  return <span data-testid="kind">{persona.kind}</span>;
}

describe('PersonaSwitcher', () => {
  beforeEach(() => {
    mockPush.mockReset();
    window.localStorage.clear();
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
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'pm');
    expect(mockPush).toHaveBeenCalledWith('/pm');
    expect(screen.getByTestId('kind').textContent).toBe('pm');
  });
});
