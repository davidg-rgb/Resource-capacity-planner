// TC-E2E-2A — load-bearing gate (D-21)
//
// v5.0 — Phase 41 / Plan 41-05 Task 3.
//
// Journey: "Per switches to line-manager → /line-manager heatmap renders
// people → /line-manager/approval-queue count matches fixture".
//
// Fixtures:
//   - 1 organization
//   - 2 departments (A — under test, B — out-of-scope control)
//   - 3 people in dept A (Alice/Bob/Carol), 1 person in dept B (Dora)
//   - 5 approved allocations across 2 months (2026-06, 2026-07) for dept A
//   - 2 pending proposals targeting dept A people
//   - 1 approved allocation for Dora (must NOT leak into dept-A queries)
//
// Endpoints exercised (handler imports, mirrors group-timeline-edit.test.ts):
//   1. GET /api/v5/capacity?departmentId=A&startMonth=2026-06&endMonth=2026-07
//      → 3 persons × 2 months = 6 cells, each with a status
//   2. GET /api/v5/planning/allocations?scope=line-manager&departmentId=A
//      → 3 persons returned
//   3. listProposals({ orgId, departmentId: A, status: 'proposed' })
//      → 2 proposals
//
// Invariants:
//   - approved-only (D-07): pending proposals do NOT affect capacity cells.
//     Bob has 80h approved + a 60h pending proposal in 2026-06 (target 100).
//     Approved-only utilization = 80% (status 'ok'). Including the pending
//     would push him to 140% ('over'). The test asserts 'ok'/80%.

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

vi.mock('@/lib/server/get-server-now-month-key', () => ({
  getServerNowMonthKey: vi.fn(async () => '2026-06'),
}));

const fakeAuth = { orgId: '', userId: 'user_lena', role: 'planner' as const };
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => fakeAuth),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

const { GET: GET_CAPACITY } = await import('@/app/api/v5/capacity/route');
const { GET: GET_ALLOCATIONS } = await import('@/app/api/v5/planning/allocations/route');
const { listProposals } = await import('@/features/proposals/proposal.service');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'd0000000-0000-4000-8000-00000000000a';
const DEPT_B = 'd0000000-0000-4000-8000-00000000000b';
const ALICE = 'b1111111-1111-4111-8111-111111111111';
const BOB = 'b2222222-2222-4222-8222-222222222222';
const CAROL = 'b3333333-3333-4333-8333-333333333333';
const DORA = 'b4444444-4444-4444-8444-444444444444';
const PROJ_X = 'c1111111-1111-4111-8111-111111111111';
const PROJ_Y = 'c2222222-2222-4222-8222-222222222222';

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
    CREATE TYPE change_log_entity AS ENUM (
      'allocation','proposal','actual_entry','person','project',
      'department','discipline','import_batch'
    );
    CREATE TYPE change_log_action AS ENUM (
      'ALLOCATION_EDITED','ALLOCATION_HISTORIC_EDITED','ALLOCATION_BULK_COPIED',
      'PROPOSAL_SUBMITTED','PROPOSAL_APPROVED','PROPOSAL_REJECTED',
      'PROPOSAL_WITHDRAWN','PROPOSAL_EDITED',
      'ACTUALS_BATCH_COMMITTED','ACTUALS_BATCH_ROLLED_BACK',
      'REGISTER_ROW_CREATED','REGISTER_ROW_UPDATED','REGISTER_ROW_DELETED',
      'ACTUAL_UPSERTED'
    );
    CREATE TABLE change_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      actor_persona_id text NOT NULL,
      entity change_log_entity NOT NULL,
      entity_id uuid NOT NULL,
      action change_log_action NOT NULL,
      previous_value jsonb,
      new_value jsonb,
      context jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_ID}, 'Test Org')`);
  await testDb.execute(sql`
    INSERT INTO departments (id, organization_id, name) VALUES
      (${DEPT_A}, ${ORG_ID}, 'Dept A'),
      (${DEPT_B}, ${ORG_ID}, 'Dept B')
  `);
  await testDb.execute(sql`
    INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month) VALUES
      (${ALICE}, ${ORG_ID}, ${DEPT_A}, 'Alice', 'A', 100),
      (${BOB},   ${ORG_ID}, ${DEPT_A}, 'Bob',   'B', 100),
      (${CAROL}, ${ORG_ID}, ${DEPT_A}, 'Carol', 'C', 100),
      (${DORA},  ${ORG_ID}, ${DEPT_B}, 'Dora',  'D', 100)
  `);
  await testDb.execute(sql`
    INSERT INTO projects (id, organization_id, name) VALUES
      (${PROJ_X}, ${ORG_ID}, 'Project X'),
      (${PROJ_Y}, ${ORG_ID}, 'Project Y')
  `);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log`);
  await testDb.execute(sql`DELETE FROM allocation_proposals`);
  await testDb.execute(sql`DELETE FROM allocations`);

  // 5 approved allocations for dept A across 2 months:
  //   Alice 2026-06 = 70h (Project X)
  //   Alice 2026-07 = 90h (Project X)
  //   Bob   2026-06 = 80h (Project X)  ← + pending proposal below
  //   Bob   2026-07 = 50h (Project Y)
  //   Carol 2026-06 = 30h (Project X)  ← under-utilized
  // Plus 1 approved allocation for Dora in dept B (must NOT leak):
  //   Dora  2026-06 = 100h (Project X)
  await testDb.execute(sql`
    INSERT INTO allocations (organization_id, person_id, project_id, month, hours) VALUES
      (${ORG_ID}, ${ALICE}, ${PROJ_X}, '2026-06-01', 70),
      (${ORG_ID}, ${ALICE}, ${PROJ_X}, '2026-07-01', 90),
      (${ORG_ID}, ${BOB},   ${PROJ_X}, '2026-06-01', 80),
      (${ORG_ID}, ${BOB},   ${PROJ_Y}, '2026-07-01', 50),
      (${ORG_ID}, ${CAROL}, ${PROJ_X}, '2026-06-01', 30),
      (${ORG_ID}, ${DORA},  ${PROJ_X}, '2026-06-01', 100)
  `);

  // 2 pending proposals targeting dept A people:
  //   Bob 2026-06 +60h (would push him to 140% — must NOT affect capacity)
  //   Carol 2026-07 +50h
  await testDb.execute(sql`
    INSERT INTO allocation_proposals
      (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
    VALUES
      (${ORG_ID}, ${BOB},   ${PROJ_X}, '2026-06-01', 60, 'proposed', 'clerk_pm', ${DEPT_A}),
      (${ORG_ID}, ${CAROL}, ${PROJ_Y}, '2026-07-01', 50, 'proposed', 'clerk_pm', ${DEPT_A})
  `);

  fakeAuth.orgId = ORG_ID;
});

