// v5.0 — Phase 39 / Plan 39-10: end-to-end proposal lifecycle.
//
// Stitches createProposal / listProposals / approveProposal / rejectProposal /
// resubmitProposal in one PGlite test file. Catches integration regressions
// across plans 39-02..39-08.
//
// Covers:
//   - Test 1: full approve lifecycle (create -> queue -> approve -> alloc + dual change_log)
//   - Test 2: reject + resubmit lifecycle (parent_proposal_id chain)
//   - Test 3: PROP-07 dept-move routing (live people.department_id, not snapshot)
//   - Test 4: concurrent siblings, approve one -> others superseded_by

import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest';
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

const { createProposal, approveProposal, rejectProposal, resubmitProposal, listProposals } =
  await import('../proposal.service');
const { allocationProposals, changeLog, allocations } = schema;

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const DEPT_B = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PERSON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PM_USER = 'clerk_user_pm';
const LM_USER = 'clerk_user_lm';

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
        (${DEPT_A}, ${ORG_ID}, 'Dept A'),
        (${DEPT_B}, ${ORG_ID}, 'Dept B')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name)
        VALUES (${PERSON_ID}, ${ORG_ID}, ${DEPT_A}, 'Anna', 'Tester')`,
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
  await testDb.execute(sql`UPDATE people SET department_id = ${DEPT_A} WHERE id = ${PERSON_ID}`);
});

describe('Phase 39 / Plan 39-10: proposal lifecycle e2e', () => {
  test('full approve lifecycle: create -> queue -> approve -> alloc + dual change_log', async () => {
    // 1. Create wish
    const created = await createProposal({
      orgId: ORG_ID,
      personId: PERSON_ID,
      projectId: PROJECT_ID,
      month: '2026-06',
      proposedHours: 40,
      note: 'Need this for Nordic delivery',
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });
    expect(created.status).toBe('proposed');

    // 2. Appears in line manager queue via dept filter
    const queueBefore = await listProposals({
      orgId: ORG_ID,
      departmentId: DEPT_A,
      status: 'proposed',
    });
    expect(queueBefore.map((p) => p.id)).toContain(created.id);

    // 3. Approve
    const approved = await approveProposal({
      orgId: ORG_ID,
      proposalId: created.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_A,
      actorPersonaId: 'lm-bob',
    });
    expect(approved.status).toBe('approved');

    // 4. Allocation row created with proposed hours
    const allocs = await testDb.select().from(allocations);
    expect(allocs).toHaveLength(1);
    expect(allocs[0].hours).toBe(40);
    expect(allocs[0].personId).toBe(PERSON_ID);

    // 5. Queue no longer shows the row
    const queueAfter = await listProposals({
      orgId: ORG_ID,
      departmentId: DEPT_A,
      status: 'proposed',
    });
    expect(queueAfter.map((p) => p.id)).not.toContain(created.id);

    // 6. Dual change_log: PROPOSAL_SUBMITTED + PROPOSAL_APPROVED + ALLOCATION_EDITED (via: 'proposal')
    const logs = await testDb.select().from(changeLog);
    const actions = logs.map((l) => l.action);
    expect(actions).toContain('PROPOSAL_SUBMITTED');
    expect(actions).toContain('PROPOSAL_APPROVED');
    expect(actions).toContain('ALLOCATION_EDITED');

    const allocEdit = logs.find(
      (l) => l.action === 'ALLOCATION_EDITED' && l.entity === 'allocation',
    );
    expect(allocEdit).toBeDefined();
    const ctx = allocEdit!.context as Record<string, unknown>;
    expect(ctx.via).toBe('proposal');
    expect(ctx.proposalId).toBe(created.id);
  });

  test('reject + resubmit lifecycle: parent_proposal_id chain, approve resubmission', async () => {
    // 1. Create
    const original = await createProposal({
      orgId: ORG_ID,
      personId: PERSON_ID,
      projectId: PROJECT_ID,
      month: '2026-07',
      proposedHours: 80,
      note: 'first try',
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });

    // 2. Reject with reason
    const rejected = await rejectProposal({
      orgId: ORG_ID,
      proposalId: original.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_A,
      reason: 'too many hours',
      actorPersonaId: 'lm-bob',
    });
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('too many hours');

    // 3. Original rejected row exists in proposer's rejected list
    const rejectedList = await listProposals({
      orgId: ORG_ID,
      proposerId: PM_USER,
      status: 'rejected',
    });
    expect(rejectedList.map((p) => p.id)).toContain(original.id);

    // 4. Resubmit with new hours
    const resubmitted = await resubmitProposal({
      orgId: ORG_ID,
      rejectedProposalId: original.id,
      proposedHours: 40,
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });
    expect(resubmitted.status).toBe('proposed');
    expect(resubmitted.parentProposalId).toBe(original.id);
    expect(resubmitted.proposedHours).toBe(40);

    // 5. Original rejected row is unchanged (still rejected)
    const [originalRow] = await testDb
      .select()
      .from(allocationProposals)
      .where(eq(allocationProposals.id, original.id));
    expect(originalRow.status).toBe('rejected');
    expect(Number(originalRow.proposedHours)).toBe(80);

    // 6. New row appears in proposer's proposed list
    const proposedList = await listProposals({
      orgId: ORG_ID,
      proposerId: PM_USER,
      status: 'proposed',
    });
    expect(proposedList.map((p) => p.id)).toContain(resubmitted.id);

    // 7. Approve the resubmission and verify allocations
    await approveProposal({
      orgId: ORG_ID,
      proposalId: resubmitted.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_A,
      actorPersonaId: 'lm-bob',
    });
    const allocs = await testDb.select().from(allocations);
    expect(allocs).toHaveLength(1);
    expect(allocs[0].hours).toBe(40);
  });

  test('PROP-07 routing: dept-move re-routes wish; stale dept claim throws ForbiddenError', async () => {
    // 1. Person in dept A, create wish
    const wish = await createProposal({
      orgId: ORG_ID,
      personId: PERSON_ID,
      projectId: PROJECT_ID,
      month: '2026-08',
      proposedHours: 20,
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });
    expect(wish.targetDepartmentId).toBe(DEPT_A); // snapshot at submit

    // 2. Person moves to dept B (direct UPDATE — no service method until Phase 43)
    await testDb.execute(sql`UPDATE people SET department_id = ${DEPT_B} WHERE id = ${PERSON_ID}`);

    // 3. List by dept B returns the wish (PROP-07: live JOIN, not snapshot)
    const deptBQueue = await listProposals({
      orgId: ORG_ID,
      departmentId: DEPT_B,
      status: 'proposed',
    });
    expect(deptBQueue.map((p) => p.id)).toContain(wish.id);

    // 4. List by dept A no longer returns it
    const deptAQueue = await listProposals({
      orgId: ORG_ID,
      departmentId: DEPT_A,
      status: 'proposed',
    });
    expect(deptAQueue.map((p) => p.id)).not.toContain(wish.id);

    // 5. Approve by dept A user → ForbiddenError
    await expect(
      approveProposal({
        orgId: ORG_ID,
        proposalId: wish.id,
        callerUserId: LM_USER,
        callerClaimedDepartmentId: DEPT_A, // stale
        actorPersonaId: 'lm-a',
      }),
    ).rejects.toMatchObject({ code: 'ERR_FORBIDDEN' });

    // 6. Approve by dept B user → success
    const approved = await approveProposal({
      orgId: ORG_ID,
      proposalId: wish.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_B,
      actorPersonaId: 'lm-b',
    });
    expect(approved.status).toBe('approved');
  });

  test('concurrent sibling create + approve: losers marked superseded with PROPOSAL_WITHDRAWN superseded_by', async () => {
    const month = '2026-09';

    // 1. Two creates for same (person, project, month) with different hours
    const a = await createProposal({
      orgId: ORG_ID,
      personId: PERSON_ID,
      projectId: PROJECT_ID,
      month,
      proposedHours: 10,
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });
    const b = await createProposal({
      orgId: ORG_ID,
      personId: PERSON_ID,
      projectId: PROJECT_ID,
      month,
      proposedHours: 25,
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });

    // 2. Approve the first
    await approveProposal({
      orgId: ORG_ID,
      proposalId: a.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_A,
      actorPersonaId: 'lm-bob',
    });

    // 3. Second row marked 'superseded'
    const [bRow] = await testDb
      .select()
      .from(allocationProposals)
      .where(eq(allocationProposals.id, b.id));
    expect(bRow.status).toBe('superseded');

    // 4. change_log has PROPOSAL_WITHDRAWN with context.reason='superseded_by' and winnerId=a.id
    const logs = await testDb.select().from(changeLog);
    const supLogs = logs.filter(
      (l) =>
        l.action === 'PROPOSAL_WITHDRAWN' &&
        (l.context as Record<string, unknown>)?.reason === 'superseded_by',
    );
    expect(supLogs).toHaveLength(1);
    expect((supLogs[0].context as Record<string, unknown>).winnerId).toBe(a.id);
  });
});
