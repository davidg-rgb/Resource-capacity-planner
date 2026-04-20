/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 41 / Plan 41-02 Task 1 — TC-NEG-013
 * Phase 49 — UNBREAK-06/09: PersonaGate hint uses v5.persona.kind.* for label
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
      wrongPersonaHint: {
        title: 'Wrong persona',
        description: 'Switch to the correct persona to view this page.',
        switchCta: 'Switch persona',
      },
      desktopOnlyMessage: 'Desktop only',
    },
    persona: {
      label: 'Roll',
      departmentLabel: 'Avdelning',
      noDepartmentHint: 'Admin måste koppla ditt användarkonto till en avdelning först',
      kind: {
        pm: 'Projektledare',
        'line-manager': 'Linjechef',
        staff: 'Medarbetare',
        rd: 'FoU-chef',
        admin: 'Administratör',
      },
    },
  },
};

function Wrap({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="sv" messages={messages}>
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

describe('<PersonaGate /> — UNBREAK-06/09 allowed-persona label', () => {
  it('shows Administratör label when allowed=[admin] and persona is pm', () => {
    const pmPersona: Persona = { kind: 'pm', personId: 'p-1', displayName: 'Projektledare' };

    render(
      <Wrap>
        <SetPersona persona={pmPersona}>
          <PersonaGate allowed={['admin']}>
            <div data-testid="gated-content">ADMIN PAGE</div>
          </PersonaGate>
        </SetPersona>
      </Wrap>,
    );

    expect(screen.queryByTestId('gated-content')).toBeNull();
    const hint = screen.getByTestId('persona-gate-hint');
    expect(hint.textContent).toContain('Administratör');
    expect(hint.textContent).not.toContain('linjechefs-personan');
  });

  it('shows Linjechef label when allowed=[line-manager] and persona is pm', () => {
    const pmPersona: Persona = { kind: 'pm', personId: 'p-1', displayName: 'Projektledare' };

    render(
      <Wrap>
        <SetPersona persona={pmPersona}>
          <PersonaGate allowed={['line-manager']}>
            <div data-testid="gated-content">LM PAGE</div>
          </PersonaGate>
        </SetPersona>
      </Wrap>,
    );

    const hint = screen.getByTestId('persona-gate-hint');
    expect(hint.textContent).toContain('Linjechef');
  });

  it('uses first allowed kind label when multiple allowed kinds', () => {
    const pmPersona: Persona = { kind: 'pm', personId: 'p-1', displayName: 'Projektledare' };

    render(
      <Wrap>
        <SetPersona persona={pmPersona}>
          <PersonaGate allowed={['rd', 'admin']}>
            <div data-testid="gated-content">RD/ADMIN PAGE</div>
          </PersonaGate>
        </SetPersona>
      </Wrap>,
    );

    const hint = screen.getByTestId('persona-gate-hint');
    expect(hint.textContent).toContain('FoU-chef');
  });

  it('renders children (persona-gate-allowed) when persona matches', () => {
    const pmPersona: Persona = { kind: 'pm', personId: 'p-1', displayName: 'Projektledare' };

    render(
      <Wrap>
        <SetPersona persona={pmPersona}>
          <PersonaGate allowed={['pm']}>
            <div data-testid="gated-content">PM PAGE</div>
          </PersonaGate>
        </SetPersona>
      </Wrap>,
    );

    expect(screen.getByTestId('persona-gate-allowed')).toBeTruthy();
    expect(screen.getByTestId('gated-content')).toBeTruthy();
  });

  it('still renders persona-gate-switch-cta button (regression)', () => {
    const pmPersona: Persona = { kind: 'pm', personId: 'p-1', displayName: 'Projektledare' };

    render(
      <Wrap>
        <SetPersona persona={pmPersona}>
          <PersonaGate allowed={['admin']}>
            <div>ADMIN</div>
          </PersonaGate>
        </SetPersona>
      </Wrap>,
    );

    expect(screen.getByTestId('persona-gate-hint')).toBeTruthy();
    expect(screen.getByTestId('persona-gate-switch-cta')).toBeTruthy();
  });
});
