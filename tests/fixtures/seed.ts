// v5.0 — Phase 44 / Plan 44-14 (TEST-V5-02): deterministic seed bundle.
//
// `buildSeed(namespace)` is a pure-data generator: no I/O, no clock reads,
// no randomness. Every call with the same `namespace` argument produces a
// byte-for-byte identical SeedBundle. This is the contract asserted by
// `tests/fixtures/seed.deterministic.test.ts` (TEST-V5-02).
//
// Follows ARCHITECTURE.md §16.1–§16.7. All IDs are generated via
// `uuidv5(key, namespace)` from the standard `uuid` npm package. Keys are
// stable, human-readable strings like `'seed:person:anna'` so the resulting
// UUIDs are reproducible from the key alone — no hidden state.
//
// Integration tests import `buildSeed()` in `beforeAll`, load the bundle
// into PGlite, and then assert against the known IDs / rows. Because the
// bundle is pure data, test authors can freely inspect / filter / extend
// it without worrying about mutating a shared fixture.

import { v5 as uuidv5 } from 'uuid';

import { FIXTURE_NS } from './namespace';

// ---------------------------------------------------------------------------
// Types — mirrors ARCHITECTURE §16 table columns used by integration tests.
// ---------------------------------------------------------------------------

export type SeedPerson = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  departmentSlug: string;
  disciplineName: string;
};

export type SeedDepartment = {
  id: string;
  slug: string;
  name: string;
};

export type SeedProject = {
  id: string;
  slug: string;
  name: string;
  leadPmPersonId: string | null;
  archived: boolean;
};

export type SeedAllocation = {
  id: string;
  personId: string;
  projectId: string;
  monthKey: string; // 'YYYY-MM'
  hours: number;
};

export type SeedActual = {
  id: string;
  personId: string;
  projectId: string;
  date: string; // 'YYYY-MM-DD'
  hours: number;
};

export type SeedProposal = {
  id: string;
  proposerPersonId: string;
  targetPersonId: string;
  projectId: string;
  monthKey: string;
  hours: number;
  status: 'proposed' | 'approved' | 'rejected' | 'withdrawn';
  reason: string | null;
};

export type SeedBatch = {
  id: string;
  fileName: string;
  committedAt: string | null; // ISO timestamp or null for staged
  rowsInserted: number;
};

export type SeedBundle = {
  people: SeedPerson[];
  departments: SeedDepartment[];
  projects: SeedProject[];
  allocations: SeedAllocation[];
  actuals: SeedActual[];
  proposals: SeedProposal[];
  batches: SeedBatch[];
};

// ---------------------------------------------------------------------------
// Static tables — frozen copies of ARCHITECTURE §16.1–§16.3.
// ---------------------------------------------------------------------------

const PEOPLE: ReadonlyArray<{
  slug: string;
  firstName: string;
  lastName: string;
  departmentSlug: string;
  disciplineName: string;
}> = [
  { slug: 'anna', firstName: 'Anna', lastName: 'Lindqvist', departmentSlug: 'software-design', disciplineName: 'Software Engineer' },
  { slug: 'per', firstName: 'Per', lastName: 'Karlsson', departmentSlug: 'electronics-design', disciplineName: 'Electronics Engineer' },
  { slug: 'sara', firstName: 'Sara', lastName: 'Berg', departmentSlug: 'electronics-design', disciplineName: 'Electronics Engineer' },
  { slug: 'erik', firstName: 'Erik', lastName: 'Svensson', departmentSlug: 'electronics-design', disciplineName: 'Electronics Engineer' },
  { slug: 'karin', firstName: 'Karin', lastName: 'Johansson', departmentSlug: 'management', disciplineName: 'Management' },
  { slug: 'janne', firstName: 'Janne', lastName: 'Holm', departmentSlug: 'management', disciplineName: 'Management' },
] as const;

const DEPARTMENTS: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: 'software-design', name: 'Software Design' },
  { slug: 'electronics-design', name: 'Electronics Design' },
  { slug: 'mechanical-design', name: 'Mechanical Design' },
  { slug: 'management', name: 'Management' },
] as const;

