// Phase 47-08 / Task 3: TC-E2E-4B
//
// R&D Lead clicks a red (over-capacity) cell and a drill-down dialog opens
// with the allocation breakdown. The over-capacity cell selector is broad
// (data-capacity, data-status, or class-based bg-red) so it survives minor
// CSS refactors as long as the over-capacity affordance remains visually
// red and accessibility-tagged.

import { test, expect, personaAs } from '../fixtures/test-base';

test.describe('R&D Lead overcommit drill', () => {
  test('TC-E2E-4B: clicking a red cell opens a drill-down dialog', async ({ page }) => {
    await personaAs(page, 'rd');
    await page.goto('/');

    // Locate the first over-capacity cell. The deterministic seed produces
    // at least one (Erik/2026-03 = 200h is the canonical case).
    const redCell = page
      .locator('[data-capacity="over"], [class*="bg-red"], [data-status="over"]')
      .first();
    await expect(redCell).toBeVisible();
    await redCell.click();

    // Drill-down dialog opens with allocation context.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Erik|200|hours|timmar/i);
  });
});
