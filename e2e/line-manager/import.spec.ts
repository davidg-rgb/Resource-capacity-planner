// Phase 47-07 Task 5: TC-E2E-2D Line Manager Excel import.
//
// Uploads e2e/fixtures/nordlys-import.xlsx (3 people × 3 months from 47-01),
// asserts the preview renders ≥9 rows, commits the import, then exercises
// the rollback-within-window flow.

import { test, expect, personaAs } from '../fixtures/test-base';
import path from 'node:path';

test.describe('Line Manager Nordlys import', () => {
  test('TC-E2E-2D: import xlsx shows preview and rollback works within window', async ({
    page,
  }) => {
    await personaAs(page, 'line-manager');
    await page.goto('/');

    await page.getByRole('button', { name: /import|importera/i }).first().click();

    const fixturePath = path.resolve(__dirname, '../fixtures/nordlys-import.xlsx');
    await page.setInputFiles('input[type="file"]', fixturePath);

    await expect(page.getByText(/preview|förhandsgranska/i)).toBeVisible();
    const previewRows = page.locator('[data-testid="import-preview-row"], table tbody tr');
    expect(await previewRows.count()).toBeGreaterThanOrEqual(9);

    await page.getByRole('button', { name: /commit|confirm|bekräfta/i }).click();
    await expect(page.getByText(/imported|importerad|success/i)).toBeVisible({ timeout: 10_000 });

    await page.goto('/');
    const rollbackBtn = page.getByRole('button', { name: /rollback|ångra/i }).first();
    await rollbackBtn.click();
    await page.getByRole('button', { name: /confirm|bekräfta/i }).click();

    await expect(page.getByText(/rolled back|återkallad|reversed/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
