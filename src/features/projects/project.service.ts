import { and, eq, ilike, ne } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import {
  archiveRegisterRow,
  createRegisterRow,
  updateRegisterRow,
} from '@/features/admin/register.service';
import { NotFoundError } from '@/lib/errors';

import type { ProjectCreate, ProjectFilter, ProjectUpdate } from './project.types';

/**
 * List projects for an organization with optional filters.
 * Archived projects are excluded by default.
 */
export async function listProjects(orgId: string, filters: ProjectFilter = {}) {
  const conditions = [eq(schema.projects.organizationId, orgId)];

  if (!filters.includeArchived) {
    conditions.push(ne(schema.projects.status, 'archived'));
  }
  if (filters.programId) {
    conditions.push(eq(schema.projects.programId, filters.programId));
  }
  if (filters.status) {
    conditions.push(eq(schema.projects.status, filters.status));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(ilike(schema.projects.name, term));
  }

  return db
    .select()
    .from(schema.projects)
    .where(and(...conditions))
    .orderBy(schema.projects.status, schema.projects.name);
}

/**
 * Get a single project by ID, scoped to the organization.
 * Throws NotFoundError if not found.
 */
export async function getProjectById(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.organizationId, orgId)));

  if (rows.length === 0) {
    throw new NotFoundError('Project', id);
  }
  return rows[0];
}

/**
 * Create a new project scoped to the organization.
 * Duplicate names within the same org will trigger a Postgres unique_violation (23505).
 */
export async function createProject(orgId: string, actorUserId: string, data: ProjectCreate) {
  return createRegisterRow({
    orgId,
    actorUserId,
    entity: 'project',
    data,
  });
}

/**
 * Update an existing project. Only provided fields are changed.
 * Throws NotFoundError if project not found or not in org.
 */
export async function updateProject(
  orgId: string,
  actorUserId: string,
  id: string,
  data: ProjectUpdate,
) {
  return updateRegisterRow({
    orgId,
    actorUserId,
    entity: 'project',
    id,
    data,
  });
}

/**
 * Archive a project. register.service.ts preserves the v4 semantics of setting
 * BOTH status='archived' AND archivedAt. Throws NotFoundError if not in org.
 */
export async function archiveProject(orgId: string, actorUserId: string, id: string) {
  return archiveRegisterRow({
    orgId,
    actorUserId,
    entity: 'project',
    id,
  });
}
