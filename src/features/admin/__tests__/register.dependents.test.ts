// v5.0 — Phase 43 / Plan 43-01: dependent-row blocker tests (TC-REG-003..007).
//
// One describe block per entity. Each verifies that archiveRegisterRow throws
// ConflictError('DEPENDENT_ROWS_EXIST', { entity, id, blockers }) when the
// blocker condition is present, and succeeds when it is not.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import * as schema from '@/db/schema';

import {
  ORG_ID,
  initRegisterTestDb,
  resetRegisterTestDb,
  nextMonthKey,
} from './register.test-fixtures';

const pg = new PGlite();
const testDb = drizzle(pg, { schema });

vi.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const registerSvcPromise = import('../register.service');

beforeAll(async () => {
  await initRegisterTestDb(testDb);
});

beforeEach(async () => {
  await resetRegisterTestDb(testDb);
});

async function seedDept(name = 'Dept A'): Promise<string> {
  const [row] = await testDb
    .insert(schema.departments)
    .values({ organizationId: ORG_ID, name })
    .returning();
  return row.id;
}
async function seedDisc(name = 'Disc A', abbr = 'DA'): Promise<string> {
  const [row] = await testDb
    .insert(schema.disciplines)
    .values({ organizationId: ORG_ID, name, abbreviation: abbr })
    .returning();
  return row.id;
}
async function seedProgram(name = 'Prog A'): Promise<string> {
  const [row] = await testDb
    .insert(schema.programs)
    .values({ organizationId: ORG_ID, name })
    .returning();
  return row.id;
}
async function seedPerson(opts?: { dept?: string; disc?: string; first?: string }) {
  const dept = opts?.dept ?? (await seedDept('D-' + Math.random().toString(36).slice(2, 6)));
  const disc =
    opts?.disc ??
    (await seedDisc(
      'Di-' + Math.random().toString(36).slice(2, 6),
      'D' + Math.floor(Math.random() * 99),
    ));
  const [row] = await testDb
    .insert(schema.people)
    .values({
      organizationId: ORG_ID,
      firstName: opts?.first ?? 'Anna',
      lastName: 'Test',
      departmentId: dept,
      disciplineId: disc,
      targetHoursPerMonth: 160,
    })
    .returning();
  return { person: row, dept, disc };
}
async function seedProject(opts?: { name?: string; programId?: string; leadPm?: string }) {
  const [row] = await testDb
    .insert(schema.projects)
    .values({
      organizationId: ORG_ID,
      name: opts?.name ?? 'Proj-' + Math.random().toString(36).slice(2, 6),
      programId: opts?.programId ?? null,
      leadPmPersonId: opts?.leadPm ?? null,
    })
    .returning();
  return row;
}

async function expectConflict(promise: Promise<unknown>, expectedBlockerKey: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeDefined();
  const err = caught as {
    code: string;
    message: string;
    details?: { blockers?: Record<string, number> };
  };
  expect(err.code).toBe('ERR_CONFLICT');
  expect(err.message).toBe('DEPENDENT_ROWS_EXIST');
  expect(err.details?.blockers).toBeDefined();
  expect((err.details?.blockers ?? {})[expectedBlockerKey]).toBeGreaterThan(0);
}

// ===========================================================================
// person
// ===========================================================================

describe('TC-REG-003 — person dependent-row blockers', () => {
  it('blocks when person has future allocations', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const { person, dept, disc } = await seedPerson();
    const project = await seedProject();
    await testDb.insert(schema.allocations).values({
      organizationId: ORG_ID,
      personId: person.id,
      projectId: project.id,
      month: nextMonthKey(),
      hours: 80,
    });
    await expectConflict(
      archiveRegisterRow({ orgId: ORG_ID, actorUserId: 'admin', entity: 'person', id: person.id }),
      'allocations',
    );
    void dept;
    void disc;
  });

  it('blocks when person is lead PM on a non-archived project', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const { person } = await seedPerson({ first: 'PM' });
    await seedProject({ name: 'P-led', leadPm: person.id });
    await expectConflict(
      archiveRegisterRow({ orgId: ORG_ID, actorUserId: 'admin', entity: 'person', id: person.id }),
      'leadPm',
    );
  });

  it('blocks when person has active proposals', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const { person, dept } = await seedPerson({ first: 'Prop' });
    const project = await seedProject();
    await testDb.insert(schema.allocationProposals).values({
      organizationId: ORG_ID,
      personId: person.id,
      projectId: project.id,
      month: nextMonthKey(),
      proposedHours: '40',
      requestedBy: 'pm_1',
      targetDepartmentId: dept,
      status: 'proposed',
    });
    await expectConflict(
      archiveRegisterRow({ orgId: ORG_ID, actorUserId: 'admin', entity: 'person', id: person.id }),
      'proposals',
    );
  });

  it('happy path: archives a person with no dependents', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const { person } = await seedPerson({ first: 'Lone' });
    const result = await archiveRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'person',
      id: person.id,
    });
    expect((result as { archivedAt: Date | null }).archivedAt).toBeTruthy();
  });
});

