// v5.0 — Phase 43 / Plan 43-01: register.service tests (PGlite).
//
// Task 1 lays down the smoke test that locks in migration 0008
// (change_log_entity ENUM gains 'program'). Task 2 expands this file
// to cover create / update / archive / list / un-archive on every
// register entity.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql, eq } from 'drizzle-orm';

import * as schema from '@/db/schema';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

beforeAll(async () => {
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
    CREATE TABLE IF NOT EXISTS organizations (
      id uuid PRIMARY KEY,
      clerk_org_id text NOT NULL,
      name varchar(100) NOT NULL,
      slug varchar(50) NOT NULL
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS programs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL,
      description varchar(500),
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
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
  await testDb.execute(sql`DELETE FROM programs;`);
});

describe('Phase 43 Task 1 — migration 0008 smoke', () => {
  it('accepts change_log inserts with entity=program', async () => {
    const [program] = await testDb
      .insert(schema.programs)
      .values({ organizationId: ORG_ID, name: 'Smoke Prog' })
      .returning();

    await testDb.insert(schema.changeLog).values({
      organizationId: ORG_ID,
      actorPersonaId: 'admin',
      entity: 'program',
      entityId: program.id,
      action: 'REGISTER_ROW_CREATED',
      previousValue: null,
      newValue: { name: 'Smoke Prog' },
      context: null,
    });

    const rows = await testDb
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.entity, 'program'));
    expect(rows).toHaveLength(1);
    expect(rows[0].entityId).toBe(program.id);
  });
});
