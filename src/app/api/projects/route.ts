import { NextRequest, NextResponse } from 'next/server';

import { projectCreateSchema } from '@/features/projects/project.schema';
import { createProject, listProjects } from '@/features/projects/project.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // LO-03: gate at viewer (matches the people register pattern) — keeps
    // session-without-role users from reading project metadata.
    const { orgId } = await requireRole('viewer');
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
    // RV-02: ARCHITECTURE.md §6 reserves CUD on the projects register for
    // admins. Previous `planner` check exposed project creation to any
    // planner regardless of admin role.
    const { orgId } = await requireRole('admin');
    const body = await request.json();
    const data = projectCreateSchema.parse(body);
    const project = await createProject(orgId, data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
