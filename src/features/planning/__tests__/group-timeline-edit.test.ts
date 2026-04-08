// v5.0 — Phase 41 / Plan 41-03 Task 2: PGlite integration test for the LM
// group timeline edit round-trip (TC-API-040..041 scope=line-manager branch).
//
// Scenario:
//   1. Seed dept A with 1 person (Alice, target 100h/mo), 1 project (Atlas),
//      1 approved allocation 2026-06 = 80h.
//   2. GET /api/v5/planning/allocations?scope=line-manager&departmentId=A
//      → assert persons[0].projects[0].months['2026-06'] === 80
//   3. Call patchAllocation service (equivalent to PATCH /api/v5/planning/
//      allocations/[id]) to bump hours to 90.
//   4. GET /api/v5/capacity → assert utilizationPct reflects 90.
//   5. Assert change_log has a new row with entity='allocation' and
//      action='ALLOCATION_EDITED'.
//
// Harness mirrors pm.e2e.test.ts + capacity.contract.test.ts.

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

// Mock server clock so 2026-06 is non-historic (current === 2026-06).
vi.mock('@/lib/server/get-server-now-month-key', () => ({
  getServerNowMonthKey: vi.fn(async () => '2026-06'),
}));

const fakeAuth = { orgId: '', userId: 'user_lena', role: 'planner' as const };
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => fakeAuth),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

const { GET: GET_ALLOCATIONS } = await import(
  '@/app/api/v5/planning/allocations/route'
);
const { GET: GET_CAPACITY } = await import('@/app/api/v5/capacity/route');
const { patchAllocation } = await import(
  '@/features/allocations/allocation.service'
);

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'd0000000-0000-4000-8000-00000000000a';
const ALICE = 'b1111111-1111-4111-8111-111111111111';
const PROJ = 'c1111111-1111-4111-8111-111111111111';
const ALLOC = '11111111-1111-4111-8111-111111111111';

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
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES (${DEPT_A}, ${ORG_ID}, 'Eng A')`,
  );
  await testDb.execute(sql`
    INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month)
    VALUES (${ALICE}, ${ORG_ID}, ${DEPT_A}, 'Alice', 'A', 100)
  `);
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJ}, ${ORG_ID}, 'Atlas')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log`);
  await testDb.execute(sql`DELETE FROM allocations`);
  await testDb.execute(sql`
    INSERT INTO allocations (id, organization_id, person_id, project_id, month, hours)
    VALUES (${ALLOC}, ${ORG_ID}, ${ALICE}, ${PROJ}, '2026-06-01', 80)
  `);
  fakeAuth.orgId = ORG_ID;
});

function makeReq(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe('TC-API-040: LM group timeline round-trip — GET → edit → capacity', () => {
  it('GET /api/v5/planning/allocations?scope=line-manager returns approved allocations per-person-per-project', async () => {
    const res = await GET_ALLOCATIONS(
      makeReq(
        `/api/v5/planning/allocations?scope=line-manager&departmentId=${DEPT_A}&startMonth=2026-06&endMonth=2026-06`,
      ) as never,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      monthRange: string[];
      persons: Array<{
        personId: string;
        projects: Array<{ projectId: string; months: Record<string, number> }>;
      }>;
    };
    expect(body.monthRange).toEqual(['2026-06']);
    expect(body.persons).toHaveLength(1);
    expect(body.persons[0].personId).toBe(ALICE);
    expect(body.persons[0].projects[0].projectId).toBe(PROJ);
    expect(body.persons[0].projects[0].months['2026-06']).toBe(80);
  });

  it('TC-API-041: patchAllocation (80→90) writes change_log and capacity reflects the new planned hours', async () => {
    // Baseline capacity before edit: 80 / 100 = 80%.
    const beforeRes = await GET_CAPACITY(
      makeReq(
        `/api/v5/capacity?departmentId=${DEPT_A}&startMonth=2026-06&endMonth=2026-06`,
      ) as never,
    );
    expect(beforeRes.status).toBe(200);
    const before = (await beforeRes.json()) as {
      cells: Array<{ personId: string; utilizationPct: number }>;
    };
    expect(before.cells[0].utilizationPct).toBe(80);

    // Direct edit via the service (equivalent to PATCH /api/v5/planning/allocations/[id]).
    const patch = await patchAllocation({
      orgId: ORG_ID,
      actorPersonId: 'user_lena',
      allocationId: ALLOC,
      hours: 90,
      confirmHistoric: false,
    });
    expect(patch.allocation.hours).toBe(90);
    expect(patch.changeLogAction).toBe('ALLOCATION_EDITED');

    // Capacity after edit: 90 / 100 = 90%.
    const afterRes = await GET_CAPACITY(
      makeReq(
        `/api/v5/capacity?departmentId=${DEPT_A}&startMonth=2026-06&endMonth=2026-06`,
      ) as never,
    );
    const after = (await afterRes.json()) as {
      cells: Array<{ personId: string; utilizationPct: number }>;
    };
    expect(after.cells[0].utilizationPct).toBe(90);

    // Group timeline after edit: per-project month reflects 90.
    const allocRes = await GET_ALLOCATIONS(
      makeReq(
        `/api/v5/planning/allocations?scope=line-manager&departmentId=${DEPT_A}&startMonth=2026-06&endMonth=2026-06`,
      ) as never,
    );
    const alloc = (await allocRes.json()) as {
      persons: Array<{ projects: Array<{ months: Record<string, number> }> }>;
    };
    expect(alloc.persons[0].projects[0].months['2026-06']).toBe(90);

    // change_log has the new row.
    const log = await testDb.execute(
      sql`SELECT entity::text AS entity, action::text AS action FROM change_log ORDER BY created_at DESC LIMIT 1`,
    );
    const rows = (log as unknown as { rows: Array<{ entity: string; action: string }> }).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].entity).toBe('allocation');
    expect(rows[0].action).toBe('ALLOCATION_EDITED');
  });
});
