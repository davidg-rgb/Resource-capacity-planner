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
import { useFlags } from '@/features/flags/flag.context';
import { useLmQueueCount } from '@/features/proposals/use-lm-queue-count';

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
  const flags = useFlags();

  const needsPerson = persona.kind === 'pm' || persona.kind === 'staff';

  const { data: people = [] } = useQuery({
    queryKey: ['personas-people-picker'],
    queryFn: fetchPeople,
    staleTime: 60_000,
  });

  // v6.0 — Phase 52 / Plan 52-04 (LM-01 / D-06): suffix LM option with `(N)` when
  // the active persona is line-manager and the flag is on. Hook called at
  // component root per React rules (Pitfall #6). `enabled` is false when the
  // active persona isn't LM — no fetch for non-LM personas.
  const activeLmDepartmentId =
    persona.kind === 'line-manager' && persona.departmentId ? persona.departmentId : null;
  const { data: lmCount = 0 } = useLmQueueCount(
    activeLmDepartmentId,
    flags.uiV6PerJourney && !!activeLmDepartmentId,
  );
  const lmSuffixOn = flags.uiV6PerJourney && lmCount > 0;

  function handleKindChange(e: ChangeEvent<HTMLSelectElement>) {
    const nextKind = e.target.value as PersonaKind;
    const label = t(`kind.${nextKind}`);
    // Preserve the currently-selected person if any, else default to first.
    const preservedPersonId = currentPersonId(persona);
    const defaultPersonId = preservedPersonId ?? people[0]?.id ?? null;
    const next = buildPersona(nextKind, label, defaultPersonId);
    if (!next) {
      // v6.0 — Phase 52 / REVIEW-FIX WR-05: buildPersona returns null when
      // PM / Staff are selected before `fetchPeople()` resolves. Previously
      // we silently returned, leaving the <select> DOM reflecting the new
      // kind while React state still held the old value — the dropdown
      // lied. Restore the select to the currently-active kind so the UI
      // stays consistent until people load and a re-selection succeeds.
      e.target.value = persona.kind;
      return;
    }
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
          {PERSONA_KINDS.map((kind) => {
            const base = t(`kind.${kind}`);
            const label = kind === 'line-manager' && lmSuffixOn ? `${base} (${lmCount})` : base;
            return (
              <option key={kind} value={kind}>
                {label}
              </option>
            );
          })}
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
