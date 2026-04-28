// Phase 52-01 Task 2 — Spec helpers for D-13 click-count verification.
//
// Every journey spec calls `resetClickCount(page)` after the initial navigate
// so seed-time clicks / autofocus events don't pollute the counter, then
// performs the journey's user actions, then asserts the final count:
//
//   await resetClickCount(page);
//   // ...user actions...
//   const count = await getClickCount(page);
//   expect(count).toBeLessThanOrEqual(JOURNEY_1A_TARGET);
//
// The counter is maintained by `src/lib/testing/click-tracker.tsx`; it only
// exists when `NEXT_PUBLIC_E2E_CLICK_TRACKING === 'true'` (set in
// `e2e/playwright.config.ts` under `webServer.env`). `getClickCount` returns
// 0 when the counter is unset so specs running outside the Playwright
// webServer harness don't crash.

import type { Page } from '@playwright/test';

/**
 * Zero the click counter. Safe to call before tracking begins (initialises
 * the global to 0 on fresh pages). Typically called once per test after the
 * first `page.goto(...)` so the post-navigation settle hits the page before
 * the journey assertions start.
 */
export async function resetClickCount(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __clickCount?: number }).__clickCount = 0;
  });
}

/**
 * Read the current click count. Returns 0 when the tracker is disabled
 * (`__clickCount` undefined) so specs can still run, though journey
 * assertions become trivially satisfiable — always pair `getClickCount`
 * with a prior `resetClickCount` to guarantee the tracker is live.
 */
export async function getClickCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __clickCount?: number }).__clickCount ?? 0);
}
