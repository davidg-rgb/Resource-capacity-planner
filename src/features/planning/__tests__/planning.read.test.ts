// v5.0 — Phase 40 / Plan 40-02: planning.read PGlite integration test.
//
// Verifies getPmOverview + getPmTimeline data-flow shape per Journey 1A/1B.

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

const { getPmOverview, getPmTimeline } = await import('../planning.read');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ANNA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'; // PM
const SARA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'; // staff
const STRANGER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'; // other PM
const PROJ_ATLAS = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const PROJ_BOREAS = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2';
const PROJ_STRANGER = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3';

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE organizations (
      id uuid PRIMARY KEY,
      name varchar(100) NOT NULL
    );
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
      name varchar(200) NOT NULL,
      lead_pm_person_id uuid REFERENCES people(id)
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
    INSERT INTO people (id, organization_id, department_id, first_name, last_name) VALUES
      (${ANNA_ID}, ${ORG_ID}, ${DEPT_A}, 'Anna', 'PM'),
      (${SARA_ID}, ${ORG_ID}, ${DEPT_A}, 'Sara', 'Staff'),
      (${STRANGER_ID}, ${ORG_ID}, ${DEPT_A}, 'Stranger', 'PM')
  `);
  await testDb.execute(sql`
    INSERT INTO projects (id, organization_id, name, lead_pm_person_id) VALUES
      (${PROJ_ATLAS}, ${ORG_ID}, 'Atlas', ${ANNA_ID}),
      (${PROJ_BOREAS}, ${ORG_ID}, 'Boreas', ${ANNA_ID}),
      (${PROJ_STRANGER}, ${ORG_ID}, 'Stranger Project', ${STRANGER_ID})
  `);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
  await testDb.execute(sql`DELETE FROM allocations;`);
  await testDb.execute(sql`DELETE FROM actual_entries;`);
});

describe('Phase 40 / Plan 40-02: planning.read', () => {
  describe('getPmOverview', () => {
    test('returns both cards for PM with 2 projects (with burn + pendingWishes)', async () => {
      // Seed: 40h planned on Atlas at 2026-06, 30h actual, 1 pending wish.
      await testDb.execute(sql`
        INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
        VALUES (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-06-01', 40)
      `);
      await testDb.execute(sql`
        INSERT INTO actual_entries (organization_id, person_id, project_id, date, hours, source)
        VALUES (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-06-15', 30, 'manual')
      `);
      await testDb.execute(sql`
        INSERT INTO allocation_proposals
          (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
        VALUES
          (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-07-01', 20, 'proposed', 'clerk_anna', ${DEPT_A})
      `);

      const result = await getPmOverview({
        orgId: ORG_ID,
        leadPmPersonId: ANNA_ID,
        monthRange: { from: '2026-05', to: '2027-05' },
      });

      expect(result.projects).toHaveLength(2);
      expect(result.defaultProjectId).toBe(result.projects[0]!.project.id);

      const atlas = result.projects.find((c) => c.project.id === PROJ_ATLAS)!;
      expect(atlas.burn.plannedTotalHours).toBe(40);
      expect(atlas.burn.actualTotalHours).toBe(30);
      expect(atlas.pendingWishes).toBe(1);

      const boreas = result.projects.find((c) => c.project.id === PROJ_BOREAS)!;
      expect(boreas.burn.plannedTotalHours).toBe(0);
      expect(boreas.pendingWishes).toBe(0);
    });

    test('returns empty result for PM with no projects', async () => {
      const result = await getPmOverview({
        orgId: ORG_ID,
        leadPmPersonId: SARA_ID, // Sara owns no projects
        monthRange: { from: '2026-05', to: '2027-05' },
      });
      expect(result.projects).toEqual([]);
      expect(result.defaultProjectId).toBeNull();
    });
  });

  describe('getPmTimeline', () => {
    test('returns 13-month range and merges planned/actual/proposal into cells', async () => {
      await testDb.execute(sql`
        INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
        VALUES (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-06-01', 40)
      `);
      await testDb.execute(sql`
        INSERT INTO actual_entries (organization_id, person_id, project_id, date, hours, source)
        VALUES
          (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-06-10', 20, 'manual'),
          (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-06-20', 10, 'manual')
      `);
      await testDb.execute(sql`
        INSERT INTO allocation_proposals
          (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
        VALUES
          (${ORG_ID}, ${SARA_ID}, ${PROJ_ATLAS}, '2026-07-01', 20, 'proposed', 'clerk_anna', ${DEPT_A})
      `);

      const result = await getPmTimeline({
        orgId: ORG_ID,
        projectId: PROJ_ATLAS,
        monthRange: { from: '2026-05', to: '2027-05' },
      });

      expect(result.monthRange).toHaveLength(13);
      expect(result.monthRange[0]).toBe('2026-05');
      expect(result.monthRange[12]).toBe('2027-05');
      expect(result.project.id).toBe(PROJ_ATLAS);
      expect(result.people.map((p) => p.id)).toContain(SARA_ID);

      const juneCell = result.cells.find(
        (c) => c.personId === SARA_ID && c.monthKey === '2026-06',
      )!;
      expect(juneCell.plannedHours).toBe(40);
      expect(juneCell.actualHours).toBe(30);

      const julyCell = result.cells.find(
        (c) => c.personId === SARA_ID && c.monthKey === '2026-07',
      )!;
      expect(julyCell.pendingProposal?.proposedHours).toBe(20);
      expect(julyCell.pendingProposal?.proposerId).toBe('clerk_anna');
      expect(julyCell.plannedHours).toBe(0);
      expect(julyCell.actualHours).toBeNull();
    });

    test('throws NotFoundError for a project in a different org', async () => {
      await expect(
        getPmTimeline({
          orgId: '11111111-1111-4111-8111-111111111111',
          projectId: PROJ_ATLAS,
          monthRange: { from: '2026-05', to: '2027-05' },
        }),
      ).rejects.toThrow();
    });
  });
});
