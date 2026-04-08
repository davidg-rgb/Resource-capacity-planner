// v5.0 — Phase 41 / Plan 41-01: PGlite tests for capacity.read.
// TC-CP-001..004 + approved-only + targetIsDefault fallback + breakdown sort.

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

const { getPersonMonthUtilization, getCapacityBreakdown, classify } =
  await import('../capacity.read');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_ID = 'd0000000-0000-4000-8000-000000000000';
const P_OVER = 'b1111111-1111-4111-8111-111111111111';
const P_UNDER = 'b2222222-2222-4222-8222-222222222222';
const P_OK = 'b3333333-3333-4333-8333-333333333333';
const P_BOUNDARY = 'b4444444-4444-4444-8444-444444444444';
const P_ABSENT = 'b5555555-5555-4555-8555-555555555555';
const P_FALLBACK = 'b6666666-6666-4666-8666-666666666666';
const PROJ1 = 'c1111111-1111-4111-8111-111111111111';
const PROJ2 = 'c2222222-2222-4222-8222-222222222222';
const PROJ3 = 'c3333333-3333-4333-8333-333333333333';

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
      status proposal_status NOT NULL DEFAULT 'proposed',
      requested_by text NOT NULL,
      target_department_id uuid NOT NULL REFERENCES departments(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_ID}, 'Test Org')`);
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES (${DEPT_ID}, ${ORG_ID}, 'Eng')`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES
        (${PROJ1}, ${ORG_ID}, 'Atlas'),
        (${PROJ2}, ${ORG_ID}, 'Beacon'),
        (${PROJ3}, ${ORG_ID}, 'Comet')`,
  );

  // target_hours_per_month=100 makes the percentage math trivial:
  //   59h → 59% (under), 60h → 60% (ok), 100h → 100% (ok), 101h → 101% (over)
  // P_ABSENT has target=0 → always 'absent'.
  // P_FALLBACK has target=NULL → falls back to 160 default.
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month) VALUES
        (${P_OVER},     ${ORG_ID}, ${DEPT_ID}, 'Over',     'Booked', 100),
        (${P_UNDER},    ${ORG_ID}, ${DEPT_ID}, 'Under',    'Booked', 100),
        (${P_OK},       ${ORG_ID}, ${DEPT_ID}, 'OkLow',    'Booked', 100),
        (${P_BOUNDARY}, ${ORG_ID}, ${DEPT_ID}, 'OkHigh',   'Booked', 100),
        (${P_ABSENT},   ${ORG_ID}, ${DEPT_ID}, 'Absent',   'Person', 0),
        (${P_FALLBACK}, ${ORG_ID}, ${DEPT_ID}, 'Fallback', 'Person', NULL)`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocation_proposals`);
  await testDb.execute(sql`DELETE FROM allocations`);
});

describe('classify() — pure threshold helper', () => {
  it('classifies boundary values per v5 thresholds (D-05)', () => {
    expect(classify(59, 100)).toBe('under');
    expect(classify(60, 100)).toBe('ok');
    expect(classify(100, 100)).toBe('ok');
    expect(classify(101, 100)).toBe('over');
    expect(classify(0, 0)).toBe('absent');
    expect(classify(50, 0)).toBe('absent'); // target=0 wins over hours
  });
});

describe('getPersonMonthUtilization — TC-CP-001..004 boundaries', () => {
  it('TC-CP-001: planned=59h with target=100 → under', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${P_UNDER}, ${PROJ1}, '2026-06-01', 59)`,
    );
    const map = await getPersonMonthUtilization({
      orgId: ORG_ID,
      departmentId: DEPT_ID,
      monthRange: { start: '2026-06', end: '2026-06' },
    });
    const cell = map.cells.find((c) => c.personId === P_UNDER && c.monthKey === '2026-06');
    expect(cell).toBeDefined();
    expect(cell!.plannedHours).toBe(59);
    expect(cell!.utilizationPct).toBe(59);
    expect(cell!.status).toBe('under');
  });

  it('TC-CP-002: planned=60h and planned=100h with target=100 → ok', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${P_OK},       ${PROJ1}, '2026-06-01', 60),
                 (${ORG_ID}, ${P_BOUNDARY}, ${PROJ1}, '2026-06-01', 100)`,
    );
    const map = await getPersonMonthUtilization({
      orgId: ORG_ID,
      departmentId: DEPT_ID,
      monthRange: { start: '2026-06', end: '2026-06' },
    });
    const low = map.cells.find((c) => c.personId === P_OK && c.monthKey === '2026-06')!;
    const high = map.cells.find((c) => c.personId === P_BOUNDARY && c.monthKey === '2026-06')!;
    expect(low.status).toBe('ok');
    expect(low.utilizationPct).toBe(60);
    expect(high.status).toBe('ok');
    expect(high.utilizationPct).toBe(100);
  });

  it('TC-CP-003: planned=101h with target=100 → over', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${P_OVER}, ${PROJ1}, '2026-06-01', 101)`,
    );
    const map = await getPersonMonthUtilization({
      orgId: ORG_ID,
      departmentId: DEPT_ID,
      monthRange: { start: '2026-06', end: '2026-06' },
    });
    const cell = map.cells.find((c) => c.personId === P_OVER && c.monthKey === '2026-06')!;
    expect(cell.status).toBe('over');
    expect(cell.utilizationPct).toBe(101);
  });

  it('TC-CP-004: targetHours=0 → absent regardless of planned', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${P_ABSENT}, ${PROJ1}, '2026-06-01', 80)`,
    );
    const map = await getPersonMonthUtilization({
      orgId: ORG_ID,
      departmentId: DEPT_ID,
      monthRange: { start: '2026-06', end: '2026-06' },
    });
    const cell = map.cells.find((c) => c.personId === P_ABSENT && c.monthKey === '2026-06')!;
    expect(cell.targetHours).toBe(0);
    expect(cell.status).toBe('absent');
  });
});

describe('getPersonMonthUtilization — D-07 approved-only', () => {
  it('pending proposals do NOT contribute to plannedHours', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${P_OK}, ${PROJ1}, '2026-06-01', 60)`,
    );
    await testDb.execute(
      sql`INSERT INTO allocation_proposals
            (organization_id, person_id, project_id, month, proposed_hours, status, requested_by, target_department_id)
          VALUES
            (${ORG_ID}, ${P_OK}, ${PROJ2}, '2026-06-01', '40', 'proposed', 'pm-tester', ${DEPT_ID})`,
    );
    const map = await getPersonMonthUtilization({
      orgId: ORG_ID,
      departmentId: DEPT_ID,
      monthRange: { start: '2026-06', end: '2026-06' },
    });
    const cell = map.cells.find((c) => c.personId === P_OK && c.monthKey === '2026-06')!;
    expect(cell.plannedHours).toBe(60); // 60, not 100 — proposal ignored
    expect(cell.status).toBe('ok');
  });
});

