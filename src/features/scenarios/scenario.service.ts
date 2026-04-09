import { and, eq, sql, desc, count as drizzleCount } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { NotFoundError, ForbiddenError, ValidationError, InternalError } from '@/lib/errors';

import type {
  CreateScenarioRequest,
  UpdateScenarioRequest,
  ScenarioListItem,
  Scenario,
  ScenarioAllocationUpsert,
  PromoteRequest,
  PromoteResult,
  CreateTempEntityRequest,
  ScenarioTempEntity,
} from './scenario.types';

const MAX_SCENARIOS_PER_USER = 10;
const MAX_SCENARIOS_PER_ORG = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getScenarioOrThrow(scenarioId: string, orgId: string): Promise<Scenario> {
  const [row] = await db
    .select()
    .from(schema.scenarios)
    .where(and(eq(schema.scenarios.id, scenarioId), eq(schema.scenarios.organizationId, orgId)))
    .limit(1);

  if (!row) throw new NotFoundError('Scenario', scenarioId);

  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description,
    status: row.status,
    visibility: row.visibility,
    createdBy: row.createdBy,
    baselineSnapshotAt: row.baselineSnapshotAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function listScenarios(orgId: string, _userId: string): Promise<ScenarioListItem[]> {
  const rows = await db
    .select({
      id: schema.scenarios.id,
      name: schema.scenarios.name,
      description: schema.scenarios.description,
      status: schema.scenarios.status,
      visibility: schema.scenarios.visibility,
      createdBy: schema.scenarios.createdBy,
      baselineSnapshotAt: schema.scenarios.baselineSnapshotAt,
      createdAt: schema.scenarios.createdAt,
      updatedAt: schema.scenarios.updatedAt,
    })
    .from(schema.scenarios)
    .where(
      and(
        eq(schema.scenarios.organizationId, orgId),
        // Show: own scenarios, published ones, or shared ones
        // For simplicity, show all non-archived org scenarios — visibility filtering
        // is done client-side for now, since orgs are small (2-5 managers)
        sql`${schema.scenarios.status} != 'archived'`,
      ),
    )
    .orderBy(desc(schema.scenarios.updatedAt));

  // Get allocation counts per scenario
  const allocationCounts = await db
    .select({
      scenarioId: schema.scenarioAllocations.scenarioId,
      total: drizzleCount(),
      modified: sql<number>`count(*) filter (where ${schema.scenarioAllocations.isModified} = true or ${schema.scenarioAllocations.isNew} = true)`,
    })
    .from(schema.scenarioAllocations)
    .where(eq(schema.scenarioAllocations.organizationId, orgId))
    .groupBy(schema.scenarioAllocations.scenarioId);

  const countMap = new Map(allocationCounts.map((r) => [r.scenarioId, r]));

  return rows.map((row) => {
    const counts = countMap.get(row.id);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      visibility: row.visibility,
      createdBy: row.createdBy,
      baselineSnapshotAt: row.baselineSnapshotAt.toISOString(),
      allocationCount: counts ? Number(counts.total) : 0,
      modifiedCount: counts ? Number(counts.modified) : 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function createScenario(
  orgId: string,
  userId: string,
  data: CreateScenarioRequest,
): Promise<Scenario> {
  // Check user limit
  const [userCount] = await db
    .select({ count: drizzleCount() })
    .from(schema.scenarios)
    .where(
      and(
        eq(schema.scenarios.organizationId, orgId),
        eq(schema.scenarios.createdBy, userId),
        sql`${schema.scenarios.status} != 'archived'`,
      ),
    );

  if (Number(userCount?.count ?? 0) >= MAX_SCENARIOS_PER_USER) {
    throw new ValidationError(
      `Maximum ${MAX_SCENARIOS_PER_USER} scenarios per user. Archive or delete one to create a new one.`,
    );
  }

  // Check org limit
  const [orgCount] = await db
    .select({ count: drizzleCount() })
    .from(schema.scenarios)
    .where(
      and(
        eq(schema.scenarios.organizationId, orgId),
        sql`${schema.scenarios.status} != 'archived'`,
      ),
    );

  if (Number(orgCount?.count ?? 0) >= MAX_SCENARIOS_PER_ORG) {
    throw new ValidationError(
      `Maximum ${MAX_SCENARIOS_PER_ORG} scenarios per organization. Archive or delete one to create a new one.`,
    );
  }

  // Create scenario
  const [scenario] = await db
    .insert(schema.scenarios)
    .values({
      organizationId: orgId,
      name: data.name,
      description: data.description ?? null,
      createdBy: userId,
      status: 'draft',
      visibility: 'private',
    })
    .returning();

  if (!scenario) throw new InternalError('Failed to create scenario');

  // Snapshot current allocations into scenario_allocations
  if (data.baseScenarioId) {
    // Clone from existing scenario
    const baseScenario = await getScenarioOrThrow(data.baseScenarioId, orgId);
    await db.execute(sql`
      INSERT INTO scenario_allocations (
        scenario_id, organization_id, person_id, temp_entity_id,
        project_id, temp_project_name, month, hours,
        is_modified, is_new, is_removed
      )
      SELECT
        ${scenario.id}, organization_id, person_id, temp_entity_id,
        project_id, temp_project_name, month, hours,
        is_modified, is_new, is_removed
      FROM scenario_allocations
      WHERE scenario_id = ${baseScenario.id}
        AND promoted_at IS NULL
    `);
  } else {
    // Snapshot from actual allocations
    await db.execute(sql`
      INSERT INTO scenario_allocations (
        scenario_id, organization_id, person_id,
        project_id, month, hours,
        is_modified, is_new, is_removed
      )
      SELECT
        ${scenario.id}, organization_id, person_id,
        project_id, month, hours,
        false, false, false
      FROM allocations
      WHERE organization_id = ${orgId}
    `);
  }

  return {
    id: scenario.id,
    organizationId: scenario.organizationId,
    name: scenario.name,
    description: scenario.description,
    status: scenario.status,
    visibility: scenario.visibility,
    createdBy: scenario.createdBy,
    baselineSnapshotAt: scenario.baselineSnapshotAt.toISOString(),
    createdAt: scenario.createdAt.toISOString(),
    updatedAt: scenario.updatedAt.toISOString(),
  };
}

export async function getScenario(orgId: string, scenarioId: string): Promise<Scenario> {
  return getScenarioOrThrow(scenarioId, orgId);
}

export async function updateScenario(
  orgId: string,
  scenarioId: string,
  userId: string,
  data: UpdateScenarioRequest,
): Promise<Scenario> {
  const existing = await getScenarioOrThrow(scenarioId, orgId);

  // Only creator can update (unless published and admin)
  if (existing.createdBy !== userId && existing.visibility !== 'shared_collaborative') {
    throw new ForbiddenError('Only the scenario creator can update this scenario');
  }

  const [updated] = await db
    .update(schema.scenarios)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.visibility !== undefined && { visibility: data.visibility }),
    })
    .where(and(eq(schema.scenarios.id, scenarioId), eq(schema.scenarios.organizationId, orgId)))
    .returning();

  if (!updated) throw new NotFoundError('Scenario', scenarioId);

  return {
    id: updated.id,
    organizationId: updated.organizationId,
    name: updated.name,
    description: updated.description,
    status: updated.status,
    visibility: updated.visibility,
    createdBy: updated.createdBy,
    baselineSnapshotAt: updated.baselineSnapshotAt.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteScenario(
  orgId: string,
  scenarioId: string,
  userId: string,
): Promise<void> {
  const existing = await getScenarioOrThrow(scenarioId, orgId);

  if (existing.createdBy !== userId) {
    throw new ForbiddenError('Only the scenario creator can delete this scenario');
  }

  // Cascade delete handles allocations and temp entities
  await db
    .delete(schema.scenarios)
    .where(and(eq(schema.scenarios.id, scenarioId), eq(schema.scenarios.organizationId, orgId)));
}

// ---------------------------------------------------------------------------
// Allocations within a Scenario
// ---------------------------------------------------------------------------

export async function getScenarioAllocations(orgId: string, scenarioId: string) {
  // Verify scenario exists
  await getScenarioOrThrow(scenarioId, orgId);

  const rows = await db
    .select({
      id: schema.scenarioAllocations.id,
      scenarioId: schema.scenarioAllocations.scenarioId,
      personId: schema.scenarioAllocations.personId,
      tempEntityId: schema.scenarioAllocations.tempEntityId,
      projectId: schema.scenarioAllocations.projectId,
      tempProjectName: schema.scenarioAllocations.tempProjectName,
      month: schema.scenarioAllocations.month,
      hours: schema.scenarioAllocations.hours,
      isModified: schema.scenarioAllocations.isModified,
      isNew: schema.scenarioAllocations.isNew,
      isRemoved: schema.scenarioAllocations.isRemoved,
      promotedAt: schema.scenarioAllocations.promotedAt,
      personFirstName: schema.people.firstName,
      personLastName: schema.people.lastName,
      projectName: schema.projects.name,
      departmentName: schema.departments.name,
      targetHours: schema.people.targetHoursPerMonth,
      archivedAt: schema.people.archivedAt,
    })
    .from(schema.scenarioAllocations)
    .leftJoin(schema.people, eq(schema.scenarioAllocations.personId, schema.people.id))
    .leftJoin(schema.projects, eq(schema.scenarioAllocations.projectId, schema.projects.id))
    .leftJoin(schema.departments, eq(schema.people.departmentId, schema.departments.id))
    .where(
      and(
        eq(schema.scenarioAllocations.scenarioId, scenarioId),
        eq(schema.scenarioAllocations.organizationId, orgId),
      ),
    );

  return rows;
}

export async function upsertScenarioAllocations(
  orgId: string,
  scenarioId: string,
  allocations: ScenarioAllocationUpsert[],
) {
  await getScenarioOrThrow(scenarioId, orgId);

  return db.transaction(async (tx) => {
    // Batch-fetch all existing allocations for this scenario to avoid N+1 selects
    const existingRows = await tx
      .select({
        id: schema.scenarioAllocations.id,
        personId: schema.scenarioAllocations.personId,
        tempEntityId: schema.scenarioAllocations.tempEntityId,
        projectId: schema.scenarioAllocations.projectId,
        tempProjectName: schema.scenarioAllocations.tempProjectName,
        month: schema.scenarioAllocations.month,
      })
      .from(schema.scenarioAllocations)
      .where(
        and(
          eq(schema.scenarioAllocations.scenarioId, scenarioId),
          eq(schema.scenarioAllocations.organizationId, orgId),
        ),
      );

    // Build a lookup map: key -> existing row id
    const existingMap = new Map<string, string>();
    for (const row of existingRows) {
      const key = `${row.personId ?? ''}|${row.tempEntityId ?? ''}|${row.projectId ?? ''}|${row.tempProjectName ?? ''}|${row.month}`;
      existingMap.set(key, row.id);
    }

    const results = [];

    for (const alloc of allocations) {
      const monthDate = alloc.month.length === 7 ? `${alloc.month}-01` : alloc.month;
      const key = `${alloc.personId ?? ''}|${alloc.tempEntityId ?? ''}|${alloc.projectId ?? ''}|${alloc.tempProjectName ?? ''}|${monthDate}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        const [updated] = await tx
          .update(schema.scenarioAllocations)
          .set({
            hours: alloc.hours,
            isModified: true,
            isRemoved: alloc.hours === 0,
          })
          .where(eq(schema.scenarioAllocations.id, existingId))
          .returning();
        results.push(updated);
      } else {
        const [inserted] = await tx
          .insert(schema.scenarioAllocations)
          .values({
            scenarioId,
            organizationId: orgId,
            personId: alloc.personId ?? null,
            tempEntityId: alloc.tempEntityId ?? null,
            projectId: alloc.projectId ?? null,
            tempProjectName: alloc.tempProjectName ?? null,
            month: monthDate,
            hours: alloc.hours,
            isModified: true,
            isNew: true,
            isRemoved: false,
          })
          .returning();
        results.push(inserted);
      }
    }

    return results;
  });
}

// ---------------------------------------------------------------------------
// Promote to Actual
// ---------------------------------------------------------------------------

export async function promoteAllocations(
  orgId: string,
  scenarioId: string,
  data: PromoteRequest,
): Promise<PromoteResult> {
  if (!data.confirmation) {
    throw new ValidationError('Confirmation required to promote scenario allocations');
  }

  await getScenarioOrThrow(scenarioId, orgId);

  return db.transaction(async (tx) => {
    let promoted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Batch-fetch all requested allocations in one query
    const scenAllocs = await tx
      .select()
      .from(schema.scenarioAllocations)
      .where(
        and(
          eq(schema.scenarioAllocations.scenarioId, scenarioId),
          sql`${schema.scenarioAllocations.id} = ANY(${data.allocationIds}::uuid[])`,
        ),
      );

    const scenAllocMap = new Map(scenAllocs.map((a) => [a.id, a]));

    // Batch-fetch all people for archived check
    const personIds = [...new Set(scenAllocs.filter((a) => a.personId).map((a) => a.personId!))];
    const peopleRows =
      personIds.length > 0
        ? await tx
            .select({ id: schema.people.id, archivedAt: schema.people.archivedAt })
            .from(schema.people)
            .where(sql`${schema.people.id} = ANY(${personIds}::uuid[])`)
        : [];
    const archivedPeople = new Set(peopleRows.filter((p) => p.archivedAt).map((p) => p.id));

    const promotedIds: string[] = [];

    for (const allocId of data.allocationIds) {
      const scenAlloc = scenAllocMap.get(allocId);

      if (!scenAlloc) {
        errors.push(`Allocation ${allocId} not found`);
        skipped++;
        continue;
      }

      if (scenAlloc.promotedAt) {
        skipped++;
        continue;
      }

      if (scenAlloc.tempEntityId && !scenAlloc.personId) {
        errors.push(`Cannot promote temp entity allocation ${allocId} — create the person first`);
        skipped++;
        continue;
      }

      if (scenAlloc.personId && archivedPeople.has(scenAlloc.personId)) {
        errors.push(`Cannot promote — person is archived`);
        skipped++;
        continue;
      }

      if (scenAlloc.isRemoved && scenAlloc.personId && scenAlloc.projectId) {
        await tx
          .delete(schema.allocations)
          .where(
            and(
              eq(schema.allocations.organizationId, orgId),
              eq(schema.allocations.personId, scenAlloc.personId),
              eq(schema.allocations.projectId, scenAlloc.projectId),
              eq(schema.allocations.month, scenAlloc.month),
            ),
          );
      } else if (scenAlloc.personId && scenAlloc.projectId) {
        await tx
          .insert(schema.allocations)
          .values({
            organizationId: orgId,
            personId: scenAlloc.personId,
            projectId: scenAlloc.projectId,
            month: scenAlloc.month,
            hours: scenAlloc.hours,
          })
          .onConflictDoUpdate({
            target: [
              schema.allocations.organizationId,
              schema.allocations.personId,
              schema.allocations.projectId,
              schema.allocations.month,
            ],
            set: { hours: scenAlloc.hours },
          });
      }

      promotedIds.push(allocId);
      promoted++;
    }

    // Batch-mark all promoted allocations
    if (promotedIds.length > 0) {
      await tx
        .update(schema.scenarioAllocations)
        .set({ promotedAt: new Date() })
        .where(sql`${schema.scenarioAllocations.id} = ANY(${promotedIds}::uuid[])`);
    }

    return { promoted, skipped, errors };
  });
}

// ---------------------------------------------------------------------------
// Temp Entities
// ---------------------------------------------------------------------------

export async function createTempEntity(
  orgId: string,
  scenarioId: string,
  data: CreateTempEntityRequest,
): Promise<ScenarioTempEntity> {
  await getScenarioOrThrow(scenarioId, orgId);

  const [entity] = await db
    .insert(schema.scenarioTempEntities)
    .values({
      scenarioId,
      organizationId: orgId,
      entityType: data.entityType,
      name: data.name,
      departmentId: data.departmentId ?? null,
      disciplineId: data.disciplineId ?? null,
      targetHoursPerMonth: data.targetHoursPerMonth ?? 160,
    })
    .returning();

  if (!entity) throw new InternalError('Failed to create temp entity');

  return {
    id: entity.id,
    scenarioId: entity.scenarioId,
    organizationId: entity.organizationId,
    entityType: entity.entityType,
    name: entity.name,
    departmentId: entity.departmentId,
    disciplineId: entity.disciplineId,
    targetHoursPerMonth: entity.targetHoursPerMonth,
    createdAt: entity.createdAt.toISOString(),
  };
}

export async function listTempEntities(
  orgId: string,
  scenarioId: string,
): Promise<ScenarioTempEntity[]> {
  await getScenarioOrThrow(scenarioId, orgId);

  const rows = await db
    .select()
    .from(schema.scenarioTempEntities)
    .where(
      and(
        eq(schema.scenarioTempEntities.scenarioId, scenarioId),
        eq(schema.scenarioTempEntities.organizationId, orgId),
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    scenarioId: row.scenarioId,
    organizationId: row.organizationId,
    entityType: row.entityType,
    name: row.name,
    departmentId: row.departmentId,
    disciplineId: row.disciplineId,
    targetHoursPerMonth: row.targetHoursPerMonth,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function deleteTempEntity(
  orgId: string,
  scenarioId: string,
  entityId: string,
): Promise<void> {
  await getScenarioOrThrow(scenarioId, orgId);

  // Also delete related allocations
  await db
    .delete(schema.scenarioAllocations)
    .where(
      and(
        eq(schema.scenarioAllocations.scenarioId, scenarioId),
        eq(schema.scenarioAllocations.tempEntityId, entityId),
      ),
    );

  await db
    .delete(schema.scenarioTempEntities)
    .where(
      and(
        eq(schema.scenarioTempEntities.id, entityId),
        eq(schema.scenarioTempEntities.scenarioId, scenarioId),
      ),
    );
}
