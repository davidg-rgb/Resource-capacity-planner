import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { withTenant } from '@/lib/tenant';

import type { DisciplineCreate, DisciplineUpdate } from './discipline.types';

/**
 * List all disciplines for an organization, ordered by name.
 */
export async function listDisciplines(orgId: string) {
  return db
    .select()
    .from(schema.disciplines)
    .where(eq(schema.disciplines.organizationId, orgId))
    .orderBy(schema.disciplines.name);
}

/**
 * Get a single discipline by ID, scoped to the organization.
 * Throws NotFoundError if not found.
 */
export async function getDisciplineById(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(schema.disciplines)
    .where(and(eq(schema.disciplines.id, id), eq(schema.disciplines.organizationId, orgId)));

  if (rows.length === 0) {
    throw new NotFoundError('Discipline', id);
  }
  return rows[0];
}

/**
 * Create a new discipline scoped to the organization.
 */
export async function createDiscipline(orgId: string, data: DisciplineCreate) {
  const rows = await withTenant(orgId)
    .insertDiscipline({
      name: data.name,
      abbreviation: data.abbreviation,
    })
    .returning();
  return rows[0];
}

/**
 * Update an existing discipline. Only provided fields are changed.
 * Throws NotFoundError if discipline not found or not in org.
 */
export async function updateDiscipline(orgId: string, id: string, data: DisciplineUpdate) {
  const rows = await withTenant(orgId)
    .updateDiscipline(id, data)
    .returning();

  if (rows.length === 0) {
    throw new NotFoundError('Discipline', id);
  }
  return rows[0];
}

/**
 * Delete a discipline. Checks usage count first and throws ConflictError if in use.
 * Throws NotFoundError if discipline not found or not in org.
 */
export async function deleteDiscipline(orgId: string, id: string) {
  const count = await getDisciplineUsageCount(orgId, id);
  if (count > 0) {
    throw new ConflictError(`Cannot delete discipline: ${count} people are assigned to it`, {
      usageCount: count,
    });
  }

  const rows = await withTenant(orgId).deleteDiscipline(id).returning();

  if (rows.length === 0) {
    throw new NotFoundError('Discipline', id);
  }
  return rows[0];
}

/**
 * Count active (non-archived) people assigned to this discipline.
 */
export async function getDisciplineUsageCount(orgId: string, id: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, orgId),
        eq(schema.people.disciplineId, id),
        isNull(schema.people.archivedAt),
      ),
    );
  return Number(result[0].count);
}
