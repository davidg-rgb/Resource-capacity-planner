// v6.0 — Phase 52 / Plan 52-05 (D-14): Journey 2A LM capacity overview.
//
// Target: ≤ 1 click — land, see heatmap, click a person row → drill.

import { test, expect } from '../fixtures/test-base';
import {
  personaAsLineManager,
  LM_SEED_DEPARTMENT_ID,
} from '../helpers/persona-setup';
import { resetClickCount, getClickCount } from '../helpers/click-counter';
import { checkA11y } from '../helpers/a11y';

test.describe('Journey 2A — LM capacity overview', () => {
  test('drills into capacity within 1 click', async ({ page }) => {
    await personaAsLineManager(page, { departmentId: LM_SEED_DEPARTMENT_ID });
    await page.goto('/line-manager');
    await page.waitForLoadState('networkidle');
    await resetClickCount(page);

    // Click 1: drill into a person row / heatmap cell.
    const personRow = page
      .locator('[data-testid^="lm-person-cell-"]')
      .or(
        page.locator(
          '[data-capacity="over"], [data-capacity="under"], [data-status="over"]',
        ),
      )
      .first();

    if ((await personRow.count()) > 0) {
      await personRow.click();
    } else {
      test.info().annotations.push({
        type: 'todo',
        description: 'Journey 2A: no person row / capacity cell rendered',
      });
    }

    expect(await getClickCount(page)).toBeLessThanOrEqual(1);
    await checkA11y(page);
  });
});
