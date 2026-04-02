/**
 * One-time fix: delete personal dashboard layouts so the tenant default (8 widgets) kicks in.
 * Run: npx tsx drizzle/fix-dashboard-layout.ts
 */
import 'dotenv/config';

import { ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import * as s from '../src/db/schema';

const db = drizzle(process.env.DATABASE_URL!);

async function fix() {
  const deleted = await db
    .delete(s.dashboardLayouts)
    .where(ne(s.dashboardLayouts.clerkUserId, '__tenant_default__'))
    .returning();
  console.log(`Deleted ${deleted.length} personal layout(s).`);

  const remaining = await db.select().from(s.dashboardLayouts);
  console.log(`Remaining: ${remaining.length} layout(s)`);
  for (const r of remaining) {
    const widgets = r.layout as unknown[];
    console.log(`  ${r.dashboardId} / ${r.deviceClass}: ${widgets.length} widgets`);
  }
}

fix()
  .catch(console.error)
  .finally(() => process.exit(0));
