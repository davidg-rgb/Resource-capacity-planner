// v5.0 — Phase 38 / Plan 38-02 (IMP-02..05, IMP-07): types for the actuals
// import pipeline (parse → stage → preview → commit → rollback).
//
// Kept in a dedicated file (NOT import.types.ts) so the legacy v4 wizard
// types and the v5 actuals-import types can evolve independently.

import type { MatchResult } from './matching/name-matcher';
import type { ParseWarning } from './parsers/parser.types';

/**
 * Per-row "before" snapshot used by rollbackBatch to restore prior state.
 * `prior=null` means the row was new in this batch (rollback DELETEs it).
 * Non-null `prior` records the exact (hours, source, importBatchId) that
 * existed before the batch wrote, even if that prior state itself came
 * from an earlier (now-superseded) batch — chained reversal_payload makes
 * rollback B restore values to pre-A state when B superseded A.
 */
export type ReversalPayloadRow = {
  personId: string;
  projectId: string;
  date: string;
  prior: {
    hours: string; // numeric(5,2) string
    source: 'manual' | 'import';
    importBatchId: string | null;
  } | null;
};

export type ReversalPayload = {
  rows: ReversalPayloadRow[];
};

export type UnmatchedName = {
  kind: 'person' | 'project';
  input: string;
  match: MatchResult;
};

export type PreviewResult = {
  sessionId: string;
  new: number;
  updated: number;
  warnings: ParseWarning[];
  rowsSkippedManual: number;
  rowsSkippedPriorBatch: number;
  unmatchedNames: UnmatchedName[];
};

export type ParseAndStageInput = {
  orgId: string;
  fileBuffer: ArrayBuffer;
  fileName: string;
  userId: string;
};

export type ParseAndStageResult = {
  sessionId: string;
  layout: 'row-per-entry' | 'pivoted';
  rowCount: number;
  warningCount: number;
};

export type NameOverrides = {
  persons?: Record<string, string>; // input name -> resolved person id
  projects?: Record<string, string>; // input name -> resolved project id
};

export type CommitInput = {
  orgId: string;
  sessionId: string;
  overrideManualEdits: boolean;
  overrideUnrolledImports: boolean;
  nameOverrides?: NameOverrides;
  actorPersonaId: string;
  committedBy: string;
};

export type CommitResult = {
  batchId: string;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkippedManual: number;
  rowsSkippedPriorBatch: number;
  warnings: ParseWarning[];
};

export type RollbackInput = {
  orgId: string;
  batchId: string;
  actorPersonaId: string;
  rolledBackBy: string;
};

export type RollbackResult = {
  batchId: string;
  rowsDeleted: number;
  rowsRestored: number;
};

// Error codes (string constants exported for tests + API layer mapping).
export const ERR_SESSION_NOT_FOUND = 'SESSION_NOT_FOUND';
export const ERR_SESSION_ALREADY_COMMITTED = 'SESSION_ALREADY_COMMITTED';
export const ERR_PRIOR_BATCH_ACTIVE = 'PRIOR_BATCH_ACTIVE';
export const ERR_UNRESOLVED_NAMES = 'UNRESOLVED_NAMES';
export const ERR_BATCH_NOT_FOUND = 'BATCH_NOT_FOUND';
export const ERR_BATCH_ALREADY_ROLLED_BACK = 'BATCH_ALREADY_ROLLED_BACK';
export const ERR_ROLLBACK_WINDOW_EXPIRED = 'ROLLBACK_WINDOW_EXPIRED';
export const ERR_UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE';

/** Rollback grace window (TC-AC-014/015). */
export const ROLLBACK_WINDOW_MS = 24 * 60 * 60 * 1000;
