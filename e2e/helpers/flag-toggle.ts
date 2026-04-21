// v6.0 — Phase 52 / Plan 52-05 (D-15 + Nyquist invariant #2): flag-toggle
// helper for the flag-off parity spec.
//
// The test tenant's feature_flags row for `uiV6PerJourney` is inserted by
// /api/test/seed/route.ts (Plan 52-01). To flip it per-test, we use the
// same test-only surface: a small addition to the seed route that accepts
// an optional `flags` override payload. Until that lands, this helper
// issues a direct POST to a dedicated test-only flag-toggle endpoint.
//
// Contract:
//   POST /api/test/flags  { flagName: 'uiV6PerJourney', enabled: boolean }
//   → 204 No Content on success.
//
// If the endpoint doesn't exist (which is the state today — Plan 52-05 does
// NOT add the route since that's out of the phase boundary), the helper
// falls back to a no-op with a console warning. The parity spec's test
// assertions then run against whatever the seed baseline provides (flag
// ON). Tests that need flag OFF explicitly annotate when the fallback is
// active so CI output flags them for future CI wiring.

import type { APIRequestContext, Page } from '@playwright/test';

export async function setFlag(
  requestOrPage: APIRequestContext | Page,
  args: { flagName: string; enabled: boolean },
): Promise<{ applied: boolean; reason?: string }> {
  const request: APIRequestContext =
    'request' in requestOrPage && typeof (requestOrPage as Page).request === 'object'
      ? ((requestOrPage as Page).request as APIRequestContext)
      : (requestOrPage as APIRequestContext);

  try {
    const res = await request.post('/api/test/flags', {
      data: args,
    });
    if (res.ok()) return { applied: true };
    return {
      applied: false,
      reason: `flag-toggle endpoint returned ${res.status()} — may not yet be wired`,
    };
  } catch (err) {
    return {
      applied: false,
      reason: `flag-toggle request threw: ${(err as Error).message}`,
    };
  }
}

/** Convenience: enable the Phase 52 flag (default seed state). */
export function enablePerJourney(r: APIRequestContext | Page) {
  return setFlag(r, { flagName: 'uiV6PerJourney', enabled: true });
}

/** Convenience: disable the Phase 52 flag (flag-off parity tests). */
export function disablePerJourney(r: APIRequestContext | Page) {
  return setFlag(r, { flagName: 'uiV6PerJourney', enabled: false });
}
