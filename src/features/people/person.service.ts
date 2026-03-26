import { and, eq, ilike, isNull, or } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { NotFoundError } from '@/lib/errors';
import { withTenant } from '@/lib/tenant';

import type { PersonCreate, PersonFilter, PersonUpdate } from './person.types';

/**
 * List people for an organization with optional filters.
 * Archived people are excluded by default.
 */
export async function listPeople(orgId: string, filters: PersonFilter = {}) {
  const conditions = [eq(schema.people.organizationId, orgId)];

  if (!filters.includeArchived) {
    conditions.push(isNull(schema.people.archivedAt));
  }
  if (filters.departmentId) {
    conditions.push(eq(schema.people.departmentId, filters.departmentId));
  }
  if (filters.disciplineId) {
    conditions.push(eq(schema.people.disciplineId, filters.disciplineId));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(ilike(schema.people.firstName, term), ilike(schema.people.lastName, term))!,
    );
  }

  return db
    .select()
    .from(schema.people)
    .where(and(...conditions))
    .orderBy(schema.people.sortOrder, schema.people.lastName, schema.people.firstName);
}

/**
 * Get a single person by ID, scoped to the organization.
 * Throws NotFoundError if not found.
 */
export async function getPersonById(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(schema.people)
    .where(and(eq(schema.people.id, id), eq(schema.people.organizationId, orgId)));

  if (rows.length === 0) {
    throw new NotFoundError('Person', id);
  }
  return rows[0];
}

/**
 * Create a new person scoped to the organization.
 */
export async function createPerson(orgId: string, data: PersonCreate) {
  const rows = await withTenant(orgId)
    .insertPerson({
      firstName: data.firstName,
      lastName: data.lastName,
      disciplineId: data.disciplineId,
      departmentId: data.departmentId,
      targetHoursPerMonth: data.targetHoursPerMonth ?? 160,
    })
    .returning();
  return rows[0];
}

/**
 * Update an existing person. Only provided fields are changed.
 * Throws NotFoundError if person not found or not in org.
 */
export async function updatePerson(orgId: string, id: string, data: PersonUpdate) {
  const rows = await withTenant(orgId)
    .updatePerson(id, { ...data, updatedAt: new Date() })
    .returning();

  if (rows.length === 0) {
    throw new NotFoundError('Person', id);
  }
  return rows[0];
}

/**
 * Soft-delete a person by setting archivedAt.
 * Throws NotFoundError if person not found or not in org.
 */
export async function deletePerson(orgId: string, id: string) {
  const rows = await withTenant(orgId)
    .updatePerson(id, { archivedAt: new Date() })
    .returning();

  if (rows.length === 0) {
    throw new NotFoundError('Person', id);
  }
  return rows[0];
}
