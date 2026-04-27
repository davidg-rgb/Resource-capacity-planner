/**
 * Phase 44 Plan 04 — Error wire format invariant (API-V5-01).
 *
 * For each of the 8 documented error codes (see src/lib/errors/codes.ts),
 * assert that throwing the matching AppError subclass through
 * handleApiError() produces a flat JSON body of shape
 * `{ error: '<CODE>', message: string, details?: object }` at the
 * documented HTTP status.
 *
 * Wave B step 1: locks in Wave A (44-01 taxonomy extension + 44-02 sweep).
 * Every test title starts with a `TC-INV-ERRWIRE-NNN` token so the Wave C
 * manifest generator (44-06) picks them up.
 *
 * -----------------------------------------------------------------------
 * Naming note (deviation from 44-04-PLAN.md, Rule 3 — blocking issue):
 *
 * The plan asked for `TC-NEG-NNN ...` test titles. However the
 * `TC-NEG-*` ID space is already owned by ARCHITECTURE §15.14 / §15.21
 * as NEGATIVE-SPACE assertions ("no task_id column", "no counter-propose
 * endpoint", "no external notifications"). Those 14 IDs do NOT describe
 * error wire format — they describe features the v5.0 build intentionally
 * does NOT have. Reusing TC-NEG-* here would collide with the existing
 * semantics and confuse the Wave C manifest diff against §15.
 *
 * Instead, we use the parallel `TC-INV-ERRWIRE-*` namespace, matching the
 * `TC-INV-ERRTAX` pattern already established by 44-01's static taxonomy
 * invariant (tests/invariants/error-taxonomy.static.test.ts). Wave C will
 * still pick these up as TC-INV-* invariants, and the wire-format promise
 * of API-V5-01 is still locked in at the same strength.
 * -----------------------------------------------------------------------
 */

import { describe, it, expect } from 'vitest';

import { handleApiError } from '@/lib/api-utils';
import {
  AuthError,
  BadHoursError,
  BatchAlreadyRolledBackError,
  DependentRowsExistError,
  ForbiddenError,
  HistoricConfirmRequiredError,
  NotFoundError,
  PayloadTooLargeError,
  ProposalNotActiveError,
  ReasonRequiredError,
  RollbackWindowExpiredError,
  UsWeekHeadersError,
  ValidationError,
} from '@/lib/errors';
import {
  HISTORIC_CONFIRM_REQUIRED,
  BAD_HOURS,
  PROPOSAL_NOT_ACTIVE,
  REASON_REQUIRED,
  BATCH_ALREADY_ROLLED_BACK,
  ROLLBACK_WINDOW_EXPIRED,
  DEPENDENT_ROWS_EXIST,
  ERR_US_WEEK_HEADERS,
  type DocumentedErrorCode,
} from '@/lib/errors/codes';

interface WireCase {
  tcId: string;
  make: () => Error;
  code: DocumentedErrorCode;
  status: number;
}

const cases: WireCase[] = [
  {
    tcId: 'TC-INV-ERRWIRE-001',
    make: () => new HistoricConfirmRequiredError(undefined, { date: '2025-12-31' }),
    code: HISTORIC_CONFIRM_REQUIRED,
    status: 409,
  },
  {
    tcId: 'TC-INV-ERRWIRE-002',
    make: () => new BadHoursError(undefined, { hours: 99 }),
    code: BAD_HOURS,
    status: 400,
  },
  {
    tcId: 'TC-INV-ERRWIRE-003',
    make: () => new ProposalNotActiveError(undefined, { proposalId: 'prop_x' }),
    code: PROPOSAL_NOT_ACTIVE,
    status: 409,
  },
  {
    tcId: 'TC-INV-ERRWIRE-004',
    make: () => new ReasonRequiredError(undefined, { action: 'rollback' }),
    code: REASON_REQUIRED,
    status: 400,
  },
  {
    tcId: 'TC-INV-ERRWIRE-005',
    make: () => new BatchAlreadyRolledBackError(undefined, { batchId: 'b_1' }),
    code: BATCH_ALREADY_ROLLED_BACK,
    status: 409,
  },
  {
    tcId: 'TC-INV-ERRWIRE-006',
    make: () => new RollbackWindowExpiredError(undefined, { batchId: 'b_1' }),
    code: ROLLBACK_WINDOW_EXPIRED,
    status: 409,
  },
  {
    tcId: 'TC-INV-ERRWIRE-007',
    make: () => new DependentRowsExistError(undefined, { table: 'projects' }),
    code: DEPENDENT_ROWS_EXIST,
    status: 409,
  },
  {
    tcId: 'TC-INV-ERRWIRE-008',
    make: () => new UsWeekHeadersError(undefined, { row: 1 }),
    code: ERR_US_WEEK_HEADERS,
    status: 400,
  },
];

describe('API-V5-01 error wire format', () => {
  it('covers all 8 documented error codes', () => {
    const covered = new Set(cases.map((c) => c.code));
    expect(covered.size).toBe(8);
    expect(covered).toEqual(
      new Set([
        HISTORIC_CONFIRM_REQUIRED,
        BAD_HOURS,
        PROPOSAL_NOT_ACTIVE,
        REASON_REQUIRED,
        BATCH_ALREADY_ROLLED_BACK,
        ROLLBACK_WINDOW_EXPIRED,
        DEPENDENT_ROWS_EXIST,
        ERR_US_WEEK_HEADERS,
      ]),
    );
  });

  for (const c of cases) {
    it(`${c.tcId} ${c.code} returns status ${c.status} with nested wire shape`, async () => {
      const res = handleApiError(c.make());

      expect(res.status).toBe(c.status);

      const body = (await res.json()) as {
        error: { code: string; message: string; details?: Record<string, unknown> };
      };

      // Nested shape per §11.1: { error: { code, message, details? } }.
      expect(body.error.code).toBe(c.code);
      expect(typeof body.error.message).toBe('string');
      expect(body.error.message.length).toBeGreaterThan(0);
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');

      // Guard: the top-level key is exactly { error }.
      const keys = Object.keys(body).sort();
      expect(keys).toEqual(['error']);
    });
  }
});

