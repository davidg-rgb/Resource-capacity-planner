// v5.0 — Phase 37 / ACT-02: contract test for upsertActuals.
//
// Runs against an in-process pglite instance with the same schema slice that
// the change-log + v5-schema contract tests use. Verifies TC-AC-001..006 plus
// the change_log invariant from FOUND-V5-04 (every successful call writes
// exactly one change_log row inside the same tx).

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql, eq, and, asc } from 'drizzle-orm';
import * as schema from '@/db/schema';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const { upsertActuals } = await import('../actuals.service');
const { actualEntries, changeLog } = schema;

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEPT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

beforeAll(async () => {
  // pglite needs single-statement prepared queries; use pg.exec for DDL bundles.
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
    CREATE TYPE actual_source AS ENUM ('import','manual');
    CREATE TABLE actual_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      date date NOT NULL,
      hours numeric(5,2) NOT NULL,
      source actual_source NOT NULL,
      import_batch_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT actuals_org_person_project_date_uniq
        UNIQUE (organization_id, person_id, project_id, date)
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

  // Seed org / dept / person / project (single statements via testDb).
  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_ID}, 'Test Org')`);
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES (${DEPT_ID}, ${ORG_ID}, 'Eng')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name)
        VALUES (${PERSON_ID}, ${ORG_ID}, ${DEPT_ID}, 'Anna', 'Tester')`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJECT_ID}, ${ORG_ID}, 'Atlas')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log;`);
  await testDb.execute(sql`DELETE FROM actual_entries;`);
});

const baseInput = {
  orgId: ORG_ID,
  personId: PERSON_ID,
  projectId: PROJECT_ID,
  source: 'manual' as const,
  actorPersonaId: 'pm-anna',
};

async function selectAllByDate() {
  return testDb
    .select()
    .from(actualEntries)
    .where(
      and(
        eq(actualEntries.organizationId, ORG_ID),
        eq(actualEntries.personId, PERSON_ID),
        eq(actualEntries.projectId, PROJECT_ID),
      ),
    )
    .orderBy(asc(actualEntries.date));
}

async function changeLogCount(): Promise<number> {
  const r = await testDb.execute(sql`SELECT count(*)::int AS c FROM change_log`);
  return (r.rows[0] as { c: number }).c;
}

describe('TC-AC-001: day-grain insert writes one row + change_log entry', () => {
  it('inserts a single 8.00 row and one change_log entry', async () => {
    const res = await upsertActuals({
      ...baseInput,
      grain: 'day',
      date: '2026-06-01',
      hours: 8,
    });
    expect(res.rowsWritten).toBe(1);
    expect(res.dates).toEqual(['2026-06-01']);

    const rows = await selectAllByDate();
    expect(rows).toHaveLength(1);
    expect(rows[0].hours).toBe('8.00');
    expect(rows[0].source).toBe('manual');

    expect(await changeLogCount()).toBe(1);
  });
});

describe('TC-AC-002: day-grain second call is idempotent on the unique key', () => {
  it('a repeated call updates rather than inserts a duplicate', async () => {
    await upsertActuals({ ...baseInput, grain: 'day', date: '2026-06-02', hours: 4 });
    await upsertActuals({ ...baseInput, grain: 'day', date: '2026-06-02', hours: 6 });

    const rows = await selectAllByDate();
    expect(rows).toHaveLength(1);
    expect(rows[0].hours).toBe('6.00');
    expect(await changeLogCount()).toBe(2);
  });
});

describe('TC-AC-003: week-grain 40h across 5 working days = 8.00 each', () => {
  it('writes 5 rows of 8.00 for ISO 2026-W23', async () => {
    const res = await upsertActuals({
      ...baseInput,
      grain: 'week',
      isoYear: 2026,
      isoWeek: 23,
      totalHours: 40,
    });
    expect(res.rowsWritten).toBe(5);

    const rows = await selectAllByDate();
    expect(rows).toHaveLength(5);
    for (const r of rows) expect(r.hours).toBe('8.00');
    const sumCents = rows.reduce((acc, r) => acc + Math.round(Number(r.hours) * 100), 0);
    expect(sumCents).toBe(4000);
    expect(await changeLogCount()).toBe(1);
  });
});

describe('TC-AC-004: week-grain 37h preserves sum exactly (largest-remainder)', () => {
  it('writes 5 rows summing to exactly 37.00', async () => {
    const res = await upsertActuals({
      ...baseInput,
      grain: 'week',
      isoYear: 2026,
      isoWeek: 23,
      totalHours: 37,
    });
    expect(res.rowsWritten).toBe(5);

    const rows = await selectAllByDate();
    const sumCents = rows.reduce((acc, r) => acc + Math.round(Number(r.hours) * 100), 0);
    expect(sumCents).toBe(3700);
    expect(await changeLogCount()).toBe(1);
  });
});

describe('TC-AC-005: ISO 2026-W53 spans Dec 28-30 (Dec 31 + Jan 1 are SE holidays)', () => {
  it('writes rows for the 3 working days of week 53 summing to 32.00', async () => {
    const res = await upsertActuals({
      ...baseInput,
      grain: 'week',
      isoYear: 2026,
      isoWeek: 53,
      totalHours: 32,
    });
    // Note: plan called for 4 rows but Dec 31 (Nyårsafton) is a Swedish
    // holiday in lib/time/swedish-holidays.ts, leaving only 3 working days.
    expect(res.rowsWritten).toBe(3);
    expect(res.dates).toEqual(['2026-12-28', '2026-12-29', '2026-12-30']);

    const rows = await selectAllByDate();
    const sumCents = rows.reduce((acc, r) => acc + Math.round(Number(r.hours) * 100), 0);
    expect(sumCents).toBe(3200);
    expect(await changeLogCount()).toBe(1);
  });
});

describe('TC-AC-006: month-grain 160h distributed across June 2026 working days', () => {
  it('writes N rows summing to exactly 160.00', async () => {
    const res = await upsertActuals({
      ...baseInput,
      grain: 'month',
      monthKey: '2026-06',
      totalHours: 160,
    });
    const rows = await selectAllByDate();
    expect(rows).toHaveLength(res.rowsWritten);
    const sumCents = rows.reduce((acc, r) => acc + Math.round(Number(r.hours) * 100), 0);
    expect(sumCents).toBe(16000);
    expect(await changeLogCount()).toBe(1);
  });
});

describe('change_log entry shape', () => {
  it('records action=ACTUAL_UPSERTED, entity=actual_entry, with grain context', async () => {
    await upsertActuals({
      ...baseInput,
      grain: 'week',
      isoYear: 2026,
      isoWeek: 23,
      totalHours: 40,
    });
    const logs = await testDb.select().from(changeLog);
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('ACTUAL_UPSERTED');
    expect(logs[0].entity).toBe('actual_entry');
    expect((logs[0].context as { grain: string }).grain).toBe('week');
  });
});
