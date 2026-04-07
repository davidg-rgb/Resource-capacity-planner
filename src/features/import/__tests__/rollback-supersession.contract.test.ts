// v5.0 — Phase 38 / Plan 38-02: rollback + supersession contract tests.
// Covers TC-AC-012..017 incl. the chained reversal payload anti-corruption case.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql, eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import * as schema from '@/db/schema';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const { parseAndStageActuals, commitActualsBatch, rollbackBatch } =
  await import('../actuals-import.service');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_ID = 'b1111111-1111-4111-8111-111111111111';
const PROJECT_ID = 'c1111111-1111-4111-8111-111111111111';
const DEPT_ID = 'd1111111-1111-4111-8111-111111111111';
const DISC_ID = 'e1111111-1111-4111-8111-111111111111';

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE organizations (id uuid PRIMARY KEY, name varchar(100) NOT NULL);
    CREATE TABLE departments (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(100) NOT NULL
    );
    CREATE TABLE disciplines (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(50) NOT NULL,
      abbreviation varchar(10) NOT NULL
    );
    CREATE TABLE people (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      first_name varchar(100) NOT NULL,
      last_name varchar(100) NOT NULL,
      discipline_id uuid NOT NULL REFERENCES disciplines(id),
      department_id uuid NOT NULL REFERENCES departments(id),
      target_hours_per_month integer NOT NULL DEFAULT 160
    );
    CREATE TABLE projects (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL
    );
    CREATE TYPE actual_source AS ENUM ('import','manual');
    CREATE TYPE import_status AS ENUM ('uploaded','mapped','validated','staged','committed','failed');
    CREATE TABLE import_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      user_id text NOT NULL,
      file_name text NOT NULL,
      status import_status NOT NULL,
      row_count integer NOT NULL,
      parsed_data jsonb,
      mappings jsonb,
      validation_result jsonb,
      import_result jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );
    CREATE TABLE import_batches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      import_session_id uuid NOT NULL REFERENCES import_sessions(id),
      file_name text NOT NULL,
      committed_by text NOT NULL,
      committed_at timestamptz NOT NULL DEFAULT now(),
      override_manual_edits boolean NOT NULL,
      rows_inserted integer NOT NULL,
      rows_updated integer NOT NULL,
      rows_skipped_manual integer NOT NULL,
      rows_skipped_prior_batch integer NOT NULL DEFAULT 0,
      reversal_payload jsonb,
      rolled_back_at timestamptz,
      rolled_back_by text,
      superseded_at timestamptz,
      superseded_by_batch_id uuid
    );
    CREATE TABLE actual_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      date date NOT NULL,
      hours numeric(5,2) NOT NULL,
      source actual_source NOT NULL,
      import_batch_id uuid REFERENCES import_batches(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT actuals_org_person_project_date_uniq
        UNIQUE (organization_id, person_id, project_id, date)
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

  await testDb.execute(sql`INSERT INTO organizations (id, name) VALUES (${ORG_ID}, 'Test Org')`);
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES (${DEPT_ID}, ${ORG_ID}, 'Eng')`,
  );
  await testDb.execute(
    sql`INSERT INTO disciplines (id, organization_id, name, abbreviation)
        VALUES (${DISC_ID}, ${ORG_ID}, 'Mech', 'MEC')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, first_name, last_name, discipline_id, department_id)
        VALUES (${PERSON_ID}, ${ORG_ID}, 'Anna', 'Tester', ${DISC_ID}, ${DEPT_ID})`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name) VALUES (${PROJECT_ID}, ${ORG_ID}, 'Atlas')`,
  );
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log`);
  await testDb.execute(sql`DELETE FROM actual_entries`);
  await testDb.execute(sql`DELETE FROM import_batches`);
  await testDb.execute(sql`DELETE FROM import_sessions`);
});

function buildXlsx(rows: Array<[string, string, string, number]>): ArrayBuffer {
  const aoa: unknown[][] = [['person_name', 'project_name', 'date', 'hours'], ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Utfall');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

async function stage(rows: Array<[string, string, string, number]>): Promise<string> {
  const buffer = buildXlsx(rows);
  const result = await parseAndStageActuals({
    orgId: ORG_ID,
    fileBuffer: buffer,
    fileName: 'test.xlsx',
    userId: 'user-1',
  });
  return result.sessionId;
}

const baseCommit = {
  orgId: ORG_ID,
  overrideManualEdits: false,
  overrideUnrolledImports: false,
  actorPersonaId: 'pm-anna',
  committedBy: 'user-1',
};
const baseRollback = {
  orgId: ORG_ID,
  actorPersonaId: 'pm-anna',
  rolledBackBy: 'user-1',
};

describe('TC-AC-012: rollback within 24h restores prior values (DELETE for new rows)', () => {
  it('deletes rows that were new in the batch', async () => {
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-12', 8]]);
    const commit = await commitActualsBatch({ ...baseCommit, sessionId });
    expect(commit.rowsInserted).toBe(1);

    const rollback = await rollbackBatch({ ...baseRollback, batchId: commit.batchId });
    expect(rollback.rowsDeleted).toBe(1);
    expect(rollback.rowsRestored).toBe(0);

    const remaining = await testDb
      .select()
      .from(schema.actualEntries)
      .where(eq(schema.actualEntries.organizationId, ORG_ID));
    expect(remaining).toHaveLength(0);

    // change_log: 1 commit + 1 rollback = 2 rows
    const r = await testDb.execute(sql`SELECT count(*)::int AS c FROM change_log`);
    expect((r.rows[0] as { c: number }).c).toBe(2);
  });
});

describe('TC-AC-013: rollback restores prior hours when row pre-existed (UPDATE path)', () => {
  it('restores manual prior values', async () => {
    // Pre-seed an import row that the batch will overwrite (not manual, so no
    // skip), so rollback restores the seeded values.
    await testDb.execute(
      sql`INSERT INTO actual_entries (organization_id, person_id, project_id, date, hours, source)
          VALUES (${ORG_ID}, ${PERSON_ID}, ${PROJECT_ID}, '2026-06-13', '4.00', 'import')`,
    );
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-13', 8]]);
    const commit = await commitActualsBatch({ ...baseCommit, sessionId });
    expect(commit.rowsUpdated).toBe(1);

    await rollbackBatch({ ...baseRollback, batchId: commit.batchId });

    const [row] = await testDb
      .select()
      .from(schema.actualEntries)
      .where(eq(schema.actualEntries.organizationId, ORG_ID));
    expect(row.hours).toBe('4.00');
    expect(row.source).toBe('import');
  });
});

describe('TC-AC-014: rollback after 24h returns ROLLBACK_WINDOW_EXPIRED', () => {
  it('refuses with the expired error code', async () => {
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-14', 8]]);
    const commit = await commitActualsBatch({ ...baseCommit, sessionId });
    // Age the batch out of the window.
    await testDb.execute(
      sql`UPDATE import_batches SET committed_at = NOW() - INTERVAL '48 hours' WHERE id = ${commit.batchId}`,
    );
    await expect(rollbackBatch({ ...baseRollback, batchId: commit.batchId })).rejects.toThrow(
      /window.*expired/i,
    );
  });
});

describe('TC-AC-015: double rollback returns BATCH_ALREADY_ROLLED_BACK', () => {
  it('refuses the second rollback', async () => {
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-15', 8]]);
    const commit = await commitActualsBatch({ ...baseCommit, sessionId });
    await rollbackBatch({ ...baseRollback, batchId: commit.batchId });
    await expect(rollbackBatch({ ...baseRollback, batchId: commit.batchId })).rejects.toThrow(
      /already been rolled back/i,
    );
  });
});

describe('TC-AC-016: second commit on overlapping rows is refused without override', () => {
  it('throws PRIOR_BATCH_ACTIVE', async () => {
    const s1 = await stage([['Anna Tester', 'Atlas', '2026-06-16', 8]]);
    await commitActualsBatch({ ...baseCommit, sessionId: s1 });
    const s2 = await stage([['Anna Tester', 'Atlas', '2026-06-16', 9]]);
    await expect(commitActualsBatch({ ...baseCommit, sessionId: s2 })).rejects.toThrow(
      /prior import batch/i,
    );
  });
});

describe('TC-AC-017: supersession + chained reversal_payload', () => {
  it('overrideUnrolledImports=true supersedes A; rolling back B restores PRE-A state', async () => {
    // Pre-seed an import row representing the "pre-A" state.
    await testDb.execute(
      sql`INSERT INTO actual_entries (organization_id, person_id, project_id, date, hours, source)
          VALUES (${ORG_ID}, ${PERSON_ID}, ${PROJECT_ID}, '2026-06-17', '2.00', 'import')`,
    );

    // Batch A overwrites pre-A (4h).
    const sA = await stage([['Anna Tester', 'Atlas', '2026-06-17', 4]]);
    const a = await commitActualsBatch({ ...baseCommit, sessionId: sA });

    // Batch B with override supersedes A (8h).
    const sB = await stage([['Anna Tester', 'Atlas', '2026-06-17', 8]]);
    const b = await commitActualsBatch({
      ...baseCommit,
      sessionId: sB,
      overrideUnrolledImports: true,
    });

    // A is now superseded — direct rollback of A is refused.
    await expect(rollbackBatch({ ...baseRollback, batchId: a.batchId })).rejects.toThrow(
      /superseded|window.*expired/i,
    );

    // Rolling back B should restore PRE-A state (hours='2.00').
    await rollbackBatch({ ...baseRollback, batchId: b.batchId });
    const [row] = await testDb
      .select()
      .from(schema.actualEntries)
      .where(eq(schema.actualEntries.organizationId, ORG_ID));
    expect(row.hours).toBe('2.00');
  });
});
