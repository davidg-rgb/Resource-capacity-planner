// Phase 53-01 Task 1 — DEFAULT_FLAGS defaults assertion.
//
// Lightweight invariant: every flag in FLAG_NAMES must have a `false`
// default in the service-side DEFAULT_FLAGS map. Prevents the
// "flag declared in types but forgotten in defaults" footgun.
//
// Note: DEFAULT_FLAGS is not exported (it's module-private); we exercise
// it indirectly via `getOrgFlags` with an org that has no featureFlags
// rows — the result equals DEFAULT_FLAGS.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => [] as Array<{ flagName: string; enabled: boolean }>,
      }),
    }),
  },
}));

beforeEach(() => {
  vi.resetModules();
});

describe('flag.service DEFAULT_FLAGS (Phase 53-01 POLISH-FLAG)', () => {
  it('returns all-false defaults when the org has no feature_flags rows', async () => {
    const { getOrgFlags } = await import('../flag.service');
    const flags = await getOrgFlags('00000000-0000-0000-0000-000000000000');

    // Phase 52 precedent (kept).
    expect(flags.uiV6PerJourney).toBe(false);

    // Phase 53-01 POLISH-FLAG new default.
    expect(flags.uiV6Polish).toBe(false);

    // Full-map assertion so adding a flag to FLAG_NAMES without adding
    // its default is caught here.
    expect(flags).toEqual({
      dashboards: false,
      pdfExport: false,
      alerts: false,
      onboarding: false,
      scenarios: false,
      uiV6Landing: false,
      uiV6LeanTrim: false,
      uiV6PerJourney: false,
      uiV6Polish: false,
    });
  });
});
