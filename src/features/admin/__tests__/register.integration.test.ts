// v5.0 — Phase 43 / Plan 43-04: TC-REG-001..010 HTTP integration tests.
//
// Exercises the full HTTP → route → service → db → change_log path for all
// five register entities. Complements:
//   - register.service.test.ts       (unit-level service behaviour)
//   - register.dependents.test.ts    (TC-REG-003..007 unit-level blockers)
//   - register.audit.test.ts         (per-mutation audit row shape)
//   - contract.test.ts               (API-layer request/response shapes)
//
// This file is the end-to-end smoke: it seeds baseline ref data and then
// runs create → update → archive → un-archive for every entity via the
// Next route handlers, then asserts `change_log` ends up with exactly the
// expected 15 rows (TC-REG-010).

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, eq } from 'drizzle-orm';

import * as schema from '@/db/schema';
import {
  ORG_ID,
  initRegisterTestDb,
  resetRegisterTestDb,
} from '@/features/admin/__tests__/register.test-fixtures';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const fakeAuth = {
  orgId: ORG_ID,
  userId: 'user_admin_1',
  role: 'admin' as 'admin' | 'planner' | 'viewer' | 'owner',
};

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async (min: string) => {
    const order = { viewer: 0, planner: 1, admin: 2, owner: 3 } as const;
    if (order[fakeAuth.role] < order[min as keyof typeof order]) {
      const { ForbiddenError } = await import('@/lib/errors');
      throw new ForbiddenError(`${min} role required for this action`);
    }
    return fakeAuth;
  }),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

const listRoutePromise = import('@/app/api/v5/admin/registers/[entity]/route');
const idRoutePromise = import('@/app/api/v5/admin/registers/[entity]/[id]/route');

