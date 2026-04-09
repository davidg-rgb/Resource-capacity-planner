// Phase 47-05: Extended Playwright test base with auto-seeding.
//
// Every TC-E2E spec needs a clean DB; forgetting a `beforeEach(seedDb)` is
// a silent cross-test pollution bug. Making the seed automatic (auto: true
// fixture) removes the footgun. Cost: read-only specs pay the seed round-
// trip (~200-500ms). Acceptable for the ~12 serial specs in Wave 2.
//
// Usage:
//   import { test, expect, personaAs } from '../fixtures/test-base';
//
//   test('TC-E2E-1A: PM Monday check-in', async ({ page }) => {
//     await personaAs(page, 'pm');
//     await page.goto('/');
//     await expect(page.getByText('Nordlys')).toBeVisible();
//   });
//
// Specs that mutate data can rely on the deterministic bundle from
// tests/fixtures/seed.ts buildSeed('e2e') — re-seeded fresh before each
// test body runs.

import { test as base, expect } from '@playwright/test';
import { seedDb } from '../lib/seed';
import { personaAs, type PersonaKind } from './persona';

type Fixtures = {
  seedFirst: void;
};

export const test = base.extend<Fixtures>({
  seedFirst: [
    async ({ request }, use) => {
      await seedDb(request);
      await use();
    },
    { auto: true },
  ],
});

export { expect, personaAs };
export type { PersonaKind };
