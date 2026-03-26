import { NextRequest, NextResponse } from 'next/server';

import { departmentCreateSchema } from '@/features/departments/department.schema';
import { createDepartment, listDepartments } from '@/features/departments/department.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId, requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const orgId = await getTenantId();
    const departments = await listDepartments(orgId);
    return NextResponse.json({ departments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireRole('admin');
    const body = await request.json();
    const data = departmentCreateSchema.parse(body);
    const department = await createDepartment(orgId, data);
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
