import { and, eq, gte, lte, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { normalizeMonth } from '@/lib/date-utils';

import type {
  AllocationUpsert,
  BatchUpsertResult,
  ConflictInfo,
  FlatAllocation,
  FlatTableFilters,
  FlatTableRow,
} from './allocation.types';

/**
 * List all allocations for a person, joined with projects for project names.
 * Month values are normalized from YYYY-MM-DD to YYYY-MM.
 * Includes updatedAt for optimistic concurrency conflict detection.
 */
export async function listAllocationsForPerson(
  orgId: string,
  personId: string,
): Promise<FlatAllocation[]> {
  const rows = await db
    .select({
      id: schema.allocations.id,
      personId: schema.allocations.personId,
      projectId: schema.allocations.projectId,
      projectName: schema.projects.name,
      month: schema.allocations.month,
      hours: schema.allocations.hours,
      updatedAt: schema.allocations.updatedAt,
    })
    .from(schema.allocations)
    .innerJoin(schema.projects, eq(schema.allocations.projectId, schema.projects.id))
    .where(
      and(
        eq(schema.allocations.organizationId, orgId),
        eq(schema.allocations.personId, personId),
      ),
    );

  return rows.map((row) => ({
    ...row,
    month: normalizeMonth(row.month),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

/**
 * Batch upsert allocations in a single transaction.
 * - hours > 0: INSERT or UPDATE (ON CONFLICT)
 * - hours === 0: DELETE the allocation row (zero-hour cleanup)
 * - If expectedUpdatedAt is provided, checks for conflicts before upserting.
 *   A conflict occurs when the server's updatedAt is newer than expectedUpdatedAt.
 *   Omitting expectedUpdatedAt forces the upsert (backward compatible).
 */
export async function batchUpsertAllocations(
  orgId: string,
  allocations: AllocationUpsert[],
): Promise<BatchUpsertResult> {
  let created = 0;
  let updated = 0;
  let deleted = 0;
  const errors: string[] = [];
  const conflicts: ConflictInfo[] = [];
  const updatedTimestamps: Record<string, string> = {};

  await db.transaction(async (tx) => {
    for (const alloc of allocations) {
      // Normalize month to YYYY-MM-01 for DB storage (date column stores full date)
      const monthDate = `${alloc.month}-01`;

      if (alloc.hours === 0) {
        // DELETE semantics: clearing hours removes the allocation
        const result = await tx
          .delete(schema.allocations)
          .where(
            and(
              eq(schema.allocations.organizationId, orgId),
              eq(schema.allocations.personId, alloc.personId),
              eq(schema.allocations.projectId, alloc.projectId),
              eq(schema.allocations.month, monthDate),
            ),
          )
          .returning({ id: schema.allocations.id });

        if (result.length > 0) {
          deleted++;
        }
      } else {
        // Conflict detection: if expectedUpdatedAt is provided, check server state first
        if (alloc.expectedUpdatedAt) {
          const existing = await tx
            .select({
              hours: schema.allocations.hours,
              updatedAt: schema.allocations.updatedAt,
            })
            .from(schema.allocations)
            .where(
              and(
                eq(schema.allocations.organizationId, orgId),
                eq(schema.allocations.personId, alloc.personId),
                eq(schema.allocations.projectId, alloc.projectId),
                eq(schema.allocations.month, monthDate),
              ),
            );

          if (existing.length > 0) {
            const serverUpdatedAt = existing[0].updatedAt;
            const expectedDate = new Date(alloc.expectedUpdatedAt);

            if (serverUpdatedAt > expectedDate) {
              // Conflict detected: server was modified after our last known state
              conflicts.push({
                projectId: alloc.projectId,
                month: alloc.month,
                serverHours: existing[0].hours,
                serverUpdatedAt: serverUpdatedAt.toISOString(),
              });
              continue; // Skip this upsert
            }
          }
        }

        // UPSERT: insert or update on conflict
        const result = await tx
          .insert(schema.allocations)
          .values({
            organizationId: orgId,
            personId: alloc.personId,
            projectId: alloc.projectId,
            month: monthDate,
            hours: alloc.hours,
          })
          .onConflictDoUpdate({
            target: [
              schema.allocations.organizationId,
              schema.allocations.personId,
              schema.allocations.projectId,
              schema.allocations.month,
            ],
            set: {
              hours: alloc.hours,
              updatedAt: new Date(),
            },
          })
          .returning({
            id: schema.allocations.id,
            createdAt: schema.allocations.createdAt,
            updatedAt: schema.allocations.updatedAt,
          });

        if (result.length > 0) {
          const row = result[0];
          // If createdAt and updatedAt are within 1 second, it was just created
          const timeDiff = Math.abs(row.createdAt.getTime() - row.updatedAt.getTime());
          if (timeDiff < 1000) {
            created++;
          } else {
            updated++;
          }

          // Track the new updatedAt for the client to update its map
          const key = `${alloc.projectId}:${alloc.month}`;
          updatedTimestamps[key] = row.updatedAt.toISOString();
        }
      }
    }
  });

  return { created, updated, deleted, errors, conflicts, updatedTimestamps };
}

// ---------------------------------------------------------------------------
// Flat table helpers
// ---------------------------------------------------------------------------

/**
 * Build Drizzle conditions for flat table queries.
 * Shared between list and count to ensure consistent filtering.
 */
function buildFlatConditions(orgId: string, filters: FlatTableFilters) {
  const conditions = [eq(schema.allocations.organizationId, orgId)];

  if (filters.personId) {
    conditions.push(eq(schema.allocations.personId, filters.personId));
  }
  if (filters.projectId) {
    conditions.push(eq(schema.allocations.projectId, filters.projectId));
  }
  if (filters.departmentId) {
    conditions.push(eq(schema.people.departmentId, filters.departmentId));
  }
  if (filters.monthFrom) {
    conditions.push(gte(schema.allocations.month, `${filters.monthFrom}-01`));
  }
  if (filters.monthTo) {
    conditions.push(lte(schema.allocations.month, `${filters.monthTo}-01`));
  }

  return conditions;
}

/**
 * Build the base flat table query with all 4 JOINs.
 */
function buildFlatBaseQuery() {
  return db
    .select({
      personName:
        sql<string>`${schema.people.firstName} || ' ' || ${schema.people.lastName}`,
      departmentName: schema.departments.name,
      projectName: schema.projects.name,
      programName: schema.programs.name,
      month: schema.allocations.month,
      hours: schema.allocations.hours,
    })
    .from(schema.allocations)
    .innerJoin(schema.people, eq(schema.allocations.personId, schema.people.id))
    .innerJoin(schema.departments, eq(schema.people.departmentId, schema.departments.id))
    .innerJoin(schema.projects, eq(schema.allocations.projectId, schema.projects.id))
    .leftJoin(schema.programs, eq(schema.projects.programId, schema.programs.id));
}

/**
 * List paginated flat allocation rows with all joins resolved.
 * Returns rows sorted by person last name, first name, then month.
 */
export async function listAllocationsFlat(
  orgId: string,
  filters: FlatTableFilters,
  pagination: { page: number; pageSize: number },
): Promise<FlatTableRow[]> {
  const rows = await buildFlatBaseQuery()
    .where(and(...buildFlatConditions(orgId, filters)))
    .orderBy(schema.people.lastName, schema.people.firstName, schema.allocations.month)
    .limit(pagination.pageSize)
    .offset((pagination.page - 1) * pagination.pageSize);

  return rows.map((row) => ({
    ...row,
    month: normalizeMonth(row.month),
    programName: row.programName ?? null,
  }));
}

/**
 * Count total flat allocation rows matching filters.
 * Uses the same JOINs and conditions as listAllocationsFlat.
 */
export async function countAllocationsFlat(
  orgId: string,
  filters: FlatTableFilters,
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.allocations)
    .innerJoin(schema.people, eq(schema.allocations.personId, schema.people.id))
    .innerJoin(schema.departments, eq(schema.people.departmentId, schema.departments.id))
    .innerJoin(schema.projects, eq(schema.allocations.projectId, schema.projects.id))
    .leftJoin(schema.programs, eq(schema.projects.programId, schema.programs.id))
    .where(and(...buildFlatConditions(orgId, filters)));

  return Number(result[0].count);
}

/**
 * Export all matching flat allocation rows as Excel (.xlsx) or CSV buffer.
 * Uses a high pageSize to fetch all rows without pagination.
 */
export async function exportAllocationsFlat(
  orgId: string,
  filters: FlatTableFilters,
  format: 'xlsx' | 'csv',
): Promise<Buffer> {
  const rows = await listAllocationsFlat(orgId, filters, {
    page: 1,
    pageSize: 100000,
  });

  const wb = XLSX.utils.book_new();

  const headers = ['Person Name', 'Department', 'Project Name', 'Program', 'Month', 'Hours'];
  const data = [
    headers,
    ...rows.map((r) => [
      r.personName,
      r.departmentName,
      r.projectName,
      r.programName ?? '',
      r.month,
      r.hours,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 25 },
    { wch: 20 },
    { wch: 10 },
    { wch: 8 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Allocations');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: format === 'csv' ? 'csv' : 'xlsx' });
  return Buffer.from(buf);
}
