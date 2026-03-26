import { NextRequest, NextResponse } from 'next/server';

import { personUpdateSchema } from '@/features/people/person.schema';
import {
  deletePerson,
  getPersonById,
  updatePerson,
} from '@/features/people/person.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId, requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const person = await getPersonById(orgId, id);
    return NextResponse.json({ person });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireRole('planner');
    const { id } = await params;
    const body = await request.json();
    const data = personUpdateSchema.parse(body);
    const person = await updatePerson(orgId, id, data);
    return NextResponse.json({ person });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    await deletePerson(orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
