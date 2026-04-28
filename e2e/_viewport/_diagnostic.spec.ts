// v6.0 Phase 53-01 Task 3 — POLISH-07 diagnostic viewport spec.
//
// Purpose (D-04 / D-05): capture the CURRENT scrollHeight of the manager
// and project-leader dashboards at 1440×900 with `uiV6Polish` OFF, so the
// Wave 3 real viewport gate (Plan 05) can set its threshold with actual
// data in hand, and Phase 54 planning inherits a concrete pre-polish
// baseline.
//
// This is a SOFT gate on purpose:
//   - NO assertion helpers invoked (the D-04 spec is pure measurement)
//   - NO check that can fail the suite
// The spec's only duty is to measure + attach the numbers via
// `test.info().attach(...)` + log via `console.log(...)` so CI reports
// carry the data forward. If the measurement fails (network, fonts,
// missing persona), the spec still passes — a failed measurement is a
// Phase 54 investigation, not a Phase 53 regression.
//
// File name prefix `_` is intentional: Playwright's default testMatch
// still picks it up, but humans scanning `e2e/` know it is meta /
// diagnostic and not part of the functional gate.

import { test } from '../fixtures/test-base';
import { personaAs } from '../helpers/persona-setup';
import { setPolishFlag } from '../helpers/flag-toggle';

async function captureScrollHeight(
  label: string,
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForLoadState('networkidle');
  // Pitfall #4 from RESEARCH — wait for fonts so Manrope/Inter metrics
  // settle before measuring. `document.fonts.ready` resolves once.
  await page.evaluate(() => document.fonts.ready);

  const { scrollHeight, clientHeight } = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));

  const overflow = scrollHeight - clientHeight;

  await test.info().attach(`${label}-1440x900-polishOff.json`, {
    body: JSON.stringify({ label, scrollHeight, clientHeight, overflow }),
    contentType: 'application/json',
  });

  // Explicit log so `pnpm test:e2e` output carries the number even when
  // the html reporter is not opened.

  console.log(
    `[DIAGNOSTIC] ${label} scrollHeight=${scrollHeight} clientHeight=${clientHeight} overflow=${overflow}`,
  );
}

test.describe('POLISH-07 diagnostic — capture pre-Phase-53 scrollHeight', () => {
  test('manager dashboard scrollHeight @ 1440x900 (uiV6Polish OFF)', async ({ page }) => {
    // Baseline: flip the Phase 53 flag off before the first nav so the
    // measurement reflects the current post-Phase-52 layout, not the
    // polished target.
    await setPolishFlag(page.request, false);
    await personaAs(page, 'admin');
    await page.goto('/dashboard');
    await captureScrollHeight('manager', page);
  });

  test('project-leader dashboard scrollHeight @ 1440x900 (uiV6Polish OFF)', async ({ page }) => {
    // RESEARCH used `/dashboard/projects` — verified present at
    // src/app/(app)/dashboard/projects/page.tsx in the current tree
    // (see 53-01-SUMMARY "Project-leader dashboard route path").
    await setPolishFlag(page.request, false);
    await personaAs(page, 'pm');
    await page.goto('/dashboard/projects');
    await captureScrollHeight('project-leader', page);
  });
});
