// Phase 52-01 Task 3 — axe-core/playwright a11y gate.
//
// Implements Nyquist cross-journey invariant #6: every persona landing
// (`/pm`, `/line-manager`, `/staff`, `/rd`, `/admin`) must pass axe-core
// zero-violations when `uiV6PerJourney` is on (per UI-RESTRUCTURE-PLAN-v2 §7).
//
// Wave 5 journey specs will call `await checkA11y(page)` after the final
// visual state is reached. Current violations are reported as the full axe
// `violations` array so the CI failure message is actionable.

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Run @axe-core/playwright against the current page state and fail if any
 * WCAG violations are present. The serialized violations array is the assertion
 * message so test output shows exactly which rules failed and on which nodes.
 */
export async function checkA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}
