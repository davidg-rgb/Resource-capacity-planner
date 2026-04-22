// v6.0 Phase 53 Plan 03 POLISH-03 Task 3 — Migration integration test.
// Applies src/db/migrations/20260422_polish_discipline_rename.sql against a
// PGlite-backed `dashboard_layouts` table and asserts the widget-id rewrite
// rules (T-53-12 / T-53-14 mitigations).

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const MIGRATION_SQL = readFileSync(
  'src/db/migrations/20260422_polish_discipline_rename.sql',
  'utf8',
);

// Minimal standalone schema — we don't need the full organizations FK or the
// unique constraint for this migration test; we only exercise the jsonb
// rewrite on `dashboard_layouts.layout`.
const SCHEMA_SQL = `
  CREATE TABLE dashboard_layouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    clerk_user_id text NOT NULL DEFAULT '__tenant_default__',
    dashboard_id text NOT NULL,
    device_class text NOT NULL DEFAULT 'desktop',
    layout jsonb,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`;

let pg: PGlite;

async function resetTable() {
  await pg.exec('DELETE FROM dashboard_layouts;');
}

async function seedRow(
  orgId: string,
  dashboardId: string,
  layout: unknown,
): Promise<string> {
  const res = await pg.query<{ id: string }>(
    `INSERT INTO dashboard_layouts (organization_id, dashboard_id, layout)
     VALUES ($1, $2, $3::jsonb) RETURNING id`,
    [orgId, dashboardId, JSON.stringify(layout)],
  );
  return res.rows[0].id;
}

async function getLayout(id: string): Promise<unknown> {
  const res = await pg.query<{ layout: unknown }>(
    `SELECT layout FROM dashboard_layouts WHERE id = $1`,
    [id],
  );
  return res.rows[0]?.layout;
}

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(SCHEMA_SQL);
});

beforeEach(async () => {
  await resetTable();
});

const ORG_A = '00000000-0000-4000-8000-00000000000a';
const ORG_B = '00000000-0000-4000-8000-00000000000b';

describe('20260422_polish_discipline_rename migration', () => {
  it('rewrites discipline-chart -> discipline-breakdown; leaves rows without legacy IDs untouched', async () => {
    const a = await seedRow(ORG_A, 'manager', [
      { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
      { widgetId: 'discipline-chart', position: 1, colSpan: 6 },
    ]);
    const untouched = await seedRow(ORG_B, 'manager', [
      { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
      { widgetId: 'capacity-forecast', position: 1, colSpan: 12 },
    ]);

    await pg.exec(MIGRATION_SQL);

    const aLayout = (await getLayout(a)) as Array<{ widgetId: string }>;
    expect(aLayout.map((p) => p.widgetId)).toEqual([
      'kpi-cards',
      'discipline-breakdown',
    ]);

    const uLayout = (await getLayout(untouched)) as Array<{ widgetId: string }>;
    expect(uLayout.map((p) => p.widgetId)).toEqual(['kpi-cards', 'capacity-forecast']);
  });

  it('rewrites discipline-distribution -> discipline-breakdown', async () => {
    const id = await seedRow(ORG_A, 'project-leader', [
      { widgetId: 'capacity-distribution', position: 0, colSpan: 12 },
      { widgetId: 'discipline-distribution', position: 1, colSpan: 6 },
    ]);

    await pg.exec(MIGRATION_SQL);

    const layout = (await getLayout(id)) as Array<{ widgetId: string }>;
    expect(layout.map((p) => p.widgetId)).toEqual([
      'capacity-distribution',
      'discipline-breakdown',
    ]);
  });

  it('rewrites BOTH legacy IDs when a layout contains both (may create duplicates — documented as acceptable)', async () => {
    const id = await seedRow(ORG_A, 'manager', [
      { widgetId: 'discipline-chart', position: 0, colSpan: 6 },
      { widgetId: 'kpi-cards', position: 1, colSpan: 12 },
      { widgetId: 'discipline-distribution', position: 2, colSpan: 6 },
    ]);

    await pg.exec(MIGRATION_SQL);

    const layout = (await getLayout(id)) as Array<{ widgetId: string }>;
    expect(layout.map((p) => p.widgetId)).toEqual([
      'discipline-breakdown',
      'kpi-cards',
      'discipline-breakdown',
    ]);
  });

  it('is idempotent — second application produces no further changes', async () => {
    const id = await seedRow(ORG_A, 'manager', [
      { widgetId: 'discipline-chart', position: 0, colSpan: 6 },
    ]);

    await pg.exec(MIGRATION_SQL);
    const first = JSON.stringify(await getLayout(id));
    await pg.exec(MIGRATION_SQL);
    const second = JSON.stringify(await getLayout(id));

    expect(second).toEqual(first);
    expect(JSON.parse(first)).toEqual([
      { widgetId: 'discipline-breakdown', position: 0, colSpan: 6 },
    ]);
  });

  it('preserves placement metadata (position, colSpan) while rewriting widgetId', async () => {
    const id = await seedRow(ORG_A, 'manager', [
      { widgetId: 'discipline-chart', position: 5, colSpan: 6, config: { foo: 'bar' } },
    ]);

    await pg.exec(MIGRATION_SQL);

    const layout = (await getLayout(id)) as Array<{
      widgetId: string;
      position: number;
      colSpan: number;
      config: { foo: string };
    }>;
    expect(layout).toEqual([
      {
        widgetId: 'discipline-breakdown',
        position: 5,
        colSpan: 6,
        config: { foo: 'bar' },
      },
    ]);
  });

  it('does not error when layout is an empty jsonb array', async () => {
    const id = await seedRow(ORG_A, 'manager', []);

    // WHERE clause short-circuits; no error expected.
    await pg.exec(MIGRATION_SQL);

    const layout = await getLayout(id);
    // Empty array stays empty — untouched.
    expect(layout).toEqual([]);
  });
});
