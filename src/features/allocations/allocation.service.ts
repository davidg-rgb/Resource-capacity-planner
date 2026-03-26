import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { normalizeMonth } from '@/lib/date-utils';

import type { AllocationUpsert, BatchUpsertResult, ConflictInfo, FlatAllocation } from './allocation.types';

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
