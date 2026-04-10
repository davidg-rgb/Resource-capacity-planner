// v5.0 — Phase 39 / Plan 39-05: API integration tests for /api/v5/proposals/*
// Covers TC-API-010..014. PGlite for db, a fake requireRole that returns
// a configurable orgId/userId, route handlers invoked directly (no HTTP).

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

const fakeAuth = { orgId: '', userId: 'user_test', role: 'planner' as const };
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => fakeAuth),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

const { POST: createRoute, GET: listRoute } = await import('../route');
const { POST: approveRoute } = await import('../[id]/approve/route');
const { POST: rejectRoute } = await import('../[id]/reject/route');
const { PATCH: editRoute } = await import('../[id]/route');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_OLD = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const DEPT_NEW = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PERSON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

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
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES
        (${DEPT_OLD}, ${ORG_ID}, 'Old Dept'),
        (${DEPT_NEW}, ${ORG_ID}, 'New Dept')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name)
        VALUES (${PERSON_ID}, ${ORG_ID}, ${DEPT_OLD}, 'Anna', 'Tester')`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name)
        VALUES (${PROJECT_ID}, ${ORG_ID}, 'Atlas')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log;`);
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
  await testDb.execute(sql`DELETE FROM allocations;`);
  await testDb.execute(sql`UPDATE people SET department_id = ${DEPT_OLD} WHERE id = ${PERSON_ID}`);
  fakeAuth.orgId = ORG_ID;
});

function jsonPost(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function seedProposalViaRoute(hours = 40, month = '2026-06'): Promise<string> {
  const res = await createRoute(
    jsonPost('http://localhost/api/v5/proposals', {
      personId: PERSON_ID,
      projectId: PROJECT_ID,
      month,
      proposedHours: hours,
      note: 'seed',
    }) as never,
  );
  expect(res.status).toBe(201);
  const json = (await res.json()) as { id: string };
  return json.id;
}

describe('TC-API-010: POST /api/v5/proposals creates a proposed row', () => {
  it('returns 201 + ProposalDTO', async () => {
    const res = await createRoute(
      jsonPost('http://localhost/api/v5/proposals', {
        personId: PERSON_ID,
        projectId: PROJECT_ID,
        month: '2026-06',
        proposedHours: 50,
        note: 'please',
      }) as never,
    );
    expect(res.status).toBe(201);
    const dto = (await res.json()) as {
      id: string;
      status: string;
      proposedHours: number;
      month: string;
      liveDepartmentId: string;
    };
    expect(dto.status).toBe('proposed');
    expect(dto.proposedHours).toBe(50);
    expect(dto.month).toBe('2026-06');
    expect(dto.liveDepartmentId).toBe(DEPT_OLD);

    // And it shows up in the list route
    const listRes = await listRoute(
      new Request('http://localhost/api/v5/proposals?status=proposed') as never,
    );
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as { proposals: Array<{ id: string }> };
    expect(list.proposals).toHaveLength(1);
    expect(list.proposals[0].id).toBe(dto.id);
  });
});

describe('TC-API-011: POST /api/v5/proposals/[id]/approve with matching departmentId → 200', () => {
  it('returns approved ProposalDTO and writes an allocation row', async () => {
    const id = await seedProposalViaRoute(40);
    const res = await approveRoute(
      jsonPost(`http://localhost/api/v5/proposals/${id}/approve`, {
        departmentId: DEPT_OLD,
      }) as never,
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(200);
    const dto = (await res.json()) as { status: string };
    expect(dto.status).toBe('approved');

    const allocs = await testDb.select().from(schema.allocations);
    expect(allocs).toHaveLength(1);
    expect(allocs[0].hours).toBe(40);
  });
});

describe('TC-API-012: POST approve with mismatched departmentId → 403 ForbiddenError envelope', () => {
  it('returns 403 with ERR_FORBIDDEN code', async () => {
    const id = await seedProposalViaRoute(40);
    // Move person to a new dept so caller's claim is stale
    await testDb.execute(
      sql`UPDATE people SET department_id = ${DEPT_NEW} WHERE id = ${PERSON_ID}`,
    );
    const res = await approveRoute(
      jsonPost(`http://localhost/api/v5/proposals/${id}/approve`, {
        departmentId: DEPT_OLD, // stale
      }) as never,
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(403);
    const err = (await res.json()) as { error: { code: string } };
    expect(err.error.code).toBe('ERR_FORBIDDEN');
  });
});

describe('TC-API-013: POST reject with empty reason → 400 ValidationError envelope', () => {
  it('returns 400 when reason is empty', async () => {
    const id = await seedProposalViaRoute(40);
    const res = await rejectRoute(
      jsonPost(`http://localhost/api/v5/proposals/${id}/reject`, {
        departmentId: DEPT_OLD,
        reason: '',
      }) as never,
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(400);
    const err = (await res.json()) as { error: { code: string } };
    // Zod at the route layer short-circuits before the service's REASON_REQUIRED.
    // handleApiError wraps ZodError as a ValidationError envelope.
    expect(err.error.code).toBe('ERR_VALIDATION');
  });
});

describe('PROP-06: PATCH /api/v5/proposals/[id] edits a proposed row in place (TC-API-013-edit)', () => {
  function jsonPatch(url: string, body: unknown): Request {
    return new Request(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('updates hours+note and returns 200 with the updated DTO', async () => {
    const id = await seedProposalViaRoute(40);
    const res = await editRoute(
      jsonPatch(`http://localhost/api/v5/proposals/${id}`, {
        proposedHours: 28,
        note: 'scaled back',
      }) as never,
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(200);
    const dto = (await res.json()) as {
      id: string;
      proposedHours: number;
      note: string | null;
      status: string;
    };
    expect(dto.id).toBe(id);
    expect(dto.proposedHours).toBe(28);
    expect(dto.note).toBe('scaled back');
    expect(dto.status).toBe('proposed');
  });

  it('returns 400 EMPTY_EDIT when neither field provided', async () => {
    const id = await seedProposalViaRoute(40);
    const res = await editRoute(jsonPatch(`http://localhost/api/v5/proposals/${id}`, {}) as never, {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(400);
    const err = (await res.json()) as { error: { code: string } };
    expect(err.error.code).toBe('EMPTY_EDIT');
  });
});

describe('TC-API-014: POST second approve on same id → 409 PROPOSAL_NOT_ACTIVE', () => {
  it('returns 409 with code=PROPOSAL_NOT_ACTIVE', async () => {
    const id = await seedProposalViaRoute(40);
    const first = await approveRoute(
      jsonPost(`http://localhost/api/v5/proposals/${id}/approve`, {
        departmentId: DEPT_OLD,
      }) as never,
      { params: Promise.resolve({ id }) },
    );
    expect(first.status).toBe(200);

    const second = await approveRoute(
      jsonPost(`http://localhost/api/v5/proposals/${id}/approve`, {
        departmentId: DEPT_OLD,
      }) as never,
      { params: Promise.resolve({ id }) },
    );
    expect(second.status).toBe(409);
    const err = (await second.json()) as { error: { code: string } };
    expect(err.error.code).toBe('PROPOSAL_NOT_ACTIVE');
  });
});
