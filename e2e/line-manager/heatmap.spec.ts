// Phase 47-07 Task 1: TC-E2E-2A Line Manager heatmap.
//
// Asserts that the LM heatmap renders with at least one over-capacity (red)
// cell and at least one under-capacity (yellow) cell. Uses defensive locator
// patterns to match whichever attribute the heatmap component uses to flag
// capacity status.
//
// Heatmap color case: Case (i) assumed — relies on existing seeded data
// (uniform 60h/month) producing mixed colors via the capacity threshold logic.
// If a future run shows uniform colors, fall back to Case (ii) per
// 47-07-PLAN.md (extend tests/fixtures/seed.ts with Erik:2026-03=200,
// Sara:2026-06=10 overrides + rebase seed.deterministic.test.ts).

import { test, expect, personaAs } from '../fixtures/test-base';

test.describe('Line Manager heatmap', () => {
  test('TC-E2E-2A: heatmap renders with at least one red and one yellow cell', async ({
    page,
  }) => {
    await personaAs(page, 'line-manager');
    await page.goto('/');

    const redCells = page.locator(
      '[data-capacity="over"], [class*="bg-red"], [data-status="over"]',
    );
    const yellowCells = page.locator(
      '[data-capacity="under"], [class*="bg-yellow"], [data-status="under"]',
    );

    await expect(redCells.first()).toBeVisible();
    await expect(yellowCells.first()).toBeVisible();
  });
});
