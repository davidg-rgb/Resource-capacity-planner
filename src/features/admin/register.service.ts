/* eslint-disable @typescript-eslint/no-explicit-any --
 * The register dispatcher operates over a union of 5 different Drizzle tables;
 * Drizzle's table+column types are not unifiable into a single typed surface
 * without a code-generated wrapper. We use `any` deliberately for the table
 * handle and per-call casts. The public surface (RegisterRow, exported
 * functions) is what callers consume, and runtime behaviour is covered by
 * three PGlite test files.
 */
// v5.0 — Phase 43 / Plan 43-01: register.service.ts
//
// ARCHITECTURE §6.11b: thin admin-side dispatcher over the five tenant
// register tables (people / projects / departments / disciplines / programs).
//
// ADR-003 invariant: every mutation opens its own db.transaction() and writes
// the corresponding change_log row INSIDE that same tx by calling
// `recordChange(input, tx)`. We do NOT delegate to the v4 service modules —
// they call db.* directly and would write outside our tx (RESEARCH §1
// Option A). All inserts/updates are inlined here against `schema.*`.

import { and, asc, desc, eq, gte, isNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod/v4';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { recordChange } from '@/features/change-log/change-log.service';
import { ConflictError, InternalError, NotFoundError, ValidationError } from '@/lib/errors';

import { departmentCreateSchema, departmentUpdateSchema } from './register.schema';
import {
  disciplineCreateSchema,
  disciplineUpdateSchema,
} from '@/features/disciplines/discipline.schema';
import { personCreateSchema, personUpdateSchema } from '@/features/people/person.schema';
import { programCreateSchema, programUpdateSchema } from '@/features/programs/program.schema';
import { projectCreateSchema, projectUpdateSchema } from '@/features/projects/project.schema';

export type RegisterEntity = 'person' | 'project' | 'department' | 'discipline' | 'program';

const REGISTER_ENTITIES: readonly RegisterEntity[] = [
  'person',
  'project',
  'department',
  'discipline',
  'program',
] as const;

function assertEntity(entity: string): asserts entity is RegisterEntity {
  if (!(REGISTER_ENTITIES as readonly string[]).includes(entity)) {
    throw new NotFoundError('RegisterEntity', entity);
  }
}

// ---------------------------------------------------------------------------
// Per-entity table accessor — picks the Drizzle pgTable for the given entity.
// ---------------------------------------------------------------------------
function tableFor(entity: RegisterEntity) {
  switch (entity) {
    case 'person':
      return schema.people;
    case 'project':
      return schema.projects;
    case 'department':
      return schema.departments;
    case 'discipline':
      return schema.disciplines;
    case 'program':
      return schema.programs;
  }
}

function changeLogEntity(entity: RegisterEntity) {
  // RegisterEntity union is literally a subset of the change_log_entity enum
  // after migration 0008. Identity map.
  return entity;
}

function orderForList(entity: RegisterEntity) {
  // Archived rows first (DESC NULLS LAST in Postgres puts NULLs last; we
  // want NULLs LAST too — nope, plan says NULLS FIRST. Postgres default
  // for DESC is NULLS FIRST already, but PGlite needs an explicit clause.
  // We use ORDER BY (archived_at IS NULL) ASC so non-null (archived) sort
  // first, then archived_at DESC, then name.
  if (entity === 'person') {
    return [
      sql`${schema.people.archivedAt} IS NULL`,
      desc(schema.people.archivedAt),
      asc(schema.people.firstName),
      asc(schema.people.lastName),
    ];
  }

  const t = tableFor(entity) as any;
  return [sql`${t.archivedAt} IS NULL`, desc(t.archivedAt), asc(t.name)];
}

// ---------------------------------------------------------------------------
// Validation — pick the right Zod schema per entity.
// ---------------------------------------------------------------------------
function parseCreate(entity: RegisterEntity, data: unknown) {
  try {
    switch (entity) {
      case 'person':
        return personCreateSchema.parse(data);
      case 'project':
        return projectCreateSchema.parse(data);
      case 'department':
        return departmentCreateSchema.parse(data);
      case 'discipline':
        return disciplineCreateSchema.parse(data);
      case 'program':
        return programCreateSchema.parse(data);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError(`Invalid ${entity} payload`, {
        fields: err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    throw err;
  }
}

function parseUpdate(entity: RegisterEntity, data: unknown) {
  // Update schemas allow archivedAt:null for un-archive (D-11).
  const baseSchema = (() => {
    switch (entity) {
      case 'person':
        return personUpdateSchema;
      case 'project':
        return projectUpdateSchema;
      case 'department':
        return departmentUpdateSchema;
      case 'discipline':
        return disciplineUpdateSchema;
      case 'program':
        return programUpdateSchema;
    }
  })();
  const withArchive = (baseSchema as unknown as z.ZodObject).extend({
    archivedAt: z.union([z.date(), z.null()]).optional(),
  });
  try {
    return withArchive.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError(`Invalid ${entity} update payload`, {
        fields: err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export interface CreateRegisterRowInput {
  orgId: string;
  actorUserId: string;
  entity: RegisterEntity;
  data: unknown;
}

export interface UpdateRegisterRowInput {
  orgId: string;
  actorUserId: string;
  entity: RegisterEntity;
  id: string;
  data: unknown;
}

export interface ArchiveRegisterRowInput {
  orgId: string;
  actorUserId: string;
  entity: RegisterEntity;
  id: string;
}

export interface ListRegisterRowsInput {
  orgId: string;
  entity: RegisterEntity;
  includeArchived: boolean;
}

// Loosely typed — admin register surface returns the raw DB row for whatever
// entity was requested. Callers narrow with their own type guards. We use
// `any` here intentionally because the union of 5 different table row shapes
// is not worth the type acrobatics for an internal admin API.

export type RegisterRow = any;

export async function createRegisterRow(input: CreateRegisterRowInput): Promise<RegisterRow> {
  assertEntity(input.entity);
  const parsed = parseCreate(input.entity, input.data);

  return db.transaction(async (tx) => {
    const t = tableFor(input.entity);
    const insertValues = { ...(parsed as object), organizationId: input.orgId };
    const insertedRows = (await tx

      .insert(t as any)

      .values(insertValues as any)
      .returning()) as unknown as RegisterRow[];
    const row = insertedRows[0];
    if (!row) {
      throw new InternalError(`Failed to insert ${input.entity}`);
    }
    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorUserId,
        entity: changeLogEntity(input.entity),
        entityId: (row as RegisterRow).id,
        action: 'REGISTER_ROW_CREATED',
        previousValue: null,
        newValue: row as Record<string, unknown>,
        context: { source: 'admin.register.create' },
      },
      tx,
    );
    return row as RegisterRow;
  });
}

export async function updateRegisterRow(input: UpdateRegisterRowInput): Promise<RegisterRow> {
  assertEntity(input.entity);
  const parsed = parseUpdate(input.entity, input.data);

  return db.transaction(async (tx) => {
    const t = tableFor(input.entity);
    const idCol = (t as { id: unknown }).id as never;
    const orgCol = (t as { organizationId: unknown }).organizationId as never;

    // SELECT the before-row inside the tx for atomic before/after audit.

    const beforeRows = (await tx
      .select()
      .from(t as any)
      .where(and(eq(idCol, input.id), eq(orgCol, input.orgId)))) as RegisterRow[];
    if (beforeRows.length === 0) {
      throw new NotFoundError(input.entity, input.id);
    }
    const before = beforeRows[0];

    const afterRows = (await tx
      .update(t as any)
      .set(parsed as Record<string, unknown>)
      .where(and(eq(idCol, input.id), eq(orgCol, input.orgId)))
      .returning()) as unknown as RegisterRow[];
    const after = afterRows[0];

    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorUserId,
        entity: changeLogEntity(input.entity),
        entityId: input.id,
        action: 'REGISTER_ROW_UPDATED',
        previousValue: before,
        newValue: after,
        context: { source: 'admin.register.update' },
      },
      tx,
    );
    return after;
  });
}

export async function archiveRegisterRow(input: ArchiveRegisterRowInput): Promise<RegisterRow> {
  assertEntity(input.entity);

  return db.transaction(async (tx) => {
    const t = tableFor(input.entity);
    const idCol = (t as { id: unknown }).id as never;
    const orgCol = (t as { organizationId: unknown }).organizationId as never;

    const beforeRows = (await tx
      .select()
      .from(t as any)
      .where(and(eq(idCol, input.id), eq(orgCol, input.orgId)))) as RegisterRow[];
    if (beforeRows.length === 0) {
      throw new NotFoundError(input.entity, input.id);
    }
    const before = beforeRows[0];

    // ----- dependent-row blocker checks (RESEARCH §3) -----
    const blockers = await collectBlockers(tx, input.entity, input.orgId, input.id);
    const total = Object.values(blockers).reduce((acc, n) => acc + (n ?? 0), 0);
    if (total > 0) {
      throw new ConflictError('DEPENDENT_ROWS_EXIST', {
        entity: input.entity,
        id: input.id,
        blockers,
      });
    }

    const setValues: Record<string, unknown> = { archivedAt: new Date() };
    if (input.entity === 'project') {
      // v4 archiveProject sets BOTH; preserve semantics.
      setValues.status = 'archived';
    }

    const afterRows = (await tx
      .update(t as any)
      .set(setValues)
      .where(and(eq(idCol, input.id), eq(orgCol, input.orgId)))
      .returning()) as unknown as RegisterRow[];
    const after = afterRows[0];

    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorUserId,
        entity: changeLogEntity(input.entity),
        entityId: input.id,
        action: 'REGISTER_ROW_DELETED',
        previousValue: before,
        newValue: after,
        context: { source: 'admin.register.archive' },
      },
      tx,
    );
    return after;
  });
}

export async function listRegisterRows(input: ListRegisterRowsInput): Promise<RegisterRow[]> {
  assertEntity(input.entity);
  const t = tableFor(input.entity);
  const orgCol = (t as { organizationId: unknown }).organizationId as never;
  const archCol = (t as { archivedAt: unknown }).archivedAt as never;

  const conditions = [eq(orgCol, input.orgId)];
  if (!input.includeArchived) {
    conditions.push(isNull(archCol));
  }

  const rows = (await db
    .select()
    .from(t as any)
    .where(and(...conditions))
    .orderBy(...orderForList(input.entity))) as RegisterRow[];
  return rows;
}

// ---------------------------------------------------------------------------
// Dependent-row blocker queries — RESEARCH §3 (corrected over D-10).
// ---------------------------------------------------------------------------

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function collectBlockers(
  tx: Tx,
  entity: RegisterEntity,
  orgId: string,
  id: string,
): Promise<Record<string, number>> {
  const monthKey = currentMonthKey(); // YYYY-MM-01
  const blockers: Record<string, number> = {};

  switch (entity) {
    case 'person': {
      const [a] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.allocations)
        .where(
          and(
            eq(schema.allocations.organizationId, orgId),
            eq(schema.allocations.personId, id),
            gte(schema.allocations.month, monthKey),
          ),
        );
      const [lp] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.organizationId, orgId),
            eq(schema.projects.leadPmPersonId, id),
            ne(schema.projects.status, 'archived'),
          ),
        );
      const [p] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.allocationProposals)
        .where(
          and(
            eq(schema.allocationProposals.organizationId, orgId),
            eq(schema.allocationProposals.personId, id),
            eq(schema.allocationProposals.status, 'proposed'),
          ),
        );
      if (Number(a.n) > 0) blockers.allocations = Number(a.n);
      if (Number(lp.n) > 0) blockers.leadPm = Number(lp.n);
      if (Number(p.n) > 0) blockers.proposals = Number(p.n);
      return blockers;
    }
    case 'project': {
      const [a] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.allocations)
        .where(
          and(
            eq(schema.allocations.organizationId, orgId),
            eq(schema.allocations.projectId, id),
            gte(schema.allocations.month, monthKey),
          ),
        );
      const [p] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.allocationProposals)
        .where(
          and(
            eq(schema.allocationProposals.organizationId, orgId),
            eq(schema.allocationProposals.projectId, id),
            eq(schema.allocationProposals.status, 'proposed'),
          ),
        );
      if (Number(a.n) > 0) blockers.allocations = Number(a.n);
      if (Number(p.n) > 0) blockers.proposals = Number(p.n);
      return blockers;
    }
    case 'department': {
      const [pp] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.people)
        .where(
          and(
            eq(schema.people.organizationId, orgId),
            eq(schema.people.departmentId, id),
            isNull(schema.people.archivedAt),
          ),
        );
      if (Number(pp.n) > 0) blockers.people = Number(pp.n);
      return blockers;
    }
    case 'discipline': {
      const [pp] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.people)
        .where(
          and(
            eq(schema.people.organizationId, orgId),
            eq(schema.people.disciplineId, id),
            isNull(schema.people.archivedAt),
          ),
        );
      if (Number(pp.n) > 0) blockers.people = Number(pp.n);
      return blockers;
    }
    case 'program': {
      const [pr] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.organizationId, orgId),
            eq(schema.projects.programId, id),
            ne(schema.projects.status, 'archived'),
            isNull(schema.projects.archivedAt),
          ),
        );
      if (Number(pr.n) > 0) blockers.projects = Number(pr.n);
      return blockers;
    }
  }
}

function currentMonthKey(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}
