// TEST-ONLY ROUTE — Phase 47-04.
//
// Triple-gated so it is impossible to hit in production:
//   1. MODULE-LEVEL throw if NODE_ENV === 'production' AND E2E_TEST !== '1'.
//      next build imports route handlers to inspect their exports — if this
//      file is ever part of a prod bundle, `next build` crashes loudly.
//   2. Runtime 404 if E2E_SEED_ENABLED !== '1' — defense in depth so a stray
//      NODE_ENV=test process in a shared environment still can't be reset
//      without explicit opt-in.
//   3. src/proxy.ts route matcher still applies. We deliberately do NOT add
//      /api/test/* to the public matcher, so even if (1) and (2) were
//      defeated, Clerk auth would still protect the route in any non-test
//      environment (proxy.ts only bypasses Clerk when NODE_ENV=test or
//      E2E_TEST=1 is already set).
//
// A fourth gate — static invariant test — asserts the route is absent from
// the .next/ production build output
// (tests/invariants/no-test-routes-in-prod.test.ts).
//
// ADR-004: this route exists ONLY for the E2E test tier.

if (process.env.NODE_ENV === 'production' && process.env.E2E_TEST !== '1') {
  throw new Error(
    '[api/test/seed] test-only route imported in production build',
  );
}

import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { v5 as uuidv5 } from 'uuid';

import { db } from '@/db';
import {
  actualEntries,
  allocationProposals,
  allocations,
  departments,
  disciplines,
  importBatches,
  importSessions,
  organizations,
  people,
  projects,
} from '@/db/schema';

import { buildSeed } from '../../../../../tests/fixtures/seed';
import { FIXTURE_NS } from '../../../../../tests/fixtures/namespace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Deterministic IDs for the wrapper rows that SeedBundle does not carry
// (the real schema requires org/discipline FKs; the bundle is organization-
// agnostic by design). Generated via the same FIXTURE_NS namespace as
// buildSeed(), so repeated POSTs produce byte-identical rows.
const E2E_ORG_ID = uuidv5('seed:e2e:organization', FIXTURE_NS);
const E2E_CLERK_ORG_ID = 'org_e2e_nordic_capacity';

// Discipline names used by PEOPLE in the seed bundle — we create one row
// per distinct disciplineName and index by name.
function disciplineIdFor(name: string): string {
  return uuidv5(`seed:discipline:${name}`, FIXTURE_NS);
}

function abbrFor(name: string): string {
  // Crude initials from the discipline name, capped at 10 chars.
  const initials = name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return initials.slice(0, 10) || name.slice(0, 10);
}

