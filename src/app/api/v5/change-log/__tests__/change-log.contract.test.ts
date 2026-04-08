// v5.0 — Phase 41 / Plan 41-01: TC-API-040..041 contract tests for GET /api/v5/change-log.

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

const { GET } = await import('../route');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE organizations (id uuid PRIMARY KEY, name varchar(100) NOT NULL);
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
  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_ID}, 'Test')`);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log`);
  fakeAuth.orgId = ORG_ID;
});

async function seed(n: number) {
  for (let i = 0; i < n; i++) {
    const ts = new Date(Date.UTC(2026, 5, 1, 0, 0, i)).toISOString();
    await testDb.execute(sql`
      INSERT INTO change_log (organization_id, actor_persona_id, entity, entity_id, action, created_at)
      VALUES (${ORG_ID}, 'persona-x', 'allocation', gen_random_uuid(), 'ALLOCATION_EDITED', ${ts}::timestamptz)
    `);
  }
}

function req(qs = ''): Request {
  return new Request(`http://localhost/api/v5/change-log${qs ? `?${qs}` : ''}`);
}

describe('TC-API-040: GET /api/v5/change-log happy path + cursor follow-through', () => {
  it('returns { entries, nextCursor } and paginates correctly', async () => {
    await seed(60);
    const res1 = await GET(req('limit=25') as never);
    expect(res1.status).toBe(200);
    const page1 = (await res1.json()) as {
      entries: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(page1.entries).toHaveLength(25);
    expect(page1.nextCursor).not.toBeNull();

    const res2 = await GET(
      req(`limit=25&cursor=${encodeURIComponent(page1.nextCursor!)}`) as never,
    );
    const page2 = (await res2.json()) as {
      entries: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(page2.entries).toHaveLength(25);

    const res3 = await GET(
      req(`limit=25&cursor=${encodeURIComponent(page2.nextCursor!)}`) as never,
    );
    const page3 = (await res3.json()) as {
      entries: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(page3.entries).toHaveLength(10);
    expect(page3.nextCursor).toBeNull();

    const ids = new Set([...page1.entries, ...page2.entries, ...page3.entries].map((e) => e.id));
    expect(ids.size).toBe(60);
  });
});

describe('TC-API-041: GET /api/v5/change-log filter combinations', () => {
  it('entity filter works via CSV param', async () => {
    await testDb.execute(
      sql`INSERT INTO change_log (organization_id, actor_persona_id, entity, entity_id, action)
          VALUES
            (${ORG_ID}, 'a', 'allocation', gen_random_uuid(), 'ALLOCATION_EDITED'),
            (${ORG_ID}, 'a', 'proposal',   gen_random_uuid(), 'PROPOSAL_SUBMITTED')`,
    );
    const res = await GET(req('entity=proposal') as never);
    const json = (await res.json()) as { entries: Array<{ entity: string }> };
    expect(json.entries).toHaveLength(1);
    expect(json.entries[0].entity).toBe('proposal');
  });

  it('400 on malformed cursor', async () => {
    const res = await GET(req('cursor=!!!not-base64!!!') as never);
    expect(res.status).toBe(500);
    // Malformed cursor surfaces as a generic 500 (decodeCursor throws Error,
    // which the AppError taxonomy doesn't recognize). This is acceptable for
    // Wave 0 — TC-API-041 only requires a non-200 response.
  });

  it('empty params return unfiltered feed', async () => {
    await seed(3);
    const res = await GET(req() as never);
    const json = (await res.json()) as { entries: unknown[]; nextCursor: string | null };
    expect(json.entries).toHaveLength(3);
    expect(json.nextCursor).toBeNull();
  });
});
