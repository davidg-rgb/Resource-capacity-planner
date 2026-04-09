// Phase 47-05: Persona switching harness for Playwright E2E specs.
//
// Sets the persona in localStorage BEFORE the app hydrates, so the persona
// context provider picks it up on first render. Uses page.addInitScript so
// the value is injected on every navigation in this context.
//
// Mirrors the app's PersonaKind from src/features/personas/persona.types.ts.
// Kept as a local type to avoid importing from src/ (which would pull React
// and other runtime deps into the e2e tsconfig). If PersonaKind drifts in
// the app, update both.

import type { Page } from '@playwright/test';

export type PersonaKind = 'admin' | 'pm' | 'line-manager' | 'staff' | 'rd';

/**
 * localStorage key used by src/features/personas/persona.context.tsx.
 * Shape stored: { kind: PersonaKind, ...extras }.
 */
export const PERSONA_STORAGE_KEY = 'nc:persona';

/**
 * Set the persona in localStorage BEFORE the next navigation.
 *
 * Must be called before `page.goto()` — uses addInitScript which runs on
 * every page load in this context. Safe to call multiple times; the last
 * call wins (Playwright accumulates init scripts, latest write persists).
 *
 * Example:
 *   test.beforeEach(async ({ page }) => {
 *     await personaAs(page, 'pm');
 *     await page.goto('/');
 *   });
 */
export async function personaAs(
  page: Page,
  kind: PersonaKind,
  extras: Record<string, unknown> = {},
): Promise<void> {
  await page.addInitScript(
    ([k, e, storageKey]) => {
      window.localStorage.setItem(
        storageKey as string,
        JSON.stringify({ kind: k, ...(e as Record<string, unknown>) }),
      );
    },
    [kind, extras, PERSONA_STORAGE_KEY] as const,
  );
}
