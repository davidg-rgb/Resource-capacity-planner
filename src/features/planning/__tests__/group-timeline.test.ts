// v5.0 — Phase 41 / Plan 41-01: PGlite test for planning.read.getGroupTimeline.

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

const { getGroupTimeline } = await import('../planning.read');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'd0000000-0000-4000-8000-00000000000a';
const DEPT_B = 'd0000000-0000-4000-8000-00000000000b';
const A1 = 'b1111111-1111-4111-8111-11111111111a';
const A2 = 'b1111111-1111-4111-8111-11111111111b';
const B1 = 'b2222222-2222-4222-8222-22222222222a';
const B2 = 'b2222222-2222-4222-8222-22222222222b';
const PROJ1 = 'c1111111-1111-4111-8111-111111111111';
const PROJ2 = 'c2222222-2222-4222-8222-222222222222';
const PROJ3 = 'c3333333-3333-4333-8333-333333333333';

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
      last_name varchar(100) NOT NULL
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
  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_ID}, 'Test')`);
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES
        (${DEPT_A}, ${ORG_ID}, 'Eng A'),
        (${DEPT_B}, ${ORG_ID}, 'Eng B')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name) VALUES
        (${A1}, ${ORG_ID}, ${DEPT_A}, 'Alice', 'A'),
        (${A2}, ${ORG_ID}, ${DEPT_A}, 'Allan', 'A'),
        (${B1}, ${ORG_ID}, ${DEPT_B}, 'Bob',   'B'),
        (${B2}, ${ORG_ID}, ${DEPT_B}, 'Bea',   'B')`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES
        (${PROJ1}, ${ORG_ID}, 'Atlas'),
        (${PROJ2}, ${ORG_ID}, 'Beacon'),
        (${PROJ3}, ${ORG_ID}, 'Comet')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocation_proposals`);
  await testDb.execute(sql`DELETE FROM allocations`);
});

describe('getGroupTimeline — department scope', () => {
  it('returns only persons in the requested department with per-project month totals', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
        (${ORG_ID}, ${A1}, ${PROJ1}, '2026-06-01', 40),
        (${ORG_ID}, ${A1}, ${PROJ1}, '2026-07-01', 60),
        (${ORG_ID}, ${A1}, ${PROJ2}, '2026-06-01', 20),
        (${ORG_ID}, ${A2}, ${PROJ3}, '2026-06-01', 80),
        (${ORG_ID}, ${B1}, ${PROJ1}, '2026-06-01', 999),
        (${ORG_ID}, ${B2}, ${PROJ2}, '2026-07-01', 555)`,
    );

    const view = await getGroupTimeline({
      orgId: ORG_ID,
      departmentId: DEPT_A,
      monthRange: { from: '2026-06', to: '2026-07' },
    });

    expect(view.monthRange).toEqual(['2026-06', '2026-07']);
    expect(view.persons).toHaveLength(2);
    const a1 = view.persons.find((p) => p.personId === A1)!;
    expect(a1.projects).toHaveLength(2);
    const atlas = a1.projects.find((p) => p.projectId === PROJ1)!;
    expect(atlas.months['2026-06']).toBe(40);
    expect(atlas.months['2026-07']).toBe(60);
    const beacon = a1.projects.find((p) => p.projectId === PROJ2)!;
    expect(beacon.months['2026-06']).toBe(20);
    expect(beacon.months['2026-07']).toBe(0);

    // Department B persons must NOT appear.
    expect(view.persons.find((p) => p.personId === B1)).toBeUndefined();
    expect(view.persons.find((p) => p.personId === B2)).toBeUndefined();
  });

  it('approved-only: pending proposals do NOT contribute', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${A1}, ${PROJ1}, '2026-06-01', 40)`,
    );
    await testDb.execute(
      sql`INSERT INTO allocation_proposals
            (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
          VALUES (${ORG_ID}, ${A1}, ${PROJ1}, '2026-06-01', '50', 'proposed', 'pm-x', ${DEPT_A})`,
    );
    const view = await getGroupTimeline({
      orgId: ORG_ID,
      departmentId: DEPT_A,
      monthRange: { from: '2026-06', to: '2026-06' },
    });
    const a1 = view.persons.find((p) => p.personId === A1)!;
    expect(a1.projects[0].months['2026-06']).toBe(40);
  });

  it('returns empty persons when department has no people', async () => {
    const EMPTY_DEPT = 'd0000000-0000-4000-8000-00000000000c';
    await testDb.execute(
      sql`INSERT INTO departments (id, organization_id, name) VALUES (${EMPTY_DEPT}, ${ORG_ID}, 'Empty')
          ON CONFLICT (id) DO NOTHING`,
    );
    const view = await getGroupTimeline({
      orgId: ORG_ID,
      departmentId: EMPTY_DEPT,
      monthRange: { from: '2026-06', to: '2026-06' },
    });
    expect(view.persons).toHaveLength(0);
    expect(view.monthRange).toEqual(['2026-06']);
  });
});
