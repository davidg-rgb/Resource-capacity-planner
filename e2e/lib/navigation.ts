// Phase 47-05: Shared navigation helpers for persona-aware E2E specs.
//
// Wraps personaAs + page.goto + an optional persona-root wait, to guard
// against the hydration race documented in 46-RESEARCH §Pitfall 2 (the
// persona provider reads localStorage in useEffect, so very fast assertions
// can briefly observe DEFAULT_PERSONA before hydration).

import type { Page } from '@playwright/test';
import { personaAs, type PersonaKind } from '../fixtures/persona';

/**
 * Per-persona root test id convention. If the app's layout for a given
 * persona does not yet expose `data-testid="{persona}-home-root"`, the
 * wait is non-blocking (catch-and-continue) so specs can still run. The
 * Wave 2 plan that authors the first spec for a persona is responsible
 * for adding the root test id to the appropriate layout element.
 */
const ROOT_TESTID: Record<PersonaKind, string> = {
  admin: 'admin-home-root',
  pm: 'pm-home-root',
  'line-manager': 'line-manager-home-root',
  staff: 'staff-home-root',
  rd: 'rd-home-root',
};

/**
 * Navigate as a persona. Sets persona, navigates, then softly waits for
 * the persona's root test id. The wait is best-effort and will not fail
 * the test if the test id is missing — specs that need stronger guarantees
 * should add their own explicit waits after calling gotoAs.
 */
export async function gotoAs(
  page: Page,
  kind: PersonaKind,
  path: string = '/',
): Promise<void> {
  await personaAs(page, kind);
  await page.goto(path);
  await waitForPersonaReady(page, kind);
}

/**
 * Best-effort wait for the persona-specific root element to mount. Returns
 * true if the test id appeared within the timeout, false otherwise. Never
 * throws — callers should not rely on the boolean for correctness, only
 * for diagnostics.
 */
export async function waitForPersonaReady(
  page: Page,
  kind: PersonaKind,
  timeout: number = 5_000,
): Promise<boolean> {
  try {
    await page.getByTestId(ROOT_TESTID[kind]).waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}
