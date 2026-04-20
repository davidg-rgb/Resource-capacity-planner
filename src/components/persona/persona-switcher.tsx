'use client';

/**
 * Persona switcher (FOUND-V5-03 + Phase 40 D-19/D-20).
 *
 * Header dropdown listing all 5 v5.0 personas. Selecting one calls
 * setPersona() and routes to that persona's landing page.
 *
 * Phase 40 replaces the old hardcoded placeholder entity IDs from the
 * Phase 34 scaffold with a real person picker backed by GET /api/people. When the user
 * selects the PM or Staff persona, a second dropdown appears listing the
 * real people in the authenticated tenant's org; their UUID is plumbed
 * through as `persona.personId` and consumed by downstream queries
 * (e.g. `/api/v5/planning/pm-home?personId=...`).
 *
 * This file is INSIDE the v5 no-literals eslint guard scope. All
 * user-visible strings route through useTranslations('v5.persona').
 */

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';

import { usePersona } from '@/features/personas/persona.context';
import { PERSONA_KINDS, getLandingRoute } from '@/features/personas/persona.routes';
import type { Persona, PersonaKind } from '@/features/personas/persona.types';

interface PersonRowLite {
  id: string;
  firstName: string;
  lastName: string;
}

interface PeopleResponse {
  people: PersonRowLite[];
}

async function fetchPeople(): Promise<PersonRowLite[]> {
  const res = await fetch('/api/people');
  if (!res.ok) return [];
  const json = (await res.json()) as PeopleResponse;
  return json.people ?? [];
}

function buildPersona(kind: PersonaKind, label: string, personId: string | null): Persona | null {
  switch (kind) {
    case 'pm':
      if (!personId) return null;
      return { kind: 'pm', personId, displayName: label };
    case 'staff':
      if (!personId) return null;
      return { kind: 'staff', personId, displayName: label };
    case 'line-manager':
      // Department picker lands in Phase 41; keep a harmless placeholder
      // identifier (NOT 'stub-*') so downstream queries stay disabled until
      // the Phase 41 picker lands.
      return { kind: 'line-manager', departmentId: '', displayName: label };
    case 'rd':
      return { kind: 'rd', displayName: label };
    case 'admin':
      return { kind: 'admin', displayName: label };
  }
}

function currentPersonId(persona: Persona): string | null {
  if (persona.kind === 'pm' || persona.kind === 'staff') return persona.personId;
  return null;
}

export function PersonaSwitcher() {
  const t = useTranslations('v5.persona');
  const { persona, setPersona } = usePersona();
  const router = useRouter();

  const needsPerson = persona.kind === 'pm' || persona.kind === 'staff';

  const { data: people = [] } = useQuery({
    queryKey: ['personas-people-picker'],
    queryFn: fetchPeople,
    staleTime: 60_000,
  });

  function handleKindChange(e: ChangeEvent<HTMLSelectElement>) {
    const nextKind = e.target.value as PersonaKind;
    const label = t(`kind.${nextKind}`);
    // Preserve the currently-selected person if any, else default to first.
    const preservedPersonId = currentPersonId(persona);
    const defaultPersonId = preservedPersonId ?? people[0]?.id ?? null;
    const next = buildPersona(nextKind, label, defaultPersonId);
    if (!next) return; // waiting for people to load
    setPersona(next);
    router.push(getLandingRoute(next));
  }

  function handlePersonChange(e: ChangeEvent<HTMLSelectElement>) {
    const nextPersonId = e.target.value;
    const label = t(`kind.${persona.kind}`);
    const next = buildPersona(persona.kind, label, nextPersonId);
    if (!next) return;
    setPersona(next);
  }

  const selectedPersonId = currentPersonId(persona) ?? '';

  return (
    <div className="text-on-surface-variant flex items-center gap-2 text-xs">
      <label className="flex items-center gap-2">
        <span className="hidden sm:inline">{t('label')}</span>
        <select
          aria-label={t('label')}
          value={persona.kind}
          onChange={handleKindChange}
          className="bg-surface-container-low text-on-surface rounded-sm px-2 py-1 text-xs"
        >
          {PERSONA_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`kind.${kind}`)}
            </option>
          ))}
        </select>
      </label>
      {needsPerson && people.length > 0 && (
        <select
          aria-label={t('kind.pm')}
          value={selectedPersonId}
          onChange={handlePersonChange}
          className="bg-surface-container-low text-on-surface max-w-[12rem] rounded-sm px-2 py-1 text-xs"
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {`${p.firstName} ${p.lastName}`.trim()}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
