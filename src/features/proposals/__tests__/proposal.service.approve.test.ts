// v5.0 — Phase 39 / Plan 39-03: approveProposal + rejectProposal contract tests.
// Covers TC-PR-004..010 and TC-PR-012.

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

const { createProposal, approveProposal, rejectProposal } = await import('../proposal.service');
const { ProposalNotActiveError } = await import('@/lib/errors');
const { allocationProposals, changeLog, allocations } = schema;

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_OLD = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const DEPT_NEW = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
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
});

async function seedProposed(hours = 40, month = '2026-06') {
  return createProposal({
    orgId: ORG_ID,
    personId: PERSON_ID,
    projectId: PROJECT_ID,
    month,
    proposedHours: hours,
    note: 'seed',
    requestedBy: PM_USER,
    actorPersonaId: 'pm-anna',
  });
}

describe('TC-PR-004: approveProposal happy path (write-through + dual change_log)', () => {
  it('flips status to approved and creates allocation row', async () => {
    const proposed = await seedProposed(40);

    const approved = await approveProposal({
      orgId: ORG_ID,
      proposalId: proposed.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_OLD,
      actorPersonaId: 'lm-bob',
    });

    expect(approved.status).toBe('approved');
    expect(approved.decidedBy).toBe(LM_USER);

    const allocs = await testDb.select().from(allocations);
    expect(allocs).toHaveLength(1);
    expect(allocs[0].hours).toBe(40);
  });
});

describe('TC-PR-005: PROPOSAL_APPROVED change_log row', () => {
  it('writes exactly one PROPOSAL_APPROVED entity=proposal row', async () => {
    const proposed = await seedProposed();
    await approveProposal({
      orgId: ORG_ID,
      proposalId: proposed.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_OLD,
      actorPersonaId: 'lm-bob',
    });

    const rows = await testDb.select().from(changeLog);
    const approvedRows = rows.filter(
      (r) => r.action === 'PROPOSAL_APPROVED' && r.entity === 'proposal',
    );
    expect(approvedRows).toHaveLength(1);
    expect(approvedRows[0].entityId).toBe(proposed.id);
  });
});

describe('TC-PR-006: ALLOCATION_EDITED change_log with context.via=proposal', () => {
  it('writes ALLOCATION_EDITED row referencing the winning proposalId', async () => {
    const proposed = await seedProposed();
    await approveProposal({
      orgId: ORG_ID,
      proposalId: proposed.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_OLD,
      actorPersonaId: 'lm-bob',
    });

    const rows = await testDb.select().from(changeLog);
    const allocEdits = rows.filter(
      (r) => r.action === 'ALLOCATION_EDITED' && r.entity === 'allocation',
    );
    expect(allocEdits).toHaveLength(1);
    const ctx = allocEdits[0].context as Record<string, unknown>;
    expect(ctx.via).toBe('proposal');
    expect(ctx.proposalId).toBe(proposed.id);
  });
});

describe('TC-PR-007: approve with stale department claim → ForbiddenError', () => {
  it('rejects when caller claims a dept that no longer matches live person', async () => {
    const proposed = await seedProposed();
    // Person moves to new dept after submission
    await testDb.execute(
      sql`UPDATE people SET department_id = ${DEPT_NEW} WHERE id = ${PERSON_ID}`,
    );

    await expect(
      approveProposal({
        orgId: ORG_ID,
        proposalId: proposed.id,
        callerUserId: LM_USER,
        callerClaimedDepartmentId: DEPT_OLD, // stale
        actorPersonaId: 'lm-bob',
      }),
    ).rejects.toMatchObject({ code: 'ERR_FORBIDDEN' });
  });
});

describe('TC-PR-008: rejectProposal requires non-empty reason', () => {
  it('throws ValidationError REASON_REQUIRED when reason is empty', async () => {
    const proposed = await seedProposed();
    await expect(
      rejectProposal({
        orgId: ORG_ID,
        proposalId: proposed.id,
        callerUserId: LM_USER,
        callerClaimedDepartmentId: DEPT_OLD,
        reason: '   ',
        actorPersonaId: 'lm-bob',
      }),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
  });

  it('happy path: flips status to rejected and writes PROPOSAL_REJECTED log', async () => {
    const proposed = await seedProposed();
    const rejected = await rejectProposal({
      orgId: ORG_ID,
      proposalId: proposed.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_OLD,
      reason: 'Out of budget',
      actorPersonaId: 'lm-bob',
    });
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Out of budget');

    const rows = await testDb.select().from(changeLog);
    const rejects = rows.filter((r) => r.action === 'PROPOSAL_REJECTED');
    expect(rejects).toHaveLength(1);
  });
});

describe('TC-PR-009: rejectProposal reason length guard', () => {
  it('throws REASON_TOO_LONG for > 1000 chars', async () => {
    const proposed = await seedProposed();
    await expect(
      rejectProposal({
        orgId: ORG_ID,
        proposalId: proposed.id,
        callerUserId: LM_USER,
        callerClaimedDepartmentId: DEPT_OLD,
        reason: 'x'.repeat(1001),
        actorPersonaId: 'lm-bob',
      }),
    ).rejects.toMatchObject({ code: 'REASON_TOO_LONG' });
  });
});

describe('TC-PR-010: approving an already-approved row → ProposalNotActiveError', () => {
  it('throws ProposalNotActiveError on double approve', async () => {
    const proposed = await seedProposed();
    await approveProposal({
      orgId: ORG_ID,
      proposalId: proposed.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_OLD,
      actorPersonaId: 'lm-bob',
    });

    await expect(
      approveProposal({
        orgId: ORG_ID,
        proposalId: proposed.id,
        callerUserId: LM_USER,
        callerClaimedDepartmentId: DEPT_OLD,
        actorPersonaId: 'lm-bob',
      }),
    ).rejects.toBeInstanceOf(ProposalNotActiveError);
  });
});

describe('TC-PR-012: sibling supersession on approve', () => {
  it('marks siblings superseded and emits PROPOSAL_WITHDRAWN with superseded_by', async () => {
    const a = await seedProposed(20);
    const b = await seedProposed(30);
    const c = await seedProposed(40);

    await approveProposal({
      orgId: ORG_ID,
      proposalId: b.id,
      callerUserId: LM_USER,
      callerClaimedDepartmentId: DEPT_OLD,
      actorPersonaId: 'lm-bob',
    });

    const rows = await testDb.select().from(allocationProposals);
    const map = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    expect(map[b.id]).toBe('approved');
    expect(map[a.id]).toBe('superseded');
    expect(map[c.id]).toBe('superseded');

    const logs = await testDb.select().from(changeLog);
    const supLogs = logs.filter(
      (l) =>
        l.action === 'PROPOSAL_WITHDRAWN' &&
        (l.context as Record<string, unknown>)?.reason === 'superseded_by',
    );
    expect(supLogs).toHaveLength(2);
    for (const log of supLogs) {
      expect((log.context as Record<string, unknown>).winnerId).toBe(b.id);
    }

    const [alloc] = await testDb
      .select()
      .from(allocations)
      .where(eq(allocations.personId, PERSON_ID));
    expect(alloc.hours).toBe(30);
  });
});
