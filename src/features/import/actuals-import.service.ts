// v5.0 — Phase 38 / Plan 38-02 (IMP-02..05, IMP-07): actuals import service.
//
// The four exported functions form the staged import pipeline:
//
//   parseAndStageActuals  : parse xlsx → import_sessions row (status='staged')
//   previewStagedBatch    : read session.parsedData → diff → PreviewResult
//   commitActualsBatch    : tx { build reversal_payload → upsert actuals →
//                                insert import_batches → recordChange ONCE }
//   rollbackBatch         : tx { restore reversal_payload → mark batch
//                                rolled_back → recordChange ONCE }
//
// Single aggregate change_log row per commit / rollback (NOT per daily row),
// per FOUND-V5-04. Enforced by nordic/require-change-log + the mutations
// manifest codegen — see eslint.config.mjs and scripts/generate-mutations-
// manifest.ts. Both globs include src/features/import/**/*.service.ts.
//
// Supersession: a second commit on overlapping rows is refused with
// PRIOR_BATCH_ACTIVE unless overrideUnrolledImports=true. On override, prior
// active batches are marked superseded_at and their reversal_payload rows are
// CHAINED into the new batch's reversal_payload, so rolling back the new
// batch restores values to the pre-FIRST-batch state. This prevents the
// "two imports → rollback corruption" failure mode.

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { actualEntries, importBatches, importSessions } from '@/db/schema';
import { recordChange } from '@/features/change-log/change-log.service';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';

import {
  ERR_BATCH_ALREADY_ROLLED_BACK,
  ERR_PRIOR_BATCH_ACTIVE,
  ERR_ROLLBACK_WINDOW_EXPIRED,
  ERR_SESSION_ALREADY_COMMITTED,
  ERR_SESSION_NOT_STAGED,
  ERR_UNRESOLVED_NAMES,
  ROLLBACK_WINDOW_MS,
  type CommitInput,
  type CommitResult,
  type ImportBatch,
  type ParseAndStageInput,
  type ParseAndStageResult,
  type PreviewResult,
  type ReversalPayload,
  type ReversalPayloadRow,
  type RollbackInput,
  type RollbackResult,
} from './actuals-import.types';
import { parseActualsWorkbook } from './parsers/actuals-excel.parser';
import type { ParseResult, ParseWarning } from './parsers/parser.types';
import { validateStagedRows } from './validate-staged-rows';

// ---------------------------------------------------------------------------
// parseAndStageActuals
// ---------------------------------------------------------------------------

export async function parseAndStageActuals(
  input: ParseAndStageInput,
): Promise<ParseAndStageResult> {
  const parsed: ParseResult = parseActualsWorkbook(input.fileBuffer);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [row] = await db
    .insert(importSessions)
    .values({
      organizationId: input.orgId,
      userId: input.userId,
      fileName: input.fileName,
      status: 'staged',
      rowCount: parsed.rows.length,
      parsedData: parsed as unknown as Record<string, unknown>,
      expiresAt,
    })
    .returning({ id: importSessions.id });

  return {
    sessionId: row.id,
    layout: parsed.layout,
    rowCount: parsed.rows.length,
    warningCount: parsed.warnings.length,
  };
}

// ---------------------------------------------------------------------------
// previewStagedBatch
// ---------------------------------------------------------------------------

async function loadSessionOrThrow(orgId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(importSessions)
    .where(and(eq(importSessions.id, sessionId), eq(importSessions.organizationId, orgId)));
  if (!session) {
    throw new NotFoundError('import_session', sessionId);
  }
  return session;
}

export async function previewStagedBatch(
  orgId: string,
  sessionId: string,
  now: Date = new Date(),
): Promise<PreviewResult> {
  const session = await loadSessionOrThrow(orgId, sessionId);
  if (session.status === 'committed') {
    throw new ConflictError('Session has already been committed', {
      code: ERR_SESSION_ALREADY_COMMITTED,
      sessionId,
    });
  }
  const parsed = (session.parsedData ?? { rows: [], warnings: [] }) as ParseResult;
  const outcome = await validateStagedRows(db, orgId, parsed.rows, now);

  return {
    sessionId,
    new: outcome.counts.new,
    updated: outcome.counts.updated,
    warnings: parsed.warnings,
    rowsSkippedManual: outcome.counts.rowsSkippedManual,
    rowsSkippedPriorBatch: outcome.counts.rowsSkippedPriorBatch,
    unmatchedNames: outcome.unmatchedNames,
  };
}

