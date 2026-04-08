// v5.0 — Phase 42 / Plan 42-04 Task 1.
//
// Exercises planning.read.getPortfolioGrid against PGlite. Seeds 2 departments
// × 2 projects × 3 months and asserts both groupBy='project' and
// groupBy='department' aggregations.

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

const { getPortfolioGrid } = await import('@/features/planning/planning.read');

const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'd0000000-0000-4000-8000-00000000000a';
const DEPT_B = 'd0000000-0000-4000-8000-00000000000b';
const PERSON_A1 = 'b0000000-0000-4000-8000-0000000000a1';
const PERSON_A2 = 'b0000000-0000-4000-8000-0000000000a2';
const PERSON_B1 = 'b0000000-0000-4000-8000-0000000000b1';
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

  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG}, 'Org')`);
  await testDb.execute(sql`
    INSERT INTO departments (id, organization_id, name) VALUES
      (${DEPT_A}, ${ORG}, 'Alpha'),
      (${DEPT_B}, ${ORG}, 'Beta')
  `);
  await testDb.execute(sql`
    INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month) VALUES
      (${PERSON_A1}, ${ORG}, ${DEPT_A}, 'Anna', 'A1', 160),
      (${PERSON_A2}, ${ORG}, ${DEPT_A}, 'Anders', 'A2', 160),
      (${PERSON_B1}, ${ORG}, ${DEPT_B}, 'Bea', 'B1', 160)
  `);
  await testDb.execute(sql`
    INSERT INTO projects (id, organization_id, name) VALUES
      (${PROJ_ATLAS}, ${ORG}, 'Atlas'),
      (${PROJ_BOREAS}, ${ORG}, 'Boreas')
  `);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
  await testDb.execute(sql`DELETE FROM allocations;`);
  await testDb.execute(sql`DELETE FROM actual_entries;`);
});

describe('getPortfolioGrid', () => {
  it("groupBy='project' aggregates approved allocations per project per month", async () => {
    // Atlas: A1 60 + A2 40 = 100 (June), A1 50 (July)
    // Boreas: B1 80 (June), A1 20 + B1 40 = 60 (July)
    await testDb.execute(sql`
      INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
        (${ORG}, ${PERSON_A1}, ${PROJ_ATLAS}, '2026-06-01', 60),
        (${ORG}, ${PERSON_A2}, ${PROJ_ATLAS}, '2026-06-01', 40),
        (${ORG}, ${PERSON_A1}, ${PROJ_ATLAS}, '2026-07-01', 50),
        (${ORG}, ${PERSON_B1}, ${PROJ_BOREAS}, '2026-06-01', 80),
        (${ORG}, ${PERSON_A1}, ${PROJ_BOREAS}, '2026-07-01', 20),
        (${ORG}, ${PERSON_B1}, ${PROJ_BOREAS}, '2026-07-01', 40)
    `);

    const result = await getPortfolioGrid({
      orgId: ORG,
      monthRange: { from: '2026-06', to: '2026-08' },
      groupBy: 'project',
    });

    expect(result.groupBy).toBe('project');
    expect(result.monthRange).toEqual(['2026-06', '2026-07', '2026-08']);
    expect(result.rows).toHaveLength(2);

    const atlas = result.rows.find((r) => r.id === PROJ_ATLAS)!;
    expect(atlas.label).toBe('Atlas');
    expect(atlas.meta.kind).toBe('project');
    expect(atlas.months['2026-06']!.plannedHours).toBe(100);
    expect(atlas.months['2026-07']!.plannedHours).toBe(50);
    expect(atlas.months['2026-08']!.plannedHours).toBe(0);

    const boreas = result.rows.find((r) => r.id === PROJ_BOREAS)!;
    expect(boreas.months['2026-06']!.plannedHours).toBe(80);
    expect(boreas.months['2026-07']!.plannedHours).toBe(60);
  });

  it("groupBy='department' aggregates approved allocations per dept per month", async () => {
    // Dept Alpha: A1+A2 on Atlas (60+40)=100, A1 on Boreas July (20)
    // Dept Beta:  B1 on Boreas June (80) + B1 on Boreas July (40)
    await testDb.execute(sql`
      INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
        (${ORG}, ${PERSON_A1}, ${PROJ_ATLAS}, '2026-06-01', 60),
        (${ORG}, ${PERSON_A2}, ${PROJ_ATLAS}, '2026-06-01', 40),
        (${ORG}, ${PERSON_A1}, ${PROJ_BOREAS}, '2026-07-01', 20),
        (${ORG}, ${PERSON_B1}, ${PROJ_BOREAS}, '2026-06-01', 80),
        (${ORG}, ${PERSON_B1}, ${PROJ_BOREAS}, '2026-07-01', 40)
    `);

    const result = await getPortfolioGrid({
      orgId: ORG,
      monthRange: { from: '2026-06', to: '2026-07' },
      groupBy: 'department',
    });

    expect(result.groupBy).toBe('department');
    expect(result.rows).toHaveLength(2);

    const alpha = result.rows.find((r) => r.id === DEPT_A)!;
    expect(alpha.label).toBe('Alpha');
    expect(alpha.meta.kind).toBe('department');
    expect(alpha.months['2026-06']!.plannedHours).toBe(100);
    expect(alpha.months['2026-07']!.plannedHours).toBe(20);

    const beta = result.rows.find((r) => r.id === DEPT_B)!;
    expect(beta.months['2026-06']!.plannedHours).toBe(80);
    expect(beta.months['2026-07']!.plannedHours).toBe(40);
  });

  it('approved-only invariant: pending proposals do NOT inflate planned totals', async () => {
    await testDb.execute(sql`
      INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
        (${ORG}, ${PERSON_A1}, ${PROJ_ATLAS}, '2026-06-01', 60)
    `);
    await testDb.execute(sql`
      INSERT INTO allocation_proposals
        (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
      VALUES
        (${ORG}, ${PERSON_A1}, ${PROJ_ATLAS}, '2026-06-01', 999, 'proposed', 'pm_x', ${DEPT_A})
    `);

    const result = await getPortfolioGrid({
      orgId: ORG,
      monthRange: { from: '2026-06', to: '2026-06' },
      groupBy: 'project',
    });
    const atlas = result.rows.find((r) => r.id === PROJ_ATLAS)!;
    expect(atlas.months['2026-06']!.plannedHours).toBe(60);
  });
});
