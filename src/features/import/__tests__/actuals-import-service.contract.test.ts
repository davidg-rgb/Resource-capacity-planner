// v5.0 — Phase 38 / Plan 38-02: contract tests for the actuals import service
// Covers parse/stage/preview/commit happy paths + override flags + unmatched
// names + idempotent re-commit refusal (TC-AC-007..011, TC-IMP-001..003).

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

const { parseAndStageActuals, previewStagedBatch, commitActualsBatch } =
  await import('../actuals-import.service');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_ORG_ID = 'a2222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERSON_ID = 'b1111111-1111-4111-8111-111111111111';
const PROJECT_ID = 'c1111111-1111-4111-8111-111111111111';
const DEPT_ID = 'd1111111-1111-4111-8111-111111111111';
const DISC_ID = 'e1111111-1111-4111-8111-111111111111';

async function setupSchema() {
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
    sql`INSERT INTO organizations (id, name) VALUES (${OTHER_ORG_ID}, 'Other Org')`,
  );
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
}

beforeAll(async () => {
  await setupSchema();
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
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return out as ArrayBuffer;
}

async function changeLogCount(): Promise<number> {
  const r = await testDb.execute(sql`SELECT count(*)::int AS c FROM change_log`);
  return (r.rows[0] as { c: number }).c;
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

describe('TC-IMP-001: parseAndStageActuals stages parsed rows', () => {
  it('writes import_sessions row with status=staged and parsedData', async () => {
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-01', 8]]);
    const [session] = await testDb
      .select()
      .from(schema.importSessions)
      .where(eq(schema.importSessions.id, sessionId));
    expect(session.status).toBe('staged');
    expect(session.rowCount).toBe(1);
    const parsed = session.parsedData as { rows: unknown[] };
    expect(parsed.rows).toHaveLength(1);
  });
});

describe('TC-IMP-002: previewStagedBatch returns counts', () => {
  it('returns new=1 for an unseen row', async () => {
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-02', 8]]);
    const preview = await previewStagedBatch(ORG_ID, sessionId);
    expect(preview.new).toBe(1);
    expect(preview.updated).toBe(0);
    expect(preview.rowsSkippedManual).toBe(0);
    expect(preview.unmatchedNames).toEqual([]);
  });

  it('returns updated=1 when a matching row already exists with different hours', async () => {
    await testDb.execute(
      sql`INSERT INTO actual_entries (organization_id, person_id, project_id, date, hours, source)
          VALUES (${ORG_ID}, ${PERSON_ID}, ${PROJECT_ID}, '2026-06-03', '4.00', 'import')`,
    );
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-03', 8]]);
    const preview = await previewStagedBatch(ORG_ID, sessionId);
    expect(preview.updated).toBe(1);
    expect(preview.new).toBe(0);
  });

  it('flags unmatched person/project names', async () => {
    const sessionId = await stage([['Zelda Unknown', 'Mystery', '2026-06-04', 8]]);
    const preview = await previewStagedBatch(ORG_ID, sessionId);
    expect(preview.unmatchedNames.length).toBeGreaterThanOrEqual(2);
    expect(preview.unmatchedNames.find((u) => u.kind === 'person')).toBeDefined();
    expect(preview.unmatchedNames.find((u) => u.kind === 'project')).toBeDefined();
  });
});

describe('TC-AC-007: commit happy path writes actual_entries + one change_log row', () => {
  it('inserts new rows and exactly ONE aggregate change_log entry', async () => {
    const sessionId = await stage([
      ['Anna Tester', 'Atlas', '2026-06-05', 8],
      ['Anna Tester', 'Atlas', '2026-06-06', 4],
    ]);
    const result = await commitActualsBatch({ ...baseCommit, sessionId });
    expect(result.rowsInserted).toBe(2);
    expect(result.rowsUpdated).toBe(0);

    const rows = await testDb
      .select()
      .from(schema.actualEntries)
      .where(eq(schema.actualEntries.organizationId, ORG_ID));
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.source).toBe('import');
      expect(r.importBatchId).toBe(result.batchId);
    }

    expect(await changeLogCount()).toBe(1);
    const logs = await testDb.select().from(schema.changeLog);
    expect(logs[0].action).toBe('ACTUALS_BATCH_COMMITTED');
    expect(logs[0].entity).toBe('import_batch');
  });
});

