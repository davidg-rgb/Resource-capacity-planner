/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 41 / Plan 41-02 Task 1 — TC-NEG-013
 *
 * PM persona mounted under <PersonaGate allowed={['line-manager']}> must
 * see the "switch persona" hint, not the gated children. Also covers the
 * pure assertPersonaOrRedirect helper.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { PersonaGate, assertPersonaOrRedirect } from '../persona-route-guard';
import { PersonaProvider, usePersona } from '../persona.context';
import type { Persona } from '../persona.types';

const messages = {
  v5: {
    lineManager: {
      wrongPersonaHint: 'Switch to the Line Manager persona to view this page.',
      switchPersonaCta: 'Switch persona',
      desktopOnlyMessage: 'Desktop only',
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
  const { setPersona, persona: active } = usePersona();
  useEffect(() => {
    if (active.kind !== persona.kind) setPersona(persona);
  }, [active.kind, persona, setPersona]);
  if (active.kind !== persona.kind) return null;
  return <>{children}</>;
}

describe('assertPersonaOrRedirect (pure)', () => {
  it('returns allowed:true when persona kind is in allowed list', () => {
    const persona: Persona = { kind: 'line-manager', departmentId: 'dept-1', displayName: 'LM' };
    expect(assertPersonaOrRedirect(persona, ['line-manager'])).toEqual({ allowed: true });
  });

  it('returns allowed:false when persona kind is not in allowed list', () => {
    const persona: Persona = { kind: 'pm', personId: 'p-1', displayName: 'PM' };
    expect(assertPersonaOrRedirect(persona, ['line-manager'])).toEqual({ allowed: false });
  });
});

describe('<PersonaGate /> — TC-NEG-013', () => {
  it('TC-NEG-013: PM persona on line-manager gate sees the hint, not the children', () => {
    const pmPersona: Persona = { kind: 'pm', personId: 'p-1', displayName: 'PM Per' };

    render(
      <Wrap>
        <SetPersona persona={pmPersona}>
          <PersonaGate allowed={['line-manager']}>
            <div data-testid="gated-content">HEATMAP</div>
          </PersonaGate>
        </SetPersona>
      </Wrap>,
    );

    expect(screen.queryByTestId('gated-content')).toBeNull();
    expect(screen.getByTestId('persona-gate-hint')).toBeTruthy();
    expect(screen.getByTestId('persona-gate-switch-cta')).toBeTruthy();
  });

  it('renders children when active persona matches allowed list', () => {
    const lmPersona: Persona = {
      kind: 'line-manager',
      departmentId: 'dept-A',
      displayName: 'LM Lisa',
    };

    render(
      <Wrap>
        <SetPersona persona={lmPersona}>
          <PersonaGate allowed={['line-manager']}>
            <div data-testid="gated-content">HEATMAP</div>
          </PersonaGate>
        </SetPersona>
      </Wrap>,
    );

    expect(screen.getByTestId('gated-content')).toBeTruthy();
    expect(screen.queryByTestId('persona-gate-hint')).toBeNull();
  });
});
