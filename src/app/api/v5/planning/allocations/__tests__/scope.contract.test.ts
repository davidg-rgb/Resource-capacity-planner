// v5.0 — Phase 42 / Plan 42-02 Task 1 — TC-API-001 allocations route contract.
//
// Exercises GET /api/v5/planning/allocations?scope=staff → getStaffSchedule
// shape. Mirrors the PGlite + handler-import pattern from
// `features/planning/__tests__/line-manager.e2e.test.ts`.

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

const fakeAuth = { orgId: '', userId: 'user_sara', role: 'planner' as const };
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => fakeAuth),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

const { GET } = await import('@/app/api/v5/planning/allocations/route');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'd0000000-0000-4000-8000-00000000000a';
const SARA_ID = 'b2222222-2222-4222-8222-222222222222';
const PROJ_X = 'c1111111-1111-4111-8111-111111111111';

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
    CREATE TABLE actual_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      date date NOT NULL,
      hours numeric(5,2) NOT NULL,
      source varchar(20) NOT NULL DEFAULT 'manual',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TYPE proposal_status AS ENUM (
      'proposed','approved','rejected','withdrawn','superseded'
    );
    CREATE TABLE allocation_proposals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      month date NOT NULL,
      proposed_hours numeric(5,2) NOT NULL,
      status proposal_status NOT NULL DEFAULT 'proposed',
      requested_by text NOT NULL,
      target_department_id uuid NOT NULL REFERENCES departments(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_ID}, 'Test Org')`);
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES (${DEPT_A}, ${ORG_ID}, 'Dept A')`,
  );
  await testDb.execute(sql`
    INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month)
    VALUES (${SARA_ID}, ${ORG_ID}, ${DEPT_A}, 'Sara', 'Staff', 100)
  `);
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJ_X}, ${ORG_ID}, 'Project X')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocations;`);
  fakeAuth.orgId = ORG_ID;
});

function req(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe('TC-API-001: GET /api/v5/planning/allocations?scope=staff', () => {
  it('returns getStaffSchedule shape: { person, monthRange, projects, summaryStrip }', async () => {
    await testDb.execute(sql`
      INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
      VALUES (${ORG_ID}, ${SARA_ID}, ${PROJ_X}, '2026-06-01', 40)
    `);

    const res = await GET(
      req(
        `/api/v5/planning/allocations?scope=staff&personId=${SARA_ID}&startMonth=2026-06&endMonth=2026-07`,
      ) as never,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      person: { id: string; name: string };
      monthRange: string[];
      projects: Array<{ projectId: string; months: Record<string, { plannedHours: number }> }>;
      summaryStrip: Record<
        string,
        { plannedHours: number; actualHours: number; utilizationPct: number }
      >;
    };

    expect(body.person.id).toBe(SARA_ID);
    expect(body.monthRange).toEqual(['2026-06', '2026-07']);
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0]!.months['2026-06']!.plannedHours).toBe(40);
    expect(body.summaryStrip['2026-06']!.plannedHours).toBe(40);
    expect(body.summaryStrip['2026-06']!.utilizationPct).toBe(40);
  });

  it('TC-API-002: 400 when personId (scope id) is missing for scope=staff', async () => {
    const res = await GET(
      req(`/api/v5/planning/allocations?scope=staff&startMonth=2026-06&endMonth=2026-07`) as never,
    );
    expect(res.status).toBe(400);
  });
});

describe('TC-API-001: GET /api/v5/planning/allocations?scope=rd', () => {
  it("returns getPortfolioGrid shape with default groupBy='project'", async () => {
    await testDb.execute(sql`
      INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
      VALUES (${ORG_ID}, ${SARA_ID}, ${PROJ_X}, '2026-06-01', 40)
    `);

    const res = await GET(
      req(`/api/v5/planning/allocations?scope=rd&startMonth=2026-06&endMonth=2026-07`) as never,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      groupBy: 'project' | 'department';
      monthRange: string[];
      rows: Array<{
        id: string;
        label: string;
        meta: { kind: 'project' | 'department' };
        months: Record<string, { plannedHours: number; actualHours: number }>;
      }>;
    };
    expect(body.groupBy).toBe('project');
    expect(body.monthRange).toEqual(['2026-06', '2026-07']);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]!.id).toBe(PROJ_X);
    expect(body.rows[0]!.meta.kind).toBe('project');
    expect(body.rows[0]!.months['2026-06']!.plannedHours).toBe(40);
  });

  it("returns getPortfolioGrid with groupBy='department'", async () => {
    await testDb.execute(sql`
      INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
      VALUES (${ORG_ID}, ${SARA_ID}, ${PROJ_X}, '2026-06-01', 40)
    `);

    const res = await GET(
      req(
        `/api/v5/planning/allocations?scope=rd&groupBy=department&startMonth=2026-06&endMonth=2026-06`,
      ) as never,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      groupBy: 'project' | 'department';
      rows: Array<{ id: string; meta: { kind: 'department' } }>;
    };
    expect(body.groupBy).toBe('department');
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]!.id).toBe(DEPT_A);
    expect(body.rows[0]!.meta.kind).toBe('department');
  });

  it('400 when groupBy is invalid', async () => {
    const res = await GET(
      req(
        `/api/v5/planning/allocations?scope=rd&groupBy=invalid&startMonth=2026-06&endMonth=2026-07`,
      ) as never,
    );
    expect(res.status).toBe(400);
  });
});
