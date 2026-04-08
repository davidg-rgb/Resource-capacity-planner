// v5.0 — Phase 39 / Plan 39-02: contract tests for proposal.service.
// Covers TC-PR-001..003 plus withdraw happy/error paths using PGlite.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql, eq } from 'drizzle-orm';
import * as schema from '@/db/schema';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const { createProposal, listProposals, withdrawProposal } = await import('../proposal.service');
const { allocationProposals, changeLog } = schema;

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_OLD = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const DEPT_NEW = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PERSON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PM_USER = 'clerk_user_pm';
const OTHER_USER = 'clerk_user_other';

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
  // reset person to DEPT_OLD for each test
  await testDb.execute(sql`UPDATE people SET department_id = ${DEPT_OLD} WHERE id = ${PERSON_ID}`);
});

const baseCreate = () => ({
  orgId: ORG_ID,
  personId: PERSON_ID,
  projectId: PROJECT_ID,
  month: '2026-06',
  proposedHours: 40,
  note: 'test note',
  requestedBy: PM_USER,
  actorPersonaId: 'pm-anna',
});

describe('TC-PR-001: createProposal inserts proposed row + change_log in same tx', () => {
  it('writes proposed row with snapshotted target_department_id and PROPOSAL_SUBMITTED log', async () => {
    const dto = await createProposal(baseCreate());

    expect(dto.status).toBe('proposed');
    expect(dto.targetDepartmentId).toBe(DEPT_OLD);
    expect(dto.liveDepartmentId).toBe(DEPT_OLD);
    expect(dto.proposedHours).toBe(40);

    const rows = await testDb.select().from(allocationProposals);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('proposed');
    expect(rows[0].targetDepartmentId).toBe(DEPT_OLD);

    const logs = await testDb.select().from(changeLog);
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('PROPOSAL_SUBMITTED');
    expect(logs[0].entity).toBe('proposal');
    expect(logs[0].entityId).toBe(rows[0].id);
  });
});

describe('TC-PR-002: createProposal returns DTO with month normalized to YYYY-MM', () => {
  it('stores 2026-06-01 in DB but returns 2026-06 in DTO', async () => {
    const dto = await createProposal(baseCreate());
    expect(dto.month).toBe('2026-06');

    const [row] = await testDb.select().from(allocationProposals);
    expect(row.month).toBe('2026-06-01');
  });
});

describe('TC-PR-003: listProposals filters on LIVE people.department_id (PROP-07)', () => {
  it("returns pending proposal under person's NEW department after dept change", async () => {
    const dto = await createProposal(baseCreate());
    expect(dto.targetDepartmentId).toBe(DEPT_OLD);

    // Person moves to new department after the proposal was submitted.
    await testDb.execute(
      sql`UPDATE people SET department_id = ${DEPT_NEW} WHERE id = ${PERSON_ID}`,
    );

    // Filtering by the OLD (snapshot) department must return NOTHING —
    // routing uses live department.
    const oldRouted = await listProposals({
      orgId: ORG_ID,
      status: 'proposed',
      departmentId: DEPT_OLD,
    });
    expect(oldRouted).toHaveLength(0);

    // Filtering by the NEW (live) department must return the row.
    const newRouted = await listProposals({
      orgId: ORG_ID,
      status: 'proposed',
      departmentId: DEPT_NEW,
    });
    expect(newRouted).toHaveLength(1);
    expect(newRouted[0].id).toBe(dto.id);
    expect(newRouted[0].targetDepartmentId).toBe(DEPT_OLD); // snapshot preserved
    expect(newRouted[0].liveDepartmentId).toBe(DEPT_NEW); // live dept in DTO
  });
});

describe('listProposals misc filters', () => {
  it('filters by proposerId, personId, projectId, and status array', async () => {
    const a = await createProposal(baseCreate());
    const b = await createProposal({
      ...baseCreate(),
      month: '2026-07',
      requestedBy: OTHER_USER,
    });

    const pmOnly = await listProposals({ orgId: ORG_ID, proposerId: PM_USER });
    expect(pmOnly.map((r) => r.id)).toEqual([a.id]);

    const both = await listProposals({
      orgId: ORG_ID,
      status: ['proposed', 'approved'],
    });
    expect(both).toHaveLength(2);
    expect(both.map((r) => r.id).sort()).toEqual([a.id, b.id].sort());
  });
});

describe('withdrawProposal', () => {
  it('happy path flips proposed → withdrawn and writes PROPOSAL_WITHDRAWN log', async () => {
    const created = await createProposal(baseCreate());
    const withdrawn = await withdrawProposal({
      orgId: ORG_ID,
      proposalId: created.id,
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });
    expect(withdrawn.status).toBe('withdrawn');

    const [row] = await testDb
      .select()
      .from(allocationProposals)
      .where(eq(allocationProposals.id, created.id));
    expect(row.status).toBe('withdrawn');

    const logs = await testDb.select().from(changeLog);
    const actions = logs.map((l) => l.action);
    expect(actions).toContain('PROPOSAL_SUBMITTED');
    expect(actions).toContain('PROPOSAL_WITHDRAWN');
  });

  it('throws ForbiddenError when caller is not the requester', async () => {
    const created = await createProposal(baseCreate());
    await expect(
      withdrawProposal({
        orgId: ORG_ID,
        proposalId: created.id,
        requestedBy: OTHER_USER,
        actorPersonaId: 'lm-bob',
      }),
    ).rejects.toMatchObject({ code: 'ERR_FORBIDDEN' });
  });

  it('throws ValidationError when proposal is not in proposed state', async () => {
    const created = await createProposal(baseCreate());
    await testDb
      .update(allocationProposals)
      .set({ status: 'approved' })
      .where(eq(allocationProposals.id, created.id));

    await expect(
      withdrawProposal({
        orgId: ORG_ID,
        proposalId: created.id,
        requestedBy: PM_USER,
        actorPersonaId: 'pm-anna',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });
});
