import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import {
  archiveRegisterRow,
  createRegisterRow,
  updateRegisterRow,
} from '@/features/admin/register.service';
import { NotFoundError } from '@/lib/errors';

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
export async function createDepartment(orgId: string, actorUserId: string, data: DepartmentCreate) {
  return createRegisterRow({
    orgId,
    actorUserId,
    entity: 'department',
    data,
  });
}

/**
 * Update an existing department. Only provided fields are changed.
 * Throws NotFoundError if department not found or not in org.
 */
export async function updateDepartment(
  orgId: string,
  actorUserId: string,
  id: string,
  data: DepartmentUpdate,
) {
  return updateRegisterRow({
    orgId,
    actorUserId,
    entity: 'department',
    id,
    data,
  });
}

/**
 * Archive a department. The dependent-row blocker (assigned people) is enforced
 * by archiveRegisterRow.collectBlockers, which throws ConflictError(
 * 'DEPENDENT_ROWS_EXIST', { entity, id, blockers }) instead of the legacy
 * usageCount shape. Throws NotFoundError if department not found or not in org.
 */
export async function deleteDepartment(orgId: string, actorUserId: string, id: string) {
  return archiveRegisterRow({
    orgId,
    actorUserId,
    entity: 'department',
    id,
  });
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
