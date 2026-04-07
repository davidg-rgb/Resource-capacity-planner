// v5.0 — Phase 37 / ACT-05: contract test for actuals.read aggregation.
// TC-AR-001..004.

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

const { aggregateByMonth, aggregateByWeek, getDailyRows, getProjectBurn } =
  await import('../actuals.read');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const P1 = 'b1111111-1111-4111-8111-111111111111';
const P2 = 'b2222222-2222-4222-8222-222222222222';
const PROJ1 = 'c1111111-1111-4111-8111-111111111111';
const PROJ2 = 'c2222222-2222-4222-8222-222222222222';

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
    CREATE TABLE allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      month date NOT NULL,
      hours integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT allocations_org_person_project_month_uniq
        UNIQUE (organization_id, person_id, project_id, month)
    );
  `);

  const ids = [{ id: ORG_ID, name: 'Test Org' }];
  for (const o of ids) {
    await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${o.id}, ${o.name})`);
  }
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name)
        VALUES ('d0000000-0000-4000-8000-000000000000', ${ORG_ID}, 'Eng')`,
  );
  for (const [id, fn] of [
    [P1, 'Anna'],
    [P2, 'Bob'],
  ] as const) {
    await testDb.execute(
      sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name)
          VALUES (${id}, ${ORG_ID}, 'd0000000-0000-4000-8000-000000000000', ${fn}, 'X')`,
    );
  }
  for (const [id, name] of [
    [PROJ1, 'Atlas'],
    [PROJ2, 'Beacon'],
  ] as const) {
    await testDb.execute(
      sql`INSERT INTO projects (id, organization_id, name) VALUES (${id}, ${ORG_ID}, ${name})`,
    );
  }
});

async function seedActuals(rows: Array<[string, string, string, number]>) {
  for (const [pid, projid, date, hours] of rows) {
    await testDb.execute(
      sql`INSERT INTO actual_entries (organization_id, person_id, project_id, date, hours, source)
          VALUES (${ORG_ID}, ${pid}, ${projid}, ${date}, ${hours.toFixed(2)}, 'manual')`,
    );
  }
}

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM actual_entries`);
  await testDb.execute(sql`DELETE FROM allocations`);
});

describe('TC-AR-001: aggregateByMonth groups per (person, project, monthKey)', () => {
  it('sums hours and respects person/project filters', async () => {
    await seedActuals([
      [P1, PROJ1, '2026-06-01', 8],
      [P1, PROJ1, '2026-06-02', 7],
      [P1, PROJ1, '2026-07-01', 5],
      [P2, PROJ1, '2026-06-01', 4],
      [P1, PROJ2, '2026-06-03', 6],
    ]);

    const all = await aggregateByMonth(ORG_ID, {});
    const find = (pid: string, proj: string, mk: string) =>
      all.find((r) => r.personId === pid && r.projectId === proj && r.monthKey === mk);
    expect(find(P1, PROJ1, '2026-06')!.hours).toBe(15);
    expect(find(P1, PROJ1, '2026-07')!.hours).toBe(5);
    expect(find(P2, PROJ1, '2026-06')!.hours).toBe(4);
    expect(find(P1, PROJ2, '2026-06')!.hours).toBe(6);

    const filtered = await aggregateByMonth(ORG_ID, {
      personIds: [P1],
      projectIds: [PROJ1],
      monthKeys: ['2026-06'],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].hours).toBe(15);
  });
});

describe('TC-AR-002: aggregateByWeek buckets ISO week 53 of 2026 vs week 1 of 2027', () => {
  it('Dec 28 2026 -> (2026, 53), Jan 4 2027 -> (2027, 1)', async () => {
    await seedActuals([
      [P1, PROJ1, '2026-12-28', 8],
      [P1, PROJ1, '2026-12-29', 8],
      [P1, PROJ1, '2027-01-04', 8],
    ]);

    const rows = await aggregateByWeek(ORG_ID, {});
    const w53 = rows.find((r) => r.isoYear === 2026 && r.isoWeek === 53);
    const w1 = rows.find((r) => r.isoYear === 2027 && r.isoWeek === 1);
    expect(w53).toBeDefined();
    expect(w53!.hours).toBe(16);
    expect(w1).toBeDefined();
    expect(w1!.hours).toBe(8);
  });
});

describe('TC-AR-003: getDailyRows returns rows inside the requested month only', () => {
  it('does not leak rows from adjacent months', async () => {
    await seedActuals([
      [P1, PROJ1, '2026-05-31', 1],
      [P1, PROJ1, '2026-06-01', 2],
      [P1, PROJ1, '2026-06-30', 3],
      [P1, PROJ1, '2026-07-01', 4],
    ]);
    const rows = await getDailyRows(ORG_ID, {
      personId: P1,
      projectId: PROJ1,
      monthKey: '2026-06',
    });
    expect(rows.map((r) => r.date).sort()).toEqual(['2026-06-01', '2026-06-30']);
    expect(rows.reduce((a, r) => a + r.hours, 0)).toBe(5);
  });
});

describe('TC-AR-004: getProjectBurn sums planned + actual within range', () => {
  it('returns plannedHours from allocations and actualHours from actual_entries', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${P1}, ${PROJ1}, '2026-06-01', 160)`,
    );
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${P1}, ${PROJ1}, '2026-07-01', 120)`,
    );
    await seedActuals([
      [P1, PROJ1, '2026-06-15', 30],
      [P1, PROJ1, '2026-07-15', 20],
      [P1, PROJ1, '2026-08-01', 999], // out of range
    ]);

    const burn = await getProjectBurn(ORG_ID, PROJ1, {
      from: '2026-06-01',
      to: '2026-07-31',
    });
    expect(burn.plannedHours).toBe(280);
    expect(burn.actualHours).toBe(50);
  });
});

describe('Cross-check: sum of getDailyRows == aggregateByMonth bucket (ACT-05 invariant)', () => {
  it('daily rows reconcile to month aggregation', async () => {
    await seedActuals([
      [P1, PROJ1, '2026-06-01', 8],
      [P1, PROJ1, '2026-06-02', 7.5],
      [P1, PROJ1, '2026-06-03', 4.25],
    ]);
    const daily = await getDailyRows(ORG_ID, {
      personId: P1,
      projectId: PROJ1,
      monthKey: '2026-06',
    });
    const monthly = await aggregateByMonth(ORG_ID, {
      personIds: [P1],
      projectIds: [PROJ1],
      monthKeys: ['2026-06'],
    });
    const dailySum = Math.round(daily.reduce((a, r) => a + r.hours, 0) * 100);
    const monthlySum = Math.round(monthly[0].hours * 100);
    expect(dailySum).toBe(monthlySum);
  });
});
