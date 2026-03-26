import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';

/**
 * Creates a tenant-scoped query builder that automatically injects
 * `WHERE organization_id = orgId` on every query.
 *
 * Usage:
 *   const tenant = withTenant(orgId);
 *   const teamMembers = await tenant.people();
 *   await tenant.insertPerson({ firstName: 'Anna', ... });
 */
export function withTenant(orgId: string) {
  return {
    // -----------------------------------------------------------------------
    // Select builders — return pre-scoped SELECT queries
    // -----------------------------------------------------------------------

    /** Select all people for this organization */
    people: () => db.select().from(schema.people).where(eq(schema.people.organizationId, orgId)),

    /** Select all projects for this organization */
    projects: () =>
      db.select().from(schema.projects).where(eq(schema.projects.organizationId, orgId)),

    /** Select all programs for this organization */
    programs: () =>
      db.select().from(schema.programs).where(eq(schema.programs.organizationId, orgId)),

    /** Select all departments for this organization */
    departments: () =>
      db.select().from(schema.departments).where(eq(schema.departments.organizationId, orgId)),

    /** Select all disciplines for this organization */
    disciplines: () =>
      db.select().from(schema.disciplines).where(eq(schema.disciplines.organizationId, orgId)),

    /** Select all allocations for this organization */
    allocations: () =>
      db.select().from(schema.allocations).where(eq(schema.allocations.organizationId, orgId)),

    /** Select all import sessions for this organization */
    importSessions: () =>
      db
        .select()
        .from(schema.importSessions)
        .where(eq(schema.importSessions.organizationId, orgId)),

    /** Select all feature flags for this organization */
    featureFlags: () =>
      db.select().from(schema.featureFlags).where(eq(schema.featureFlags.organizationId, orgId)),

    // -----------------------------------------------------------------------
    // Insert helpers — auto-inject organizationId
    // -----------------------------------------------------------------------

    /** Insert a person scoped to this organization */
    insertPerson: (data: Omit<typeof schema.people.$inferInsert, 'organizationId'>) =>
      db.insert(schema.people).values({ ...data, organizationId: orgId }),

    /** Insert a project scoped to this organization */
    insertProject: (data: Omit<typeof schema.projects.$inferInsert, 'organizationId'>) =>
      db.insert(schema.projects).values({ ...data, organizationId: orgId }),

    /** Insert a program scoped to this organization */
    insertProgram: (data: Omit<typeof schema.programs.$inferInsert, 'organizationId'>) =>
      db.insert(schema.programs).values({ ...data, organizationId: orgId }),

    /** Insert a department scoped to this organization */
    insertDepartment: (data: Omit<typeof schema.departments.$inferInsert, 'organizationId'>) =>
      db.insert(schema.departments).values({ ...data, organizationId: orgId }),

    /** Insert a discipline scoped to this organization */
    insertDiscipline: (data: Omit<typeof schema.disciplines.$inferInsert, 'organizationId'>) =>
      db.insert(schema.disciplines).values({ ...data, organizationId: orgId }),

    /** Insert an allocation scoped to this organization */
    insertAllocation: (data: Omit<typeof schema.allocations.$inferInsert, 'organizationId'>) =>
      db.insert(schema.allocations).values({ ...data, organizationId: orgId }),

    // -----------------------------------------------------------------------
    // Update helpers — verify org ownership with AND clause
    // -----------------------------------------------------------------------

    /** Update a person (only if owned by this organization) */
    updatePerson: (
      id: string,
      data: Partial<Omit<typeof schema.people.$inferInsert, 'id' | 'organizationId'>>,
    ) =>
      db
        .update(schema.people)
        .set(data)
        .where(and(eq(schema.people.id, id), eq(schema.people.organizationId, orgId))),

    /** Update a project (only if owned by this organization) */
    updateProject: (
      id: string,
      data: Partial<Omit<typeof schema.projects.$inferInsert, 'id' | 'organizationId'>>,
    ) =>
      db
        .update(schema.projects)
        .set(data)
        .where(and(eq(schema.projects.id, id), eq(schema.projects.organizationId, orgId))),

    /** Update a program (only if owned by this organization) */
    updateProgram: (
      id: string,
      data: Partial<Omit<typeof schema.programs.$inferInsert, 'id' | 'organizationId'>>,
    ) =>
      db
        .update(schema.programs)
        .set(data)
        .where(and(eq(schema.programs.id, id), eq(schema.programs.organizationId, orgId))),

    /** Update a department (only if owned by this organization) */
    updateDepartment: (
      id: string,
      data: Partial<Omit<typeof schema.departments.$inferInsert, 'id' | 'organizationId'>>,
    ) =>
      db
        .update(schema.departments)
        .set(data)
        .where(and(eq(schema.departments.id, id), eq(schema.departments.organizationId, orgId))),

    /** Update a discipline (only if owned by this organization) */
    updateDiscipline: (
      id: string,
      data: Partial<Omit<typeof schema.disciplines.$inferInsert, 'id' | 'organizationId'>>,
    ) =>
      db
        .update(schema.disciplines)
        .set(data)
        .where(and(eq(schema.disciplines.id, id), eq(schema.disciplines.organizationId, orgId))),

    // -----------------------------------------------------------------------
    // Delete helpers — verify org ownership
    // -----------------------------------------------------------------------

    /** Delete a person (only if owned by this organization) */
    deletePerson: (id: string) =>
      db
        .delete(schema.people)
        .where(and(eq(schema.people.id, id), eq(schema.people.organizationId, orgId))),

    /** Delete a project (only if owned by this organization) */
    deleteProject: (id: string) =>
      db
        .delete(schema.projects)
        .where(and(eq(schema.projects.id, id), eq(schema.projects.organizationId, orgId))),

    /** Delete a department (only if owned by this organization) */
    deleteDepartment: (id: string) =>
      db
        .delete(schema.departments)
        .where(and(eq(schema.departments.id, id), eq(schema.departments.organizationId, orgId))),

    /** Delete a discipline (only if owned by this organization) */
    deleteDiscipline: (id: string) =>
      db
        .delete(schema.disciplines)
        .where(and(eq(schema.disciplines.id, id), eq(schema.disciplines.organizationId, orgId))),

    /** Delete a program (only if owned by this organization) */
    deleteProgram: (id: string) =>
      db
        .delete(schema.programs)
        .where(and(eq(schema.programs.id, id), eq(schema.programs.organizationId, orgId))),

    /** Delete an allocation (only if owned by this organization) */
    deleteAllocation: (id: string) =>
      db
        .delete(schema.allocations)
        .where(and(eq(schema.allocations.id, id), eq(schema.allocations.organizationId, orgId))),
  };
}
