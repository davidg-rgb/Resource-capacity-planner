// v7.0 — Phase 56 (CHLOG-02): contract tests proving scenario, scenario_allocation,
// and import_session mutations now emit change_log rows on the audit spine. Mirrors
// the PGlite + mocked-@/db pattern used across the import/register contract tests.
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

const { createScenario, updateScenario, deleteScenario, upsertScenarioAllocations } =
  await import('@/features/scenarios/scenario.service');
const { cancelStaged } = await import('@/features/import/actuals-import.service');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = 'user_planner';
const DEPT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DISC_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PERSON_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PROJECT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

async function setupSchema() {
  await pg.exec(`
    CREATE TYPE scenario_status AS ENUM ('draft','active','archived');
    CREATE TYPE scenario_visibility AS ENUM ('private','shared_readonly','shared_collaborative','published');
    CREATE TYPE import_status AS ENUM ('uploaded','mapped','validated','staged','committed','failed');
    CREATE TYPE change_log_entity AS ENUM (
      'allocation','proposal','actual_entry','person','project',
      'department','discipline','import_batch','program',
      'scenario','scenario_allocation','import_session'
    );
    CREATE TYPE change_log_action AS ENUM (
      'ALLOCATION_EDITED','ALLOCATION_HISTORIC_EDITED','ALLOCATION_BULK_COPIED',
      'PROPOSAL_SUBMITTED','PROPOSAL_APPROVED','PROPOSAL_REJECTED',
      'PROPOSAL_WITHDRAWN','PROPOSAL_EDITED',
      'ACTUALS_BATCH_COMMITTED','ACTUALS_BATCH_ROLLED_BACK',
      'REGISTER_ROW_CREATED','REGISTER_ROW_UPDATED','REGISTER_ROW_DELETED',
      'ACTUAL_UPSERTED',
      'SCENARIO_CREATED','SCENARIO_UPDATED','SCENARIO_DELETED',
      'SCENARIO_ALLOCATIONS_UPSERTED','IMPORT_SESSION_STAGED','IMPORT_SESSION_CANCELLED'
    );
    CREATE TABLE organizations (id uuid PRIMARY KEY, name varchar(100) NOT NULL);
    CREATE TABLE departments (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(100) NOT NULL
    );
    CREATE TABLE disciplines (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(50) NOT NULL,
      abbreviation varchar(10) NOT NULL
    );
    CREATE TABLE people (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      first_name varchar(100) NOT NULL,
      last_name varchar(100) NOT NULL,
      discipline_id uuid NOT NULL REFERENCES disciplines(id),
      department_id uuid NOT NULL REFERENCES departments(id),
      target_hours_per_month integer NOT NULL DEFAULT 160
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
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE scenarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL,
      description varchar(1000),
      status scenario_status NOT NULL DEFAULT 'draft',
      visibility scenario_visibility NOT NULL DEFAULT 'private',
      created_by text NOT NULL,
      baseline_snapshot_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE scenario_allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      scenario_id uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid REFERENCES people(id),
      temp_entity_id uuid,
      project_id uuid REFERENCES projects(id),
      temp_project_name varchar(200),
      month date NOT NULL,
      hours integer NOT NULL,
      is_modified boolean NOT NULL DEFAULT false,
      is_new boolean NOT NULL DEFAULT false,
      is_removed boolean NOT NULL DEFAULT false,
      promoted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE import_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      user_id text NOT NULL,
      file_name text NOT NULL,
      status import_status NOT NULL,
      row_count integer NOT NULL,
      parsed_data jsonb,
      mappings jsonb,
      validation_result jsonb,
      import_result jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
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
    sql`INSERT INTO disciplines (id, organization_id, name, abbreviation) VALUES (${DISC_ID}, ${ORG_ID}, 'Backend', 'BE')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, first_name, last_name, discipline_id, department_id)
        VALUES (${PERSON_ID}, ${ORG_ID}, 'Anna', 'Tester', ${DISC_ID}, ${DEPT_ID})`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJECT_ID}, ${ORG_ID}, 'Atlas')`,
  );
}

async function resetData() {
  await testDb.execute(sql`DELETE FROM change_log`);
  await testDb.execute(sql`DELETE FROM scenario_allocations`);
  await testDb.execute(sql`DELETE FROM scenarios`);
  await testDb.execute(sql`DELETE FROM import_sessions`);
}

// Clears only the audit rows — used mid-test to drop a setup mutation's log
// (e.g. SCENARIO_CREATED) without deleting the entity it just created.
async function clearLog() {
  await testDb.execute(sql`DELETE FROM change_log`);
}

