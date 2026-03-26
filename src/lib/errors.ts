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
      error: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: { fields: Array<{ field: string; message: string }> }) {
    super(message, 'ERR_VALIDATION', 400, details as Record<string, unknown>);
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

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 'ERR_INTERNAL', 500);
  }
}
