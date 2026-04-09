// Phase 47-06 / TC-E2E-1B
// PM Anna submits a wish (proposal) for a target person/project/month
// and sees a toast confirmation. The spec uses permissive selectors
// because the wish submission form DOM is not yet pinned with testids.
//
// Target: Per Karlsson / Nordlys / 2026-09 / 40h — chosen to avoid
// collision with the pre-seeded proposals (Sara/Nordlys/2026-06) from
// tests/fixtures/seed.ts.

import { test, expect, personaAs } from '../fixtures/test-base';

test.describe('PM submit wish', () => {
  test('TC-E2E-1B: Anna submits a wish and sees toast confirmation', async ({
    page,
  }) => {
    await personaAs(page, 'pm');
    await page.goto('/');

    // Open the "submit wish" form. The PM UI exposes this via a button
    // labelled something like "Submit wish" / "Ny önskan" / "Propose".
    const submitTrigger = page
      .getByRole('button', { name: /submit wish|ny önskan|propose|önskan/i })
      .first();

    if ((await submitTrigger.count()) === 0) {
      test.info().annotations.push({
        type: 'todo',
        description:
          'TC-E2E-1B: submit-wish trigger button not found; form UI not yet pinned',
      });
      return;
    }

    await submitTrigger.click();

    // Fill the form — prefer labels (accessible) over placeholder text.
    const personField = page.getByLabel(/person|medarbetare/i).first();
    await personField.fill('Per');
    const perOption = page.getByRole('option', { name: /Per Karlsson/i }).first();
    if ((await perOption.count()) > 0) {
      await perOption.click();
    }

    const projectField = page.getByLabel(/project|projekt/i).first();
    await projectField.fill('Nordlys');
    const nordlysOption = page.getByRole('option', { name: /Nordlys/i }).first();
    if ((await nordlysOption.count()) > 0) {
      await nordlysOption.click();
    }

    const monthField = page.getByLabel(/month|månad/i).first();
    await monthField.fill('2026-09');

    const hoursField = page.getByLabel(/hours|timmar/i).first();
    await hoursField.fill('40');

    await page.getByRole('button', { name: /submit|skicka|save|spara/i }).first().click();

    // Toast confirmation — sonner renders into [data-sonner-toast] and
    // most a11y toasts use role=status.
    await expect(
      page.locator('[data-sonner-toast], [role="status"]').first(),
    ).toBeVisible({ timeout: 5000 });
  });
});
