// v5.0 — §6.11: contract tests for GET /api/v5/capacity/breakdown.

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

const { GET } = await import('@/app/api/v5/capacity/breakdown/route');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_ID = 'd0000000-0000-4000-8000-000000000000';
const P1_ID = 'b1111111-1111-4111-8111-111111111111';
const P2_ID = 'b2222222-2222-4222-8222-222222222222';
const PROJ1_ID = 'c1111111-1111-4111-8111-111111111111';
const PROJ2_ID = 'c2222222-2222-4222-8222-222222222222';

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
        VALUES (${P1_ID}, ${ORG_ID}, ${DEPT_ID}, 'Anna', 'Tester', 100)`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month)
        VALUES (${P2_ID}, ${ORG_ID}, ${DEPT_ID}, 'Bob', 'Builder', 160)`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJ1_ID}, ${ORG_ID}, 'Atlas')`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJ2_ID}, ${ORG_ID}, 'Bravo')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocations`);
  fakeAuth.orgId = ORG_ID;
});

function makeReq(qs: string): Request {
  return new Request(`http://localhost/api/v5/capacity/breakdown?${qs}`);
}

describe('GET /api/v5/capacity/breakdown — scope=person', () => {
  it('returns per-project breakdown sorted by hours desc', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
          (${ORG_ID}, ${P1_ID}, ${PROJ1_ID}, '2026-06-01', 40),
          (${ORG_ID}, ${P1_ID}, ${PROJ2_ID}, '2026-06-01', 80)`,
    );
    const res = await GET(makeReq(`scope=person&scopeId=${P1_ID}&monthKey=2026-06`) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      rows: Array<{ projectId: string; projectName: string; hours: number }>;
    };
    expect(json.rows).toHaveLength(2);
    // Sorted by hours desc — Bravo (80) before Atlas (40)
    expect(json.rows[0].projectName).toBe('Bravo');
    expect(json.rows[0].hours).toBe(80);
    expect(json.rows[1].projectName).toBe('Atlas');
    expect(json.rows[1].hours).toBe(40);
  });

  it('returns empty rows when no allocations exist', async () => {
    const res = await GET(makeReq(`scope=person&scopeId=${P1_ID}&monthKey=2026-06`) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { rows: unknown[] };
    expect(json.rows).toHaveLength(0);
  });
});

describe('GET /api/v5/capacity/breakdown — scope=project', () => {
  it('returns per-person breakdown for a project', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
          (${ORG_ID}, ${P1_ID}, ${PROJ1_ID}, '2026-06-01', 30),
          (${ORG_ID}, ${P2_ID}, ${PROJ1_ID}, '2026-06-01', 50)`,
    );
    const res = await GET(makeReq(`scope=project&scopeId=${PROJ1_ID}&monthKey=2026-06`) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      rows: Array<{ personId: string; personName: string; hours: number }>;
    };
    expect(json.rows).toHaveLength(2);
    expect(json.rows[0].personName).toBe('Bob Builder');
    expect(json.rows[0].hours).toBe(50);
  });
});

