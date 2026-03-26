import { NextRequest, NextResponse } from 'next/server';

import { programUpdateSchema } from '@/features/programs/program.schema';
import {
  deleteProgram,
  getProgramById,
  getProgramUsageCount,
  updateProgram,
} from '@/features/programs/program.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId, requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const program = await getProgramById(orgId, id);
    const usageCount = await getProgramUsageCount(orgId, id);
    return NextResponse.json({ program, usageCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    const body = await request.json();
    const data = programUpdateSchema.parse(body);
    const program = await updateProgram(orgId, id, data);
    return NextResponse.json({ program });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    await deleteProgram(orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
