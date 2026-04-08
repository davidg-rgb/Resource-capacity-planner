// TC-NEG-013
// v5.0 — Phase 41 / Plan 41-05 Task 2: PM persona attempting /line-manager/*
// must see the wrongPersonaHint, not the LM home content.
//
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { PersonaGate } from '@/features/personas/persona-route-guard';
import { PersonaProvider, usePersona } from '@/features/personas/persona.context';
import type { Persona } from '@/features/personas/persona.types';

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
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
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

describe('TC-NEG-013 — PM persona attempting /line-manager/*', () => {
  it('TC-NEG-013: PM persona on line-manager-gated tree sees the switch-persona hint, not LM home', () => {
    const pmPersona: Persona = {
      kind: 'pm',
      personId: 'p-1',
      displayName: 'PM Per',
    };

    render(
      <Wrap>
        <SetPersona persona={pmPersona}>
          <PersonaGate allowed={['line-manager']}>
            <div data-testid="lm-home">Linjechef Home</div>
          </PersonaGate>
        </SetPersona>
      </Wrap>,
    );

    // LM home content is hidden
    expect(screen.queryByTestId('lm-home')).toBeNull();
    // Switch-persona hint is rendered (with i18n key fallback text)
    expect(screen.getByTestId('persona-gate-hint')).toBeTruthy();
    expect(screen.getByText('Switch to the Line Manager persona to view this page.')).toBeTruthy();
    // CTA button present
    expect(screen.getByTestId('persona-gate-switch-cta')).toBeTruthy();
  });
});
