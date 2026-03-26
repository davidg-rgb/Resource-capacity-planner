import { NextRequest, NextResponse } from 'next/server';

import { programCreateSchema } from '@/features/programs/program.schema';
import { createProgram, listPrograms } from '@/features/programs/program.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId, requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const orgId = await getTenantId();
    const programs = await listPrograms(orgId);
    return NextResponse.json({ programs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireRole('admin');
    const body = await request.json();
    const data = programCreateSchema.parse(body);
    const program = await createProgram(orgId, data);
    return NextResponse.json({ program }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
