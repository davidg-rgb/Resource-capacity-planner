/**
 * v5.0 Persona discriminated union — UX shortcut, NOT a security boundary (ADR-004).
 * See ARCHITECTURE §6.12.
 */

export type Persona =
  | { kind: 'pm'; personId: string; displayName: string; homeDepartmentId?: string }
  | { kind: 'line-manager'; departmentId: string; displayName: string }
  | { kind: 'staff'; personId: string; displayName: string }
  | { kind: 'rd'; displayName: string }
  | { kind: 'admin'; displayName: string };

export type PersonaKind = Persona['kind'];

/** Default persona on first load / corrupt storage (ARCHITECTURE §6.12). */
export const DEFAULT_PERSONA: Persona = { kind: 'admin', displayName: 'Admin' };
