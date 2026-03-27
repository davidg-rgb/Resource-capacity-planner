import { NextRequest, NextResponse } from 'next/server';

import { parseExcelBuffer, autoDetectMappings } from '@/features/import/import.utils';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';

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
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // D-15: max 10MB file size
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File exceeds 10MB limit' },
        { status: 400 },
      );
    }

    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use .xlsx, .xls, or .csv' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // D-16: pass optional codepage from query param for manual override
    const codepageParam = request.nextUrl.searchParams.get('codepage');
    const codepage = codepageParam ? Number(codepageParam) : undefined;

    const parsedFile = parseExcelBuffer(buffer, codepage);
    const mappings = autoDetectMappings(parsedFile.headers);

    // Exclude allRows from response (only send preview)
    void orgId; // orgId validated but not needed for parsing
    return NextResponse.json({
      headers: parsedFile.headers,
      sampleRows: parsedFile.sampleRows,
      totalRows: parsedFile.totalRows,
      formatInfo: parsedFile.formatInfo,
      sheetName: parsedFile.sheetName,
      encodingWarning: parsedFile.encodingWarning,
      suggestedMappings: mappings,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
