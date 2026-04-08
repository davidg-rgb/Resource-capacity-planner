// v5.0 — Phase 40 / Plan 40-02: PM read-model helpers.
//
// First concrete file in the `planning` feature folder (ARCHITECTURE §327).
// Pure read functions (no mutations) that compose existing helpers:
//   - getProjectBurn / aggregateByMonth from features/actuals/actuals.read
//   - listProposals from features/proposals/proposal.service
//
// Tenant scope is enforced by always filtering on organizationId first.

import { and, eq, gte, inArray, lte } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';

import { aggregateByMonth, getProjectBurn } from '@/features/actuals/actuals.read';
import { listProposals } from '@/features/proposals/proposal.service';
import { NotFoundError } from '@/lib/errors';
import { generateMonthRange, normalizeMonth } from '@/lib/date-utils';

// ---------------------------------------------------------------------------
// PM Home — overview cards
// ---------------------------------------------------------------------------

export interface PmOverviewCard {
  project: { id: string; name: string; code: string | null };
  burn: { plannedTotalHours: number; actualTotalHours: number; deltaHours: number };
  pendingWishes: number;
}

export interface PmOverviewResult {
  projects: PmOverviewCard[];
  defaultProjectId: string | null;
}

/**
 * Convert a 'YYYY-MM' monthKey to an inclusive { from, to } date range
 * suitable for `getProjectBurn` (which compares against `allocations.month`
 * date-typed columns). `from` is the first day of the `from` month, `to` is
 * the last day of the `to` month.
 */
function monthRangeToDateRange(monthRange: { from: string; to: string }): {
  from: string;
  to: string;
} {
  const fromDate = `${monthRange.from}-01`;
  const [toYearStr, toMonthStr] = monthRange.to.split('-');
  const toYear = Number(toYearStr);
  const toMonth = Number(toMonthStr);
  const lastDay = new Date(Date.UTC(toYear, toMonth, 0)).getUTCDate();
  const toDate = `${monthRange.to}-${String(lastDay).padStart(2, '0')}`;
  return { from: fromDate, to: toDate };
}

/**
 * Count inclusive months between two 'YYYY-MM' strings.
 */
function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}

/**
 * Expand a { from, to } monthKey range into an array of monthKeys.
 */
export function expandMonthRange(from: string, to: string): string[] {
  const count = monthsBetween(from, to);
  return generateMonthRange(from, count);
}

export async function getPmOverview(args: {
  orgId: string;
  leadPmPersonId: string;
  monthRange: { from: string; to: string }; // 'YYYY-MM'
}): Promise<PmOverviewResult> {
  const dateRange = monthRangeToDateRange(args.monthRange);

  const projectRows = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.organizationId, args.orgId),
        eq(schema.projects.leadPmPersonId, args.leadPmPersonId),
      ),
    );

  const cards: PmOverviewCard[] = await Promise.all(
    projectRows.map(async (p) => {
      const [burn, pending] = await Promise.all([
        getProjectBurn(args.orgId, p.id, dateRange),
        listProposals({ orgId: args.orgId, projectId: p.id, status: 'proposed' }),
      ]);
      return {
        project: { id: p.id, name: p.name, code: null },
        burn: {
          plannedTotalHours: burn.plannedHours,
          actualTotalHours: burn.actualHours,
          deltaHours: burn.actualHours - burn.plannedHours,
        },
        pendingWishes: pending.length,
      };
    }),
  );

  return {
    projects: cards,
    defaultProjectId: cards[0]?.project.id ?? null,
  };
}

// ---------------------------------------------------------------------------
// PM project timeline
// ---------------------------------------------------------------------------

export interface CellView {
  personId: string;
  monthKey: string;
  /** v5.0 Phase 40 Plan 04: allocation row id for PATCH /api/v5/planning/allocations/[id].
   * Null when no allocation row exists for this (person, month) cell. */
  allocationId: string | null;
  plannedHours: number;
  actualHours: number | null;
  pendingProposal: { id: string; proposedHours: number; proposerId: string } | null;
  /** v5.0 Phase 42 Plan 42-03 (Wave 2): set by the client-side zoom aggregator
   *  when a CellView represents a quarter or year bucket synthesized from
   *  multiple month-grain cells. The PlanVsActualCell renders a "Σ" badge and
   *  the drill-down drawer opens for the first month in `underlyingMonths`. */
  aggregate?: boolean;
  underlyingMonths?: string[];
}

export interface PmTimelineView {
  project: { id: string; name: string };
  people: { id: string; name: string; departmentId: string | null }[];
  monthRange: string[]; // ['2026-05', '2026-06', ...]
  cells: CellView[];
}

