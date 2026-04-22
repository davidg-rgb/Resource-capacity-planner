// v6.0 — Phase 53 / Plan 53-02 (POLISH-01 / D-01): capacity.service.ts
//
// New service fn `getOvercommitCount(orgId)` — distinct count of people whose
// planned approved hours exceed their monthly capacity in the window
// [currentMonth, currentMonth+3] (4 months total, matching the useAlertCount
// convention).
//
// Mirrors the LM-03 `getQueueCount` shape: tenant-scoped SQL aggregation,
// returns a `number`, no user-provided params beyond orgId.
//
// IMPORTANT (D-07 / Phase 41 carry-over): plannedHours sums APPROVED
// `allocations` rows ONLY. Pending `allocation_proposals` MUST NOT affect
// the overcommit count — matches `getPersonMonthUtilization` semantics.
//
// Capacity: `people.target_hours_per_month` (nullable, defaults to 160 per
// DEFAULT_TARGET_HOURS_PER_MONTH). target === 0 => 'absent' => excluded.

import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { generateMonthRange, getCurrentMonth } from '@/lib/date-utils';

import { DEFAULT_TARGET_HOURS_PER_MONTH } from './capacity.types';

/**
 * POLISH-01 / D-01: count distinct people whose summed approved planned
 * hours exceed their monthly target in ANY month of the window
 * [currentMonth, currentMonth+3].
 *
 * Tenant scoping (T-53-07): WHERE `organization_id = :orgId` on both the
 * allocations and people predicates. A caller from org A never sees org B
 * people even if the SQL were somehow invoked with a cross-tenant personId —
 * the people join filter eliminates them before the HAVING clause.
 *
 * The function does per-person roll-up in SQL, then filters in JS. The
 * data volumes (~100 people × 4 months) are small enough that a Set
 * membership check is cheaper + clearer than a HAVING / window.
 */
export async function getOvercommitCount(orgId: string): Promise<number> {
  const currentMonth = getCurrentMonth();
  const months = generateMonthRange(currentMonth, 4); // 4-month window
  const fromDate = `${months[0]}-01`;
  const lastMonth = months[months.length - 1];
  // Inclusive end: last day of the last month.
  const [toYearStr, toMonthStr] = lastMonth.split('-');
  const toYear = Number(toYearStr);
  const toMonth = Number(toMonthStr);
  const lastDay = new Date(Date.UTC(toYear, toMonth, 0)).getUTCDate();
  const toDate = `${lastMonth}-${String(lastDay).padStart(2, '0')}`;

  // Load people in the tenant — we need target_hours_per_month to decide
  // overcommit. People with no allocations never surface as overcommitted.
  const peopleRows = await db
    .select({
      id: schema.people.id,
      targetHoursPerMonth: schema.people.targetHoursPerMonth,
    })
    .from(schema.people)
    .where(eq(schema.people.organizationId, orgId));
  if (peopleRows.length === 0) return 0;

  const personIds = peopleRows.map((p) => p.id);
  const targetById = new Map<string, number>();
  for (const p of peopleRows) {
    const raw = p.targetHoursPerMonth;
    targetById.set(p.id, raw == null ? DEFAULT_TARGET_HOURS_PER_MONTH : Number(raw));
  }

  // Sum approved allocation hours per (person, month) within the window,
  // tenant-scoped via organizationId. Uses SUM() so double-booking across
  // multiple projects in the same month rolls up to one comparison.
  const rows = await db
    .select({
      personId: schema.allocations.personId,
      month: schema.allocations.month,
      totalHours: sql<number>`sum(${schema.allocations.hours})::int`,
    })
    .from(schema.allocations)
    .where(
      and(
        eq(schema.allocations.organizationId, orgId),
        inArray(schema.allocations.personId, personIds),
        gte(schema.allocations.month, fromDate),
        lte(schema.allocations.month, toDate),
      ),
    )
    .groupBy(schema.allocations.personId, schema.allocations.month);

  const overcommitted = new Set<string>();
  for (const row of rows) {
    const target = targetById.get(row.personId) ?? DEFAULT_TARGET_HOURS_PER_MONTH;
    if (target === 0) continue; // absent — never "over"
    if (Number(row.totalHours) > target) {
      overcommitted.add(row.personId);
    }
  }
  return overcommitted.size;
}
