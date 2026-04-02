import 'dotenv/config';

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from '../src/db/schema';

const db = drizzle(process.env.DATABASE_URL!);

const FLAGS_TO_ENABLE = ['dashboards', 'pdfExport', 'scenarios'] as const;

async function enableFlags() {
  // Find all organizations
  const orgs = await db.select().from(schema.organizations);

  if (orgs.length === 0) {
    console.log('No organizations found.');
    return;
  }

  // Find or create platform admin to set as setByAdminId
  let admins = await db.select().from(schema.platformAdmins).limit(1);
  if (admins.length === 0) {
    console.log('No platform admin found — creating a system admin record...');
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('change-me-immediately', 12);
    admins = await db
      .insert(schema.platformAdmins)
      .values({ email: 'system@nordic-capacity.local', passwordHash, name: 'System' })
      .returning();
  }
  const adminId = admins[0].id;

  for (const org of orgs) {
    console.log(`Enabling flags for org: ${org.name} (${org.id})`);

    for (const flagName of FLAGS_TO_ENABLE) {
      await db
        .insert(schema.featureFlags)
        .values({
          organizationId: org.id,
          flagName,
          enabled: true,
          setByAdminId: adminId,
        })
        .onConflictDoUpdate({
          target: [schema.featureFlags.organizationId, schema.featureFlags.flagName],
          set: {
            enabled: true,
            setByAdminId: adminId,
            updatedAt: sql`now()`,
          },
        });

      console.log(`  ✓ ${flagName} = enabled`);
    }
  }

  console.log('Done — all flags enabled.');
}

enableFlags()
  .catch(console.error)
  .finally(() => process.exit(0));
