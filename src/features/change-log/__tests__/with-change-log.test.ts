// v5.0 — §15.3 TC-CL-005: withChangeLog decorator helper tests.

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

const { withChangeLog } = await import('../change-log.service');
const { changeLog } = schema;

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ENTITY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

beforeAll(async () => {
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id uuid PRIMARY KEY,
      clerk_org_id text NOT NULL,
      name varchar(100) NOT NULL,
      slug varchar(50) NOT NULL
    );
  `);
  await testDb.execute(sql`
    DO $$ BEGIN
      CREATE TYPE change_log_entity AS ENUM (
        'allocation','proposal','actual_entry','person','project',
        'department','discipline','import_batch','program'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await testDb.execute(sql`
    DO $$ BEGIN
      CREATE TYPE change_log_action AS ENUM (
        'ALLOCATION_EDITED','ALLOCATION_HISTORIC_EDITED','ALLOCATION_BULK_COPIED',
        'PROPOSAL_SUBMITTED','PROPOSAL_APPROVED','PROPOSAL_REJECTED',
        'PROPOSAL_WITHDRAWN','PROPOSAL_EDITED',
        'ACTUALS_BATCH_COMMITTED','ACTUALS_BATCH_ROLLED_BACK',
        'REGISTER_ROW_CREATED','REGISTER_ROW_UPDATED','REGISTER_ROW_DELETED',
        'ACTUAL_UPSERTED'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS change_log (
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
  await testDb.execute(sql`
    INSERT INTO organizations (id, clerk_org_id, name, slug)
    VALUES (${ORG_ID}, 'clerk_test', 'Test Org', 'test-org')
    ON CONFLICT DO NOTHING;
  `);
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log;`);
});

describe('TC-CL-005: withChangeLog decorator helper', () => {
  it('executes fn and writes change_log entry on success', async () => {
    const result = await withChangeLog(
      'ALLOCATION_EDITED',
      {
        orgId: ORG_ID,
        actorPersonaId: 'admin',
        entity: 'allocation',
        entityId: ENTITY_ID,
      },
      async () => ({
        result: { updated: true },
        previousValue: { hours: 10 },
        newValue: { hours: 20 },
      }),
    );

    expect(result).toEqual({ updated: true });

    const rows = await testDb.select().from(changeLog);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('ALLOCATION_EDITED');
    expect(rows[0].previousValue).toEqual({ hours: 10 });
    expect(rows[0].newValue).toEqual({ hours: 20 });
  });

  it('rolls back both fn work and change_log when fn throws', async () => {
    await expect(
      withChangeLog(
        'ALLOCATION_EDITED',
        {
          orgId: ORG_ID,
          actorPersonaId: 'admin',
          entity: 'allocation',
          entityId: ENTITY_ID,
        },
        async () => {
          throw new Error('service failure');
        },
      ),
    ).rejects.toThrow('service failure');

    const rows = await testDb.select().from(changeLog);
    expect(rows).toHaveLength(0);
  });

  it('passes context through to the change_log entry', async () => {
    await withChangeLog(
      'PROPOSAL_SUBMITTED',
      {
        orgId: ORG_ID,
        actorPersonaId: 'pm-user',
        entity: 'proposal',
        entityId: ENTITY_ID,
        context: { monthKey: '2026-07', reason: 'quarterly review' },
      },
      async () => ({
        result: 'ok',
        newValue: { hours: 40 },
      }),
    );

    const rows = await testDb.select().from(changeLog);
    expect(rows).toHaveLength(1);
    expect(rows[0].context).toEqual({ monthKey: '2026-07', reason: 'quarterly review' });
    expect(rows[0].entity).toBe('proposal');
  });

  it('returns the result from fn', async () => {
    const result = await withChangeLog(
      'REGISTER_ROW_CREATED',
      {
        orgId: ORG_ID,
        actorPersonaId: 'admin',
        entity: 'person',
        entityId: ENTITY_ID,
      },
      async () => ({
        result: { id: ENTITY_ID, name: 'New Person' },
      }),
    );

    expect(result).toEqual({ id: ENTITY_ID, name: 'New Person' });
  });
});
