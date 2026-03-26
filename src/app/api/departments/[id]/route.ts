import { NextRequest, NextResponse } from 'next/server';

import { departmentUpdateSchema } from '@/features/departments/department.schema';
import {
  deleteDepartment,
  getDepartmentById,
  getDepartmentUsageCount,
  updateDepartment,
} from '@/features/departments/department.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId, requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const department = await getDepartmentById(orgId, id);
    const usageCount = await getDepartmentUsageCount(orgId, id);
    return NextResponse.json({ department, usageCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    const body = await request.json();
    const data = departmentUpdateSchema.parse(body);
    const department = await updateDepartment(orgId, id, data);
    return NextResponse.json({ department });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireRole('admin');
    const { id } = await params;
    await deleteDepartment(orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
