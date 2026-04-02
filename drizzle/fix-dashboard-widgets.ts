/**
 * Update dashboard layout to only include widgets that work on the manager dashboard.
 * Removes project-specific widgets (allocation-trends, discipline-distribution)
 * and error-prone widgets (resource-conflicts) for a clean demo experience.
 *
 * Run: npx tsx drizzle/fix-dashboard-widgets.ts
 */
import 'dotenv/config';

import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import * as s from '../src/db/schema';

const db = drizzle(process.env.DATABASE_URL!);

async function fix() {
  const layout = [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'utilization-heat-map', position: 1, colSpan: 12 },
    { widgetId: 'capacity-gauges', position: 2, colSpan: 6 },
    { widgetId: 'department-bar-chart', position: 3, colSpan: 6 },
    { widgetId: 'utilization-sparklines', position: 4, colSpan: 6 },
    { widgetId: 'discipline-chart', position: 5, colSpan: 6 },
    { widgetId: 'capacity-forecast', position: 6, colSpan: 12 },
    { widgetId: 'bench-report', position: 7, colSpan: 12 },
    { widgetId: 'availability-finder', position: 8, colSpan: 12 },
  ];

  const result = await db
    .update(s.dashboardLayouts)
    .set({ layout, updatedAt: new Date() })
    .where(
      and(
        eq(s.dashboardLayouts.clerkUserId, '__tenant_default__'),
        eq(s.dashboardLayouts.dashboardId, 'manager'),
      ),
    )
    .returning();

  console.log(
    `Updated ${result.length} layout(s) — ${(result[0]?.layout as unknown[])?.length} widgets`,
  );
}

fix()
  .catch(console.error)
  .finally(() => process.exit(0));
