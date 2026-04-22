// Phase 47-04: E2E seed helper.
//
// `seedDb(request)` POSTs to `/api/test/seed`, the test-only route that
// truncates all application tables and reloads the deterministic bundle
// from `tests/fixtures/seed.ts` (Phase 44-14). Call in `beforeEach` of
// every spec that mutates data — safe to call in read-only specs too,
// it's idempotent and typically runs in well under 500ms.
//
// Uses the Playwright APIRequestContext so the call is issued by the
// webServer Playwright manages (which has the real drizzle connection
// to the nc_e2e database). Does NOT hit e2e/lib/db.ts — that module is
// for globalSetup (migrate + top-level reset), this one is per-spec.
//
// Phase 52-01 Task 3: the seed route also inserts a platform admin row
// and `{ organization_id: E2E_ORG_ID, flag_name: 'uiV6PerJourney',
// enabled: true }` into `feature_flags` so every journey spec starts
// with the Phase 52 flag ON. Toggling the flag off mid-spec (for the
// flag-off parity invariant) is done via direct `UPDATE feature_flags`
// — that DB helper is added in Plan 05 when the parity spec gets its
// richer assertions.
//
// Phase 53-01 Task 3: the seed route additionally inserts
// `{ flag_name: 'uiV6Polish', enabled: true }` so Phase 53 chrome-polish
// journey behaviour is on by default. Specs that want flag-off behaviour
// (the _diagnostic spec + Plan 05 flag-off parity) flip it via
// `setPolishFlag(request, false)` in `e2e/helpers/flag-toggle.ts`.

import type { APIRequestContext, Page } from '@playwright/test';

/**
 * Reset the E2E database to the deterministic seed bundle.
 *
 * Throws with the response body on non-2xx so spec failures surface the
 * actual cause (e.g. "404" means E2E_SEED_ENABLED was not set on the
 * webServer).
 */
export async function seedDb(request: APIRequestContext): Promise<void> {
  const res = await request.post('/api/test/seed', {});
  if (!res.ok()) {
    const body = await res.text().catch(() => '(no body)');
    throw new Error(
      `[e2e] seedDb failed: ${res.status()} ${res.statusText()} — ${body}`,
    );
  }
}

/**
 * Convenience overload that accepts a `Page` instead of its request context.
 * Equivalent to `seedDb(page.request)`.
 */
export async function seedDbForPage(page: Page): Promise<void> {
  return seedDb(page.request);
}
