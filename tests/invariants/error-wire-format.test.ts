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
  HistoricConfirmRequiredError,
  BadHoursError,
  ProposalNotActiveError,
  ReasonRequiredError,
  BatchAlreadyRolledBackError,
  RollbackWindowExpiredError,
  DependentRowsExistError,
  UsWeekHeadersError,
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
