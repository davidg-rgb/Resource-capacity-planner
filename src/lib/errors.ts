export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

export const ERR_HOLIDAY_YEAR_OUT_OF_RANGE = 'ERR_HOLIDAY_YEAR_OUT_OF_RANGE';

export class ValidationError extends AppError {
  constructor(
    message: string,
    detailsOrCode?: { fields: Array<{ field: string; message: string }> } | string,
    maybeDetails?: Record<string, unknown>,
  ) {
    // Two call shapes supported:
    //   new ValidationError(message, { fields: [...] })             — legacy
    //   new ValidationError(message, 'ERR_CUSTOM_CODE', details?)   — custom error code
    const isCodeForm = typeof detailsOrCode === 'string';
    const code = isCodeForm ? (detailsOrCode as string) : 'ERR_VALIDATION';
    const details = isCodeForm
      ? maybeDetails
      : (detailsOrCode as Record<string, unknown> | undefined);
    super(message, code, 400, details);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 'ERR_AUTH', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'ERR_FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, 'ERR_NOT_FOUND', 404, { resource, id });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERR_CONFLICT', 409, details);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large') {
    super(message, 'ERR_PAYLOAD_TOO_LARGE', 413);
  }
}

export const ERR_PROPOSAL_NOT_ACTIVE = 'PROPOSAL_NOT_ACTIVE';

/**
 * v5.0 — Phase 39 / PROP-05: thrown when a caller tries to act on a
 * proposal that is no longer in the 'proposed' state (already approved,
 * rejected, withdrawn, or superseded). HTTP 409 Conflict.
 */
export class ProposalNotActiveError extends AppError {
  constructor(
    message = 'Proposal is no longer in proposed state',
    details?: Record<string, unknown>,
  ) {
    super(message, ERR_PROPOSAL_NOT_ACTIVE, 409, details);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 'ERR_INTERNAL', 500);
  }
}

// v5.0 / Phase 44 — 7 additional documented AppError subclasses required by
// API-V5-01. Codes re-exported via the ./errors/codes barrel.
import {
  HISTORIC_CONFIRM_REQUIRED,
  BAD_HOURS,
  REASON_REQUIRED,
  BATCH_ALREADY_ROLLED_BACK,
  ROLLBACK_WINDOW_EXPIRED,
  DEPENDENT_ROWS_EXIST,
  ERR_US_WEEK_HEADERS,
} from './errors/codes';

export class HistoricConfirmRequiredError extends AppError {
  constructor(
    message = 'Historic edit requires explicit confirmation',
    details?: Record<string, unknown>,
  ) {
    super(message, HISTORIC_CONFIRM_REQUIRED, 409, details);
  }
}

export class BadHoursError extends AppError {
  constructor(message = 'Hours value out of allowed range', details?: Record<string, unknown>) {
    super(message, BAD_HOURS, 400, details);
  }
}

export class ReasonRequiredError extends AppError {
  constructor(message = 'A reason is required for this action', details?: Record<string, unknown>) {
    super(message, REASON_REQUIRED, 400, details);
  }
}

export class BatchAlreadyRolledBackError extends AppError {
  constructor(
    message = 'Import batch has already been rolled back',
    details?: Record<string, unknown>,
  ) {
    super(message, BATCH_ALREADY_ROLLED_BACK, 409, details);
  }
}

export class RollbackWindowExpiredError extends AppError {
  constructor(
    message = 'Rollback window has expired for this batch',
    details?: Record<string, unknown>,
  ) {
    super(message, ROLLBACK_WINDOW_EXPIRED, 409, details);
  }
}

export class DependentRowsExistError extends AppError {
  constructor(message = 'Cannot archive: dependent rows exist', details?: Record<string, unknown>) {
    super(message, DEPENDENT_ROWS_EXIST, 409, details);
  }
}

export class UsWeekHeadersError extends AppError {
  constructor(
    message = 'Excel import uses US week headers instead of ISO 8601',
    details?: Record<string, unknown>,
  ) {
    super(message, ERR_US_WEEK_HEADERS, 400, details);
  }
}
