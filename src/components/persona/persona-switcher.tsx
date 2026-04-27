'use client';

/**
 * Persona switcher (FOUND-V5-03 + Phase 40 D-19/D-20 + Phase 49 UNBREAK-01/02/08 + Phase 50 NAV-04
 * + Phase 52-04 LM-01 / D-06 + Phase 52 WR-05).
 *
 * Phase 50: When uiV6Landing flag is ON, renders a single grouped `<select>`
 * with `<optgroup>` per PersonaKind. Composite value pattern encodes
 * `kind:entityId` for each option. When flag is OFF, renders the legacy
 * two-select approach (persona kind + person/department picker).
 *
 * Phase 52-04 (LM-01 / D-06): in legacy mode, suffix the LM <option> label
 * with `(N)` when the active persona is line-manager, the uiV6PerJourney
 * flag is ON, and the queue count > 0. Hook is called at component root per
 * React rules; `enabled` is false when persona isn't LM.
 *
 * Phase 52 WR-05: `handleKindChange` reverts the <select> DOM value to the
 * currently-active persona kind when `buildPersona()` returns null (PM/Staff
 * selected before /api/people resolves). Previously it returned silently and
 * the dropdown lied about the selected kind.
 *
 * This file is INSIDE the v5 no-literals eslint guard scope. All
 * user-visible strings route through useTranslations('v5.persona').
 */

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';

import { usePersona } from '@/features/personas/persona.context';
import { PERSONA_KINDS, getLandingRoute } from '@/features/personas/persona.routes';
import type { Persona, PersonaKind } from '@/features/personas/persona.types';
import { useFlags } from '@/features/flags/flag.context';
import { useLmQueueCount } from '@/features/proposals/use-lm-queue-count';

const LM_DEPT_STORAGE_KEY = 'persona.line-manager.departmentId';
const PM_PERSON_STORAGE_KEY = 'persona.pm.personId';
const STAFF_PERSON_STORAGE_KEY = 'persona.staff.personId';

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