// ===========================================================================
// project
// ===========================================================================

describe('TC-REG-004 — project dependent-row blockers', () => {
  it('blocks when project has future allocations', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const { person } = await seedPerson({ first: 'A' });
    const project = await seedProject({ name: 'AllocProj' });
    await testDb.insert(schema.allocations).values({
      organizationId: ORG_ID,
      personId: person.id,
      projectId: project.id,
      month: nextMonthKey(),
      hours: 40,
    });
    await expectConflict(
      archiveRegisterRow({
        orgId: ORG_ID,
        actorUserId: 'admin',
        entity: 'project',
        id: project.id,
      }),
      'allocations',
    );
  });

  it('blocks when project has active proposals', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const { person, dept } = await seedPerson({ first: 'B' });
    const project = await seedProject({ name: 'PropProj' });
    await testDb.insert(schema.allocationProposals).values({
      organizationId: ORG_ID,
      personId: person.id,
      projectId: project.id,
      month: nextMonthKey(),
      proposedHours: '20',
      requestedBy: 'pm_1',
      targetDepartmentId: dept,
      status: 'proposed',
    });
    await expectConflict(
      archiveRegisterRow({
        orgId: ORG_ID,
        actorUserId: 'admin',
        entity: 'project',
        id: project.id,
      }),
      'proposals',
    );
  });

  it('happy path: archives a project with no dependents', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const project = await seedProject({ name: 'Lone' });
    const result = await archiveRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'project',
      id: project.id,
    });
    expect((result as { status: string }).status).toBe('archived');
  });
});

// ===========================================================================
// department
// ===========================================================================

describe('TC-REG-005 — department dependent-row blockers', () => {
  it('blocks when department has non-archived people', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const dept = await seedDept('Engineering');
    const disc = await seedDisc();
    await testDb.insert(schema.people).values({
      organizationId: ORG_ID,
      firstName: 'X',
      lastName: 'Y',
      departmentId: dept,
      disciplineId: disc,
    });
    await expectConflict(
      archiveRegisterRow({ orgId: ORG_ID, actorUserId: 'admin', entity: 'department', id: dept }),
      'people',
    );
  });

  it('happy path: archives an empty department', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const dept = await seedDept('Empty');
    const result = await archiveRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'department',
      id: dept,
    });
    expect((result as { archivedAt: Date | null }).archivedAt).toBeTruthy();
  });
});

// ===========================================================================
// discipline
// ===========================================================================

describe('TC-REG-006 — discipline dependent-row blockers', () => {
  it('blocks when discipline has non-archived people', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const dept = await seedDept('D');
    const disc = await seedDisc('Structural', 'STR');
    await testDb.insert(schema.people).values({
      organizationId: ORG_ID,
      firstName: 'X',
      lastName: 'Y',
      departmentId: dept,
      disciplineId: disc,
    });
    await expectConflict(
      archiveRegisterRow({ orgId: ORG_ID, actorUserId: 'admin', entity: 'discipline', id: disc }),
      'people',
    );
  });

  it('happy path: archives an empty discipline', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const disc = await seedDisc('Empty', 'EMP');
    const result = await archiveRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'discipline',
      id: disc,
    });
    expect((result as { archivedAt: Date | null }).archivedAt).toBeTruthy();
  });
});

// ===========================================================================
// program
// ===========================================================================

describe('TC-REG-007 — program dependent-row blockers', () => {
  it('blocks when program has non-archived projects', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const program = await seedProgram('Bridges');
    await seedProject({ name: 'B-1', programId: program });
    await expectConflict(
      archiveRegisterRow({ orgId: ORG_ID, actorUserId: 'admin', entity: 'program', id: program }),
      'projects',
    );
  });

  it('happy path: archives an empty program', async () => {
    const { archiveRegisterRow } = await registerSvcPromise;
    const program = await seedProgram('Empty');
    const result = await archiveRegisterRow({
      orgId: ORG_ID,
      actorUserId: 'admin',
      entity: 'program',
      id: program,
    });
    expect((result as { archivedAt: Date | null }).archivedAt).toBeTruthy();
  });
});
