import { NextResponse } from 'next/server';
import { ZodError } from 'zod/v4';

import { AppError, ConflictError, ValidationError } from './errors';

/**
 * Converts an unknown error into a structured NextResponse.
 * Handles AppError subclasses, Zod validation errors, and Postgres unique violations.
 */
export function handleApiError(error: unknown): NextResponse {
  // Known application errors
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError('Validation failed', {
      fields: error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return NextResponse.json(validationError.toJSON(), { status: 400 });
  }

  // Postgres unique_violation (code 23505)
  if (
    error instanceof Error &&
    'code' in error &&
    (error as Record<string, unknown>).code === '23505'
  ) {
    const conflict = new ConflictError('A record with this value already exists');
    return NextResponse.json(conflict.toJSON(), { status: 409 });
  }

  // Postgres foreign_key_violation (code 23503)
  if (
    error instanceof Error &&
    'code' in error &&
    (error as Record<string, unknown>).code === '23503'
  ) {
    const conflict = new ConflictError('Cannot delete: this record is referenced by other data');
    return NextResponse.json(conflict.toJSON(), { status: 409 });
  }

  // Unknown errors — log and return generic 500
  console.error('Unhandled API error:', error);
  return NextResponse.json({ error: 'ERR_INTERNAL', message: 'Internal server error' }, { status: 500 });
}
