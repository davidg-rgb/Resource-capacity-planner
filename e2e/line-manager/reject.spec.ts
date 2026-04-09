// Phase 47-07 Task 3: TC-E2E-2B-reject Line Manager reject proposal.
//
// Anna→Sara/Aurora/2026-08 20h 'proposed' is the rejection target.
// Rejecting must open a required-reason dialog and block submit until filled.

import { test, expect, personaAs } from '../fixtures/test-base';

test.describe('Line Manager reject proposal', () => {
  test('TC-E2E-2B-reject: rejecting requires a reason before submit', async ({ page }) => {
    await personaAs(page, 'line-manager');
    await page.goto('/');

    const proposalRow = page.getByText(/Sara.*Aurora.*2026-08|Sara.*20/i).first();
    await proposalRow.getByRole('button', { name: /reject|avslå/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const submitBtn = dialog.getByRole('button', { name: /confirm|avslå|bekräfta/i });
    const initiallyDisabled = await submitBtn.isDisabled().catch(() => false);
    if (!initiallyDisabled) {
      await submitBtn.click();
      await expect(dialog.getByText(/required|obligatorisk|reason/i)).toBeVisible();
    }

    await dialog.getByLabel(/reason|anledning/i).fill('Not enough capacity this month');
    await submitBtn.click();

    await expect(dialog).toBeHidden({ timeout: 5000 });
    await expect(page.getByText(/rejected|avslagen/i).first()).toBeVisible();
  });
});
