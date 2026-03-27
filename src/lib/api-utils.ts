import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { AppError } from './errors';

/**
 * Convert an error to a proper HTTP response.
 * Handles AppError (with status codes), ZodError (422), and unknown errors (500).
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'ERR_VALIDATION',
        message: 'Validation failed',
        details: { fields: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) },
      },
      { status: 422 },
    );
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json(
    { error: 'ERR_INTERNAL', message: 'Internal server error' },
    { status: 500 },
  );
}
