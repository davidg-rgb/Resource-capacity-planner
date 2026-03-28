import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { AppError, ValidationError } from './errors';

/**
 * Standard error handler for API routes.
 * Converts known error types to appropriate HTTP responses.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    const validationError = new ValidationError('Validation failed', {
      fields: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return NextResponse.json(validationError.toJSON(), { status: 400 });
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json(
    { error: 'ERR_INTERNAL', message: 'Internal server error' },
    { status: 500 },
  );
}
