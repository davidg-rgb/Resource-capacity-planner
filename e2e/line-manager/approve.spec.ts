// Phase 47-07 Task 2: TC-E2E-2B-approve Line Manager approve proposal.
//
// Anna→Erik/Aurora/2026-07 30h 'proposed' is seeded by buildSeed('e2e').
// Approving flips status to 'approved' and writes a change_log row.

import { test, expect, personaAs } from '../fixtures/test-base';

test.describe('Line Manager approve proposal', () => {
  test('TC-E2E-2B-approve: approving a proposal flips status and writes change_log', async ({
    page,
    request,
  }) => {
    await personaAs(page, 'line-manager');
    await page.goto('/');

    const proposalRow = page.getByText(/Erik.*Aurora.*2026-07|Erik.*30/i).first();
    await expect(proposalRow).toBeVisible();

    await proposalRow.getByRole('button', { name: /approve|godkänn/i }).click();

    await expect(proposalRow.getByText(/approved|godkänd/i)).toBeVisible();

    const logRes = await request.get('/api/admin/change-log?limit=5');
    const log = await logRes.json();
    const latest = log.rows?.[0] ?? log[0];
    expect(JSON.stringify(latest)).toMatch(/proposal|approve/i);
  });
});
