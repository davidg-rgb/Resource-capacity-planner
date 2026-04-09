// v5.0 — Phase 39 / PROP-06: contract tests for editProposal (in-place edit
// of proposed-state proposals). Covers TC-PR-010 and adjacent error paths.

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

const { createProposal, editProposal } = await import('../proposal.service');
const { allocationProposals, changeLog } = schema;

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PERSON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PM_USER = 'clerk_user_pm';
const OTHER_USER = 'clerk_user_other';

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
    sql`INSERT INTO departments (id, organization_id, name) VALUES (${DEPT_ID}, ${ORG_ID}, 'Eng')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name)
        VALUES (${PERSON_ID}, ${ORG_ID}, ${DEPT_ID}, 'Anna', 'Tester')`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name)
        VALUES (${PROJECT_ID}, ${ORG_ID}, 'Atlas')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log;`);
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
});

const baseCreate = () => ({
  orgId: ORG_ID,
  personId: PERSON_ID,
  projectId: PROJECT_ID,
  month: '2026-06',
  proposedHours: 40,
  note: 'original note',
  requestedBy: PM_USER,
  actorPersonaId: 'pm-anna',
});

describe('TC-PR-010: editProposal updates proposed row in place', () => {
  it('updates hours and note on the same row id and emits PROPOSAL_EDITED', async () => {
    const created = await createProposal(baseCreate());
    await testDb.execute(sql`DELETE FROM change_log;`);

    const edited = await editProposal({
      orgId: ORG_ID,
      proposalId: created.id,
      proposedHours: 32,
      note: 'scaled back',
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });

    expect(edited.id).toBe(created.id);
    expect(edited.status).toBe('proposed');
    expect(edited.proposedHours).toBe(32);
    expect(edited.note).toBe('scaled back');

    const all = await testDb.select().from(allocationProposals);
    expect(all).toHaveLength(1); // no clone

    const logs = await testDb.select().from(changeLog);
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('PROPOSAL_EDITED');
    expect(logs[0].entityId).toBe(created.id);
    expect(logs[0].previousValue).toMatchObject({ proposedHours: 40, note: 'original note' });
    expect(logs[0].newValue).toMatchObject({ proposedHours: 32, note: 'scaled back' });
  });

  it('allows note-only edit without changing hours', async () => {
    const created = await createProposal(baseCreate());
    const edited = await editProposal({
      orgId: ORG_ID,
      proposalId: created.id,
      note: 'extra context',
      requestedBy: PM_USER,
      actorPersonaId: 'pm-anna',
    });
    expect(edited.proposedHours).toBe(40);
    expect(edited.note).toBe('extra context');
  });
});

describe('editProposal validation', () => {
  it('throws EMPTY_EDIT when neither field is provided', async () => {
    const created = await createProposal(baseCreate());
    await expect(
      editProposal({
        orgId: ORG_ID,
        proposalId: created.id,
        requestedBy: PM_USER,
        actorPersonaId: 'pm-anna',
      }),
    ).rejects.toMatchObject({ code: 'EMPTY_EDIT' });
  });

  it('throws INVALID_STATE when status is not proposed (rejected → must use resubmit)', async () => {
    const created = await createProposal(baseCreate());
    await testDb
      .update(allocationProposals)
      .set({ status: 'rejected', rejectionReason: 'no capacity' })
      .where(eq(allocationProposals.id, created.id));

    await expect(
      editProposal({
        orgId: ORG_ID,
        proposalId: created.id,
        proposedHours: 24,
        requestedBy: PM_USER,
        actorPersonaId: 'pm-anna',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });

  it('throws ForbiddenError when caller is not the original proposer', async () => {
    const created = await createProposal(baseCreate());
    await expect(
      editProposal({
        orgId: ORG_ID,
        proposalId: created.id,
        proposedHours: 24,
        requestedBy: OTHER_USER,
        actorPersonaId: 'pm-other',
      }),
    ).rejects.toMatchObject({ code: 'ERR_FORBIDDEN' });
  });
});
