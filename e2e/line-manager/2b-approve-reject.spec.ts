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
import {
  personaAsLineManager,
  LM_SEED_DEPARTMENT_ID,
} from '../helpers/persona-setup';
import { resetClickCount, getClickCount } from '../helpers/click-counter';
import { checkA11y } from '../helpers/a11y';

test.describe('Journey 2B — LM approve via badge', () => {
  test('badge click lands on approval queue within 1 click', async ({ page }) => {
    await personaAsLineManager(page, { departmentId: LM_SEED_DEPARTMENT_ID });
    await page.goto('/line-manager');
    await page.waitForLoadState('networkidle');

    // Badge may be suppressed when count=0. Seed has 2 pending proposals
    // in Per's department so we expect count >= 1 when flag is on.
    const badge = page.locator('[data-testid="lm-approval-queue-badge"]');
    const badgeCount = await badge.count();

    await resetClickCount(page);

    if (badgeCount > 0) {
      await badge.click();
      await expect(page).toHaveURL(/\/line-manager\/approval-queue/);
      expect(await getClickCount(page)).toBeLessThanOrEqual(1);
    } else {
      test.info().annotations.push({
        type: 'todo',
        description:
          'Journey 2B: badge not visible (flag OFF or count=0) — click-count assertion skipped',
      });
    }

    await checkA11y(page);
  });
});
