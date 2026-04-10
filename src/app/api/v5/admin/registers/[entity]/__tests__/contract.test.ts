// v5.0 — Phase 43 / Plan 43-01: contract tests for /api/v5/admin/registers
//
// Covers GET / POST / PATCH / DELETE per entity, plus 403 (non-admin),
// 404 (unknown entity), 409 (DEPENDENT_ROWS_EXIST), and PATCH un-archive.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';

import * as schema from '@/db/schema';
import {
  ORG_ID,
  initRegisterTestDb,
  resetRegisterTestDb,
  nextMonthKey,
} from '@/features/admin/__tests__/register.test-fixtures';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const fakeAuth: { orgId: string; userId: string; role: 'admin' | 'planner' | 'viewer' | 'owner' } =
  {
    orgId: ORG_ID,
    userId: 'user_admin_1',
    role: 'admin',
  };

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async (min: string) => {
    // Mirror the production behaviour: throw ForbiddenError if role is below min.
    const order = { viewer: 0, planner: 1, admin: 2, owner: 3 } as const;
    if (order[fakeAuth.role as keyof typeof order] < order[min as keyof typeof order]) {
      const { ForbiddenError } = await import('@/lib/errors');
      throw new ForbiddenError(`${min} role required for this action`);
    }
    return fakeAuth;
  }),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

const listRoutePromise = import('../route');
const idRoutePromise = import('../[id]/route');

beforeAll(async () => {
  await initRegisterTestDb(testDb);
});

beforeEach(async () => {
  await resetRegisterTestDb(testDb);
  fakeAuth.role = 'admin';
  fakeAuth.userId = 'user_admin_1';
});