describe('getPersonMonthUtilization — targetIsDefault fallback', () => {
  it('null target_hours_per_month → 160 default with targetIsDefault=true', async () => {
    const map = await getPersonMonthUtilization({
      orgId: ORG_ID,
      departmentId: DEPT_ID,
      monthRange: { start: '2026-06', end: '2026-06' },
    });
    const cell = map.cells.find((c) => c.personId === P_FALLBACK && c.monthKey === '2026-06')!;
    expect(cell.targetHours).toBe(160);
    expect(cell.targetIsDefault).toBe(true);
  });
});

describe('getPersonMonthUtilization — dense grid', () => {
  it('zero-fills cells with no allocations across multi-month range', async () => {
    const map = await getPersonMonthUtilization({
      orgId: ORG_ID,
      departmentId: DEPT_ID,
      monthRange: { start: '2026-06', end: '2026-08' },
    });
    // 6 people × 3 months = 18 cells
    expect(map.cells).toHaveLength(18);
    expect(map.people).toHaveLength(6);
    const sample = map.cells.find((c) => c.personId === P_OK && c.monthKey === '2026-07')!;
    expect(sample.plannedHours).toBe(0);
  });
});

describe('getCapacityBreakdown — sorted by hours desc', () => {
  it('returns rows sorted by hours descending for a single (person, month)', async () => {
    await testDb.execute(
      sql`INSERT INTO allocations (organization_id, person_id, project_id, month, hours)
          VALUES (${ORG_ID}, ${P_OK}, ${PROJ1}, '2026-06-01', 20),
                 (${ORG_ID}, ${P_OK}, ${PROJ2}, '2026-06-01', 50),
                 (${ORG_ID}, ${P_OK}, ${PROJ3}, '2026-06-01', 30)`,
    );
    const rows = await getCapacityBreakdown({
      orgId: ORG_ID,
      scope: 'person',
      scopeId: P_OK,
      monthKey: '2026-06',
    });
    expect(rows.map((r) => r.projectId)).toEqual([PROJ2, PROJ3, PROJ1]);
    expect(rows.map((r) => r.hours)).toEqual([50, 30, 20]);
  });
});