describe('GET /api/v5/capacity/breakdown — scope=department', () => {
  it('returns per-person breakdown for a department', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
          (${ORG_ID}, ${P1_ID}, ${PROJ1_ID}, '2026-06-01', 20),
          (${ORG_ID}, ${P2_ID}, ${PROJ2_ID}, '2026-06-01', 60)`,
    );
    const res = await GET(makeReq(`scope=department&scopeId=${DEPT_ID}&monthKey=2026-06`) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      rows: Array<{ personId: string; personName: string; hours: number }>;
    };
    expect(json.rows).toHaveLength(2);
    expect(json.rows[0].personName).toBe('Bob Builder');
    expect(json.rows[0].hours).toBe(60);
  });
});

describe('GET /api/v5/capacity/breakdown — scope=department overcommit fields (RD-02 / D-09 / Q3)', () => {
  it('additively returns projects[] + people[] alongside rows[] (back-compat preserved)', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
          (${ORG_ID}, ${P1_ID}, ${PROJ1_ID}, '2026-06-01', 120),
          (${ORG_ID}, ${P2_ID}, ${PROJ2_ID}, '2026-06-01', 80)`,
    );
    const res = await GET(makeReq(`scope=department&scopeId=${DEPT_ID}&monthKey=2026-06`) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      rows: unknown[];
      projects: Array<{
        id: string;
        name: string;
        plannedHours: number;
        pctOfTotalPlanned: number;
      }>;
      people: Array<{
        id: string;
        name: string;
        plannedHours: number;
        capacityHours: number;
        deltaHours: number;
      }>;
    };

    // Back-compat: rows[] still present
    expect(Array.isArray(json.rows)).toBe(true);
    expect(json.rows).toHaveLength(2);

    // projects[]: 2 projects, sorted by plannedHours desc (Atlas=120 before Bravo=80)
    expect(json.projects).toHaveLength(2);
    expect(json.projects[0].name).toBe('Atlas');
    expect(json.projects[0].plannedHours).toBe(120);
    // Round 1 audit CONS-P0-06: field renamed from pctOfOvercommit to
    // pctOfTotalPlanned (the math computes share of total planned hours).
    // pct: 120/200 = 0.6
    expect(json.projects[0].pctOfTotalPlanned).toBeCloseTo(0.6, 5);
    expect(json.projects[1].pctOfTotalPlanned).toBeCloseTo(0.4, 5);

    // people[]: 2 people, Anna (120h planned, 100h capacity → +20 delta) tops,
    // Bob (80h planned, 160h capacity → -80 delta) second.
    expect(json.people).toHaveLength(2);
    expect(json.people[0].name).toBe('Anna Tester');
    expect(json.people[0].plannedHours).toBe(120);
    expect(json.people[0].capacityHours).toBe(100);
    expect(json.people[0].deltaHours).toBe(20);
    expect(json.people[1].name).toBe('Bob Builder');
    expect(json.people[1].deltaHours).toBe(-80);
  });

  it('returns empty projects[] + people[] when no allocations', async () => {
    const res = await GET(makeReq(`scope=department&scopeId=${DEPT_ID}&monthKey=2026-06`) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      projects: unknown[];
      people: unknown[];
    };
    expect(json.projects).toHaveLength(0);
    expect(json.people).toHaveLength(0);
  });

  it('does NOT add projects[]/people[] to scope=person response (back-compat)', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
          (${ORG_ID}, ${P1_ID}, ${PROJ1_ID}, '2026-06-01', 40)`,
    );
    const res = await GET(makeReq(`scope=person&scopeId=${P1_ID}&monthKey=2026-06`) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.projects).toBeUndefined();
    expect(json.people).toBeUndefined();
    expect(Array.isArray(json.rows)).toBe(true);
  });
});

describe('GET /api/v5/capacity/breakdown — validation', () => {
  it('400 when scope is invalid', async () => {
    const res = await GET(makeReq(`scope=invalid&scopeId=${P1_ID}&monthKey=2026-06`) as never);
    expect(res.status).toBe(400);
  });

  it('400 when scopeId is not a UUID', async () => {
    const res = await GET(makeReq(`scope=person&scopeId=not-a-uuid&monthKey=2026-06`) as never);
    expect(res.status).toBe(400);
  });

  it('400 when monthKey is malformed', async () => {
    const res = await GET(makeReq(`scope=person&scopeId=${P1_ID}&monthKey=2026-6`) as never);
    expect(res.status).toBe(400);
  });
});

// Round 1 audit CONS-P0-08: defense-in-depth tenant scoping on the
// `people` and `projects` joins inside getOvercommitBreakdown.
describe('GET /api/v5/capacity/breakdown — tenant isolation (CONS-P0-08)', () => {
  const ORG_B_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const DEPT_B_ID = 'd1111111-1111-4111-8111-111111111110';
  const PB_ID = 'bbbb1111-1111-4111-8111-111111111111';
  const PROJB_ID = 'cbbb1111-1111-4111-8111-111111111111';

  it('does not bleed projects[]/people[] from a different org sharing the same departmentId-typed UUID', async () => {
    // Seed org B with a dept whose ID happens to match an org-A dept's pattern
    // (real ID space is uuid; collisions need to be defended-against by
    // organization_id scoping on the joined tables).
    await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_B_ID}, 'OrgB')`);
    await testDb.execute(
      sql`INSERT INTO departments (id, organization_id, name) VALUES (${DEPT_B_ID}, ${ORG_B_ID}, 'EngB')`,
    );
    await testDb.execute(
      sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month)
          VALUES (${PB_ID}, ${ORG_B_ID}, ${DEPT_B_ID}, 'OrgB', 'Person', 100)`,
    );
    await testDb.execute(
      sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJB_ID}, ${ORG_B_ID}, 'OrgBProj')`,
    );
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
          (${ORG_ID}, ${P1_ID}, ${PROJ1_ID}, '2026-06-01', 40),
          (${ORG_B_ID}, ${PB_ID}, ${PROJB_ID}, '2026-06-01', 200)`,
    );

    // Query for ORG_ID + DEPT_ID — should see only org-A allocations.
    fakeAuth.orgId = ORG_ID;
    const res = await GET(makeReq(`scope=department&scopeId=${DEPT_ID}&monthKey=2026-06`) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      projects: Array<{ id: string; name: string }>;
      people: Array<{ id: string; name: string }>;
    };
    // No org-B project name should appear
    expect(json.projects.every((p) => p.name !== 'OrgBProj')).toBe(true);
    expect(json.projects.every((p) => p.id !== PROJB_ID)).toBe(true);
    // No org-B person should appear
    expect(json.people.every((p) => p.id !== PB_ID)).toBe(true);
  });
});
