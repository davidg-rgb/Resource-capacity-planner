// v6.0 — Phase 53 / Plan 53-05 (POLISH-07): project-leader dashboard
// viewport measurement at 1440×900 with `uiV6Polish` ON.
//
// Mirror of manager-dashboard-1440x900.spec.ts for the /dashboard/projects
// route. Persona is 'pm' (same as Plan 01 _diagnostic.spec.ts — the
// project-leader dashboard page is rendered under that persona in the
// existing harness).
//
// SOFT gate per D-04 — no assertion on the overflow measurement.

import { test } from '../fixtures/test-base';
import { personaAs } from '../helpers/persona-setup';
import { setPolishFlag } from '../helpers/flag-toggle';

test.describe('POLISH-07 (soft gate) — project-leader dashboard at 1440x900 (polish ON)', () => {
  test('captures scrollHeight with uiV6Polish=ON', async ({ page }) => {
    await setPolishFlag(page.request, true);
    await page.setViewportSize({ width: 1440, height: 900 });
    await personaAs(page, 'pm');
    await page.goto('/dashboard/projects');
    await page.waitForLoadState('networkidle');
    // Pitfall #4 — wait for fonts so Manrope/Inter metrics settle.
    await page.evaluate(() => document.fonts.ready);

    const metrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      overflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }));

    await test.info().attach('project-leader-1440x900-polishOn.json', {
      body: JSON.stringify({ label: 'project-leader', ...metrics }),
      contentType: 'application/json',
    });

    console.log(
      `[POLISH-07 soft] project-leader overflow=${metrics.overflow}px ` +
        `(scroll=${metrics.scrollHeight}, client=${metrics.clientHeight})`,
    );
  });
});
