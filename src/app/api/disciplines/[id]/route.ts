import { NextRequest, NextResponse } from 'next/server';

import { disciplineUpdateSchema } from '@/features/disciplines/discipline.schema';
import {
  deleteDiscipline,
  getDisciplineById,
  getDisciplineUsageCount,
  updateDiscipline,
} from '@/features/disciplines/discipline.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId, requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const discipline = await getDisciplineById(orgId, id);
    const usageCount = await getDisciplineUsageCount(orgId, id);
    return NextResponse.json({ discipline, usageCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    const body = await request.json();
    const data = disciplineUpdateSchema.parse(body);
    const discipline = await updateDiscipline(orgId, id, data);
    return NextResponse.json({ discipline });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    await deleteDiscipline(orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
