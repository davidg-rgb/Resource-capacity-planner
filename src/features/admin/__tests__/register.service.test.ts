// v5.0 — Phase 43 / Plan 43-01: register.service tests (PGlite).
//
// Covers create / update / archive / list / un-archive across all five
// register entities, plus cross-org isolation and unknown-entity rejection.
// Dependent-row blockers live in register.dependents.test.ts and audit
// shape lives in register.audit.test.ts (separate files for clarity).

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql, eq, and } from 'drizzle-orm';

import * as schema from '@/db/schema';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_ID_2 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

// Lazy import after mock so the service binds to testDb.
const registerSvcPromise = import('../register.service');

beforeAll(async () => {
  await testDb.execute(sql`
    DO $$ BEGIN
      CREATE TYPE project_status AS ENUM ('active','planned','archived');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await testDb.execute(sql`
    DO $$ BEGIN
      CREATE TYPE proposal_status AS ENUM ('proposed','approved','rejected','withdrawn','superseded');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await testDb.execute(sql`
    DO $$ BEGIN
      CREATE TYPE change_log_entity AS ENUM (
        'allocation','proposal','actual_entry','person','project',
        'department','discipline','import_batch','program'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await testDb.execute(sql`
    DO $$ BEGIN
      CREATE TYPE change_log_action AS ENUM (
        'ALLOCATION_EDITED','ALLOCATION_HISTORIC_EDITED','ALLOCATION_BULK_COPIED',
        'PROPOSAL_SUBMITTED','PROPOSAL_APPROVED','PROPOSAL_REJECTED',
        'PROPOSAL_WITHDRAWN','PROPOSAL_EDITED',
        'ACTUALS_BATCH_COMMITTED','ACTUALS_BATCH_ROLLED_BACK',
        'REGISTER_ROW_CREATED','REGISTER_ROW_UPDATED','REGISTER_ROW_DELETED',
        'ACTUAL_UPSERTED'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id uuid PRIMARY KEY,
      clerk_org_id text NOT NULL,
      name varchar(100) NOT NULL,
      slug varchar(50) NOT NULL
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS departments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(100) NOT NULL,
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS disciplines (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(50) NOT NULL,
      abbreviation varchar(10) NOT NULL,
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS programs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL,
      description varchar(500),
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS people (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      first_name varchar(100) NOT NULL,
      last_name varchar(100) NOT NULL,
      discipline_id uuid NOT NULL REFERENCES disciplines(id),
      department_id uuid NOT NULL REFERENCES departments(id),
      target_hours_per_month integer NOT NULL DEFAULT 160,
      sort_order integer NOT NULL DEFAULT 0,
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL,
      program_id uuid REFERENCES programs(id),
      status project_status NOT NULL DEFAULT 'active',
      lead_pm_person_id uuid REFERENCES people(id),
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      month date NOT NULL,
      hours integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS allocation_proposals (
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
      parent_proposal_id uuid,
      target_department_id uuid NOT NULL REFERENCES departments(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS change_log (
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

  await testDb.execute(sql`
    INSERT INTO organizations (id, clerk_org_id, name, slug) VALUES
      (${ORG_ID}, 'clerk_test', 'Test Org', 'test-org'),
      (${ORG_ID_2}, 'clerk_test_2', 'Test Org 2', 'test-org-2')
    ON CONFLICT DO NOTHING;
  `);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
  await testDb.execute(sql`DELETE FROM allocations;`);
  await testDb.execute(sql`DELETE FROM change_log;`);
  await testDb.execute(sql`DELETE FROM projects;`);
  await testDb.execute(sql`DELETE FROM people;`);
  await testDb.execute(sql`DELETE FROM programs;`);
  await testDb.execute(sql`DELETE FROM disciplines;`);
  await testDb.execute(sql`DELETE FROM departments;`);
});

async function seedDept(name = 'Dept A'): Promise<string> {
  const [row] = await testDb
    .insert(schema.departments)
    .values({ organizationId: ORG_ID, name })
    .returning();
  return row.id;
}
async function seedDiscipline(name = 'Disc A', abbr = 'DA'): Promise<string> {
  const [row] = await testDb
    .insert(schema.disciplines)
    .values({ organizationId: ORG_ID, name, abbreviation: abbr })
    .returning();
  return row.id;
}
async function seedProgram(name = 'Prog A'): Promise<string> {
  const [row] = await testDb
    .insert(schema.programs)
    .values({ organizationId: ORG_ID, name })
    .returning();
  return row.id;
}

// ===========================================================================
// Task 1 smoke
// ===========================================================================

describe('Phase 43 Task 1 — migration 0008 smoke', () => {
  it('accepts change_log inserts with entity=program', async () => {
    const programId = await seedProgram('Smoke Prog');
    await testDb.insert(schema.changeLog).values({
      organizationId: ORG_ID,
      actorPersonaId: 'admin',
      entity: 'program',
      entityId: programId,
      action: 'REGISTER_ROW_CREATED',
      previousValue: null,
      newValue: { name: 'Smoke Prog' },
      context: null,
    });
    const rows = await testDb
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.entity, 'program'));
    expect(rows).toHaveLength(1);
  });
});

// ===========================================================================
// Task 2 — registerService contract
// ===========================================================================

describe('Phase 43 Task 2 — registerService.create / update / archive / list', () => {
  it('createRegisterRow(department): inserts row + change_log atomically', async () => {
    const { createRegisterRow } = await registerSvcPromise;
    const row = await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'user_admin_1',
      entity: 'department',
      data: { name: 'Bridges' },
    });
    expect(row.id).toBeTruthy();
    expect((row as { name: string }).name).toBe('Bridges');

    const log = await testDb
      .select()
      .from(schema.changeLog)
      .where(and(eq(schema.changeLog.entity, 'department'), eq(schema.changeLog.entityId, row.id)));
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe('REGISTER_ROW_CREATED');
    expect(log[0].actorPersonaId).toBe('user_admin_1');
    expect(log[0].newValue).toMatchObject({ name: 'Bridges' });
  });

  it('updateRegisterRow(department): writes before/after to change_log', async () => {
    const { createRegisterRow, updateRegisterRow } = await registerSvcPromise;
    const created = await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'department',
      data: { name: 'Old' },
    });
    const updated = await updateRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'department',
      id: created.id,
      data: { name: 'New' },
    });
    expect((updated as { name: string }).name).toBe('New');

    const log = await testDb
      .select()
      .from(schema.changeLog)
      .where(
        and(
          eq(schema.changeLog.entity, 'department'),
          eq(schema.changeLog.action, 'REGISTER_ROW_UPDATED'),
        ),
      );
    expect(log).toHaveLength(1);
    expect(log[0].previousValue).toMatchObject({ name: 'Old' });
    expect(log[0].newValue).toMatchObject({ name: 'New' });
  });

  it('updateRegisterRow: NotFoundError on wrong id/org', async () => {
    const { updateRegisterRow } = await registerSvcPromise;
    await expect(
      updateRegisterRow({
        orgId: ORG_ID,
        actorUserId: 'admin',
        entity: 'department',
        id: '00000000-0000-4000-8000-000000000000',
        data: { name: 'X' },
      }),
    ).rejects.toThrow();
  });

  it('archiveRegisterRow(program) happy path hides from default list', async () => {
    const { createRegisterRow, archiveRegisterRow, listRegisterRows } = await registerSvcPromise;
    const p = await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'program',
      data: { name: 'P1' },
    });
    await archiveRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'program',
      id: p.id,
    });

    const active = await listRegisterRows({
      orgId: ORG_ID,
      entity: 'program',
      includeArchived: false,
    });
    expect(active.find((r) => r.id === p.id)).toBeUndefined();

    const all = await listRegisterRows({
      orgId: ORG_ID,
      entity: 'program',
      includeArchived: true,
    });
    expect(all.find((r) => r.id === p.id)).toBeDefined();
    expect((all.find((r) => r.id === p.id) as { archivedAt: Date | null }).archivedAt).toBeTruthy();
  });

  it('un-archive via updateRegisterRow({ archivedAt: null })', async () => {
    const { createRegisterRow, archiveRegisterRow, updateRegisterRow, listRegisterRows } =
      await registerSvcPromise;
    const p = await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'program',
      data: { name: 'P2' },
    });
    await archiveRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'program',
      id: p.id,
    });
    await updateRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'program',
      id: p.id,
      data: { archivedAt: null },
    });
    const active = await listRegisterRows({
      orgId: ORG_ID,
      entity: 'program',
      includeArchived: false,
    });
    expect(active.find((r) => r.id === p.id)).toBeDefined();
  });

  it('list ordering: archived rows first DESC NULLS FIRST then name ASC', async () => {
    const { createRegisterRow, archiveRegisterRow, listRegisterRows } = await registerSvcPromise;
    const a = await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'department',
      data: { name: 'Alpha' },
    });
    const b = await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'department',
      data: { name: 'Bravo' },
    });
    const c = await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'department',
      data: { name: 'Charlie' },
    });
    await archiveRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'department',
      id: c.id,
    });
    const all = await listRegisterRows({
      orgId: ORG_ID,
      entity: 'department',
      includeArchived: true,
    });
    expect(all.map((r) => r.id)).toEqual([c.id, a.id, b.id]);
  });

  it('createRegisterRow(project) sets status active by default', async () => {
    const { createRegisterRow } = await registerSvcPromise;
    const programId = await seedProgram('Bridges Program');
    const p = await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'project',
      data: { name: 'Proj 1', programId },
    });
    expect((p as { status: string }).status).toBe('active');
  });

  it('archiveRegisterRow(project) sets status=archived AND archivedAt', async () => {
    const { createRegisterRow, archiveRegisterRow } = await registerSvcPromise;
    const p = await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'project',
      data: { name: 'Proj 2' },
    });
    const archived = await archiveRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'project',
      id: p.id,
    });
    expect((archived as { status: string }).status).toBe('archived');
    expect((archived as { archivedAt: Date | null }).archivedAt).toBeTruthy();
  });

  it('createRegisterRow(person) requires discipline + department', async () => {
    const { createRegisterRow } = await registerSvcPromise;
    const dept = await seedDept();
    const disc = await seedDiscipline();
    const person = await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'person',
      data: {
        firstName: 'Anna',
        lastName: 'Andersson',
        departmentId: dept,
        disciplineId: disc,
        targetHoursPerMonth: 160,
      },
    });
    expect((person as { firstName: string }).firstName).toBe('Anna');
  });

  it('unknown entity throws NotFoundError', async () => {
    const { createRegisterRow } = await registerSvcPromise;
    await expect(
      createRegisterRow({
        orgId: ORG_ID,
        actorUserId: 'admin',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entity: 'gibberish' as any,
        data: { name: 'x' },
      }),
    ).rejects.toThrow();
  });

  it('cross-org isolation: listRegisterRows scopes to orgId', async () => {
    const { createRegisterRow, listRegisterRows } = await registerSvcPromise;
    await createRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'department',
      data: { name: 'OrgA Dept' },
    });
    await createRegisterRow({
      orgId: ORG_ID_2,
      actorUserId: 'admin',
      entity: 'department',
      data: { name: 'OrgB Dept' },
    });
    const orgA = await listRegisterRows({
      orgId: ORG_ID,
      entity: 'department',
      includeArchived: true,
    });
    expect(orgA.every((r) => (r as { name: string }).name === 'OrgA Dept')).toBe(true);
  });
});
