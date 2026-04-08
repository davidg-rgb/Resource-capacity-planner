// v5.0 — Phase 43 / Plan 43-01: shared PGlite bootstrap for register tests.
// Each test file gets its own PGlite instance via initRegisterTestDb().

import { sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/pglite';

export const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const ORG_ID_2 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

type DrizzleDb = ReturnType<typeof drizzle>;

export async function initRegisterTestDb(testDb: DrizzleDb): Promise<void> {
  await testDb.execute(sql`
    DO $$ BEGIN
      CREATE TYPE project_status AS ENUM ('active','planned','archived');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await testDb.execute(sql`
    DO $$ BEGIN
      CREATE TYPE proposal_status AS ENUM ('proposed','approved','rejected','withdrawn','superseded');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
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
    CREATE TABLE IF NOT EXISTS organizations (
      id uuid PRIMARY KEY,
      clerk_org_id text NOT NULL,
      name varchar(100) NOT NULL,
      slug varchar(50) NOT NULL
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS departments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(100) NOT NULL,
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS disciplines (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(50) NOT NULL,
      abbreviation varchar(10) NOT NULL,
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
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
    CREATE TABLE IF NOT EXISTS people (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      first_name varchar(100) NOT NULL,
      last_name varchar(100) NOT NULL,
      discipline_id uuid NOT NULL REFERENCES disciplines(id),
      department_id uuid NOT NULL REFERENCES departments(id),
      target_hours_per_month integer NOT NULL DEFAULT 160,
      sort_order integer NOT NULL DEFAULT 0,
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL,
      program_id uuid REFERENCES programs(id),
      status project_status NOT NULL DEFAULT 'active',
      lead_pm_person_id uuid REFERENCES people(id),
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS allocations (
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
  await testDb.execute(sql`
    CREATE TABLE IF NOT EXISTS allocation_proposals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      month date NOT NULL,
      proposed_hours numeric(5,2) NOT NULL,
      note varchar(1000),
      status proposal_status NOT NULL DEFAULT 'proposed',
      rejection_reason varchar(1000),
      requested_by text NOT NULL,
      decided_by text,
      decided_at timestamptz,
      parent_proposal_id uuid,
      target_department_id uuid NOT NULL REFERENCES departments(id),
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
    INSERT INTO organizations (id, clerk_org_id, name, slug) VALUES
      (${ORG_ID}, 'clerk_test', 'Test Org', 'test-org'),
      (${ORG_ID_2}, 'clerk_test_2', 'Test Org 2', 'test-org-2')
    ON CONFLICT DO NOTHING;
  `);
}

export async function resetRegisterTestDb(testDb: DrizzleDb): Promise<void> {
  await testDb.execute(sql`DELETE FROM allocation_proposals;`);
  await testDb.execute(sql`DELETE FROM allocations;`);
  await testDb.execute(sql`DELETE FROM change_log;`);
  await testDb.execute(sql`DELETE FROM projects;`);
  await testDb.execute(sql`DELETE FROM people;`);
  await testDb.execute(sql`DELETE FROM programs;`);
  await testDb.execute(sql`DELETE FROM disciplines;`);
  await testDb.execute(sql`DELETE FROM departments;`);
}

export function nextMonthKey(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}
