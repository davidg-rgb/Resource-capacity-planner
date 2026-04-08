// v5.0 — Phase 41 / Plan 41-02 Task 1 (D-03, TC-NEG-013):
// Client-side persona route guard. UX shortcut only — NOT a security
// boundary (ADR-004). The API still authorizes by org membership.
//
// assertPersonaOrRedirect(persona, allowed[]) → pure decision function.
// PersonaGate → React wrapper that renders children for allowed personas
// or a centered "switch persona" hint for mismatched personas.

'use client';

import { createElement, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import type { Persona, PersonaKind } from './persona.types';
import { usePersona } from './persona.context';

export type PersonaGuardResult = { allowed: true } | { allowed: false };

/** Pure guard — no React, safe to call from non-component contexts. */
export function assertPersonaOrRedirect(
  persona: Persona,
  allowed: readonly PersonaKind[],
): PersonaGuardResult {
  return allowed.includes(persona.kind) ? { allowed: true } : { allowed: false };
}

export interface PersonaGateProps {
  allowed: readonly PersonaKind[];
  children: ReactNode;
}

/**
 * Client component gate. Reads active persona from context; renders
 * children when allowed, otherwise a centered hint card with a
 * "switch persona" CTA. TC-NEG-013: PM persona on /line-manager/* sees
 * the hint, not the heatmap.
 */
export function PersonaGate({ allowed, children }: PersonaGateProps) {
  const { persona } = usePersona();
  const result = assertPersonaOrRedirect(persona, allowed);
  const t = useTranslations('v5.lineManager');

  if (result.allowed) {
    return createElement('div', { 'data-testid': 'persona-gate-allowed' }, children);
  }

  return createElement(
    'div',
    {
      'data-testid': 'persona-gate-hint',
      className: 'flex min-h-[40vh] items-center justify-center p-8',
    },
    createElement(
      'div',
      {
        className:
          'border-outline-variant/40 bg-surface-container-low max-w-md rounded-md border p-6 text-center',
      },
      createElement(
        'p',
        { className: 'text-on-surface text-sm' },
        // i18n key lands in Wave 4; fallback text used if missing.
        safeT(t, 'wrongPersonaHint', 'Switch to the Line Manager persona to view this page.'),
      ),
      createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'persona-gate-switch-cta',
          className:
            'bg-primary text-on-primary mt-4 inline-flex items-center rounded-sm px-3 py-1.5 text-sm',
          onClick: () => {
            // Opening the persona switcher is handled by the top-nav component;
            // here we just dispatch a custom event so the switcher can react.
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('nc:open-persona-switcher'));
            }
          },
        },
        safeT(t, 'switchPersonaCta', 'Switch persona'),
      ),
    ),
  );
}

/** useTranslations throws on missing keys; fall back gracefully for Wave 2. */
function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
  try {
    const value = t(key);
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}