// ---------------------------------------------------------------------------
// cancelStaged
// ---------------------------------------------------------------------------

export async function cancelStaged(input: { orgId: string; sessionId: string }): Promise<void> {
  const session = await loadSessionOrThrow(input.orgId, input.sessionId);
  if (session.status !== 'staged') {
    throw new ConflictError('Session is not in staged status and cannot be cancelled', {
      code: ERR_SESSION_NOT_STAGED,
      sessionId: input.sessionId,
      currentStatus: session.status,
    });
  }
  await db
    .delete(importSessions)
    .where(
      and(eq(importSessions.id, input.sessionId), eq(importSessions.organizationId, input.orgId)),
    );
}

// ---------------------------------------------------------------------------
// listBatches
// ---------------------------------------------------------------------------

export async function listBatches(input: {
  orgId: string;
  limit?: number;
}): Promise<ImportBatch[]> {
  const rows = await db
    .select({
      id: importBatches.id,
      importSessionId: importBatches.importSessionId,
      fileName: importBatches.fileName,
      committedBy: importBatches.committedBy,
      committedAt: importBatches.committedAt,
      rowsInserted: importBatches.rowsInserted,
      rowsUpdated: importBatches.rowsUpdated,
      rowsSkippedManual: importBatches.rowsSkippedManual,
      rowsSkippedPriorBatch: importBatches.rowsSkippedPriorBatch,
      rolledBackAt: importBatches.rolledBackAt,
      supersededAt: importBatches.supersededAt,
    })
    .from(importBatches)
    .where(eq(importBatches.organizationId, input.orgId))
    .orderBy(desc(importBatches.committedAt))
    .limit(input.limit ?? 50);

  return rows;
}

// ---------------------------------------------------------------------------
// commitActualsBatch
// ---------------------------------------------------------------------------

