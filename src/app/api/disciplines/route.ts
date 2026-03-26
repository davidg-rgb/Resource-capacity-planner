import { NextRequest, NextResponse } from 'next/server';

import { disciplineCreateSchema } from '@/features/disciplines/discipline.schema';
import { createDiscipline, listDisciplines } from '@/features/disciplines/discipline.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId, requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const orgId = await getTenantId();
    const disciplines = await listDisciplines(orgId);
    return NextResponse.json({ disciplines });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireRole('admin');
    const body = await request.json();
    const data = disciplineCreateSchema.parse(body);
    const discipline = await createDiscipline(orgId, data);
    return NextResponse.json({ discipline }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
