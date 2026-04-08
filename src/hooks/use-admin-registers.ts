'use client';

/**
 * v5.0 — Phase 43 / Plan 43-02 — shared TanStack hooks for the admin
 * register UI (people / projects / departments / disciplines / programs).
 *
 * Hits the v5 surface from Plan 43-01:
 *   GET    /api/v5/admin/registers/:entity?includeArchived=<bool>
 *   POST   /api/v5/admin/registers/:entity
 *   PATCH  /api/v5/admin/registers/:entity/:id
 *   DELETE /api/v5/admin/registers/:entity/:id
 *
 * Query key contract (consumed by Plan 43-04 change-log invalidation):
 *   ['admin-registers', entity, { includeArchived }]
 *
 * On mutation success, BOTH ['admin-registers', entity] AND ['change-log']
 * are invalidated so the admin landing feed refreshes in 43-04.
 *
 * On archive 409 DEPENDENT_ROWS_EXIST the hook throws a typed
 * `DependentRowsError` exposing `.blockers: Record<string, number>` so the
 * per-entity page can render "Kan inte arkivera: 3 aktiva allokeringar."
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type RegisterEntity = 'person' | 'project' | 'department' | 'discipline' | 'program';

/** Intentionally loose — the five entity tables don't share a column set. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RegisterRow = any;

export class DependentRowsError extends Error {
  readonly blockers: Record<string, number>;
  readonly entity: string;
  readonly id: string;

  constructor(entity: string, id: string, blockers: Record<string, number>) {
    super('DEPENDENT_ROWS_EXIST');
    this.name = 'DependentRowsError';
    this.entity = entity;
    this.id = id;
    this.blockers = blockers;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function listKey(entity: RegisterEntity, includeArchived: boolean) {
  return ['admin-registers', entity, { includeArchived }] as const;
}

function entityScopeKey(entity: RegisterEntity) {
  return ['admin-registers', entity] as const;
}

async function parseErrorBody(res: Response): Promise<{
  error?: string;
  message?: string;
  details?: Record<string, unknown>;
}> {
  try {
    return (await res.json()) as {
      error?: string;
      message?: string;
      details?: Record<string, unknown>;
    };
  } catch {
    return { message: `HTTP ${res.status}` };
  }
}

async function throwFromResponse(res: Response, fallback: string): Promise<never> {
  const body = await parseErrorBody(res);
  // 43-01 shape: { error: 'ERR_CONFLICT', message: 'DEPENDENT_ROWS_EXIST',
  //                details: { entity, id, blockers: { ... } } }
  if (res.status === 409 && body.message === 'DEPENDENT_ROWS_EXIST') {
    const d = (body.details ?? {}) as {
      entity?: string;
      id?: string;
      blockers?: Record<string, number>;
    };
    throw new DependentRowsError(d.entity ?? 'unknown', d.id ?? 'unknown', d.blockers ?? {});
  }
  throw new Error(body.message ?? fallback);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * List register rows for an entity. Query key:
 *   ['admin-registers', entity, { includeArchived }]
 */
export function useRegisterList(entity: RegisterEntity, options: { includeArchived: boolean }) {
  const { includeArchived } = options;
  return useQuery<RegisterRow[]>({
    queryKey: listKey(entity, includeArchived),
    queryFn: async () => {
      const res = await fetch(
        `/api/v5/admin/registers/${entity}?includeArchived=${includeArchived ? 'true' : 'false'}`,
        { method: 'GET' },
      );
      if (!res.ok) await throwFromResponse(res, 'Failed to load register');
      const body = (await res.json()) as { rows: RegisterRow[] };
      return body.rows;
    },
  });
}

/** Create a row. Invalidates `['admin-registers', entity]` and `['change-log']`. */
export function useCreateRegisterRow(entity: RegisterEntity) {
  const queryClient = useQueryClient();
  return useMutation<RegisterRow, Error, Record<string, unknown>>({
    mutationFn: async (data) => {
      const res = await fetch(`/api/v5/admin/registers/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) await throwFromResponse(res, 'Failed to create row');
      const body = (await res.json()) as { row: RegisterRow };
      return body.row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityScopeKey(entity) });
      queryClient.invalidateQueries({ queryKey: ['change-log'] });
    },
  });
}

/**
 * Update a row by id. Accepts `{ archivedAt: null }` to un-archive (D-11).
 * Invalidates `['admin-registers', entity]` and `['change-log']`.
 */
export function useUpdateRegisterRow(entity: RegisterEntity) {
  const queryClient = useQueryClient();
  return useMutation<RegisterRow, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/v5/admin/registers/${entity}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) await throwFromResponse(res, 'Failed to update row');
      const body = (await res.json()) as { row: RegisterRow };
      return body.row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityScopeKey(entity) });
      queryClient.invalidateQueries({ queryKey: ['change-log'] });
    },
  });
}

/**
 * Archive (soft-delete) a row by id. Throws a `DependentRowsError` on
 * 409 DEPENDENT_ROWS_EXIST so callers can surface blocker counts.
 * Invalidates `['admin-registers', entity]` and `['change-log']`.
 */
export function useArchiveRegisterRow(entity: RegisterEntity) {
  const queryClient = useQueryClient();
  return useMutation<RegisterRow, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/v5/admin/registers/${entity}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) await throwFromResponse(res, 'Failed to archive row');
      const body = (await res.json()) as { row: RegisterRow };
      return body.row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityScopeKey(entity) });
      queryClient.invalidateQueries({ queryKey: ['change-log'] });
    },
  });
}