export async function POST(): Promise<Response> {
  if (process.env.E2E_SEED_ENABLED !== '1') {
    return new NextResponse(null, { status: 404 });
  }

  const bundle = buildSeed();

  await db.transaction(async (tx) => {
    // Truncate every application table in a single statement. RESTART
    // IDENTITY is a no-op on uuid PKs but cheap; CASCADE takes care of any
    // table the bundle does not touch (e.g. change_log, scenarios).
    await tx.execute(/* sql */ `
      TRUNCATE TABLE
        "change_log",
        "allocation_proposals",
        "actual_entries",
        "import_batches",
        "import_sessions",
        "allocations",
        "projects",
        "people",
        "disciplines",
        "departments",
        "programs",
        "scenario_allocations",
        "scenario_temp_entities",
        "scenarios",
        "dashboard_layouts",
        "organizations"
      RESTART IDENTITY CASCADE
    `);

    // Organization — the E2E tenant. All rows below are scoped to it.
    await tx.insert(organizations).values({
      id: E2E_ORG_ID,
      clerkOrgId: E2E_CLERK_ORG_ID,
      name: 'Nordic Capacity E2E',
      slug: 'nc-e2e',
    });

    // Departments — bundle slug → real id, keyed by slug via uuidv5 so the
    // FK from `people.departmentId` is deterministic.
    const deptIdBySlug = new Map<string, string>();
    for (const d of bundle.departments) {
      deptIdBySlug.set(d.slug, d.id);
    }
    if (bundle.departments.length) {
      await tx.insert(departments).values(
        bundle.departments.map((d) => ({
          id: d.id,
          organizationId: E2E_ORG_ID,
          name: d.name,
        })),
      );
    }

    // Disciplines — the bundle tracks `disciplineName` per person, not a
    // dedicated discipline table. Derive the distinct set and insert.
    const distinctDisciplineNames = Array.from(
      new Set(bundle.people.map((p) => p.disciplineName)),
    );
    const disciplineIdByName = new Map<string, string>();
    for (const name of distinctDisciplineNames) {
      disciplineIdByName.set(name, disciplineIdFor(name));
    }
    if (distinctDisciplineNames.length) {
      await tx.insert(disciplines).values(
        distinctDisciplineNames.map((name) => ({
          id: disciplineIdByName.get(name)!,
          organizationId: E2E_ORG_ID,
          name,
          abbreviation: abbrFor(name),
        })),
      );
    }

    // People.
    if (bundle.people.length) {
      await tx.insert(people).values(
        bundle.people.map((p) => ({
          id: p.id,
          organizationId: E2E_ORG_ID,
          firstName: p.firstName,
          lastName: p.lastName,
          disciplineId: disciplineIdByName.get(p.disciplineName)!,
          departmentId: deptIdBySlug.get(p.departmentSlug)!,
        })),
      );
    }

    // Projects. leadPmPersonId is already a real person id (or null) from
    // the bundle's internal slug resolution.
    if (bundle.projects.length) {
      await tx.insert(projects).values(
        bundle.projects.map((pr) => ({
          id: pr.id,
          organizationId: E2E_ORG_ID,
          name: pr.name,
          leadPmPersonId: pr.leadPmPersonId,
          archivedAt: pr.archived ? new Date('2026-01-01T00:00:00.000Z') : null,
        })),
      );
    }

    // Allocations. Bundle stores monthKey as 'YYYY-MM'; schema expects a
    // date column — canonicalise to the first of the month.
    if (bundle.allocations.length) {
      await tx.insert(allocations).values(
        bundle.allocations.map((a) => ({
          id: a.id,
          organizationId: E2E_ORG_ID,
          personId: a.personId,
          projectId: a.projectId,
          month: `${a.monthKey}-01`,
          hours: a.hours,
        })),
      );
    }

    // Import sessions + import batches. Batches require a session FK; the
    // bundle only tracks batch-level metadata, so synthesise one session
    // per batch with a deterministic id.
    if (bundle.batches.length) {
      const sessionRows = bundle.batches.map((b) => ({
        id: uuidv5(`seed:import_session:${b.id}`, FIXTURE_NS),
        organizationId: E2E_ORG_ID,
        userId: 'e2e_seed_user',
        fileName: b.fileName,
        status: 'committed' as const,
        rowCount: b.rowsInserted,
        expiresAt: new Date('2099-12-31T00:00:00.000Z'),
      }));
      await tx.insert(importSessions).values(sessionRows);
      await tx.insert(importBatches).values(
        bundle.batches.map((b, i) => ({
          id: b.id,
          organizationId: E2E_ORG_ID,
          importSessionId: sessionRows[i]!.id,
          fileName: b.fileName,
          committedBy: 'e2e_seed_user',
          committedAt: b.committedAt
            ? new Date(b.committedAt)
            : new Date('2026-04-01T00:00:00.000Z'),
          overrideManualEdits: false,
          rowsInserted: b.rowsInserted,
          rowsUpdated: 0,
          rowsSkippedManual: 0,
        })),
      );
    }

    // Actual entries. Bundle date is YYYY-MM-DD, matches schema.
    if (bundle.actuals.length) {
      await tx.insert(actualEntries).values(
        bundle.actuals.map((a) => ({
          id: a.id,
          organizationId: E2E_ORG_ID,
          personId: a.personId,
          projectId: a.projectId,
          date: a.date,
          hours: String(a.hours),
          source: 'manual' as const,
        })),
      );
    }

    // Allocation proposals. targetDepartmentId is required by schema but
    // not in the bundle — derive from the target person's department.
    if (bundle.proposals.length) {
      const deptIdByPersonId = new Map<string, string>();
      for (const p of bundle.people) {
        deptIdByPersonId.set(p.id, deptIdBySlug.get(p.departmentSlug)!);
      }
      await tx.insert(allocationProposals).values(
        bundle.proposals.map((pr) => ({
          id: pr.id,
          organizationId: E2E_ORG_ID,
          personId: pr.targetPersonId,
          projectId: pr.projectId,
          month: `${pr.monthKey}-01`,
          proposedHours: String(pr.hours),
          note: null,
          status: pr.status,
          rejectionReason: pr.status === 'rejected' ? pr.reason : null,
          requestedBy: pr.proposerPersonId,
          decidedBy: pr.status === 'proposed' ? null : 'e2e_seed_user',
          decidedAt:
            pr.status === 'proposed'
              ? null
              : new Date('2026-04-01T00:00:00.000Z'),
          targetDepartmentId: deptIdByPersonId.get(pr.targetPersonId)!,
        })),
      );
    }
  });

  // `randomUUID` is referenced only to keep the import tree-shake-safe
  // in case a future refactor needs an ambient uuid; cheap & side-effect free.
  void randomUUID;

  return NextResponse.json({
    ok: true,
    orgId: E2E_ORG_ID,
    counts: {
      departments: bundle.departments.length,
      people: bundle.people.length,
      projects: bundle.projects.length,
      allocations: bundle.allocations.length,
      actuals: bundle.actuals.length,
      proposals: bundle.proposals.length,
      batches: bundle.batches.length,
    },
  });
}
