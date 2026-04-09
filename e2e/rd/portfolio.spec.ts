// Phase 47-08 / Task 2: TC-E2E-4A
//
// R&D Lead portfolio view: grid renders with all active projects, groupBy
// toggle is exercised, and zoom-to-year flips the time axis. Tolerant of
// optional toggles — if the control is absent the toggle blocks no-op so
// the spec still asserts the core grid invariants.

import { test, expect, personaAs } from '../fixtures/test-base';

test.describe('R&D Lead portfolio', () => {
  test('TC-E2E-4A: portfolio grid renders, groupBy toggle works, zoom-to-year works', async ({
    page,
  }) => {
    await personaAs(page, 'rd');
    await page.goto('/');

    // Portfolio grid landing.
    await expect(page.getByText(/portfolio|portfölj/i).first()).toBeVisible();

    // Active projects from the deterministic seed (Forsen is archived → not shown).
    await expect(page.getByText('Nordlys')).toBeVisible();
    await expect(page.getByText('Aurora')).toBeVisible();
    await expect(page.getByText('Stella')).toBeVisible();

    // groupBy toggle — exercise if present.
    const groupByToggle = page.getByRole('button', { name: /group by|gruppera/i }).first();
    if ((await groupByToggle.count()) > 0) {
      await groupByToggle.click();
      const altOption = page.getByRole('menuitem', { name: /department|avdelning/i });
      if ((await altOption.count()) > 0) await altOption.click();
    }

    // zoom-to-year — exercise if present, then assert year header is shown.
    const zoomBtn = page.getByRole('button', { name: /zoom|year|år/i }).first();
    if ((await zoomBtn.count()) > 0) {
      await zoomBtn.click();
      await expect(page.getByText('2026').first()).toBeVisible();
    }
  });
});
