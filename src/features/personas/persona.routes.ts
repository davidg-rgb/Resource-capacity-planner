import type { Persona, PersonaKind } from './persona.types';

export const PERSONA_KINDS = [
  'pm',
  'line-manager',
  'staff',
  'rd',
  'admin',
] as const satisfies readonly PersonaKind[];

/**
 * Maps a persona to its landing route per ARCHITECTURE §6.12.
 * Routes themselves do not exist yet — they ship in Phases 40-43.
 */
export function getLandingRoute(p: Persona): string {
  switch (p.kind) {
    case 'pm':
      return '/pm';
    case 'line-manager':
      return '/line-manager';
    case 'staff':
      return '/staff';
    case 'rd':
      return '/rd';
    case 'admin':
      return '/admin/change-log';
  }
}