function req(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

type Entity = 'person' | 'project' | 'department' | 'discipline' | 'program';

type BaseSeed = {
  departmentId: string;
  disciplineId: string;
  programId: string;
};

async function seedBase(): Promise<BaseSeed> {
  const [dept] = await testDb
    .insert(schema.departments)
    .values({ organizationId: ORG_ID, name: 'Seed Dept' })
    .returning();
  const [disc] = await testDb
    .insert(schema.disciplines)
    .values({ organizationId: ORG_ID, name: 'Seed Disc', abbreviation: 'SD' })
    .returning();
  const [prog] = await testDb
    .insert(schema.programs)
    .values({ organizationId: ORG_ID, name: 'Seed Program' })
    .returning();
  return { departmentId: dept.id, disciplineId: disc.id, programId: prog.id };
}

function payloadForCreate(entity: Entity, seed: BaseSeed, tag: string): Record<string, unknown> {
  switch (entity) {
    case 'person':
      return {
        firstName: `First${tag}`,
        lastName: `Last${tag}`,
        departmentId: seed.departmentId,
        disciplineId: seed.disciplineId,
        targetHoursPerMonth: 160,
      };
    case 'project':
      return { name: `Project${tag}`, programId: seed.programId, status: 'active' };
    case 'department':
      return { name: `Dept${tag}` };
    case 'discipline':
      return { name: `Disc${tag}`, abbreviation: `D${tag.slice(-2)}` };
    case 'program':
      return { name: `Prog${tag}`, description: `desc ${tag}` };
  }
}

function updatePayload(entity: Entity): Record<string, unknown> {
  switch (entity) {
    case 'person':
      return { firstName: 'Updated' };
    case 'project':
      return { name: 'Updated project' };
    case 'department':
      return { name: 'Updated dept' };
    case 'discipline':
      return { name: 'Updated disc' };
    case 'program':
      return { name: 'Updated prog' };
  }
}

async function POST(entity: Entity, body: Record<string, unknown>) {
  const { POST: handler } = await listRoutePromise;
  return handler(req('POST', `http://localhost/api/v5/admin/registers/${entity}`, body) as never, {
    params: Promise.resolve({ entity }),
  });
}
async function GET(entity: Entity, qs = '') {
  const { GET: handler } = await listRoutePromise;
  return handler(req('GET', `http://localhost/api/v5/admin/registers/${entity}${qs}`) as never, {
    params: Promise.resolve({ entity }),
  });
}
async function PATCH(entity: Entity, id: string, body: Record<string, unknown>) {
  const { PATCH: handler } = await idRoutePromise;
  return handler(
    req('PATCH', `http://localhost/api/v5/admin/registers/${entity}/${id}`, body) as never,
    { params: Promise.resolve({ entity, id }) },
  );
}
async function DELETE(entity: Entity, id: string) {
  const { DELETE: handler } = await idRoutePromise;
  return handler(
    req('DELETE', `http://localhost/api/v5/admin/registers/${entity}/${id}`) as never,
    { params: Promise.resolve({ entity, id }) },
  );
}

const ENTITIES: Entity[] = ['person', 'project', 'department', 'discipline', 'program'];

beforeAll(async () => {
  await initRegisterTestDb(testDb);
});

beforeEach(async () => {
  await resetRegisterTestDb(testDb);
  fakeAuth.role = 'admin';
  fakeAuth.userId = 'user_admin_1';
});

describe('TC-REG-001 create: POST /api/v5/admin/registers/:entity', () => {
  it.each(ENTITIES)('creates a %s row and it is visible in subsequent GET', async (entity) => {
    const seed = await seedBase();
    const res = await POST(entity, payloadForCreate(entity, seed, '001'));
    expect(res.status).toBe(201);
    const { row } = (await res.json()) as { row: { id: string } };
    expect(row.id).toBeTruthy();

    const list = await GET(entity);
    const json = (await list.json()) as { rows: Array<{ id: string }> };
    expect(json.rows.some((r) => r.id === row.id)).toBe(true);
  });
});

describe('TC-REG-002 update: PATCH /api/v5/admin/registers/:entity/:id', () => {
  it.each(ENTITIES)(
    'updates a %s row and writes an audit row with before/after',
    async (entity) => {
      const seed = await seedBase();
      const create = await POST(entity, payloadForCreate(entity, seed, '002'));
      const { row: created } = (await create.json()) as { row: { id: string } };

      const res = await PATCH(entity, created.id, updatePayload(entity));
      expect(res.status).toBe(200);

      const audits = await testDb
        .select()
        .from(schema.changeLog)
        .where(
          and(
            eq(schema.changeLog.organizationId, ORG_ID),
            eq(schema.changeLog.entityId, created.id),
            eq(schema.changeLog.action, 'REGISTER_ROW_UPDATED'),
          ),
        );
      expect(audits.length).toBe(1);
      expect(audits[0].entity).toBe(entity);
      expect(audits[0].previousValue).toBeTruthy();
      expect(audits[0].newValue).toBeTruthy();
      expect(audits[0].context).toMatchObject({ source: 'admin.register.update' });
    },
  );
});

describe('TC-REG-003..007 HTTP-level dependent-row blocker smoke', () => {
  it('DELETE department with dependent person → 409 DEPENDENT_ROWS_EXIST + blocker counts', async () => {
    const seed = await seedBase();
    // Add a second dept so the blocker check isolates by id.
    const [target] = await testDb
      .insert(schema.departments)
      .values({ organizationId: ORG_ID, name: 'HasPerson' })
      .returning();
    await testDb.insert(schema.people).values({
      organizationId: ORG_ID,
      firstName: 'Dep',
      lastName: 'Blocker',
      departmentId: target.id,
      disciplineId: seed.disciplineId,
    });

    const res = await DELETE('department', target.id);
    expect(res.status).toBe(409);
    const json = (await res.json()) as {
      error: { code: string; message: string; details?: { blockers?: Record<string, number> } };
    };
    expect(json.error.code).toBe('ERR_CONFLICT');
    expect(json.error.message).toBe('DEPENDENT_ROWS_EXIST');
    expect(json.error.details?.blockers?.people).toBeGreaterThan(0);
  });
});

describe('TC-REG-008 archive happy path', () => {
  it.each(ENTITIES)(
    'DELETE %s with no dependents → 200 and row is hidden from default GET',
    async (entity) => {
      const seed = await seedBase();
      const create = await POST(entity, payloadForCreate(entity, seed, '008'));
      const { row: created } = (await create.json()) as { row: { id: string } };

      const res = await DELETE(entity, created.id);
      expect(res.status).toBe(200);
      const { row: archived } = (await res.json()) as {
        row: { archivedAt: string | null };
      };
      expect(archived.archivedAt).toBeTruthy();

      const defaultList = await GET(entity);
      const defaultJson = (await defaultList.json()) as { rows: Array<{ id: string }> };
      expect(defaultJson.rows.some((r) => r.id === created.id)).toBe(false);

      const archivedList = await GET(entity, '?includeArchived=true');
      const archivedJson = (await archivedList.json()) as { rows: Array<{ id: string }> };
      expect(archivedJson.rows.some((r) => r.id === created.id)).toBe(true);
    },
  );
});

describe('TC-REG-009 un-archive via PATCH { archivedAt: null }', () => {
  it.each(ENTITIES)('un-archives a previously archived %s row', async (entity) => {
    const seed = await seedBase();
    const create = await POST(entity, payloadForCreate(entity, seed, '009'));
    const { row: created } = (await create.json()) as { row: { id: string } };
    await DELETE(entity, created.id);

    const res = await PATCH(entity, created.id, { archivedAt: null });
    expect(res.status).toBe(200);
    const { row } = (await res.json()) as { row: { archivedAt: string | null } };
    expect(row.archivedAt).toBeNull();

    const list = await GET(entity);
    const json = (await list.json()) as { rows: Array<{ id: string }> };
    expect(json.rows.some((r) => r.id === created.id)).toBe(true);
  });
});

describe('TC-REG-010 audit completeness: every mutation writes exactly one change_log row', () => {
  it('create + update + archive for all 5 entities → 15 change_log rows', async () => {
    const seed = await seedBase();

    for (const entity of ENTITIES) {
      const create = await POST(entity, payloadForCreate(entity, seed, '010'));
      expect(create.status).toBe(201);
      const { row: created } = (await create.json()) as { row: { id: string } };
      const upd = await PATCH(entity, created.id, updatePayload(entity));
      expect(upd.status).toBe(200);
      const del = await DELETE(entity, created.id);
      expect(del.status).toBe(200);
    }

    const rows = await testDb
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.organizationId, ORG_ID));

    // Filter to just the register rows we care about (ignore any proposal /
    // allocation rows from other bootstrap code paths — this suite only
    // creates register mutations so it should be a clean 15, but we guard).
    const registerRows = rows.filter((r) =>
      ['REGISTER_ROW_CREATED', 'REGISTER_ROW_UPDATED', 'REGISTER_ROW_DELETED'].includes(r.action),
    );
    expect(registerRows.length).toBe(15);

    for (const r of registerRows) {
      expect(ENTITIES).toContain(r.entity as Entity);
      expect(r.actorPersonaId).toBeTruthy();
      expect(r.context).not.toBeNull();
    }

    // Per-action distribution: 5 × 3 = 15
    const byAction = registerRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.action] = (acc[r.action] ?? 0) + 1;
      return acc;
    }, {});
    expect(byAction.REGISTER_ROW_CREATED).toBe(5);
    expect(byAction.REGISTER_ROW_UPDATED).toBe(5);
    expect(byAction.REGISTER_ROW_DELETED).toBe(5);
  });
});
