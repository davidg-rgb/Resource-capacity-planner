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

/** A row in the flat allocation table (all joins resolved) */
export type FlatTableRow = {
  personName: string;
  discipline: string;
  departmentName: string;
  projectName: string;
  programName: string | null;
  month: string; // YYYY-MM
  hours: number;
};

/** Filters for the flat allocation table */
export type FlatTableFilters = {
  personName?: string;
  disciplineId?: string;
  projectId?: string;
  departmentId?: string;
  monthFrom?: string; // YYYY-MM
  monthTo?: string; // YYYY-MM
};

/** Paginated response for the flat table API */
export type FlatTableResponse = {
  rows: FlatTableRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  totalHours: number;
};
