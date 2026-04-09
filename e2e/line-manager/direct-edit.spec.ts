// Phase 47-07 Task 4: TC-E2E-2C Line Manager direct edit (bulk-commit).
//
// LM directly edits an allocation cell's hours; the change must persist and
// the universal change_log must record the mutation.

import { test, expect, personaAs } from '../fixtures/test-base';

test.describe('Line Manager direct edit', () => {
  test('TC-E2E-2C: direct edit of an allocation persists and writes change_log', async ({
    page,
    request,
  }) => {
    await personaAs(page, 'line-manager');
    await page.goto('/');

    const cell = page.locator('[data-testid*="allocation"]').first();
    await cell.click();
    await page.getByRole('button', { name: /edit|redigera/i }).click();

    await page.getByLabel(/hours|timmar/i).fill('55');
    await page.getByRole('button', { name: /save|spara/i }).click();

    await expect(page.getByText('55')).toBeVisible();

    const logRes = await request.get('/api/admin/change-log?limit=5');
    const log = await logRes.json();
    const latest = log.rows?.[0] ?? log[0];
    expect(JSON.stringify(latest)).toMatch(/allocation/i);
  });
});
