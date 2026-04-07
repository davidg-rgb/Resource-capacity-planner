// v5.0 — Phase 37: actuals read model (pure read functions, no mutations).
//
// Aggregations used by the plan-vs-actual cell and downstream dashboards.
// Tenant scope is enforced by always filtering on organizationId first.

import { and, between, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db';
import { actualEntries, allocations } from '@/db/schema';

export type AggregateFilter = {
  personIds?: string[];
  projectIds?: string[];
};

export type MonthAggregateRow = {
  personId: string;
  projectId: string;
  monthKey: string; // 'YYYY-MM'
  hours: number;
};

export type WeekAggregateRow = {
  personId: string;
  projectId: string;
  isoYear: number;
  isoWeek: number;
  hours: number;
};

export type DailyRow = {
  id: string;
  date: string;
  hours: number;
  source: 'manual' | 'import';
};

export type ProjectBurn = {
  plannedHours: number;
  actualHours: number;
};

/**
 * Sums actual hours per (person, project, month) for the given org.
 *
 * Missing combinations are simply absent from the result (no zero rows
 * synthesized — callers expecting a dense matrix should fill gaps client-side).
 */
export async function aggregateByMonth(
  orgId: string,
  filter: AggregateFilter & { monthKeys?: string[] } = {},
): Promise<MonthAggregateRow[]> {
  const monthKeyExpr = sql<string>`to_char(${actualEntries.date}, 'YYYY-MM')`;
  const hoursSum = sql<string>`sum(${actualEntries.hours})`;

  const conditions = [eq(actualEntries.organizationId, orgId)];
  if (filter.personIds?.length) {
    conditions.push(inArray(actualEntries.personId, filter.personIds));
  }
  if (filter.projectIds?.length) {
    conditions.push(inArray(actualEntries.projectId, filter.projectIds));
  }

  const rows = await db
    .select({
      personId: actualEntries.personId,
      projectId: actualEntries.projectId,
      monthKey: monthKeyExpr,
      hours: hoursSum,
    })
    .from(actualEntries)
    .where(and(...conditions))
    .groupBy(actualEntries.personId, actualEntries.projectId, monthKeyExpr);

  const filtered = filter.monthKeys?.length
    ? rows.filter((r) => filter.monthKeys!.includes(r.monthKey))
    : rows;

  return filtered.map((r) => ({
    personId: r.personId,
    projectId: r.projectId,
    monthKey: r.monthKey,
    hours: Number(r.hours),
  }));
}

/**
 * Sums actual hours per (person, project, isoYear, isoWeek). Postgres
 * `EXTRACT(ISOYEAR / WEEK)` returns ISO 8601 week numbers, so 2026-12-28
 * buckets into (2026, 53) and 2027-01-04 into (2027, 1).
 */
export async function aggregateByWeek(
  orgId: string,
  filter: AggregateFilter = {},
): Promise<WeekAggregateRow[]> {
  const isoYearExpr = sql<number>`extract(isoyear from ${actualEntries.date})::int`;
  const isoWeekExpr = sql<number>`extract(week from ${actualEntries.date})::int`;
  const hoursSum = sql<string>`sum(${actualEntries.hours})`;

  const conditions = [eq(actualEntries.organizationId, orgId)];
  if (filter.personIds?.length) {
    conditions.push(inArray(actualEntries.personId, filter.personIds));
  }
  if (filter.projectIds?.length) {
    conditions.push(inArray(actualEntries.projectId, filter.projectIds));
  }

  const rows = await db
    .select({
      personId: actualEntries.personId,
      projectId: actualEntries.projectId,
      isoYear: isoYearExpr,
      isoWeek: isoWeekExpr,
      hours: hoursSum,
    })
    .from(actualEntries)
    .where(and(...conditions))
    .groupBy(actualEntries.personId, actualEntries.projectId, isoYearExpr, isoWeekExpr);

  return rows.map((r) => ({
    personId: r.personId,
    projectId: r.projectId,
    isoYear: Number(r.isoYear),
    isoWeek: Number(r.isoWeek),
    hours: Number(r.hours),
  }));
}

/**
 * Returns the raw daily actual rows for a single (person, project) within a
 * calendar month. Used by the plan-vs-actual drill-down cell.
 */
export async function getDailyRows(
  orgId: string,
  args: { personId: string; projectId: string; monthKey: string },
): Promise<DailyRow[]> {
  const [yStr, mStr] = args.monthKey.split('-');
  const year = Number(yStr);
  const monthIndex = Number(mStr) - 1;
  const firstDay = `${args.monthKey}-01`;
  const last = new Date(Date.UTC(year, monthIndex + 1, 0));
  const lastDay = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, '0')}-${String(last.getUTCDate()).padStart(2, '0')}`;

  const rows = await db
    .select({
      id: actualEntries.id,
      date: actualEntries.date,
      hours: actualEntries.hours,
      source: actualEntries.source,
    })
    .from(actualEntries)
    .where(
      and(
        eq(actualEntries.organizationId, orgId),
        eq(actualEntries.personId, args.personId),
        eq(actualEntries.projectId, args.projectId),
        between(actualEntries.date, firstDay, lastDay),
      ),
    );

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    hours: Number(r.hours),
    source: r.source,
  }));
}

/**
 * Sums planned (`allocations.hours`) and actual (`actual_entries.hours`) for a
 * project within an inclusive date range. The plan side keys on
 * `allocations.month` (a date column storing YYYY-MM-01); callers pass `from`
 * and `to` as 'YYYY-MM-DD' strings.
 */
export async function getProjectBurn(
  orgId: string,
  projectId: string,
  range: { from: string; to: string },
): Promise<ProjectBurn> {
  const plannedRow = await db
    .select({ total: sql<string>`coalesce(sum(${allocations.hours}), 0)` })
    .from(allocations)
    .where(
      and(
        eq(allocations.organizationId, orgId),
        eq(allocations.projectId, projectId),
        between(allocations.month, range.from, range.to),
      ),
    );

  const actualRow = await db
    .select({ total: sql<string>`coalesce(sum(${actualEntries.hours}), 0)` })
    .from(actualEntries)
    .where(
      and(
        eq(actualEntries.organizationId, orgId),
        eq(actualEntries.projectId, projectId),
        between(actualEntries.date, range.from, range.to),
      ),
    );

  return {
    plannedHours: Number(plannedRow[0]?.total ?? 0),
    actualHours: Number(actualRow[0]?.total ?? 0),
  };
}
