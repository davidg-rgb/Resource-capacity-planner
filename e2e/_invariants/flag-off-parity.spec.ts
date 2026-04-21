// Phase 52-01 Task 3 / Plan 05 will flesh out.
//
// Nyquist cross-journey invariant #2: with `uiV6PerJourney=false`, every
// persona landing still renders — i.e. Phase 51 behavior is preserved when
// the flag is off. This scaffold stakes the contract with 5 minimal tests
// (one per persona). Plan 52-05 expands each test with the richer
// pre-Phase-52 assertions that it's being compared against.
//
// Scaffold strategy:
//   1. Seed (auto, via test-base) — this inserts `uiV6PerJourney=true`.
//   2. Toggle the flag OFF for the test tenant via a direct POST to a
//      helper route — that route does not exist yet. Plan 05 adds
//      `POST /api/test/flags` or equivalent; until then these tests are
//      `test.fixme()` so `pnpm test:e2e --list` reports them but the
//      suite doesn't fail on the missing toggle.
//   3. Navigate to the persona landing and assert the body is visible
//      + URL matches (Phase 51 parity floor).
//
// The `test.fixme` gate is removed in Plan 05 once the flag-toggle helper
// exists. This file is intentionally scaffold-shaped: per PLAN 52-01 Task 3
// it MUST define 5 `test(` blocks, one per persona landing, so
// `pnpm test:e2e --list` shows the spec in the inventory today.

import { test, expect, personaAs, type PersonaKind } from '../fixtures/test-base';

type LandingCase = {
  kind: PersonaKind;
  path: string;
  label: string;
};

const LANDINGS: LandingCase[] = [
  { kind: 'pm', path: '/pm', label: 'PM' },
  { kind: 'line-manager', path: '/line-manager', label: 'Line Manager' },
  { kind: 'staff', path: '/staff', label: 'Staff' },
  { kind: 'rd', path: '/rd', label: 'R&D Director' },
  { kind: 'admin', path: '/admin', label: 'Admin' },
];

test.describe('Invariant #2 — flag-off parity (Phase 51 behavior preserved)', () => {
  for (const landing of LANDINGS) {
    test(`${landing.label} landing renders with uiV6PerJourney=false`, async ({
      page,
    }, testInfo) => {
      test.fixme(
        true,
        'Plan 52-05: wire flag-toggle helper + Phase 51 parity assertions. ' +
          'This scaffold locks the invariant count (5 landings) for ' +
          '`pnpm test:e2e --list` today.',
      );

      // Once Plan 05 lands the toggle helper, the body of this test will be:
      //
      //   await setOrgFlag({ flagName: 'uiV6PerJourney', enabled: false });
      //   await personaAs(page, landing.kind);
      //   await page.goto(landing.path);
      //   expect(page.url()).toContain(landing.path);
      //   await expect(page.locator('body')).toBeVisible();
      //   // + persona-specific Phase 51 parity asserts.
      //
      // Kept commented-out so `personaAs` / `expect` / imports remain live
      // for the spec inventory + typecheck.
      await personaAs(page, landing.kind);
      await page.goto(landing.path);
      expect(page.url()).toContain(landing.path);
      await expect(page.locator('body')).toBeVisible();
      testInfo.annotations.push({
        type: 'scaffold',
        description: `flag-off parity for ${landing.label} (${landing.path}) — fleshed out in Plan 05`,
      });
    });
  }
});
