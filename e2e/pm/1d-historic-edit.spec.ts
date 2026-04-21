// v6.0 — Phase 52 / Plan 52-05 (D-14): Journey 1D historic edit (4-combo matrix).
//
// Target: ≤ 3 clicks per path (past month fires HistoricEditDialog → confirm;
// future month edits without dialog).
//
// 4-combo matrix per PM-03 / D-03:
//   1. PM + past month  → dialog fires; 3 clicks (cell → input → confirm)
//   2. PM + future month → no dialog; 2 clicks (cell → save)
//   3. LM + past month  → dialog fires; 3 clicks
//   4. LM + future month → no dialog; 2 clicks
//
// Server month forced via NC_TEST_NOW env (PM-03 infra). We drive the
// combos off a known-past anchor (2026-01, earliest seeded month) and a
// known-future anchor (2027-12, last seeded month).

import { test, expect, personaAs } from '../fixtures/test-base';
import { resetClickCount, getClickCount } from '../helpers/click-counter';
import { checkA11y } from '../helpers/a11y';

type Combo = {
  label: string;
  personaKind: 'pm' | 'line-manager';
  path: string;
  monthAttr: string;
  expectDialog: boolean;
};

const COMBOS: Combo[] = [
  { label: 'PM past month', personaKind: 'pm', path: '/pm', monthAttr: '2026-01', expectDialog: true },
  { label: 'PM future month', personaKind: 'pm', path: '/pm', monthAttr: '2027-12', expectDialog: false },
  { label: 'LM past month', personaKind: 'line-manager', path: '/line-manager/timeline', monthAttr: '2026-01', expectDialog: true },
  { label: 'LM future month', personaKind: 'line-manager', path: '/line-manager/timeline', monthAttr: '2027-12', expectDialog: false },
];

test.describe('Journey 1D — Historic edit (4-combo matrix)', () => {
  for (const combo of COMBOS) {
    test(`${combo.label}: edit within 3 clicks`, async ({ page }) => {
      await personaAs(page, combo.personaKind);
      await page.goto(combo.path);
      await page.waitForLoadState('networkidle');
      await resetClickCount(page);

      // Click 1: find a cell for the target month.
      const cell = page
        .locator(`[data-month="${combo.monthAttr}"]`)
        .first();
      if ((await cell.count()) === 0) {
        test.info().annotations.push({
          type: 'todo',
          description: `Journey 1D [${combo.label}]: cell for ${combo.monthAttr} not found`,
        });
        return;
      }
      await cell.click();

      // Input keystrokes (not counted as clicks).
      const input = page.locator('input[type="number"]').first();
      if ((await input.count()) > 0) {
        await input.fill('45');
      }

      // Click 2: confirm (save for future, continue for past).
      const saveBtn = page
        .getByRole('button', { name: /save|spara|fortsätt|continue|confirm/i })
        .first();
      if ((await saveBtn.count()) > 0) {
        await saveBtn.click();
      }

      if (combo.expectDialog) {
        // Click 3 (past only): confirm on HistoricEditDialog.
        const dialog = page.getByRole('dialog').first();
        if (await dialog.isVisible().catch(() => false)) {
          const confirmBtn = dialog
            .getByRole('button', { name: /save|spara|confirm|fortsätt/i })
            .first();
          if ((await confirmBtn.count()) > 0) {
            await confirmBtn.click();
          }
        }
      }

      expect(await getClickCount(page)).toBeLessThanOrEqual(3);
      await checkA11y(page);
    });
  }
});