// ---------------------------------------------------------------------------
// Line Manager group timeline (Phase 41 / Plan 41-01, D-12)
// ---------------------------------------------------------------------------

export interface GroupTimelineProjectRow {
  projectId: string;
  projectName: string;
  months: Record<string, number>; // monthKey → hours
  /** monthKey → allocation row id (v5.0 Phase 41-03: needed for LM direct-edit PATCH-by-id). */
  allocationIds: Record<string, string>;
}

export interface GroupTimelinePersonRow {
  personId: string;
  personName: string;
  projects: GroupTimelineProjectRow[];
}

export interface GroupTimelineView {
  monthRange: string[];
  persons: GroupTimelinePersonRow[];
}

/**
 * Approved-only per-person × per-project month aggregation for the LM group
 * timeline. Pending proposals are NOT included (consistent with capacity.read
 * D-07). People are filtered to a single department.
 */
export async function getGroupTimeline(args: {
  orgId: string;
  departmentId: string;
  monthRange: { from: string; to: string };
}): Promise<GroupTimelineView> {
  const monthRange = expandMonthRange(args.monthRange.from, args.monthRange.to);
  const dateRange = monthRangeToDateRange(args.monthRange);

  const peopleRows = await db
    .select({
      id: schema.people.id,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
    })
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, args.orgId),
        eq(schema.people.departmentId, args.departmentId),
      ),
    );

  if (peopleRows.length === 0) {
    return { monthRange, persons: [] };
  }

  const personIds = peopleRows.map((p) => p.id);
  const allocRows = await db
    .select({
      id: schema.allocations.id,
      personId: schema.allocations.personId,
      projectId: schema.allocations.projectId,
      projectName: schema.projects.name,
      month: schema.allocations.month,
      hours: schema.allocations.hours,
    })
    .from(schema.allocations)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.allocations.projectId))
    .where(
      and(
        eq(schema.allocations.organizationId, args.orgId),
        inArray(schema.allocations.personId, personIds),
        gte(schema.allocations.month, dateRange.from),
        lte(schema.allocations.month, dateRange.to),
      ),
    );

  // Index: personId → projectId → { name, months: Map<monthKey, hours>, ids: Map<monthKey, id> }
  const byPerson = new Map<
    string,
    Map<
      string,
      { name: string; months: Map<string, number>; ids: Map<string, string> }
    >
  >();
  for (const row of allocRows) {
    let projects = byPerson.get(row.personId);
    if (!projects) {
      projects = new Map();
      byPerson.set(row.personId, projects);
    }
    let entry = projects.get(row.projectId);
    if (!entry) {
      entry = { name: row.projectName, months: new Map(), ids: new Map() };
      projects.set(row.projectId, entry);
    }
    const mk = normalizeMonth(row.month);
    entry.months.set(mk, (entry.months.get(mk) ?? 0) + Number(row.hours));
    // Unique key is (org, person, project, month) — single row per month.
    entry.ids.set(mk, row.id);
  }

  const persons: GroupTimelinePersonRow[] = peopleRows.map((p) => {
    const projects = byPerson.get(p.id);
    const projectRows: GroupTimelineProjectRow[] = projects
      ? Array.from(projects.entries()).map(([projectId, entry]) => {
          const months: Record<string, number> = {};
          const allocationIds: Record<string, string> = {};
          for (const mk of monthRange) {
            months[mk] = entry.months.get(mk) ?? 0;
            const id = entry.ids.get(mk);
            if (id) allocationIds[mk] = id;
          }
          return { projectId, projectName: entry.name, months, allocationIds };
        })
      : [];
    return {
      personId: p.id,
      personName: `${p.firstName} ${p.lastName}`.trim(),
      projects: projectRows,
    };
  });

  return { monthRange, persons };
}

// ---------------------------------------------------------------------------
// Staff "My Schedule" (Phase 42 / Plan 42-02, D-04..D-06)
// ---------------------------------------------------------------------------

export interface StaffScheduleProjectRow {
  projectId: string;
  projectName: string;
  /** monthKey → CellView; dense over the full monthRange (zero-filled). */
  months: Record<string, CellView>;
}

export interface StaffSummaryStripEntry {
  plannedHours: number;
  actualHours: number;
  utilizationPct: number;
}

export interface StaffScheduleResult {
  person: { id: string; name: string };
  monthRange: string[];
  projects: StaffScheduleProjectRow[];
  summaryStrip: Record<string, StaffSummaryStripEntry>;
}

