import { NextRequest, NextResponse } from 'next/server';

import { personCreateSchema } from '@/features/people/person.schema';
import { createPerson, listPeople } from '@/features/people/person.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId, requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const { searchParams } = request.nextUrl;

    const filters = {
      departmentId: searchParams.get('departmentId') ?? undefined,
      disciplineId: searchParams.get('disciplineId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    };

    const people = await listPeople(orgId, filters);
    return NextResponse.json({ people });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const body = await request.json();
    const data = personCreateSchema.parse(body);
    const person = await createPerson(orgId, data);
    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
