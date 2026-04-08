// v5.0 — Phase 41 / Plan 41-01: PGlite test for the impact endpoint's
// new currentUtilizationPct + projectedUtilizationPct fields (REQUIREMENTS L45).

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

const { GET } = await import('@/app/api/v5/proposals/[id]/impact/route');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_ID = 'd0000000-0000-4000-8000-000000000000';
const PERSON_TARGET_100 = 'b1111111-1111-4111-8111-111111111111';
const PERSON_FALLBACK = 'b2222222-2222-4222-8222-222222222222';
const PROJECT_ID = 'c1111111-1111-4111-8111-111111111111';

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
  `);

  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_ID}, 'Test')`);
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES (${DEPT_ID}, ${ORG_ID}, 'Eng')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month) VALUES
        (${PERSON_TARGET_100}, ${ORG_ID}, ${DEPT_ID}, 'Sara', 'Tester', 100),
        (${PERSON_FALLBACK},   ${ORG_ID}, ${DEPT_ID}, 'Default', 'Tester', NULL)`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJECT_ID}, ${ORG_ID}, 'Atlas')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocation_proposals`);
  await testDb.execute(sql`DELETE FROM allocations`);
  fakeAuth.orgId = ORG_ID;
});

async function seedProposal(
  personId: string,
  proposedHours: number,
  existingHours = 0,
): Promise<string> {
  if (existingHours > 0) {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${personId}, ${PROJECT_ID}, '2026-06-01', ${existingHours})`,
    );
  }
  const result = await testDb.execute(sql`
    INSERT INTO allocation_proposals
      (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
    VALUES
      (${ORG_ID}, ${personId}, ${PROJECT_ID}, '2026-06-01', ${proposedHours}, 'proposed', 'pm-x', ${DEPT_ID})
    RETURNING id
  `);
  return (result.rows[0] as { id: string }).id;
}

async function callImpact(id: string) {
  const res = await GET(new Request(`http://localhost/api/v5/proposals/${id}/impact`) as never, {
    params: Promise.resolve({ id }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as {
    personMonthPlannedBefore: number;
    personMonthPlannedAfter: number;
    currentUtilizationPct: number;
    projectedUtilizationPct: number;
    proposedHours: number;
  };
}

describe('Proposal impact endpoint — utilization percentages (REQUIREMENTS L45)', () => {
  it('target=100, before=40, after=90 → currentUtilizationPct=40, projectedUtilizationPct=90', async () => {
    // Pre-existing 40h on a DIFFERENT (project,person,month) so it still counts in sumAll.
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${PERSON_TARGET_100}, ${PROJECT_ID}, '2026-06-01', 40)`,
    );
    // Proposal for the SAME (project,person,month) replaces 40 → 90.
    const result = await testDb.execute(sql`
      INSERT INTO allocation_proposals
        (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
      VALUES (${ORG_ID}, ${PERSON_TARGET_100}, ${PROJECT_ID}, '2026-06-01', 90, 'proposed', 'pm-x', ${DEPT_ID})
      RETURNING id
    `);
    const proposalId = (result.rows[0] as { id: string }).id;
    const dto = await callImpact(proposalId);
    expect(dto.personMonthPlannedBefore).toBe(40);
    expect(dto.personMonthPlannedAfter).toBe(90);
    expect(dto.currentUtilizationPct).toBe(40);
    expect(dto.projectedUtilizationPct).toBe(90);
  });

  it('rounds to nearest int (target=100, before=39.6 → 40)', async () => {
    // 39.6 + 0 = 39.6 → round → 40
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${PERSON_TARGET_100}, ${PROJECT_ID}, '2026-06-01', 40)`,
    );
    // Use a SECOND project so the proposal's existingForTriple lookup misses
    // and projected = 40 + 39 = 79.
    const PROJ2 = 'c2222222-2222-4222-8222-222222222222';
    await testDb.execute(
      sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJ2}, ${ORG_ID}, 'Beacon')
          ON CONFLICT (id) DO NOTHING`,
    );
    const result = await testDb.execute(sql`
      INSERT INTO allocation_proposals
        (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
      VALUES (${ORG_ID}, ${PERSON_TARGET_100}, ${PROJ2}, '2026-06-01', 39.6, 'proposed', 'pm-x', ${DEPT_ID})
      RETURNING id
    `);
    const proposalId = (result.rows[0] as { id: string }).id;
    const dto = await callImpact(proposalId);
    expect(dto.currentUtilizationPct).toBe(40); // 40/100 = 40
    // before=40, existing for this triple=0, proposed=39.6 → after=79.6 → round to 80.
    expect(dto.projectedUtilizationPct).toBe(80);
  });

  it('falls back to target=160 when person.target_hours_per_month is null', async () => {
    const id = await seedProposal(PERSON_FALLBACK, 80);
    const dto = await callImpact(id);
    // before=0/160=0, after=80/160=50
    expect(dto.currentUtilizationPct).toBe(0);
    expect(dto.projectedUtilizationPct).toBe(50);
  });
});
