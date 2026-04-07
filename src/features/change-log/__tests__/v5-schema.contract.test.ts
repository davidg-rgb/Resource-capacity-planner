// v5.0 — Phase 36: schema contract test for TC-DB-001..010.
//
// Uses the same pglite harness Phase 35 established. We do NOT try to replay
// 0000-0002 because those predate pglite-compatible neon-http specifics; we
// stub the prerequisite tables that 0004 actually references (organizations,
// people, projects, departments, import_sessions, allocations, change_log),
// then execute the real 0004_slippery_epoch.sql verbatim and assert the
// resulting shape via information_schema / pg_enum / pg_indexes.

import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pg = new PGlite();

async function exec(sqlText: string) {
  const stmts = sqlText
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of stmts) {
    await pg.exec(stmt);
  }
}

beforeAll(async () => {
  // --- Prerequisite tables (minimal columns needed for 0004 FK targets). ---
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
      last_name varchar(100) NOT NULL
    );
    CREATE TYPE project_status AS ENUM ('active','planned','archived');
    CREATE TABLE projects (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL,
      status project_status NOT NULL DEFAULT 'active'
    );
    CREATE TABLE allocations (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      month date NOT NULL,
      hours integer NOT NULL,
      CONSTRAINT allocations_org_person_project_month_uniq
        UNIQUE (organization_id, person_id, project_id, month)
    );
    CREATE TYPE import_status AS ENUM ('parsing','mapped','validated','importing','completed','failed');
    CREATE TABLE import_sessions (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      user_id text NOT NULL,
      file_name text NOT NULL,
      status import_status NOT NULL,
      row_count integer NOT NULL,
      expires_at timestamptz NOT NULL
    );
    CREATE TYPE change_log_entity AS ENUM (
      'allocation','proposal','actual_entry','person','project',
      'department','discipline','import_batch'
    );
    CREATE TYPE change_log_action AS ENUM (
      'ALLOCATION_EDITED','ALLOCATION_HISTORIC_EDITED','ALLOCATION_BULK_COPIED',
      'PROPOSAL_SUBMITTED','PROPOSAL_APPROVED','PROPOSAL_REJECTED',
      'PROPOSAL_WITHDRAWN','PROPOSAL_EDITED',
      'ACTUALS_BATCH_COMMITTED','ACTUALS_BATCH_ROLLED_BACK',
      'REGISTER_ROW_CREATED','REGISTER_ROW_UPDATED','REGISTER_ROW_DELETED'
    );
    CREATE TABLE change_log (
      id uuid PRIMARY KEY,
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

  // --- Apply the real 0004 migration file verbatim. ---
  const migrationPath = join(process.cwd(), 'drizzle/migrations/0004_slippery_epoch.sql');
  const sqlText = readFileSync(migrationPath, 'utf8');
  await exec(sqlText);
});

describe('v5.0 schema contract (TC-DB-001..010)', () => {
  it('TC-DB-001: allocation_proposals table exists with expected columns', async () => {
    const { rows } = await pg.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'allocation_proposals' ORDER BY ordinal_position`,
    );
    const cols = rows.map((r) => r.column_name);
    const expected = [
      'id',
      'organization_id',
      'person_id',
      'project_id',
      'month',
      'proposed_hours',
      'note',
      'status',
      'rejection_reason',
      'requested_by',
      'decided_by',
      'decided_at',
      'parent_proposal_id',
      'target_department_id',
      'created_at',
      'updated_at',
    ];
    for (const c of expected) expect(cols).toContain(c);
  });

  it('TC-DB-002: projects.lead_pm_person_id column + partial index + v4 unique index preserved', async () => {
    const { rows: colRows } = await pg.query<{
      data_type: string;
      is_nullable: string;
    }>(
      `SELECT data_type, is_nullable FROM information_schema.columns
       WHERE table_name='projects' AND column_name='lead_pm_person_id'`,
    );
    expect(colRows.length).toBe(1);
    expect(colRows[0].data_type).toBe('uuid');
    expect(colRows[0].is_nullable).toBe('YES');

    const { rows: idxRows } = await pg.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename='projects' AND indexname='projects_lead_pm_idx'`,
    );
    expect(idxRows.length).toBe(1);

    const { rows: uniqRows } = await pg.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conname='allocations_org_person_project_month_uniq'`,
    );
    expect(uniqRows.length).toBe(1);
  });

  it('TC-DB-003: actuals unique index on (org, person, project, date)', async () => {
    const { rows } = await pg.query<{ conname: string; def: string }>(
      `SELECT conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint WHERE conname='actuals_org_person_project_date_uniq'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].def).toMatch(/UNIQUE.*organization_id.*person_id.*project_id.*date/);
  });

  it('TC-DB-004: actual_entries.hours is numeric(5,2)', async () => {
    const { rows } = await pg.query<{
      data_type: string;
      numeric_precision: number;
      numeric_scale: number;
    }>(
      `SELECT data_type, numeric_precision, numeric_scale
       FROM information_schema.columns
       WHERE table_name='actual_entries' AND column_name='hours'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].data_type).toBe('numeric');
    expect(rows[0].numeric_precision).toBe(5);
    expect(rows[0].numeric_scale).toBe(2);
  });

  it('TC-DB-006: import_batches.reversal_payload jsonb nullable', async () => {
    const { rows } = await pg.query<{ data_type: string; is_nullable: string }>(
      `SELECT data_type, is_nullable FROM information_schema.columns
       WHERE table_name='import_batches' AND column_name='reversal_payload'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].data_type).toBe('jsonb');
    expect(rows[0].is_nullable).toBe('YES');
  });

  it('TC-DB-007: allocation_proposals FKs to people, projects, organizations, departments', async () => {
    const { rows } = await pg.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint
       WHERE conrelid='allocation_proposals'::regclass AND contype='f'`,
    );
    const names = rows.map((r) => r.conname).join(' ');
    expect(names).toMatch(/people/);
    expect(names).toMatch(/projects/);
    expect(names).toMatch(/organizations/);
    expect(names).toMatch(/departments/);
  });

  it('TC-DB-008: proposal_status and actual_source enums have exact values', async () => {
    const { rows: ps } = await pg.query<{ enumlabel: string }>(
      `SELECT enumlabel FROM pg_enum e
       JOIN pg_type t ON e.enumtypid=t.oid
       WHERE t.typname='proposal_status' ORDER BY e.enumsortorder`,
    );
    expect(ps.map((r) => r.enumlabel)).toEqual([
      'proposed',
      'approved',
      'rejected',
      'withdrawn',
      'superseded',
    ]);

    const { rows: as_ } = await pg.query<{ enumlabel: string }>(
      `SELECT enumlabel FROM pg_enum e
       JOIN pg_type t ON e.enumtypid=t.oid
       WHERE t.typname='actual_source' ORDER BY e.enumsortorder`,
    );
    expect(as_.map((r) => r.enumlabel)).toEqual(['import', 'manual']);
  });

  it('TC-DB-010: Phase 35 change_log table is still intact', async () => {
    const { rows } = await pg.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='change_log'`,
    );
    const cols = rows.map((r) => r.column_name);
    expect(cols.length).toBeGreaterThanOrEqual(9);
    for (const c of [
      'id',
      'organization_id',
      'actor_persona_id',
      'entity',
      'entity_id',
      'action',
      'previous_value',
      'new_value',
      'context',
      'created_at',
    ]) {
      expect(cols).toContain(c);
    }
  });
});
