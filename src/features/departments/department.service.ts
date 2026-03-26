import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { withTenant } from '@/lib/tenant';

import type { DepartmentCreate, DepartmentUpdate } from './department.types';

/**
 * List all departments for an organization, ordered by name.
 */
export async function listDepartments(orgId: string) {
  return db
    .select()
    .from(schema.departments)
    .where(eq(schema.departments.organizationId, orgId))
    .orderBy(schema.departments.name);
}

/**
 * Get a single department by ID, scoped to the organization.
 * Throws NotFoundError if not found.
 */
export async function getDepartmentById(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(schema.departments)
    .where(and(eq(schema.departments.id, id), eq(schema.departments.organizationId, orgId)));

  if (rows.length === 0) {
    throw new NotFoundError('Department', id);
  }
  return rows[0];
}

/**
 * Create a new department scoped to the organization.
 */
export async function createDepartment(orgId: string, data: DepartmentCreate) {
  const rows = await withTenant(orgId)
    .insertDepartment({
      name: data.name,
    })
    .returning();
  return rows[0];
}

/**
 * Update an existing department. Only provided fields are changed.
 * Throws NotFoundError if department not found or not in org.
 */
export async function updateDepartment(orgId: string, id: string, data: DepartmentUpdate) {
  const rows = await withTenant(orgId)
    .updateDepartment(id, data)
    .returning();

  if (rows.length === 0) {
    throw new NotFoundError('Department', id);
  }
  return rows[0];
}

/**
 * Delete a department. Checks usage count first and throws ConflictError if in use.
 * Throws NotFoundError if department not found or not in org.
 */
export async function deleteDepartment(orgId: string, id: string) {
  const count = await getDepartmentUsageCount(orgId, id);
  if (count > 0) {
    throw new ConflictError(`Cannot delete department: ${count} people are assigned to it`, {
      usageCount: count,
    });
  }

  const rows = await withTenant(orgId).deleteDepartment(id).returning();

  if (rows.length === 0) {
    throw new NotFoundError('Department', id);
  }
  return rows[0];
}

/**
 * Count active (non-archived) people assigned to this department.
 */
export async function getDepartmentUsageCount(orgId: string, id: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, orgId),
        eq(schema.people.departmentId, id),
        isNull(schema.people.archivedAt),
      ),
    );
  return Number(result[0].count);
}
