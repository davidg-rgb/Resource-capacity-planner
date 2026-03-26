import type * as schema from '@/db/schema';

/** An allocation row as returned from the database */
export type AllocationRow = typeof schema.allocations.$inferSelect;

/** A flat allocation with project name (from JOIN), month normalized to YYYY-MM */
export type FlatAllocation = {
  id: string;
  personId: string;
  projectId: string;
  projectName: string;
  month: string;
  hours: number;
  updatedAt?: string;
};

/** A grid row for AG Grid: one row per project, dynamic month columns */
export type GridRow = {
  projectId: string;
  projectName: string;
  isAddRow?: boolean;
  [month: string]: number | string | boolean | undefined;
};

/** Payload for a single allocation upsert */
export type AllocationUpsert = {
  personId: string;
  projectId: string;
  month: string;
  hours: number;
  expectedUpdatedAt?: string;
};

/** Info about a conflict detected during batch upsert (optimistic concurrency) */
export type ConflictInfo = {
  projectId: string;
  month: string;
  serverHours: number;
  serverUpdatedAt: string;
};

/** Result of a batch upsert operation */
export type BatchUpsertResult = {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
  conflicts: ConflictInfo[];
  updatedTimestamps: Record<string, string>;
};
