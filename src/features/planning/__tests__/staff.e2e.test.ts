// TC-E2E-3A — load-bearing gate (D-21)
//
// v5.0 — Phase 42 / Plan 42-02 Task 2.
//
// Journey: "Sara switches to staff → /staff happy path — grid renders with
// her projects + summary strip, read-only, approved-only."
//
// Fixtures:
//   - 1 organization, 1 department
//   - 1 person (Sara)
//   - 2 projects (Atlas, Boreas)
//   - Approved allocations across 3 months
//   - 1 pending proposal (must NOT leak into staff schedule — D-05)
//
// Endpoint exercised:
//   GET /api/v5/planning/allocations?scope=staff&personId=...
//     → StaffScheduleResult: person, monthRange, projects, summaryStrip
//
// Invariants:
//   - Approved-only (D-05): pending proposals do NOT inflate planned totals
//   - Dense grid: every monthKey exists for every project row
//   - summaryStrip keyed by monthKey with plan/actual/util

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

const { GET: GET_ALLOCATIONS } = await import('@/app/api/v5/planning/allocations/route');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'd0000000-0000-4000-8000-00000000000a';
const SARA = 'b2222222-2222-4222-8222-222222222222';
const PROJ_ATLAS = 'c1111111-1111-4111-8111-111111111111';
const PROJ_BOREAS = 'c2222222-2222-4222-8222-222222222222';

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
    VALUES (${SARA}, ${ORG_ID}, ${DEPT_A}, 'Sara', 'Staff', 160)
  `);
  await testDb.execute(sql`
    INSERT INTO projects (id, organization_id, name) VALUES
      (${PROJ_ATLAS}, ${ORG_ID}, 'Atlas'),
      (${PROJ_BOREAS}, ${ORG_ID}, 'Boreas')
  `);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
  await testDb.execute(sql`DELETE FROM allocations;`);
  await testDb.execute(sql`DELETE FROM actual_entries;`);

  //   Sara Atlas   2026-06 = 60h, 2026-07 = 80h, 2026-08 = 40h
  //   Sara Boreas  2026-06 = 40h
  // + pending proposal: Sara Boreas 2026-07 +30h (must NOT appear)
  await testDb.execute(sql`
    INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
      (${ORG_ID}, ${SARA}, ${PROJ_ATLAS}, '2026-06-01', 60),
      (${ORG_ID}, ${SARA}, ${PROJ_ATLAS}, '2026-07-01', 80),
      (${ORG_ID}, ${SARA}, ${PROJ_ATLAS}, '2026-08-01', 40),
      (${ORG_ID}, ${SARA}, ${PROJ_BOREAS}, '2026-06-01', 40)
  `);
  await testDb.execute(sql`
    INSERT INTO allocation_proposals
      (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
    VALUES
      (${ORG_ID}, ${SARA}, ${PROJ_BOREAS}, '2026-07-01', 30, 'proposed', 'clerk_pm', ${DEPT_A})
  `);

  fakeAuth.orgId = ORG_ID;
});

function req(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe('TC-E2E-3A — Sara switches to staff, /staff happy path', () => {
  it('GET scope=staff returns 2 projects over 3 months with correct sums + summary', async () => {
    const res = await GET_ALLOCATIONS(
      req(
        `/api/v5/planning/allocations?scope=staff&personId=${SARA}&startMonth=2026-06&endMonth=2026-08`,
      ) as never,
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      person: { id: string; name: string };
      monthRange: string[];
      projects: Array<{
        projectId: string;
        projectName: string;
        months: Record<string, { plannedHours: number; actualHours: number | null }>;
      }>;
      summaryStrip: Record<
        string,
        { plannedHours: number; actualHours: number; utilizationPct: number }
      >;
    };

    expect(body.person.id).toBe(SARA);
    expect(body.monthRange).toEqual(['2026-06', '2026-07', '2026-08']);
    expect(body.projects).toHaveLength(2);

    const atlas = body.projects.find((p) => p.projectId === PROJ_ATLAS)!;
    expect(atlas.projectName).toBe('Atlas');
    expect(atlas.months['2026-06']!.plannedHours).toBe(60);
    expect(atlas.months['2026-07']!.plannedHours).toBe(80);
    expect(atlas.months['2026-08']!.plannedHours).toBe(40);

    const boreas = body.projects.find((p) => p.projectId === PROJ_BOREAS)!;
    expect(boreas.months['2026-06']!.plannedHours).toBe(40);
    // Approved-only: pending +30 proposal on 2026-07 Boreas must NOT appear
    expect(boreas.months['2026-07']!.plannedHours).toBe(0);
    expect(boreas.months['2026-08']!.plannedHours).toBe(0);

    // Summary strip: June = 60+40=100, July = 80+0=80, Aug = 40
    expect(body.summaryStrip['2026-06']!.plannedHours).toBe(100);
    expect(body.summaryStrip['2026-07']!.plannedHours).toBe(80);
    expect(body.summaryStrip['2026-08']!.plannedHours).toBe(40);

    // util = planned/target (160)
    expect(body.summaryStrip['2026-06']!.utilizationPct).toBe(63); // 100/160
    expect(body.summaryStrip['2026-07']!.utilizationPct).toBe(50); // 80/160
    expect(body.summaryStrip['2026-08']!.utilizationPct).toBe(25); // 40/160
  });
});
