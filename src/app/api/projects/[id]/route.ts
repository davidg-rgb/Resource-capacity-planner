import { NextRequest, NextResponse } from 'next/server';

import { projectUpdateSchema } from '@/features/projects/project.schema';
import {
  archiveProject,
  getProjectById,
  updateProject,
} from '@/features/projects/project.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId, requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const project = await getProjectById(orgId, id);
    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireRole('planner');
    const { id } = await params;
    const body = await request.json();
    const data = projectUpdateSchema.parse(body);
    const project = await updateProject(orgId, id, data);
    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    await archiveProject(orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
