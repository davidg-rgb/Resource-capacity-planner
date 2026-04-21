// Phase 52-01 Task 3 — Phase-52 extension of the persona-injection helper.
//
// The existing `e2e/fixtures/persona.ts` `personaAs(page, kind, extras?)` is
// already generic over `extras` (typed `Record<string, unknown>`). Phase 52
// journey specs need two specific ergonomics on top:
//
//   1. LM specs must pass a *deterministic* departmentId — Per Karlsson owns
//      the Electronics Design department in the seed bundle (tests/fixtures/
//      seed.ts:105-114). Rather than every spec reconstructing the uuidv5
//      call, we export `LM_SEED_DEPARTMENT_ID` here.
//   2. A typed `personaAsLineManager(page, { departmentId })` shortcut makes
//      the LM fixture contract explicit at the call site (Pitfall #11 from
//      52-RESEARCH.md — "LM specs without departmentId fall through to the
//      empty department and see zero queue counts").
//
// The underlying `personaAs` export is re-exported verbatim so specs can
// migrate import paths from `../fixtures/persona` to `../helpers/persona-setup`
// without behavioral change.

import type { Page } from '@playwright/test';
import { v5 as uuidv5 } from 'uuid';

import { FIXTURE_NS } from '../../tests/fixtures/namespace';
import { personaAs, type PersonaKind, PERSONA_STORAGE_KEY } from '../fixtures/persona';

/**
 * Department ID for "Electronics Design" as produced by `buildSeed()` in
 * `tests/fixtures/seed.ts`. Per Karlsson (seed slug 'per') is the LM for
 * this department; LM journey specs should use this ID as `departmentId`
 * so `/line-manager` queue counts match seed proposals.
 */
export const LM_SEED_DEPARTMENT_ID: string = uuidv5(
  'seed:department:electronics-design',
  FIXTURE_NS,
);

/**
 * Typed LM persona setup — forces the caller to pass a `departmentId` so
 * LM specs can't silently run without one (Pitfall #11). Pass
 * `LM_SEED_DEPARTMENT_ID` for the default Electronics Design scope, or a
 * custom UUID when asserting multi-department scenarios.
 */
export async function personaAsLineManager(
  page: Page,
  { departmentId }: { departmentId: string },
): Promise<void> {
  await personaAs(page, 'line-manager', { departmentId });
}

export { personaAs, PERSONA_STORAGE_KEY };
export type { PersonaKind };
