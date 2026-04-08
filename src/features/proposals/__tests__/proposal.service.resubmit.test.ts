// v5.0 — Phase 39 / Plan 39-04: contract tests for resubmitProposal.
// TC-PR-011a..e covering happy path, edits, invalid state, forbidden,
// and change_log context.resubmittedFrom linkage.

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

const { createProposal, resubmitProposal } = await import('../proposal.service');
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

async function createThenReject() {
  const created = await createProposal(baseCreate());
  await testDb
    .update(allocationProposals)
    .set({ status: 'rejected', rejectionReason: 'no capacity' })
    .where(eq(allocationProposals.id, created.id));
  return created;
}

describe('TC-PR-011a: resubmit clones rejected row with parent_proposal_id', () => {
  it('creates a new proposed row and leaves the original rejected row untouched', async () => {
    const parent = await createThenReject();

    const resubmitted = await resubmitProposal({
      orgId: ORG_ID,
      rejectedProposalId: parent.id,
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });

    expect(resubmitted.id).not.toBe(parent.id);
    expect(resubmitted.status).toBe('proposed');
    expect(resubmitted.parentProposalId).toBe(parent.id);
    expect(resubmitted.personId).toBe(parent.personId);
    expect(resubmitted.projectId).toBe(parent.projectId);
    expect(resubmitted.month).toBe('2026-06');
    expect(resubmitted.proposedHours).toBe(40);
    expect(resubmitted.note).toBe('test note');

    // Original rejected row is immutable.
    const [orig] = await testDb
      .select()
      .from(allocationProposals)
      .where(eq(allocationProposals.id, parent.id));
    expect(orig.status).toBe('rejected');
    expect(orig.parentProposalId).toBeNull();

    const all = await testDb.select().from(allocationProposals);
    expect(all).toHaveLength(2);
  });
});

describe('TC-PR-011b: resubmit with edits carries overrides', () => {
  it('applies proposedHours and note edits on the new row', async () => {
    const parent = await createThenReject();

    const resubmitted = await resubmitProposal({
      orgId: ORG_ID,
      rejectedProposalId: parent.id,
      proposedHours: 24,
      note: 'scaled back',
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });

    expect(resubmitted.proposedHours).toBe(24);
    expect(resubmitted.note).toBe('scaled back');
    expect(resubmitted.status).toBe('proposed');
    expect(resubmitted.parentProposalId).toBe(parent.id);
  });
});

describe('TC-PR-011c: resubmit on non-rejected row → INVALID_STATE', () => {
  it('throws ValidationError when parent is still proposed', async () => {
    const created = await createProposal(baseCreate());
    await expect(
      resubmitProposal({
        orgId: ORG_ID,
        rejectedProposalId: created.id,
        requestedBy: PM_USER,
        actorPersonaId: 'pm-anna',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });
});

describe('TC-PR-011d: resubmit as a different user → Forbidden', () => {
  it('throws ForbiddenError when caller is not the original proposer', async () => {
    const parent = await createThenReject();
    await expect(
      resubmitProposal({
        orgId: ORG_ID,
        rejectedProposalId: parent.id,
        requestedBy: OTHER_USER,
        actorPersonaId: 'pm-other',
      }),
    ).rejects.toMatchObject({ code: 'ERR_FORBIDDEN' });
  });
});

describe('TC-PR-011e: change_log PROPOSAL_SUBMITTED carries resubmittedFrom', () => {
  it('emits a PROPOSAL_SUBMITTED row with context.resubmittedFrom === parent.id', async () => {
    const parent = await createThenReject();
    // clear the original submit log to isolate the resubmit log
    await testDb.execute(sql`DELETE FROM change_log;`);

    const resubmitted = await resubmitProposal({
      orgId: ORG_ID,
      rejectedProposalId: parent.id,
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });

    const logs = await testDb.select().from(changeLog);
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('PROPOSAL_SUBMITTED');
    expect(logs[0].entity).toBe('proposal');
    expect(logs[0].entityId).toBe(resubmitted.id);
    expect((logs[0].context as Record<string, unknown>).resubmittedFrom).toBe(parent.id);
  });

  it('re-snapshots target_department_id from live people.department_id (PROP-07)', async () => {
    const parent = await createThenReject();

    // Person moves to new department between rejection and resubmit.
    await testDb.execute(
      sql`UPDATE people SET department_id = ${DEPT_NEW} WHERE id = ${PERSON_ID}`,
    );

    const resubmitted = await resubmitProposal({
      orgId: ORG_ID,
      rejectedProposalId: parent.id,
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });

    expect(resubmitted.targetDepartmentId).toBe(DEPT_NEW);
    expect(resubmitted.liveDepartmentId).toBe(DEPT_NEW);
  });
});