/**
 * Staff "My Schedule" read-model. Returns a projects × months grid plus a
 * month summary strip for a single person.
 *
 * Invariants:
 *  - Sums APPROVED allocations only (D-05 / Phase 41 D-07). Pending proposals
 *    are NOT included.
 *  - Every monthKey in the range has a CellView for every project row (dense,
 *    zero-filled).
 *  - summaryStrip is keyed by monthKey and reuses the capacity utilization
 *    helper for the target + utilization% math (D-06).
 */
export async function getStaffSchedule(args: {
  orgId: string;
  personId: string;
  monthRange: { from: string; to: string };
}): Promise<StaffScheduleResult> {
  const monthRange = expandMonthRange(args.monthRange.from, args.monthRange.to);
  const dateRange = monthRangeToDateRange(args.monthRange);

  // 1. Load + tenant-verify person.
  const [personRow] = await db
    .select({
      id: schema.people.id,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
    })
    .from(schema.people)
    .where(and(eq(schema.people.organizationId, args.orgId), eq(schema.people.id, args.personId)))
    .limit(1);
  if (!personRow) throw new NotFoundError('Person', args.personId);

  // 2. Approved allocations for this person in the date range, joined to projects.
  const allocRows = await db
    .select({
      id: schema.allocations.id,
      projectId: schema.allocations.projectId,
      projectName: schema.projects.name,
      month: schema.allocations.month,
      hours: schema.allocations.hours,
    })
    .from(schema.allocations)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.allocations.projectId))
    .where(
      and(
        eq(schema.allocations.organizationId, args.orgId),
        eq(schema.allocations.personId, args.personId),
        gte(schema.allocations.month, dateRange.from),
        lte(schema.allocations.month, dateRange.to),
      ),
    );

  // 3. Actuals by (project, monthKey) for this person.
  const projectIds = Array.from(new Set(allocRows.map((r) => r.projectId)));
  const actualRows = projectIds.length
    ? await aggregateByMonth(args.orgId, {
        projectIds,
        monthKeys: monthRange,
      })
    : [];
  const actualsByKey = new Map<string, number>();
  for (const row of actualRows) {
    if (row.personId !== args.personId) continue;
    actualsByKey.set(`${row.projectId}::${row.monthKey}`, row.hours);
  }

  // 4. Index: projectId → { name, months: Map<monthKey, {hours, allocId}> }
  const byProject = new Map<
    string,
    { name: string; months: Map<string, { hours: number; allocId: string }> }
  >();
  for (const row of allocRows) {
    let entry = byProject.get(row.projectId);
    if (!entry) {
      entry = { name: row.projectName, months: new Map() };
      byProject.set(row.projectId, entry);
    }
    const mk = normalizeMonth(row.month);
    const existing = entry.months.get(mk);
    entry.months.set(mk, {
      hours: (existing?.hours ?? 0) + Number(row.hours),
      allocId: row.id,
    });
  }

  // 5. Compose dense rows.
  const projects: StaffScheduleProjectRow[] = Array.from(byProject.entries()).map(
    ([projectId, entry]) => {
      const months: Record<string, CellView> = {};
      for (const mk of monthRange) {
        const cell = entry.months.get(mk);
        const actual = actualsByKey.get(`${projectId}::${mk}`);
        months[mk] = {
          personId: args.personId,
          monthKey: mk,
          allocationId: cell?.allocId ?? null,
          plannedHours: cell?.hours ?? 0,
          actualHours: actual ?? null,
          pendingProposal: null,
        };
      }
      return { projectId, projectName: entry.name, months };
    },
  );

  // 6. Summary strip: reuse capacity.read.getPersonMonthUtilization for
  //    planned + target + utilizationPct. Actuals are summed per monthKey
  //    from the same actuals query used above (single-person slice).
  const { getPersonMonthUtilization } = await import('@/features/capacity/capacity.read');
  const utilization = await getPersonMonthUtilization({
    orgId: args.orgId,
    monthRange: { start: args.monthRange.from, end: args.monthRange.to },
  });
  const cellsByKey = new Map(utilization.cells.map((c) => [`${c.personId}::${c.monthKey}`, c]));

  const actualByMonth = new Map<string, number>();
  for (const row of actualRows) {
    if (row.personId !== args.personId) continue;
    actualByMonth.set(row.monthKey, (actualByMonth.get(row.monthKey) ?? 0) + row.hours);
  }

  const summaryStrip: Record<string, StaffSummaryStripEntry> = {};
  for (const mk of monthRange) {
    const util = cellsByKey.get(`${args.personId}::${mk}`);
    summaryStrip[mk] = {
      plannedHours: util?.plannedHours ?? 0,
      actualHours: actualByMonth.get(mk) ?? 0,
      utilizationPct: util?.utilizationPct ?? 0,
    };
  }

  return {
    person: {
      id: personRow.id,
      name: `${personRow.firstName} ${personRow.lastName}`.trim(),
    },
    monthRange,
    projects,
    summaryStrip,
  };
}

