import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { calculateStatus } from '@/lib/capacity';
import { getCurrentMonth } from '@/lib/date-utils';
import { NotFoundError } from '@/lib/errors';
import { withTenant } from '@/lib/tenant';

import type { PersonCreate, PersonFilter, PersonUpdate, PersonWithStatus } from './person.types';

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

/**
 * List people with computed allocation status for sidebar display.
 * Single JOIN query: people + departments + disciplines + LEFT JOIN allocations (current month).
 * Returns PersonWithStatus[] ordered by sortOrder, lastName, firstName.
 */
export async function listPeopleWithStatus(
  orgId: string,
  filters: PersonFilter = {},
): Promise<PersonWithStatus[]> {
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

  const currentMonth = getCurrentMonth();
  // Normalize to YYYY-MM-01 for date column comparison
  const currentMonthDate = `${currentMonth}-01`;

  const rows = await db
    .select({
      id: schema.people.id,
      organizationId: schema.people.organizationId,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      disciplineId: schema.people.disciplineId,
      departmentId: schema.people.departmentId,
      targetHoursPerMonth: schema.people.targetHoursPerMonth,
      sortOrder: schema.people.sortOrder,
      archivedAt: schema.people.archivedAt,
      createdAt: schema.people.createdAt,
      updatedAt: schema.people.updatedAt,
      departmentName: schema.departments.name,
      disciplineAbbreviation: schema.disciplines.abbreviation,
      currentMonthSum: sql<number>`coalesce(sum(${schema.allocations.hours}), 0)`.as(
        'current_month_sum',
      ),
    })
    .from(schema.people)
    .innerJoin(schema.departments, eq(schema.people.departmentId, schema.departments.id))
    .innerJoin(schema.disciplines, eq(schema.people.disciplineId, schema.disciplines.id))
    .leftJoin(
      schema.allocations,
      and(
        eq(schema.allocations.personId, schema.people.id),
        eq(schema.allocations.month, currentMonthDate),
      ),
    )
    .where(and(...conditions))
    .groupBy(
      schema.people.id,
      schema.people.organizationId,
      schema.people.firstName,
      schema.people.lastName,
      schema.people.disciplineId,
      schema.people.departmentId,
      schema.people.targetHoursPerMonth,
      schema.people.sortOrder,
      schema.people.archivedAt,
      schema.people.createdAt,
      schema.people.updatedAt,
      schema.departments.name,
      schema.disciplines.abbreviation,
    )
    .orderBy(schema.people.sortOrder, schema.people.lastName, schema.people.firstName);

  return rows.map((row) => ({
    ...row,
    currentMonthSum: Number(row.currentMonthSum),
    status: calculateStatus(Number(row.currentMonthSum), row.targetHoursPerMonth),
  }));
}

/**
 * Get the adjacent (prev/next) person relative to currentPersonId.
 * Uses the full ordered list from listPeople. Fine for small datasets (tens of people).
 * Returns { id } or null if at boundary.
 */
export async function getAdjacentPerson(
  orgId: string,
  currentPersonId: string,
  direction: 'next' | 'prev',
  filters: PersonFilter = {},
): Promise<{ id: string } | null> {
  const people = await listPeople(orgId, filters);
  const currentIndex = people.findIndex((p) => p.id === currentPersonId);

  if (currentIndex === -1) return null;

  const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  if (targetIndex < 0 || targetIndex >= people.length) return null;

  return { id: people[targetIndex].id };
}
