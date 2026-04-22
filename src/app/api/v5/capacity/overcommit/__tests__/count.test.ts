// v6.0 — Phase 53 / Plan 53-02 (POLISH-01 / D-01): integration tests for
// GET /api/v5/capacity/overcommit/count.
//
// Mirrors src/app/api/v5/proposals/queue/__tests__/count.test.ts (Phase 52 LM-03).
//
// Covers 5 behaviors (plan <behavior> block):
//   1. 200 happy path — seeded 2 overcommitted people in current month → { count: 2 }
//   2. 200 empty   — zero overcommits → { count: 0 }
//   3. tenant isolation — overcommit seeded for org B; org-A caller → { count: 0 }
//   4. 401 unauth — requireRole throws AuthError → 401
//   5. COUNT DISTINCT — same person overcommitted in months 0 and 2 → count = 1
//
// Authorization note: this endpoint uses `requireRole('planner')` (not 'rd').
// Per ADR-004 personas are UX shortcuts, not security boundaries; Clerk has
// no 'rd' role. Mirrors LM-03 which uses 'planner' for a line-manager surface.
// Documented as plan deviation Rule 3.
//
// The overcommit window is `[currentMonth, currentMonth+3]` (4 months), chosen
// to match the `useAlertCount` convention and the service fn's implementation.
// Tests inject well-known month strings via the `insertAllocation` helper so
// they remain deterministic regardless of "now".

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { AuthError } from '@/lib/errors';
import { getCurrentMonth, generateMonthRange } from '@/lib/date-utils';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

type FakeAuth =
  | { kind: 'ok'; orgId: string; userId: string; role: 'planner' }
  | { kind: 'unauth' };
const fakeAuth: { value: FakeAuth } = {
  value: { kind: 'ok', orgId: '', userId: 'user_test', role: 'planner' },
};
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => {
    if (fakeAuth.value.kind === 'unauth') {
      throw new AuthError('Not authenticated');
    }
    return {
      orgId: fakeAuth.value.orgId,
      userId: fakeAuth.value.userId,
      role: fakeAuth.value.role,
    };
  }),
  getTenantId: vi.fn(async () => {
    if (fakeAuth.value.kind === 'unauth') throw new AuthError('Not authenticated');
    return fakeAuth.value.orgId;
  }),
}));

const { GET: countRoute } = await import('../count/route');

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DEPT_A = 'd1111111-1111-4111-8111-111111111111';
const DEPT_B = 'd3333333-3333-4333-8333-333333333333';
const PERSON_A_X = 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_A_Y = 'aaaa2222-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_A_Z = 'aaaa3333-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_B_X = 'bbbb1111-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_A = 'cccc1111-cccc-4ccc-8ccc-cccccccccccc';
const PROJECT_B = 'cccc2222-cccc-4ccc-8ccc-cccccccccccc';

