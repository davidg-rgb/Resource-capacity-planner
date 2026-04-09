// v5.0 — Phase 44 / Plan 44-05: TC-API-TENANT-NNN runtime cross-tenant prober.
//
// Parameterized runtime complement to tests/invariants/tenant-isolation.static.test.ts.
// Iterates tests/invariants/mutating-routes.json and, for each mutating
// /api/v5/* handler, fires a request with auth resolved to orgA targeting a
// resource owned by orgB. Every handler MUST respond 404 (NotFoundError) —
// never 200, 403, or 500. 404 (not 403) is the canonical "row does not exist
// in this tenant" response per CONTEXT decision §4 so existence is not leaked.
//
// The test reuses the PGlite + vi.mock('@/db') + vi.mock('@/lib/auth') pattern
// established by src/app/api/v5/proposals/__tests__/routes.test.ts and
// src/app/api/v5/imports/__tests__/imports.api.test.ts. No new infra.

import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import * as schema from '@/db/schema';

type MutRoute = {
  routeFile: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  requiresRow: boolean;
  rowFixture: string;
  sampleBody: unknown;
  pathParams: Record<string, string>;
};

const manifest = JSON.parse(
  readFileSync('tests/invariants/mutating-routes.json', 'utf8'),
) as { routes: MutRoute[] };

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

// Auth resolves to ORG_A for every cross-tenant call. All seeded target rows
// belong to ORG_B.
const fakeAuth = { orgId: '', userId: 'user_a', role: 'admin' as const };
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async () => fakeAuth),
  getTenantId: vi.fn(async () => fakeAuth.orgId),
}));

// Deterministic fixture IDs
const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const B_DEPT = 'd1111111-1111-4111-8111-111111111111';
const B_DISC = 'e1111111-1111-4111-8111-111111111111';
const B_PERSON = 'b1111111-1111-4111-8111-111111111111';
const B_PROJECT = 'c1111111-1111-4111-8111-111111111111';
const B_ALLOCATION = 'a1111111-1111-4111-8111-111111111111';
const B_PROPOSAL = 'f1111111-1111-4111-8111-111111111111';
const B_IMPORT_SESSION = '01111111-1111-4111-8111-111111111111';
const B_IMPORT_BATCH = '11111111-1111-4111-8111-111111111111';

// Placeholder → concrete id map consumed by resolvePlaceholder() below.
const placeholderMap: Record<string, string> = {
  'orgB:department': B_DEPT,
  'orgB:discipline': B_DISC,
  'orgB:person': B_PERSON,
  'orgB:project': B_PROJECT,
  'orgB:allocation': B_ALLOCATION,
  'orgB:proposal': B_PROPOSAL,
  'orgB:import_session': B_IMPORT_SESSION,
  'orgB:import_batch': B_IMPORT_BATCH,
};

