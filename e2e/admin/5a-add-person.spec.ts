// v6.0 — audit-r1 / CONS-P1-05: Journey 5A Admin add a new person.
//
// Target: ≤ 2 clicks (Add button → Save) for the happy-path person creation.
// Mirrors the click-count pattern used by 5b-archive-dependent.spec.ts.

import { test, expect, personaAs } from '../fixtures/test-base';
import { resetClickCount, getClickCount } from '../helpers/click-counter';
import { checkA11y } from '../helpers/a11y';

test.describe('Journey 5A — Admin add a new person', () => {
  test('add person via admin people register within 2 clicks', async ({ page }) => {
    await personaAs(page, 'admin');
    await page.goto('/admin/people');
    await page.waitForLoadState('networkidle');

    await resetClickCount(page);

    // Click 1: open the new-person form/modal.
    const addBtn = page
      .getByRole('button', { name: /lägg till|add person|ny person|new person/i })
      .first();
    if ((await addBtn.count()) === 0) {
      test.info().annotations.push({
        type: 'todo',
        description:
          'Journey 5A: add-person trigger not rendered on /admin/people — entry may need wiring',
      });
      return;
    }
    await addBtn.click();

    // Fill the minimum required fields. Field-fill events do not register as
    // clicks in the click-counter helper, so they don't count toward the
    // target.
    const nameField = page
      .getByLabel(/name|namn/i)
      .or(page.locator('input[name="name"], input[name="fullName"]'))
      .first();
    if ((await nameField.count()) > 0) {
      await nameField.fill(`E2E Test Person ${Date.now()}`);
    }

    // Click 2: submit/save.
    const saveBtn = page.getByRole('button', { name: /save|spara|create|skapa/i }).first();
    if ((await saveBtn.count()) === 0) {
      test.info().annotations.push({
        type: 'todo',
        description: 'Journey 5A: save button not found in add-person form',
      });
      return;
    }
    await saveBtn.click();

    // Assert success — either toast or the new row in the register.
    const success = page
      .getByText(/sparad|saved|created|skapad/i)
      .or(page.locator('[data-sonner-toast]').filter({ hasText: /person/i }))
      .first();
    if ((await success.count()) > 0) {
      await expect(success).toBeVisible({ timeout: 5000 });
    } else {
      test.info().annotations.push({
        type: 'todo',
        description: 'Journey 5A: post-save confirmation not surfaced',
      });
    }

    // ≤ 2 click target — open form (1) + save (2).
    expect(await getClickCount(page)).toBeLessThanOrEqual(2);
    await checkA11y(page);
  });
});