export async function getPmTimeline(args: {
  orgId: string;
  projectId: string;
  monthRange: { from: string; to: string };
}): Promise<PmTimelineView> {
  // 1. Load + tenant-verify project.
  const [project] = await db
    .select({ id: schema.projects.id, name: schema.projects.name })
    .from(schema.projects)
    .where(
      and(eq(schema.projects.organizationId, args.orgId), eq(schema.projects.id, args.projectId)),
    )
    .limit(1);
  if (!project) throw new NotFoundError('Project', args.projectId);

  // 2. Build monthRange array.
  const monthRange = expandMonthRange(args.monthRange.from, args.monthRange.to);
  const dateRange = monthRangeToDateRange(args.monthRange);

  // 3. Query allocations for this project in the date range.
  const allocRows = await db
    .select({
      id: schema.allocations.id,
      personId: schema.allocations.personId,
      month: schema.allocations.month,
      hours: schema.allocations.hours,
    })
    .from(schema.allocations)
    .where(
      and(
        eq(schema.allocations.organizationId, args.orgId),
        eq(schema.allocations.projectId, args.projectId),
        gte(schema.allocations.month, dateRange.from),
        lte(schema.allocations.month, dateRange.to),
      ),
    );

  // 4. Determine distinct people that have any row for this project in range.
  const personIds = Array.from(new Set(allocRows.map((r) => r.personId)));
  const peopleRows = personIds.length
    ? await db
        .select({
          id: schema.people.id,
          firstName: schema.people.firstName,
          lastName: schema.people.lastName,
          departmentId: schema.people.departmentId,
        })
        .from(schema.people)
        .where(
          and(eq(schema.people.organizationId, args.orgId), inArray(schema.people.id, personIds)),
        )
    : [];

  const people = peopleRows.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`.trim(),
    departmentId: p.departmentId ?? null,
  }));

  // 5. Index planned hours + allocation id by `${personId}::${monthKey}`.
  const plannedByKey = new Map<string, number>();
  const allocIdByKey = new Map<string, string>();
  for (const row of allocRows) {
    const monthKey = normalizeMonth(row.month);
    const key = `${row.personId}::${monthKey}`;
    plannedByKey.set(key, Number(row.hours));
    allocIdByKey.set(key, row.id);
  }

  // 6. Query pending proposals for this project in the date range.
  const proposalRows = await db
    .select({
      id: schema.allocationProposals.id,
      personId: schema.allocationProposals.personId,
      month: schema.allocationProposals.month,
      proposedHours: schema.allocationProposals.proposedHours,
      requestedBy: schema.allocationProposals.requestedBy,
    })
    .from(schema.allocationProposals)
    .where(
      and(
        eq(schema.allocationProposals.organizationId, args.orgId),
        eq(schema.allocationProposals.projectId, args.projectId),
        eq(schema.allocationProposals.status, 'proposed'),
        gte(schema.allocationProposals.month, dateRange.from),
        lte(schema.allocationProposals.month, dateRange.to),
      ),
    );

  const pendingByKey = new Map<string, { id: string; proposedHours: number; proposerId: string }>();
  for (const row of proposalRows) {
    const monthKey = normalizeMonth(row.month);
    pendingByKey.set(`${row.personId}::${monthKey}`, {
      id: row.id,
      proposedHours: Number(row.proposedHours),
      proposerId: row.requestedBy,
    });
  }

  // 7. Query actuals aggregated by month for this project.
  const actualRows = await aggregateByMonth(args.orgId, {
    projectIds: [args.projectId],
    monthKeys: monthRange,
  });
  const actualsByKey = new Map<string, number>();
  for (const row of actualRows) {
    actualsByKey.set(`${row.personId}::${row.monthKey}`, row.hours);
  }

  // 8. Compose cells: people × monthRange.
  const cells: CellView[] = [];
  for (const person of people) {
    for (const monthKey of monthRange) {
      const key = `${person.id}::${monthKey}`;
      cells.push({
        personId: person.id,
        monthKey,
        allocationId: allocIdByKey.get(key) ?? null,
        plannedHours: plannedByKey.get(key) ?? 0,
        actualHours: actualsByKey.has(key) ? (actualsByKey.get(key) as number) : null,
        pendingProposal: pendingByKey.get(key) ?? null,
      });
    }
  }

  return {
    project: { id: project.id, name: project.name },
    people,
    monthRange,
    cells,
  };
}
