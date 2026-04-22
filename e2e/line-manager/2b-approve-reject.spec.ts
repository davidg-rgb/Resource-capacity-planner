// v6.0 — Phase 52 / Plan 52-05 (D-14): Journey 2B LM approve via badge.
//
// Target: ≤ 1 click to the approval queue via the LM-01 badge.
//
// Narrative: Per on /line-manager sees the approval-queue badge (LM-01 /
// D-06) showing `(N)` pending proposals (seed has 2 pending). Clicks the
// badge → lands on /line-manager/approval-queue.
//
// LM-03 endpoint (Plan 52-02) provides /api/v5/proposals/queue/count with
// departmentId filter — the badge calls that endpoint via useLmQueueCount.

import { test, expect } from '../fixtures/test-base';
import { personaAsLineManager, LM_SEED_DEPARTMENT_ID } from '../helpers/persona-setup';
import { resetClickCount, getClickCount } from '../helpers/click-counter';
import { checkA11y } from '../helpers/a11y';

test.describe('Journey 2B — LM approve via badge', () => {
  test('badge click lands on approval queue within 1 click', async ({ page }) => {
    await personaAsLineManager(page, { departmentId: LM_SEED_DEPARTMENT_ID });
    await page.goto('/line-manager');
    await page.waitForLoadState('networkidle');

    // v6.0 — Phase 52 / REVIEW-FIX WR-06: seed has 2 pending proposals in
    // Per's department so the badge MUST be visible with flag ON. Previously
    // we wrapped the click-count assertion in `if (badgeCount > 0)` and
    // silently annotated "todo" on missing badge — meaning a real regression
    // (badge hidden when it should render) would silent-pass. Hard-assert
    // visibility so any badge breakage surfaces as a test failure.
    const badge = page.locator('[data-testid="lm-approval-queue-badge"]');
    await expect(badge).toBeVisible({ timeout: 5000 });

    await resetClickCount(page);
    await badge.click();
    await expect(page).toHaveURL(/\/line-manager\/approval-queue/);
    expect(await getClickCount(page)).toBeLessThanOrEqual(1);

    await checkA11y(page);
  });
});
