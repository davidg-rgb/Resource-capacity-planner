import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import {
  archiveRegisterRow,
  createRegisterRow,
  updateRegisterRow,
} from '@/features/admin/register.service';
import { NotFoundError } from '@/lib/errors';

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
export async function createDiscipline(orgId: string, actorUserId: string, data: DisciplineCreate) {
  return createRegisterRow({
    orgId,
    actorUserId,
    entity: 'discipline',
    data,
  });
}

/**
 * Update an existing discipline. Only provided fields are changed.
 * Throws NotFoundError if discipline not found or not in org.
 */
export async function updateDiscipline(
  orgId: string,
  actorUserId: string,
  id: string,
  data: DisciplineUpdate,
) {
  return updateRegisterRow({
    orgId,
    actorUserId,
    entity: 'discipline',
    id,
    data,
  });
}

/**
 * Archive a discipline. The dependent-row blocker (assigned people) is enforced
 * by archiveRegisterRow.collectBlockers, which throws ConflictError(
 * 'DEPENDENT_ROWS_EXIST', { entity, id, blockers }) instead of the legacy
 * usageCount shape. Throws NotFoundError if discipline not found or not in org.
 */
export async function deleteDiscipline(orgId: string, actorUserId: string, id: string) {
  return archiveRegisterRow({
    orgId,
    actorUserId,
    entity: 'discipline',
    id,
  });
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