// Months relative to "now" — computed at test load so the service fn's
// getCurrentMonth() matches what we seed.
const CURRENT = getCurrentMonth();
const [, M1, M2, M3] = generateMonthRange(CURRENT, 4); // [M0=CURRENT, M1, M2, M3]
void M1;
void M3;

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
      last_name varchar(100) NOT NULL,
      target_hours_per_month integer DEFAULT 160
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
  `);

  await testDb.execute(
    sql`INSERT INTO organizations (id, name) VALUES
        (${ORG_A}, 'Org A'),
        (${ORG_B}, 'Org B')`,
  );
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES
        (${DEPT_A}, ${ORG_A}, 'A-Electronics'),
        (${DEPT_B}, ${ORG_B}, 'B-Electronics')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, department_id, first_name, last_name, target_hours_per_month) VALUES
        (${PERSON_A_X}, ${ORG_A}, ${DEPT_A}, 'A', 'X', 160),
        (${PERSON_A_Y}, ${ORG_A}, ${DEPT_A}, 'A', 'Y', 160),
        (${PERSON_A_Z}, ${ORG_A}, ${DEPT_A}, 'A', 'Z', 160),
        (${PERSON_B_X}, ${ORG_B}, ${DEPT_B}, 'B', 'X', 160)`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES
        (${PROJECT_A}, ${ORG_A}, 'Atlas-A'),
        (${PROJECT_B}, ${ORG_B}, 'Atlas-B')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM allocations;`);
  fakeAuth.value = { kind: 'ok', orgId: ORG_A, userId: 'user_test', role: 'planner' };
});

async function insertAllocation(opts: {
  orgId: string;
  personId: string;
  projectId: string;
  monthKey: string; // 'YYYY-MM'
  hours: number;
}) {
  const monthDate = `${opts.monthKey}-01`;
  await testDb.execute(sql`
    INSERT INTO allocations
      (organization_id, person_id, project_id, month, hours)
    VALUES
      (${opts.orgId}, ${opts.personId}, ${opts.projectId}, ${monthDate}, ${opts.hours})
  `);
}

function getRequest(): Request {
  return new Request('http://localhost/api/v5/capacity/overcommit/count', { method: 'GET' });
}

describe('GET /api/v5/capacity/overcommit/count — POLISH-01 / D-01 integration', () => {
  it('200 happy — 2 overcommitted people in current month returns { count: 2 }', async () => {
    // PERSON_A_X overcommitted (200h > 160h target) in current month
    await insertAllocation({
      orgId: ORG_A,
      personId: PERSON_A_X,
      projectId: PROJECT_A,
      monthKey: CURRENT,
      hours: 200,
    });
    // PERSON_A_Y overcommitted (180h > 160h target) in current month
    await insertAllocation({
      orgId: ORG_A,
      personId: PERSON_A_Y,
      projectId: PROJECT_A,
      monthKey: CURRENT,
      hours: 180,
    });
    // PERSON_A_Z NOT overcommitted (100h < 160h target) — excluded
    await insertAllocation({
      orgId: ORG_A,
      personId: PERSON_A_Z,
      projectId: PROJECT_A,
      monthKey: CURRENT,
      hours: 100,
    });

    const res = await countRoute(getRequest() as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(2);
  });

  it('200 empty — zero overcommits returns { count: 0 }', async () => {
    await insertAllocation({
      orgId: ORG_A,
      personId: PERSON_A_X,
      projectId: PROJECT_A,
      monthKey: CURRENT,
      hours: 100, // under capacity
    });

    const res = await countRoute(getRequest() as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(0);
  });

  it('tenant isolation — org A auth, overcommit seeded for org B returns { count: 0 }', async () => {
    await insertAllocation({
      orgId: ORG_B,
      personId: PERSON_B_X,
      projectId: PROJECT_B,
      monthKey: CURRENT,
      hours: 300, // heavily overcommitted in org B
    });

    // Authenticated as org A; org B's overcommit MUST NOT leak.
    fakeAuth.value = { kind: 'ok', orgId: ORG_A, userId: 'user_test', role: 'planner' };
    const res = await countRoute(getRequest() as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(0);
  });

  it('401 unauth — requireRole throws AuthError returns 401', async () => {
    fakeAuth.value = { kind: 'unauth' };
    const res = await countRoute(getRequest() as never);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('ERR_AUTH');
  });

  it('COUNT DISTINCT — same person overcommitted in month 0 AND month 2 counts once', async () => {
    // Same person, two different overcommit months in the 4-month window.
    await insertAllocation({
      orgId: ORG_A,
      personId: PERSON_A_X,
      projectId: PROJECT_A,
      monthKey: CURRENT,
      hours: 200,
    });
    await insertAllocation({
      orgId: ORG_A,
      personId: PERSON_A_X,
      projectId: PROJECT_A,
      monthKey: M2,
      hours: 250,
    });

    const res = await countRoute(getRequest() as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(1); // DISTINCT person_id
  });
});