function makeReq(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe('TC-E2E-2A — load-bearing gate (D-21): Per switches to line-manager', () => {
  it('GET /api/v5/capacity returns 3 persons × 2 months = 6 cells (each with status), approved-only', async () => {
    const res = await GET_CAPACITY(
      makeReq(
        `/api/v5/capacity?departmentId=${DEPT_A}&startMonth=2026-06&endMonth=2026-07`,
      ) as never,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      cells: Array<{
        personId: string;
        monthKey: string;
        plannedHours: number;
        utilizationPct: number;
        status: 'under' | 'ok' | 'over' | 'absent';
      }>;
      people: Array<{ id: string }>;
    };

    // 3 persons in dept A, 2 months → 6 cells
    expect(body.cells).toHaveLength(6);
    // Each cell carries a status
    for (const c of body.cells) {
      expect(['under', 'ok', 'over', 'absent']).toContain(c.status);
    }
    // Dora (dept B) must NOT leak into the dept A response
    expect(body.people.map((p) => p.id)).not.toContain(DORA);
    expect(body.people.map((p) => p.id).sort()).toEqual([ALICE, BOB, CAROL].sort());

    // Approved-only invariant (D-07): pending +60h on Bob in 2026-06 must
    // NOT affect his capacity cell. Approved = 80h / 100h target → 80%, 'ok'.
    const bobJune = body.cells.find((c) => c.personId === BOB && c.monthKey === '2026-06');
    expect(bobJune).toBeDefined();
    expect(bobJune!.plannedHours).toBe(80);
    expect(bobJune!.utilizationPct).toBe(80);
    // pending proposal NOT applied — would otherwise read 140% / 'over'.
    expect(bobJune!.status).toBe('ok');

    // Spot-checks on the other cells driving the test
    const aliceJune = body.cells.find((c) => c.personId === ALICE && c.monthKey === '2026-06');
    expect(aliceJune!.plannedHours).toBe(70);
    expect(aliceJune!.status).toBe('ok');

    const carolJune = body.cells.find((c) => c.personId === CAROL && c.monthKey === '2026-06');
    // 30/100 = 30% → 'under'
    expect(carolJune!.plannedHours).toBe(30);
    expect(carolJune!.status).toBe('under');
  });

  it('GET /api/v5/planning/allocations?scope=line-manager returns the 3 dept-A persons', async () => {
    const res = await GET_ALLOCATIONS(
      makeReq(
        `/api/v5/planning/allocations?scope=line-manager&departmentId=${DEPT_A}&startMonth=2026-06&endMonth=2026-07`,
      ) as never,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      persons: Array<{ personId: string }>;
    };
    expect(body.persons.map((p) => p.personId).sort()).toEqual([ALICE, BOB, CAROL].sort());
    expect(body.persons.map((p) => p.personId)).not.toContain(DORA);
  });

  it('approval queue (listProposals scoped by departmentId) returns the 2 pending proposals', async () => {
    const proposals = await listProposals({
      orgId: ORG_ID,
      departmentId: DEPT_A,
      status: 'proposed',
    });
    expect(proposals).toHaveLength(2);
    for (const p of proposals) {
      expect([BOB, CAROL]).toContain(p.personId);
    }
  });
});
