// v6.0 — Phase 53 / Plan 53-05 (POLISH-05): /alerts tabbed surface e2e
// journey. Exercised with the polish flag ON; verifies:
//
//   1. /alerts lands on the warnings tab by default (aria-selected="true"
//      on alerts-tab-warnings).
//   2. Clicking the conflicts tab updates the URL to ?tab=conflicts and
//      renders the ResourceConflictsPanel.
//   3. Direct-navigating /alerts?tab=conflicts deep-links into the panel.
//
// Flag-off parity is covered by e2e/_invariants/flag-off-parity.spec.ts.

import { test, expect } from '../fixtures/test-base';
import { personaAs } from '../helpers/persona-setup';
import { setPolishFlag } from '../helpers/flag-toggle';

test.describe('POLISH-05 — /alerts tabs (polish flag ON)', () => {
  test.beforeEach(async ({ request }) => {
    // Seed flag is ON, but make the dependency explicit so this spec is
    // not coupled to a specific seed default.
    await setPolishFlag(request, true);
  });

  test('/alerts defaults to the warnings tab with warnings selected', async ({ page }) => {
    await personaAs(page, 'admin');
    await page.goto('/alerts');

    const warningsTab = page.locator('[data-testid="alerts-tab-warnings"]');
    await expect(warningsTab).toBeVisible();
    await expect(warningsTab).toHaveAttribute('aria-selected', 'true');

    const conflictsTab = page.locator('[data-testid="alerts-tab-conflicts"]');
    await expect(conflictsTab).toBeVisible();
    await expect(conflictsTab).toHaveAttribute('aria-selected', 'false');

    // Conflicts panel must NOT be present on the default (warnings) tab.
    await expect(page.locator('[data-testid="resource-conflicts-panel"]')).toHaveCount(0);
  });

  test('clicking the conflicts tab updates the URL to ?tab=conflicts and renders the panel', async ({
    page,
  }) => {
    await personaAs(page, 'admin');
    await page.goto('/alerts');

    await page.locator('[data-testid="alerts-tab-conflicts"]').click();

    await expect(page).toHaveURL(/\/alerts\?.*tab=conflicts/);
    await expect(page.locator('[data-testid="resource-conflicts-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="alerts-tab-conflicts"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('direct-navigating /alerts?tab=conflicts deep-links into the panel', async ({ page }) => {
    await personaAs(page, 'admin');
    await page.goto('/alerts?tab=conflicts');

    await expect(page.locator('[data-testid="alerts-tab-conflicts"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('[data-testid="resource-conflicts-panel"]')).toBeVisible();
  });
});
