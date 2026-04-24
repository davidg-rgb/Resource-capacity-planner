// v6.0 — Phase 53 / REVIEW-FIX WR-01: contract tests for /api/test/flags.
//
// Mirrors the gates of /api/test/seed: production-throw, runtime 404 when
// E2E_SEED_ENABLED is not '1', Zod validation on body shape. The happy-path
// upsert is exercised against a PGlite DB seeded with the E2E org +
// platform-admin rows whose IDs must match the production route.

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { v5 as uuidv5 } from 'uuid';

import * as schema from '@/db/schema';
import { FIXTURE_NS } from '../../../../../../tests/fixtures/namespace';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

// Must match the IDs computed inside route.ts.
const E2E_ORG_ID = uuidv5('seed:e2e:organization', FIXTURE_NS);
const E2E_PLATFORM_ADMIN_ID = uuidv5('seed:e2e:platform_admin', FIXTURE_NS);

const ORIGINAL_ENV = { ...process.env };

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE organizations (
      id uuid PRIMARY KEY,
      name varchar(100) NOT NULL
    );
    CREATE TABLE platform_admins (
      id uuid PRIMARY KEY,
      email varchar(255) NOT NULL UNIQUE,
      password_hash text NOT NULL,
      name varchar(100),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE feature_flags (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      flag_name varchar(100) NOT NULL,
      enabled boolean NOT NULL DEFAULT false,
      set_by_admin_id uuid NOT NULL REFERENCES platform_admins(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT feature_flags_org_flag_uniq UNIQUE (organization_id, flag_name)
    );
  `);

  await testDb.execute(
    sql`INSERT INTO organizations (id, name) VALUES (${E2E_ORG_ID}, 'Nordic Capacity E2E')`,
  );
  await testDb.execute(
    sql`INSERT INTO platform_admins (id, email, password_hash, name) VALUES
        (${E2E_PLATFORM_ADMIN_ID}, 'e2e-system@nordic-capacity.test', 'e2e-no-login', 'E2E System')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM feature_flags;`);
  // Default: gates open so happy-path tests don't have to re-set env.
  // Use vi.stubEnv since NODE_ENV is typed readonly in TS 5.x (Node 20 types).
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('E2E_TEST', '1');
  vi.stubEnv('E2E_SEED_ENABLED', '1');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(() => {
  process.env = { ...ORIGINAL_ENV };
});

async function importRoute() {
  vi.resetModules();
  const mod = await import('../route');
  return mod.POST;
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/test/flags', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/test/flags — REVIEW-FIX WR-01 contract', () => {
  it('returns 204 and upserts the flag row on happy path', async () => {
    const POST = await importRoute();
    const res = await POST(makeRequest({ flagName: 'uiV6Polish', enabled: false }) as never);
    expect(res.status).toBe(204);

    const rows = await testDb.execute(
      sql`SELECT flag_name, enabled FROM feature_flags WHERE organization_id = ${E2E_ORG_ID}`,
    );
    expect(rows.rows).toEqual([{ flag_name: 'uiV6Polish', enabled: false }]);
  });

  it('flips an existing row via onConflictDoUpdate', async () => {
    const POST = await importRoute();
    await POST(makeRequest({ flagName: 'uiV6Polish', enabled: true }) as never);
    await POST(makeRequest({ flagName: 'uiV6Polish', enabled: false }) as never);

    const rows = await testDb.execute(
      sql`SELECT flag_name, enabled FROM feature_flags WHERE organization_id = ${E2E_ORG_ID}`,
    );
    expect(rows.rows).toEqual([{ flag_name: 'uiV6Polish', enabled: false }]);
  });

  it('returns 404 when E2E_SEED_ENABLED is not "1"', async () => {
    vi.stubEnv('E2E_SEED_ENABLED', '0');
    const POST = await importRoute();
    const res = await POST(makeRequest({ flagName: 'uiV6Polish', enabled: true }) as never);
    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid body (missing flagName)', async () => {
    const POST = await importRoute();
    const res = await POST(makeRequest({ enabled: true }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 on unknown flagName (not in FLAG_NAMES enum)', async () => {
    const POST = await importRoute();
    const res = await POST(makeRequest({ flagName: 'notARealFlag', enabled: true }) as never);
    expect(res.status).toBe(400);
  });

  it('throws in production when E2E_TEST is not "1"', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('E2E_TEST', '');
    const POST = await importRoute();
    await expect(
      POST(makeRequest({ flagName: 'uiV6Polish', enabled: true }) as never),
    ).rejects.toThrow(/test-only route imported in production build/);
  });

  it('returns 400 seed_required when the platform_admin row is missing (MJ-02)', async () => {
    // Remove the seed row that beforeAll inserted, then call the route.
    await testDb.execute(sql`DELETE FROM platform_admins WHERE id = ${E2E_PLATFORM_ADMIN_ID}`);
    try {
      const POST = await importRoute();
      const res = await POST(makeRequest({ flagName: 'uiV6Polish', enabled: true }) as never);
      expect(res.status).toBe(400);
      const payload = await res.json();
      expect(payload).toEqual({
        error: 'seed_required',
        detail: 'POST /api/test/seed must run before /api/test/flags',
      });
    } finally {
      // Restore the admin row so subsequent tests in the file (run in any
      // order) still have a valid FK target.
      await testDb.execute(
        sql`INSERT INTO platform_admins (id, email, password_hash, name) VALUES
            (${E2E_PLATFORM_ADMIN_ID}, 'e2e-system@nordic-capacity.test', 'e2e-no-login', 'E2E System')`,
      );
    }
  });
});
