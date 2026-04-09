/**
 * v5.0 / Phase 44 — single barrel of documented AppError code constants.
 *
 * Every `/api/v5/*` endpoint must return one of these 8 codes on error
 * (API-V5-01). TC-NEG-* tests assert the wire format uses these exact
 * string literals.
 */

export const HISTORIC_CONFIRM_REQUIRED = 'HISTORIC_CONFIRM_REQUIRED' as const;
export const BAD_HOURS = 'BAD_HOURS' as const;
export const PROPOSAL_NOT_ACTIVE = 'PROPOSAL_NOT_ACTIVE' as const;
export const REASON_REQUIRED = 'REASON_REQUIRED' as const;
export const BATCH_ALREADY_ROLLED_BACK = 'BATCH_ALREADY_ROLLED_BACK' as const;
export const ROLLBACK_WINDOW_EXPIRED = 'ROLLBACK_WINDOW_EXPIRED' as const;
export const DEPENDENT_ROWS_EXIST = 'DEPENDENT_ROWS_EXIST' as const;
export const ERR_US_WEEK_HEADERS = 'ERR_US_WEEK_HEADERS' as const;

export type DocumentedErrorCode =
  | typeof HISTORIC_CONFIRM_REQUIRED
  | typeof BAD_HOURS
  | typeof PROPOSAL_NOT_ACTIVE
  | typeof REASON_REQUIRED
  | typeof BATCH_ALREADY_ROLLED_BACK
  | typeof ROLLBACK_WINDOW_EXPIRED
  | typeof DEPENDENT_ROWS_EXIST
  | typeof ERR_US_WEEK_HEADERS;
