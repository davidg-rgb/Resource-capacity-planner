// v5.0 — Phase 40 / Plan 40-01: patchAllocation contract test (TC-API-004 + TC-PS-006 combined).
//
// Covers:
//   - TC-API-004a: non-historic edit writes ALLOCATION_EDITED (direct path)
//   - TC-API-004b: historic edit without confirmHistoric throws HistoricEditNotConfirmedError
//     and does NOT mutate allocations or change_log
//   - TC-PS-006:   historic edit with confirmHistoric:true writes ALLOCATION_HISTORIC_EDITED
//     with context.confirmedHistoric=true and populated previousValue / newValue
//   - Cutoff:      month equal to server-now is NOT historic (strict '<')
//
// PGlite bootstrap mirrors src/features/proposals/__tests__/proposal.service.e2e.test.ts.

import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest';
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

// Mock the server clock to a deterministic monthKey for every test.
vi.mock('@/lib/server/get-server-now-month-key', () => ({
  getServerNowMonthKey: vi.fn(async () => '2026-06'),
}));

const { patchAllocation } = await import('../allocation.service');
const { HistoricEditNotConfirmedError } = await import('../allocation.errors');
const { allocations, changeLog } = schema;

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PERSON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ACTOR = 'pm-anna';

const HISTORIC_ALLOC_ID = '11111111-1111-4111-8111-111111111111';
const CUTOFF_ALLOC_ID = '22222222-2222-4222-8222-222222222222';
const FUTURE_ALLOC_ID = '33333333-3333-4333-8333-333333333333';

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
    sql`INSERT INTO departments (id, organization_id, name) VALUES (${DEPT_A}, ${ORG_ID}, 'Dept A')`,
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
  await testDb.execute(sql`DELETE FROM allocations;`);
  // Seed three rows: historic ('2026-03'), cutoff ('2026-06'), future ('2026-09').
  await testDb.execute(
    sql`INSERT INTO allocations (id, organization_id, person_id, project_id, month, hours)
        VALUES
        (${HISTORIC_ALLOC_ID}, ${ORG_ID}, ${PERSON_ID}, ${PROJECT_ID}, '2026-03-01', 20),
        (${CUTOFF_ALLOC_ID},   ${ORG_ID}, ${PERSON_ID}, ${PROJECT_ID}, '2026-06-01', 30),
        (${FUTURE_ALLOC_ID},   ${ORG_ID}, ${PERSON_ID}, ${PROJECT_ID}, '2026-09-01', 40)`,
  );
});

describe('Phase 40 / Plan 40-01: patchAllocation contract (TC-API-004 + TC-PS-006)', () => {
  test('TC-API-004a: non-historic edit writes ALLOCATION_EDITED change_log row', async () => {
    const result = await patchAllocation({
      orgId: ORG_ID,
      actorPersonId: ACTOR,
      allocationId: FUTURE_ALLOC_ID,
      hours: 80,
    });

    expect(result.changeLogAction).toBe('ALLOCATION_EDITED');
    expect(result.allocation.hours).toBe(80);
    expect(result.allocation.monthKey).toBe('2026-09');

    // Verify DB state
    const [row] = await testDb
      .select()
      .from(allocations)
      .where(eq(allocations.id, FUTURE_ALLOC_ID));
    expect(row.hours).toBe(80);

    // Verify change_log
    const logs = await testDb
      .select()
      .from(changeLog)
      .where(eq(changeLog.entityId, FUTURE_ALLOC_ID));
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('ALLOCATION_EDITED');
    const ctx = logs[0].context as Record<string, unknown> | null;
    expect(ctx?.confirmedHistoric).toBeFalsy();
    expect((logs[0].newValue as Record<string, unknown>).hours).toBe(80);
    expect((logs[0].previousValue as Record<string, unknown>).hours).toBe(40);
  });

  test('TC-API-004b: historic edit without confirmHistoric throws and does NOT mutate', async () => {
    await expect(
      patchAllocation({
        orgId: ORG_ID,
        actorPersonId: ACTOR,
        allocationId: HISTORIC_ALLOC_ID,
        hours: 80,
      }),
    ).rejects.toBeInstanceOf(HistoricEditNotConfirmedError);

    // Allocation unchanged
    const [row] = await testDb
      .select()
      .from(allocations)
      .where(eq(allocations.id, HISTORIC_ALLOC_ID));
    expect(row.hours).toBe(20);

    // No change_log row written for this allocation
    const logs = await testDb
      .select()
      .from(changeLog)
      .where(eq(changeLog.entityId, HISTORIC_ALLOC_ID));
    expect(logs).toHaveLength(0);
  });

  test('TC-PS-006: historic edit with confirmHistoric:true writes ALLOCATION_HISTORIC_EDITED with full row content', async () => {
    const result = await patchAllocation({
      orgId: ORG_ID,
      actorPersonId: ACTOR,
      allocationId: HISTORIC_ALLOC_ID,
      hours: 80,
      confirmHistoric: true,
    });

    expect(result.changeLogAction).toBe('ALLOCATION_HISTORIC_EDITED');
    expect(result.allocation.hours).toBe(80);
    expect(result.allocation.monthKey).toBe('2026-03');

    // DB state updated
    const [row] = await testDb
      .select()
      .from(allocations)
      .where(eq(allocations.id, HISTORIC_ALLOC_ID));
    expect(row.hours).toBe(80);

    // Row-content assertions
    const logs = await testDb
      .select()
      .from(changeLog)
      .where(and(eq(changeLog.entityId, HISTORIC_ALLOC_ID), eq(changeLog.entity, 'allocation')));
    expect(logs).toHaveLength(1);
    const log = logs[0];
    expect(log.action).toBe('ALLOCATION_HISTORIC_EDITED');
    expect(log.entity).toBe('allocation');
    expect(log.entityId).toBe(HISTORIC_ALLOC_ID);
    const ctx = log.context as Record<string, unknown>;
    expect(ctx.confirmedHistoric).toBe(true);
    const prev = log.previousValue as Record<string, unknown>;
    const next = log.newValue as Record<string, unknown>;
    expect(prev.hours).toBe(20);
    expect(next.hours).toBe(80);
  });

  test('cutoff: month equal to server-now is NOT historic (strict <)', async () => {
    // Server now is mocked to '2026-06'. The cutoff allocation is at '2026-06',
    // so isHistoric uses strict '<' and patchAllocation without confirmHistoric should succeed.
    const result = await patchAllocation({
      orgId: ORG_ID,
      actorPersonId: ACTOR,
      allocationId: CUTOFF_ALLOC_ID,
      hours: 50,
    });
    expect(result.changeLogAction).toBe('ALLOCATION_EDITED');

    const [row] = await testDb
      .select()
      .from(allocations)
      .where(eq(allocations.id, CUTOFF_ALLOC_ID));
    expect(row.hours).toBe(50);
  });
});