const PROJECTS: ReadonlyArray<{
  slug: string;
  name: string;
  leadPmSlug: string | null;
  archived: boolean;
}> = [
  { slug: 'nordlys', name: 'Nordlys', leadPmSlug: 'anna', archived: false },
  { slug: 'aurora', name: 'Aurora', leadPmSlug: 'anna', archived: false },
  { slug: 'stella', name: 'Stella', leadPmSlug: null, archived: false },
  { slug: 'forsen', name: 'Forsen', leadPmSlug: 'anna', archived: true },
] as const;

// Primary / secondary assignments for the allocation generator (§16.4).
// 40h / month on primary, 20h on secondary, 0 elsewhere.
const PRIMARY: Record<string, string> = {
  anna: 'nordlys',
  per: 'nordlys',
  sara: 'nordlys',
  erik: 'nordlys',
  karin: 'aurora',
  janne: 'aurora',
};
const SECONDARY: Record<string, string> = {
  anna: 'aurora',
  per: 'aurora',
  sara: 'aurora',
  erik: 'aurora',
  karin: 'nordlys',
  janne: 'nordlys',
};

// ---------------------------------------------------------------------------
// Pure date helpers — no Date.now, no new Date().
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** All month keys from YYYY-MM..YYYY-MM inclusive, lexicographic order. */
function monthKeysBetween(startYear: number, startMonth: number, endYear: number, endMonth: number): string[] {
  const out: string[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    out.push(`${y}-${pad2(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Days-in-month for Gregorian calendar without touching Date. */
function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

/**
 * All ISO date strings (YYYY-MM-DD) from start..end inclusive, lexicographic.
 * Pure: uses only arithmetic, no Date object.
 */
function datesBetween(
  startY: number, startM: number, startD: number,
  endY: number, endM: number, endD: number,
): string[] {
  const out: string[] = [];
  let y = startY, m = startM, d = startD;
  while (y < endY || (y === endY && m < endM) || (y === endY && m === endM && d <= endD)) {
    out.push(`${y}-${pad2(m)}-${pad2(d)}`);
    d += 1;
    if (d > daysInMonth(y, m)) {
      d = 1;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }
  return out;
}

/** Mon=1..Sun=7 via Zeller-adjacent pure arithmetic; no Date. */
function isoDayOfWeek(y: number, m: number, d: number): number {
  // Sakamoto's algorithm → Sunday=0..Saturday=6; shift to ISO Mon=1..Sun=7.
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yr = m < 3 ? y - 1 : y;
  const dow = (yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) + t[m - 1] + d) % 7;
  return dow === 0 ? 7 : dow;
}

// ---------------------------------------------------------------------------
// buildSeed — THE deterministic generator.
// ---------------------------------------------------------------------------

export function buildSeed(namespace: string = FIXTURE_NS): SeedBundle {
  // --- Departments --------------------------------------------------------
  const departments: SeedDepartment[] = DEPARTMENTS.map((d) => ({
    id: uuidv5(`seed:department:${d.slug}`, namespace),
    slug: d.slug,
    name: d.name,
  }));

  // --- People -------------------------------------------------------------
  const people: SeedPerson[] = PEOPLE.map((p) => ({
    id: uuidv5(`seed:person:${p.slug}`, namespace),
    slug: p.slug,
    firstName: p.firstName,
    lastName: p.lastName,
    departmentSlug: p.departmentSlug,
    disciplineName: p.disciplineName,
  }));
  const personIdBySlug = new Map(people.map((p) => [p.slug, p.id]));

  // --- Projects -----------------------------------------------------------
  const projects: SeedProject[] = PROJECTS.map((pr) => ({
    id: uuidv5(`seed:project:${pr.slug}`, namespace),
    slug: pr.slug,
    name: pr.name,
    leadPmPersonId: pr.leadPmSlug ? personIdBySlug.get(pr.leadPmSlug) ?? null : null,
    archived: pr.archived,
  }));
  const projectIdBySlug = new Map(projects.map((pr) => [pr.slug, pr.id]));

  // --- Allocations (§16.4) ------------------------------------------------
  // 2026-01..2027-12 inclusive = 24 months. 40h primary, 20h secondary.
  const monthKeys = monthKeysBetween(2026, 1, 2027, 12);
  const allocations: SeedAllocation[] = [];
  for (const p of PEOPLE) {
    const primaryProjectSlug = PRIMARY[p.slug];
    const secondaryProjectSlug = SECONDARY[p.slug];
    for (const mk of monthKeys) {
      // Primary
      if (primaryProjectSlug) {
        allocations.push({
          id: uuidv5(`seed:allocation:${p.slug}:${primaryProjectSlug}:${mk}`, namespace),
          personId: personIdBySlug.get(p.slug)!,
          projectId: projectIdBySlug.get(primaryProjectSlug)!,
          monthKey: mk,
          hours: 40,
        });
      }
      // Secondary
      if (secondaryProjectSlug) {
        allocations.push({
          id: uuidv5(`seed:allocation:${p.slug}:${secondaryProjectSlug}:${mk}`, namespace),
          personId: personIdBySlug.get(p.slug)!,
          projectId: projectIdBySlug.get(secondaryProjectSlug)!,
          monthKey: mk,
          hours: 20,
        });
      }
    }
  }

  // --- Actuals (§16.5) ---------------------------------------------------
  // Day-grain 2026-01-01..2026-04-06. One row per (person, primaryProject,
  // working day). Working day = ISO Mon-Fri. Planned daily rate = 8h.
  const actualDates = datesBetween(2026, 1, 1, 2026, 4, 6);
  const actuals: SeedActual[] = [];
  for (const p of PEOPLE) {
    const primarySlug = PRIMARY[p.slug];
    if (!primarySlug) continue;
    const personId = personIdBySlug.get(p.slug)!;
    const projectId = projectIdBySlug.get(primarySlug)!;
    for (const date of actualDates) {
      const [ys, ms, ds] = date.split('-');
      const dow = isoDayOfWeek(Number(ys), Number(ms), Number(ds));
      if (dow > 5) continue; // skip Sat/Sun
      actuals.push({
        id: uuidv5(`seed:actual:${p.slug}:${primarySlug}:${date}`, namespace),
        personId,
        projectId,
        date,
        hours: 8,
      });
    }
  }

  // --- Proposals (§16.6) --------------------------------------------------
  // 1 rejected (sara/nordlys/2026-06, 60h) + 2 pending targeting Per's dept.
  const proposals: SeedProposal[] = [
    {
      id: uuidv5('seed:proposal:sara:nordlys:2026-06:rejected', namespace),
      proposerPersonId: personIdBySlug.get('anna')!,
      targetPersonId: personIdBySlug.get('sara')!,
      projectId: projectIdBySlug.get('nordlys')!,
      monthKey: '2026-06',
      hours: 60,
      status: 'rejected',
      reason: 'Sara has another commitment — can offer 40h max.',
    },
    {
      id: uuidv5('seed:proposal:erik:aurora:2026-07:proposed', namespace),
      proposerPersonId: personIdBySlug.get('anna')!,
      targetPersonId: personIdBySlug.get('erik')!,
      projectId: projectIdBySlug.get('aurora')!,
      monthKey: '2026-07',
      hours: 30,
      status: 'proposed',
      reason: null,
    },
    {
      id: uuidv5('seed:proposal:sara:aurora:2026-08:proposed', namespace),
      proposerPersonId: personIdBySlug.get('anna')!,
      targetPersonId: personIdBySlug.get('sara')!,
      projectId: projectIdBySlug.get('aurora')!,
      monthKey: '2026-08',
      hours: 20,
      status: 'proposed',
      reason: null,
    },
  ];

  // --- Batches (§16.7) ----------------------------------------------------
  // 1 committed (within rollback window) + 1 staged.
  const batches: SeedBatch[] = [
    {
      id: uuidv5('seed:batch:committed:2026-04-01', namespace),
      fileName: 'actuals-2026-W13.xlsx',
      committedAt: '2026-04-01T08:00:00.000Z',
      rowsInserted: 30,
    },
    {
      id: uuidv5('seed:batch:staged:2026-04-07', namespace),
      fileName: 'actuals-row-per-entry.xlsx',
      committedAt: null,
      rowsInserted: 342,
    },
  ];

  return { people, departments, projects, allocations, actuals, proposals, batches };
}
