// v5.0 — Phase 41 / Plan 41-01: capacity read-model (UX-V5-04, D-04..D-08).
//
// Pure read functions for the Line Manager capacity heatmap and the approval
// queue impact preview. Tenant scope is enforced by always filtering on
// organizationId first.
//
// IMPORTANT (D-07): plannedHours sums APPROVED `allocations` rows ONLY.
// Pending `allocation_proposals` MUST NOT affect the heatmap — that would
// pre-redden the LM screen with un-approved PM wishes.

import { and, eq, gte, inArray, lte } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { generateMonthRange, normalizeMonth } from '@/lib/date-utils';

import {
  DEFAULT_TARGET_HOURS_PER_MONTH,
  type BreakdownRow,
  type CapacityStatus,
  type UtilizationCell,
  type UtilizationMap,
} from './capacity.types';

/**
 * Classify a utilization percentage into the v5 4-state enum.
 *
 * Order matters: `absent` (targetHours === 0) wins over everything because
 * a person on full-month leave should never be coloured as "over" even if a
 * stale allocation row exists.
 */
export function classify(plannedHours: number, targetHours: number): CapacityStatus {
  if (targetHours === 0) return 'absent';
  const pct = (plannedHours / targetHours) * 100;
  if (pct > 100) return 'over';
  if (pct < 60) return 'under';
  return 'ok';
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}

function expandMonthRange(from: string, to: string): string[] {
  return generateMonthRange(from, monthsBetween(from, to));
}

function monthRangeToDateRange(monthRange: { start: string; end: string }): {
  from: string;
  to: string;
} {
  const fromDate = `${monthRange.start}-01`;
  const [toYearStr, toMonthStr] = monthRange.end.split('-');
  const toYear = Number(toYearStr);
  const toMonth = Number(toMonthStr);
  const lastDay = new Date(Date.UTC(toYear, toMonth, 0)).getUTCDate();
  const toDate = `${monthRange.end}-${String(lastDay).padStart(2, '0')}`;
  return { from: fromDate, to: toDate };
}

export interface GetPersonMonthUtilizationArgs {
  orgId: string;
  departmentId?: string;
  monthRange: { start: string; end: string }; // 'YYYY-MM'
}

/**
 * Returns a dense (person × month) utilization map for the given range.
 * Zero-fills cells that have no allocation rows so the UI can render an
 * empty grid without client-side gap-filling.
 */
export async function getPersonMonthUtilization(
  args: GetPersonMonthUtilizationArgs,
): Promise<UtilizationMap> {
  const months = expandMonthRange(args.monthRange.start, args.monthRange.end);
  const dateRange = monthRangeToDateRange(args.monthRange);

  // 1. Load people (optionally filtered to a single department).
  const peopleConds = [eq(schema.people.organizationId, args.orgId)];
  if (args.departmentId) {
    peopleConds.push(eq(schema.people.departmentId, args.departmentId));
  }
  const peopleRows = await db
    .select({
      id: schema.people.id,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      departmentId: schema.people.departmentId,
      targetHoursPerMonth: schema.people.targetHoursPerMonth,
    })
    .from(schema.people)
    .where(and(...peopleConds));

  const people = peopleRows.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`.trim(),
    departmentId: p.departmentId ?? null,
  }));

  if (peopleRows.length === 0) {
    return { cells: [], people };
  }

  // 2. Sum approved allocations grouped by (personId, monthKey) within the range.
  const personIds = peopleRows.map((p) => p.id);
  const allocRows = await db
    .select({
      personId: schema.allocations.personId,
      month: schema.allocations.month,
      hours: schema.allocations.hours,
    })
    .from(schema.allocations)
    .where(
      and(
        eq(schema.allocations.organizationId, args.orgId),
        inArray(schema.allocations.personId, personIds),
        gte(schema.allocations.month, dateRange.from),
        lte(schema.allocations.month, dateRange.to),
      ),
    );

  const plannedByKey = new Map<string, number>();
  for (const row of allocRows) {
    const monthKey = normalizeMonth(row.month);
    const key = `${row.personId}::${monthKey}`;
    plannedByKey.set(key, (plannedByKey.get(key) ?? 0) + Number(row.hours));
  }

  // 3. Compose dense cell grid: person × month, zero-filled.
  const cells: UtilizationCell[] = [];
  for (const p of peopleRows) {
    const rawTarget = p.targetHoursPerMonth;
    const targetIsDefault = rawTarget == null;
    const targetHours = targetIsDefault ? DEFAULT_TARGET_HOURS_PER_MONTH : Number(rawTarget);

    for (const monthKey of months) {
      const planned = plannedByKey.get(`${p.id}::${monthKey}`) ?? 0;
      const utilizationPct = targetHours === 0 ? 0 : Math.round((planned / targetHours) * 100);
      cells.push({
        personId: p.id,
        monthKey,
        plannedHours: planned,
        targetHours,
        targetIsDefault,
        utilizationPct,
        status: classify(planned, targetHours),
      });
    }
  }

  return { cells, people };
}

export interface GetCapacityBreakdownArgs {
  orgId: string;
  scope: 'person';
  scopeId: string;
  monthKey: string; // 'YYYY-MM'
}

/**
 * Per-project breakdown for a single (person, month) cell. Used by:
 *   - the LM heatmap drill-down popover, and
 *   - the proposal impact preview (Task 4) to derive the "before" hours.
 *
 * Rows are sorted by hours desc so the largest contributor renders first.
 */
export async function getCapacityBreakdown(
  args: GetCapacityBreakdownArgs,
): Promise<BreakdownRow[]> {
  if (args.scope !== 'person') {
    throw new Error(`Unsupported breakdown scope: ${args.scope}`);
  }
  const monthFirstDay = `${args.monthKey}-01`;

  const rows = await db
    .select({
      projectId: schema.allocations.projectId,
      projectName: schema.projects.name,
      hours: schema.allocations.hours,
    })
    .from(schema.allocations)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.allocations.projectId))
    .where(
      and(
        eq(schema.allocations.organizationId, args.orgId),
        eq(schema.allocations.personId, args.scopeId),
        eq(schema.allocations.month, monthFirstDay),
      ),
    );

  const merged = new Map<string, BreakdownRow>();
  for (const r of rows) {
    const existing = merged.get(r.projectId);
    if (existing) {
      existing.hours += Number(r.hours);
    } else {
      merged.set(r.projectId, {
        projectId: r.projectId,
        projectName: r.projectName,
        hours: Number(r.hours),
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.hours - a.hours);
}
