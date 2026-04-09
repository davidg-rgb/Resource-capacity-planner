// Phase 47-08 / Task 1: TC-E2E-3A
//
// Staff persona is read-only "My Schedule" only (ADR Q5). This spec is a
// negative-space assertion: edit/delete/save/propose controls and hours
// inputs must NOT exist in the DOM when the staff persona is active.
//
// If a future change introduces any of these affordances for staff, this
// spec fails immediately — that's the intended guardrail.

import { test, expect, personaAs } from '../fixtures/test-base';

test.describe('Staff read-only schedule', () => {
  test('TC-E2E-3A: staff schedule has no edit controls in DOM', async ({ page }) => {
    await personaAs(page, 'staff');
    await page.goto('/');

    // Positive landing assertion — confirm we actually rendered the staff view.
    await expect(page.getByText(/schedule|schema/i).first()).toBeVisible();

    // Negative assertions — per ADR Q5, staff is read-only My Schedule only.
    await expect(page.getByRole('button', { name: /edit|redigera/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /delete|ta bort/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /save|spara/i })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /submit wish|propose|ny önskan/i }),
    ).toHaveCount(0);

    // No hours/allocation form inputs.
    await expect(page.getByLabel(/hours|timmar/i)).toHaveCount(0);
  });
});
