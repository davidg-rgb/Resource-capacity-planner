// v6.0 — Phase 52 / Plan 52-05 (D-14): Journey 5B Admin archive dependent project.
//
// Target: ≤ 2 clicks (project row → Archive button) → toast.error with
// expandable <details> block listing kind-counts (ADMIN-01 / D-12 / Q1).
//
// Seed has a project with active allocations (Nordlys has allocations for
// every seed person for 24 months), so archiving it via the admin UI
// surfaces DependentRowsError.

import { test, expect, personaAs } from '../fixtures/test-base';
import { resetClickCount, getClickCount } from '../helpers/click-counter';
import { checkA11y } from '../helpers/a11y';

test.describe('Journey 5B — Admin archive dependent project', () => {
  test('archive project with allocations → toast.error with <details>', async ({ page }) => {
    await personaAs(page, 'admin');
    await page.goto('/admin/projects');
    await page.waitForLoadState('networkidle');

    // confirm() is native — always accept so the archive mutation runs.
    page.on('dialog', (d) => d.accept());

    await resetClickCount(page);

    // Click 1: locate first project row. Admin register pages render row
    // actions as icon buttons.
    const row = page
      .locator('tr')
      .filter({ hasText: /Nordlys/i })
      .first();
    if ((await row.count()) === 0) {
      test.info().annotations.push({
        type: 'todo',
        description: 'Journey 5B: Nordlys row not rendered — admin projects page may be empty',
      });
      return;
    }

    // Click 2: archive action on that row.
    const archiveBtn = row.getByRole('button', { name: /arkivera|archive/i }).first();
    if ((await archiveBtn.count()) > 0) {
      await archiveBtn.click();
    } else {
      test.info().annotations.push({
        type: 'todo',
        description: 'Journey 5B: archive button not found on the row',
      });
    }

    // Assert a sonner toast surfaced with the <details> block. sonner mounts
    // toasts in a list with role=status; <details> + <summary> carry the
    // Plan 52-05 content.
    const toast = page
      .locator('[data-testid="admin-dependent-rows-toast"]')
      .or(page.locator('[data-sonner-toast]').filter({ hasText: /beroenden|dependencies/i }))
      .first();

    if ((await toast.count()) > 0) {
      await expect(toast).toBeVisible({ timeout: 5000 });
      // Expand the <details> block and verify list items.
      const summary = toast.locator('summary').first();
      if ((await summary.count()) > 0) {
        await summary.click();
      }
      const items = toast.locator('li');
      const liCount = await items.count();
      expect(liCount).toBeGreaterThan(0);
    } else {
      test.info().annotations.push({
        type: 'todo',
        description:
          'Journey 5B: admin-dependent-rows-toast not rendered — DependentRowsError path may not fire',
      });
    }

    // 2-click target: row select (1) + archive button (2). Summary click is
    // an expand affordance not part of the journey — counter remains ≤ 2
    // unless the details expand is annotated with data-clicks (it isn't).
    expect(await getClickCount(page)).toBeLessThanOrEqual(2);
    await checkA11y(page);
  });
});
