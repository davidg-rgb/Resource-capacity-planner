import { eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  allocations,
  departments,
  disciplines,
  featureFlags,
  importSessions,
  organizations,
  people,
  programs,
  projects,
} from '@/db/schema';
import { NotFoundError } from '@/lib/errors';

export interface TenantExportData {
  exportedAt: string;
  organizationId: string;
  organizationName: string;
  departments: Array<{ id: string; name: string; createdAt: string }>;
  disciplines: Array<{ id: string; name: string; abbreviation: string; createdAt: string }>;
  programs: Array<{ id: string; name: string; description: string | null; createdAt: string }>;
  people: Array<{
    id: string;
    firstName: string;
    lastName: string;
    departmentId: string;
    disciplineId: string;
    targetHoursPerMonth: number;
    sortOrder: number;
    archivedAt: string | null;
    createdAt: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    programId: string | null;
    status: string;
    archivedAt: string | null;
    createdAt: string;
  }>;
  allocations: Array<{
    id: string;
    personId: string;
    projectId: string;
    month: string;
    hours: number;
    createdAt: string;
  }>;
  importSessions: Array<{
    id: string;
    userId: string;
    fileName: string;
    status: string;
    rowCount: number;
    createdAt: string;
  }>;
}

/**
 * Export all tenant-scoped data as a structured JSON object.
 * Does NOT include featureFlags (platform config) or large JSONB blobs from importSessions.
 */
export async function exportTenantData(orgId: string): Promise<TenantExportData> {
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) throw new NotFoundError('Organization', orgId);

  const [deptRows, discRows, progRows, peopleRows, projRows, allocRows, importRows] =
    await Promise.all([
      db
        .select({
          id: departments.id,
          name: departments.name,
          createdAt: departments.createdAt,
        })
        .from(departments)
        .where(eq(departments.organizationId, orgId)),
      db
        .select({
          id: disciplines.id,
          name: disciplines.name,
          abbreviation: disciplines.abbreviation,
          createdAt: disciplines.createdAt,
        })
        .from(disciplines)
        .where(eq(disciplines.organizationId, orgId)),
      db
        .select({
          id: programs.id,
          name: programs.name,
          description: programs.description,
          createdAt: programs.createdAt,
        })
        .from(programs)
        .where(eq(programs.organizationId, orgId)),
      db
        .select({
          id: people.id,
          firstName: people.firstName,
          lastName: people.lastName,
          departmentId: people.departmentId,
          disciplineId: people.disciplineId,
          targetHoursPerMonth: people.targetHoursPerMonth,
          sortOrder: people.sortOrder,
          archivedAt: people.archivedAt,
          createdAt: people.createdAt,
        })
        .from(people)
        .where(eq(people.organizationId, orgId)),
      db
        .select({
          id: projects.id,
          name: projects.name,
          programId: projects.programId,
          status: projects.status,
          archivedAt: projects.archivedAt,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(eq(projects.organizationId, orgId)),
      db
        .select({
          id: allocations.id,
          personId: allocations.personId,
          projectId: allocations.projectId,
          month: allocations.month,
          hours: allocations.hours,
          createdAt: allocations.createdAt,
        })
        .from(allocations)
        .where(eq(allocations.organizationId, orgId)),
      db
        .select({
          id: importSessions.id,
          userId: importSessions.userId,
          fileName: importSessions.fileName,
          status: importSessions.status,
          rowCount: importSessions.rowCount,
          createdAt: importSessions.createdAt,
        })
        .from(importSessions)
        .where(eq(importSessions.organizationId, orgId)),
    ]);

  const toIso = (d: Date) => d.toISOString();
  const toIsoOrNull = (d: Date | null) => (d ? d.toISOString() : null);

  return {
    exportedAt: new Date().toISOString(),
    organizationId: orgId,
    organizationName: org.name,
    departments: deptRows.map((r) => ({ ...r, createdAt: toIso(r.createdAt) })),
    disciplines: discRows.map((r) => ({ ...r, createdAt: toIso(r.createdAt) })),
    programs: progRows.map((r) => ({
      ...r,
      description: r.description ?? null,
      createdAt: toIso(r.createdAt),
    })),
    people: peopleRows.map((r) => ({
      ...r,
      archivedAt: toIsoOrNull(r.archivedAt),
      createdAt: toIso(r.createdAt),
    })),
    projects: projRows.map((r) => ({
      ...r,
      archivedAt: toIsoOrNull(r.archivedAt),
      createdAt: toIso(r.createdAt),
    })),
    allocations: allocRows.map((r) => ({
      ...r,
      createdAt: toIso(r.createdAt),
    })),
    importSessions: importRows.map((r) => ({
      ...r,
      createdAt: toIso(r.createdAt),
    })),
  };
}

/**
 * Purge all tenant-scoped data in FK-safe order.
 * The organization record itself is preserved (GDPR: purge data, keep account shell).
 */
export async function purgeTenantData(
  orgId: string,
): Promise<{ deletedCounts: Record<string, number> }> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) throw new NotFoundError('Organization', orgId);

  // Delete in FK-safe order (child-to-parent)
  const allocResult = await db
    .delete(allocations)
    .where(eq(allocations.organizationId, orgId))
    .returning({ id: allocations.id });

  const importResult = await db
    .delete(importSessions)
    .where(eq(importSessions.organizationId, orgId))
    .returning({ id: importSessions.id });

  const flagResult = await db
    .delete(featureFlags)
    .where(eq(featureFlags.organizationId, orgId))
    .returning({ id: featureFlags.id });

  const peopleResult = await db
    .delete(people)
    .where(eq(people.organizationId, orgId))
    .returning({ id: people.id });

  const projectResult = await db
    .delete(projects)
    .where(eq(projects.organizationId, orgId))
    .returning({ id: projects.id });

  const programResult = await db
    .delete(programs)
    .where(eq(programs.organizationId, orgId))
    .returning({ id: programs.id });

  const discResult = await db
    .delete(disciplines)
    .where(eq(disciplines.organizationId, orgId))
    .returning({ id: disciplines.id });

  const deptResult = await db
    .delete(departments)
    .where(eq(departments.organizationId, orgId))
    .returning({ id: departments.id });

  return {
    deletedCounts: {
      allocations: allocResult.length,
      importSessions: importResult.length,
      featureFlags: flagResult.length,
      people: peopleResult.length,
      projects: projectResult.length,
      programs: programResult.length,
      disciplines: discResult.length,
      departments: deptResult.length,
    },
  };
}