function toHoursString(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export async function commitActualsBatch(
  input: CommitInput,
  now: Date = new Date(),
): Promise<CommitResult> {
  const session = await loadSessionOrThrow(input.orgId, input.sessionId);
  if (session.status === 'committed') {
    throw new ConflictError('Session has already been committed', {
      code: ERR_SESSION_ALREADY_COMMITTED,
      sessionId: input.sessionId,
    });
  }
  const parsed = (session.parsedData ?? { rows: [], warnings: [] }) as ParseResult;

  const result = await db.transaction(async (tx) => {
    // Re-validate inside the tx for read consistency.
    const outcome = await validateStagedRows(
      tx,
      input.orgId,
      parsed.rows,
      now,
      input.nameOverrides,
    );

    // Hard fail if any names are still unresolved (after overrides).
    if (outcome.unmatchedNames.length > 0) {
      throw new ValidationError('Some names could not be resolved', ERR_UNRESOLVED_NAMES, {
        unmatchedNames: outcome.unmatchedNames,
      });
    }

    // Supersession refusal (TC-AC-016 default branch).
    if (outcome.priorBatchIds.length > 0 && !input.overrideUnrolledImports) {
      throw new ConflictError(
        'A prior import batch on overlapping rows is still active. Pass overrideUnrolledImports=true to supersede.',
        { code: ERR_PRIOR_BATCH_ACTIVE, priorBatchIds: outcome.priorBatchIds },
      );
    }

    // Build the new batch's reversal payload from the per-row "existing"
    // snapshots. If overrideUnrolledImports=true and a row's existing
    // importBatchId is one of the soon-to-be-superseded priorBatchIds, we
    // chain that batch's reversal_payload entry for this same key (so the
    // new rollback restores values to PRE-prior-batch state).
    const chainedSnapshots = new Map<string, ReversalPayloadRow['prior']>();
    if (outcome.priorBatchIds.length > 0 && input.overrideUnrolledImports) {
      const priorBatches = (await tx
        .select({ id: importBatches.id, reversalPayload: importBatches.reversalPayload })
        .from(importBatches)
        .where(
          and(
            eq(importBatches.organizationId, input.orgId),
            inArray(importBatches.id, outcome.priorBatchIds),
          ),
        )) as Array<{ id: string; reversalPayload: ReversalPayload | null }>;

      for (const pb of priorBatches) {
        if (!pb.reversalPayload) continue;
        for (const r of pb.reversalPayload.rows) {
          const key = `${r.personId}|${r.projectId}|${r.date}`;
          // Earliest snapshot wins (chain back to oldest known state).
          if (!chainedSnapshots.has(key)) {
            chainedSnapshots.set(key, r.prior);
          }
        }
      }
    }

    const reversalRows: ReversalPayloadRow[] = [];
    const valuesToInsert: Array<typeof actualEntries.$inferInsert> = [];
    const rowsToDeleteForSkipPrior: Array<{ personId: string; projectId: string; date: string }> =
      [];

    let rowsInserted = 0;
    let rowsUpdated = 0;
    const rowsSkippedManual = input.overrideManualEdits ? 0 : outcome.counts.rowsSkippedManual;
    const rowsSkippedPriorBatch = input.overrideUnrolledImports
      ? 0
      : outcome.counts.rowsSkippedPriorBatch;

    for (const r of outcome.rows) {
      const key = `${r.personId}|${r.projectId}|${r.source.date}`;
      const chained = chainedSnapshots.get(key);

      // Decide whether to write this row, given override flags.
      let willWrite = false;
      if (r.action === 'insert') {
        willWrite = true;
        rowsInserted += 1;
      } else if (r.action === 'update') {
        willWrite = true;
        rowsUpdated += 1;
      } else if (r.action === 'noop') {
        willWrite = false;
      } else if (r.action === 'skip-manual') {
        if (input.overrideManualEdits) {
          willWrite = true;
          rowsUpdated += 1;
        }
      } else if (r.action === 'skip-prior-batch') {
        if (input.overrideUnrolledImports) {
          willWrite = true;
          rowsUpdated += 1;
        }
      }

      if (!willWrite) continue;

      // Build reversal entry — chained snapshot wins over per-row existing
      // when this row was previously written by a now-superseded batch.
      const prior =
        chained !== undefined
          ? chained
          : r.existing
            ? {
                hours: r.existing.hours,
                source: r.existing.source,
                importBatchId: r.existing.importBatchId,
              }
            : null;
      reversalRows.push({
        personId: r.personId,
        projectId: r.projectId,
        date: r.source.date,
        prior,
      });

      valuesToInsert.push({
        organizationId: input.orgId,
        personId: r.personId,
        projectId: r.projectId,
        date: r.source.date,
        hours: toHoursString(r.source.hours),
        source: 'import',
        importBatchId: null, // patched after batch insert below
      });
      void rowsToDeleteForSkipPrior;
    }

    // Mark prior batches as superseded BEFORE the upsert so FK behaviour
    // (no cascade in our schema) is unaffected.
    if (outcome.priorBatchIds.length > 0 && input.overrideUnrolledImports) {
      await tx
        .update(importBatches)
        .set({ supersededAt: now })
        .where(
          and(
            eq(importBatches.organizationId, input.orgId),
            inArray(importBatches.id, outcome.priorBatchIds),
          ),
        );
    }

    // Insert the import_batches row first so we have batchId for the
    // upserted actual_entries rows.
    const reversalPayload: ReversalPayload = { rows: reversalRows };
    const [batch] = await tx
      .insert(importBatches)
      .values({
        organizationId: input.orgId,
        importSessionId: input.sessionId,
        fileName: session.fileName,
        committedBy: input.committedBy,
        committedAt: now,
        overrideManualEdits: input.overrideManualEdits,
        rowsInserted,
        rowsUpdated,
        rowsSkippedManual,
        rowsSkippedPriorBatch,
        reversalPayload: reversalPayload as unknown as Record<string, unknown>,
      })
      .returning({ id: importBatches.id });

    if (valuesToInsert.length > 0) {
      const stamped = valuesToInsert.map((v) => ({ ...v, importBatchId: batch.id }));
      await tx
        .insert(actualEntries)
        .values(stamped)
        .onConflictDoUpdate({
          target: [
            actualEntries.organizationId,
            actualEntries.personId,
            actualEntries.projectId,
            actualEntries.date,
          ],
          set: {
            hours: sql.raw('excluded.hours'),
            source: sql.raw('excluded.source'),
            importBatchId: sql.raw('excluded.import_batch_id'),
            updatedAt: now,
          },
        });
    }

    // Mark the session as committed.
    await tx
      .update(importSessions)
      .set({ status: 'committed' })
      .where(eq(importSessions.id, input.sessionId));

    // ONE aggregate change_log row.
    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorPersonaId,
        entity: 'import_batch',
        entityId: batch.id,
        action: 'ACTUALS_BATCH_COMMITTED',
        previousValue: null,
        newValue: {
          rowsInserted,
          rowsUpdated,
          rowsSkippedManual,
          rowsSkippedPriorBatch,
        },
        context: {
          importBatchId: batch.id,
          sessionId: input.sessionId,
          fileName: session.fileName,
          overrideManualEdits: input.overrideManualEdits,
          overrideUnrolledImports: input.overrideUnrolledImports,
          supersededBatchIds: input.overrideUnrolledImports ? outcome.priorBatchIds : [],
        },
      },
      tx as unknown as Parameters<typeof recordChange>[1],
    );

    return {
      batchId: batch.id,
      rowsInserted,
      rowsUpdated,
      rowsSkippedManual,
      rowsSkippedPriorBatch,
      warnings: parsed.warnings as ParseWarning[],
    } satisfies CommitResult;
  });

  return result;
}

