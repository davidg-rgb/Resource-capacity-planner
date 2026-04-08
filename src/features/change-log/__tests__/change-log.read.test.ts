// v5.0 — Phase 41 / Plan 41-01: PGlite tests for change-log.read.getFeed.
// TC-API-040 (basic pagination) + TC-API-041 (filters) + composite-cursor
// equal-timestamp safety + JSONB projectId filter.

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

const { getFeed, encodeCursor, decodeCursor } = await import('../change-log.read');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_OTHER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab';
const PROJECT_X = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const PROJECT_Y = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2';

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
  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_OTHER}, 'Other')`);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log`);
});

async function insertEntry(opts: {
  org?: string;
  createdAt?: string;
  entity?: string;
  action?: string;
  actor?: string;
  context?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  const created = opts.createdAt ?? new Date().toISOString();
  await testDb.execute(sql`
    INSERT INTO change_log
      (organization_id, actor_persona_id, entity, entity_id, action, previous_value, new_value, context, created_at)
    VALUES (
      ${opts.org ?? ORG_ID},
      ${opts.actor ?? 'persona-x'},
      ${(opts.entity ?? 'allocation') as string}::change_log_entity,
      gen_random_uuid(),
      ${(opts.action ?? 'ALLOCATION_EDITED') as string}::change_log_action,
      NULL,
      ${opts.newValue ? JSON.stringify(opts.newValue) : null}::jsonb,
      ${opts.context ? JSON.stringify(opts.context) : null}::jsonb,
      ${created}::timestamptz
    )
  `);
}

describe('cursor codec', () => {
  it('round-trips composite cursor', () => {
    const cur = {
      createdAt: '2026-06-01T00:00:00.000Z',
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    };
    expect(decodeCursor(encodeCursor(cur))).toEqual(cur);
  });

  it('rejects malformed cursor', () => {
    expect(() => decodeCursor('!!not-base64!!')).toThrow(/invalid cursor/);
  });
});

describe('TC-API-040: getFeed cursor pagination', () => {
  it('paginates 120 rows in 3 pages of 50/50/20 with stable cursor', async () => {
    // Insert 120 rows with monotonically increasing timestamps so order is deterministic.
    for (let i = 0; i < 120; i++) {
      const ts = new Date(Date.UTC(2026, 5, 1, 0, 0, i)).toISOString();
      await insertEntry({ createdAt: ts });
    }

    const page1 = await getFeed({ orgId: ORG_ID, filter: {}, pagination: { limit: 50 } });
    expect(page1.entries).toHaveLength(50);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await getFeed({
      orgId: ORG_ID,
      filter: {},
      pagination: { limit: 50, cursor: page1.nextCursor },
    });
    expect(page2.entries).toHaveLength(50);
    expect(page2.nextCursor).not.toBeNull();

    const page3 = await getFeed({
      orgId: ORG_ID,
      filter: {},
      pagination: { limit: 50, cursor: page2.nextCursor },
    });
    expect(page3.entries).toHaveLength(20);
    expect(page3.nextCursor).toBeNull();

    // No row appears twice across pages.
    const allIds = [...page1.entries, ...page2.entries, ...page3.entries].map((e) => e.id);
    expect(new Set(allIds).size).toBe(120);
  });

  it('clamps requested limit=500 to 200', async () => {
    for (let i = 0; i < 250; i++) {
      const ts = new Date(Date.UTC(2026, 5, 1, 0, 0, i)).toISOString();
      await insertEntry({ createdAt: ts });
    }
    const page = await getFeed({ orgId: ORG_ID, filter: {}, pagination: { limit: 500 } });
    expect(page.entries).toHaveLength(200);
  });

  it('Pitfall 5: 3 rows with identical createdAt are all returned across cursor follow-through', async () => {
    const sameTs = '2026-06-01T12:00:00.000Z';
    for (let i = 0; i < 3; i++) await insertEntry({ createdAt: sameTs });
    // Pick limit=2 so we MUST cursor through equal-timestamp rows.
    const p1 = await getFeed({ orgId: ORG_ID, filter: {}, pagination: { limit: 2 } });
    expect(p1.entries).toHaveLength(2);
    expect(p1.nextCursor).not.toBeNull();
    const p2 = await getFeed({
      orgId: ORG_ID,
      filter: {},
      pagination: { limit: 2, cursor: p1.nextCursor },
    });
    expect(p2.entries).toHaveLength(1);
    const ids = new Set([...p1.entries, ...p2.entries].map((e) => e.id));
    expect(ids.size).toBe(3);
  });
});

describe('TC-API-041: getFeed filters', () => {
  it('entity filter narrows results', async () => {
    await insertEntry({ entity: 'allocation', action: 'ALLOCATION_EDITED' });
    await insertEntry({ entity: 'proposal', action: 'PROPOSAL_SUBMITTED' });
    await insertEntry({ entity: 'proposal', action: 'PROPOSAL_APPROVED' });

    const page = await getFeed({
      orgId: ORG_ID,
      filter: { entity: ['proposal'] },
      pagination: {},
    });
    expect(page.entries).toHaveLength(2);
    expect(page.entries.every((e) => e.entity === 'proposal')).toBe(true);
  });

  it('action + actor filters compose', async () => {
    await insertEntry({ action: 'ALLOCATION_EDITED', actor: 'pm-anna' });
    await insertEntry({ action: 'ALLOCATION_EDITED', actor: 'pm-bob' });
    await insertEntry({ action: 'PROPOSAL_APPROVED', actor: 'pm-anna' });

    const page = await getFeed({
      orgId: ORG_ID,
      filter: { actions: ['ALLOCATION_EDITED'], actorPersonaIds: ['pm-anna'] },
      pagination: {},
    });
    expect(page.entries).toHaveLength(1);
    expect(page.entries[0].action).toBe('ALLOCATION_EDITED');
    expect(page.entries[0].actorPersonaId).toBe('pm-anna');
  });

  it('dateRange filter excludes outside-range entries', async () => {
    await insertEntry({ createdAt: '2026-05-15T00:00:00.000Z' });
    await insertEntry({ createdAt: '2026-06-15T00:00:00.000Z' });
    await insertEntry({ createdAt: '2026-07-15T00:00:00.000Z' });

    const page = await getFeed({
      orgId: ORG_ID,
      filter: {
        dateRange: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-30T23:59:59.000Z' },
      },
      pagination: {},
    });
    expect(page.entries).toHaveLength(1);
  });

  it('JSONB context.projectId filter matches and excludes', async () => {
    await insertEntry({ context: { projectId: PROJECT_X } });
    await insertEntry({ context: { projectId: PROJECT_Y } });
    await insertEntry({ newValue: { projectId: PROJECT_X } });

    const page = await getFeed({
      orgId: ORG_ID,
      filter: { projectIds: [PROJECT_X] },
      pagination: {},
    });
    expect(page.entries).toHaveLength(2); // context match + new_value match
  });

  it('orgId scope: never leaks rows from other orgs', async () => {
    await insertEntry({ org: ORG_OTHER });
    await insertEntry({ org: ORG_ID });
    const page = await getFeed({ orgId: ORG_ID, filter: {}, pagination: {} });
    expect(page.entries).toHaveLength(1);
    expect(page.entries[0].organizationId).toBe(ORG_ID);
  });

  it('empty filter returns full unfiltered feed', async () => {
    for (let i = 0; i < 5; i++) {
      const ts = new Date(Date.UTC(2026, 5, 1, 0, 0, i)).toISOString();
      await insertEntry({ createdAt: ts });
    }
    const page = await getFeed({ orgId: ORG_ID, filter: {}, pagination: {} });
    expect(page.entries).toHaveLength(5);
    expect(page.nextCursor).toBeNull();
  });
});