function req(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const ENTITIES = ['department', 'discipline', 'program', 'project', 'person'] as const;

describe('Phase 43 — /api/v5/admin/registers contract', () => {
  describe.each(ENTITIES)('entity=%s', (entity) => {
    it(`GET returns 200 with rows array`, async () => {
      const { GET } = await listRoutePromise;
      const res = await GET(
        req(
          'GET',
          `http://localhost/api/v5/admin/registers/${entity}?includeArchived=true`,
        ) as never,
        { params: Promise.resolve({ entity }) },
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as { rows: unknown[] };
      expect(Array.isArray(json.rows)).toBe(true);
    });
  });

  it('POST department creates a row + returns 201', async () => {
    const { POST } = await listRoutePromise;
    const res = await POST(
      req('POST', 'http://localhost/api/v5/admin/registers/department', {
        name: 'Bridges',
      }) as never,
      { params: Promise.resolve({ entity: 'department' }) },
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { row: { id: string; name: string } };
    expect(json.row.name).toBe('Bridges');
  });

  it('POST program → GET list reflects it', async () => {
    const { POST } = await listRoutePromise;
    const { GET } = await listRoutePromise;
    await POST(
      req('POST', 'http://localhost/api/v5/admin/registers/program', { name: 'PA' }) as never,
      { params: Promise.resolve({ entity: 'program' }) },
    );
    const res = await GET(req('GET', 'http://localhost/api/v5/admin/registers/program') as never, {
      params: Promise.resolve({ entity: 'program' }),
    });
    const json = (await res.json()) as { rows: Array<{ name: string }> };
    expect(json.rows.find((r) => r.name === 'PA')).toBeDefined();
  });

  it('PATCH updates a row', async () => {
    const { POST } = await listRoutePromise;
    const { PATCH } = await idRoutePromise;
    const create = await POST(
      req('POST', 'http://localhost/api/v5/admin/registers/department', { name: 'Old' }) as never,
      { params: Promise.resolve({ entity: 'department' }) },
    );
    const created = (await create.json()) as { row: { id: string } };
    const res = await PATCH(
      req('PATCH', `http://localhost/api/v5/admin/registers/department/${created.row.id}`, {
        name: 'New',
      }) as never,
      { params: Promise.resolve({ entity: 'department', id: created.row.id }) },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { row: { name: string } };
    expect(json.row.name).toBe('New');
  });

  it('DELETE archives a row', async () => {
    const { POST } = await listRoutePromise;
    const { DELETE } = await idRoutePromise;
    const create = await POST(
      req('POST', 'http://localhost/api/v5/admin/registers/program', { name: 'P-arch' }) as never,
      { params: Promise.resolve({ entity: 'program' }) },
    );
    const created = (await create.json()) as { row: { id: string } };
    const res = await DELETE(
      req('DELETE', `http://localhost/api/v5/admin/registers/program/${created.row.id}`) as never,
      { params: Promise.resolve({ entity: 'program', id: created.row.id }) },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { row: { archivedAt: string | null } };
    expect(json.row.archivedAt).toBeTruthy();
  });

  it('PATCH { archivedAt: null } un-archives', async () => {
    const { POST } = await listRoutePromise;
    const { DELETE, PATCH } = await idRoutePromise;
    const create = await POST(
      req('POST', 'http://localhost/api/v5/admin/registers/program', { name: 'P-un' }) as never,
      { params: Promise.resolve({ entity: 'program' }) },
    );
    const created = (await create.json()) as { row: { id: string } };
    await DELETE(
      req('DELETE', `http://localhost/api/v5/admin/registers/program/${created.row.id}`) as never,
      { params: Promise.resolve({ entity: 'program', id: created.row.id }) },
    );
    const res = await PATCH(
      req('PATCH', `http://localhost/api/v5/admin/registers/program/${created.row.id}`, {
        archivedAt: null,
      }) as never,
      { params: Promise.resolve({ entity: 'program', id: created.row.id }) },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { row: { archivedAt: string | null } };
    expect(json.row.archivedAt).toBeNull();
  });

  it('unknown entity → 404', async () => {
    const { GET } = await listRoutePromise;
    const res = await GET(req('GET', 'http://localhost/api/v5/admin/registers/widgets') as never, {
      params: Promise.resolve({ entity: 'widgets' }),
    });
    expect(res.status).toBe(404);
  });

  it('non-admin role → 403', async () => {
    fakeAuth.role = 'planner';
    const { GET } = await listRoutePromise;
    const res = await GET(
      req('GET', 'http://localhost/api/v5/admin/registers/department') as never,
      { params: Promise.resolve({ entity: 'department' }) },
    );
    expect(res.status).toBe(403);
  });

  it('viewer role → 403', async () => {
    fakeAuth.role = 'viewer';
    const { POST } = await listRoutePromise;
    const res = await POST(
      req('POST', 'http://localhost/api/v5/admin/registers/department', { name: 'X' }) as never,
      { params: Promise.resolve({ entity: 'department' }) },
    );
    expect(res.status).toBe(403);
  });

  it('DELETE with dependent row → 409 with code DEPENDENT_ROWS_EXIST', async () => {
    // Seed a department with a person assigned to trigger blocker.
    const [disc] = await testDb
      .insert(schema.disciplines)
      .values({ organizationId: ORG_ID, name: 'D', abbreviation: 'D1' })
      .returning();
    const [dept] = await testDb
      .insert(schema.departments)
      .values({ organizationId: ORG_ID, name: 'BlockedDept' })
      .returning();
    await testDb.insert(schema.people).values({
      organizationId: ORG_ID,
      firstName: 'X',
      lastName: 'Y',
      departmentId: dept.id,
      disciplineId: disc.id,
    });

    const { DELETE } = await idRoutePromise;
    const res = await DELETE(
      req('DELETE', `http://localhost/api/v5/admin/registers/department/${dept.id}`) as never,
      { params: Promise.resolve({ entity: 'department', id: dept.id }) },
    );
    expect(res.status).toBe(409);
    const json = (await res.json()) as {
      error: { code: string; message: string; details?: { blockers?: Record<string, number> } };
    };
    expect(json.error.code).toBe('ERR_CONFLICT');
    expect(json.error.message).toBe('DEPENDENT_ROWS_EXIST');
    expect(json.error.details?.blockers?.people).toBeGreaterThan(0);
    void nextMonthKey;
    void sql;
  });
});
