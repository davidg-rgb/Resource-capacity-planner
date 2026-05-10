// v5.0 — Phase 38 / Plan 38-02 (TC-API-030): POST /api/v5/imports/parse
//
// Multipart upload of an .xlsx workbook → import_sessions row (status=staged).
// Returns sessionId + parse summary so the client can call /preview next.

import { NextRequest, NextResponse } from 'next/server';

import { parseAndStageActuals } from '@/features/import/actuals-import.service';
import { ERR_UNSUPPORTED_FILE_TYPE } from '@/features/import/actuals-import.types';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';
import { env } from '@/lib/env';
import { ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireRole('planner');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      throw new ValidationError('No file provided', ERR_UNSUPPORTED_FILE_TYPE);
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx') {
      throw new ValidationError(
        'Unsupported file type. Only .xlsx is supported.',
        ERR_UNSUPPORTED_FILE_TYPE,
        { received: ext ?? '(none)' },
      );
    }
    // MED-11: honor IMPORT_MAX_FILE_SIZE_MB env var (default 10MB).
    const maxBytes = env.IMPORT_MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new ValidationError(
        `File exceeds ${env.IMPORT_MAX_FILE_SIZE_MB}MB limit`,
        'PAYLOAD_TOO_LARGE',
      );
    }

    const buffer = await file.arrayBuffer();
    const result = await parseAndStageActuals({
      orgId,
      fileBuffer: buffer,
      fileName: file.name,
      userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