// ---------------------------------------------------------------------------
// R2-P0-01 — Round 2 Phase 2: error shape reconciliation across 7 legacy routes
// ---------------------------------------------------------------------------
//
// The following routes were migrated from the legacy flat
// `{ error: 'string' }` shape to throwing AppError subclasses so they flow
// through handleApiError() and emit the canonical nested
// `{ error: { code, message, details? } }` shape.
//
// We assert the wire shape per error class — same invariant guards as the
// documented-error cases above (status, code, message, top-level keys).
// ---------------------------------------------------------------------------

interface RouteCase {
  tcId: string;
  route: string;
  make: () => Error;
  expectedCode: string;
  expectedStatus: number;
}

const routeCases: RouteCase[] = [
  // src/app/api/analytics/alerts/route.ts:14 — flag-disabled
  {
    tcId: 'TC-INV-ERRWIRE-R2-001',
    route: 'GET /api/analytics/alerts (flag off)',
    make: () => new ForbiddenError('Feature not enabled'),
    expectedCode: 'ERR_FORBIDDEN',
    expectedStatus: 403,
  },
  // src/app/api/analytics/alerts/count/route.ts:14 — flag-disabled
  {
    tcId: 'TC-INV-ERRWIRE-R2-002',
    route: 'GET /api/analytics/alerts/count (flag off)',
    make: () => new ForbiddenError('Feature not enabled'),
    expectedCode: 'ERR_FORBIDDEN',
    expectedStatus: 403,
  },
  // src/app/api/reports/team-heatmap/route.tsx:33 — flag-disabled (404)
  {
    tcId: 'TC-INV-ERRWIRE-R2-003',
    route: 'GET /api/reports/team-heatmap (flag off)',
    make: () => new NotFoundError('feature', 'pdfExport'),
    expectedCode: 'ERR_NOT_FOUND',
    expectedStatus: 404,
  },
  // src/app/api/import/upload/route.ts:23 — no file
  {
    tcId: 'TC-INV-ERRWIRE-R2-004',
    route: 'POST /api/import/upload (no file)',
    make: () => new ValidationError('No file provided'),
    expectedCode: 'ERR_VALIDATION',
    expectedStatus: 400,
  },
  // src/app/api/import/upload/route.ts:28 — file too large
  {
    tcId: 'TC-INV-ERRWIRE-R2-005',
    route: 'POST /api/import/upload (>10MB)',
    make: () => new PayloadTooLargeError('File exceeds 10MB limit'),
    expectedCode: 'ERR_PAYLOAD_TOO_LARGE',
    expectedStatus: 413,
  },
  // src/app/api/import/upload/route.ts:62 — bad extension
  {
    tcId: 'TC-INV-ERRWIRE-R2-006',
    route: 'POST /api/import/upload (bad ext)',
    make: () => new ValidationError('Unsupported file type. Use .xlsx, .xls, or .csv'),
    expectedCode: 'ERR_VALIDATION',
    expectedStatus: 400,
  },
  // src/app/api/scenarios/route.ts:24,38 — not authenticated
  {
    tcId: 'TC-INV-ERRWIRE-R2-007',
    route: 'GET|POST /api/scenarios (no userId)',
    make: () => new AuthError(),
    expectedCode: 'ERR_AUTH',
    expectedStatus: 401,
  },
  // src/app/api/scenarios/[id]/route.ts:41,57 — not authenticated
  {
    tcId: 'TC-INV-ERRWIRE-R2-008',
    route: 'PATCH|DELETE /api/scenarios/:id (no userId)',
    make: () => new AuthError(),
    expectedCode: 'ERR_AUTH',
    expectedStatus: 401,
  },
  // src/app/api/platform/tenants/[orgId]/purge/route.ts:21 — confirmName missing
  {
    tcId: 'TC-INV-ERRWIRE-R2-009',
    route: 'POST /api/platform/tenants/:orgId/purge (no confirmName)',
    make: () => new ValidationError('Confirmation name is required'),
    expectedCode: 'ERR_VALIDATION',
    expectedStatus: 400,
  },
  // src/app/api/platform/tenants/[orgId]/purge/route.ts:27 — confirmName mismatch
  {
    tcId: 'TC-INV-ERRWIRE-R2-010',
    route: 'POST /api/platform/tenants/:orgId/purge (mismatch)',
    make: () => new ValidationError('Confirmation name does not match'),
    expectedCode: 'ERR_VALIDATION',
    expectedStatus: 400,
  },
];

describe('R2-P0-01 reconciled error wire format on 7 legacy routes', () => {
  for (const c of routeCases) {
    it(`${c.tcId} ${c.route} → status ${c.expectedStatus} with nested wire shape`, async () => {
      const res = handleApiError(c.make());
      expect(res.status).toBe(c.expectedStatus);

      const body = (await res.json()) as {
        error: { code: string; message: string; details?: Record<string, unknown> };
      };

      expect(body.error.code).toBe(c.expectedCode);
      expect(typeof body.error.message).toBe('string');
      expect(body.error.message.length).toBeGreaterThan(0);

      // Top-level keys must be exactly { error } (no flat string).
      expect(Object.keys(body).sort()).toEqual(['error']);
    });
  }
});
