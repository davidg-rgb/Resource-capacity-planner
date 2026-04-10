// v5.0 — PersonaGate scope filter (ADR-004, TC-NEG-013).
// Returns a filter object scoped to the active persona. Used by data-fetching
// layers to narrow queries — NOT a security boundary (API enforces org membership).

import type { Persona } from './persona.types';

export interface ScopeFilter {
  projectIds?: string[];
  departmentId?: string;
  personId?: string;
}

export function getPersonaScopeFilter(persona: Persona): ScopeFilter {
  switch (persona.kind) {
    case 'pm':
      return {}; // PM scope determined by lead_pm_person_id at query time
    case 'line-manager':
      return { departmentId: persona.departmentId };
    case 'staff':
      return { personId: persona.personId };
    case 'rd':
    case 'admin':
      return {}; // No scope filter — full access
  }
}