describe('TC-AC-008: overrideManualEdits=false preserves manual rows', () => {
  it('skips rows whose existing source=manual', async () => {
    await testDb.execute(
      sql`INSERT INTO actual_entries (organization_id, person_id, project_id, date, hours, source)
          VALUES (${ORG_ID}, ${PERSON_ID}, ${PROJECT_ID}, '2026-06-07', '5.00', 'manual')`,
    );
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-07', 8]]);
    const result = await commitActualsBatch({ ...baseCommit, sessionId });
    expect(result.rowsSkippedManual).toBe(1);
    expect(result.rowsInserted).toBe(0);
    expect(result.rowsUpdated).toBe(0);
    const [row] = await testDb
      .select()
      .from(schema.actualEntries)
      .where(eq(schema.actualEntries.organizationId, ORG_ID));
    expect(row.hours).toBe('5.00');
    expect(row.source).toBe('manual');
  });
});

describe('TC-AC-009: overrideManualEdits=true replaces manual rows', () => {
  it('writes import row over the manual row', async () => {
    await testDb.execute(
      sql`INSERT INTO actual_entries (organization_id, person_id, project_id, date, hours, source)
          VALUES (${ORG_ID}, ${PERSON_ID}, ${PROJECT_ID}, '2026-06-08', '5.00', 'manual')`,
    );
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-08', 8]]);
    const result = await commitActualsBatch({
      ...baseCommit,
      sessionId,
      overrideManualEdits: true,
    });
    expect(result.rowsSkippedManual).toBe(0);
    const [row] = await testDb
      .select()
      .from(schema.actualEntries)
      .where(eq(schema.actualEntries.organizationId, ORG_ID));
    expect(row.hours).toBe('8.00');
    expect(row.source).toBe('import');
  });
});

describe('TC-AC-010: re-commit of an already-committed session is refused', () => {
  it('throws SESSION_ALREADY_COMMITTED on the second call', async () => {
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-09', 8]]);
    await commitActualsBatch({ ...baseCommit, sessionId });
    await expect(commitActualsBatch({ ...baseCommit, sessionId })).rejects.toThrow(
      /already been committed/i,
    );
  });
});

describe('IMP-04 idempotency: re-import of same rows yields zero changes', () => {
  it('second commit of same rows in a NEW session produces 0 inserts and 0 updates', async () => {
    const sessionId1 = await stage([['Anna Tester', 'Atlas', '2026-06-10', 8]]);
    await commitActualsBatch({ ...baseCommit, sessionId: sessionId1 });

    // Manually clear superseded/active flag isn't needed — we use a NEW session
    // with the same payload, and the prior batch is still active. Without
    // overrideUnrolledImports, the commit refuses with PRIOR_BATCH_ACTIVE.
    // With override, it would supersede. The IMP-04 idempotency contract says:
    // re-import of identical rows AFTER the prior batch's window is unchanged
    // → noop. Simulate by aging the prior batch out of the active window.
    await testDb.execute(sql`UPDATE import_batches SET committed_at = NOW() - INTERVAL '48 hours'`);
    const sessionId2 = await stage([['Anna Tester', 'Atlas', '2026-06-10', 8]]);
    const result = await commitActualsBatch({ ...baseCommit, sessionId: sessionId2 });
    expect(result.rowsInserted).toBe(0);
    expect(result.rowsUpdated).toBe(0);
  });
});

describe('Tenant isolation: previewStagedBatch from another org returns NotFound', () => {
  it('throws NotFoundError when called with the wrong orgId', async () => {
    const sessionId = await stage([['Anna Tester', 'Atlas', '2026-06-11', 8]]);
    await expect(previewStagedBatch(OTHER_ORG_ID, sessionId)).rejects.toThrow();
  });
});
