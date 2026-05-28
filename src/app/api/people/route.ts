import { NextRequest, NextResponse } from 'next/server';

import { personCreateSchema } from '@/features/people/person.schema';
import { createPerson, listPeople, listPeopleWithStatus } from '@/features/people/person.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // audit-r2 / D-CR-107: gate read access behind the lowest role tier
    // (`viewer`). getTenantId() alone proves session + org membership but
    // does NOT prove a role assignment — a session without a role would
    // otherwise read the people register. requireRole('viewer') closes
    // that gap and returns the same orgId for the rest of the handler.
    const { orgId } = await requireRole('viewer');
    const { searchParams } = request.nextUrl;

    const filters = {
      departmentId: searchParams.get('departmentId') ?? undefined,
      disciplineId: searchParams.get('disciplineId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    };

    const withStatus = searchParams.get('withStatus') === 'true';

    if (withStatus) {
      const people = await listPeopleWithStatus(orgId, filters);
      return NextResponse.json({ people });
    }

    const people = await listPeople(orgId, filters);
    return NextResponse.json({ people });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // RV-02: ARCHITECTURE.md §6 reserves CUD on the people register for
    // admins. The previous `planner` role check leaked write access to
    // any planner regardless of admin role.
    const { orgId, userId } = await requireRole('admin');
    const body = await request.json();
    const data = personCreateSchema.parse(body);
    const person = await createPerson(orgId, userId, data);
    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
