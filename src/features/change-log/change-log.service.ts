// v5.0 — FOUND-V5-04: recordChange — the ONLY writer for change_log.
// ADR-003: all mutating services must call recordChange inside their own tx.
// Enforced by three mechanisms: eslint rule, codegen manifest, runtime test.
import { z } from 'zod';
import { db } from '@/db';
import { changeLog, changeLogActionEnum, changeLogEntityEnum } from './change-log.schema';
import type {
  RecordChangeInput,
  ChangeLogEntry,
  ChangeLogAction,
  ChangeLogEntity,
} from './change-log.types';

const recordChangeInputSchema = z.object({
  orgId: z.string().uuid(),
  actorPersonaId: z.string().min(1),
  entity: z.enum(changeLogEntityEnum.enumValues),
  entityId: z.string().uuid(),
  action: z.enum(changeLogActionEnum.enumValues),
  previousValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  context: z.record(z.string(), z.unknown()).nullable(),
});

// The tx parameter is loosely typed to accept both the top-level db and a
// Drizzle transaction handle. ADR-003 forbids a second writer, so recordChange
// is literally the only exported mutation function in this module.
type ChangeLogExecutor = Pick<typeof db, 'insert'>;

export async function recordChange(
  input: RecordChangeInput,
  tx?: ChangeLogExecutor,
): Promise<ChangeLogEntry> {
  const parsed = recordChangeInputSchema.parse(input);
  const executor = (tx ?? db) as ChangeLogExecutor;
  const [row] = await executor
    .insert(changeLog)
    .values({
      organizationId: parsed.orgId,
      actorPersonaId: parsed.actorPersonaId,
      entity: parsed.entity,
      entityId: parsed.entityId,
      action: parsed.action,
      previousValue: parsed.previousValue ?? null,
      newValue: parsed.newValue ?? null,
      context: parsed.context ?? null,
    })
    .returning();
  return row as ChangeLogEntry;
}

/**
 * Opt-in decorator that wraps a service function in a transaction and
 * automatically writes a change_log entry on success.
 *
 * Usage:
 *   const result = await withChangeLog('ALLOCATION_EDITED', {
 *     orgId, actorPersonaId, entity: 'allocation', entityId,
 *   }, async (tx) => {
 *     // ... do work inside tx ...
 *     return { result: updatedRow, previousValue: old, newValue: updated };
 *   });
 */
export async function withChangeLog<T>(
  action: ChangeLogAction,
  input: {
    orgId: string;
    actorPersonaId: string;
    entity: ChangeLogEntity;
    entityId: string;
    context?: Record<string, unknown>;
  },
  fn: (
    tx: ChangeLogExecutor,
  ) => Promise<{ result: T; previousValue?: unknown; newValue?: unknown }>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const { result, previousValue, newValue } = await fn(tx as unknown as ChangeLogExecutor);
    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorPersonaId,
        entity: input.entity,
        entityId: input.entityId,
        action,
        previousValue: previousValue ?? null,
        newValue: newValue ?? null,
        context: input.context ?? null,
      },
      tx as unknown as ChangeLogExecutor,
    );
    return result;
  });
}
