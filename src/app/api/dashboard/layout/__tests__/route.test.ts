/**
 * @vitest-environment node
 *
 * Round 1 audit CONS-P0-07: integration tests for /api/dashboard/layout
 * GET + PUT covering the three sub-fixes:
 *   1. Both methods now wrap auth via `requireRole('viewer')`.
 *   2. dashboardId is validated against `z.enum(['manager', 'project-leader'])`.
 *   3. PUT bumps `version` via `version + 1` instead of hardcoded 1.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import * as schema from '@/db/schema';
import { AuthError, ForbiddenError } from '@/lib/errors';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

type FakeAuth =
  | { kind: 'ok'; orgId: string; userId: string; role: 'viewer' | 'planner' | 'admin' | 'owner' }
  | { kind: 'unauth' }
  | { kind: 'forbidden' };

const fakeAuth: { value: FakeAuth } = {
  value: { kind: 'ok', orgId: '', userId: 'user_test', role: 'viewer' },
};

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => {
    if (fakeAuth.value.kind === 'unauth') throw new AuthError('Not authenticated');
    if (fakeAuth.value.kind === 'forbidden') throw new ForbiddenError('viewer role required');
    return {
      orgId: fakeAuth.value.orgId,
      userId: fakeAuth.value.userId,
      role: fakeAuth.value.role,
    };
  }),
  getTenantId: vi.fn(async () => {
    if (fakeAuth.value.kind === 'unauth') throw new AuthError('Not authenticated');
    if (fakeAuth.value.kind === 'forbidden') throw new ForbiddenError('forbidden');
    return fakeAuth.value.orgId;
  }),
}));

// Stub flag service so GET's tier-4 path doesn't need a real DB row.
vi.mock('@/features/flags/flag.service', () => ({
  getOrgFlags: vi.fn(async () => ({
    dashboards: false,
    pdfExport: false,
    alerts: false,
    onboarding: false,
    scenarios: false,
    uiV6Landing: false,
    uiV6LeanTrim: false,
    uiV6PerJourney: false,
    uiV6Polish: false,
  })),
}));

vi.mock('@/features/dashboard/widget-registry', () => ({
  getWidget: vi.fn(() => undefined), // empty registry → server-side passthrough branch
}));

vi.mock('@/features/dashboard/default-layouts', () => ({
  getDefaultLayout: vi.fn(() => []),
}));

const { GET, PUT } = await import('../route');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = 'user_test';

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE organizations (id uuid PRIMARY KEY, name varchar(100) NOT NULL);
    CREATE TABLE dashboard_layouts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      clerk_user_id text NOT NULL DEFAULT '__tenant_default__',
      dashboard_id text NOT NULL,
      device_class text NOT NULL DEFAULT 'desktop',
      layout jsonb NOT NULL,
      version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (organization_id, clerk_user_id, dashboard_id, device_class)
    );
  `);
  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_ID}, 'Test')`);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM dashboard_layouts`);
  fakeAuth.value = { kind: 'ok', orgId: ORG_ID, userId: USER_ID, role: 'viewer' };
});

function makeReq(qs = '') {
  return new NextRequest(`http://localhost/api/dashboard/layout${qs ? '?' + qs : ''}`);
}

function makePutReq(body: unknown) {
  return new NextRequest('http://localhost/api/dashboard/layout', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/dashboard/layout (CONS-P0-07)', () => {
  it('400 on invalid dashboardId (typo)', async () => {
    const res = await GET(makeReq('dashboardId=managr'));
    expect(res.status).toBe(400);
  });

  it('200 with valid dashboardId=manager', async () => {
    const res = await GET(makeReq('dashboardId=manager'));
    expect(res.status).toBe(200);
  });

  it('200 with valid dashboardId=project-leader', async () => {
    const res = await GET(makeReq('dashboardId=project-leader'));
    expect(res.status).toBe(200);
  });

  it('401 when requireRole throws AuthError', async () => {
    fakeAuth.value = { kind: 'unauth' };
    const res = await GET(makeReq('dashboardId=manager'));
    expect(res.status).toBe(401);
  });

  it('403 when requireRole throws ForbiddenError (no role)', async () => {
    fakeAuth.value = { kind: 'forbidden' };
    const res = await GET(makeReq('dashboardId=manager'));
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/dashboard/layout (CONS-P0-07)', () => {
  it('400 on invalid dashboardId', async () => {
    const res = await PUT(
      makePutReq({
        dashboardId: 'unknown-dashboard',
        deviceClass: 'desktop',
        widgets: [],
      }),
    );
    expect(res.status).toBe(400);
  });

  it('200 on first write — version starts at 1', async () => {
    const res = await PUT(
      makePutReq({
        dashboardId: 'manager',
        deviceClass: 'desktop',
        widgets: [],
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { layout: { version: number } };
    expect(body.layout.version).toBe(1);
  });

  it('bumps version on update (1 → 2 → 3)', async () => {
    // Initial insert (version=1)
    await PUT(makePutReq({ dashboardId: 'manager', deviceClass: 'desktop', widgets: [] }));

    // Second PUT — should bump to 2
    const res2 = await PUT(
      makePutReq({ dashboardId: 'manager', deviceClass: 'desktop', widgets: [] }),
    );
    expect(res2.status).toBe(200);
    const body2 = (await res2.json()) as { layout: { version: number } };
    expect(body2.layout.version).toBe(2);

    // Third PUT — should bump to 3
    const res3 = await PUT(
      makePutReq({ dashboardId: 'manager', deviceClass: 'desktop', widgets: [] }),
    );
    expect(res3.status).toBe(200);
    const body3 = (await res3.json()) as { layout: { version: number } };
    expect(body3.layout.version).toBe(3);
  });

  it('401 when requireRole throws AuthError', async () => {
    fakeAuth.value = { kind: 'unauth' };
    const res = await PUT(
      makePutReq({ dashboardId: 'manager', deviceClass: 'desktop', widgets: [] }),
    );
    expect(res.status).toBe(401);
  });

  it('403 when requireRole throws ForbiddenError', async () => {
    fakeAuth.value = { kind: 'forbidden' };
    const res = await PUT(
      makePutReq({ dashboardId: 'manager', deviceClass: 'desktop', widgets: [] }),
    );
    expect(res.status).toBe(403);
  });
});
