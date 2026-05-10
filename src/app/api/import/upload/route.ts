import { NextRequest, NextResponse } from 'next/server';

import { parseExcelBuffer, autoDetectMappings } from '@/features/import/import.utils';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';
import { env } from '@/lib/env';
import { PayloadTooLargeError, ValidationError } from '@/lib/errors';

/**
 * POST /api/import/upload
 *
 * Receives a file via FormData, parses it with SheetJS, and returns
 * headers + preview rows + suggested column mappings.
 *
 * Requires planner role minimum (import modifies allocation data).
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');

    const formData = await request.formData();
    const fileRaw = formData.get('file');
    // MED-07: a multipart field named 'file' can be either a File or a plain
    // string. `as File | null` cast lied to TS; if a client sent a string
    // value the subsequent file.size access returned undefined (>maxBytes
    // check passed) and file.arrayBuffer() then threw TypeError → 500.
    if (!fileRaw || !(fileRaw instanceof File)) {
      throw new ValidationError('No file provided');
    }
    const file = fileRaw;

    // D-15: max file size from IMPORT_MAX_FILE_SIZE_MB (default 10MB, MED-11).
    const maxBytes = env.IMPORT_MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new PayloadTooLargeError(`File exceeds ${env.IMPORT_MAX_FILE_SIZE_MB}MB limit`);
    }

    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      throw new ValidationError('Unsupported file type. Use .xlsx, .xls, or .csv');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // D-16: pass optional codepage from query param for manual override
    const codepageParam = request.nextUrl.searchParams.get('codepage');
    const codepage = codepageParam ? Number(codepageParam) : undefined;

    const parsedFile = parseExcelBuffer(buffer, codepage);
    const mappings = autoDetectMappings(parsedFile.headers);

    void orgId; // orgId validated but not needed for parsing
    return NextResponse.json({
      headers: parsedFile.headers,
      sampleRows: parsedFile.sampleRows,
      allRows: parsedFile.allRows,
      totalRows: parsedFile.totalRows,
      formatInfo: parsedFile.formatInfo,
      sheetName: parsedFile.sheetName,
      encodingWarning: parsedFile.encodingWarning,
      hiddenRowsSkipped: parsedFile.hiddenRowsSkipped,
      suggestedMappings: mappings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
