import { and, eq, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import {
  archiveRegisterRow,
  createRegisterRow,
  updateRegisterRow,
} from '@/features/admin/register.service';
import { NotFoundError } from '@/lib/errors';

import type { ProgramCreate, ProgramUpdate } from './program.types';

/**
 * List all programs for an organization, ordered by name.
 */
export async function listPrograms(orgId: string) {
  return db
    .select()
    .from(schema.programs)
    .where(eq(schema.programs.organizationId, orgId))
    .orderBy(schema.programs.name);
}

/**
 * Get a single program by ID, scoped to the organization.
 * Throws NotFoundError if not found.
 */
export async function getProgramById(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(schema.programs)
    .where(and(eq(schema.programs.id, id), eq(schema.programs.organizationId, orgId)));

  if (rows.length === 0) {
    throw new NotFoundError('Program', id);
  }
  return rows[0];
}

/**
 * Create a new program scoped to the organization.
 */
export async function createProgram(orgId: string, actorUserId: string, data: ProgramCreate) {
  return createRegisterRow({
    orgId,
    actorUserId,
    entity: 'program',
    data,
  });
}

/**
 * Update an existing program. Only provided fields are changed.
 * Throws NotFoundError if program not found or not in org.
 */
export async function updateProgram(
  orgId: string,
  actorUserId: string,
  id: string,
  data: ProgramUpdate,
) {
  return updateRegisterRow({
    orgId,
    actorUserId,
    entity: 'program',
    id,
    data,
  });
}

/**
 * Archive a program. The dependent-row blocker (active projects) is enforced by
 * archiveRegisterRow.collectBlockers, which throws ConflictError(
 * 'DEPENDENT_ROWS_EXIST', { entity, id, blockers }) instead of the legacy
 * usageCount shape. Throws NotFoundError if program not found or not in org.
 */
export async function deleteProgram(orgId: string, actorUserId: string, id: string) {
  return archiveRegisterRow({
    orgId,
    actorUserId,
    entity: 'program',
    id,
  });
}

/**
 * Count non-archived projects assigned to this program.
 */
export async function getProgramUsageCount(orgId: string, id: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.organizationId, orgId),
        eq(schema.projects.programId, id),
        ne(schema.projects.status, 'archived'),
      ),
    );
  return Number(result[0].count);
}
