'use client';

/**
 * PersonaProvider + usePersona hook (FOUND-V5-03).
 *
 * - Default on empty/corrupt localStorage: admin (ARCHITECTURE §6.12).
 * - Persists under key 'nc:persona'.
 * - SSR-safe: server renders default; useEffect hydrates from localStorage.
 *   Brief flash of admin UI before hydration is acceptable per ADR-004
 *   (personas are UX shortcuts, not security boundaries).
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { DEFAULT_PERSONA, type Persona } from './persona.types';
import { PERSONA_KINDS } from './persona.routes';

/**
 * Query-key prefixes that are persona-scoped and must be invalidated when
 * the active persona changes. Listed explicitly so new persona-scoped keys
 * added in later phases have a single source of truth.
 * Phase 40 (D-20): persona change invalidates pm-* keys.
 */
const PERSONA_SCOPED_QUERY_KEYS: readonly string[] = [
  'pm-home',
  'pm-timeline',
  'line-manager-heatmap',
  'line-manager-timeline',
  'staff-schedule',
  'rd-portfolio',
];

const STORAGE_KEY = 'nc:persona';

interface PersonaContextValue {
  persona: Persona;
  setPersona: (next: Persona) => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona>(DEFAULT_PERSONA);
  const queryClient = useQueryClient();

  // Hydrate from localStorage on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Persona> | null;
      if (
        parsed &&
        typeof parsed.kind === 'string' &&
        (PERSONA_KINDS as readonly string[]).includes(parsed.kind)
      ) {
        // Legitimate one-shot hydration from browser-only storage; SSR cannot
        // know the value, so we must sync after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration from localStorage
        setPersonaState(parsed as Persona);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const setPersona = useCallback(
    (next: Persona) => {
      setPersonaState(next);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore quota / privacy mode errors */
        }
      }
      // Phase 40 D-20: persona change invalidates persona-scoped query keys
      // so the new persona's data re-fetches without a full page reload.
      for (const key of PERSONA_SCOPED_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    [queryClient],
  );

  return (
    <PersonaContext.Provider value={{ persona, setPersona }}>{children}</PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) {
    throw new Error('usePersona must be used inside PersonaProvider');
  }
  return ctx;
}
