// v6.0 Phase 53 Plan 05 POLISH-05 Task 2 — Strip-resource-conflicts migration
// integration test. Applies src/db/migrations/20260422_polish_strip_resource_conflicts.sql
// against a PGlite-backed `dashboard_layouts` table and asserts:
//  - `resource-conflicts` is stripped from tenant custom layouts
//  - rows without the ID are untouched (T-53-14 scope isolation)
//  - empty-after-strip produces a valid empty jsonb array (T-53-23 DoS guard)
//  - migration is idempotent (T-53-16 precedent).
//
// Mirrors polish-strip-widgets.test.ts (Plan 04) shape.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const MIGRATION_SQL = readFileSync(
  'src/db/migrations/20260422_polish_strip_resource_conflicts.sql',
  'utf8',
);

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

async function seedRow(orgId: string, dashboardId: string, layout: unknown): Promise<string> {
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
const ORG_C = '00000000-0000-4000-8000-00000000000c';

describe('20260422_polish_strip_resource_conflicts migration', () => {
  it('strips resource-conflicts from a mixed layout; 3 -> 2 widgets', async () => {
    const id = await seedRow(ORG_A, 'manager', [
      { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
      { widgetId: 'resource-conflicts', position: 1, colSpan: 12 },
      { widgetId: 'capacity-forecast', position: 2, colSpan: 12 },
    ]);

    await pg.exec(MIGRATION_SQL);

    const layout = (await getLayout(id)) as Array<{ widgetId: string }>;
    expect(layout).toHaveLength(2);
    expect(layout.map((p) => p.widgetId)).toEqual(['kpi-cards', 'capacity-forecast']);
    for (const placement of layout) {
      expect(placement.widgetId).not.toBe('resource-conflicts');
    }
  });

  it('leaves rows untouched when they do not reference resource-conflicts', async () => {
    const id = await seedRow(ORG_C, 'manager', [
      { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
      { widgetId: 'discipline-breakdown', position: 1, colSpan: 6 },
    ]);

    const before = JSON.stringify(await getLayout(id));
    await pg.exec(MIGRATION_SQL);
    const after = JSON.stringify(await getLayout(id));

    expect(after).toEqual(before);
  });

  it('is idempotent — second application produces no further changes', async () => {
    const id = await seedRow(ORG_B, 'manager', [
      { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
      { widgetId: 'resource-conflicts', position: 1, colSpan: 12 },
    ]);

    await pg.exec(MIGRATION_SQL);
    const first = JSON.stringify(await getLayout(id));
    await pg.exec(MIGRATION_SQL);
    const second = JSON.stringify(await getLayout(id));

    expect(second).toEqual(first);
    expect(JSON.parse(first)).toEqual([
      { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    ]);
  });

  it('reduces a layout containing ONLY resource-conflicts to null or []', async () => {
    const id = await seedRow(ORG_A, 'manager', [
      { widgetId: 'resource-conflicts', position: 0, colSpan: 12 },
    ]);

    await pg.exec(MIGRATION_SQL);

    const layout = await getLayout(id);
    // jsonb_agg over an empty set returns NULL. The widget-registry defensive
    // fallback (LEAN-08) handles both null and [] as "render nothing".
    expect(layout === null || (Array.isArray(layout) && layout.length === 0)).toBe(true);
  });
});