async function logsFor(entity: string) {
  return testDb
    .select()
    .from(schema.changeLog)
    .where(eq(schema.changeLog.entity, entity as never));
}

beforeAll(setupSchema);
beforeEach(resetData);

describe('CHLOG-02: scenario entity audit', () => {
  it('createScenario writes one SCENARIO_CREATED row', async () => {
    const scenario = await createScenario(ORG_ID, USER_ID, { name: 'Q3 Plan' });
    const logs = await logsFor('scenario');
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('SCENARIO_CREATED');
    expect(logs[0].entityId).toBe(scenario.id);
    expect(logs[0].actorPersonaId).toBe(USER_ID);
  });

  it('updateScenario writes a SCENARIO_UPDATED row with before/after', async () => {
    const scenario = await createScenario(ORG_ID, USER_ID, { name: 'Before' });
    await clearLog();
    await updateScenario(ORG_ID, scenario.id, USER_ID, { name: 'After' });
    const logs = await logsFor('scenario');
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('SCENARIO_UPDATED');
    expect((logs[0].previousValue as { name: string }).name).toBe('Before');
    expect((logs[0].newValue as { name: string }).name).toBe('After');
  });

  it('deleteScenario writes a SCENARIO_DELETED row', async () => {
    const scenario = await createScenario(ORG_ID, USER_ID, { name: 'Doomed' });
    await clearLog();
    await deleteScenario(ORG_ID, scenario.id, USER_ID);
    const logs = await logsFor('scenario');
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('SCENARIO_DELETED');
    expect(logs[0].newValue).toBeNull();
  });
});

describe('CHLOG-02: scenario_allocation entity audit', () => {
  it('upsertScenarioAllocations writes exactly ONE row with per-op counts', async () => {
    const scenario = await createScenario(ORG_ID, USER_ID, { name: 'Alloc' });
    await clearLog();
    await upsertScenarioAllocations(ORG_ID, scenario.id, USER_ID, [
      { personId: PERSON_ID, projectId: PROJECT_ID, month: '2026-06', hours: 40 },
      { personId: PERSON_ID, projectId: PROJECT_ID, month: '2026-07', hours: 20 },
    ]);
    const logs = await logsFor('scenario_allocation');
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('SCENARIO_ALLOCATIONS_UPSERTED');
    const ctx = logs[0].context as { created: number; updated: number; total: number };
    expect(ctx.created).toBe(2);
    expect(ctx.updated).toBe(0);
    expect(ctx.total).toBe(2);
  });
});

describe('CHLOG-02: import_session entity audit', () => {
  it('cancelStaged writes an IMPORT_SESSION_CANCELLED row', async () => {
    const [session] = await testDb
      .insert(schema.importSessions)
      .values({
        organizationId: ORG_ID,
        userId: USER_ID,
        fileName: 'actuals.xlsx',
        status: 'staged',
        rowCount: 3,
        expiresAt: new Date('2030-01-01T00:00:00Z'),
      })
      .returning({ id: schema.importSessions.id });

    await cancelStaged({ orgId: ORG_ID, sessionId: session.id, userId: USER_ID });

    const logs = await logsFor('import_session');
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('IMPORT_SESSION_CANCELLED');
    expect(logs[0].entityId).toBe(session.id);
  });
});

describe('CHLOG smoke: a full scenario + import-session flow audits each entity once', () => {
  it('create scenario -> upsert allocation -> cancel session writes one row per entity', async () => {
    const scenario = await createScenario(ORG_ID, USER_ID, { name: 'Smoke' });
    await upsertScenarioAllocations(ORG_ID, scenario.id, USER_ID, [
      { personId: PERSON_ID, projectId: PROJECT_ID, month: '2026-08', hours: 10 },
    ]);
    const [session] = await testDb
      .insert(schema.importSessions)
      .values({
        organizationId: ORG_ID,
        userId: USER_ID,
        fileName: 'smoke.xlsx',
        status: 'staged',
        rowCount: 1,
        expiresAt: new Date('2030-01-01T00:00:00Z'),
      })
      .returning({ id: schema.importSessions.id });
    await cancelStaged({ orgId: ORG_ID, sessionId: session.id, userId: USER_ID });

    expect(await logsFor('scenario')).toHaveLength(1);
    expect(await logsFor('scenario_allocation')).toHaveLength(1);
    expect(await logsFor('import_session')).toHaveLength(1);

    const all = await testDb.select().from(schema.changeLog);
    const actions = all.map((r) => r.action).sort();
    expect(actions).toEqual(
      ['IMPORT_SESSION_CANCELLED', 'SCENARIO_ALLOCATIONS_UPSERTED', 'SCENARIO_CREATED'].sort(),
    );
  });
});
