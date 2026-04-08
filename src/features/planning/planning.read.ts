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

  // Index: personId → projectId → { name, months: Map<monthKey, hours> }
  const byPerson = new Map<string, Map<string, { name: string; months: Map<string, number> }>>();
  for (const row of allocRows) {
    let projects = byPerson.get(row.personId);
    if (!projects) {
      projects = new Map();
      byPerson.set(row.personId, projects);
    }
    let entry = projects.get(row.projectId);
    if (!entry) {
      entry = { name: row.projectName, months: new Map() };
      projects.set(row.projectId, entry);
    }
    const mk = normalizeMonth(row.month);
    entry.months.set(mk, (entry.months.get(mk) ?? 0) + Number(row.hours));
  }

  const persons: GroupTimelinePersonRow[] = peopleRows.map((p) => {
    const projects = byPerson.get(p.id);
    const projectRows: GroupTimelineProjectRow[] = projects
      ? Array.from(projects.entries()).map(([projectId, entry]) => {
          const months: Record<string, number> = {};
          for (const mk of monthRange) months[mk] = entry.months.get(mk) ?? 0;
          return { projectId, projectName: entry.name, months };
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