function buildPersona(
  kind: PersonaKind,
  label: string,
  personId: string | null,
  departmentId: string | null,
): Persona | null {
  switch (kind) {
    case 'pm':
      if (!personId) return null;
      return { kind: 'pm', personId, displayName: label };
    case 'staff':
      if (!personId) return null;
      return { kind: 'staff', personId, displayName: label };
    case 'line-manager':
      if (!departmentId) return null;
      return { kind: 'line-manager', departmentId, displayName: label };
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

// ── Grouped Select (v6 landing) ─────────────────────────────────────────

function getCompositeValue(p: Persona): string {
  switch (p.kind) {
    case 'pm':
      return `pm:${p.personId}`;
    case 'staff':
      return `staff:${p.personId}`;
    case 'line-manager':
      return `line-manager:${p.departmentId}`;
    case 'rd':
      return 'rd:';
    case 'admin':
      return 'admin:';
  }
}

function GroupedPersonaSwitcher() {
  const t = useTranslations('v5.persona');
  const { persona, setPersona, departments } = usePersona();
  const router = useRouter();

  const { data: people = [] } = useQuery({
    queryKey: ['personas-people-picker'],
    queryFn: fetchPeople,
    staleTime: 60_000,
  });

  const hasPeople = people.length > 0;
  const hasDepts = departments.length > 0;
  const compositeValue = getCompositeValue(persona);

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const colonIdx = val.indexOf(':');
    const kind = val.slice(0, colonIdx) as PersonaKind;
    const entityId = val.slice(colonIdx + 1);
    const label = t(`kind.${kind}`);

    let next: Persona | null = null;
    switch (kind) {
      case 'pm':
        if (!entityId) return;
        next = { kind: 'pm', personId: entityId, displayName: label };
        try {
          localStorage.setItem(PM_PERSON_STORAGE_KEY, entityId);
        } catch {
          /* ignore */
        }
        break;
      case 'staff':
        if (!entityId) return;
        next = { kind: 'staff', personId: entityId, displayName: label };
        try {
          localStorage.setItem(STAFF_PERSON_STORAGE_KEY, entityId);
        } catch {
          /* ignore */
        }
        break;
      case 'line-manager':
        if (!entityId) return;
        next = { kind: 'line-manager', departmentId: entityId, displayName: label };
        try {
          localStorage.setItem(LM_DEPT_STORAGE_KEY, entityId);
        } catch {
          /* ignore */
        }
        break;
      case 'rd':
        next = { kind: 'rd', displayName: label };
        break;
      case 'admin':
        next = { kind: 'admin', displayName: label };
        break;
    }
    if (!next) return;
    setPersona(next);
    router.push(getLandingRoute(next));
  }

  return (
    <div className="text-on-surface-variant flex items-center gap-2 text-xs">
      <label className="flex items-center gap-2">
        <span className="hidden sm:inline">{t('label')}</span>
        <select
          aria-label={t('label')}
          value={compositeValue}
          onChange={handleChange}
          className="bg-surface-container-low text-on-surface rounded-sm px-2 py-1 text-xs"
        >
          <optgroup label={t('kind.pm')} disabled={!hasPeople}>
            {hasPeople ? (
              people.map((p) => (
                <option key={`pm:${p.id}`} value={`pm:${p.id}`}>
                  {`${p.firstName} ${p.lastName}`.trim()}
                </option>
              ))
            ) : (
              <option disabled value="">
                {t('noPersonMatch')}
              </option>
            )}
          </optgroup>
          <optgroup label={t('kind.line-manager')} disabled={!hasDepts}>
            {hasDepts ? (
              departments.map((d) => (
                <option key={`lm:${d.id}`} value={`line-manager:${d.id}`}>
                  {d.name}
                </option>
              ))
            ) : (
              <option disabled value="">
                {t('noDepartmentHint')}
              </option>
            )}
          </optgroup>
          <optgroup label={t('kind.staff')} disabled={!hasPeople}>
            {hasPeople ? (
              people.map((p) => (
                <option key={`staff:${p.id}`} value={`staff:${p.id}`}>
                  {`${p.firstName} ${p.lastName}`.trim()}
                </option>
              ))
            ) : (
              <option disabled value="">
                {t('noPersonMatch')}
              </option>
            )}
          </optgroup>
          <optgroup label={t('kind.rd')}>
            <option value="rd:">{t('kind.rd')}</option>
          </optgroup>
          <optgroup label={t('kind.admin')}>
            <option value="admin:">{t('kind.admin')}</option>
          </optgroup>
        </select>
      </label>
    </div>
  );
}

// ── Legacy Two-Select (flag off) ────────────────────────────────────────

function LegacyPersonaSwitcher() {
  const t = useTranslations('v5.persona');
  const { persona, setPersona, departments } = usePersona();
  const router = useRouter();
  const flags = useFlags();

  const needsPerson = persona.kind === 'pm' || persona.kind === 'staff';
  const isLM = persona.kind === 'line-manager';

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

  // LM department state initialised from localStorage (SSR-safe via lazy initializer)
  const [lmDeptId, setLmDeptId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(LM_DEPT_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });

  // Auto-select when exactly 1 department, reset if stored ID no longer valid
  const effectiveLmDeptId = useMemo(() => {
    if (!isLM) return lmDeptId;
    if (departments.length === 1) return departments[0].id;
    if (lmDeptId && !departments.some((d) => d.id === lmDeptId)) return departments[0]?.id ?? '';
    return lmDeptId;
  }, [isLM, departments, lmDeptId]);

  // Propagate effectiveLmDeptId into persona + write to localStorage
  useEffect(() => {
    if (!isLM || !effectiveLmDeptId) return;
    if (persona.kind === 'line-manager' && persona.departmentId !== effectiveLmDeptId) {
      setPersona({
        kind: 'line-manager',
        departmentId: effectiveLmDeptId,
        displayName: persona.displayName,
      });
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LM_DEPT_STORAGE_KEY, effectiveLmDeptId);
        } catch {
          /* ignore quota */
        }
      }
    }
  }, [isLM, effectiveLmDeptId, persona, setPersona]);

  function handleKindChange(e: ChangeEvent<HTMLSelectElement>) {
    const nextKind = e.target.value as PersonaKind;
    const label = t(`kind.${nextKind}`);
    const preservedPersonId = currentPersonId(persona);
    const defaultPersonId = preservedPersonId ?? people[0]?.id ?? null;
    const defaultDeptId =
      nextKind === 'line-manager' ? effectiveLmDeptId || departments[0]?.id || null : null;
    const next = buildPersona(nextKind, label, defaultPersonId, defaultDeptId);
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
    const next = buildPersona(persona.kind, label, nextPersonId, null);
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
              <option
                key={kind}
                value={kind}
                disabled={kind === 'line-manager' && departments.length === 0}
              >
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
      {isLM && departments.length > 0 && (
        <select
          aria-label={t('departmentLabel')}
          value={effectiveLmDeptId}
          onChange={(e) => setLmDeptId(e.target.value)}
          className="bg-surface-container-low text-on-surface max-w-[12rem] rounded-sm px-2 py-1 text-xs"
          data-testid="persona-switcher-department"
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      )}
      {isLM && departments.length === 0 && (
        <span
          className="text-error text-xs"
          title={t('noDepartmentHint')}
          data-testid="persona-switcher-no-department"
        >
          {t('noDepartmentHint')}
        </span>
      )}
    </div>
  );
}

// ── Exported switcher ───────────────────────────────────────────────────

export function PersonaSwitcher() {
  const flags = useFlags();

  if (flags.uiV6Landing) {
    return <GroupedPersonaSwitcher />;
  }

  return <LegacyPersonaSwitcher />;
}
