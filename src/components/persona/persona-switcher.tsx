'use client';

/**
 * Persona switcher (FOUND-V5-03).
 *
 * Header dropdown listing all 5 v5.0 personas. Selecting one calls
 * setPersona() and routes to that persona's landing page.
 *
 * Stub entity IDs ('stub-pm', 'stub-staff', 'stub-line-manager') are
 * placeholders until Phase 40+ ships real entity pickers. Downstream
 * services MUST NOT trust these IDs — they are UX scaffolding only.
 *
 * This file is INSIDE the v5 no-literals eslint guard scope. All
 * user-visible strings route through useTranslations('v5.persona').
 */

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { usePersona } from '@/features/personas/persona.context';
import { PERSONA_KINDS, getLandingRoute } from '@/features/personas/persona.routes';
import type { Persona, PersonaKind } from '@/features/personas/persona.types';

function buildStubPersona(kind: PersonaKind, label: string): Persona {
  switch (kind) {
    case 'pm':
      return { kind: 'pm', personId: 'stub-pm', displayName: label };
    case 'line-manager':
      return { kind: 'line-manager', departmentId: 'stub-line-manager', displayName: label };
    case 'staff':
      return { kind: 'staff', personId: 'stub-staff', displayName: label };
    case 'rd':
      return { kind: 'rd', displayName: label };
    case 'admin':
      return { kind: 'admin', displayName: label };
  }
}

export function PersonaSwitcher() {
  const t = useTranslations('v5.persona');
  const { persona, setPersona } = usePersona();
  const router = useRouter();

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const nextKind = e.target.value as PersonaKind;
    const label = t(`kind.${nextKind}`);
    const next = buildStubPersona(nextKind, label);
    setPersona(next);
    router.push(getLandingRoute(next));
  }

  return (
    <label className="text-on-surface-variant flex items-center gap-2 text-xs">
      <span className="hidden sm:inline">{t('label')}</span>
      <select
        aria-label={t('label')}
        value={persona.kind}
        onChange={handleChange}
        className="bg-surface-container-low text-on-surface rounded-sm px-2 py-1 text-xs"
      >
        {PERSONA_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {t(`kind.${kind}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
