'use server';

/**
 * v5.0 — Phase 37-02: server action returning planned + actual hours for a
 * single (org, person, project, monthKey) tuple. Used by the
 * PlanVsActualCell + drill-down drawer.
 *
 * Reads:
 *   - planned ← allocations.hours where allocations.month = '${monthKey}-01'
 *   - actual  ← actual_entries.hours summed via aggregateByMonth (37-01)
 *
 * No new transport convention: just a thin RSC server action.
 */

import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { actualEntries, allocations } from '@/db/schema';

import { getDailyRows as readDailyRows, type DailyRow } from './actuals.read';

export type CellData = {
  planned: number;
  actual: number | null;
};

export async function getCellData(
  orgId: string,
  personId: string,
  projectId: string,
  monthKey: string,
): Promise<CellData> {
  const monthFirstDay = `${monthKey}-01`;

  const plannedRows = await db
    .select({ total: sql<string>`coalesce(sum(${allocations.hours}), 0)` })
    .from(allocations)
    .where(
      and(
        eq(allocations.organizationId, orgId),
        eq(allocations.personId, personId),
        eq(allocations.projectId, projectId),
        eq(allocations.month, monthFirstDay),
      ),
    );

  const actualRows = await db
    .select({
      total: sql<string>`sum(${actualEntries.hours})`,
      count: sql<number>`count(*)::int`,
    })
    .from(actualEntries)
    .where(
      and(
        eq(actualEntries.organizationId, orgId),
        eq(actualEntries.personId, personId),
        eq(actualEntries.projectId, projectId),
        sql`to_char(${actualEntries.date}, 'YYYY-MM') = ${monthKey}`,
      ),
    );

  const planned = Number(plannedRows[0]?.total ?? 0);
  const actualCount = Number(actualRows[0]?.count ?? 0);
  const actual = actualCount === 0 ? null : Number(actualRows[0]?.total ?? 0);

  return { planned, actual };
}

/**
 * Server action wrapper for getDailyRows used by the drawer.
 * Also returns the per-day "planned" value (monthly plan distributed
 * evenly across the working days of the month).
 */
export type DailyBreakdownRow = {
  date: string;
  planned: number;
  actual: number;
  delta: number;
  source: DailyRow['source'] | null;
};

export async function getDailyCellBreakdown(
  orgId: string,
  args: { personId: string; projectId: string; monthKey: string },
): Promise<DailyBreakdownRow[]> {
  const [{ distribute, workDaysInMonth }, dailyActual, cell] = await Promise.all([
    import('@/lib/time'),
    readDailyRows(orgId, args),
    getCellData(orgId, args.personId, args.projectId, args.monthKey),
  ]);

  const [yStr, mStr] = args.monthKey.split('-');
  const year = Number(yStr);
  const monthIndex = Number(mStr) - 1;
  const workDays = workDaysInMonth(year, monthIndex);

  const plannedPerDay =
    workDays.length > 0 && cell.planned > 0
      ? distribute(cell.planned, workDays.length)
      : workDays.map(() => 0);

  const plannedByDate = new Map<string, number>();
  workDays.forEach((d, i) => {
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    plannedByDate.set(iso, plannedPerDay[i] ?? 0);
  });

  const actualByDate = new Map<string, { hours: number; source: DailyRow['source'] }>();
  for (const r of dailyActual) {
    actualByDate.set(r.date, { hours: r.hours, source: r.source });
  }

  const allDates = new Set<string>([...plannedByDate.keys(), ...actualByDate.keys()]);
  const sorted = Array.from(allDates).sort();

  return sorted.map((date) => {
    const planned = plannedByDate.get(date) ?? 0;
    const actualEntry = actualByDate.get(date);
    const actual = actualEntry?.hours ?? 0;
    return {
      date,
      planned,
      actual,
      delta: Number((actual - planned).toFixed(2)),
      source: actualEntry?.source ?? null,
    };
  });
}
