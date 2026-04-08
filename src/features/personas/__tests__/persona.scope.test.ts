// v5.0 — Phase 42 / Plan 42-02 Task 1 — TC-PSN staff scope.
//
// Per ADR-004 personas are UX shortcuts, not security boundaries. The
// "scope allowed / forbidden" assertion therefore targets the pure
// `assertPersonaOrRedirect` decision function used by PersonaGate (the
// client-side gate on /staff). The allowed list for /staff is
// ['staff','admin','rd'] per plan D-03.

import { describe, it, expect } from 'vitest';

import { assertPersonaOrRedirect } from '../persona-route-guard';
import type { Persona } from '../persona.types';

const STAFF_ALLOWED = ['staff', 'admin', 'rd'] as const;

describe('TC-PSN staff scope (persona gate for /staff)', () => {
  it('staff persona is allowed', () => {
    const p: Persona = { kind: 'staff', personId: 'p-1', displayName: 'Sara' };
    expect(assertPersonaOrRedirect(p, STAFF_ALLOWED)).toEqual({ allowed: true });
  });

  it('admin persona is allowed', () => {
    const p: Persona = { kind: 'admin', displayName: 'Admin' };
    expect(assertPersonaOrRedirect(p, STAFF_ALLOWED)).toEqual({ allowed: true });
  });

  it('rd persona is allowed', () => {
    const p: Persona = { kind: 'rd', displayName: 'R&D' };
    expect(assertPersonaOrRedirect(p, STAFF_ALLOWED)).toEqual({ allowed: true });
  });

  it('pm persona is forbidden (sees switch-persona hint)', () => {
    const p: Persona = { kind: 'pm', personId: 'p-2', displayName: 'PM' };
    expect(assertPersonaOrRedirect(p, STAFF_ALLOWED)).toEqual({ allowed: false });
  });

  it('line-manager persona is forbidden', () => {
    const p: Persona = {
      kind: 'line-manager',
      departmentId: 'd-1',
      displayName: 'LM',
    };
    expect(assertPersonaOrRedirect(p, STAFF_ALLOWED)).toEqual({ allowed: false });
  });
});
