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

  // LO-07: avoid logging the full error object. Drizzle/postgres-driver
  // errors stringify the connection string in their `cause` chain, leaking
  // DATABASE_URL credentials into the log stream. We keep enough to debug
  // (message + stack) and drop the rest.
  const safe =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: String(error) };
  console.error('Unhandled API error', safe);
  return NextResponse.json(
    { error: { code: 'ERR_INTERNAL', message: 'Internal server error' } },
    { status: 500 },
  );
}
