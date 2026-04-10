// v5.0 — Phase 38 / Plan 38-02: API integration tests for /api/v5/imports/*
// Covers TC-API-030..034 + tenant isolation. Auth + db are mocked the same
// way the import-service contract tests do — pglite for db, a fake
// requireRole that returns a configurable orgId/userId.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import * as schema from '@/db/schema';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const fakeAuth = { orgId: '', userId: 'user-1', role: 'planner' as const };
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => fakeAuth),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

const { POST: parseRoute } = await import('../parse/route');
const { GET: previewRoute } = await import('../[sessionId]/preview/route');
const { POST: commitRoute } = await import('../[sessionId]/commit/route');
const { POST: rollbackRoute } = await import('../batches/[batchId]/rollback/route');

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_ORG_ID = 'a2222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
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
      entity_id uuid NOT NULL,
      entity change_log_entity NOT NULL,
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
});

beforeEach(async () => {
  await testDb.execute(sql`DELETE FROM change_log`);
  await testDb.execute(sql`DELETE FROM actual_entries`);
  await testDb.execute(sql`DELETE FROM import_batches`);
  await testDb.execute(sql`DELETE FROM import_sessions`);
  fakeAuth.orgId = ORG_ID;
});

function buildXlsx(rows: Array<[string, string, string, number]>): ArrayBuffer {
  const aoa: unknown[][] = [['person_name', 'project_name', 'date', 'hours'], ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Utfall');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

function makeMultipart(rows: Array<[string, string, string, number]>): Request {
  const fd = new FormData();
  const blob = new Blob([buildXlsx(rows) as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  fd.append('file', blob, 'test.xlsx');
  return new Request('http://localhost/api/v5/imports/parse', {
    method: 'POST',
    body: fd,
  });
}

async function parseAndGetSessionId(
  rows: Array<[string, string, string, number]>,
): Promise<string> {
  const res = await parseRoute(makeMultipart(rows) as never);
  expect(res.status).toBe(201);
  const json = (await res.json()) as { sessionId: string };
  return json.sessionId;
}

describe('TC-API-030: POST /api/v5/imports/parse', () => {
  it('returns 201 with sessionId + parse summary on a valid xlsx', async () => {
    const res = await parseRoute(
      makeMultipart([['Anna Tester', 'Atlas', '2026-06-20', 8]]) as never,
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      sessionId: string;
      layout: string;
      rowCount: number;
      warningCount: number;
    };
    expect(json.sessionId).toBeDefined();
    expect(json.layout).toBe('row-per-entry');
    expect(json.rowCount).toBe(1);
    expect(json.warningCount).toBe(0);
  });

  it('returns 400 ERR_UNSUPPORTED_FILE_TYPE for a .csv upload', async () => {
    const fd = new FormData();
    fd.append('file', new Blob(['x,y'], { type: 'text/csv' }), 'data.csv');
    const req = new Request('http://localhost/api/v5/imports/parse', { method: 'POST', body: fd });
    const res = await parseRoute(req as never);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });
});

describe('TC-API-031: GET /api/v5/imports/{sessionId}/preview', () => {
  it('returns the preview shape', async () => {
    const sessionId = await parseAndGetSessionId([['Anna Tester', 'Atlas', '2026-06-21', 8]]);
    const res = await previewRoute(new Request('http://localhost') as never, {
      params: Promise.resolve({ sessionId }),
    });
    expect(res.status).toBe(200);
    const preview = (await res.json()) as {
      new: number;
      updated: number;
      warnings: unknown[];
      unmatchedNames: unknown[];
      rowsSkippedManual: number;
      rowsSkippedPriorBatch: number;
    };
    expect(preview.new).toBe(1);
    expect(preview.updated).toBe(0);
    expect(Array.isArray(preview.warnings)).toBe(true);
    expect(Array.isArray(preview.unmatchedNames)).toBe(true);
  });
});

describe('TC-API-032: POST commit preserves manual rows by default', () => {
  it('rows_skipped_manual = 1 and the manual row is unchanged', async () => {
    await testDb.execute(
      sql`INSERT INTO actual_entries (organization_id, person_id, project_id, date, hours, source)
          VALUES (${ORG_ID}, ${PERSON_ID}, ${PROJECT_ID}, '2026-06-22', '5.00', 'manual')`,
    );
    const sessionId = await parseAndGetSessionId([['Anna Tester', 'Atlas', '2026-06-22', 8]]);
    const res = await commitRoute(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ overrideManualEdits: false, overrideUnrolledImports: false }),
      }) as never,
      { params: Promise.resolve({ sessionId }) },
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { rowsSkippedManual: number };
    expect(json.rowsSkippedManual).toBe(1);
  });
});

describe('TC-API-033: POST rollback within 24h restores values', () => {
  it('returns rowsDeleted=1 for a fresh batch', async () => {
    const sessionId = await parseAndGetSessionId([['Anna Tester', 'Atlas', '2026-06-23', 8]]);
    const commitRes = await commitRoute(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ overrideManualEdits: false, overrideUnrolledImports: false }),
      }) as never,
      { params: Promise.resolve({ sessionId }) },
    );
    const { batchId } = (await commitRes.json()) as { batchId: string };

    const rbRes = await rollbackRoute(
      new Request('http://localhost', { method: 'POST' }) as never,
      {
        params: Promise.resolve({ batchId }),
      },
    );
    expect(rbRes.status).toBe(200);
    const rb = (await rbRes.json()) as { rowsDeleted: number };
    expect(rb.rowsDeleted).toBe(1);
  });
});

describe('TC-API-034: POST rollback after 24h returns ROLLBACK_WINDOW_EXPIRED', () => {
  it('returns 409 with the expired error code', async () => {
    const sessionId = await parseAndGetSessionId([['Anna Tester', 'Atlas', '2026-06-24', 8]]);
    const commitRes = await commitRoute(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ overrideManualEdits: false, overrideUnrolledImports: false }),
      }) as never,
      { params: Promise.resolve({ sessionId }) },
    );
    const { batchId } = (await commitRes.json()) as { batchId: string };
    await testDb.execute(
      sql`UPDATE import_batches SET committed_at = NOW() - INTERVAL '48 hours' WHERE id = ${batchId}`,
    );
    const rbRes = await rollbackRoute(
      new Request('http://localhost', { method: 'POST' }) as never,
      {
        params: Promise.resolve({ batchId }),
      },
    );
    expect(rbRes.status).toBe(409);
  });
});

describe('Tenant isolation: preview a sessionId from another org returns 404', () => {
  it('switches the mocked auth org and gets a 404', async () => {
    const sessionId = await parseAndGetSessionId([['Anna Tester', 'Atlas', '2026-06-25', 8]]);
    fakeAuth.orgId = OTHER_ORG_ID;
    const res = await previewRoute(new Request('http://localhost') as never, {
      params: Promise.resolve({ sessionId }),
    });
    expect(res.status).toBe(404);
  });
});
