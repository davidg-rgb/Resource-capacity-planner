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
