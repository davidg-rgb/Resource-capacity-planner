import 'dotenv/config';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from '../src/db/schema';

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log('Seeding database...');

  // Idempotency check — skip if demo org already exists
  const existing = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, 'demo-engineering'))
    .limit(1);

  if (existing.length > 0) {
    console.log('Demo org already exists, skipping seed.');
    return;
  }

  // a) Create demo organization
  const [org] = await db
    .insert(schema.organizations)
    .values({
      clerkOrgId: 'org_demo_seed',
      name: 'Demo Engineering AB',
      slug: 'demo-engineering',
      subscriptionStatus: 'trial',
    })
    .returning();
  console.log('Created 1 organization...');

  const orgId = org.id;

  // b) Create 3 departments
  const [deptMech, deptSW, deptElec] = await db
    .insert(schema.departments)
    .values([
      { organizationId: orgId, name: 'Mechanical Engineering' },
      { organizationId: orgId, name: 'Software Engineering' },
      { organizationId: orgId, name: 'Electronics' },
    ])
    .returning();
  console.log('Created 3 departments...');

  // c) Create 4 disciplines
  const [discSW, discMek, discElnik, discTest] = await db
    .insert(schema.disciplines)
    .values([
      { organizationId: orgId, name: 'Software', abbreviation: 'SW' },
      { organizationId: orgId, name: 'Mechanical', abbreviation: 'Mek' },
      { organizationId: orgId, name: 'Electronics', abbreviation: 'Elnik' },
      { organizationId: orgId, name: 'Test', abbreviation: 'Test' },
    ])
    .returning();
  console.log('Created 4 disciplines...');

  // d) Create 5 people
  const [anna, erik, sara, marcus, lisa] = await db
    .insert(schema.people)
    .values([
      {
        organizationId: orgId,
        firstName: 'Anna',
        lastName: 'Johansson',
        disciplineId: discSW.id,
        departmentId: deptSW.id,
        targetHoursPerMonth: 160,
      },
      {
        organizationId: orgId,
        firstName: 'Erik',
        lastName: 'Lindgren',
        disciplineId: discMek.id,
        departmentId: deptMech.id,
        targetHoursPerMonth: 160,
      },
      {
        organizationId: orgId,
        firstName: 'Sara',
        lastName: 'Bergman',
        disciplineId: discElnik.id,
        departmentId: deptElec.id,
        targetHoursPerMonth: 160,
      },
      {
        organizationId: orgId,
        firstName: 'Marcus',
        lastName: 'Holm',
        disciplineId: discSW.id,
        departmentId: deptSW.id,
        targetHoursPerMonth: 120,
      },
      {
        organizationId: orgId,
        firstName: 'Lisa',
        lastName: 'Nystrom',
        disciplineId: discTest.id,
        departmentId: deptMech.id,
        targetHoursPerMonth: 160,
      },
    ])
    .returning();
  console.log('Created 5 people...');

  // e) Create 4 projects
  const [atlas, beacon, compass, legacy] = await db
    .insert(schema.projects)
    .values([
      {
        organizationId: orgId,
        name: 'Project Atlas',
        status: 'active' as const,
        leadPmPersonId: anna.id,
      },
      {
        organizationId: orgId,
        name: 'Project Beacon',
        status: 'active' as const,
        leadPmPersonId: anna.id,
      },
      { organizationId: orgId, name: 'Project Compass', status: 'planned' as const },
      { organizationId: orgId, name: 'Legacy System Migration', status: 'active' as const },
    ])
    .returning();
  console.log('Created 4 projects (Atlas + Beacon PM = Anna)...');

  // f) Create 12+ allocations across people/projects for Apr-Sep 2026
  const allocationData = [
    // Anna: Atlas 80h Apr-Jun, Beacon 80h Apr-Jun
    { personId: anna.id, projectId: atlas.id, month: '2026-04-01', hours: 80 },
    { personId: anna.id, projectId: atlas.id, month: '2026-05-01', hours: 80 },
    { personId: anna.id, projectId: atlas.id, month: '2026-06-01', hours: 80 },
    { personId: anna.id, projectId: beacon.id, month: '2026-04-01', hours: 80 },
    { personId: anna.id, projectId: beacon.id, month: '2026-05-01', hours: 80 },
    { personId: anna.id, projectId: beacon.id, month: '2026-06-01', hours: 80 },

    // Erik: Atlas 120h Apr-May, Compass 40h Jun-Jul
    { personId: erik.id, projectId: atlas.id, month: '2026-04-01', hours: 120 },
    { personId: erik.id, projectId: atlas.id, month: '2026-05-01', hours: 120 },
    { personId: erik.id, projectId: compass.id, month: '2026-06-01', hours: 40 },
    { personId: erik.id, projectId: compass.id, month: '2026-07-01', hours: 40 },

    // Sara: Beacon 160h Apr-Jun
    { personId: sara.id, projectId: beacon.id, month: '2026-04-01', hours: 160 },
    { personId: sara.id, projectId: beacon.id, month: '2026-05-01', hours: 160 },
    { personId: sara.id, projectId: beacon.id, month: '2026-06-01', hours: 160 },

    // Marcus: Atlas 60h Apr-Jun, Legacy 60h Apr-Jun
    { personId: marcus.id, projectId: atlas.id, month: '2026-04-01', hours: 60 },
    { personId: marcus.id, projectId: atlas.id, month: '2026-05-01', hours: 60 },
    { personId: marcus.id, projectId: atlas.id, month: '2026-06-01', hours: 60 },
    { personId: marcus.id, projectId: legacy.id, month: '2026-04-01', hours: 60 },
    { personId: marcus.id, projectId: legacy.id, month: '2026-05-01', hours: 60 },
    { personId: marcus.id, projectId: legacy.id, month: '2026-06-01', hours: 60 },

    // Lisa: Legacy 80h Apr-Jul
    { personId: lisa.id, projectId: legacy.id, month: '2026-04-01', hours: 80 },
    { personId: lisa.id, projectId: legacy.id, month: '2026-05-01', hours: 80 },
    { personId: lisa.id, projectId: legacy.id, month: '2026-06-01', hours: 80 },
    { personId: lisa.id, projectId: legacy.id, month: '2026-07-01', hours: 80 },
  ];

  const allocations = await db
    .insert(schema.allocations)
    .values(allocationData.map((a) => ({ ...a, organizationId: orgId })))
    .returning();
  console.log(`Created ${allocations.length} allocations...`);

  // f2) v5.0 (Phase 37-02): seed actual_entries so the PlanVsActualDrawer
  // has real data to render in the demo org. We pick (Anna, Atlas, 2026-04)
  // and write ~15 manual day rows summing to roughly 80h (the planned value)
  // ±non-trivial deltas. Hardcoded month for determinism.
  // Wrapped in try/catch so the seed still succeeds against a v4.0-only DB
  // (defensive — actual_entries was added in Phase 36).
  try {
    if (schema.actualEntries) {
      const actualRows = [
        { date: '2026-04-01', hours: '8.00' },
        { date: '2026-04-02', hours: '7.50' },
        { date: '2026-04-03', hours: '8.00' },
        { date: '2026-04-06', hours: '6.00' },
        { date: '2026-04-07', hours: '8.50' },
        { date: '2026-04-08', hours: '8.00' },
        { date: '2026-04-09', hours: '7.00' },
        { date: '2026-04-10', hours: '5.50' },
        { date: '2026-04-13', hours: '8.00' },
        { date: '2026-04-14', hours: '8.00' },
        { date: '2026-04-15', hours: '6.50' },
        { date: '2026-04-16', hours: '7.00' },
        { date: '2026-04-17', hours: '4.00' },
        { date: '2026-04-20', hours: '8.00' },
        { date: '2026-04-21', hours: '7.00' },
      ];
      const inserted = await db
        .insert(schema.actualEntries)
        .values(
          actualRows.map((r) => ({
            organizationId: orgId,
            personId: anna.id,
            projectId: atlas.id,
            date: r.date,
            hours: r.hours,
            source: 'manual' as const,
            importBatchId: null,
          })),
        )
        .onConflictDoNothing({
          target: [
            schema.actualEntries.organizationId,
            schema.actualEntries.personId,
            schema.actualEntries.projectId,
            schema.actualEntries.date,
          ],
        })
        .returning();
      console.log(
        `Created ${inserted.length} actual_entries for Anna/Atlas in 2026-04 (v5.0 demo data)`,
      );
    }
  } catch (err) {
    console.warn('Skipped actual_entries seed (table may be missing):', err);
  }

  // g) Create platform admin account (if env vars set)
  const platformEmail = process.env.PLATFORM_ADMIN_EMAIL;
  const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD;

  if (platformEmail && platformPassword) {
    const existingAdmin = await db
      .select()
      .from(schema.platformAdmins)
      .where(eq(schema.platformAdmins.email, platformEmail))
      .limit(1);

    if (existingAdmin.length === 0) {
      const passwordHash = await bcrypt.hash(platformPassword, 12);
      await db.insert(schema.platformAdmins).values({
        email: platformEmail,
        passwordHash,
        name: 'Platform Admin',
      });
      console.log('Created platform admin account.');
    } else {
      console.log('Platform admin already exists, skipping.');
    }
  } else {
    console.log('Skipping platform admin (PLATFORM_ADMIN_EMAIL/PASSWORD not set).');
  }

  console.log(
    `Seed complete. Created: 1 org, 3 departments, 4 disciplines, 5 people, 4 projects, ${allocations.length} allocations`,
  );
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
