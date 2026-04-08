// v5.0 — Phase 42 / Plan 42-02 Task 1: getStaffSchedule PGlite test.
//
// Covers (D-04..D-06):
//  - Happy path: 2 projects, 3 months → dense rows, correct sums
//  - Approved-only invariant: pending proposals do NOT leak into planned
//  - Empty range: zero-filled months, empty projects list
//  - summaryStrip keyed by monthKey, reuses capacity helper (target/util%)

import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest';
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

const { getStaffSchedule } = await import('../planning.read');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SARA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const PROJ_ATLAS = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const PROJ_BOREAS = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2';

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
      note varchar(1000),
      status proposal_status NOT NULL DEFAULT 'proposed',
      rejection_reason varchar(1000),
      requested_by text NOT NULL,
      decided_by text,
      decided_at timestamptz,
      parent_proposal_id uuid REFERENCES allocation_proposals(id),
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
});

describe('Phase 42 / Plan 42-02: getStaffSchedule', () => {
  test('happy path: 2 projects over 3 months with dense zero-fill + summary strip', async () => {
    await testDb.execute(sql`
      INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
        (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-06-01', 40),
        (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-07-01', 50),
        (${ORG_ID}, ${SARA_ID}, ${PROJ_BOREAS}, '2026-06-01', 20)
    `);
    await testDb.execute(sql`
      INSERT INTO actual_entries (organization_id, person_id, project_id, date, hours, source) VALUES
        (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-06-15', 30, 'manual')
    `);

    const result = await getStaffSchedule({
      orgId: ORG_ID,
      personId: SARA_ID,
      monthRange: { from: '2026-06', to: '2026-08' },
    });

    expect(result.person.id).toBe(SARA_ID);
    expect(result.monthRange).toEqual(['2026-06', '2026-07', '2026-08']);
    expect(result.projects).toHaveLength(2);

    const atlas = result.projects.find((p) => p.projectId === PROJ_ATLAS)!;
    expect(atlas.months['2026-06']!.plannedHours).toBe(40);
    expect(atlas.months['2026-06']!.actualHours).toBe(30);
    expect(atlas.months['2026-07']!.plannedHours).toBe(50);
    expect(atlas.months['2026-08']!.plannedHours).toBe(0);
    expect(atlas.months['2026-08']!.actualHours).toBeNull();

    const boreas = result.projects.find((p) => p.projectId === PROJ_BOREAS)!;
    expect(boreas.months['2026-06']!.plannedHours).toBe(20);
    expect(boreas.months['2026-07']!.plannedHours).toBe(0);

    // Summary strip: June planned = 60, actual = 30, util = 60/100 = 60%
    expect(result.summaryStrip['2026-06']).toEqual({
      plannedHours: 60,
      actualHours: 30,
      utilizationPct: 60,
    });
    expect(result.summaryStrip['2026-07']!.plannedHours).toBe(50);
    expect(result.summaryStrip['2026-08']!.plannedHours).toBe(0);
  });

  test('approved-only: pending proposals do NOT affect planned totals', async () => {
    await testDb.execute(sql`
      INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
        (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-06-01', 40)
    `);
    await testDb.execute(sql`
      INSERT INTO allocation_proposals
        (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
      VALUES
        (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-06-01', 30, 'proposed', 'clerk_pm', ${DEPT_A})
    `);

    const result = await getStaffSchedule({
      orgId: ORG_ID,
      personId: SARA_ID,
      monthRange: { from: '2026-06', to: '2026-06' },
    });

    const atlas = result.projects.find((p) => p.projectId === PROJ_ATLAS)!;
    expect(atlas.months['2026-06']!.plannedHours).toBe(40); // 40 not 70
    expect(atlas.months['2026-06']!.pendingProposal).toBeNull();
    expect(result.summaryStrip['2026-06']!.plannedHours).toBe(40);
  });

  test('empty range: no allocations → empty projects + zeroed summary strip', async () => {
    const result = await getStaffSchedule({
      orgId: ORG_ID,
      personId: SARA_ID,
      monthRange: { from: '2026-06', to: '2026-07' },
    });
    expect(result.projects).toEqual([]);
    expect(result.monthRange).toEqual(['2026-06', '2026-07']);
    expect(result.summaryStrip['2026-06']).toEqual({
      plannedHours: 0,
      actualHours: 0,
      utilizationPct: 0,
    });
  });
});