function resolvePlaceholder(value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith('orgB:')) {
    const resolved = placeholderMap[value];
    if (!resolved) throw new Error(`Unknown placeholder: ${value}`);
    return resolved;
  }
  if (Array.isArray(value)) return value.map(resolvePlaceholder);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolvePlaceholder(v);
    }
    return out;
  }
  return value;
}

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE organizations (id uuid PRIMARY KEY, name varchar(100) NOT NULL);
    CREATE TABLE departments (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(100) NOT NULL,
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE disciplines (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(50) NOT NULL,
      abbreviation varchar(10) NOT NULL,
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE programs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL,
      description varchar(500),
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE people (
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
    CREATE TYPE project_status AS ENUM ('active','on_hold','completed','archived');
    CREATE TABLE projects (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES organizations(id),
      name varchar(200) NOT NULL,
      program_id uuid REFERENCES programs(id),
      status project_status NOT NULL DEFAULT 'active',
      lead_pm_person_id uuid REFERENCES people(id),
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id),
      person_id uuid NOT NULL REFERENCES people(id),
      project_id uuid NOT NULL REFERENCES projects(id),
      month date NOT NULL,
      hours integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (organization_id, person_id, project_id, month)
    );
    CREATE TYPE proposal_status AS ENUM (
      'proposed','approved','rejected','withdrawn','superseded'
    );
    CREATE TABLE allocation_proposals (
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
      parent_proposal_id uuid REFERENCES allocation_proposals(id),
      target_department_id uuid NOT NULL REFERENCES departments(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TYPE import_status AS ENUM (
      'uploaded','mapped','validated','staged','committed','failed'
    );
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

  // Seed BOTH orgs, every target row owned by ORG_B.
  await testDb.execute(sql`
    INSERT INTO organizations (id, name) VALUES
      (${ORG_A}, 'Org A'),
      (${ORG_B}, 'Org B')
  `);
  await testDb.execute(
    sql`INSERT INTO departments (id, organization_id, name) VALUES (${B_DEPT}, ${ORG_B}, 'B-Eng')`,
  );
  await testDb.execute(
    sql`INSERT INTO disciplines (id, organization_id, name, abbreviation)
        VALUES (${B_DISC}, ${ORG_B}, 'Mech', 'MEC')`,
  );
  await testDb.execute(
    sql`INSERT INTO people (id, organization_id, first_name, last_name, discipline_id, department_id)
        VALUES (${B_PERSON}, ${ORG_B}, 'Bob', 'OrgB', ${B_DISC}, ${B_DEPT})`,
  );
  await testDb.execute(
    sql`INSERT INTO projects (id, organization_id, name)
        VALUES (${B_PROJECT}, ${ORG_B}, 'B-Atlas')`,
  );
  await testDb.execute(
    sql`INSERT INTO allocations (id, organization_id, person_id, project_id, month, hours)
        VALUES (${B_ALLOCATION}, ${ORG_B}, ${B_PERSON}, ${B_PROJECT}, '2026-06-01', 40)`,
  );
  await testDb.execute(sql`
    INSERT INTO allocation_proposals
      (id, organization_id, person_id, project_id, month, proposed_hours,
       status, requested_by, target_department_id)
    VALUES
      (${B_PROPOSAL}, ${ORG_B}, ${B_PERSON}, ${B_PROJECT}, '2026-06-01', 40,
       'proposed', 'user_b', ${B_DEPT})
  `);
  await testDb.execute(sql`
    INSERT INTO import_sessions
      (id, organization_id, user_id, file_name, status, row_count, expires_at)
    VALUES
      (${B_IMPORT_SESSION}, ${ORG_B}, 'user_b', 'b.xlsx', 'staged', 0, now() + interval '1 day')
  `);
  await testDb.execute(sql`
    INSERT INTO import_batches
      (id, organization_id, import_session_id, file_name, committed_by,
       override_manual_edits, rows_inserted, rows_updated, rows_skipped_manual)
    VALUES
      (${B_IMPORT_BATCH}, ${ORG_B}, ${B_IMPORT_SESSION}, 'b.xlsx', 'user_b',
       false, 0, 0, 0)
  `);

  // Every subsequent call resolves auth to ORG_A.
  fakeAuth.orgId = ORG_A;
});

function buildRequest(method: string, routeFile: string, body: unknown): Request {
  const url = `http://localhost/${routeFile}`;
  if (body === null || body === undefined) {
    return new Request(url, { method });
  }
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function importHandler(routeFile: string, method: string): Promise<Function> {
  // routeFile is posix-normalized from manifest; vite/vitest resolves both.
  // Strip the leading `src/` because vitest alias `@/` → `src/`.
  const rel = routeFile.replace(/^src\//, '@/');
  const mod = (await import(/* @vite-ignore */ rel)) as Record<string, unknown>;
  const handler = mod[method];
  if (typeof handler !== 'function') {
    throw new Error(`${routeFile} does not export ${method}`);
  }
  return handler as Function;
}

describe('TC-API-TENANT runtime cross-tenant 404 prober', () => {
  manifest.routes.forEach((r, idx) => {
    const tcId = `TC-API-TENANT-${String(idx + 1).padStart(3, '0')}`;
    it(`${tcId} ${r.method} ${r.routeFile} cross-tenant returns 404`, async () => {
      const handler = await importHandler(r.routeFile, r.method);
      const body = r.sampleBody === null ? null : resolvePlaceholder(r.sampleBody);
      const params = resolvePlaceholder(r.pathParams) as Record<string, string>;
      const req = buildRequest(r.method, r.routeFile, body);
      const ctx = { params: Promise.resolve(params) };
      const res = (await (handler as (req: Request, ctx: unknown) => Promise<Response>)(
        req,
        ctx,
      )) as Response;
      expect(
        res.status,
        `${r.method} ${r.routeFile} cross-tenant must return 404, got ${res.status}`,
      ).toBe(404);
    });
  });
});
