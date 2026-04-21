// v6.0 — Phase 52 / Plan 52-02 (LM-03): integration tests for
// GET /api/v5/proposals/queue/count.
//
// Covers 6 behaviors (plan <behavior> block):
//   1. 200 happy path — { count, departmentId }
//   2. 400 missing departmentId
//   3. 400 malformed departmentId (not a UUID)
//   4. 401 unauth (Clerk rejection → handleApiError)
//   5. tenant isolation — org A auth, org B's dept → 200 with count=0
//   6. state-filter round trip — 3 proposed + 2 approved + 1 withdrawn → 3

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { AuthError } from '@/lib/errors';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

// Mutable auth stub — individual tests can flip it to simulate
// unauth (throws AuthError) or cross-tenant (different orgId).
type FakeAuth =
  | { kind: 'ok'; orgId: string; userId: string; role: 'planner' }
  | { kind: 'unauth' };
const fakeAuth: { value: FakeAuth } = {
  value: { kind: 'ok', orgId: '', userId: 'user_test', role: 'planner' },
};
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => {
    if (fakeAuth.value.kind === 'unauth') {
      throw new AuthError('Not authenticated');
    }
    return {
      orgId: fakeAuth.value.orgId,
      userId: fakeAuth.value.userId,
      role: fakeAuth.value.role,
    };
  }),
  getTenantId: vi.fn(async () => {
    if (fakeAuth.value.kind === 'unauth') throw new AuthError('Not authenticated');
    return fakeAuth.value.orgId;
  }),
}));

const { GET: countRoute } = await import('../count/route');

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DEPT_A_1 = 'd1111111-1111-4111-8111-111111111111';
const DEPT_B_1 = 'd3333333-3333-4333-8333-333333333333';
const PERSON_A1_X = 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_A1_Y = 'aaaa2222-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_A1_Z = 'aaaa3333-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
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
        (${DEPT_B_1}, ${ORG_B}, 'B-Electronics')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name) VALUES
        (${PERSON_A1_X}, ${ORG_A}, ${DEPT_A_1}, 'A1', 'X'),
        (${PERSON_A1_Y}, ${ORG_A}, ${DEPT_A_1}, 'A1', 'Y'),
        (${PERSON_A1_Z}, ${ORG_A}, ${DEPT_A_1}, 'A1', 'Z'),
        (${PERSON_B1_X}, ${ORG_B}, ${DEPT_B_1}, 'B1', 'X'),
        (${PERSON_B1_Y}, ${ORG_B}, ${DEPT_B_1}, 'B1', 'Y')`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES
        (${PROJECT_A}, ${ORG_A}, 'Atlas-A'),
        (${PROJECT_B}, ${ORG_B}, 'Atlas-B')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
  fakeAuth.value = { kind: 'ok', orgId: ORG_A, userId: 'user_test', role: 'planner' };
});

async function insertProposal(opts: {
  orgId: string;
  personId: string;
  projectId: string;
  departmentId: string;
  status: 'proposed' | 'approved' | 'rejected' | 'withdrawn' | 'superseded';
  month?: string;
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

function getRequest(departmentId?: string): Request {
  const url = departmentId
    ? `http://localhost/api/v5/proposals/queue/count?departmentId=${departmentId}`
    : `http://localhost/api/v5/proposals/queue/count`;
  return new Request(url, { method: 'GET' });
}

describe('GET /api/v5/proposals/queue/count — LM-03 integration', () => {
  it('200 happy — authenticated planner + valid UUID returns { count, departmentId }', async () => {
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

    const res = await countRoute(getRequest(DEPT_A_1) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number; departmentId: string };
    expect(body.count).toBe(2);
    expect(body.departmentId).toBe(DEPT_A_1);
  });

  it('400 missing — request with no departmentId returns zod validation error', async () => {
    const res = await countRoute(getRequest() as never);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('ERR_VALIDATION');
  });

  it('400 malformed — departmentId=not-a-uuid returns zod validation error', async () => {
    const res = await countRoute(getRequest('not-a-uuid') as never);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('ERR_VALIDATION');
  });

  it('401 unauth — no auth (requireRole throws AuthError) returns 401', async () => {
    fakeAuth.value = { kind: 'unauth' };
    const res = await countRoute(getRequest(DEPT_A_1) as never);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('ERR_AUTH');
  });

  it('tenant isolation — auth as org A, request dept of org B returns 200 with count=0', async () => {
    // Seed org B with 2 proposed rows in DEPT_B_1.
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

    // Authenticated as org A; asking for org B's department.
    fakeAuth.value = { kind: 'ok', orgId: ORG_A, userId: 'user_test', role: 'planner' };
    const res = await countRoute(getRequest(DEPT_B_1) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number; departmentId: string };
    expect(body.count).toBe(0);
    expect(body.departmentId).toBe(DEPT_B_1);
  });

  it('state-filter round-trip — 3 proposed + 2 approved + 1 withdrawn returns count=3', async () => {
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
      status: 'withdrawn',
      month: '2026-11-01',
    });

    const res = await countRoute(getRequest(DEPT_A_1) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number; departmentId: string };
    expect(body.count).toBe(3);
    expect(body.departmentId).toBe(DEPT_A_1);
  });
});
