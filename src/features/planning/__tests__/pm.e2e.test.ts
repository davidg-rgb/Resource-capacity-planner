// v5.0 — Phase 40 / Plan 40-05 Wave 4 (D-22): PM happy-path PGlite e2e.
//
// Stitches planning.read (getPmOverview + getPmTimeline) + resolveEditGate +
// proposal.service (createProposal + listProposals) in a single PGlite test
// file. Mirrors the harness pattern from
//   src/features/proposals/__tests__/proposal.service.e2e.test.ts
// and the schema bootstrap from
//   src/features/planning/__tests__/planning.read.test.ts
// (plan-check W1: "shared PGlite harness pattern").
//
// Scenario (D-22 — "Anna submits a wish happy path"):
//   1. Seed org + departments + Anna (PM, dept-A) + Sara (staff, dept-B)
//      + project Alpha owned by Anna + allocation Sara/Alpha/2026-06 = 40h
//   2. getPmOverview({ leadPmPersonId: anna }) returns Alpha
//   3. getPmTimeline({ projectId }) returns Sara row + 2026-06 cell
//   4. resolveEditGate({ anna, targetPerson: sara, month: '2026-06' }) → 'proposal'
//      (out-of-dept, non-historic)
//   5. createProposal({ proposedHours: 60, proposerId: clerk_anna }) succeeds
//   6. listProposals({ proposerId: clerk_anna, status: 'proposed' }) returns the wish
//   7. getPmTimeline re-query: (Sara, 2026-06) cell has pendingProposal.proposedHours === 60

import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest';
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

// Mock server clock so 2026-06 is the "current" month → '2026-06' is NOT
// historic (strict '<'), and resolveEditGate is called with currentMonth=
// '2026-05' below to unambiguously place 2026-06 in the future.
vi.mock('@/lib/server/get-server-now-month-key', () => ({
  getServerNowMonthKey: vi.fn(async () => '2026-05'),
}));

const { getPmOverview, getPmTimeline } = await import('../planning.read');
const { createProposal, listProposals } = await import('@/features/proposals/proposal.service');
const { resolveEditGate } = await import('@/features/proposals/edit-gate');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'; // Anna's dept
const DEPT_B = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'; // Sara's dept (out-of-dept for Anna)
const ANNA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const SARA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const PROJECT_ID = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const ALLOC_ID = '11111111-1111-4111-8111-111111111111';
const CLERK_ANNA = 'clerk_anna';

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
      name varchar(200) NOT NULL,
      lead_pm_person_id uuid REFERENCES people(id)
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
    CREATE TABLE actual_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      date date NOT NULL,
      hours numeric(5,2) NOT NULL,
      source varchar(20) NOT NULL DEFAULT 'manual',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
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
    INSERT INTO people (id, organization_id, department_id, first_name, last_name) VALUES
      (${ANNA_ID}, ${ORG_ID}, ${DEPT_A}, 'Anna', 'PM'),
      (${SARA_ID}, ${ORG_ID}, ${DEPT_B}, 'Sara', 'Staff')
  `);
  await testDb.execute(sql`
    INSERT INTO projects (id, organization_id, name, lead_pm_person_id)
      VALUES (${PROJECT_ID}, ${ORG_ID}, 'Alpha', ${ANNA_ID})
  `);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log;`);
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
  await testDb.execute(sql`DELETE FROM allocations;`);
  await testDb.execute(sql`
    INSERT INTO allocations (id, organization_id, person_id, project_id, month, hours)
    VALUES (${ALLOC_ID}, ${ORG_ID}, ${SARA_ID}, ${PROJECT_ID}, '2026-06-01', 40)
  `);
});

describe('D-22 Anna submits a wish happy path', () => {
  // Anna persona literal — used by resolveEditGate in step 4.
  const annaPersona = {
    kind: 'pm' as const,
    personId: ANNA_ID,
    displayName: 'Anna',
    homeDepartmentId: DEPT_A,
  };

  test('1. getPmOverview returns Alpha for Anna', async () => {
    const result = await getPmOverview({
      orgId: ORG_ID,
      leadPmPersonId: ANNA_ID,
      monthRange: { from: '2026-05', to: '2027-05' },
    });
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].project.id).toBe(PROJECT_ID);
    expect(result.projects[0].project.name).toBe('Alpha');
  });

  test('2. getPmTimeline returns Sara row with a 2026-06 cell', async () => {
    const view = await getPmTimeline({
      orgId: ORG_ID,
      projectId: PROJECT_ID,
      monthRange: { from: '2026-05', to: '2027-05' },
    });
    expect(view.people.map((p) => p.id)).toContain(SARA_ID);
    const juneCell = view.cells.find((c) => c.personId === SARA_ID && c.monthKey === '2026-06');
    expect(juneCell).toBeDefined();
    expect(juneCell!.plannedHours).toBe(40);
    expect(juneCell!.pendingProposal).toBeNull();
  });

  test('3. resolveEditGate for Anna editing Sara@2026-06 returns "proposal"', () => {
    const decision = resolveEditGate({
      persona: annaPersona,
      targetPerson: { id: SARA_ID, departmentId: DEPT_B },
      month: '2026-06',
      currentMonth: '2026-05',
    });
    expect(decision).toBe('proposal');
  });

  test('4. createProposal + listProposals + getPmTimeline re-query reflect the wish', async () => {
    // createProposal — Anna submits a wish for Sara @ 2026-06 with 60h.
    const wish = await createProposal({
      orgId: ORG_ID,
      personId: SARA_ID,
      projectId: PROJECT_ID,
      month: '2026-06',
      proposedHours: 60,
      note: null,
      requestedBy: CLERK_ANNA,
      actorPersonaId: 'pm-anna',
    });
    expect(wish.status).toBe('proposed');
    expect(wish.proposedHours).toBe(60);

    // listProposals — Anna's proposed-wish list contains the new wish.
    const mine = await listProposals({
      orgId: ORG_ID,
      proposerId: CLERK_ANNA,
      status: 'proposed',
    });
    expect(mine.map((p) => p.id)).toContain(wish.id);

    // getPmTimeline re-query — Sara@2026-06 now carries pendingProposal(60).
    const view = await getPmTimeline({
      orgId: ORG_ID,
      projectId: PROJECT_ID,
      monthRange: { from: '2026-05', to: '2027-05' },
    });
    const juneCell = view.cells.find((c) => c.personId === SARA_ID && c.monthKey === '2026-06');
    expect(juneCell).toBeDefined();
    expect(juneCell!.pendingProposal).not.toBeNull();
    expect(juneCell!.pendingProposal?.proposedHours).toBe(60);
    expect(juneCell!.pendingProposal?.proposerId).toBe(CLERK_ANNA);
  });
});
