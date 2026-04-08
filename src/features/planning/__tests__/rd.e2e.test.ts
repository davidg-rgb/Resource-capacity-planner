// TC-E2E-4A — load-bearing gate (D-21)
//
// v5.0 — Phase 42 / Plan 42-04 Task 2.
//
// Journey: "R&D Manager opens /rd portfolio → toggles groupBy → drills into a
// project-month and sees per-person rows."
//
// Endpoints exercised:
//   GET /api/v5/planning/allocations?scope=rd&groupBy=project   → portfolio (project rows)
//   GET /api/v5/planning/allocations?scope=rd&groupBy=department → portfolio (dept rows)
//   getProjectPersonBreakdown server fn                          → per-person drill
//
// Invariants:
//   - Approved-only (D-05): pending proposals MUST NOT inflate planned totals
//   - Both groupBy modes return dense month grids
//   - Per-person drill returns one row per person who has plan or actual on the project-month

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

const fakeAuth = { orgId: '', userId: 'user_rd', role: 'planner' as const };
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => fakeAuth),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

const { GET: GET_ALLOCATIONS } = await import('@/app/api/v5/planning/allocations/route');
const { getProjectPersonBreakdown } = await import('@/features/planning/planning.read');

const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'd0000000-0000-4000-8000-00000000000a';
const DEPT_B = 'd0000000-0000-4000-8000-00000000000b';
const ANNA = 'b0000000-0000-4000-8000-0000000000a1';
const BEA = 'b0000000-0000-4000-8000-0000000000b1';
const PROJ_ATLAS = 'c1111111-1111-4111-8111-111111111111';
const PROJ_BOREAS = 'c2222222-2222-4222-8222-222222222222';
const PROJ_CYGNUS = 'c3333333-3333-4333-8333-333333333333';

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

  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG}, 'Org')`);
  await testDb.execute(sql`
    INSERT INTO departments (id, organization_id, name) VALUES
      (${DEPT_A}, ${ORG}, 'Alpha'),
      (${DEPT_B}, ${ORG}, 'Beta')
  `);
  await testDb.execute(sql`
    INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month) VALUES
      (${ANNA}, ${ORG}, ${DEPT_A}, 'Anna', 'Andersson', 160),
      (${BEA}, ${ORG}, ${DEPT_B}, 'Bea', 'Berg', 160)
  `);
  await testDb.execute(sql`
    INSERT INTO projects (id, organization_id, name) VALUES
      (${PROJ_ATLAS}, ${ORG}, 'Atlas'),
      (${PROJ_BOREAS}, ${ORG}, 'Boreas'),
      (${PROJ_CYGNUS}, ${ORG}, 'Cygnus')
  `);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
  await testDb.execute(sql`DELETE FROM allocations;`);
  await testDb.execute(sql`DELETE FROM actual_entries;`);

  // Anna Atlas June 60, July 80
  // Bea  Boreas June 40, Cygnus July 50
  // pending: Anna Cygnus June 999 (must NOT show)
  await testDb.execute(sql`
    INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
      (${ORG}, ${ANNA}, ${PROJ_ATLAS}, '2026-06-01', 60),
      (${ORG}, ${ANNA}, ${PROJ_ATLAS}, '2026-07-01', 80),
      (${ORG}, ${BEA},  ${PROJ_BOREAS}, '2026-06-01', 40),
      (${ORG}, ${BEA},  ${PROJ_CYGNUS}, '2026-07-01', 50)
  `);
  await testDb.execute(sql`
    INSERT INTO allocation_proposals
      (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
    VALUES
      (${ORG}, ${ANNA}, ${PROJ_CYGNUS}, '2026-06-01', 999, 'proposed', 'pm_x', ${DEPT_A})
  `);

  fakeAuth.orgId = ORG;
});

function req(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe('TC-E2E-4A — R&D portfolio happy path', () => {
  it("groupBy='project' returns 3 project rows over 2 months with correct sums", async () => {
    const res = await GET_ALLOCATIONS(
      req(
        `/api/v5/planning/allocations?scope=rd&groupBy=project&startMonth=2026-06&endMonth=2026-07`,
      ) as never,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      groupBy: 'project' | 'department';
      monthRange: string[];
      rows: Array<{
        id: string;
        label: string;
        months: Record<string, { plannedHours: number; actualHours: number }>;
      }>;
    };
    expect(body.groupBy).toBe('project');
    expect(body.monthRange).toEqual(['2026-06', '2026-07']);
    expect(body.rows).toHaveLength(3);

    const atlas = body.rows.find((r) => r.id === PROJ_ATLAS)!;
    expect(atlas.months['2026-06']!.plannedHours).toBe(60);
    expect(atlas.months['2026-07']!.plannedHours).toBe(80);

    const boreas = body.rows.find((r) => r.id === PROJ_BOREAS)!;
    expect(boreas.months['2026-06']!.plannedHours).toBe(40);

    // Pending proposal must NOT inflate Cygnus totals
    const cygnus = body.rows.find((r) => r.id === PROJ_CYGNUS)!;
    expect(cygnus.months['2026-06']!.plannedHours).toBe(0);
    expect(cygnus.months['2026-07']!.plannedHours).toBe(50);
  });

  it("groupBy='department' returns 2 dept rows aggregating per dept", async () => {
    const res = await GET_ALLOCATIONS(
      req(
        `/api/v5/planning/allocations?scope=rd&groupBy=department&startMonth=2026-06&endMonth=2026-07`,
      ) as never,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      rows: Array<{
        id: string;
        label: string;
        months: Record<string, { plannedHours: number }>;
      }>;
    };
    expect(body.rows).toHaveLength(2);

    const alpha = body.rows.find((r) => r.id === DEPT_A)!;
    expect(alpha.months['2026-06']!.plannedHours).toBe(60); // Anna Atlas
    expect(alpha.months['2026-07']!.plannedHours).toBe(80);

    const beta = body.rows.find((r) => r.id === DEPT_B)!;
    expect(beta.months['2026-06']!.plannedHours).toBe(40); // Bea Boreas
    expect(beta.months['2026-07']!.plannedHours).toBe(50);
  });

  it('drill: getProjectPersonBreakdown returns per-person rows for one project-month', async () => {
    // Add a second person on Atlas June so we get 2 rows
    const ANNA2 = 'b0000000-0000-4000-8000-0000000000a2';
    await testDb.execute(sql`
      INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month)
      VALUES (${ANNA2}, ${ORG}, ${DEPT_A}, 'Anders', 'A2', 160)
      ON CONFLICT (id) DO NOTHING
    `);
    await testDb.execute(sql`
      INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
      VALUES (${ORG}, ${ANNA2}, ${PROJ_ATLAS}, '2026-06-01', 25)
    `);

    const rows = await getProjectPersonBreakdown({
      orgId: ORG,
      projectId: PROJ_ATLAS,
      monthKey: '2026-06',
    });
    expect(rows).toHaveLength(2);
    const anna = rows.find((r) => r.personId === ANNA)!;
    expect(anna.plannedHours).toBe(60);
    expect(anna.actualHours).toBe(0);
    const a2 = rows.find((r) => r.personId === ANNA2)!;
    expect(a2.plannedHours).toBe(25);
  });
});
