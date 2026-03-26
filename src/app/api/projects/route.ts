import { NextRequest, NextResponse } from 'next/server';

import { projectCreateSchema } from '@/features/projects/project.schema';
import { createProject, listProjects } from '@/features/projects/project.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId, requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const { searchParams } = request.nextUrl;

    const filters = {
      programId: searchParams.get('programId') ?? undefined,
      status: searchParams.get('status') as 'active' | 'planned' | 'archived' | undefined,
      search: searchParams.get('search') ?? undefined,
    };

    const projects = await listProjects(orgId, filters);
    return NextResponse.json({ projects });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const body = await request.json();
    const data = projectCreateSchema.parse(body);
    const project = await createProject(orgId, data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
