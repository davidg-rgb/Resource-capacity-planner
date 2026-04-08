// v5.0 — Phase 41 / Plan 41-01: TC-API-050..051 contract tests for GET /api/v5/capacity.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import * as schema from '@/db/schema';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const fakeAuth = { orgId: '', userId: 'user_test', role: 'planner' as const };
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => fakeAuth),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

const { GET } = await import('../route');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_ID = 'd0000000-0000-4000-8000-000000000000';
const P_ID = 'b1111111-1111-4111-8111-111111111111';
const PROJ_ID = 'c1111111-1111-4111-8111-111111111111';

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE organizations (id uuid PRIMARY KEY, name varchar(100) NOT NULL);
    CREATE TABLE departments (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(100) NOT NULL
    );
    CREATE TABLE people (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      department_id uuid NOT NULL REFERENCES departments(id),
      first_name varchar(100) NOT NULL,
      last_name varchar(100) NOT NULL,
      target_hours_per_month integer
    );
    CREATE TABLE projects (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL
    );
    CREATE TABLE allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      month date NOT NULL,
      hours integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (organization_id, person_id, project_id, month)
    );
  `);
  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_ID}, 'Test')`);
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES (${DEPT_ID}, ${ORG_ID}, 'Eng')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month)
        VALUES (${P_ID}, ${ORG_ID}, ${DEPT_ID}, 'Anna', 'Tester', 100)`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJ_ID}, ${ORG_ID}, 'Atlas')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocations`);
  fakeAuth.orgId = ORG_ID;
});

function makeReq(qs: string): Request {
  return new Request(`http://localhost/api/v5/capacity?${qs}`);
}

describe('TC-API-050: GET /api/v5/capacity happy path', () => {
  it('returns { cells, people } for departmentId + monthRange', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${P_ID}, ${PROJ_ID}, '2026-06-01', 80)`,
    );
    const res = await GET(
      makeReq(`departmentId=${DEPT_ID}&startMonth=2026-06&endMonth=2026-06`) as never,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      cells: Array<{ personId: string; utilizationPct: number; status: string }>;
      people: Array<{ id: string }>;
    };
    expect(json.people).toHaveLength(1);
    expect(json.cells).toHaveLength(1);
    expect(json.cells[0].utilizationPct).toBe(80);
    expect(json.cells[0].status).toBe('ok');
  });
});

describe('TC-API-051: GET /api/v5/capacity error cases', () => {
  it('400 when departmentId missing', async () => {
    const res = await GET(makeReq(`startMonth=2026-06&endMonth=2026-06`) as never);
    expect(res.status).toBe(400);
  });

  it('400 when monthRange exceeds 24 months', async () => {
    const res = await GET(
      makeReq(`departmentId=${DEPT_ID}&startMonth=2026-01&endMonth=2028-12`) as never,
    );
    expect(res.status).toBe(400);
  });

  it('400 when startMonth is malformed', async () => {
    const res = await GET(
      makeReq(`departmentId=${DEPT_ID}&startMonth=2026-6&endMonth=2026-12`) as never,
    );
    expect(res.status).toBe(400);
  });
});
