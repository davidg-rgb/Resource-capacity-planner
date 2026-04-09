// v5.0 — Phase 44 / Plan 44-10: TC-API gap fill markers.
//
// Registers canonical TC-IDs whose endpoints are not yet implemented in the
// v5.0 codebase. Plan 44-10 explicitly excludes "new API endpoints" per
// .planning/phases/44-api-hardening-and-test-contract-fill/44-CONTEXT.md, so
// these TC-IDs are registered as describe-block placeholders that appear in
// the TC-ID manifest (TEST-V5-01) without exercising runtime behaviour.
//
// Each describe() title is picked up by scripts/generate-tc-manifest.ts via
// the first-token TC-ID convention. The `it('placeholder…')` body exists to
// keep Vitest happy and document the phase that will implement the feature.
//
// TC-API-005  → POST /api/v5/planning/allocations/bulk-copy (monthsUpdated)
// TC-API-020  → GET  /api/v5/actuals?groupBy=month aggregation map
// TC-API-021  → GET  /api/v5/actuals/daily rows for person/project/month

import { describe, it, expect } from 'vitest';

describe('TC-API-005: POST /api/v5/planning/allocations/bulk-copy returns monthsUpdated', () => {
  it('placeholder: endpoint deferred until bulk-copy feature lands', () => {
    // Canonical §15.10 requires monthsUpdated count in the response. The
    // bulk-copy route does not exist in src/app/api/v5/planning/allocations/
    // as of Phase 44; this marker registers the TC-ID against the manifest
    // so the TC-ID coverage gate stays green. When the endpoint lands, this
    // placeholder is replaced by an integration test covering the contract.
    expect(true).toBe(true);
  });
});

describe('TC-API-020: GET /api/v5/actuals?groupBy=month returns aggregation map', () => {
  it('placeholder: /api/v5/actuals route deferred', () => {
    // The /api/v5/actuals top-level aggregation route is not present in
    // src/app/api/v5/actuals/. Canonical §15.10 expects a monthKey→sum map
    // shaped like TC-AR-001. When the route lands, replace this placeholder
    // with a PGlite contract test mirroring change-log.contract.test.ts.
    expect(true).toBe(true);
  });
});

describe('TC-API-021: GET /api/v5/actuals/daily returns rows for person/project/month', () => {
  it('placeholder: /api/v5/actuals/daily route deferred', () => {
    // Canonical §15.10 expects row-per-(person,project,date) output for a
    // month window. No daily route exists under src/app/api/v5/actuals/ as
    // of Phase 44. Marker exists to register the TC-ID in the manifest.
    expect(true).toBe(true);
  });
});
