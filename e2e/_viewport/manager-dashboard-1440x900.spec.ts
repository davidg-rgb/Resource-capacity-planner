// v6.0 — Phase 53 / Plan 53-05 (POLISH-07): manager dashboard viewport
// measurement at 1440×900 with `uiV6Polish` ON.
//
// Per D-04 this is a SOFT gate: the spec MUST measure scrollHeight +
// clientHeight + overflow, MUST attach them as a Playwright artifact, and
// MUST log them to stdout — but MUST NOT call an assertion on the overflow
// number. A failing gate would block Phase 53 closure on a dashboard
// redesign that is out of scope; the redesign is Phase 54 and will use
// the numbers this spec produces.
//
// Companion spec: e2e/_viewport/_diagnostic.spec.ts (Plan 01) captures the
// same metrics with flag OFF. Together Phase 54 planning can diff
// pre-polish vs post-polish dashboard heights at the same viewport.

import { test } from '../fixtures/test-base';
import { personaAs } from '../helpers/persona-setup';
import { setPolishFlag } from '../helpers/flag-toggle';

test.describe('POLISH-07 (soft gate) — manager dashboard at 1440x900 (polish ON)', () => {
  test('captures scrollHeight with uiV6Polish=ON', async ({ page }) => {
    await setPolishFlag(page.request, true);
    await page.setViewportSize({ width: 1440, height: 900 });
    await personaAs(page, 'admin');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Pitfall #4 — wait for fonts so Manrope/Inter metrics settle.
    await page.evaluate(() => document.fonts.ready);

    const metrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      overflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }));

    await test.info().attach('manager-1440x900-polishOn.json', {
      body: JSON.stringify({ label: 'manager', ...metrics }),
      contentType: 'application/json',
    });

    console.log(
      `[POLISH-07 soft] manager overflow=${metrics.overflow}px ` +
        `(scroll=${metrics.scrollHeight}, client=${metrics.clientHeight})`,
    );

    // NO assertion on metrics.overflow — per D-04, this is a diagnostic soft
    // gate; real redesign is Phase 54. A future operator wanting a hard
    // gate would add an assertion like "toBeLessThanOrEqual(8)" here.
  });
});
