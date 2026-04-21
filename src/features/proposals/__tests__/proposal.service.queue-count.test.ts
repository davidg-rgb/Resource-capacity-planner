// v6.0 — Phase 52 / Plan 52-02 (LM-03): contract tests for
// proposal.service#getQueueCount. Covers the 5 behaviors from the plan:
//   1. happy path (3 proposed in D1/A → 3)
//   2. status filter exactness (only 'proposed' counts; approved/rejected/
//      withdrawn/superseded excluded)
//   3. department scope (D1 vs D2 in the same org)
//   4. tenant isolation (cross-org departmentId returns 0)
//   5. empty (no rows → 0)
//
// PGlite fixture pattern mirrors proposal.service.create.test.ts.

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

const { getQueueCount } = await import('../proposal.service');

// Two orgs × two departments × multiple people for realistic coverage.
const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DEPT_A_1 = 'd1111111-1111-4111-8111-111111111111';
const DEPT_A_2 = 'd2222222-2222-4222-8222-222222222222';
const DEPT_B_1 = 'd3333333-3333-4333-8333-333333333333';
const PERSON_A1_X = 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_A1_Y = 'aaaa2222-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_A1_Z = 'aaaa3333-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_A2_X = 'aaaa4444-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_A2_Y = 'aaaa5555-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_B1_X = 'bbbb1111-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PERSON_B1_Y = 'bbbb2222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_A = 'cccc1111-cccc-4ccc-8ccc-cccccccccccc';
const PROJECT_B = 'cccc2222-cccc-4ccc-8ccc-cccccccccccc';

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
      name varchar(200) NOT NULL
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

  await testDb.execute(
    sql`INSERT INTO organizations (id, name) VALUES
        (${ORG_A}, 'Org A'),
        (${ORG_B}, 'Org B')`,
  );
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES
        (${DEPT_A_1}, ${ORG_A}, 'A-Electronics'),
        (${DEPT_A_2}, ${ORG_A}, 'A-Mechanical'),
        (${DEPT_B_1}, ${ORG_B}, 'B-Electronics')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name) VALUES
        (${PERSON_A1_X}, ${ORG_A}, ${DEPT_A_1}, 'A1', 'X'),
        (${PERSON_A1_Y}, ${ORG_A}, ${DEPT_A_1}, 'A1', 'Y'),
        (${PERSON_A1_Z}, ${ORG_A}, ${DEPT_A_1}, 'A1', 'Z'),
        (${PERSON_A2_X}, ${ORG_A}, ${DEPT_A_2}, 'A2', 'X'),
        (${PERSON_A2_Y}, ${ORG_A}, ${DEPT_A_2}, 'A2', 'Y'),
        (${PERSON_B1_X}, ${ORG_B}, ${DEPT_B_1}, 'B1', 'X'),
        (${PERSON_B1_Y}, ${ORG_B}, ${DEPT_B_1}, 'B1', 'Y')`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES
        (${PROJECT_A}, ${ORG_A}, 'Atlas-A'),
        (${PROJECT_B}, ${ORG_B}, 'Atlas-B')`,
  );
});

// Clean proposals between tests; orgs/depts/people/projects persist.
beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
});

// Helper to insert a proposal row with explicit status.
async function insertProposal(opts: {
  orgId: string;
  personId: string;
  projectId: string;
  departmentId: string; // for target_department_id snapshot
  status: 'proposed' | 'approved' | 'rejected' | 'withdrawn' | 'superseded';
  month?: string; // 'YYYY-MM-DD'
}) {
  const month = opts.month ?? '2026-06-01';
  await testDb.execute(sql`
    INSERT INTO allocation_proposals
      (organization_id, person_id, project_id, month, proposed_hours,
       status, requested_by, target_department_id)
    VALUES
      (${opts.orgId}, ${opts.personId}, ${opts.projectId}, ${month}, 40.00,
       ${opts.status}, 'clerk_user_test', ${opts.departmentId})
  `);
}

describe('LM-03 / D-05: getQueueCount', () => {
  it('happy path — 3 proposed rows in D1 of org A returns 3', async () => {
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_X,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Y,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Z,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
    });

    const count = await getQueueCount(ORG_A, DEPT_A_1);
    expect(count).toBe(3);
  });

  it('status filter exactness — only proposed counts; approved/rejected/withdrawn/superseded excluded', async () => {
    // 3 proposed + 2 approved + 1 rejected + 1 withdrawn + 1 superseded, all D1/A.
    // Expect: 3 (only 'proposed').
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_X,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Y,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
      month: '2026-07-01',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Z,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
      month: '2026-08-01',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_X,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'approved',
      month: '2026-09-01',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Y,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'approved',
      month: '2026-10-01',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Z,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'rejected',
      month: '2026-11-01',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_X,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'withdrawn',
      month: '2026-12-01',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Y,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'superseded',
      month: '2027-01-01',
    });

    const count = await getQueueCount(ORG_A, DEPT_A_1);
    expect(count).toBe(3);
  });

  it('department scope — 3 proposed in D1, 2 proposed in D2; call with D1 returns 3', async () => {
    // D1: 3 proposed
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_X,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Y,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
      month: '2026-07-01',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Z,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
      month: '2026-08-01',
    });
    // D2: 2 proposed
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A2_X,
      projectId: PROJECT_A,
      departmentId: DEPT_A_2,
      status: 'proposed',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A2_Y,
      projectId: PROJECT_A,
      departmentId: DEPT_A_2,
      status: 'proposed',
      month: '2026-07-01',
    });

    const countD1 = await getQueueCount(ORG_A, DEPT_A_1);
    const countD2 = await getQueueCount(ORG_A, DEPT_A_2);
    expect(countD1).toBe(3);
    expect(countD2).toBe(2);
  });

  it('tenant isolation — 3 proposed in D1/A + 2 proposed in D1/B; call (A, D1_B) returns 0', async () => {
    // Org A / D1
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_X,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Y,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
      month: '2026-07-01',
    });
    await insertProposal({
      orgId: ORG_A,
      personId: PERSON_A1_Z,
      projectId: PROJECT_A,
      departmentId: DEPT_A_1,
      status: 'proposed',
      month: '2026-08-01',
    });
    // Org B / D1
    await insertProposal({
      orgId: ORG_B,
      personId: PERSON_B1_X,
      projectId: PROJECT_B,
      departmentId: DEPT_B_1,
      status: 'proposed',
    });
    await insertProposal({
      orgId: ORG_B,
      personId: PERSON_B1_Y,
      projectId: PROJECT_B,
      departmentId: DEPT_B_1,
      status: 'proposed',
      month: '2026-07-01',
    });

    // Cross-tenant: auth'd as org A, asking for org B's department → 0 rows.
    // The people in DEPT_B_1 are scoped to ORG_B, so the tenant WHERE clause
    // eliminates them.
    const crossTenant = await getQueueCount(ORG_A, DEPT_B_1);
    expect(crossTenant).toBe(0);

    // Sanity: org B can still see its own 2.
    const ownTenant = await getQueueCount(ORG_B, DEPT_B_1);
    expect(ownTenant).toBe(2);
  });

  it('empty — no rows returns 0', async () => {
    const count = await getQueueCount(ORG_A, DEPT_A_1);
    expect(count).toBe(0);
  });
});
