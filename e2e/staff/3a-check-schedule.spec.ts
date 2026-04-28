// v6.0 — Phase 52 / Plan 52-05 (D-14): Journey 3A Staff check schedule.
//
// Target: 0 clicks — staff lands, sees read-only schedule, done.
//
// STAFF-01 / D-10 contract: TimelineGrid.readOnly + PlanVsActualCell
// data-editable='false'. The /staff page is fully read-only — no editable
// cells, no hover-edit affordances.

import { test, expect, personaAs } from '../fixtures/test-base';
import { resetClickCount, getClickCount } from '../helpers/click-counter';
import { checkA11y } from '../helpers/a11y';

test.describe('Journey 3A — Staff check schedule (read-only)', () => {
  test('landing renders schedule without any click', async ({ page }) => {
    await personaAs(page, 'staff');
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');
    await resetClickCount(page);

    // Assert schedule body renders. Prefer the canonical cell testid; fall
    // back to role=grid / heading text for pre-wiring robustness.
    const grid = page.locator('[data-testid="plan-vs-actual-cell"], [role="grid"]').first();
    await expect(grid).toBeVisible({ timeout: 5000 });

    // STAFF-01 contract: no editable cells.
    const editableCells = page.locator('[data-testid="plan-vs-actual-cell"][data-editable="true"]');
    await expect(editableCells).toHaveCount(0);

    // 0 clicks target for 3A.
    expect(await getClickCount(page)).toBe(0);
    await checkA11y(page);
  });
});
