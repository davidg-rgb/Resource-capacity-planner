import { and, eq, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { withTenant } from '@/lib/tenant';

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
export async function createProgram(orgId: string, data: ProgramCreate) {
  const rows = await withTenant(orgId)
    .insertProgram({
      name: data.name,
      description: data.description ?? null,
    })
    .returning();
  return rows[0];
}

/**
 * Update an existing program. Only provided fields are changed.
 * Throws NotFoundError if program not found or not in org.
 */
export async function updateProgram(orgId: string, id: string, data: ProgramUpdate) {
  const rows = await withTenant(orgId)
    .updateProgram(id, { ...data, updatedAt: new Date() })
    .returning();

  if (rows.length === 0) {
    throw new NotFoundError('Program', id);
  }
  return rows[0];
}

/**
 * Delete a program. Checks usage count first and throws ConflictError if in use.
 * Throws NotFoundError if program not found or not in org.
 */
export async function deleteProgram(orgId: string, id: string) {
  const count = await getProgramUsageCount(orgId, id);
  if (count > 0) {
    throw new ConflictError(`Cannot delete program: ${count} projects are assigned to it`, {
      usageCount: count,
    });
  }

  const rows = await withTenant(orgId).deleteProgram(id).returning();

  if (rows.length === 0) {
    throw new NotFoundError('Program', id);
  }
  return rows[0];
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
