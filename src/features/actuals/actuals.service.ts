// v5.0 — Phase 37 / ACT-02: upsertActuals — sole writer for actual_entries.
//
// Accepts day/week/month grain input, expands week/month into per-day rows
// via the largest-remainder distribution from @/lib/time, then upserts the
// rows in a single transaction keyed on the (org, person, project, date)
// unique constraint. Every successful call writes exactly one change_log
// row inside the same tx (one row per call, not per day — keeps the audit
// feed readable).
//
// Enforced by nordic/require-change-log (eslint) + the mutations manifest
// codegen. Do NOT add a second writer; that's an ADR-003 violation.

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { actualEntries } from '@/db/schema';
import { recordChange } from '@/features/change-log/change-log.service';
import { ValidationError } from '@/lib/errors';
import { distribute, workDaysInIsoWeek, workDaysInMonth } from '@/lib/time';

import { upsertActualsInputSchema } from './actuals.schema';
import type { UpsertActualsInput, UpsertActualsResult } from './actuals.types';

type DayRow = { date: string; hours: number };

function expandToDayRows(input: UpsertActualsInput): DayRow[] {
  if (input.grain === 'day') {
    return [{ date: input.date, hours: input.hours }];
  }
  if (input.grain === 'week') {
    const dates = workDaysInIsoWeek(input.isoYear, input.isoWeek);
    if (dates.length === 0) {
      throw new ValidationError(
        `upsertActuals: ISO ${input.isoYear}-W${input.isoWeek} has no working days`,
        'NO_WORKING_DAYS',
      );
    }
    const hours = distribute(input.totalHours, dates.length);
    return dates.map((date, i) => ({ date, hours: hours[i] }));
  }
  // month
  const [yStr, mStr] = input.monthKey.split('-');
  const year = Number(yStr);
  const monthIndex = Number(mStr) - 1;
  const dates = workDaysInMonth(year, monthIndex);
  if (dates.length === 0) {
    throw new ValidationError(
      `upsertActuals: month ${input.monthKey} has no working days`,
      'NO_WORKING_DAYS',
    );
  }
  const hours = distribute(input.totalHours, dates.length);
  return dates.map((date, i) => ({ date, hours: hours[i] }));
}

/** Format a JS number as a numeric(5,2) string with two decimal places. */
function toHoursString(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export async function upsertActuals(rawInput: UpsertActualsInput): Promise<UpsertActualsResult> {
  const input = upsertActualsInputSchema.parse(rawInput);

  const dayRows = expandToDayRows(input as UpsertActualsInput);
  const dates = dayRows.map((r) => r.date);

  const result = await db.transaction(async (tx) => {
    // Snapshot existing rows for change_log previousValue.
    const existing = await tx
      .select({
        id: actualEntries.id,
        date: actualEntries.date,
        hours: actualEntries.hours,
        source: actualEntries.source,
      })
      .from(actualEntries)
      .where(
        and(
          eq(actualEntries.organizationId, input.orgId),
          eq(actualEntries.personId, input.personId),
          eq(actualEntries.projectId, input.projectId),
          inArray(actualEntries.date, dates),
        ),
      );

    const valuesToInsert = dayRows.map((r) => ({
      organizationId: input.orgId,
      personId: input.personId,
      projectId: input.projectId,
      date: r.date,
      hours: toHoursString(r.hours),
      source: input.source,
      importBatchId: input.importBatchId ?? null,
    }));

    const inserted = await tx
      .insert(actualEntries)
      .values(valuesToInsert)
      .onConflictDoUpdate({
        target: [
          actualEntries.organizationId,
          actualEntries.personId,
          actualEntries.projectId,
          actualEntries.date,
        ],
        set: {
          hours: sqlExcluded('hours'),
          source: sqlExcluded('source'),
          importBatchId: sqlExcluded('import_batch_id'),
          updatedAt: new Date(),
        },
      })
      .returning({
        id: actualEntries.id,
        date: actualEntries.date,
        hours: actualEntries.hours,
        source: actualEntries.source,
      });

    // Stable entityId for the change_log row: first written row's id.
    // Multi-row upserts share one log entry; per-day detail lives in newValue.
    const entityId = inserted[0]?.id;
    if (!entityId) {
      throw new ValidationError('upsertActuals: insert returned no rows (unexpected)', 'BAD_HOURS');
    }

    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorPersonaId,
        entity: 'actual_entry',
        entityId,
        action: 'ACTUAL_UPSERTED',
        previousValue: existing.length > 0 ? { rows: existing } : null,
        newValue: { rows: inserted },
        context: {
          grain: input.grain,
          dates,
          source: input.source,
          personId: input.personId,
          projectId: input.projectId,
          ...(input.importBatchId ? { importBatchId: input.importBatchId } : {}),
        },
      },
      tx as unknown as Parameters<typeof recordChange>[1],
    );

    return inserted;
  });

  return { rowsWritten: result.length, dates };
}

// Tiny helper: Drizzle's `sql` template for `excluded.<col>` in ON CONFLICT.
// Inlined here to avoid leaking sql template usage to callers.
import { sql } from 'drizzle-orm';
function sqlExcluded(column: string) {
  return sql.raw(`excluded.${column}`);
}