// ---------------------------------------------------------------------------
// rollbackBatch
// ---------------------------------------------------------------------------

export async function rollbackBatch(
  input: RollbackInput,
  now: Date = new Date(),
): Promise<RollbackResult> {
  const [batch] = await db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.id, input.batchId), eq(importBatches.organizationId, input.orgId)));
  if (!batch) {
    throw new NotFoundError('import_batch', input.batchId);
  }
  if (batch.rolledBackAt) {
    throw new ConflictError('Batch has already been rolled back', {
      code: ERR_BATCH_ALREADY_ROLLED_BACK,
      batchId: input.batchId,
    });
  }
  if (batch.supersededAt) {
    throw new ConflictError('Batch has been superseded by a later import; cannot roll back', {
      code: ERR_ROLLBACK_WINDOW_EXPIRED,
      batchId: input.batchId,
      reason: 'superseded',
    });
  }
  const ageMs = now.getTime() - new Date(batch.committedAt).getTime();
  if (ageMs > ROLLBACK_WINDOW_MS) {
    throw new ConflictError('Rollback window (24h) has expired for this batch', {
      code: ERR_ROLLBACK_WINDOW_EXPIRED,
      batchId: input.batchId,
      reason: 'window-expired',
    });
  }

  const reversal = (batch.reversalPayload ?? { rows: [] }) as ReversalPayload;

  const result = await db.transaction(async (tx) => {
    let rowsDeleted = 0;
    let rowsRestored = 0;

    for (const r of reversal.rows) {
      if (r.prior === null) {
        // Row was new in this batch — DELETE.
        const deleted = (await tx
          .delete(actualEntries)
          .where(
            and(
              eq(actualEntries.organizationId, input.orgId),
              eq(actualEntries.personId, r.personId),
              eq(actualEntries.projectId, r.projectId),
              eq(actualEntries.date, r.date),
            ),
          )
          .returning({ id: actualEntries.id })) as Array<{ id: string }>;
        rowsDeleted += deleted.length;
      } else {
        // Restore prior values.
        await tx
          .update(actualEntries)
          .set({
            hours: r.prior.hours,
            source: r.prior.source,
            importBatchId: r.prior.importBatchId,
            updatedAt: now,
          })
          .where(
            and(
              eq(actualEntries.organizationId, input.orgId),
              eq(actualEntries.personId, r.personId),
              eq(actualEntries.projectId, r.projectId),
              eq(actualEntries.date, r.date),
            ),
          );
        rowsRestored += 1;
      }
    }

    await tx
      .update(importBatches)
      .set({ rolledBackAt: now, rolledBackBy: input.rolledBackBy, reversalPayload: null })
      .where(eq(importBatches.id, input.batchId));

    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorPersonaId,
        entity: 'import_batch',
        entityId: input.batchId,
        action: 'ACTUALS_BATCH_ROLLED_BACK',
        previousValue: null,
        newValue: { rowsDeleted, rowsRestored },
        context: { batchId: input.batchId, rolledBackBy: input.rolledBackBy },
      },
      tx as unknown as Parameters<typeof recordChange>[1],
    );

    return { batchId: input.batchId, rowsDeleted, rowsRestored };
  });

  return result;
}

// Silence unused-import warnings for symbols imported for type usage only.
void isNull;
