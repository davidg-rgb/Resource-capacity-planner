/**
 * Demo seed — populates the existing org with rich data for all pages.
 * Run: npx tsx drizzle/seed-demo.ts
 *
 * Idempotent: deletes existing allocations/projects/people first, then re-creates.
 */
import 'dotenv/config';

import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import * as s from '../src/db/schema';

const db = drizzle(process.env.DATABASE_URL!);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate month string like '2026-04-01' */
function m(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedDemo() {
  console.log('🌱 Starting demo seed...\n');

  // Find the org
  const orgs = await db.select().from(s.organizations);
  if (orgs.length === 0) {
    console.log('No organization found. Run db:seed first.');
    return;
  }
  const org = orgs[0];
  const orgId = org.id;
  console.log(`Organization: ${org.name} (${orgId})`);

  // Clean existing data (order matters for FK constraints)
  console.log('\nCleaning existing data...');
  await db.delete(s.scenarioAllocations).where(eq(s.scenarioAllocations.organizationId, orgId));
  await db.delete(s.scenarioTempEntities).where(eq(s.scenarioTempEntities.organizationId, orgId));
  await db.delete(s.scenarios).where(eq(s.scenarios.organizationId, orgId));
  await db.delete(s.dashboardLayouts).where(eq(s.dashboardLayouts.organizationId, orgId));
  await db.delete(s.allocations).where(eq(s.allocations.organizationId, orgId));
  await db.delete(s.projects).where(eq(s.projects.organizationId, orgId));
  await db.delete(s.people).where(eq(s.people.organizationId, orgId));
  await db.delete(s.programs).where(eq(s.programs.organizationId, orgId));
  await db.delete(s.disciplines).where(eq(s.disciplines.organizationId, orgId));
  await db.delete(s.departments).where(eq(s.departments.organizationId, orgId));
  console.log('  ✓ Cleaned');

  // -----------------------------------------------------------------------
  // 1. Departments (5)
  // -----------------------------------------------------------------------
  const [deptMech, deptSW, deptElec, deptTest, deptSys] = await db
    .insert(s.departments)
    .values([
      { organizationId: orgId, name: 'Mechanical Engineering' },
      { organizationId: orgId, name: 'Software Engineering' },
      { organizationId: orgId, name: 'Electronics' },
      { organizationId: orgId, name: 'Test & Verification' },
      { organizationId: orgId, name: 'Systems Engineering' },
    ])
    .returning();
  console.log('\n✓ 5 departments');

  // -----------------------------------------------------------------------
  // 2. Disciplines (6)
  // -----------------------------------------------------------------------
  const [discSW, discMek, discElnik, discTest, discSys, discFW] = await db
    .insert(s.disciplines)
    .values([
      { organizationId: orgId, name: 'Software', abbreviation: 'SW' },
      { organizationId: orgId, name: 'Mechanical', abbreviation: 'Mek' },
      { organizationId: orgId, name: 'Electronics', abbreviation: 'Elnik' },
      { organizationId: orgId, name: 'Test', abbreviation: 'Test' },
      { organizationId: orgId, name: 'Systems', abbreviation: 'Sys' },
      { organizationId: orgId, name: 'Firmware', abbreviation: 'FW' },
    ])
    .returning();
  console.log('✓ 6 disciplines');

  // -----------------------------------------------------------------------
  // 3. Programs (3)
  // -----------------------------------------------------------------------
  const [progVehicle, progInfra, progRnD] = await db
    .insert(s.programs)
    .values([
      {
        organizationId: orgId,
        name: 'Vehicle Platform',
        description: 'Next-gen vehicle control systems',
      },
      {
        organizationId: orgId,
        name: 'Infrastructure',
        description: 'Internal tools, CI/CD, and test rigs',
      },
      {
        organizationId: orgId,
        name: 'R&D Exploration',
        description: 'Research prototypes and feasibility studies',
      },
    ])
    .returning();
  console.log('✓ 3 programs');

  // -----------------------------------------------------------------------
  // 4. Projects (10)
  // -----------------------------------------------------------------------
  const projectDefs = [
    { name: 'ECU Firmware v3.2', programId: progVehicle.id, status: 'active' as const },
    { name: 'Battery Management System', programId: progVehicle.id, status: 'active' as const },
    { name: 'Sensor Fusion Module', programId: progVehicle.id, status: 'active' as const },
    { name: 'Chassis Redesign 2027', programId: progVehicle.id, status: 'planned' as const },
    { name: 'CI/CD Pipeline Upgrade', programId: progInfra.id, status: 'active' as const },
    { name: 'Test Rig Automation', programId: progInfra.id, status: 'active' as const },
    { name: 'Legacy System Migration', programId: progInfra.id, status: 'active' as const },
    { name: 'AI Diagnostics PoC', programId: progRnD.id, status: 'active' as const },
    { name: 'Thermal Simulation Tool', programId: progRnD.id, status: 'planned' as const },
    { name: 'Customer Portal v2', programId: null, status: 'active' as const },
  ];

  const projects = await db
    .insert(s.projects)
    .values(projectDefs.map((p) => ({ organizationId: orgId, ...p })))
    .returning();
  console.log('✓ 10 projects (across 3 programs + 1 standalone)');

  const [
    projECU,
    projBMS,
    projSensor,
    projChassis,
    projCICD,
    projTestRig,
    projLegacy,
    projAIDiag,
    projThermal,
    projPortal,
  ] = projects;

  // -----------------------------------------------------------------------
  // 5. People (18)
  // -----------------------------------------------------------------------
  const peopleDefs = [
    // Software Engineering (5)
    { firstName: 'Marcus', lastName: 'Holm', disc: discSW, dept: deptSW, hours: 160 },
    { firstName: 'Anna', lastName: 'Johansson', disc: discSW, dept: deptSW, hours: 160 },
    { firstName: 'Oskar', lastName: 'Nilsson', disc: discSW, dept: deptSW, hours: 160 },
    { firstName: 'Frida', lastName: 'Eriksson', disc: discFW, dept: deptSW, hours: 160 },
    { firstName: 'Johan', lastName: 'Lund', disc: discFW, dept: deptSW, hours: 120 },
    // Electronics (3)
    { firstName: 'Sara', lastName: 'Bergman', disc: discElnik, dept: deptElec, hours: 160 },
    { firstName: 'Nils', lastName: 'Forsberg', disc: discElnik, dept: deptElec, hours: 160 },
    { firstName: 'Karin', lastName: 'Svensson', disc: discElnik, dept: deptElec, hours: 140 },
    // Mechanical Engineering (4)
    { firstName: 'Erik', lastName: 'Lindgren', disc: discMek, dept: deptMech, hours: 160 },
    { firstName: 'Maja', lastName: 'Andersson', disc: discMek, dept: deptMech, hours: 160 },
    { firstName: 'Lars', lastName: 'Pettersson', disc: discMek, dept: deptMech, hours: 160 },
    { firstName: 'Astrid', lastName: 'Dahl', disc: discMek, dept: deptMech, hours: 120 },
    // Test & Verification (3)
    { firstName: 'Lisa', lastName: 'Nystrom', disc: discTest, dept: deptTest, hours: 160 },
    { firstName: 'Anders', lastName: 'Karlsson', disc: discTest, dept: deptTest, hours: 160 },
    { firstName: 'Elin', lastName: 'Hedlund', disc: discTest, dept: deptTest, hours: 140 },
    // Systems Engineering (3)
    { firstName: 'Henrik', lastName: 'Wallin', disc: discSys, dept: deptSys, hours: 160 },
    { firstName: 'Lovisa', lastName: 'Strom', disc: discSys, dept: deptSys, hours: 160 },
    { firstName: 'Gustav', lastName: 'Bjork', disc: discSys, dept: deptSys, hours: 140 },
  ];

  const peopleRows = await db
    .insert(s.people)
    .values(
      peopleDefs.map((p, i) => ({
        organizationId: orgId,
        firstName: p.firstName,
        lastName: p.lastName,
        disciplineId: p.disc.id,
        departmentId: p.dept.id,
        targetHoursPerMonth: p.hours,
        sortOrder: i,
      })),
    )
    .returning();
  console.log('✓ 18 people (across 5 departments, 6 disciplines)');

  // Index people by name for allocation assignment
  const ppl: Record<string, (typeof peopleRows)[0]> = {};
  for (const p of peopleRows) {
    ppl[`${p.firstName} ${p.lastName}`] = p;
  }

  // -----------------------------------------------------------------------
  // 6. Allocations — 12 months: Jan 2026 → Dec 2026
  //    Creates realistic spread with some overloading and gaps
  // -----------------------------------------------------------------------
  type AllocRow = {
    personId: string;
    projectId: string;
    month: string;
    hours: number;
  };
  const allocs: AllocRow[] = [];

  // Helper: add allocation range
  function addRange(
    person: string,
    project: (typeof projects)[0],
    startMonth: number,
    endMonth: number,
    hours: number,
  ) {
    const p = ppl[person];
    if (!p) throw new Error(`Person not found: ${person}`);
    for (let mo = startMonth; mo <= endMonth; mo++) {
      allocs.push({ personId: p.id, projectId: project.id, month: m(2026, mo), hours });
    }
  }

  // --- Software team allocations ---
  addRange('Marcus Holm', projECU, 1, 6, 80);
  addRange('Marcus Holm', projCICD, 1, 4, 40);
  addRange('Marcus Holm', projPortal, 5, 9, 60);
  addRange('Marcus Holm', projAIDiag, 7, 12, 80);

  addRange('Anna Johansson', projBMS, 1, 8, 80);
  addRange('Anna Johansson', projSensor, 1, 6, 80);
  addRange('Anna Johansson', projPortal, 9, 12, 120);

  addRange('Oskar Nilsson', projPortal, 1, 12, 80);
  addRange('Oskar Nilsson', projCICD, 1, 6, 60);
  addRange('Oskar Nilsson', projLegacy, 7, 12, 80);

  addRange('Frida Eriksson', projECU, 1, 12, 120);
  addRange('Frida Eriksson', projBMS, 3, 8, 40);

  addRange('Johan Lund', projECU, 1, 9, 80);
  addRange('Johan Lund', projSensor, 4, 12, 40);

  // --- Electronics team ---
  addRange('Sara Bergman', projBMS, 1, 12, 100);
  addRange('Sara Bergman', projSensor, 1, 6, 60);
  addRange('Sara Bergman', projAIDiag, 7, 10, 40);

  addRange('Nils Forsberg', projECU, 1, 8, 80);
  addRange('Nils Forsberg', projSensor, 1, 12, 80);

  addRange('Karin Svensson', projBMS, 1, 6, 80);
  addRange('Karin Svensson', projAIDiag, 4, 12, 60);

  // --- Mechanical team ---
  addRange('Erik Lindgren', projChassis, 1, 12, 80);
  addRange('Erik Lindgren', projBMS, 1, 6, 60);
  addRange('Erik Lindgren', projThermal, 7, 12, 40);

  addRange('Maja Andersson', projChassis, 1, 12, 120);
  addRange('Maja Andersson', projECU, 3, 8, 40);

  addRange('Lars Pettersson', projChassis, 4, 12, 80);
  addRange('Lars Pettersson', projTestRig, 1, 6, 80);
  addRange('Lars Pettersson', projThermal, 1, 3, 80);

  addRange('Astrid Dahl', projThermal, 1, 12, 60);
  addRange('Astrid Dahl', projChassis, 6, 12, 60);

  // --- Test team ---
  addRange('Lisa Nystrom', projTestRig, 1, 12, 80);
  addRange('Lisa Nystrom', projECU, 3, 9, 60);
  addRange('Lisa Nystrom', projBMS, 1, 4, 40);

  addRange('Anders Karlsson', projTestRig, 1, 12, 80);
  addRange('Anders Karlsson', projSensor, 4, 12, 80);

  addRange('Elin Hedlund', projBMS, 1, 8, 80);
  addRange('Elin Hedlund', projECU, 6, 12, 60);

  // --- Systems team ---
  addRange('Henrik Wallin', projSensor, 1, 12, 60);
  addRange('Henrik Wallin', projECU, 1, 6, 60);
  addRange('Henrik Wallin', projBMS, 7, 12, 60);
  addRange('Henrik Wallin', projChassis, 1, 4, 40);

  addRange('Lovisa Strom', projBMS, 1, 12, 80);
  addRange('Lovisa Strom', projAIDiag, 1, 12, 60);
  addRange('Lovisa Strom', projCICD, 1, 4, 20);

  addRange('Gustav Bjork', projLegacy, 1, 8, 80);
  addRange('Gustav Bjork', projCICD, 1, 12, 40);
  addRange('Gustav Bjork', projPortal, 9, 12, 60);

  // Insert all allocations
  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < allocs.length; i += batchSize) {
    const batch = allocs.slice(i, i + batchSize);
    await db.insert(s.allocations).values(batch.map((a) => ({ organizationId: orgId, ...a })));
    inserted += batch.length;
  }
  console.log(`✓ ${inserted} allocations (Jan–Dec 2026)`);

  // -----------------------------------------------------------------------
  // 7. Dashboard layout — pre-populate with 8 widgets
  // -----------------------------------------------------------------------
  const managerLayout = [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'utilization-heat-map', position: 1, colSpan: 12 },
    { widgetId: 'capacity-gauges', position: 2, colSpan: 6 },
    { widgetId: 'department-bar-chart', position: 3, colSpan: 6 },
    { widgetId: 'allocation-trends', position: 4, colSpan: 6 },
    { widgetId: 'discipline-distribution', position: 5, colSpan: 6 },
    { widgetId: 'availability-finder', position: 6, colSpan: 6 },
    { widgetId: 'resource-conflicts', position: 7, colSpan: 6 },
  ];

  await db
    .insert(s.dashboardLayouts)
    .values({
      organizationId: orgId,
      clerkUserId: '__tenant_default__',
      dashboardId: 'manager',
      deviceClass: 'desktop',
      layout: managerLayout,
      version: 1,
    })
    .onConflictDoUpdate({
      target: [
        s.dashboardLayouts.organizationId,
        s.dashboardLayouts.clerkUserId,
        s.dashboardLayouts.dashboardId,
        s.dashboardLayouts.deviceClass,
      ],
      set: { layout: managerLayout, updatedAt: sql`now()` },
    });
  console.log('✓ Dashboard layout (8 widgets for manager view)');

  // -----------------------------------------------------------------------
  // 8. Scenarios (2) — for demo
  // -----------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scenarioA, _scenarioB] = await db
    .insert(s.scenarios)
    .values([
      {
        organizationId: orgId,
        name: 'Q3 Hiring Plan',
        description:
          'What if we hire 2 additional SW engineers in July? Simulates impact on ECU and Portal projects.',
        status: 'active',
        visibility: 'shared_readonly',
        createdBy: 'demo_user',
      },
      {
        organizationId: orgId,
        name: 'Chassis Delay Impact',
        description:
          'Models the impact of delaying Chassis Redesign 2027 by 3 months. Frees up mechanical team for BMS.',
        status: 'draft',
        visibility: 'private',
        createdBy: 'demo_user',
      },
    ])
    .returning();
  console.log('✓ 2 scenarios');

  // Add some scenario allocations for Scenario A (modified existing + new hire)
  const scenAAllocs = [];
  // Modified: Marcus gets 40h more on Portal in Q3
  for (let mo = 7; mo <= 9; mo++) {
    scenAAllocs.push({
      scenarioId: scenarioA.id,
      organizationId: orgId,
      personId: ppl['Marcus Holm'].id,
      projectId: projPortal.id,
      month: m(2026, mo),
      hours: 100,
      isModified: true,
      isNew: false,
      isRemoved: false,
    });
  }
  if (scenAAllocs.length > 0) {
    await db.insert(s.scenarioAllocations).values(scenAAllocs);
  }

  // Add a temp entity (hypothetical new hire)
  await db.insert(s.scenarioTempEntities).values([
    {
      scenarioId: scenarioA.id,
      organizationId: orgId,
      entityType: 'person',
      name: 'New Hire — SW Engineer',
      departmentId: deptSW.id,
      disciplineId: discSW.id,
      targetHoursPerMonth: 160,
    },
    {
      scenarioId: scenarioA.id,
      organizationId: orgId,
      entityType: 'person',
      name: 'New Hire — FW Engineer',
      departmentId: deptSW.id,
      disciplineId: discFW.id,
      targetHoursPerMonth: 160,
    },
  ]);
  console.log('✓ Scenario allocations + 2 temp entities');

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log(`
✅ Demo seed complete!
   • 5 departments, 6 disciplines, 3 programs
   • 10 projects across Vehicle Platform, Infrastructure, R&D
   • 18 people across all departments
   • ${inserted} allocations spanning Jan–Dec 2026
   • Dashboard layout with 8 widgets pre-configured
   • 2 scenarios with allocations and hypothetical hires

Refresh the app to see the data.`);
}

seedDemo()
  .catch(console.error)
  .finally(() => process.exit(0));
