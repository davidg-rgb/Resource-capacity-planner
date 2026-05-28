// v7.0 — Phase 54 / Plan 54-03: AUDIT-03 contract test.
//
// Asserts that POST/PATCH/DELETE on /api/programs/* each emit a change_log row
// via the register.service.ts dispatcher (Plan 54-02 refactored the legacy
// program.service.ts to delegate). Three rows expected for a single
// create → update → delete sequence.
//
// Mirrors the shape of src/features/admin/__tests__/register.integration.test.ts
// but exercises the *legacy* route, not the v5 admin route.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, asc, eq } from 'drizzle-orm';

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

const listRoutePromise = import('@/app/api/programs/route');
const idRoutePromise = import('@/app/api/programs/[id]/route');

function req(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const createPayload = { name: 'Atlas Program', description: 'desc' };
const updatePayload = { name: 'Atlas v2' };

beforeAll(async () => {
  await initRegisterTestDb(testDb);
});

beforeEach(async () => {
  await resetRegisterTestDb(testDb);
});

describe('AUDIT-03: /api/programs/* writes change_log rows via register.service.ts', () => {
  it('POST writes 1 REGISTER_ROW_CREATED row with actor_persona_id=userId', async () => {
    const { POST } = await listRoutePromise;
    const response = await POST(req('POST', 'http://test/api/programs', createPayload) as never);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('program');
    const created = body.program;
    expect(created.id).toBeDefined();

    const logs = await testDb
      .select()
      .from(schema.changeLog)
      .where(
        and(
          eq(schema.changeLog.entity, 'program'),
          eq(schema.changeLog.entityId, created.id),
          eq(schema.changeLog.organizationId, ORG_ID),
        ),
      );
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('REGISTER_ROW_CREATED');
    expect(logs[0].actorPersonaId).toBe(fakeAuth.userId);
  });

  it('PATCH writes 1 REGISTER_ROW_UPDATED row', async () => {
    const { POST } = await listRoutePromise;
    const { PATCH } = await idRoutePromise;
    const createResp = await POST(req('POST', 'http://test/api/programs', createPayload) as never);
    const { program: created } = await createResp.json();

    const patchResp = await PATCH(
      req('PATCH', `http://test/api/programs/${created.id}`, updatePayload) as never,
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(patchResp.status).toBe(200);
    const patchBody = await patchResp.json();
    expect(patchBody).toHaveProperty('program');

    const logs = await testDb
      .select()
      .from(schema.changeLog)
      .where(
        and(
          eq(schema.changeLog.entity, 'program'),
          eq(schema.changeLog.entityId, created.id),
          eq(schema.changeLog.organizationId, ORG_ID),
          eq(schema.changeLog.action, 'REGISTER_ROW_UPDATED'),
        ),
      );
    expect(logs).toHaveLength(1);
    expect(logs[0].actorPersonaId).toBe(fakeAuth.userId);
  });

  it('DELETE writes 1 REGISTER_ROW_DELETED row and returns 204', async () => {
    const { POST } = await listRoutePromise;
    const { DELETE } = await idRoutePromise;
    const createResp = await POST(req('POST', 'http://test/api/programs', createPayload) as never);
    const { program: created } = await createResp.json();

    const deleteResp = await DELETE(
      req('DELETE', `http://test/api/programs/${created.id}`) as never,
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(deleteResp.status).toBe(204);

    const logs = await testDb
      .select()
      .from(schema.changeLog)
      .where(
        and(
          eq(schema.changeLog.entity, 'program'),
          eq(schema.changeLog.entityId, created.id),
          eq(schema.changeLog.organizationId, ORG_ID),
          eq(schema.changeLog.action, 'REGISTER_ROW_DELETED'),
        ),
      );
    expect(logs).toHaveLength(1);
    expect(logs[0].actorPersonaId).toBe(fakeAuth.userId);
  });

  it('create → update → delete writes exactly 3 change_log rows in order', async () => {
    const { POST } = await listRoutePromise;
    const { PATCH, DELETE } = await idRoutePromise;

    const createResp = await POST(req('POST', 'http://test/api/programs', createPayload) as never);
    const { program: created } = await createResp.json();

    await PATCH(req('PATCH', `http://test/api/programs/${created.id}`, updatePayload) as never, {
      params: Promise.resolve({ id: created.id }),
    });
    await DELETE(req('DELETE', `http://test/api/programs/${created.id}`) as never, {
      params: Promise.resolve({ id: created.id }),
    });

    const logs = await testDb
      .select()
      .from(schema.changeLog)
      .where(
        and(
          eq(schema.changeLog.entity, 'program'),
          eq(schema.changeLog.entityId, created.id),
          eq(schema.changeLog.organizationId, ORG_ID),
        ),
      )
      .orderBy(asc(schema.changeLog.createdAt));

    expect(logs).toHaveLength(3);
    expect(logs.map((r) => r.action)).toEqual([
      'REGISTER_ROW_CREATED',
      'REGISTER_ROW_UPDATED',
      'REGISTER_ROW_DELETED',
    ]);
    expect(logs.every((r) => r.actorPersonaId === fakeAuth.userId)).toBe(true);
  });
});
